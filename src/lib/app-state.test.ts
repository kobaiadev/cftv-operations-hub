import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  obterClienteSupabase: () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  }),
}));
vi.mock("@/lib/os-files", () => ({ migrarArquivosLegados: vi.fn() }));
import { salvarEstadoApp } from "@/lib/app-state";

const versoesRemotas = new Map<string, number>();
let namespaceAtual = "";
let respostaDiferida: (() => void) | undefined;

describe("persistência compartilhada", () => {
  const query = {
    select: mocks.select,
    eq: mocks.eq,
    update: mocks.update,
    insert: mocks.insert,
    maybeSingle: mocks.maybeSingle,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    respostaDiferida = undefined;
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "authenticated-user" } },
      error: null,
    });
    mocks.from.mockReturnValue(query);
    mocks.select.mockReturnValue(query);
    mocks.eq.mockImplementation((column: string, value: string | number) => {
      if (column === "namespace") namespaceAtual = value as string;
      return query;
    });
    mocks.update.mockImplementation(() => {
      versoesRemotas.set(namespaceAtual, (versoesRemotas.get(namespaceAtual) ?? 1) + 1);
      return query;
    });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.maybeSingle.mockImplementation(async () => ({
      data: { version: versoesRemotas.get(namespaceAtual) ?? 1 },
      error: null,
    }));
  });

  it.each(["cadastro", "os", "supervisoes"] as const)(
    "salva %s com controle otimista de versão",
    async (namespace) => {
      const data = { registros: ["registro real"] };
      await salvarEstadoApp(namespace, data);
      expect(mocks.from).toHaveBeenCalledWith("app_state");
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data,
          version: expect.any(Number),
          updated_by: "authenticated-user",
        }),
      );
      expect(mocks.eq).toHaveBeenCalledWith("namespace", namespace);
      expect(mocks.eq).toHaveBeenCalledWith("version", expect.any(Number));
    },
  );

  it("não tenta gravar sem uma sessão válida", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(salvarEstadoApp("cadastro", {})).rejects.toThrow("Sua sessão expirou");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("salva snapshots na ordem de chegada sem sobrescrever o mais novo com o antigo", async () => {
    const namespace = "supervisoes";
    let segurarProximaLeituraDeVersao = true;
    mocks.maybeSingle.mockImplementation(() => {
      const versao = versoesRemotas.get(namespace) ?? 1;
      if (!segurarProximaLeituraDeVersao) {
        return Promise.resolve({ data: { version: versao }, error: null });
      }
      segurarProximaLeituraDeVersao = false;
      return new Promise((resolve) => {
        respostaDiferida = () => resolve({ data: { version: versao }, error: null });
      });
    });

    const primeiro = salvarEstadoApp(namespace, { perdas: [10] });
    const segundo = salvarEstadoApp(namespace, { perdas: [10, 20] });
    await vi.waitFor(() => expect(mocks.maybeSingle).toHaveBeenCalledTimes(1));
    respostaDiferida?.();
    await Promise.all([primeiro, segundo]);
    expect(mocks.update.mock.calls.map(([payload]) => payload.data)).toEqual([
      { perdas: [10] },
      { perdas: [10, 20] },
    ]);
  });

  it("rejeita uma gravação quando outra sessão já alterou a versão", async () => {
    const namespace = "os";
    mocks.maybeSingle.mockImplementation(() =>
      Promise.resolve(
        mocks.update.mock.calls.length > 0
          ? { data: null, error: null }
          : { data: { version: 5 }, error: null },
      ),
    );
    await expect(salvarEstadoApp(namespace, { ordens: [] })).rejects.toThrow(
      "foram alterados por outra sessão",
    );
  });
});
