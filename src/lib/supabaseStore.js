import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

// user text goes into ILIKE: escape the wildcard characters so "50%" means 50%
const escapeLike = (s) => String(s).trim().replace(/[\\%_]/g, (c) => `\\${c}`);

function applyFilters(q, { item, region, city, neighborhood, marketName, rating }) {
  if (item) q = q.eq('item', item);
  if (region) q = q.eq('region', region);
  if (city) q = q.eq('city', city);
  if (neighborhood?.trim()) q = q.ilike('neighborhood', `%${escapeLike(neighborhood)}%`);
  if (marketName?.trim()) q = q.ilike('market_name', `%${escapeLike(marketName)}%`);
  if (rating) q = q.eq('rating', Number(rating));
  return q;
}

export const supabaseStore = {
  name: 'supabase',

  async addPrice(entry) {
    const { error } = await supabase.from('prices').insert(entry);
    if (error) throw error;
  },

  // Server-side pagination: only one page travels over the network.
  async listPrices(filters = {}, { page = 1, pageSize = 10 } = {}) {
    const from = (page - 1) * pageSize;
    const q = applyFilters(
      supabase.from('prices').select('*', { count: 'exact' }),
      filters,
    )
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    const { data, count, error } = await q;
    if (error) throw error;
    return { rows: data, total: count ?? data.length };
  },

  // Average over every match of the current filters (SQL function, see schema.sql).
  async getStats({ item, region, city, neighborhood, marketName, rating } = {}) {
    const { data, error } = await supabase.rpc('search_stats', {
      p_item: item || null,
      p_region: region || null,
      p_city: city || null,
      p_neighborhood: neighborhood?.trim() || null,
      p_market: marketName?.trim() || null,
      p_rating: rating ? Number(rating) : null,
    });
    if (error) throw error;
    return data?.[0] ?? null;
  },

  // Typical price (median) of one item over the last 30 days, for the "are you sure?" hint.
  async getTypical(item, unit) {
    const { data, error } = await supabase
      .from('price_summary')
      .select('median_price, entries')
      .eq('item', item)
      .eq('unit', unit)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getSummary(minEntries) {
    const { data, error } = await supabase
      .from('price_summary')
      .select('*')
      .gte('entries', minEntries)
      .order('entries', { ascending: false });
    if (error) throw error;
    return data;
  },
};
