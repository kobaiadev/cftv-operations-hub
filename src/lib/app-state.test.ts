import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), from: vi.fn(), upsert: vi.fn(), select: vi.fn(), eq: vi.fn(),
  maybeSingle: vi.fn(), hydrate: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ obterClienteSupabase: () => ({
  auth: { getUser: mocks.getUser }, from: mocks.from,
}) }));
vi.mock("@/lib/os-files", () => ({ migrarArquivosLegados: vi.fn() }));
import { atualizarEstadoApp, registrarEstadoApp, salvarEstadoApp } from "@/lib/app-state";

registrarEstadoApp("cadastro", {
  snapshot: () => ({}),
  legacySnapshot: () => null,
  emptySnapshot: () => ({}),
  merge: (remote) => remote,
  hydrate: mocks.hydrate,
  legacyKey: "teste-cadastro",
});

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
  it("recarrega os mesmos dados compartilhados sem filtrar pelo autor nem gravar", async () => {
    const compartilhado = { perdas: [{ id: "rede", valor: 123 }] };
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.maybeSingle.mockResolvedValue({ data: { data: compartilhado }, error: null });

    await atualizarEstadoApp();

    expect(mocks.eq).toHaveBeenCalledWith("namespace", "cadastro");
    expect(mocks.hydrate).toHaveBeenCalledWith(compartilhado);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("não tenta gravar sem uma sessão válida", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(salvarEstadoApp("cadastro", {})).rejects.toThrow("Sua sessão expirou");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("salva snapshots na ordem de chegada sem sobrescrever o mais novo com o antigo", async () => {
    let liberar: (() => void) | undefined;
    mocks.upsert.mockImplementationOnce(() => new Promise(resolve => {
      liberar = () => resolve({ error: null });
    }));
    const primeiro = salvarEstadoApp("cadastro", { perdas: [10] });
    const segundo = salvarEstadoApp("cadastro", { perdas: [10, 20] });
    await vi.waitFor(() => expect(mocks.upsert).toHaveBeenCalledTimes(1));
    expect(mocks.upsert.mock.calls[0]?.[0].data).toEqual({ perdas: [10] });
    liberar?.();
    await Promise.all([primeiro, segundo]);
    expect(mocks.upsert.mock.calls[1]?.[0].data).toEqual({ perdas: [10, 20] });
  });
});