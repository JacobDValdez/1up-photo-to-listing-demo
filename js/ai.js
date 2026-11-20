/* ------------------------------------------------------------------
   AI DRAFTING LAYER — pluggable.

   draftListing(photos, hint) returns a full listing draft.
   Default provider is 'mock': it matches the staff hint / photo file
   names against the small built-in CATALOG (catalog.js). It does NOT
   look at the pixels.

   To go to production, swap in the two marked functions below:
     1. identifyFromPhotos()  -> real vision model call (Claude API)
     2. lookupMarketPrice()   -> real price guide (e.g. PriceCharting)

   NEVER put an API key in this browser code. Both calls must go
   through your own small backend (e.g. a serverless function) that
   holds the keys in environment variables.
------------------------------------------------------------------- */

const AI_CONFIG = {
  provider: 'mock',          // 'mock' | 'claude'  (claude needs the backend below)
  backendUrl: '/api/draft',  // your server endpoint; never call api.anthropic.com from the browser
  pricing: { roundTo: 0.99, minPrice: 4.99 },
};

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/* ---- 1. IDENTIFY ------------------------------------------------- */
async function identifyFromPhotos(photos, hint) {
  if (AI_CONFIG.provider === 'claude') {
    /* ======================= REAL VISION CALL GOES HERE =======================
       POST the (downscaled) photos to your backend. The backend calls the
       Claude Messages API with the images as base64 image blocks plus a prompt like:

         "You are cataloguing used retro video game stock for a store listing.
          Identify the item in these photos. Return JSON:
          { game, system (one of GB,GBC,GBA,NES,SNES,N64,GCN,GEN,PS1),
            category (cartridge|disc|handheld|console|accessory),
            packaging (Loose|CIB), condition (A|B|C), visible_flaws[],
            label_original (bool|null), model_number (string|null),
            confidence (0-1) }"

       Use a current Claude model id from your backend config, ask for JSON
       output, and validate it before returning it here.

       const res = await fetch(AI_CONFIG.backendUrl, {
         method: 'POST', headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ photos, hint }) });
       return await res.json();
       ========================================================================== */
    throw new Error('Claude provider selected but no backend is configured (see js/ai.js).');
  }
  return mockIdentify(photos, hint);
}

function mockIdentify(photos, hint) {
  const text = normalize([hint, ...photos.map(p => p.name || '')].join(' '));
  let best = null, bestScore = 0;
  for (const c of CATALOG) {
    let score = 0;
    const names = [c.game, ...c.aliases].map(normalize);
    for (const n of names) {
      if (n && text.includes(n)) score = Math.max(score, n.length);
    }
    // small bonus if the system is mentioned too
    if (score && (text.includes(normalize(SYSTEMS[c.system].name)) || text.split(' ').includes(c.system.toLowerCase()))) score += 3;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  const confidence = best ? Math.min(0.97, 0.55 + bestScore / 30) : 0.2;
  if (!best) best = CATALOG[Math.floor(Math.random() * CATALOG.length)];
  const packaging = /\b(cib|box|boxed|complete|manual)\b/.test(text) ? 'CIB' : 'Loose';
  const condition = /\b(flawed|sticker|stickers|crack|cracked|yellowed|ripped)\b/.test(text) ? 'C' : /\b(worn|acceptable|scuffed|scratched)\b/.test(text) ? 'B' : 'A';
  return { catalogId: best.id, game: best.game, system: best.system, category: best.category,
           packaging, condition, confidence, source: 'mock (hint/filename match — no image analysis)' };
}

/* ---- 2. PRICE ---------------------------------------------------- */

/* PriceCharting's own console names, used to build a search link staff can open. */
const PC_CONSOLE = { GB: 'GameBoy', GBC: 'GameBoy Color', GBA: 'GameBoy Advance', NES: 'NES', SNES: 'Super Nintendo',
                     N64: 'Nintendo 64', GCN: 'Gamecube', GEN: 'Sega Genesis', PS1: 'Playstation' };
function pricechartingUrl(game, system) {
  const q = [game, PC_CONSOLE[system] || ''].join(' ').trim();
  return 'https://www.pricecharting.com/search-products?type=prices&q=' + encodeURIComponent(q).replace(/%20/g, '+');
}

/* eBay "Sold Items" search (completed + sold listings), so staff see what copies actually sold for.
   Link only: eBay's sold-price API (Marketplace Insights) is restricted to approved partners. */
function ebaySoldUrl(game, system, packaging) {
  const sys = (SYSTEMS[system] || {}).name || '';
  const parts = [game, normalize(game).includes(normalize(sys)) ? '' : sys];
  if (packaging === 'CIB') parts.push('complete');
  const q = parts.join(' ').trim();
  return 'https://www.ebay.com/sch/i.html?_nkw=' + encodeURIComponent(q).replace(/%20/g, '+') + '&LH_Sold=1&LH_Complete=1';
}

async function lookupMarketPrice(game, system, packaging) {
  /* ===================== REAL PRICE-GUIDE LOOKUP GOES HERE =====================
     PriceCharting has a paid API (needs a subscription + API token). Call it from
     YOUR BACKEND, never from this page, because the token must stay secret:

       GET https://www.pricecharting.com/api/product?t=<TOKEN>&q=<game + console>
       -> { "product-name", "console-name", "loose-price", "cib-price", "new-price", ... }
          (prices are in pennies: 5547 = $55.47)

     Cache each result for a day; don't call per keystroke. Blend with the store's
     own past sales if you have them. Check PriceCharting's API terms before launch.

     const res = await fetch('/api/price?' + new URLSearchParams({ game, system, packaging }));
     return await res.json(); // { loose, cib, source, asOf, url }
     ============================================================================ */
  const c = CATALOG.find(x => x.game === game && x.system === system) ||
            CATALOG.find(x => normalize(x.game) === normalize(game));
  if (!c) return { loose: null, cib: null, source: 'not in sample catalog' };
  return { loose: c.loose, cib: c.cib, source: 'sample catalog (placeholder prices)' };
}

function suggestPrice(market) {
  if (!market) return '';
  const p = Math.max(AI_CONFIG.pricing.minPrice, Math.ceil(market) - (1 - AI_CONFIG.pricing.roundTo));
  return p.toFixed(2);
}

/* ---- 3. WRITE THE LISTING (template; an LLM could do this too) -------- */
function buildTitle(game, system, packaging) {
  return `${game} - ${(SYSTEMS[system] || {}).name || system} ${packaging}`;
}

function buildDescription(d) {
  const sys = (SYSTEMS[d.system] || {}).name || d.system;
  const cond = CONDITIONS[d.condition] || '';
  let what;
  if (d.category === 'handheld' || d.category === 'console') {
    what = d.packaging === 'CIB' ? `${sys} system, complete in original box as pictured.` : `${sys} system only, plus any extras pictured.`;
  } else if (d.category === 'disc') {
    what = d.packaging === 'CIB' ? 'Complete in box: disc, case, cover art and manual as pictured.' : 'Game only (disc), no case or manual.';
  } else {
    what = d.packaging === 'CIB' ? 'Complete in box: cartridge, box and manual as pictured.' : 'Game only (cartridge), no box or manual.';
  }
  return `${d.game} for ${sys}. ${what} Condition: ${cond}. ` +
         `100% authentic, deep cleaned and tested by our staff in Covina before listing. What you see in the photos is the exact item you get.`;
}

function buildAlt(title) {
  return `${title}, photographed on the 1UP counter`;
}

function defaultSpecs(category, catalogEntry) {
  const specs = {};
  for (const f of SPEC_TEMPLATES[category] || []) {
    const opts = f.opts === 'models' ? (catalogEntry && catalogEntry.models) || [] : f.opts;
    specs[f.k] = opts && opts.length ? opts[0] : '';
  }
  if (category === 'cartridge' && catalogEntry && !catalogEntry.save) specs.saveBattery = 'Not applicable';
  if (category === 'handheld') specs.battery = '';
  return specs;
}

/* ---- PUBLIC ENTRY POINT ------------------------------------------ */
async function draftListing(photos, hint) {
  const id = await identifyFromPhotos(photos, hint);
  const entry = CATALOG.find(c => c.id === id.catalogId);
  const market = await lookupMarketPrice(id.game, id.system, id.packaging);
  const marketForPkg = id.packaging === 'CIB' ? market.cib : market.loose;
  const title = buildTitle(id.game, id.system, id.packaging);
  const draft = {
    catalogId: id.catalogId,
    game: id.game, system: id.system, category: id.category,
    packaging: id.packaging, condition: id.condition,
    title,
    description: '',
    alt: buildAlt(title),
    weightOz: (WEIGHT_TEMPLATE_OZ[id.category] || {})[id.packaging] || 8,
    market, price: suggestPrice(marketForPkg),
    specs: defaultSpecs(id.category, entry),
    tested: true, testedDate: new Date().toISOString().slice(0, 10),
    ai: { confidence: id.confidence, source: id.source },
  };
  // mock: pick a hardware model from hint words like "backlit" / "101"
  if (entry && entry.models && draft.specs.model) {
    const t = normalize(hint + ' ' + photos.map(p => p.name || '').join(' '));
    const m = entry.models.find(m => normalize(m).split(' ').some(w => w.length > 2 && t.includes(w) && !normalize(entry.game).includes(w)));
    if (m) draft.specs.model = m;
  }
  draft.description = buildDescription(draft);
  // simulate network latency so the demo feels like a real call
  await new Promise(r => setTimeout(r, 700));
  return draft;
}
