import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | undefined;

export function obterClienteSupabase(): SupabaseClient {
  if (cliente) return cliente;

  const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  const chavePublicavel = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chavePublicavel) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no arquivo .env.local.",
    );
  }

  cliente = createClient(url, chavePublicavel);
  return cliente;
}
