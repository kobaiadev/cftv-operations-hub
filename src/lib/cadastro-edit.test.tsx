import { act, renderHook, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ hydrate: undefined as ((data: unknown) => void) | undefined, save: vi.fn() }));
vi.mock("@/lib/app-state", () => ({
  registrarEstadoApp: (_: string, adapter: { hydrate: (data: unknown) => void }) => { mocks.hydrate = adapter.hydrate; },
  salvarEstadoApp: mocks.save,
}));
import { useCadastro } from "./cadastro-store";

describe("edição dos cadastros", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.save.mockResolvedValue(undefined);
    mocks.hydrate?.({ lojas: [], pessoas: [{ id: "p", nome: "Antes", funcao: "fiscal", matricula: "1", lojaId: "l", telefone: "", turno: "Manhã" }], empresas: [{ id: "e", nome: "Antes", cnpj: "12345678901234" }], supervisores: [{ id: "s", nome: "Antes", tipo: "NAGUMO", regiao: "Norte" }], perdas: [{ id: "v", lojaId: "l", mes: "01", ano: 2026, valor: 10 }, { id: "v2", lojaId: "l", mes: "02", ano: 2026, valor: 20 }] });
  });
  afterEach(cleanup);
  it("aguarda confirmação da importação e disponibiliza os valores no mesmo store do Dashboard", async () => {
    let confirmar: (() => void) | undefined;
    mocks.save.mockImplementationOnce(() => new Promise<void>(resolve => { confirmar = resolve; }));
    const { result } = renderHook(useCadastro);
    let operacao: Promise<void> | undefined;
    act(() => { operacao = result.current.importPerdas([{ lojaId: "l", ano: 2026, mes: "03", valor: 1234.56 }]); });
    let concluida = false;
    void operacao?.then(() => { concluida = true; });
    expect(concluida).toBe(false);
    expect(mocks.save.mock.calls[0]?.[0]).toBe("cadastro");
    expect(mocks.save.mock.calls[0]?.[1].perdas.map((p: { valor: number }) => p.valor)).toEqual([1234.56, 10, 20]);
    await act(async () => { confirmar?.(); await operacao; });
    expect(concluida).toBe(true);
    expect(result.current.perdas.reduce((sum, p) => sum + p.valor, 0)).toBe(1264.56);
  });
  it("mantém os dados anteriores e rejeita a importação quando o armazenamento falha", async () => {
    mocks.save.mockRejectedValueOnce(new Error("Falha de conexão"));
    const { result } = renderHook(useCadastro);
    await act(async () => {
      await expect(result.current.importPerdas([{ lojaId: "l", ano: 2026, mes: "03", valor: 1234.56 }])).rejects.toThrow("Falha de conexão");
    });
    expect(result.current.perdas.map(p => p.valor)).toEqual([10, 20]);
  });
  it("atualiza pessoas, empresas e supervisores sem duplicar nem trocar IDs", async () => {
    const { result } = renderHook(useCadastro);
    await act(async () => { await result.current.updatePessoa("p", { nome: "Depois", funcao: "seguranca", matricula: "2", lojaId: "l", telefone: "", turno: "Noite" }); });
    await act(async () => { await result.current.updateEmpresa("e", { nome: "Depois", cnpj: "12345678901234" }); });
    await act(async () => { await result.current.updateSupervisor("s", { nome: "Depois", tipo: "EXTERNO", empresaId: "e" }); });
    expect(result.current.pessoas.map(p => [p.id, p.nome, p.funcao])).toEqual([["p", "Depois", "seguranca"]]);
    expect(result.current.empresas.map(e => [e.id, e.nome])).toEqual([["e", "Depois"]]);
    expect(result.current.supervisores).toEqual([{ id: "s", nome: "Depois", tipo: "EXTERNO", empresaId: "e" }]);
  });
  it("edita valor mantendo ID e rejeita outro período já cadastrado", async () => {
    const { result } = renderHook(useCadastro);
    await act(async () => { await result.current.updatePerda("v", { lojaId: "l", mes: "01", ano: 2026, valor: 42 }); });
    expect(result.current.perdas.find(p => p.id === "v")?.valor).toBe(42);
    expect(() => result.current.updatePerda("v", { lojaId: "l", mes: "02", ano: 2026, valor: 50 })).toThrow("Já existe");
    expect(result.current.perdas).toHaveLength(2);
  });
});