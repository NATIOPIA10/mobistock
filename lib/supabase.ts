import { createClient } from '@supabase/supabase-js';

const isBrowser = typeof window !== 'undefined';
const supabaseUrl = isBrowser 
  ? `${window.location.origin}/_supabase` 
  : process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // Explicitly use localStorage so iOS Safari PWA mode keeps the session
    storage: isBrowser ? window.localStorage : undefined,
  },
});
