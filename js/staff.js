/* Staff store tools for the 1UP demo:
   1. Inventory and prices – edit any listing, change prices inline, price review
      against the guide, markdowns (with a "was" price on the storefront).
   2. Trade-in counter – a buy ticket for the games a customer brings in, cash and
      store-credit offers per line, editable rates, and a "To test and list" queue
      that feeds the normal listing flow.
   3. Customers and store credit – accounts looked up by phone, a credit ledger
      (every change is a line, the balance is the total), credit paid out on
      trades and spent when a sale is rung up, printable trade receipts.
   Loaded before app.js; everything here runs only when called. */

const DEFAULT_SETTINGS = {
  cashPct: 40, creditPct: 55,          // % of the price guide
  cond: { A: 100, B: 85, C: 65 },      // condition multipliers, %
  brokenPct: 25,                       // "doesn't power on / play"
  markdownDays: 30,                    // flag items on the shelf this long
};
const newTicket = () => ({ customer: '', phone: '', lines: [], payout: 'credit' });
const settings = () => Store.s.settings;
const round2 = n => Math.round(n * 100) / 100;
const daysOnShelf = it => Math.max(0, Math.floor((Date.now() - new Date(it.createdAt)) / 864e5));

/* Price-guide number for an item's completeness (same sample data as lookupMarketPrice). */
function guideFor(game, system, packaging) {
  const c = CATALOG.find(x => x.game === game && x.system === system) || CATALOG.find(x => normalize(x.game) === normalize(game));
  if (!c) return null;
  return packaging === 'CIB' ? c.cib : c.loose;
}
/* Trade-in offer for one game, using the store's rates. */
function tradeOffer(guide, condition, works) {
  const st = settings();
  if (!(guide > 0)) return { cash: 0, credit: 0 };
  const k = (st.cond[condition] || 100) / 100 * (works ? 1 : st.brokenPct / 100);
  return { cash: Math.floor(guide * st.cashPct / 100 * k), credit: Math.floor(guide * st.creditPct / 100 * k) };
}
/* Change a price. sale: keep the old price as the "was" price. Returns wishlist alerts sent. */
function applyPrice(it, newPrice, sale = false) {
  const old = +it.price;
  newPrice = Math.max(0.99, round2(+newPrice));
  if (!(newPrice > 0) || newPrice === old) return [];
  if (sale && !it.compareAt) it.compareAt = it.price;
  it.price = newPrice.toFixed(2);
  if (it.compareAt && +it.price >= +it.compareAt) it.compareAt = null;
  if (it.status !== 'live' || newPrice >= old) return [];
  // price drop: alert anyone whose max price it now fits
  const before = { ...it, price: old };
  return notifyWishlist(it, w => !wishMatches(w, before));
}
const markdownPrice = (price, pct) => Math.max(0.99, Math.floor(price * (1 - pct / 100) + 0.01) - 0.01); // round down to .99

/* ---------- customers and the store-credit ledger ---------- */
const digits = p => String(p || '').replace(/\D/g, '').slice(-10);
const fmtPhone = p => { const d = digits(p); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(p || '').trim(); };
const custById = id => Store.s.customers.find(c => c.id === id);
const custByPhone = p => { const d = digits(p); return d.length === 10 ? Store.s.customers.find(c => digits(c.phone) === d) : null; };
const creditBalance = cid => round2(Store.s.ledger.filter(l => l.customerId === cid).reduce((t, l) => t + l.amount, 0));
function addLedger(customerId, amount, kind, note, ref = '', staff = '') {
  Store.s.ledger.unshift({ id: 'l' + Date.now() + Math.random().toString(36).slice(2, 5), customerId, at: new Date().toISOString(), amount: round2(amount), kind, note, ref, staff });
}
/* Find the account for this phone number, or open a new one. */
function upsertCustomer(name, phone) {
  let c = custByPhone(phone);
  if (c) { if (name && (!c.name || c.name === 'Customer')) c.name = name; return c; }
  c = { id: 'c' + Date.now().toString(36), name: (name || '').trim() || 'Customer', phone: fmtPhone(phone), email: '', created: new Date().toISOString() };
  Store.s.customers.unshift(c);
  return c;
}
const fmtDateTime = iso => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function staffTabs(on) {
  const n = Store.s.intake.length;
  const t = [['add', '#/staff', 'Add item'], ['inventory', '#/staff/inventory', 'Inventory and prices'], ['trade', '#/staff/trade', `Trade-in counter${n ? ` <span class="tab-n">${n}</span>` : ''}`], ['customers', '#/staff/customers', 'Customers']];
  return `<div class="staff-head"><h1>Staff</h1>
    <nav class="staff-tabs" aria-label="Staff tools">${t.map(([k, h, l]) => `<a href="${h}" class="${k === on ? 'on' : ''}" ${k === on ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav></div>`;
}

/* ================= 1. Inventory and prices ================= */
let invView = 'all', invQ = '', invSel = new Set();
function viewInventory() {
  const s = Store.s, st = settings();
  const rows = s.items.filter(i => i.status !== 'sold').map(i => {
    const guide = guideFor(i.game, i.system, i.packaging), days = daysOnShelf(i);
    const pct = guide ? +i.price / guide - 1 : null;
    return { i, guide, days, high: pct != null && pct > 0.15, low: pct != null && pct < -0.15, old: days >= st.markdownDays, sale: !!i.compareAt };
  });
  const count = k => rows.filter(r => r[k]).length;
  const views = [['all', 'All', rows.length], ['high', 'Priced high', count('high')], ['low', 'Priced low', count('low')], ['old', `${st.markdownDays}+ days on shelf`, count('old')], ['sale', 'On sale', count('sale')]];
  let list = rows.filter(r => invView === 'all' || r[invView]);
  if (invQ) list = list.filter(r => normalize(r.i.title).includes(normalize(invQ)));
  list.sort((a, b) => b.days - a.days);
  invSel = new Set([...invSel].filter(id => list.some(r => r.i.id === id)));
  const value = rows.reduce((t, r) => t + +r.i.price, 0), paid = rows.reduce((t, r) => t + (+r.i.cost || 0), 0);
  app().innerHTML = `${staffTabs('inventory')}
  <section class="panel">
    <div class="inv-top"><div><h2>Inventory and prices</h2>
      <p class="muted small">${rows.length} on the shelf · ${money(value)} at current prices${paid ? ` · ${money(paid)} paid in` : ''}. Prices compare against the price guide; anything 15% over or under is flagged.</p></div>
      <input type="search" id="inv-q" value="${esc(invQ)}" placeholder="Search inventory" aria-label="Search inventory"></div>
    <div class="seg" role="tablist">${views.map(([k, l, n]) => `<button class="${k === invView ? 'on' : ''}" data-action="inv-view" data-k="${k}" role="tab" aria-selected="${k === invView}">${l} <span>${n}</span></button>`).join('')}</div>
    <div class="bulk" ${invSel.size ? '' : 'hidden'}><b>${invSel.size} selected</b>
      <label>Mark down<span class="pct"><input id="bulk-pct" type="number" min="1" max="90" value="10" inputmode="numeric">%</span></label>
      <button class="btn small primary" data-action="bulk-markdown">Apply markdown</button>
      <button class="btn small" data-action="bulk-endsale">End sale</button>
      <button class="btn small" data-action="bulk-guide">Set to guide price</button>
      <button class="link" data-action="bulk-clear">Clear</button></div>
    <div class="table-wrap"><table class="inv-table">
      <thead><tr><th class="ck"><input type="checkbox" id="inv-all" aria-label="Select all" ${list.length && invSel.size === list.length ? 'checked' : ''}></th><th>Item</th><th>Cond.</th><th class="num">Days</th><th class="num">Paid</th><th class="num">Guide</th><th class="num">Price</th><th>vs guide</th><th></th></tr></thead>
      <tbody>${list.map(r => { const i = r.i, hold = i.status === 'reserved' && (s.reservations.find(x => x.itemId === i.id) || {}).name;
        return `<tr class="${invSel.has(i.id) ? 'sel' : ''}">
        <td class="ck"><input type="checkbox" data-sel="${i.id}" aria-label="Select ${esc(i.title)}" ${invSel.has(i.id) ? 'checked' : ''}></td>
        <td><div class="it"><img src="${esc(photoSrc(i.photos[0]))}" alt=""><div><a href="#/item/${i.id}">${esc(i.title)}</a>
          <div class="muted small">${esc(sysName(i.system))} · ${esc(PACKAGING[i.packaging].long)}${i.status === 'reserved' ? ` · <b>On hold</b> for ${esc(hold || 'customer')}` : ''}${i.compareAt ? ` · on sale, was ${money(i.compareAt)}` : ''}</div></div></div></td>
        <td>${esc(condName(i.condition))}</td>
        <td class="num ${r.old ? 'warn' : ''}">${r.days}</td>
        <td class="num">${i.cost ? money(i.cost) : '<span class="muted">—</span>'}</td>
        <td class="num">${money(r.guide)}</td>
        <td class="num"><span class="price-in">$<input data-price="${i.id}" value="${(+i.price).toFixed(2)}" inputmode="decimal" aria-label="Price for ${esc(i.title)}"></span></td>
        <td>${priceDiff(i.price, r.guide) || '<span class="muted small">no guide</span>'}</td>
        <td class="acts"><button class="btn small" data-action="edit-item" data-id="${i.id}">Edit</button>${i.status === 'reserved' ? `<button class="btn small" data-action="release" data-id="${i.id}">Release</button>` : ''}<button class="btn small" data-action="mark-sold" data-id="${i.id}">Sold</button></td></tr>`; }).join('')
        || `<tr><td colspan="9"><div class="empty">Nothing here${invQ ? ` matching “${esc(invQ)}”` : ''}.</div></td></tr>`}</tbody></table></div>
    <p class="muted small">Type a new price and press Enter to save it. Lowering a price texts or emails anyone on the wishlist whose max price it now fits.</p>
  </section>`;
  $('#inv-q').addEventListener('input', e => { invQ = e.target.value; clearTimeout(viewInventory._t); viewInventory._t = setTimeout(() => { viewInventory(); const q = $('#inv-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); });
  $('#inv-all').addEventListener('change', e => { invSel = e.target.checked ? new Set(list.map(r => r.i.id)) : new Set(); viewInventory(); });
  document.querySelectorAll('[data-sel]').forEach(el => el.addEventListener('change', () => { el.checked ? invSel.add(el.dataset.sel) : invSel.delete(el.dataset.sel); viewInventory(); }));
  document.querySelectorAll('[data-price]').forEach(el => {
    const save = () => {
      const it = s.items.find(x => x.id === el.dataset.price), v = +el.value.replace(/[^0-9.]/g, '');
      if (!it || !(v > 0) || v === +it.price) { el.value = (+it.price).toFixed(2); return; }
      const sent = applyPrice(it, v); Store.save(); viewInventory();
      toast(`${esc(it.title)} is now ${money(it.price)}${sent.length ? ` · ${sent.length} wishlist alert${sent.length > 1 ? 's' : ''} sent` : ''}`);
    };
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
    el.addEventListener('change', save);
  });
}

/* Edit any listing */
function editItemModal(it) {
  const c = CATALOG.find(x => x.game === it.game && x.system === it.system);
  const guideTxt = c ? `Guide: loose ${money(c.loose)} · complete ${money(c.cib)}` : 'Not in the price guide';
  openModal(`<h2>Edit listing</h2>
    <form id="edit-form" class="stack" data-id="${it.id}">
      <label>Title<input name="title" value="${esc(it.title)}" required></label>
      <div class="row2"><label>Price ($)<input name="price" value="${(+it.price).toFixed(2)}" inputmode="decimal" required></label>
        <label>Sale: original price ($)<input name="compareAt" value="${it.compareAt ? (+it.compareAt).toFixed(2) : ''}" inputmode="decimal" placeholder="Leave empty if not on sale"></label></div>
      <p class="muted small edit-guide">${guideTxt} <span id="edit-diff">${priceDiff(it.price, guideFor(it.game, it.system, it.packaging))}</span>
        <a href="${esc(pricechartingUrl(it.game, it.system))}" target="_blank" rel="noopener">PriceCharting ↗</a> · <a href="${esc(ebaySoldUrl(it.game, it.system, it.packaging))}" target="_blank" rel="noopener">eBay sold ↗</a></p>
      <div class="row2"><label>Condition<select name="condition">${Object.keys(CONDITIONS).map(k => `<option value="${k}" ${k === it.condition ? 'selected' : ''}>${esc(condName(k))}</option>`).join('')}</select></label>
        <label>Completeness<select name="packaging">${pkgOptions(it.packaging)}</select></label></div>
      <div class="row2"><label>We paid ($)<input name="cost" value="${it.cost ? (+it.cost).toFixed(2) : ''}" inputmode="decimal" placeholder="Optional"></label>
        <label>Test date<input type="date" name="testedDate" value="${esc(it.testedDate || '')}"></label></div>
      <label class="check"><input type="checkbox" name="tested" ${it.tested ? 'checked' : ''}> Tested working</label>
      <label>Description<textarea name="description" rows="5">${esc(it.description)}</textarea></label>
      <div class="row spread"><span class="row"><button class="btn primary">Save changes</button><button type="button" class="btn" data-action="close">Cancel</button></span>
        <button type="button" class="btn small danger" data-action="delete-item" data-id="${it.id}">Remove listing</button></div>
    </form>`);
  const f = $('#edit-form');
  f.price.addEventListener('input', () => { $('#edit-diff').innerHTML = priceDiff(f.price.value.replace(/[^0-9.]/g, ''), guideFor(it.game, it.system, f.packaging.value)); });
  f.addEventListener('submit', e => {
    e.preventDefault();
    const num = v => +String(v).replace(/[^0-9.]/g, '');
    const price = num(f.price.value);
    if (!f.title.value.trim() || !(price > 0)) { toast('A title and a price are required.', 'warn'); return; }
    const oldPkg = it.packaging;
    it.title = f.title.value.trim(); it.alt = buildAlt(it.title); it.slug = slugify(it.title) + '-' + it.id;
    it.condition = f.condition.value; it.packaging = f.packaging.value;
    if (oldPkg !== it.packaging) it.weightOz = (WEIGHT_TEMPLATE_OZ[it.category] || {})[it.packaging] || it.weightOz;
    it.cost = num(f.cost.value) > 0 ? num(f.cost.value).toFixed(2) : null;
    it.tested = f.tested.checked; it.testedDate = f.testedDate.value;
    it.description = f.description.value.trim();
    const sent = applyPrice(it, price);
    const was = num(f.compareAt.value);
    it.compareAt = was > +it.price ? was.toFixed(2) : null;
    Store.save(); closeModal(); render();
    toast(`Saved ${esc(it.title)}${sent.length ? ` · ${sent.length} wishlist alert${sent.length > 1 ? 's' : ''} sent` : ''}`);
  });
}

/* ================= 2. Trade-in counter ================= */
function viewTradeDesk() {
  const s = Store.s, st = settings(), tk = s.ticket;
  const tot = k => tk.lines.reduce((t, l) => t + (+l[k] || 0), 0);
  const cash = tot('cash'), credit = tot('credit');
  const wantN = (game, system) => s.wishlist.filter(w => wishMatches(w, { game, system, price: 0 })).length;
  const shelfN = (game, system) => s.items.filter(i => i.status !== 'sold' && i.game === game && i.system === system).length;
  app().innerHTML = `${staffTabs('trade')}
  <div class="trade-grid">
    <section class="panel">
      <h2>Buy ticket</h2>
      <div class="row2"><label>Phone<input id="tk-phone" value="${esc(tk.phone)}" inputmode="tel" placeholder="Looks up their account" autocomplete="off"></label>
        <label>Customer name<input id="tk-customer" value="${esc(tk.customer)}" placeholder="Name"></label></div>
      <p class="tk-who" id="tk-who"></p>
      <form id="tk-add" class="tk-add">
        <label class="tk-game">Game or console<input name="q" list="tk-games" placeholder="Type to search the price guide" autocomplete="off" required></label>
        <datalist id="tk-games">${CATALOG.map(c => `<option value="${esc(c.game)} (${esc(sysName(c.system))})">`).join('')}</datalist>
        <label>Completeness<select name="pkg">${pkgOptions('Loose')}</select></label>
        <label>Condition<select name="cond">${Object.keys(CONDITIONS).map(k => `<option value="${k}">${esc(condName(k))}</option>`).join('')}</select></label>
        <label class="check"><input type="checkbox" name="works" checked> Works</label>
        <button class="btn primary">Add</button>
        <p class="tk-manual">Not in the list? <button type="button" class="link" data-action="manual-add">Add an item by hand</button></p>
      </form>
      ${tk.lines.length ? `<div class="table-wrap"><table class="inv-table tk-lines">
        <thead><tr><th>Item</th><th>Cond.</th><th class="num">Guide</th><th class="num">Cash</th><th class="num">Credit</th><th></th></tr></thead>
        <tbody>${tk.lines.map((l, n) => { const w = wantN(l.game, l.system), sh = shelfN(l.game, l.system);
          return `<tr><td><b class="tk-name">${esc(l.game)}</b><div class="muted small">${esc(sysName(l.system) || 'Not in price guide')} · ${esc(PACKAGING[l.packaging].label)}${l.works ? '' : ' · <b>not working</b>'}</div>
            ${w || sh ? `<div class="tk-tags">${w ? `<span class="tag want">${w} customer${w > 1 ? 's' : ''} want this</span>` : ''}${sh ? `<span class="tag">${sh} on the shelf</span>` : ''}</div>` : ''}</td>
          <td>${esc(condName(l.condition))}</td><td class="num">${money(l.guide)}</td>
          <td class="num"><span class="price-in">$<input data-line="${n}" data-k="cash" value="${l.cash}" inputmode="decimal" aria-label="Cash offer for ${esc(l.game)}"></span></td>
          <td class="num"><span class="price-in">$<input data-line="${n}" data-k="credit" value="${l.credit}" inputmode="decimal" aria-label="Credit offer for ${esc(l.game)}"></span></td>
          <td class="acts"><button class="btn small" data-action="tk-rm" data-i="${n}" aria-label="Remove ${esc(l.game)}">Remove</button></td></tr>`; }).join('')}</tbody></table></div>`
        : '<div class="empty">Add the games the customer brought in. Offers come from the price guide and your rates, and you can change any of them.</div>'}
    </section>
    <aside class="panel tk-sum">
      <h2>Offer</h2>
      <div class="q-box"><div class="${tk.payout === 'cash' ? 'best' : ''}"><span>Cash</span><b class="wheel" id="tk-cash"></b></div>
        <div class="${tk.payout === 'credit' ? 'best' : ''}"><span>Store credit</span><b class="wheel" id="tk-credit"></b></div></div>
      <div class="seg pay" role="radiogroup" aria-label="Pay out as">
        <button class="${tk.payout === 'cash' ? 'on' : ''}" data-action="tk-payout" data-k="cash" role="radio" aria-checked="${tk.payout === 'cash'}">Pay cash</button>
        <button class="${tk.payout === 'credit' ? 'on' : ''}" data-action="tk-payout" data-k="credit" role="radio" aria-checked="${tk.payout === 'credit'}">Give store credit</button></div>
      <button class="btn primary wide" data-action="tk-accept" id="tk-accept" ${tk.lines.length ? '' : 'disabled'}>Accept trade · ${money(tk.payout === 'cash' ? cash : credit)}</button>
      <p class="muted small tk-need" id="tk-need" hidden>Store credit goes on an account, so add the customer's phone number first.</p>
      <button class="btn wide" data-action="tk-clear" ${tk.lines.length || tk.customer ? '' : 'disabled'}>Clear ticket</button>
      <details class="rates"><summary>Trade-in rates</summary>
        <form id="rates" class="rates-grid">
          <label>Cash<span class="pct"><input name="cashPct" type="number" min="0" max="100" value="${st.cashPct}">%</span></label>
          <label>Store credit<span class="pct"><input name="creditPct" type="number" min="0" max="100" value="${st.creditPct}">%</span></label>
          <label>${esc(condName('B'))}<span class="pct"><input name="condB" type="number" min="0" max="100" value="${st.cond.B}">%</span></label>
          <label>${esc(condName('C'))}<span class="pct"><input name="condC" type="number" min="0" max="100" value="${st.cond.C}">%</span></label>
          <label>Not working<span class="pct"><input name="brokenPct" type="number" min="0" max="100" value="${st.brokenPct}">%</span></label>
          <label>Flag after<span class="pct"><input name="markdownDays" type="number" min="1" max="365" value="${st.markdownDays}">days</span></label>
        </form>
        <p class="muted small">Cash and credit are a % of the price guide, then reduced for condition. The customer quote on “Sell to us” uses the same rates. New rates apply to games added after the change.</p>
      </details>
    </aside>
  </div>
  <section class="panel"><h2>To test and list (${s.intake.length})</h2>
    <p class="muted small">Games from accepted trades. Test each one, then list it: the draft opens with the price guide and what you paid filled in.</p>
    <div class="inv">${s.intake.map(x => `<div class="inv-row"><img src="${esc(photoSrc(phPhotos(x.game, x.system || 'GB', x.category || 'cartridge', 1)[0]))}" alt="">
      <div class="inv-t"><b>${esc(x.game)}</b><div class="muted small">${esc(sysName(x.system) || '—')} · ${esc(PACKAGING[x.packaging].label)} · ${esc(condName(x.condition))}${x.works ? '' : ' · not working'} · paid ${money(x.cost)} · ${esc(x.from)}</div></div>
      <div class="inv-a"><button class="btn small primary" data-action="intake-list" data-id="${x.id}">List it</button><button class="btn small" data-action="intake-rm" data-id="${x.id}">Remove</button></div></div>`).join('') || '<p class="muted">Nothing waiting. Accepted trade-ins show up here.</p>'}</div></section>
  <section class="panel"><h2>Recent trades</h2>
    <div class="inv">${s.trades.slice(0, 8).map(tradeRow).join('') || '<p class="muted">No trades yet.</p>'}</div></section>`;
  setWheel($('#tk-cash'), Math.round(cash)); setWheel($('#tk-credit'), Math.round(credit));
  // phone lookup: shows the account and its balance, and blocks store credit without one
  const who = () => {
    const c = custByPhone(tk.phone), d = digits(tk.phone);
    $('#tk-who').innerHTML = c ? `<span class="credit-chip">${money(creditBalance(c.id))} credit</span> <b>${esc(c.name)}</b> · account found · <a href="#/staff/customers/${c.id}">Open account</a>`
      : d.length === 10 ? 'New customer: an account opens when you accept the trade.'
      : '<span class="muted">Type a phone number to find their account. Needed for store credit.</span>';
    const blocked = tk.payout === 'credit' && d.length !== 10;
    $('#tk-accept').disabled = !tk.lines.length || blocked; $('#tk-need').hidden = !(tk.lines.length && blocked);
  };
  who();
  $('#tk-customer').addEventListener('input', e => { tk.customer = e.target.value; Store.save(); });
  $('#tk-phone').addEventListener('input', e => {
    tk.phone = e.target.value; const c = custByPhone(tk.phone);
    if (c && !tk.customer.trim()) { tk.customer = c.name; $('#tk-customer').value = c.name; }
    Store.save(); who();
  });
  $('#tk-add').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target;
    const q = f.q.value.trim(), m = q.match(/^(.*) \(([^)]+)\)$/);
    const name = m ? m[1] : q, sysLabel = m ? m[2] : '';
    const c = CATALOG.find(x => x.game === name && (!sysLabel || sysName(x.system) === sysLabel)) || CATALOG.find(x => normalize(x.game) === normalize(name));
    const pkg = f.pkg.value, cond = f.cond.value, works = f.works.checked;
    if (!c) { manualItemModal({ name, pkg, cond, works }); return; } // not in the price list: add it by hand
    const guide = pkg === 'CIB' ? c.cib : c.loose;
    const off = tradeOffer(guide, cond, works);
    tk.lines.push({ catalogId: c.id, game: c.game, system: c.system, category: c.category, packaging: pkg, condition: cond, works, guide, cash: off.cash, credit: off.credit });
    Store.save(); viewTradeDesk(); $('#tk-add').q.focus();
  });
  document.querySelectorAll('[data-line]').forEach(el => el.addEventListener('change', () => {
    const l = tk.lines[+el.dataset.line]; l[el.dataset.k] = Math.max(0, round2(+el.value.replace(/[^0-9.]/g, '') || 0)); Store.save(); viewTradeDesk();
  }));
  $('#rates').addEventListener('change', e => {
    const f = e.currentTarget, v = n => Math.max(0, Math.min(+f[n].value || 0, n === 'markdownDays' ? 365 : 100));
    Object.assign(st, { cashPct: v('cashPct'), creditPct: v('creditPct'), brokenPct: v('brokenPct'), markdownDays: Math.max(1, v('markdownDays')) });
    st.cond.B = v('condB'); st.cond.C = v('condC');
    Store.save(); toast('Trade-in rates saved.');
  });
}

/* Open a listing draft for a traded-in game (same review step as photo drafts). */
async function draftFromIntake(x) {
  const entry = CATALOG.find(c => c.id === x.catalogId);
  const market = await lookupMarketPrice(x.game, x.system, x.packaging);
  const title = buildTitle(x.game, x.system, x.packaging);
  const d = {
    catalogId: x.catalogId, game: x.game, system: x.system, category: x.category, packaging: x.packaging, condition: x.condition,
    title, alt: buildAlt(title), weightOz: (WEIGHT_TEMPLATE_OZ[x.category] || {})[x.packaging] || 8,
    market, price: suggestPrice(x.packaging === 'CIB' ? market.cib : market.loose),
    specs: defaultSpecs(x.category, entry), tested: x.works, testedDate: new Date().toISOString().slice(0, 10),
    ai: { confidence: 1, source: 'trade-in ticket' }, photos: phPhotos(x.game, x.system, x.category, x.packaging === 'CIB' ? 4 : 3),
    intakeId: x.id, cost: x.cost,
  };
  d.description = buildDescription(d);
  return d;
}

/* ---------- actions for the tools above ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-action]'); if (!b) return;
  const s = Store.s, a = b.dataset.action, tk = s.ticket;
  const item = b.dataset.id && s.items.find(i => i.id === b.dataset.id);
  const selected = () => s.items.filter(i => invSel.has(i.id));
  switch (a) {
    case 'inv-view': invView = b.dataset.k; invSel.clear(); viewInventory(); break;
    case 'bulk-clear': invSel.clear(); viewInventory(); break;
    case 'bulk-markdown': {
      const pct = Math.min(90, Math.max(1, +$('#bulk-pct').value || 0)); let alerts = 0;
      const its = selected(); its.forEach(i => { const base = +(i.compareAt || i.price); alerts += applyPrice(i, markdownPrice(base, pct), true).length; });
      Store.save(); invSel.clear(); viewInventory();
      toast(`${its.length} item${its.length > 1 ? 's' : ''} marked down ${pct}%${alerts ? ` · ${alerts} wishlist alert${alerts > 1 ? 's' : ''} sent` : ''}`); break;
    }
    case 'bulk-endsale': {
      const its = selected().filter(i => i.compareAt); its.forEach(i => { i.price = i.compareAt; i.compareAt = null; });
      Store.save(); invSel.clear(); viewInventory(); toast(its.length ? `Sale ended on ${its.length} item${its.length > 1 ? 's' : ''}` : 'None of those were on sale.'); break;
    }
    case 'bulk-guide': {
      let n = 0, alerts = 0;
      selected().forEach(i => { const g = guideFor(i.game, i.system, i.packaging); if (g) { alerts += applyPrice(i, +suggestPrice(g)).length; i.compareAt = null; n++; } });
      Store.save(); invSel.clear(); viewInventory(); toast(`${n} item${n === 1 ? '' : 's'} set to the guide price${alerts ? ` · ${alerts} wishlist alert${alerts > 1 ? 's' : ''} sent` : ''}`); break;
    }
    case 'edit-item': if (item) editItemModal(item); break;
    case 'delete-item':
      if (item && confirm(`Remove “${item.title}” from the site? This can't be undone.`)) {
        s.items = s.items.filter(i => i.id !== item.id); s.reservations = s.reservations.filter(r => r.itemId !== item.id);
        Store.save(); closeModal(); if (location.hash.startsWith('#/item/')) location.hash = '#/staff/inventory'; else render(); toast('Listing removed.');
      }
      break;
    case 'tk-rm': tk.lines.splice(+b.dataset.i, 1); Store.save(); viewTradeDesk(); break;
    case 'tk-payout': tk.payout = b.dataset.k; Store.save(); viewTradeDesk(); break;
    case 'tk-clear': if (!tk.lines.length || confirm('Clear this ticket?')) { s.ticket = newTicket(); Store.save(); viewTradeDesk(); } break;
    case 'tk-accept': {
      if (!tk.lines.length) break;
      if (tk.payout === 'credit' && digits(tk.phone).length !== 10) { toast('Add the customer’s phone number to give store credit.', 'warn'); break; }
      const total = round2(tk.lines.reduce((t, l) => t + (+l[tk.payout] || 0), 0));
      const cust = digits(tk.phone).length === 10 ? upsertCustomer(tk.customer, tk.phone) : null;
      const trade = { id: 't' + Date.now(), at: new Date().toISOString(), customerId: cust ? cust.id : null, customer: cust ? cust.name : tk.customer.trim(), phone: cust ? cust.phone : '', payout: tk.payout, total, lines: tk.lines };
      s.trades.unshift(trade);
      if (cust && trade.payout === 'credit') addLedger(cust.id, total, 'trade', `Trade-in: ${trade.lines.map(l => l.game).join(', ')}`, trade.id);
      const from = `${trade.customer || 'Walk-in'}, ${fmtDate(trade.at)}`;
      tk.lines.forEach((l, n) => s.intake.push({ id: trade.id + '-' + n, tradeId: trade.id, from, catalogId: l.catalogId, game: l.game, system: l.system, category: l.category, packaging: l.packaging, condition: l.condition, works: l.works, cost: round2(+l[tk.payout] || 0) }));
      s.ticket = newTicket(); Store.save(); oneUp('1UP!', b); viewTradeDesk();
      openModal(tradeReceipt(trade));
      toast(`Trade accepted: ${money(total)} ${trade.payout === 'cash' ? 'cash' : `store credit for ${esc(cust.name)}, balance now ${money(creditBalance(cust.id))}`}`); break;
    }
    case 'intake-rm': if (confirm('Remove this from the queue? (Use this if it was kept, sold as-is or thrown out.)')) { s.intake = s.intake.filter(x => x.id !== b.dataset.id); Store.save(); viewTradeDesk(); } break;
    case 'intake-list': {
      const x = s.intake.find(y => y.id === b.dataset.id); if (!x) break;
      if (!x.catalogId) { toast('Not in the price guide: snap photos on Add item to draft this one.', 'warn'); location.hash = '#/staff'; break; }
      if (s.draft && !confirm('There is already a draft waiting for review. Replace it?')) break;
      s.draft = await draftFromIntake(x); Store.save(); location.hash = '#/staff'; break;
    }
  }
});

/* ---------- Items added by hand (the store's own price list) ---------- */
/* Custom systems and price-list entries live in the saved data and are merged into
   SYSTEMS and CATALOG, so search, price checks, quotes and listing drafts all see them. */
function applyCustomCatalog() {
  for (const k of Object.keys(SYSTEMS)) if (SYSTEMS[k].custom) delete SYSTEMS[k];
  for (let i = CATALOG.length - 1; i >= 0; i--) if (CATALOG[i].custom) CATALOG.splice(i, 1);
  Object.assign(SYSTEMS, Store.s.customSystems || {});
  CATALOG.push(...(Store.s.customCatalog || []));
}

function manualItemModal(pre = {}) {
  const sysKeys = Object.keys(SYSTEMS);
  openModal(`<h2>Add an item by hand</h2>
    <p class="muted small">For anything not in the price list yet: a game, console, controller or accessory.</p>
    <form id="man-form" class="stack">
      <label>Name<input name="name" value="${esc(pre.name || '')}" required placeholder="e.g. Kingdom Hearts II"></label>
      <div class="row2"><label>System<select name="system">${sysKeys.map(k => `<option value="${k}">${esc(sysName(k))}</option>`).join('')}<option value="__new">New system…</option></select></label>
        <label>Type<select name="category">${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label></div>
      <label class="man-newsys" hidden>New system name<input name="newSystem" placeholder="e.g. PlayStation 2"></label>
      <div class="row2"><label>Completeness<select name="pkg">${pkgOptions(pre.pkg || 'Loose')}</select></label>
        <label>Condition<select name="cond">${Object.keys(CONDITIONS).map(k => `<option value="${k}" ${k === (pre.cond || 'A') ? 'selected' : ''}>${esc(condName(k))}</option>`).join('')}</select></label></div>
      <label class="check"><input type="checkbox" name="works" ${pre.works === false ? '' : 'checked'}> Works</label>
      <div class="row2"><label>Market value, game only ($)<input name="loose" inputmode="decimal" placeholder="Optional"></label>
        <label>Market value, complete in box ($)<input name="cib" inputmode="decimal" placeholder="Optional"></label></div>
      <p class="muted small man-links">Check what it sells for: <a id="man-pc" target="_blank" rel="noopener">PriceCharting ↗</a> · <a id="man-ebay" target="_blank" rel="noopener">eBay sold ↗</a></p>
      <div class="sell-sum" id="man-offer"></div>
      <label class="check"><input type="checkbox" name="save" checked> Save to our price list so it shows up in search next time</label>
      <div class="row"><button class="btn primary">Add to ticket</button><button type="button" class="btn" data-action="close">Cancel</button></div>
    </form>`);
  const f = $('#man-form'), num = v => { const n = +String(v).replace(/[^0-9.]/g, ''); return n > 0 ? round2(n) : null; };
  const update = () => {
    $('.man-newsys').hidden = f.system.value !== '__new';
    const sysLabel = f.system.value === '__new' ? f.newSystem.value.trim() : sysName(f.system.value);
    $('#man-pc').href = pricechartingUrl(f.name.value.trim(), f.system.value === '__new' ? '' : f.system.value);
    $('#man-ebay').href = 'https://www.ebay.com/sch/i.html?_nkw=' + encodeURIComponent(`${f.name.value.trim()} ${sysLabel}`.trim()).replace(/%20/g, '+') + '&LH_Sold=1&LH_Complete=1';
    const guide = f.pkg.value === 'CIB' ? num(f.cib.value) : num(f.loose.value);
    const off = tradeOffer(guide, f.cond.value, f.works.checked);
    $('#man-offer').innerHTML = guide ? `Offer from your rates: <b>${money(off.cash)}</b> cash or <b>${money(off.credit)}</b> store credit. You can still change it on the ticket.`
      : 'No market value yet: the offer starts at $0 and you type it on the ticket.';
  };
  ['input', 'change'].forEach(ev => f.addEventListener(ev, update)); update();
  f.addEventListener('submit', e => {
    e.preventDefault();
    const s = Store.s, name = f.name.value.trim();
    if (!name) return;
    let system = f.system.value;
    if (system === '__new') {
      const label = f.newSystem.value.trim();
      if (!label) { toast('Type the new system’s name.', 'warn'); f.newSystem.focus(); return; }
      system = Object.keys(SYSTEMS).find(k => normalize(SYSTEMS[k].name) === normalize(label));
      if (!system) {
        system = 'X' + slugify(label).replace(/-/g, '').toUpperCase().slice(0, 10) + Object.keys(s.customSystems).length;
        s.customSystems[system] = { name: label, tag: slugify(label).replace(/-/g, ''), color: '#5e6470', custom: true };
      }
    }
    const category = f.category.value, pkg = f.pkg.value, loose = num(f.loose.value), cib = num(f.cib.value);
    let entry = CATALOG.find(c => normalize(c.game) === normalize(name) && c.system === system);
    if (!entry && f.save.checked) {
      entry = { id: 'x' + Date.now().toString(36), game: name, system, category, loose, cib, save: false, aliases: [normalize(name)], custom: true, added: new Date().toISOString() };
      s.customCatalog.push(entry);
    } else if (entry && entry.custom) { // fill in values the saved entry was missing
      if (loose && !entry.loose) entry.loose = loose; if (cib && !entry.cib) entry.cib = cib;
    }
    applyCustomCatalog();
    const guide = entry ? (pkg === 'CIB' ? entry.cib : entry.loose) : (pkg === 'CIB' ? cib : loose);
    const works = f.works.checked, off = tradeOffer(guide, f.cond.value, works);
    s.ticket.lines.push({ catalogId: entry ? entry.id : null, game: entry ? entry.game : name, system, category: entry ? entry.category : category, packaging: pkg, condition: f.cond.value, works, guide: guide || null, cash: off.cash, credit: off.credit });
    Store.save(); closeModal(); viewTradeDesk();
    toast(`${esc(name)} added to the ticket${entry && entry.custom && f.save.checked ? ' and saved to your price list' : ''}${guide ? '' : ' · type the offer on the ticket'}`);
  });
}
document.addEventListener('click', e => { const b = e.target.closest('[data-action="manual-add"]'); if (b) manualItemModal({ name: ($('#tk-add') && $('#tk-add').q.value.trim()) || '' }); });

/* ================= 3. Customers and store credit ================= */
function tradeRow(t) {
  const c = t.customerId && custById(t.customerId);
  return `<div class="want-row"><b>${c ? `<a href="#/staff/customers/${c.id}">${esc(c.name)}</a>` : esc(t.customer || 'Walk-in')}</b>
    <span class="muted small">${fmtDate(t.at)} · ${t.lines.length} item${t.lines.length > 1 ? 's' : ''}: ${esc(t.lines.map(l => l.game).join(', '))} · <button class="link" data-action="trade-receipt" data-id="${t.id}">Receipt</button></span>
    <span class="want-n">${money(t.total)} ${t.payout === 'cash' ? 'cash' : 'credit'}</span></div>`;
}

function tradeReceipt(t) {
  const c = t.customerId && custById(t.customerId), credit = t.payout === 'credit';
  return `<div class="receipt">
    <div class="rc-head"><b>1UP VIDEOGAMES</b><span>${esc(STORE.address)} · ${esc(fmtPhone(STORE.phone))}</span></div>
    <h2>Trade-in receipt</h2>
    <p class="muted small">${fmtDateTime(t.at)} · Ticket #${esc(t.id.replace(/\D/g, '').slice(-6).padStart(4, '0'))}${c ? ` · ${esc(c.name)}, ${esc(c.phone)}` : t.customer ? ` · ${esc(t.customer)}` : ''}</p>
    <table class="inv-table"><thead><tr><th>Item</th><th>Condition</th><th class="num">${credit ? 'Credit' : 'Cash'}</th></tr></thead>
      <tbody>${t.lines.map(l => `<tr><td>${esc(l.game)}<div class="muted small">${esc(sysName(l.system) || '')} · ${esc(PACKAGING[l.packaging].label)}${l.works ? '' : ' · not working'}</div></td><td>${esc(condName(l.condition))}</td><td class="num">${money(l[t.payout])}</td></tr>`).join('')}</tbody>
      <tfoot><tr><th colspan="2">${credit ? 'Store credit issued' : 'Cash paid'}</th><th class="num">${money(t.total)}</th></tr></tfoot></table>
    ${c && credit ? `<p class="rc-bal"><span>Store credit balance now</span><b>${money(creditBalance(c.id))}</b></p><p class="muted small">Credit is saved on the account for ${esc(c.phone)}. Give this number at the counter to use it.</p>` : ''}
    <div class="row no-print"><button class="btn primary" data-action="print">Print receipt</button><button class="btn" data-action="close">Done</button></div></div>`;
}

/* Ring up a sale: optional customer, store credit first, the rest by card or cash. */
function sellModal(it) {
  const res = Store.s.reservations.find(r => r.itemId === it.id);
  openModal(`<h2>Ring up sale</h2>
    <p><b>${esc(it.title)}</b> · listed at ${money(it.price)}${res ? ` · on hold for ${esc(res.name)}` : ''}</p>
    <form id="sell-form" class="stack">
      <div class="row2"><label>Sold for ($)<input name="price" value="${(+it.price).toFixed(2)}" inputmode="decimal" required></label>
        <label>Customer phone<input name="phone" value="${esc(res ? res.phone : '')}" inputmode="tel" placeholder="Optional · needed to use credit" autocomplete="off"></label></div>
      <p class="tk-who" id="sell-who"></p>
      <div class="row2"><label>Store credit used ($)<input name="credit" value="0" inputmode="decimal"></label>
        <label>Rest paid by<select name="method"><option value="card">Card</option><option value="cash">Cash</option></select></label></div>
      <div class="sell-sum" id="sell-sum"></div>
      <div class="row"><button class="btn primary" id="sell-ok">Mark sold</button><button type="button" class="btn" data-action="close">Cancel</button></div>
    </form>`);
  const f = $('#sell-form'), num = v => round2(+String(v).replace(/[^0-9.]/g, '') || 0);
  const update = () => {
    const c = custByPhone(f.phone.value), bal = c ? creditBalance(c.id) : 0, price = num(f.price.value), cr = num(f.credit.value);
    const max = round2(Math.min(bal, price));
    $('#sell-who').innerHTML = c ? `<span class="credit-chip">${money(bal)} credit</span> <b>${esc(c.name)}</b>${max > 0 ? ` · <button type="button" class="link" id="use-max">Use ${money(max)}</button>` : ''}`
      : digits(f.phone.value).length === 10 ? '<span class="muted">No account with this number. The sale is recorded without one.</span>' : '';
    const um = $('#use-max'); if (um) um.onclick = () => { f.credit.value = max.toFixed(2); update(); };
    let err = '';
    if (cr > 0 && !c) err = 'Find the customer’s account to use store credit.';
    else if (cr > bal) err = `Only ${money(bal)} credit available.`;
    else if (cr > price) err = 'Credit can’t be more than the sale price.';
    const rest = round2(Math.max(0, price - cr));
    $('#sell-sum').innerHTML = err ? `<span class="err">${err}</span>`
      : `${cr > 0 ? `Store credit ${money(cr)} + ` : ''}${f.method.value === 'cash' ? 'Cash' : 'Card'} ${money(rest)} = <b>${money(price)}</b>${c && cr > 0 ? ` · credit left ${money(round2(bal - cr))}` : ''}`;
    $('#sell-ok').disabled = !!err || !(price > 0);
  };
  ['input', 'change'].forEach(ev => f.addEventListener(ev, update)); update();
  f.addEventListener('submit', e => {
    e.preventDefault(); update(); if ($('#sell-ok').disabled) return;
    const c = custByPhone(f.phone.value), price = num(f.price.value), cr = num(f.credit.value);
    it.status = 'sold'; it.soldAt = new Date().toISOString();
    it.sale = { price, credit: cr, rest: round2(price - cr), method: f.method.value, customerId: c ? c.id : null };
    if (cr > 0) addLedger(c.id, -cr, 'sale', `Used on ${it.title}`, it.id);
    Store.s.reservations = Store.s.reservations.filter(r => r.itemId !== it.id);
    Store.save(); closeModal(); render();
    toast(`Sold for ${money(price)}${cr > 0 ? ` · ${money(cr)} store credit used, ${esc(c.name)} has ${money(creditBalance(c.id))} left` : ''} · moved to Recently sold`);
  });
}

let custQ = '';
function viewCustomers() {
  const s = Store.s, id = (location.hash.split('/')[3] || '');
  const one = id && custById(id); if (one) return viewCustomer(one);
  const last = c => [c.created, ...s.ledger.filter(l => l.customerId === c.id).map(l => l.at), ...s.trades.filter(t => t.customerId === c.id).map(t => t.at)].sort().pop();
  const q = normalize(custQ), qd = digits(custQ);
  const list = s.customers.filter(c => !custQ || normalize(c.name).includes(q) || (qd.length >= 3 && digits(c.phone).includes(qd))).sort((a, b) => last(b) > last(a) ? 1 : -1);
  const owed = s.customers.reduce((t, c) => t + creditBalance(c.id), 0);
  app().innerHTML = `${staffTabs('customers')}
  <section class="panel">
    <div class="inv-top"><div><h2>Customers</h2><p class="muted small">${s.customers.length} accounts · ${money(owed)} store credit outstanding. Accounts open automatically when a trade is paid in store credit.</p></div>
      <div class="row"><input type="search" id="cust-q" value="${esc(custQ)}" placeholder="Search name or phone" aria-label="Search customers"><button class="btn" data-action="cust-new">New customer</button></div></div>
    <div class="table-wrap"><table class="inv-table">
      <thead><tr><th>Name</th><th>Phone</th><th class="num">Store credit</th><th class="num">Trades</th><th>Last visit</th></tr></thead>
      <tbody>${list.map(c => `<tr class="click" data-href="#/staff/customers/${c.id}"><td><a href="#/staff/customers/${c.id}"><b>${esc(c.name)}</b></a></td><td>${esc(c.phone)}</td>
        <td class="num">${creditBalance(c.id) > 0 ? `<span class="credit-chip">${money(creditBalance(c.id))}</span>` : money(0)}</td><td class="num">${s.trades.filter(t => t.customerId === c.id).length}</td><td>${fmtDate(last(c))}</td></tr>`).join('')
        || `<tr><td colspan="5"><div class="empty">No customers${custQ ? ` matching “${esc(custQ)}”` : ' yet'}.</div></td></tr>`}</tbody></table></div>
  </section>`;
  $('#cust-q').addEventListener('input', e => { custQ = e.target.value; clearTimeout(viewCustomers._t); viewCustomers._t = setTimeout(() => { viewCustomers(); const q = $('#cust-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); });
}

function viewCustomer(c) {
  const s = Store.s, bal = creditBalance(c.id);
  const lines = s.ledger.filter(l => l.customerId === c.id).sort((a, b) => a.at > b.at ? 1 : -1);
  let run = 0; const rows = lines.map(l => ({ ...l, after: run = round2(run + l.amount) })).reverse();
  const trades = s.trades.filter(t => t.customerId === c.id);
  const buys = s.items.filter(i => i.sale && i.sale.customerId === c.id).sort((a, b) => b.soldAt > a.soldAt ? 1 : -1);
  const wants = s.wishlist.filter(w => (digits(w.contact).length === 10 && digits(w.contact) === digits(c.phone)) || (c.email && w.contact === c.email));
  app().innerHTML = `${staffTabs('customers')}
  <a class="back" href="#/staff/customers">← All customers</a>
  <div class="cust-grid">
    <section class="panel"><h2>${esc(c.name)}</h2>
      <p class="cust-meta">${esc(c.phone)}${c.email ? ` · ${esc(c.email)}` : ''}<br><span class="muted small">Customer since ${fmtDate(c.created)}</span></p>
      <button class="btn small" data-action="cust-edit" data-id="${c.id}">Edit details</button></section>
    <section class="panel cust-bal"><span class="muted">Store credit</span><b>${money(bal)}</b>
      <div class="row"><button class="btn primary" data-action="cust-trade" data-id="${c.id}">Start a trade</button><button class="btn" data-action="cust-adjust" data-id="${c.id}">Adjust credit</button></div></section>
  </div>
  <section class="panel"><h2>Credit history</h2>
    <p class="muted small">Every change to the balance is a line here, with who made it and why. Balances are never edited directly.</p>
    <div class="table-wrap"><table class="inv-table">
      <thead><tr><th>Date</th><th>What</th><th>Staff</th><th class="num">Amount</th><th class="num">Balance</th></tr></thead>
      <tbody>${rows.map(l => `<tr><td>${fmtDate(l.at)}</td><td>${esc(l.note)}${l.kind === 'trade' && l.ref ? ` · <button class="link" data-action="trade-receipt" data-id="${esc(l.ref)}">Receipt</button>` : ''}</td><td>${esc(l.staff || '—')}</td>
        <td class="num amt ${l.amount > 0 ? 'plus' : ''}">${l.amount > 0 ? '+' : '−'}${money(Math.abs(l.amount))}</td><td class="num">${money(l.after)}</td></tr>`).join('')
        || '<tr><td colspan="5"><div class="empty">No store credit yet.</div></td></tr>'}</tbody></table></div></section>
  <div class="two-col cust-cols">
    <section class="panel"><h2>Trades (${trades.length})</h2><div class="inv">${trades.map(tradeRow).join('') || '<p class="muted">None yet.</p>'}</div></section>
    <section class="panel"><h2>Purchases (${buys.length})</h2><div class="inv">${buys.map(i => `<div class="want-row"><a href="#/item/${i.id}"><b>${esc(i.title)}</b></a><span class="muted small">${fmtDate(i.soldAt)}${i.sale.credit ? ` · ${money(i.sale.credit)} credit + ${money(i.sale.rest)} ${i.sale.method}` : ` · ${i.sale.method}`}</span><span class="want-n">${money(i.sale.price)}</span></div>`).join('') || '<p class="muted">None yet.</p>'}</div>
      <h3>Wishlist alerts</h3><div class="inv">${wants.map(w => `<div class="want-row"><b>${esc(w.game)}</b><span class="muted small">${w.system ? esc(sysName(w.system)) : 'Any system'}${w.maxPrice ? ' · up to ' + money(w.maxPrice) : ''} · by ${w.via === 'sms' ? 'text' : 'email'}</span></div>`).join('') || '<p class="muted">None.</p>'}</div></section>
  </div>`;
}

function customerModal(c) {
  openModal(`<h2>${c ? 'Edit customer' : 'New customer'}</h2>
    <form id="cust-form" class="stack">
      <label>Name<input name="name" value="${esc(c ? c.name : '')}" required></label>
      <div class="row2"><label>Phone<input name="phone" value="${esc(c ? c.phone : '')}" inputmode="tel" required></label>
        <label>Email<input name="email" type="email" value="${esc(c ? c.email : '')}" placeholder="Optional"></label></div>
      <p class="muted small">Demo only: nothing is sent. The phone number is how staff find the account at the counter.</p>
      <div class="row"><button class="btn primary">${c ? 'Save' : 'Create account'}</button><button type="button" class="btn" data-action="close">Cancel</button></div>
    </form>`);
  $('#cust-form').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target, other = custByPhone(f.phone.value);
    if (digits(f.phone.value).length !== 10) { toast('Enter a 10-digit phone number.', 'warn'); return; }
    if (other && (!c || other.id !== c.id)) { toast(`That number already belongs to ${esc(other.name)}.`, 'warn'); return; }
    const x = c || { id: 'c' + Date.now().toString(36), created: new Date().toISOString() };
    Object.assign(x, { name: f.name.value.trim(), phone: fmtPhone(f.phone.value), email: f.email.value.trim() });
    if (!c) Store.s.customers.unshift(x);
    Store.save(); closeModal(); location.hash = '#/staff/customers/' + x.id; render();
  });
}

function adjustModal(c) {
  const bal = creditBalance(c.id);
  openModal(`<h2>Adjust store credit</h2><p><b>${esc(c.name)}</b> · balance ${money(bal)}</p>
    <form id="adj-form" class="stack">
      <div class="row2"><label>Change<select name="dir"><option value="1">Add credit</option><option value="-1">Remove credit</option></select></label>
        <label>Amount ($)<input name="amount" inputmode="decimal" required></label></div>
      <label>Reason<input name="note" required placeholder="e.g. Made it right on a bad cartridge"></label>
      <label>Your initials<input name="staff" required maxlength="4" placeholder="e.g. JV"></label>
      <div class="row"><button class="btn primary">Save adjustment</button><button type="button" class="btn" data-action="close">Cancel</button></div>
    </form>`);
  $('#adj-form').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target, amt = round2(+f.amount.value.replace(/[^0-9.]/g, '') || 0) * +f.dir.value;
    if (!amt) { toast('Enter an amount.', 'warn'); return; }
    if (bal + amt < 0) { toast(`Can't remove more than the ${money(bal)} balance.`, 'warn'); return; }
    addLedger(c.id, amt, 'adjust', 'Adjustment: ' + f.note.value.trim(), '', f.staff.value.trim().toUpperCase());
    Store.save(); closeModal(); render(); toast(`Balance now ${money(creditBalance(c.id))}`);
  });
}

document.addEventListener('click', e => {
  const row = e.target.closest('tr.click[data-href]'); if (row && !e.target.closest('a,button')) { location.hash = row.dataset.href; return; }
  const b = e.target.closest('[data-action]'); if (!b) return;
  const s = Store.s, c = b.dataset.id && custById(b.dataset.id);
  switch (b.dataset.action) {
    case 'cust-new': customerModal(null); break;
    case 'cust-edit': if (c) customerModal(c); break;
    case 'cust-adjust': if (c) adjustModal(c); break;
    case 'cust-trade':
      if (c) { if (s.ticket.lines.length && !confirm('There is an open buy ticket. Put this customer on it?')) break;
        s.ticket.customer = c.name; s.ticket.phone = c.phone; Store.save(); location.hash = '#/staff/trade'; }
      break;
    case 'trade-receipt': { const t = s.trades.find(x => x.id === b.dataset.id); if (t) openModal(tradeReceipt(t)); break; }
    case 'print': window.print(); break;
  }
});
