import { supabase } from "@/integrations/supabase/client";
import type { AccessRole } from "@/lib/auth";
import { createAccount, revokeAccountAccess, updateAccount } from "@/lib/accounts.functions";

type ManagedUser = {
  user_id: string;
  email: string;
  display_name: string;
  role: AccessRole;
  created_at?: string;
};

const mensagem = (error: unknown, padrao: string) =>
  error instanceof Error && error.message ? error.message : padrao;

export async function criarUsuarioSistema(input: {
  email: string;
  displayName: string;
  password: string;
  role: AccessRole;
}): Promise<ManagedUser> {
  try {
    const { id } = await createAccount({
      data: { email: input.email, nome: input.displayName, senha: input.password, nivel: input.role },
    });
    return { user_id: id, email: input.email, display_name: input.displayName, role: input.role };
  } catch (error) {
    throw new Error(mensagem(error, "Não foi possível criar a conta."));
  }
}

export async function listarUsuariosSistema(): Promise<ManagedUser[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id, email, display_name, role, created_at")
    .order("display_name");
  if (error) throw new Error("Não foi possível carregar a lista de usuários.");
  return (data ?? []) as ManagedUser[];
}

export async function atualizarUsuarioSistema(input: {
  userId: string;
  email: string;
  displayName: string;
  role: AccessRole;
}): Promise<void> {
  try {
    await updateAccount({
      data: { userId: input.userId, email: input.email, nome: input.displayName, nivel: input.role },
    });
  } catch (error) {
    throw new Error(mensagem(error, "Não foi possível atualizar o usuário."));
  }
}

export async function revogarAcessoUsuario(userId: string): Promise<void> {
  try {
    await revokeAccountAccess({ data: { userId } });
  } catch (error) {
    throw new Error(mensagem(error, "Não foi possível revogar o acesso."));
  }
}
