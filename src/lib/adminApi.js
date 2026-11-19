// Admin calls. Security does NOT depend on this file: every function below is checked in the database
// (private.is_admin() in supabase/schema.sql), so a visitor who calls them gets "not_admin".
import { supabase } from './supabaseStore';

export const adminAvailable = !!supabase;

export const getSession = async () => (await supabase.auth.getSession()).data.session;
export const onAuthChange = (cb) => supabase.auth.onAuthStateChange((_event, session) => cb(session)).data.subscription;
export const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
export const signOut = () => supabase.auth.signOut();

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

export const amIAdmin = async () => !!(await rpc('am_i_admin'));
export const listPending = () => rpc('admin_list_pending');
export const review = (args) => rpc('admin_review', args);
