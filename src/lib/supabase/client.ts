import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseBrowserEnv } from "@/lib/supabase/env";

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseBrowserEnv();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
