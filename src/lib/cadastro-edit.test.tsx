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
    mocks.save.mockResolvedValue(undefined);
    mocks.hydrate?.({ lojas: [], pessoas: [{ id: "p", nome: "Antes", funcao: "fiscal", matricula: "1", lojaId: "l", telefone: "", turno: "Manhã" }], empresas: [{ id: "e", nome: "Antes", cnpj: "12345678901234" }], supervisores: [{ id: "s", nome: "Antes", tipo: "NAGUMO", regiao: "Norte" }], perdas: [{ id: "v", lojaId: "l", mes: "01", ano: 2026, valor: 10 }, { id: "v2", lojaId: "l", mes: "02", ano: 2026, valor: 20 }] });
  });
  afterEach(cleanup);
  it("atualiza pessoas, empresas e supervisores sem duplicar nem trocar IDs", () => {
    const { result } = renderHook(useCadastro);
    act(() => result.current.updatePessoa("p", { nome: "Depois", funcao: "seguranca", matricula: "2", lojaId: "l", telefone: "", turno: "Noite" }));
    act(() => result.current.updateEmpresa("e", { nome: "Depois", cnpj: "12345678901234" }));
    act(() => result.current.updateSupervisor("s", { nome: "Depois", tipo: "EXTERNO", empresaId: "e" }));
    expect(result.current.pessoas.map(p => [p.id, p.nome, p.funcao])).toEqual([["p", "Depois", "seguranca"]]);
    expect(result.current.empresas.map(e => [e.id, e.nome])).toEqual([["e", "Depois"]]);
    expect(result.current.supervisores).toEqual([{ id: "s", nome: "Depois", tipo: "EXTERNO", empresaId: "e" }]);
  });
  it("edita valor mantendo ID e rejeita outro período já cadastrado", () => {
    const { result } = renderHook(useCadastro);
    act(() => result.current.updatePerda("v", { lojaId: "l", mes: "01", ano: 2026, valor: 42 }));
    expect(result.current.perdas.find(p => p.id === "v")?.valor).toBe(42);
    expect(() => result.current.updatePerda("v", { lojaId: "l", mes: "02", ano: 2026, valor: 50 })).toThrow("Já existe");
    expect(result.current.perdas).toHaveLength(2);
  });
});