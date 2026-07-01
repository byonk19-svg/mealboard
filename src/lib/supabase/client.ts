import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseBrowserEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseBrowserEnv();

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
