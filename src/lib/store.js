// Single place that picks the backend. To move to Firebase or Google Sheets later,
// implement { addPrice, listPrices, getSummary } in a new file and switch it here.
import { supabase, supabaseStore } from './supabaseStore';
import { localStore } from './localStore';

export const store = supabase ? supabaseStore : localStore;

export const MIN_ENTRIES = Number(import.meta.env.VITE_MIN_ENTRIES) || 3;
