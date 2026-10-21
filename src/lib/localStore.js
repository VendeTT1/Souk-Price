// Demo store used when Supabase env vars are missing. Data lives in the browser only.
import { ITEMS } from '../data/catalog';

const KEY = 'souk-prices-demo-v1';

const SEED_PLACES = [
  { region: 'casablanca-settat', city: 'casablanca', neighborhood: 'Maarif', market_type: 'supermarket', market_name: 'Marjane' },
  { region: 'casablanca-settat', city: 'casablanca', neighborhood: 'Derb Sultan', market_type: 'souk', market_name: 'Marché Derb Sultan' },
  { region: 'rabat-sale-kenitra', city: 'rabat', neighborhood: 'Agdal', market_type: 'supermarket', market_name: 'Carrefour' },
  { region: 'marrakech-safi', city: 'marrakech', neighborhood: 'Gueliz', market_type: 'street', market_name: 'Vendeur ambulant' },
  { region: 'fes-meknes', city: 'fes', neighborhood: 'Ville Nouvelle', market_type: 'souk', market_name: 'Marché Fès' },
];

const SEED_ITEMS = [
  ['tomato', 6], ['potato', 5], ['onion', 4], ['orange', 7], ['banana', 14],
  ['chicken-whole', 28], ['sardines', 15], ['eggs', 1.4],
];

function seed() {
  const out = [];
  let n = 0;
  for (const [itemId, base] of SEED_ITEMS) {
    const meta = ITEMS.find((i) => i.id === itemId);
    for (const p of SEED_PLACES) {
      n += 1;
      const jitter = 1 + ((n * 37) % 21 - 10) / 50; // deterministic ±20%
      out.push({
        id: `seed-${n}`,
        created_at: new Date(Date.now() - n * 3600e3).toISOString(),
        ...p,
        category: meta.category,
        item: itemId,
        unit: meta.unit,
        price: Math.round(base * jitter * 100) / 100,
        rating: ((n * 7) % 3) + 1,
        comment: null,
      });
    }
  }
  return out;
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const s = seed();
  write(s);
  return s;
}

function write(rows) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch { /* ignore */ }
}

const has = (hay, needle) => String(hay).toLowerCase().includes(String(needle).toLowerCase());

function filterRows(rows, { item, region, city, neighborhood, marketName, rating }) {
  return rows.filter((r) => (!item || r.item === item)
    && (!region || r.region === region)
    && (!city || r.city === city)
    && (!neighborhood || has(r.neighborhood, neighborhood))
    && (!marketName || has(r.market_name, marketName))
    && (!rating || r.rating === Number(rating)));
}

export const localStore = {
  name: 'local',

  async addPrice(entry) {
    const rows = read();
    rows.unshift({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...entry });
    write(rows);
  },

  async listPrices(filters = {}, { page = 1, pageSize = 10 } = {}) {
    const all = filterRows(read(), filters).sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { rows: all.slice((page - 1) * pageSize, page * pageSize), total: all.length };
  },

  async getStats(filters = {}) {
    const rows = filterRows(read(), filters);
    if (!rows.length) return null;
    // same rule as the SQL function: stats for the unit with the most entries
    const byUnit = new Map();
    rows.forEach((r) => byUnit.set(r.unit, [...(byUnit.get(r.unit) ?? []), Number(r.price)]));
    const [unit, prices] = [...byUnit.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    return {
      unit,
      avg_price: Math.round((prices.reduce((x, y) => x + y, 0) / prices.length) * 100) / 100,
      entries: prices.length,
    };
  },

  async getSummary(minEntries) {
    const cutoff = Date.now() - 30 * 24 * 3600e3;
    const groups = new Map();
    for (const r of read()) {
      if (new Date(r.created_at).getTime() < cutoff) continue;
      const k = `${r.item}|${r.unit}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    }
    const out = [];
    for (const rows of groups.values()) {
      if (rows.length < minEntries) continue;
      const prices = rows.map((r) => Number(r.price));
      out.push({
        category: rows[0].category,
        item: rows[0].item,
        unit: rows[0].unit,
        entries: rows.length,
        avg_price: Math.round((prices.reduce((a, b) => a + b, 0) / rows.length) * 100) / 100,
        min_price: Math.min(...prices),
        max_price: Math.max(...prices),
        avg_rating: Math.round((rows.reduce((a, r) => a + r.rating, 0) / rows.length) * 100) / 100,
        cities: new Set(rows.map((r) => r.city)).size,
      });
    }
    return out.sort((a, b) => b.entries - a.entries);
  },
};
