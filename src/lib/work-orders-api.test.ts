import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  obterClienteSupabase: () => ({ from: supabase.from }),
}));

import { salvarWorkOrder } from "@/lib/work-orders-api";

describe("API de ordens de serviço", () => {
  beforeEach(() => {
    supabase.from.mockReturnValue({ insert: supabase.insert });
    supabase.insert.mockResolvedValue({ error: null });
  });

  it("insere a ordem na tabela uma vez", async () => {
    const ordem = {
      store_name: "Loja Centro",
      event_date: "2026-10-26",
      occurrence_type: "Furto",
      description: "Registro da ocorrência.",
    };

    await salvarWorkOrder(ordem);

    expect(supabase.from).toHaveBeenCalledOnce();
    expect(supabase.from).toHaveBeenCalledWith("work_orders");
    expect(supabase.insert).toHaveBeenCalledOnce();
    expect(supabase.insert).toHaveBeenCalledWith(ordem);
  });

  it("propaga a mensagem de erro do Supabase de forma legível", async () => {
    supabase.insert.mockResolvedValue({
      error: { message: "Permissão insuficiente" },
    });

    await expect(
      salvarWorkOrder({
        store_name: "Loja Centro",
        event_date: "2026-10-26",
        occurrence_type: "Furto",
        description: "Registro da ocorrência.",
      }),
    ).rejects.toThrow("Não foi possível sincronizar a ordem de serviço: Permissão insuficiente");
  });
});
