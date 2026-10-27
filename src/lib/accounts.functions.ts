import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { accountSchema, requireAdministrator, requireOtherAccount } from "@/lib/account-rules";

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: access, error: accessError } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).maybeSingle();
    if (accessError) throw new Error("Não foi possível verificar seu acesso.");
    requireAdministrator(access?.role);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.senha, email_confirm: true,
    });
    if (error || !created.user) throw new Error("Não foi possível criar a conta. Verifique o e-mail e os requisitos da senha.");
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: created.user.id, email: data.email, display_name: data.nome, role: data.nivel,
    });
    if (roleError) {
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      if (cleanupError) throw new Error("A conta ficou sem acesso atribuído. Revise-a em More → Users antes de tentar novamente.");
      throw new Error("Não foi possível atribuir o acesso. Nenhuma conta foi mantida.");
    }
    return { id: created.user.id };
  });

export const revokeAccountAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: access, error } = await context.supabase.from("user_roles")
      .select("role").eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error("Não foi possível verificar seu acesso.");
    requireAdministrator(access?.role);
    requireOtherAccount(context.userId, data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: revokeError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    if (revokeError) throw new Error("Não foi possível revogar o acesso.");
    return { success: true };
  });