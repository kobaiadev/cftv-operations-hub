import { beforeEach, describe, expect, it, vi } from "vitest";
import { FunctionsFetchError } from "@supabase/supabase-js";

const functionsInvoke = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: functionsInvoke } },
}));

import {
  atualizarUsuarioSistema,
  criarUsuarioSistema,
  listarUsuariosSistema,
  revogarAcessoUsuario,
} from "@/lib/accounts-api";

describe("API de gestão de usuários", () => {
  beforeEach(() => {
    functionsInvoke.mockReset();
  });

  it("cria usuários pela Edge Function sem exigir chave administrativa no servidor da aplicação", async () => {
    const user = {
      user_id: "59dd2010-dd0a-4422-9fb5-6d3bf7bd11c8",
      email: "nova.pessoa@nagumo.com.br",
      display_name: "Nova Pessoa",
      role: "03" as const,
    };
    functionsInvoke.mockResolvedValue({ data: { user }, error: null });

    await expect(
      criarUsuarioSistema({
        email: user.email,
        displayName: user.display_name,
        password: "senha-segura-123",
        role: user.role,
      }),
    ).resolves.toEqual(user);
    expect(functionsInvoke).toHaveBeenCalledWith("manage-users", {
      body: {
        action: "create",
        email: user.email,
        displayName: user.display_name,
        password: "senha-segura-123",
        role: user.role,
      },
    });
  });

  it("encaminha atualização e revogação à função protegida", async () => {
    functionsInvoke.mockResolvedValue({ data: { success: true }, error: null });
    const userId = "59dd2010-dd0a-4422-9fb5-6d3bf7bd11c8";

    await atualizarUsuarioSistema({
      userId,
      email: "pessoa@nagumo.com.br",
      displayName: "Pessoa",
      role: "01",
    });
    await revogarAcessoUsuario(userId);

    expect(functionsInvoke).toHaveBeenNthCalledWith(1, "manage-users", {
      body: {
        action: "update",
        userId,
        email: "pessoa@nagumo.com.br",
        displayName: "Pessoa",
        role: "01",
      },
    });
    expect(functionsInvoke).toHaveBeenNthCalledWith(2, "manage-users", {
      body: { action: "revoke", userId },
    });
  });

  it("lista usuários por meio do endpoint administrativo", async () => {
    const users = [
      {
        user_id: "59dd2010-dd0a-4422-9fb5-6d3bf7bd11c8",
        email: "pessoa@nagumo.com.br",
        display_name: "Pessoa",
        role: "03" as const,
      },
    ];
    functionsInvoke.mockResolvedValue({ data: { users }, error: null });

    await expect(listarUsuariosSistema()).resolves.toEqual(users);
    expect(functionsInvoke).toHaveBeenCalledWith("manage-users", {
      body: { action: "list" },
    });
  });

  it("propaga erros da Edge Function", async () => {
    functionsInvoke.mockResolvedValue({
      data: null,
      error: { message: "Sessão inválida ou expirada." },
    });

    await expect(
      revogarAcessoUsuario("59dd2010-dd0a-4422-9fb5-6d3bf7bd11c8"),
    ).rejects.toThrow("Não foi possível concluir a operação de usuários: Sessão inválida ou expirada.");
  });

  it("orienta a implantação quando o preflight ou a conexão da função falha", async () => {
    functionsInvoke.mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new TypeError("Failed to fetch")),
    });

    await expect(
      revogarAcessoUsuario("59dd2010-dd0a-4422-9fb5-6d3bf7bd11c8"),
    ).rejects.toThrow(
      "Não foi possível conectar à função de usuários. Confirme se a versão atual de manage-users foi implantada no projeto Supabase.",
    );
  });
});
