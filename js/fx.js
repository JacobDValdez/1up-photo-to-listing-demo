/* Retro effects for the storefront (ideas adapted from HyperFrames catalog pieces,
   rebuilt as plain web animations):
   1. setWheel()      – arcade scoreboard rolling digits   (after "number-wheel")
   2. card tilt       – product cards tilt toward the mouse (after "tilt-card")
   3. renderMarquee() – "JUST IN" arcade ticker            (after "perspective-marquee")
   4. oneUp()         – green "1UP!" pop + confetti        (after "spring-pop" / "confetti")
   All of them calm down when the visitor's device asks for reduced motion. */

/* Store details (from the user; hours are the same every day). */
const STORE = {
  name: '1UP VIDEOGAMES',
  street: '111 N Citrus Ave', city: 'Covina', region: 'CA', zip: '91723',
  phone: '+1 626-607-5812', phoneTel: '+16266075812',
  open: 12, close: 19,            // 12:00–19:00, every day
  hoursText: 'Open every day · 12–7 PM',
  freeShipOver: 75,               // placeholder: confirm with the owner
};
STORE.address = `${STORE.street}, ${STORE.city}, ${STORE.region} ${STORE.zip}`;
STORE.directions = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(STORE.address);

/* Is the shop open right now (Covina time)? */
function storeStatus(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(now);
  const h = +parts.find(p => p.type === 'hour').value % 24, m = +parts.find(p => p.type === 'minute').value;
  const t = h + m / 60;
  if (t >= STORE.open && t < STORE.close) return { open: true, text: 'Open now · until 7 PM' };
  return { open: false, text: t < STORE.open ? 'Closed · opens today at 12 PM' : 'Closed · opens tomorrow at 12 PM' };
}

const FX_REDUCED =window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1. scoreboard wheel ---------- */
function setWheel(el, value) {
  const text = '$' + value;
  el.setAttribute('aria-label', text);
  const chars = [...text];
  const sig = chars.map(c => /\d/.test(c) ? 'd' : c).join('');
  if (el.dataset.sig !== sig) {
    el.dataset.sig = sig;
    el.innerHTML = chars.map(c => /\d/.test(c)
      ? `<span class="wd" aria-hidden="true"><span class="wd-strip">${'0123456789'.split('').map(n => `<span>${n}</span>`).join('')}</span></span>`
      : `<span class="wsym" aria-hidden="true">${c}</span>`).join('');
    el.offsetHeight; // start fresh columns at 0 so they visibly roll up
  }
  const strips = el.querySelectorAll('.wd-strip');
  let i = 0;
  for (const c of chars) if (/\d/.test(c)) strips[i++].style.transform = `translateY(${-c * 10}%)`;
}

/* ---------- 2. card tilt ---------- */
(function () {
  if (FX_REDUCED || !(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
  let current = null;
  const reset = c => { c.classList.remove('tilting'); c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); };
  document.addEventListener('pointermove', e => {
    const card = e.target.closest && e.target.closest('.card');
    if (current && current !== card) { reset(current); current = null; }
    if (!card) return;
    current = card;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    card.style.setProperty('--rx', ((0.5 - py) * 12).toFixed(2) + 'deg');
    card.style.setProperty('--ry', ((px - 0.5) * 14).toFixed(2) + 'deg');
    card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
    card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
    card.classList.add('tilting');
  }, { passive: true });
  document.addEventListener('pointerleave', () => { if (current) { reset(current); current = null; } });
})();

/* ---------- 3. "JUST IN" marquee ---------- */
let _marqueeKey = '';
function renderMarquee() {
  const el = document.getElementById('marquee');
  if (!el || typeof Store === 'undefined' || !Store.s) return;
  const items = Store.s.items.filter(i => i.status === 'live')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  const key = items.map(i => i.id + i.price).join('|');
  if (key === _marqueeKey) return; // don't restart the scroll on every page change
  _marqueeKey = key;
  if (!items.length) { el.hidden = true; return; }
  el.hidden = false;
  const run = items.map(i => `<a class="mq-item" href="#/item/${i.id}">${esc(i.title)} <b>${money(i.price)}</b></a><span class="mq-star" aria-hidden="true">★</span>`).join('');
  el.innerHTML = `<span class="mq-label">JUST IN</span>
    <div class="mq-window"><div class="mq-tilt"><div class="mq-track" style="--mq-dur:${items.length * 5}s">
      <div class="mq-run">${run}</div><div class="mq-run" aria-hidden="true">${run}</div></div></div></div>`;
}

/* ---------- 4. 1UP! pop + confetti ---------- */
let _lastPt = null;
document.addEventListener('pointerdown', e => { _lastPt = { x: e.clientX, y: e.clientY }; }, true);
function oneUp(text = '1UP!', at) {
  let p = at;
  if (at instanceof Element) { const r = at.getBoundingClientRect(); p = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  p = p || _lastPt || { x: innerWidth / 2, y: innerHeight / 2 };
  const fx = document.createElement('div');
  fx.className = 'oneup-fx'; fx.setAttribute('aria-hidden', 'true');
  fx.style.left = p.x + 'px'; fx.style.top = p.y + 'px';
  fx.innerHTML = `<span class="oneup-text">${esc(text)}</span>`;
  if (!FX_REDUCED) {
    const colors = ['#c63b3b', '#fcd535', '#7dc63f', '#3a82f6', '#ffffff'];
    for (let i = 0; i < 28; i++) {
      const bit = document.createElement('i');
      const ang = Math.random() * Math.PI * 2, dist = 50 + Math.random() * 130;
      bit.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(0) + 'px');
      bit.style.setProperty('--dy', (Math.sin(ang) * dist - 70).toFixed(0) + 'px');
      bit.style.setProperty('--rot', (Math.random() * 720 - 360).toFixed(0) + 'deg');
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = (Math.random() * 0.08).toFixed(2) + 's';
      fx.appendChild(bit);
    }
  }
  document.body.appendChild(fx);
  setTimeout(() => fx.remove(), 1500);
}
