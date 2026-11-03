import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AccessRole } from "@/lib/auth";

type ManagedUser = {
  user_id: string;
  email: string;
  display_name: string;
  role: AccessRole;
  created_at?: string;
};

type EdgeFunctionError = { error?: unknown };

async function executarAcaoUsuarios<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>("manage-users", { body });
  if (!error) {
    if (data === null) throw new Error("A função de gestão de usuários não retornou dados.");
    return data;
  }

  if (error instanceof FunctionsHttpError) {
    let response: EdgeFunctionError | null = null;
    try {
      response = (await error.context.json()) as EdgeFunctionError;
    } catch (parseError) {
      console.error("Não foi possível interpretar o erro da função de gestão de usuários.", parseError);
    }
    if (typeof response?.error === "string") throw new Error(response.error);
  }

  if (error instanceof FunctionsFetchError) {
    console.error("A chamada à Edge Function falhou na rede ou no preflight CORS.", error.context);
    throw new Error(
      "Não foi possível conectar à função de usuários. Confirme se a versão atual de manage-users foi implantada no projeto Supabase.",
    );
  }
  if (error instanceof FunctionsRelayError) {
    console.error("O relay do Supabase não conseguiu executar a Edge Function.", error.context);
    throw new Error("O Supabase não conseguiu iniciar a função de usuários. Tente novamente.");
  }

  throw new Error(`Não foi possível concluir a operação de usuários: ${error.message}`);
}

export async function criarUsuarioSistema(input: {
  email: string;
  displayName: string;
  password: string;
  role: AccessRole;
}): Promise<ManagedUser> {
  const result = await executarAcaoUsuarios<{ user: ManagedUser }>({
    action: "create",
    ...input,
  });
  return result.user;
}

export async function listarUsuariosSistema(): Promise<ManagedUser[]> {
  const result = await executarAcaoUsuarios<{ users: ManagedUser[] }>({ action: "list" });
  return result.users;
}

export async function atualizarUsuarioSistema(input: {
  userId: string;
  email: string;
  displayName: string;
  role: AccessRole;
}): Promise<void> {
  await executarAcaoUsuarios({ action: "update", ...input });
}

export async function revogarAcessoUsuario(userId: string): Promise<void> {
  await executarAcaoUsuarios({ action: "revoke", userId });
}
