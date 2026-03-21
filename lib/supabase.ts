import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client
// For Phase 1, this is just the configuration setup.
// Actual DB tables and RLS policies are set up in the Supabase dashboard.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
