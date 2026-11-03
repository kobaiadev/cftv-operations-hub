import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), upsert: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ obterClienteSupabase: () => ({
  auth: { getUser: mocks.getUser }, from: mocks.from,
}) }));
vi.mock("@/lib/os-files", () => ({ migrarArquivosLegados: vi.fn() }));
import { salvarEstadoApp } from "@/lib/app-state";

describe("persistência compartilhada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "authenticated-user" } }, error: null });
    mocks.from.mockReturnValue({ upsert: mocks.upsert });
    mocks.upsert.mockResolvedValue({ error: null });
  });
  it.each(["cadastro", "os", "supervisoes"] as const)("salva %s no estado remoto", async namespace => {
    const data = { registros: ["registro real"] };
    await salvarEstadoApp(namespace, data);
    expect(mocks.from).toHaveBeenCalledWith("app_state");
    expect(mocks.upsert).toHaveBeenCalledWith({ namespace, data, updated_by: "authenticated-user" }, { onConflict: "namespace" });
  });
  it("não tenta gravar sem uma sessão válida", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(salvarEstadoApp("cadastro", {})).rejects.toThrow("Sua sessão expirou");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});