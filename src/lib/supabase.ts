import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function obterClienteSupabase(): SupabaseClient {
  return supabase;
}
