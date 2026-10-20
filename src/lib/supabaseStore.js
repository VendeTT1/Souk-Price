import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

const PAGE_LIMIT = 300;

export const supabaseStore = {
  name: 'supabase',

  async addPrice(entry) {
    const { error } = await supabase.from('prices').insert(entry);
    if (error) throw error;
  },

  async listPrices({ item, region, city, neighborhood, marketName, rating } = {}) {
    let q = supabase
      .from('prices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(PAGE_LIMIT);
    if (item) q = q.eq('item', item);
    if (region) q = q.eq('region', region);
    if (city) q = q.eq('city', city);
    if (neighborhood) q = q.ilike('neighborhood', `%${neighborhood}%`);
    if (marketName) q = q.ilike('market_name', `%${marketName}%`);
    if (rating) q = q.eq('rating', Number(rating));
    const { data, error } = await q;
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
