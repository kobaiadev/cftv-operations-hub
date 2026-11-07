import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { accountSchema, accountEditSchema, requireSafeAccountEdit, requireAdministrator, requireOtherAccount } from "@/lib/account-rules";

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: access, error: accessError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (accessError) throw new Error("Não foi possível verificar seu acesso.");
    requireAdministrator(access?.role);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
    });
    if (error?.code === "email_exists") {
      // Conta antiga com acesso removido: reaproveita, redefinindo a senha.
      const { data: lista } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const antigo = lista?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
      if (antigo) {
        const { data: role } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("user_id", antigo.id)
          .maybeSingle();
        if (role) throw new Error("Já existe um usuário cadastrado com este e-mail.");
        const upd = await supabaseAdmin.auth.admin.updateUserById(antigo.id, {
          password: data.senha,
          email_confirm: true,
        });
        created = upd.data;
        error = upd.error;
      }
    }
    if (error || !created.user) {
      const motivo =
        error?.code === "weak_password"
          ? "A senha é fraca ou já apareceu em vazamentos. Use uma senha mais forte."
          : error?.message ?? "erro desconhecido";
      throw new Error(`Não foi possível criar a conta: ${motivo}`);
    }
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: created.user.id,
      email: data.email,
      display_name: data.nome,
      role: data.nivel,
    });
    if (roleError) {
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      if (cleanupError)
        throw new Error(
          "A conta ficou sem acesso atribuído. Revise-a em More → Users antes de tentar novamente.",
        );
      throw new Error("Não foi possível atribuir o acesso. Nenhuma conta foi mantida.");
    }
    return { id: created.user.id };
  });

export const revokeAccountAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: access, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error("Não foi possível verificar seu acesso.");
    requireAdministrator(access?.role);
    requireOtherAccount(context.userId, data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: revokeError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (revokeError) throw new Error("Não foi possível revogar o acesso.");
    return { success: true };
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountEditSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: access, error } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error("Não foi possível verificar seu acesso.");
    requireAdministrator(access?.role);
    requireSafeAccountEdit(context.userId, data.userId, data.nivel);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: old, error: readError } = await supabaseAdmin.from("user_roles").select("email").eq("user_id", data.userId).single();
    if (readError || !old) throw new Error("Usuário não encontrado.");
    if (old.email !== data.email) {
      const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { email: data.email });
      if (emailError) throw new Error("Não foi possível atualizar o e-mail da conta.");
    }
    const { error: updateError } = await supabaseAdmin.from("user_roles").update({ display_name: data.nome, email: data.email, role: data.nivel }).eq("user_id", data.userId).select("user_id").single();
    if (updateError) {
      if (old.email !== data.email) await supabaseAdmin.auth.admin.updateUserById(data.userId, { email: old.email });
      throw new Error("Não foi possível atualizar o cadastro do usuário.");
    }
    return { success: true };
  });
