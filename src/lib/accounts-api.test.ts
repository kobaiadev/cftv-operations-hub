import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), revoke: vi.fn() }));
vi.mock("@/lib/accounts.functions", () => ({
  createAccount: m.create, updateAccount: m.update, revokeAccountAccess: m.revoke,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { atualizarUsuarioSistema, criarUsuarioSistema, revogarAcessoUsuario } from "@/lib/accounts-api";

const userId = "59dd2010-dd0a-4422-9fb5-6d3bf7bd11c8";

describe("gestão de usuários pelo servidor do app", () => {
  beforeEach(() => vi.clearAllMocks());
  it("cria a conta com nome, e-mail, senha e nível", async () => {
    m.create.mockResolvedValue({ id: userId });
    await criarUsuarioSistema({ email: "a@nagumo.com.br", displayName: "Ana", password: "senha-segura-123", role: "03" });
    expect(m.create).toHaveBeenCalledWith({ data: { email: "a@nagumo.com.br", nome: "Ana", senha: "senha-segura-123", nivel: "03" } });
  });
  it("encaminha edição e revogação", async () => {
    m.update.mockResolvedValue({ success: true });
    m.revoke.mockResolvedValue({ success: true });
    await atualizarUsuarioSistema({ userId, email: "a@nagumo.com.br", displayName: "Ana", role: "01" });
    await revogarAcessoUsuario(userId);
    expect(m.update).toHaveBeenCalledWith({ data: { userId, email: "a@nagumo.com.br", nome: "Ana", nivel: "01" } });
    expect(m.revoke).toHaveBeenCalledWith({ data: { userId } });
  });
  it("mostra o erro real do servidor", async () => {
    m.revoke.mockRejectedValue(new Error("Somente o nível 00 pode gerenciar contas."));
    await expect(revogarAcessoUsuario(userId)).rejects.toThrow("Somente o nível 00 pode gerenciar contas.");
  });
});
