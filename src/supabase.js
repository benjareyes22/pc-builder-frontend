import { createClient } from '@supabase/supabase-js';

// Ahora leemos las variables desde el archivo .env
// (Vite las hace disponibles automáticamente con import.meta.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);