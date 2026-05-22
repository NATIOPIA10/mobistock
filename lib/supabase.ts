import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
console.log('Supabase config → URL:', supabaseUrl);
console.log('Supabase config → ANON KEY (first 8 chars):', supabaseAnonKey?.slice(0, 8) + '...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
