import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when the build was given Supabase credentials; otherwise the app is local-only. */
export const isCloudEnabled = Boolean(url && anonKey);

let client: Promise<SupabaseClient | null> | null = null;

/** Lazily loads the Supabase SDK so local-only users never download it. */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!isCloudEnabled) return Promise.resolve(null);
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url!, anonKey!, { auth: { persistSession: true, detectSessionInUrl: true } }),
  );
  return client;
}
