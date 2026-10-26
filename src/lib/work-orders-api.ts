import { obterClienteSupabase } from "@/lib/supabase";

export type NovaWorkOrder = {
  store_name: string;
  event_date: string;
  occurrence_type: string;
  description: string;
};

export async function salvarWorkOrder(ordem: NovaWorkOrder): Promise<void> {
  const { error } = await obterClienteSupabase().from("work_orders").insert(ordem);
  if (error) {
    throw new Error(`Não foi possível sincronizar a ordem de serviço: ${error.message}`);
  }
}
