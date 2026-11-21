/* 1UP VIDEOGAMES — photo-to-listing CONCEPT DEMO. All data lives in localStorage. */

const DB_KEY = 'oneup-concept-demo-v2';
const SITE_URL = 'https://1upgames.example'; // placeholder domain for captions/notifications
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => (n === '' || n == null || isNaN(n)) ? '—' : '$' + Number(n).toFixed(2);
const sysName = k => (SYSTEMS[k] || {}).name || k;
const slugify = s => normalize(s).replace(/ /g, '-');
const daysAgo = (d, h = 0) => new Date(Date.now() - d * 864e5 - h * 36e5).toISOString();
const fmtDate = iso => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/* ---------------- placeholder photos (SVG, generated) ---------------- */
function placeholderSrc(p) {
  const color = (SYSTEMS[p.system] || {}).color || '#444';
  const views = ['FRONT', 'BACK', 'LABEL / DETAIL', 'SIDE', 'BOX', 'MANUAL', 'EXTRA'];
  const words = p.game.split(' '); const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > 15) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }
  lines.push(cur.trim());
  const isHw = p.category === 'handheld' || p.category === 'console';
  const shape = isHw
    ? `<rect x="110" y="40" width="180" height="230" rx="22" fill="${color}"/><rect x="135" y="62" width="130" height="90" rx="6" fill="#cfe3c9"/><circle cx="240" cy="222" r="14" fill="#222"/><circle cx="268" cy="200" r="14" fill="#222"/><rect x="140" y="204" width="44" height="12" fill="#222"/><rect x="156" y="188" width="12" height="44" fill="#222"/>`
    : `<path d="M95 60h210v40h-10v230H105V100H95z" fill="${color}"/><rect x="125" y="115" width="150" height="150" rx="6" fill="#f4efe2"/>`;
  const txtY = isHw ? 300 : 160;
  const txt = lines.slice(0, isHw ? 2 : 4).map((l, i) => `<text x="200" y="${txtY + i * 22}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="17" fill="#222">${esc(l)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#e8e2d4"/><rect width="400" height="400" fill="url(#g)"/><defs><linearGradient id="g" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity=".08"/></linearGradient></defs>${shape}${txt}<text x="200" y="${isHw ? 354 : 292}" text-anchor="middle" font-family="Arial" font-size="13" fill="${isHw ? '#333' : '#444'}">${esc(sysName(p.system))}</text><rect x="0" y="372" width="400" height="28" fill="#000" fill-opacity=".55"/><text x="12" y="391" font-family="Arial" font-size="12" fill="#fff">PLACEHOLDER PHOTO · ${views[p.v % views.length]}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
const photoSrc = p => typeof p === 'string' ? p : (p.src || placeholderSrc(p));
const phPhotos = (game, system, category, n = 3) => Array.from({ length: n }, (_, v) => ({ ph: 1, game, system, category, v }));

/* ---------------- store ---------------- */
const Store = {
  s: null,
  load() {
    try { this.s = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { this.s = null; }
    if (!this.s || !this.s.items) { this.s = seedState(); this.save(); }
  },
  save() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(this.s)); return true; }
    catch (e) { toast('Browser storage is full — remove some photos or reset the demo.', 'warn'); return false; }
  },
  reset() { this.s = seedState(); this.save(); },
  nextId() { this.s.seq = (this.s.seq || 100) + 1; return 'i' + this.s.seq; },
};

function makeItem(o) {
  const entry = CATALOG.find(c => c.game === o.game && c.system === o.system);
  const category = o.category || (entry ? entry.category : 'cartridge');
  const title = o.title || buildTitle(o.game, o.system, o.packaging);
  const it = {
    id: o.id, game: o.game, system: o.system, category, packaging: o.packaging,
    condition: o.condition || 'A', title, price: o.price,
    weightOz: o.weightOz || WEIGHT_TEMPLATE_OZ[category][o.packaging],
    specs: Object.assign(defaultSpecs(category, entry), o.specs || {}),
    tested: true, testedDate: (o.created || daysAgo(1)).slice(0, 10),
    photos: o.photos || phPhotos(o.game, o.system, category, o.n || 3),
    alt: buildAlt(title), status: o.status || 'live',
    createdAt: o.created || daysAgo(1), soldAt: o.soldAt || null,
  };
  it.description = o.description || buildDescription(it);
  it.slug = slugify(title) + '-' + it.id;
  return it;
}

function seedState() {
  const items = [
    { id: 'i1',  game: 'Game Boy Advance SP', system: 'GBA', packaging: 'Loose', price: '149.99', condition: 'A', created: daysAgo(0, 3), title: 'Game Boy Advance SP AGS-101 Pearl Blue - Game Boy Advance Loose', specs: { model: 'AGS-101 (backlit)', shell: 'Original', screen: 'Original', battery: '94% – holds about 9 hrs', charger: 'Yes – OEM' }, n: 4 },
    { id: 'i2',  game: 'Pokemon Red', system: 'GB', packaging: 'Loose', price: '39.99', created: daysAgo(0, 5), specs: { saveBattery: 'Holds save' } },
    { id: 'i3',  game: 'Pokemon Crystal', system: 'GBC', packaging: 'Loose', price: '64.99', created: daysAgo(0, 8), specs: { saveBattery: 'Replaced (new battery)' } },
    { id: 'i4',  game: 'Pokemon Emerald', system: 'GBA', packaging: 'Loose', price: '79.99', condition: 'A', created: daysAgo(1, 2) },
    { id: 'i5',  game: 'Super Mario World', system: 'SNES', packaging: 'Loose', price: '27.99', condition: 'C', created: daysAgo(1, 6), specs: { label: 'Original – worn' } },
    { id: 'i6',  game: 'Chrono Trigger', system: 'SNES', packaging: 'Loose', price: '189.99', condition: 'A', created: daysAgo(2) },
    { id: 'i7',  game: 'EarthBound', system: 'SNES', packaging: 'Loose', price: '279.99', created: daysAgo(2, 4) },
    { id: 'i8',  game: 'The Legend of Zelda: Ocarina of Time', system: 'N64', packaging: 'Loose', price: '37.99', created: daysAgo(3) },
    { id: 'i9',  game: 'Mario Kart 64', system: 'N64', packaging: 'CIB', price: '129.99', condition: 'B', created: daysAgo(3, 5), n: 5 },
    { id: 'i10', game: 'Nintendo 64 Console', system: 'N64', packaging: 'Loose', price: '109.99', created: daysAgo(4), title: 'Nintendo 64 Console Charcoal - Nintendo 64 Loose', specs: { model: 'NUS-001 Charcoal', controllers: '1 OEM controller (tight stick)', mods: 'None' } },
    { id: 'i11', game: 'Super Smash Bros. Melee', system: 'GCN', packaging: 'CIB', price: '84.99', created: daysAgo(5), specs: { manual: 'Yes' } },
    { id: 'i12', game: 'Pokemon Yellow', system: 'GB', packaging: 'Loose', price: '44.99', created: daysAgo(6), status: 'sold', soldAt: daysAgo(5, 20) },
    { id: 'i13', game: 'Super Metroid', system: 'SNES', packaging: 'Loose', price: '59.99', created: daysAgo(7), status: 'sold', soldAt: daysAgo(6) },
  ].map(makeItem);
  return {
    seq: 100, items,
    wishlist: [
      { id: 'w1', game: 'Pokemon Gold', system: 'GBC', maxPrice: 60, contact: 'demo-customer@example.com', via: 'email', created: daysAgo(3) },
      { id: 'w2', game: 'Banjo-Kazooie', system: '', maxPrice: '', contact: '(626) 555-0142', via: 'sms', created: daysAgo(9) },
    ],
    outbox: [], reservations: [], draft: null,
  };
}

/* ---------------- toast & modal ---------------- */
function toast(msg, kind = '') {
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4500);
}
function openModal(html) { $('#modal-body').innerHTML = html; $('#modal').hidden = false; }
function closeModal() { $('#modal').hidden = true; $('#modal-body').innerHTML = ''; }

/* ---------------- social caption & notifications ---------------- */
function itemUrl(it) { return `${SITE_URL}/p/${it.slug}`; }
function captionFor(it) {
  const s = it.specs || {}; const bits = [];
  if (it.tested) bits.push(`Tested ${fmtDate(it.testedDate)}`);
  if (s.saveBattery === 'Holds save' || s.saveBattery === 'Replaced (new battery)') bits.push('Save battery ' + (s.saveBattery === 'Holds save' ? 'holds' : 'replaced'));
  if (s.model) bits.push(s.model);
  if (s.battery) bits.push(s.battery);
  const gameTag = slugify(it.game).replace(/-/g, '').slice(0, 24);
  const tags = ['#' + SYSTEMS[it.system].tag, '#' + gameTag, '#retrogaming', '#retrogames', '#covina', '#1upgamescovina'];
  return `New in stock\n${it.title} — ${money(it.price)}\n${bits.join(' · ')}\n\nOne of one. Reserve for in-store pickup or ship it: ${itemUrl(it)}\nCovina, CA\n\n${tags.join(' ')}`;
}
function captionModal(it, extra = '') {
  openModal(`<h2>Social caption</h2>${extra}
    <p class="muted">Auto-generated for Instagram / Threads. In production this could post automatically through the Meta APIs once approved.</p>
    <div class="caption-preview"><img src="${esc(photoSrc(it.photos[0]))}" alt=""><textarea id="cap" rows="10">${esc(captionFor(it))}</textarea></div>
    <div class="row"><button class="btn primary" data-action="copy-caption">Copy caption</button><button class="btn" data-action="close">Done</button></div>`);
}

function wishMatches(w, it) {
  const a = normalize(w.game), b = normalize(it.game);
  if (!a || !(b.includes(a) || a.includes(b))) return false;
  if (w.system && w.system !== it.system) return false;
  if (w.maxPrice && Number(it.price) > Number(w.maxPrice)) return false;
  return true;
}
function notifyWishlist(it) {
  const hits = Store.s.wishlist.filter(w => wishMatches(w, it));
  const msgs = hits.map(w => {
    const body = w.via === 'sms'
      ? `1UP VIDEOGAMES: Good news — ${it.title} just came in for ${money(it.price)}. It's one of one. Reserve it: ${itemUrl(it)} Reply STOP to opt out.`
      : `Subject: It's here — ${it.title}\n\nHi! You asked us to let you know when ${w.game} came in. We just listed one:\n\n${it.title} — ${money(it.price)}\nTested ${fmtDate(it.testedDate)}\n\nUsed items are one of a kind, so reserve it for in-store pickup here: ${itemUrl(it)}\n\n— 1UP VIDEOGAMES, Covina CA\n(Unsubscribe)`;
    const n = { id: 'n' + Date.now() + Math.random().toString(36).slice(2, 5), to: w.contact, via: w.via, wish: w.game, itemId: it.id, body, at: new Date().toISOString() };
    Store.s.outbox.unshift(n); return n;
  });
  return msgs;
}

/* ---------------- photos ---------------- */
function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 900, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve({ src: c.toDataURL('image/jpeg', 0.72), name: file.name });
      };
      img.onerror = reject; img.src = fr.result;
    };
    fr.onerror = reject; fr.readAsDataURL(file);
  });
}
let pendingPhotos = [];
async function addFiles(files) {
  const list = [...files].filter(f => f.type.startsWith('image/'));
  for (const f of list) {
    if (pendingPhotos.length >= 7) { toast('Max 7 photos per item.', 'warn'); break; }
    try { pendingPhotos.push(await readPhoto(f)); } catch (e) { toast('Could not read ' + esc(f.name), 'warn'); }
  }
  renderPhotoStrip();
}
function renderPhotoStrip() {
  const el = $('#photo-strip'); if (!el) return;
  el.innerHTML = pendingPhotos.map((p, i) => `<div class="thumb"><img src="${esc(photoSrc(p))}" alt="Photo ${i + 1}"><button class="x" data-action="rm-photo" data-i="${i}" aria-label="Remove photo">×</button>${i === 0 ? '<span class="cover">Cover</span>' : ''}</div>`).join('')
    || '<p class="muted small">No photos yet.</p>';
  $('#photo-count').textContent = `${pendingPhotos.length}/7`;
  $('#btn-draft').disabled = pendingPhotos.length === 0;
}

/* ================= VIEWS ================= */
const app = () => $('#app');

function itemCard(it) {
  const sold = it.status === 'sold', held = it.status === 'reserved';
  return `<a class="card ${sold ? 'sold' : ''}" href="#/item/${it.id}">
    <div class="card-img"><img src="${esc(photoSrc(it.photos[0]))}" alt="${esc(it.alt)}" loading="lazy">
      ${isNew(it) && !sold ? '<span class="pill new">New</span>' : ''}${held ? '<span class="pill hold">On hold</span>' : ''}${sold ? '<span class="pill soldp">Sold</span>' : ''}</div>
    <div class="card-body"><div class="card-sys">${esc(sysName(it.system))} · ${esc(PACKAGING[it.packaging].label.toLowerCase().replace(/^./, c => c.toUpperCase()))}</div>
      <div class="card-title">${esc(it.title)}</div>
      <div class="card-foot"><span class="price">${money(it.price)}</span>${it.tested ? '<span class="tested">Tested</span>' : ''}</div></div></a>`;
}
const pkgOptions = sel => Object.entries(PACKAGING).map(([k, p]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${esc(p.long)}</option>`).join('');
const isNew = it => Date.now() - new Date(it.createdAt) < 2 * 864e5;

let filters = { system: '', packaging: '', condition: '', max: '', sort: 'new', q: '' };
let heroIntro = true; // the headline blur-in plays once per visit, not on every filter change
let showRequest = false, requestDone = null;

/* "Can't find it?" box: turns a dead-end search into a wishlist request. */
function requestBox(soldHits) {
  if (requestDone) return `<div class="request-box done">Got it — we'll ${requestDone.via === 'sms' ? 'text' : 'email'} <b>${esc(requestDone.contact)}</b> the moment a <b>${esc(requestDone.game)}</b> is listed.
    <button class="link" data-action="request-again">Request something else</button></div>`;
  const q = filters.q;
  const allSys = Object.keys(SYSTEMS);
  const catalogGuess = q && CATALOG.find(c => normalize(c.game).includes(normalize(q)) || c.aliases.some(a => normalize(a) === normalize(q)));
  const gameVal = catalogGuess ? catalogGuess.game : q;
  const sysVal = filters.system || (catalogGuess ? catalogGuess.system : '');
  return `<div class="request-box">
    <h3>${q ? `Don't see “${esc(q)}”?` : 'Nothing matches those filters.'} We'll find you one.</h3>
    <p class="muted small">New used stock comes in every day and each piece is one of one. Leave a request and you'll get a text or email the minute it's listed${soldHits.length ? ` — we've sold ${soldHits.length} recently, so they do come in` : ''}.</p>
    <form id="req-form" class="req-grid">
      <label>What are you looking for?<input name="game" required list="req-games" value="${esc(gameVal)}" placeholder="Game, system or accessory"></label>
      <datalist id="req-games">${CATALOG.map(c => `<option value="${esc(c.game)}">`).join('')}</datalist>
      <label>System<select name="system"><option value="">Any</option>${allSys.map(k => `<option value="${k}" ${sysVal === k ? 'selected' : ''}>${esc(sysName(k))}</option>`).join('')}</select></label>
      <label>Max price<input name="maxPrice" inputmode="decimal" placeholder="Optional"></label>
      <label>Notify by<select name="via"><option value="sms">Text</option><option value="email">Email</option></select></label>
      <label>Phone or email<input name="contact" required placeholder="Demo only — not sent"></label>
      <button class="btn primary">Notify me</button>
    </form></div>`;
}
/* Big shortcut banners for the left column (desktop), like a store bulletin board. */
function sideBanners() {
  return `<nav class="side-banners" aria-label="Shortcuts">
    <a class="sb sb-buy" href="#/trade"><span class="sb-big">We buy games</span><span class="sb-small">Cash or store credit, quoted on the spot</span></a>
    <a class="sb sb-visit" href="#visit-h" data-action="scroll-visit"><span class="sb-big">Visit the store</span><span class="sb-small">111 N Citrus Ave · daily 12–7</span></a>
    <a class="sb sb-live" href="https://www.whatnot.com/user/1up_sharkz/shop" target="_blank" rel="noopener"><span class="sb-big">Live on Whatnot</span><span class="sb-small">Bid on games during live shows</span></a>
  </nav>`;
}

/* Quick-link buttons under the hero: one tap to whatever a regular came for. */
function quickLinks() {
  const ql = [
    ['New arrivals', 'data-action="scroll-new" href="#new-arrivals"'],
    ['Sell to us', 'href="#/trade"'],
    ['Notify me', 'href="#/wishlist"'],
    ['Visit & hours', 'data-action="scroll-visit" href="#visit-h"'],
    ['Live shows', 'href="https://www.whatnot.com/user/1up_sharkz/shop" target="_blank" rel="noopener"'],
    ['Text us', 'href="sms:+16266075812?&amp;body=Hi%201UP!%20Do%20you%20have%20"'],
  ];
  return `<nav class="quick-links" aria-label="Quick links">${ql.map(([t, a]) => `<a class="ql" ${a}>${t}</a>`).join('')}</nav>`;
}

/* "Shop by" tiles: systems in stock + favourite franchises. */
const FRANCHISES = [{ q: 'pokemon', label: 'Pokémon' }, { q: 'mario', label: 'Mario' }, { q: 'zelda', label: 'Zelda' }];
function shopByTiles(live) {
  const sys = Object.keys(SYSTEMS).map(k => ({ k, n: live.filter(i => i.system === k).length })).filter(x => x.n);
  const fr = FRANCHISES.map(f => ({ ...f, n: live.filter(i => normalize(i.title).includes(f.q)).length })).filter(x => x.n);
  return `<section class="shop-by" aria-label="Shop by">
    <div class="shop-by-head"><h2>Shop by system &amp; series</h2>${filters.system ? '<button class="link" data-action="tile-system" data-k="">Show all</button>' : ''}</div>
    <div class="tiles">${sys.map(x => `<button class="tile${filters.system === x.k ? ' on' : ''}" style="--tc:${SYSTEMS[x.k].color}" data-action="tile-system" data-k="${x.k}">
        <span class="tile-name">${esc(sysName(x.k))}</span><span class="tile-n">${x.n} in stock</span></button>`).join('')}
      ${fr.map(f => `<button class="tile tile-fr" data-action="tile-q" data-q="${f.q}"><span class="tile-name">${esc(f.label)}</span><span class="tile-n">${f.n} in stock</span></button>`).join('')}
    </div></section>`;
}

/* Instagram section. DEMO: sample tiles only (no real posts are copied).
   PRODUCTION: replace the .ig-grid contents with a feed widget's embed snippet
   (e.g. Behold / Elfsight / SnapWidget) or posts fetched by a small server via the
   Instagram API. The account must be a Business or Creator account. */
const IG_URL = 'https://www.instagram.com/1upgamescovina/';
/* TEMPORARY: crops of a screenshot of his recent Instagram grid (img/ig/). Remove once a live feed widget is in. */
const IG_PHOTOS = [
  { src: 'img/ig/ig-01.jpg', alt: 'Stack of GameCube and PlayStation 2 games' },
  { src: 'img/ig/ig-02.jpg', alt: 'Haul of SNES, N64, Game Boy and PlayStation games' },
  { src: 'img/ig/ig-05.jpg', alt: 'Zelda: Ocarina of Time store standee' },
  { src: 'img/ig/ig-06.jpg', alt: 'Sony PSP with a new AC adapter' },
  { src: 'img/ig/ig-10.jpg', alt: 'Grand Theft Auto VI for PS5 on the counter' },
  { src: 'img/ig/ig-12.jpg', alt: 'Stack of Arcus Odyssey games' },
];
/* All 12 photos from his grid, for the desktop sidebar (TEMPORARY, same note as IG_PHOTOS). */
const IG_ALL = [
  IG_PHOTOS[0], IG_PHOTOS[1],
  { src: 'img/ig/ig-03.jpg', alt: 'Pile of Super Nintendo cartridges' },
  { src: 'img/ig/ig-04.jpg', alt: 'Portable CD player in its box' },
  IG_PHOTOS[2], IG_PHOTOS[3],
  { src: 'img/ig/ig-07.jpg', alt: 'Xbox Series X limited edition' },
  { src: 'img/ig/ig-08.jpg', alt: 'Zelda artwork print' },
  { src: 'img/ig/ig-09.jpg', alt: 'Shelf of PS4 games' },
  IG_PHOTOS[4],
  { src: 'img/ig/ig-11.jpg', alt: 'PlayStation 5 console with two controllers' },
  IG_PHOTOS[5],
];
/* Desktop sidebar feed, like a store bulletin board: compact two-across grid. */
function igSidebar() {
  if (!IG_ALL.length) return '';
  return `<section class="ig-side" aria-labelledby="ig-side-h">
    <a class="ig-side-head" href="${IG_URL}" target="_blank" rel="noopener">
      <span class="ig-glyph" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg></span>
      <span><b id="ig-side-h">Instagram</b><small>@1upgamescovina</small></span></a>
    <div class="ig-side-grid">${IG_ALL.map(p => `<a href="${IG_URL}" target="_blank" rel="noopener" aria-label="Instagram post: ${esc(p.alt)}"><img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy"></a>`).join('')}</div>
    <a class="btn ig-follow ig-side-follow" href="${IG_URL}" target="_blank" rel="noopener">Follow</a>
  </section>`;
}

function instagramBlock(live) {
  if (IG_PHOTOS.length) {
    const tiles = IG_PHOTOS.map(p => `<a class="ig-tile ig-photo" href="${IG_URL}" target="_blank" rel="noopener" aria-label="Instagram post: ${esc(p.alt)}">
      <img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy">${p.video ? '<span class="ig-play" aria-hidden="true">▶</span>' : ''}</a>`).join('');
    return igSection(tiles, 'Recent posts from his Instagram, added by hand for now. A live feed widget would keep this updated.');
  }
  const items = live.slice(0, 4);
  const textTiles = [
    { t: 'Haul of the week', s: 'Fresh trade-ins just hit the counter', bg: 'linear-gradient(140deg,#3a82f6,#1f3fa8)' },
    { t: 'LIVE tonight', s: 'Catch us on Whatnot', bg: 'linear-gradient(140deg,#c63b3b,#7a1f2b)' },
    { t: 'We buy games', s: 'Bring them in any day, 12–7', bg: 'linear-gradient(140deg,#2f8a2f,#14532d)' },
    { t: 'Tested', s: 'Every cart, every console', bg: 'linear-gradient(140deg,#fcd535,#f0a830)', dark: true },
  ];
  const tiles = [];
  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0 && items[i / 2]) {
      const it = items[i / 2];
      tiles.push(`<a class="ig-tile" href="${IG_URL}" target="_blank" rel="noopener" aria-label="Sample post: new in stock, ${esc(it.title)}">
        <img src="${esc(photoSrc(it.photos[0]))}" alt="" loading="lazy"><span class="ig-cap">New in stock! <b>${money(it.price)}</b></span></a>`);
    } else {
      const x = textTiles[(i - 1) / 2 | 0] || textTiles[i % 4];
      tiles.push(`<a class="ig-tile ig-text${x.dark ? ' dark' : ''}" style="background:${x.bg}" href="${IG_URL}" target="_blank" rel="noopener" aria-label="Sample post: ${esc(x.t)}">
        <span class="ig-t">${esc(x.t)}</span><span class="ig-s">${esc(x.s)}</span></a>`);
    }
  }
  return igSection(tiles.join(''), 'Sample tiles for the demo, not real posts.');
}
function igSection(tilesHtml, note) {
  return `<section class="ig" aria-labelledby="ig-h">
    <div class="ig-head">
      <div><h2 id="ig-h"><span class="ig-glyph" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg></span>@1upgamescovina</h2>
        <p class="muted small">New arrivals, hauls and what's on the counter right now.</p></div>
      <a class="btn ig-follow" href="${IG_URL}" target="_blank" rel="noopener">Follow on Instagram</a>
    </div>
    <div class="ig-grid">${tilesHtml}</div>
    <p class="ig-note">${esc(note)}</p>
  </section>`;
}

/* Visit-us block: address, hours, open-now, directions, phone. */
function visitBlock() {
  const st = storeStatus();
  return `<section class="visit" aria-labelledby="visit-h">
    <div class="visit-main">
      <span class="visit-status ${st.open ? 'open' : 'closed'}"><span class="dot"></span>${esc(st.text)}</span>
      <h2 id="visit-h">Visit us in Covina</h2>
      <address>${esc(STORE.street)}<br>${esc(STORE.city)}, ${esc(STORE.region)} ${esc(STORE.zip)}</address>
      <p class="visit-hours"><b>${esc(STORE.hoursText)}</b></p>
      <div class="visit-cta">
        <a class="btn primary" href="${esc(STORE.directions)}" target="_blank" rel="noopener">Get directions</a>
        <a class="btn" href="tel:${STORE.phoneTel}">${esc(STORE.phone.replace('+1 ', '(').replace('-', ') '))}</a>
      </div>
    </div>
    <ul class="visit-list">
      <li><b>Buy, sell &amp; trade</b><span>Bring games in any day: we test and quote on the spot.</span></li>
      <li><b>Reserve online, pick up here</b><span>Held for 48 hours, pay at the counter.</span></li>
      <li><b>Can't make it in?</b><span>We ship in about 1 business day, or catch us live on <a href="https://www.whatnot.com/user/1up_sharkz/shop" target="_blank" rel="noopener">Whatnot</a>.</span></li>
    </ul></section>`;
}

/* Hero visual: the 1UP logo in its rainbow ring. */
function heroArt() {
  return `<div class="hero-art"><div class="hero-logo" aria-hidden="true"><div class="ring"><img src="img/logo.jpg" alt=""></div></div></div>`;
}

function viewShop() {
  const live = Store.s.items.filter(i => i.status === 'live' || i.status === 'reserved');
  const sold = Store.s.items.filter(i => i.status === 'sold').sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt));
  const maxAll = Math.ceil(Math.max(50, ...live.map(i => +i.price)) / 50) * 50;
  let list = live.filter(i => (!filters.system || i.system === filters.system) && (!filters.packaging || i.packaging === filters.packaging)
    && (!filters.condition || i.condition === filters.condition) && (!filters.max || +i.price <= +filters.max)
    && (!filters.q || normalize(i.title).includes(normalize(filters.q))));
  list.sort(filters.sort === 'low' ? (a, b) => a.price - b.price : filters.sort === 'high' ? (a, b) => b.price - a.price : (a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const sysOpts = Object.keys(SYSTEMS).filter(k => live.some(i => i.system === k));
  const soldHits = filters.q ? sold.filter(i => normalize(i.title).includes(normalize(filters.q))) : [];
  app().innerHTML = `
  ${filters.q ? '' : `<section class="hero${heroIntro ? ' intro' : ''}">
    <div class="hero-copy">
      <p class="eyebrow"><span class="dot${storeStatus().open ? '' : ' closed'}"></span>${esc(storeStatus().text)}<span class="eyebrow-loc"> · Covina, CA</span></p>
      <h1>Retro games, tested and ready to play</h1>
      <p class="hero-sub">Every used game is one of one. We photograph, test and list it the day it comes in, so reserve it before it's gone.</p>
      <div class="hero-cta"><button class="btn primary lg" data-action="scroll-new">Shop new arrivals</button><a class="btn lg" href="#/trade">Sell us your games</a></div>
      <dl class="hero-stats">
        <div><dt>5.0</dt><dd><a href="https://www.whatnot.com/user/1up_sharkz" target="_blank" rel="noopener">stars, 875 Whatnot reviews</a></dd></div>
        <div><dt>4.9K</dt><dd>items sold</dd></div>
        <div><dt>~1 day</dt><dd>to ship</dd></div>
        <div><dt>Tested</dt><dd>or your money back</dd></div>
      </dl>
    </div>
    ${heroArt()}
  </section>`}
  ${filters.q ? '' : quickLinks()}
  ${filters.q ? '' : shopByTiles(live)}
  <div class="shop-layout">
    <div class="side">
    ${sideBanners()}
    <aside class="filters" aria-label="Filters">
      <h3>Filter</h3>
      <label>Search<input type="search" id="f-q" value="${esc(filters.q)}" placeholder="e.g. pokemon"></label>
      <label>System<select id="f-system"><option value="">All systems</option>${sysOpts.map(k => `<option value="${k}" ${filters.system === k ? 'selected' : ''}>${esc(sysName(k))}</option>`).join('')}</select></label>
      <label>Completeness<select id="f-packaging"><option value="">Any</option>${pkgOptions(filters.packaging)}</select></label>
      <label>Condition<select id="f-condition"><option value="">Any</option>${Object.entries(CONDITIONS).map(([k, v]) => `<option value="${k}" ${filters.condition === k ? 'selected' : ''}>${esc(condName(k))}</option>`).join('')}</select></label>
      <label>Max price <output id="f-max-out">${filters.max ? money(filters.max) : 'Any'}</output><input type="range" id="f-max" min="10" max="${maxAll}" step="10" value="${filters.max || maxAll}"></label>
      <label>Sort<select id="f-sort"><option value="new" ${filters.sort === 'new' ? 'selected' : ''}>Newest first</option><option value="low" ${filters.sort === 'low' ? 'selected' : ''}>Price: low to high</option><option value="high" ${filters.sort === 'high' ? 'selected' : ''}>Price: high to low</option></select></label>
      <button class="btn small" data-action="clear-filters">Clear filters</button>
    </aside>
    ${igSidebar()}
    </div>
    <div>
      <div class="section-head" id="new-arrivals"><h2>${filters.q ? `Results for “${esc(filters.q)}”` : 'New arrivals'}</h2><span class="muted">${list.length} item${list.length === 1 ? '' : 's'}</span></div>
      ${!list.length || showRequest ? requestBox(soldHits) : ''}
      <div class="grid">${list.map(itemCard).join('')}</div>
      ${list.length && filters.q && !showRequest ? `<div class="request-slim">Not the one you're after? <button class="btn small" data-action="show-request">Request “${esc(filters.q)}”</button></div>` : ''}
      <div class="section-head"><h2>Recently sold${filters.q && soldHits.length ? ` · “${esc(filters.q)}”` : ''}</h2><span class="muted">Missed one? <a href="#/wishlist">Set an alert</a></span></div>
      <div class="grid sold-grid">${(filters.q && soldHits.length ? soldHits : sold).map(itemCard).join('') || '<div class="empty">No sold items yet.</div>'}</div>
    </div>
  </div>
  ${instagramBlock(live)}
  ${visitBlock()}`;
  if ($('.hero')) heroIntro = false;
  const bind = (id, key, ev = 'change') => $('#' + id).addEventListener(ev, e => {
    filters[key] = e.target.value;
    if (key === 'q') { showRequest = false; requestDone = null; }
    if (key === 'max' && +e.target.value >= maxAll) filters.max = '';
    if (key === 'q' || key === 'max') { if (key === 'max') $('#f-max-out').textContent = filters.max ? money(filters.max) : 'Any'; debounceRender(); } else render();
  });
  bind('f-system', 'system'); bind('f-packaging', 'packaging'); bind('f-condition', 'condition'); bind('f-sort', 'sort');
  bind('f-max', 'max', 'input'); bind('f-q', 'q', 'input');
}
let _deb; function debounceRender() { clearTimeout(_deb); _deb = setTimeout(() => { const a = document.activeElement && document.activeElement.id; render(); if (a && $('#' + a)) { const el = $('#' + a); el.focus(); if (el.setSelectionRange && el.type === 'search') el.setSelectionRange(el.value.length, el.value.length); } }, 250); }

function specRows(it) {
  const rows = (SPEC_TEMPLATES[it.category] || []).map(f => [f.label, it.specs[f.k]]).filter(r => r[1]);
  rows.push(['Condition', CONDITIONS[it.condition]]);
  rows.push(['Completeness', PACKAGING[it.packaging].long]);
  rows.push(['Tested', it.tested ? `Yes — ${fmtDate(it.testedDate)}` : 'Not yet']);
  rows.push(['Ship weight', `${it.weightOz} oz`]);
  return rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
}
function viewItem(id) {
  const it = Store.s.items.find(i => i.id === id);
  if (!it) { app().innerHTML = '<div class="empty">Item not found. <a href="#/">Back to shop</a></div>'; return; }
  const sold = it.status === 'sold', held = it.status === 'reserved';
  app().innerHTML = `<a class="back" href="#/">← All items</a>
  <div class="product">
    <div class="gallery"><div class="main-img"><img id="main-img" src="${esc(photoSrc(it.photos[0]))}" alt="${esc(it.alt)} (photo 1)"></div>
      <div class="thumbs">${it.photos.map((p, i) => `<button class="tbtn ${i === 0 ? 'on' : ''}" data-action="gallery" data-i="${i}" aria-label="Show photo ${i + 1}"><img src="${esc(photoSrc(p))}" alt=""></button>`).join('')}</div>
      <p class="muted small">Photos show the exact item you'll get.</p></div>
    <div class="pinfo">
      <div class="card-sys">${esc(sysName(it.system))} · ${esc(CATEGORIES[it.category])}</div>
      <h1>${esc(it.title)}</h1>
      <div class="big-price"><span class="price">${money(it.price)}</span> ${sold ? '<span class="pill soldp">Sold ' + fmtDate(it.soldAt) + '</span>' : held ? '<span class="pill hold">On hold for pickup</span>' : '<span class="pill instock">1 in stock</span>'}</div>
      <div class="guarantee"><strong>Tested or your money back.</strong> Every item is tested by our staff before it's listed and covered by a 30-day warranty. If it doesn't work, bring it back for a full refund or exchange.</div>
      ${sold ? `<button class="btn primary wide" data-action="goto-wish" data-game="${esc(it.game)}" data-system="${it.system}">Notify me when another comes in</button>`
        : held ? `<button class="btn wide" disabled>Reserved — check back soon</button>`
        : `<button class="btn primary wide" data-action="reserve" data-id="${it.id}">Reserve for in-store pickup</button>
           <button class="btn wide" data-action="ship-demo">Buy &amp; ship (checkout not in demo)</button>`}
      <h3>Spec &amp; trust box</h3>
      <table class="specs">${specRows(it)}</table>
      <h3>Description</h3><p>${esc(it.description)}</p>
      <details class="staff-tools"><summary>Staff tools</summary><div class="row"><button class="btn small" data-action="caption" data-id="${it.id}">Social caption</button><span class="price-links"><a class="btn small pc-btn" href="${esc(pricechartingUrl(it.game, it.system))}" target="_blank" rel="noopener">PriceCharting ↗</a><a class="btn small ebay-btn" href="${esc(ebaySoldUrl(it.game, it.system, it.packaging))}" target="_blank" rel="noopener" title="Completed and sold eBay listings">eBay sold ↗</a></span>${!sold ? `<button class="btn small" data-action="mark-sold" data-id="${it.id}">Mark sold</button>` : ''}</div></details>
    </div></div>`;
}

/* ---------- staff ---------- */
function viewStaff() {
  const d = Store.s.draft;
  const live = Store.s.items.filter(i => i.status !== 'sold').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unlisted = CATALOG.filter(c => !Store.s.items.some(i => i.game === c.game && i.status !== 'sold'));
  app().innerHTML = `
  <div class="staff-head"><h1>Staff · Add item</h1><p class="muted">Snap it, check the draft, approve. It's on the site, the caption is ready, and wishlist customers get pinged.</p></div>
  <div class="steps"><span class="${!d ? 'on' : 'done'}">1 Photos</span><span class="${d ? 'on' : ''}">2 Review draft</span><span>3 Live + caption</span></div>
  ${!d ? `
  <section class="panel">
    <h2>1. Photos <span class="muted small" id="photo-count">0/7</span></h2>
    <div class="drop" id="drop"><p><strong>Drag photos here</strong> or</p>
      <div class="row center"><label class="btn primary">Take photo<input type="file" accept="image/*" capture="environment" id="in-camera" hidden></label>
      <label class="btn">Choose photos<input type="file" accept="image/*" multiple id="in-files" hidden></label></div>
      <p class="muted small">1–7 photos. First photo is the cover. Front, back, label/board.</p></div>
    <div class="photo-strip" id="photo-strip"></div>
    <label class="hint">Quick hint (optional)<input id="hint" placeholder="e.g. pokemon gold, cib" autocomplete="off"></label>
    <p class="muted small">The demo AI is a mock: it reads this hint and the photo file names, not the pixels. A real vision model would make the hint unnecessary.</p>
    <details class="demo-box"><summary>No photos handy? Simulate one</summary>
      <div class="row"><select id="demo-pick">${unlisted.map(c => `<option value="${c.id}">${esc(c.game)} (${esc(sysName(c.system))})</option>`).join('')}</select>
      <select id="demo-pkg">${pkgOptions('Loose')}</select>
      <button class="btn small" data-action="demo-photos">Add sample photos</button></div></details>
    <button class="btn primary wide" id="btn-draft" data-action="draft" disabled>Draft the listing</button>
  </section>` : draftForm(d)}
  <section class="panel"><h2>Quick price check</h2>
    <p class="muted small">Someone at the counter asking "what's this worth?" Look it up without listing it.</p>
    <form id="pc-form" class="pc-form"><input name="q" list="pc-games" placeholder="Game name, e.g. Pokemon Blue" required>
      <datalist id="pc-games">${CATALOG.map(c => `<option value="${esc(c.game)}">`).join('')}</datalist>
      <select name="system"><option value="">Any system</option>${Object.keys(SYSTEMS).map(k => `<option value="${k}">${esc(sysName(k))}</option>`).join('')}</select>
      <button class="btn primary">Check price</button></form>
    <div id="pc-result"></div></section>
  ${wantedPanel()}
  <section class="panel">
    <h2>On the shelf (${live.length})</h2>
    <div class="inv">${live.map(i => `<div class="inv-row"><img src="${esc(photoSrc(i.photos[0]))}" alt=""><div class="inv-t"><a href="#/item/${i.id}">${esc(i.title)}</a><div class="muted small">${money(i.price)} · ${i.status === 'reserved' ? '<b>On hold</b> for ' + esc((Store.s.reservations.find(r => r.itemId === i.id) || {}).name || 'customer') : 'Listed ' + fmtDate(i.createdAt)}</div></div>
      <div class="inv-a"><button class="btn small" data-action="caption" data-id="${i.id}">Caption</button>${i.status === 'reserved' ? `<button class="btn small" data-action="release" data-id="${i.id}">Release</button>` : ''}<button class="btn small" data-action="mark-sold" data-id="${i.id}">Sold</button></div></div>`).join('')}</div>
  </section>`;
  if (!d) {
    renderPhotoStrip();
    const drop = $('#drop');
    ['dragenter', 'dragover'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', ev => addFiles(ev.dataTransfer.files));
    $('#in-camera').addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
    $('#in-files').addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
  } else bindDraftForm();
}

/* Customer requests grouped by item: a buying list for the counter. */
function wantedPanel() {
  const groups = {};
  for (const w of Store.s.wishlist) {
    const key = normalize(w.game) + '|' + (w.system || '');
    const g = groups[key] || (groups[key] = { game: w.game, system: w.system, n: 0, prices: [], fromSearch: 0, last: w.created });
    g.n++; if (w.maxPrice) g.prices.push(+w.maxPrice); if ((w.source || '').startsWith('search')) g.fromSearch++;
    if (w.created > g.last) g.last = w.created;
  }
  const rows = Object.values(groups).sort((a, b) => b.n - a.n || (b.last > a.last ? 1 : -1));
  return `<section class="panel"><h2>Wanted by customers (${Store.s.wishlist.length})</h2>
    <p class="muted small">From "Notify me" and searches that found nothing. Use it when buying trade-ins; approving a matching item alerts them automatically.</p>
    <div class="inv">${rows.map(g => `<div class="want-row"><b>${esc(g.game)}</b><span class="muted small">${g.system ? esc(sysName(g.system)) : 'Any system'}${g.prices.length ? ' · up to ' + money(Math.max(...g.prices)) : ''}${g.fromSearch ? ' · from search' : ''} · ${fmtDate(g.last)}</span><span class="want-n">${g.n} waiting</span></div>`).join('') || '<p class="muted">No requests yet.</p>'}</div></section>`;
}

function specField(f, d) {
  const entry = CATALOG.find(c => c.id === d.catalogId);
  const opts = f.opts === 'models' ? (entry && entry.models) || [] : f.opts;
  const v = d.specs[f.k] || '';
  if (opts && opts.length) return `<label>${esc(f.label)}<select data-spec="${f.k}">${[...new Set([...opts, v].filter(Boolean))].map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  return `<label>${esc(f.label)}<input data-spec="${f.k}" value="${esc(v)}" placeholder="${esc(f.placeholder || '')}"></label>`;
}
function draftForm(d) {
  const conf = Math.round(d.ai.confidence * 100);
  const mk = d.market || {};
  return `<section class="panel draft">
    <h2>2. Review the draft</h2>
    <div class="ai-note ${conf < 50 ? 'low' : ''}">Drafted by <b>${esc(d.ai.source)}</b> · match confidence ${conf}%${conf < 50 ? ' — <b>low, please check the item below</b>' : ''}</div>
    <div class="draft-grid">
      <div><div class="photo-strip small">${d.photos.map((p, i) => `<div class="thumb"><img src="${esc(photoSrc(p))}" alt="Photo ${i + 1}"></div>`).join('')}</div>
        <label>Identified as<select id="d-catalog">${CATALOG.map(c => `<option value="${c.id}" ${c.id === d.catalogId ? 'selected' : ''}>${esc(c.game)} (${esc(sysName(c.system))})</option>`).join('')}</select></label>
        <div class="row2"><label>System<select id="d-system">${Object.keys(SYSTEMS).map(k => `<option value="${k}" ${k === d.system ? 'selected' : ''}>${esc(sysName(k))}</option>`).join('')}</select></label>
        <label>Category<select id="d-category">${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}" ${k === d.category ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label></div>
        <div class="row2"><label>Completeness<select id="d-packaging">${pkgOptions(d.packaging)}</select></label>
        <label>Condition grade<select id="d-condition">${Object.entries(CONDITIONS).map(([k, v]) => `<option value="${k}" ${k === d.condition ? 'selected' : ''}>${esc(condName(k))}</option>`).join('')}</select></label></div>
      </div>
      <div>
        <label>Title <span class="muted small">[Game] - [System] [Loose/CIB]</span><input id="d-title" value="${esc(d.title)}"></label>
        <div class="row2"><label>Price ($)<input id="d-price" inputmode="decimal" value="${esc(d.price)}"></label>
        <label>Ship weight (oz)<input id="d-weight" inputmode="numeric" value="${esc(d.weightOz)}"></label></div>
        ${priceCompare(d)}
        <p class="muted small market">Weight from the ${esc(CATEGORIES[d.category])} template.</p>
        <label>Description<textarea id="d-desc" rows="4">${esc(d.description)}</textarea></label>
        <label>Photo alt text<input id="d-alt" value="${esc(d.alt)}"></label>
      </div>
    </div>
    <h3>Spec &amp; trust box</h3>
    <div class="spec-grid">${(SPEC_TEMPLATES[d.category] || []).map(f => specField(f, d)).join('')}
      <label class="check"><input type="checkbox" id="d-tested" ${d.tested ? 'checked' : ''}> Tested working</label>
      <label>Test date<input type="date" id="d-tdate" value="${esc(d.testedDate)}"></label></div>
    <div class="row sticky-actions"><button class="btn primary" data-action="approve">Approve &amp; publish</button><button class="btn" data-action="discard-draft">Discard</button></div>
  </section>`;
}
/* Our price vs the price guide, plus a one-tap PriceCharting check. */
function priceDiff(price, guide) {
  if (!guide || !(+price > 0)) return '';
  const pct = Math.round((+price / guide - 1) * 100);
  const cls = pct > 15 ? 'hi' : pct < -15 ? 'lo' : 'ok';
  return `<span class="diff ${cls}">${pct > 0 ? '+' : ''}${pct}% vs guide${cls === 'hi' ? ' – high' : cls === 'lo' ? ' – low' : ''}</span>`;
}
function priceCompare(d) {
  const mk = d.market || {}, guide = d.packaging === 'CIB' ? mk.cib : mk.loose;
  return `<div class="pc-box">
    <div class="pc-cols"><div><span>Guide loose</span><b>${money(mk.loose)}</b></div><div><span>Guide CIB</span><b>${money(mk.cib)}</b></div><div><span>Our price</span><b id="pc-ours">${money(d.price)}</b></div></div>
    <div class="pc-foot"><span id="pc-diff">${priceDiff(d.price, guide)}</span>
      <span class="price-links"><a class="btn small pc-btn" href="${esc(pricechartingUrl(d.game, d.system))}" target="_blank" rel="noopener">PriceCharting ↗</a><a class="btn small ebay-btn" href="${esc(ebaySoldUrl(d.game, d.system, d.packaging))}" target="_blank" rel="noopener" title="Completed and sold eBay listings">eBay sold ↗</a></span></div>
    <p class="muted small">Guide numbers: ${esc(mk.source || '—')}. The buttons open live PriceCharting prices and recent eBay sales in a new tab.</p></div>`;
}

function readDraftForm() {
  const d = Store.s.draft;
  d.title = $('#d-title').value.trim(); d.price = $('#d-price').value.trim(); d.weightOz = +$('#d-weight').value || d.weightOz;
  d.description = $('#d-desc').value.trim(); d.alt = $('#d-alt').value.trim();
  d.system = $('#d-system').value; d.category = $('#d-category').value; d.packaging = $('#d-packaging').value; d.condition = $('#d-condition').value;
  d.tested = $('#d-tested').checked; d.testedDate = $('#d-tdate').value;
  document.querySelectorAll('[data-spec]').forEach(el => d.specs[el.dataset.spec] = el.value);
  return d;
}
function bindDraftForm() {
  const d = Store.s.draft;
  const autoTitle = () => buildTitle(d.game, d.system, d.packaging);
  const refresh = async (opts = {}) => {
    const wasAuto = $('#d-title').value.trim() === autoTitle();
    readDraftForm();
    if (opts.recatalog) {
      const c = CATALOG.find(x => x.id === $('#d-catalog').value);
      Object.assign(d, { catalogId: c.id, game: c.game, system: c.system, category: c.category, specs: defaultSpecs(c.category, c) });
      d.ai = { confidence: 1, source: 'staff correction' };
    }
    if (opts.recategory) d.specs = defaultSpecs(d.category, CATALOG.find(x => x.id === d.catalogId));
    if (opts.recatalog || opts.repkg || opts.recategory) {
      d.market = await lookupMarketPrice(d.game, d.system, d.packaging);
      d.price = suggestPrice(d.packaging === 'CIB' ? d.market.cib : d.market.loose);
      d.weightOz = (WEIGHT_TEMPLATE_OZ[d.category] || {})[d.packaging] || d.weightOz;
      d.description = buildDescription(d);
    }
    if (wasAuto || opts.recatalog) { d.title = autoTitle(); d.alt = buildAlt(d.title); }
    Store.save(); render();
  };
  $('#d-price').addEventListener('input', e => {
    const mk = d.market || {};
    $('#pc-ours').textContent = money(e.target.value.replace(/[^0-9.]/g, ''));
    $('#pc-diff').innerHTML = priceDiff(e.target.value.replace(/[^0-9.]/g, ''), d.packaging === 'CIB' ? mk.cib : mk.loose);
  });
  $('#d-catalog').addEventListener('change', () => refresh({ recatalog: true }));
  $('#d-packaging').addEventListener('change', () => refresh({ repkg: true }));
  $('#d-system').addEventListener('change', () => refresh({}));
  $('#d-category').addEventListener('change', () => refresh({ recategory: true }));
  $('#d-condition').addEventListener('change', () => { readDraftForm(); d.description = buildDescription(d); Store.save(); render(); });
}

/* ---------- wishlist ---------- */
let wishPrefill = null;
function viewWishlist() {
  const prefill = wishPrefill || {}; wishPrefill = null;
  const s = Store.s;
  app().innerHTML = `
  <div class="two-col">
    <section class="panel"><h1>Notify me when it's in stock</h1>
      <p class="muted">Used stock is one of a kind. Tell us what you're hunting and we'll text or email you the moment one is listed.</p>
      <form id="wish-form" class="stack">
        <label>Game or system you want<input name="game" required list="games-dl" value="${esc(prefill.game || '')}" placeholder="e.g. Pokemon Gold"></label>
        <datalist id="games-dl">${CATALOG.map(c => `<option value="${esc(c.game)}">`).join('')}</datalist>
        <div class="row2"><label>System (optional)<select name="system"><option value="">Any</option>${Object.keys(SYSTEMS).map(k => `<option value="${k}" ${prefill.system === k ? 'selected' : ''}>${esc(sysName(k))}</option>`).join('')}</select></label>
        <label>Max price (optional)<input name="maxPrice" inputmode="decimal" placeholder="$"></label></div>
        <div class="row2"><label>Notify by<select name="via"><option value="sms">Text message</option><option value="email">Email</option></select></label>
        <label>Phone or email<input name="contact" required placeholder="demo only — not sent"></label></div>
        <button class="btn primary">Save my alert</button>
        <p class="muted small">Demo: nothing is actually sent. Production would use an SMS/email provider with opt-in and STOP/unsubscribe.</p>
      </form>
      <h3>Active alerts (${s.wishlist.length})</h3>
      <ul class="list">${s.wishlist.map(w => `<li><b>${esc(w.game)}</b>${w.system ? ' · ' + esc(sysName(w.system)) : ''}${w.maxPrice ? ' · under ' + money(w.maxPrice) : ''}<span class="muted small"> → ${esc(w.via)} ${esc(w.contact)}</span><button class="link" data-action="rm-wish" data-id="${w.id}">remove</button></li>`).join('') || '<li class="muted">None yet.</li>'}</ul>
    </section>
    <section class="panel"><h2>Notification outbox</h2><p class="muted small">Messages that <em>would</em> be sent when a matching item is approved.</p>
      ${s.outbox.map(n => `<div class="msg ${n.via}"><div class="msg-h">${n.via === 'sms' ? 'SMS' : 'Email'} to ${esc(n.to)} · ${fmtDate(n.at)} · alert: ${esc(n.wish)}</div><pre>${esc(n.body)}</pre></div>`).join('') || '<div class="empty">Nothing sent yet. Try: Staff → simulate “Pokemon Gold” → approve.</div>'}
    </section></div>`;
  $('#wish-form').addEventListener('submit', e => {
    e.preventDefault(); const f = new FormData(e.target);
    const w = { id: 'w' + Date.now(), game: f.get('game').trim(), system: f.get('system'), maxPrice: f.get('maxPrice').replace(/[^0-9.]/g, ''), via: f.get('via'), contact: f.get('contact').trim(), created: new Date().toISOString() };
    s.wishlist.unshift(w);
    const already = s.items.filter(i => i.status === 'live' && wishMatches(w, i));
    Store.save(); render();
    oneUp('1UP!', e.submitter);
    toast(already.length ? `Alert saved — and we already have <a href="#/item/${already[0].id}">${esc(already[0].title)}</a> in stock` : 'Alert saved. We\'ll ping you when it lands.');
  });
}

/* ---------- trade-in ---------- */
function viewTrade() {
  app().innerHTML = `<section class="panel narrow"><h1>Trade-in quote</h1>
    <p class="muted">Get an instant estimate. Final offer after we test it at the counter.</p>
    <form id="trade" class="stack">
      <label>System<select id="t-sys">${Object.keys(SYSTEMS).map(k => `<option value="${k}">${esc(sysName(k))}</option>`).join('')}</select></label>
      <label>Game / item<select id="t-game"></select></label>
      <div class="row2"><label>Completeness<select id="t-pkg">${pkgOptions('Loose')}</select></label>
      <label>Condition<select id="t-cond">${Object.entries(CONDITIONS).map(([k, v]) => `<option value="${k}" ${k === 'A' ? 'selected' : ''}>${esc(condName(k))}</option>`).join('')}</select></label></div>
      <label class="check"><input type="checkbox" id="t-works" checked> It powers on / plays</label>
    </form>
    <div id="quote" class="quote"></div>
    <p class="muted small">Demo rates: cash 40% and store credit 55% of the sample price guide, adjusted for condition. Real rates are the store's call.</p></section>`;
  const fillGames = () => { const k = $('#t-sys').value; $('#t-game').innerHTML = CATALOG.filter(c => c.system === k).map(c => `<option value="${c.id}">${esc(c.game)}</option>`).join('') || '<option value="">(no sample items)</option>'; };
  const quote = () => {
    const c = CATALOG.find(x => x.id === $('#t-game').value);
    if (!c) { $('#quote').innerHTML = '<p class="muted">Bring it in and we\'ll take a look.</p>'; return; }
    const base = $('#t-pkg').value === 'CIB' ? c.cib : c.loose;
    const k = { A: 1, B: 0.85, C: 0.65 }[$('#t-cond').value] * ($('#t-works').checked ? 1 : 0.25);
    const cash = Math.floor(base * 0.40 * k), credit = Math.floor(base * 0.55 * k);
    if (!$('#q-cash')) $('#quote').innerHTML = `<div class="q-box" aria-live="polite"><div><span>Cash</span><b class="wheel" id="q-cash"></b></div>
      <div class="best"><span>Store credit</span><b class="wheel" id="q-credit"></b><small id="q-more"></small></div></div><p id="q-note"></p>`;
    setWheel($('#q-cash'), cash); setWheel($('#q-credit'), credit);
    $('#q-more').textContent = `+${Math.round((credit / Math.max(cash, 1) - 1) * 100)}% more`;
    $('#q-note').innerHTML = `Bring your <b>${esc(c.game)}</b> to the counter in Covina — we'll test it and confirm the offer on the spot.`;
  };
  $('#t-sys').addEventListener('change', () => { fillGames(); quote(); });
  ['t-game', 't-pkg', 't-cond', 't-works'].forEach(id => $('#' + id).addEventListener('change', quote));
  fillGames(); quote();
}

/* ---------------- actions ---------------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-action]'); if (!b) return;
  const a = b.dataset.action, s = Store.s;
  const item = b.dataset.id && s.items.find(i => i.id === b.dataset.id);
  switch (a) {
    case 'close': closeModal(); break;
    case 'rm-photo': pendingPhotos.splice(+b.dataset.i, 1); renderPhotoStrip(); break;
    case 'demo-photos': {
      const c = CATALOG.find(x => x.id === $('#demo-pick').value), pkg = $('#demo-pkg').value;
      if (!c) { toast('No sample items left to simulate — reset the demo.', 'warn'); break; }
      pendingPhotos = phPhotos(c.game, c.system, c.category, pkg === 'CIB' ? 4 : 3).map((p, i) => ({ ...p, name: `${c.game} ${pkg === 'CIB' ? 'cib' : ''} ${i + 1}.jpg` }));
      $('#hint').value = ''; renderPhotoStrip(); toast('Added sample photos (file names carry the game name for the mock AI).'); break;
    }
    case 'draft': {
      b.disabled = true; b.textContent = 'Reading photos…';
      try {
        const d = await draftListing(pendingPhotos, $('#hint').value);
        d.photos = pendingPhotos.map(p => p.ph ? { ph: 1, game: d.game, system: d.system, category: d.category, v: p.v } : { src: p.src });
        s.draft = d; pendingPhotos = [];
        if (!Store.save()) { s.draft = null; } render(); window.scrollTo(0, 0);
      } catch (err) { toast(esc(err.message), 'warn'); b.disabled = false; b.textContent = 'Draft the listing'; }
      break;
    }
    case 'discard-draft': s.draft = null; Store.save(); render(); break;
    case 'approve': {
      const d = readDraftForm();
      if (!d.title || !(+d.price > 0)) { toast('Title and a price are required.', 'warn'); return; }
      const it = makeItem({ id: Store.nextId(), game: d.game, system: d.system, category: d.category, packaging: d.packaging, condition: d.condition, title: d.title, price: (+d.price).toFixed(2), weightOz: d.weightOz, specs: d.specs, photos: d.photos, description: d.description, created: new Date().toISOString() });
      it.alt = d.alt; it.tested = d.tested; it.testedDate = d.testedDate;
      s.items.unshift(it); s.draft = null;
      const sent = notifyWishlist(it);
      Store.save(); render();
      const note = sent.length ? `<div class="notify-hit"><b>${sent.length} wishlist alert${sent.length > 1 ? 's' : ''} triggered</b>${sent.map(n => `<div class="msg ${n.via}"><div class="msg-h">${n.via === 'sms' ? 'SMS' : 'Email'} to ${esc(n.to)}</div><pre>${esc(n.body)}</pre></div>`).join('')}</div>` : '<p class="muted small">No wishlist alerts matched this item.</p>';
      oneUp('1UP!', b);
      captionModal(it, `<p class="ok"><b>${esc(it.title)}</b> is live. <a href="#/item/${it.id}" data-action="close">View on storefront →</a></p>${note}`);
      break;
    }
    case 'caption': captionModal(item); break;
    case 'copy-caption': {
      const t = $('#cap').value;
      try { await navigator.clipboard.writeText(t); } catch (err) { $('#cap').select(); document.execCommand('copy'); }
      b.textContent = 'Copied'; break;
    }
    case 'mark-sold': item.status = 'sold'; item.soldAt = new Date().toISOString(); s.reservations = s.reservations.filter(r => r.itemId !== item.id); Store.save(); render(); toast(`Marked sold — moved to Recently sold`); break;
    case 'release': item.status = 'live'; s.reservations = s.reservations.filter(r => r.itemId !== item.id); Store.save(); render(); break;
    case 'gallery': {
      const it = s.items.find(i => i.id === location.hash.split('/')[2]);
      $('#main-img').src = photoSrc(it.photos[+b.dataset.i]); $('#main-img').alt = `${it.alt} (photo ${+b.dataset.i + 1})`;
      document.querySelectorAll('.tbtn').forEach(x => x.classList.toggle('on', x === b)); break;
    }
    case 'reserve':
      openModal(`<h2>Reserve for pickup</h2><p><b>${esc(item.title)}</b> — ${money(item.price)}</p>
        <form id="res-form" class="stack"><label>Your name<input name="name" required></label><label>Phone<input name="phone" required inputmode="tel"></label>
        <p class="muted small">We'll hold it 48 hours. Pay at the counter. (Demo — nothing is sent.)</p>
        <div class="row"><button class="btn primary">Hold it for me</button><button type="button" class="btn" data-action="close">Cancel</button></div></form>`);
      $('#res-form').addEventListener('submit', ev => {
        ev.preventDefault(); const f = new FormData(ev.target);
        s.reservations.push({ itemId: item.id, name: f.get('name'), phone: f.get('phone'), until: new Date(Date.now() + 48 * 36e5).toISOString() });
        item.status = 'reserved'; Store.save(); oneUp('1UP!', ev.submitter); closeModal(); render();
        toast(`Held until ${new Date(Date.now() + 48 * 36e5).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}. See you at the counter`);
      });
      break;
    case 'ship-demo': toast('Shipping checkout would hand off to Shopify checkout in production.'); break;
    case 'goto-wish': wishPrefill = { game: b.dataset.game, system: b.dataset.system }; location.hash = '#/wishlist'; break;
    case 'rm-wish': s.wishlist = s.wishlist.filter(w => w.id !== b.dataset.id); Store.save(); render(); break;
    case 'tile-system': filters.system = filters.system === b.dataset.k ? '' : b.dataset.k; render(); { const el = $('#new-arrivals'); if (el && filters.system) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 90, behavior: FX_REDUCED ? 'auto' : 'smooth' }); } break;
    case 'tile-q': filters.q = b.dataset.q; filters.system = ''; showRequest = false; requestDone = null; render(); window.scrollTo(0, 0); break;
    case 'scroll-visit': e.preventDefault(); if ((location.hash || '#/').split('/')[1]) { location.hash = '#/'; setTimeout(() => $('#visit-h') && $('#visit-h').scrollIntoView({ behavior: 'smooth' }), 60); } else if ($('#visit-h')) $('#visit-h').scrollIntoView({ behavior: FX_REDUCED ? 'auto' : 'smooth' }); break;
    case 'scroll-new': { e.preventDefault(); const el = $('#new-arrivals'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 90, behavior: FX_REDUCED ? 'auto' : 'smooth' }); break; }
    case 'show-request': showRequest = true; requestDone = null; render(); $('#req-form [name=contact]').focus(); break;
    case 'request-again': requestDone = null; showRequest = true; render(); break;
    case 'clear-filters': showRequest = false; requestDone = null; filters ={ system: '', packaging: '', condition: '', max: '', sort: 'new', q: '' }; render(); break;
    case 'reset': if (confirm('Reset the demo to its sample data? Items you added will be removed.')) { Store.reset(); pendingPhotos = []; closeModal(); location.hash = '#/'; render(); toast('Demo reset.'); } break;
  }
});
/* Header search: jumps to the shop with the query applied (the sidebar search stays in sync). */
document.addEventListener('submit', e => {
  if (e.target.id !== 'top-search') return;
  e.preventDefault();
  filters.q = $('#top-q').value.trim(); showRequest = false; requestDone = null;
  if ((location.hash || '#/').split('/')[1]) location.hash = '#/'; else render();
  window.scrollTo(0, 0);
});
document.addEventListener('submit', async e => {
  if (e.target.id !== 'pc-form') return;
  e.preventDefault(); const f = new FormData(e.target);
  const q = f.get('q').trim(); let system = f.get('system');
  const c = CATALOG.find(x => normalize(x.game) === normalize(q) && (!system || x.system === system))
         || CATALOG.find(x => normalize(x.game).includes(normalize(q)) && (!system || x.system === system));
  if (c && !system) system = c.system;
  const game = c ? c.game : q, mk = c ? await lookupMarketPrice(c.game, c.system) : null;
  const tradeCash = mk && Math.floor(mk.loose * 0.40), tradeCredit = mk && Math.floor(mk.loose * 0.55);
  $('#pc-result').innerHTML = `<div class="pc-box">
    <div class="pc-title"><b>${esc(game)}</b>${system ? ' · ' + esc(sysName(system)) : ''}</div>
    ${mk ? `<div class="pc-cols"><div><span>Guide loose</span><b>${money(mk.loose)}</b></div><div><span>Guide CIB</span><b>${money(mk.cib)}</b></div><div><span>Trade-in (loose)</span><b>$${tradeCash} / $${tradeCredit}</b><small>cash / credit</small></div></div>`
         : '<p class="muted small">Not in the sample price list — use PriceCharting.</p>'}
    <div class="pc-foot"><span class="muted small">${mk ? esc(mk.source) : ''}</span><span class="price-links"><a class="btn small pc-btn" href="${esc(pricechartingUrl(game, system))}" target="_blank" rel="noopener">PriceCharting ↗</a><a class="btn small ebay-btn" href="${esc(ebaySoldUrl(game, system, ''))}" target="_blank" rel="noopener" title="Completed and sold eBay listings">eBay sold ↗</a></span></div></div>`;
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'req-form') return;
  e.preventDefault(); const f = new FormData(e.target);
  const w = { id: 'w' + Date.now(), game: f.get('game').trim(), system: f.get('system'), maxPrice: f.get('maxPrice').replace(/[^0-9.]/g, ''),
              via: f.get('via'), contact: f.get('contact').trim(), source: 'search: ' + filters.q, created: new Date().toISOString() };
  Store.s.wishlist.unshift(w); Store.save();
  oneUp('1UP!', e.submitter);
  requestDone = w; showRequest = true; render();
});
/* Floating "Text us" button */
(function () {
  const btn = $('#fab-btn'), menu = $('#fab-menu');
  if (!btn) return;
  const set = open => { menu.hidden = !open; btn.setAttribute('aria-expanded', open); btn.classList.toggle('open', open); };
  btn.addEventListener('click', () => set(menu.hidden));
  document.addEventListener('click', e => { if (!e.target.closest('#contact-fab') || e.target.closest('[data-fab-close]')) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
})();
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

/* ---------------- router ---------------- */
function render() {
  const [, page, id] = (location.hash || '#/').slice(1).split('/');
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.dataset.page === (page || 'shop')));
  renderMarquee();
  const tq = $('#top-q'); if (tq && document.activeElement !== tq) tq.value = filters.q;
  if (page === 'item') viewItem(id);
  else if (page === 'staff') viewStaff();
  else if (page === 'wishlist') viewWishlist();
  else if (page === 'trade') viewTrade();
  else viewShop();
}
let lastPage = null;
window.addEventListener('hashchange', () => { const p = location.hash.split('/')[1]; render(); if (p !== lastPage) window.scrollTo(0, 0); lastPage = p; });
Store.load(); render();
