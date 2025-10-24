// pages/api/pricing.js
let CACHE = { data: null, ts: 0 };
const TTL = 5 * 60 * 1000; // 5 minutes

async function fetchCSV(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch CSV: ${resp.status}`);
  const text = await resp.text();

  // Simple CSV parse (no commas inside fields in your sheet)
  return text
    .split(/\r?\n/)
    .map(line => line.split(',').map(c => c.trim()))
    .filter(row => row.length && row.some(cell => cell !== ''));
}

function normCategory(raw) {
  const c = (raw || '').toString().trim().toLowerCase().replace(/\s+/g, '_');
  if (c.includes('polish')) return 'polished_concrete';
  if (c.includes('seal')) return 'sealed_concrete';
  if (c.includes('epoxy')) return 'epoxy';
  if (c.includes('other')) return 'other';
  return c; // allow exact matches too
}

function normService(raw) {
  // normalize: spaces, hyphens, slashes → underscores
  let key = (raw || '').toString().trim().toLowerCase().replace(/[\s\-\/]+/g, '_');

  // friendly mappings
  if (key.startsWith('micro') || key.includes('topping')) key = 'micro_topping';
  if (key.startsWith('driveway')) key = 'driveway';
  if (key.startsWith('terrazzo')) key = 'terrazzo';
  return key;
}

export default async function handler(req, res) {
  const now = Date.now();
  if (CACHE.data && now - CACHE.ts < TTL) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300');
    return res.status(200).json(CACHE.data);
  }

  try {
    const pricingUrl = process.env.PRICING_CSV_URL;
    if (!pricingUrl) throw new Error('PRICING_CSV_URL not set');

    const rows = await fetchCSV(pricingUrl);
    if (!rows.length) throw new Error('Pricing CSV returned no rows');

    // header check (case-insensitive)
    const hasHeader = rows[0][0] && rows[0][0].toString().trim().toLowerCase() === 'category';
    const body = hasHeader ? rows.slice(1) : rows;

    const pricing = {
      polished_concrete: {},
      sealed_concrete: {},
      epoxy: {},
      other: { micro_topping: {}, driveway: {}, terrazzo: {} }
    };
    const ranges = { polished_concrete: {}, sealed_concrete: {}, epoxy: {}, other: {} };

    for (const r of body) {
      // columns by index (must match sheet order)
      const rawCategory = r[0];
      const tier = r[1];
      const min = r[2];
      const max = r[3];
      const grit_200 = r[4];
      const grit_400 = r[5];
      const grit_800 = r[6];
      const grit_1800 = r[7];
      const base = r[8];
      const single = r[9];
      const metallic = r[10];
      const quartz = r[11];
      const flake = r[12];
      const service = r[13];

      if (!rawCategory || !tier) continue;

      const category = normCategory(rawCategory);
      const mn = Number(min || 0);
      const mx = Number(max || 999999);

      if (!ranges[category]) ranges[category] = {};
      ranges[category][tier] = { min: mn, max: mx };

      if (category === 'polished_concrete') {
        pricing.polished_concrete[tier] = {
          min: mn, max: mx,
          grit_200: Number(grit_200 || 0),
          grit_400: Number(grit_400 || 0),
          grit_800: Number(grit_800 || 0),
          grit_1800: Number(grit_1800 || 0),
        };
      } else if (category === 'sealed_concrete') {
        pricing.sealed_concrete[tier] = {
          min: mn, max: mx,
          base: Number(base || 0),
        };
      } else if (category === 'epoxy') {
        pricing.epoxy[tier] = {
          min: mn, max: mx,
          single: Number(single || 0),
          metallic: Number(metallic || 0),
          quartz: Number(quartz || 0),
          flake: Number(flake || 0),
        };
      } else if (category === 'other') {
        const key = normService(service);
        if (!key || !pricing.other[key]) {
          // Skip unknown “other” service types, but don’t crash
          continue;
        }
        // For "other" services, price is in grit_200 column (per your design)
        const price = Number(grit_200 || 0);
        pricing.other[key][tier] = price;
        ranges.other[tier] = { min: mn, max: mx };
      }
    }

    // SETTINGS (optional surcharges)
    const settingsUrl = process.env.SETTINGS_CSV_URL;
    let settings = { stain_polished: 500, stain_sealed: 300, integral_cove_per_lf: 15 };

    if (settingsUrl) {
      try {
        const srows = await fetchCSV(settingsUrl);
        const sHasHeader = srows[0][0] && srows[0][0].toString().trim().toLowerCase() === 'key';
        const sb = sHasHeader ? srows.slice(1) : srows;
        for (const [key, val] of sb) {
          if (key) settings[key.trim()] = Number(val);
        }
      } catch {
        // keep defaults
      }
    }

    const payload = { pricing, ranges, settings };
    CACHE = { data: payload, ts: now };
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300');
    return res.status(200).json(payload);

  } catch (err) {
    // Return a clean error so the UI can show it
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
