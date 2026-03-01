import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// FIX: Validasi SEBELUM createClient — fail-fast, tidak buat client dengan undefined
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env\n' +
    'Buat file .env di root project dengan isi:\n' +
    'VITE_SUPABASE_URL=https://xxxxx.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=eyJ...'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
