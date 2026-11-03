import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const colunaAusente = (error: { code?: string } | null) =>
  error?.code === "42703" || error?.code === "PGRST204";

async function consultarNivel(adminClient: ReturnType<typeof createClient>, userId: string) {
  const atual = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (!atual.error) return { role: atual.data?.role ?? null, error: null };
  if (!colunaAusente(atual.error)) return { role: null, error: atual.error };

  const legado = await adminClient
    .from("user_roles")
    .select("nivel_acesso")
    .eq("id", userId)
    .maybeSingle();
  return {
    role: legado.data?.nivel_acesso == null ? null : String(legado.data.nivel_acesso),
    error: legado.error,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const authorization = request.headers.get("Authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "A solicitação de gestão de usuários não pôde ser autenticada." }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authenticated, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authenticated.user) {
    return json({ error: "Sessão inválida ou expirada." }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { role, error: roleError } = await consultarNivel(adminClient, authenticated.user.id);
  if (roleError) {
    console.error("Falha ao validar permissão de gestão de usuários.", roleError);
    return json({ error: "Não foi possível validar seu nível de acesso." }, 500);
  }
  if (role !== "00") {
    return json({ error: "Somente usuários de nível 00 podem gerenciar contas." }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) return json({ error: "O conteúdo enviado deve ser um objeto." }, 400);
    payload = body;
  } catch {
    return json({ error: "O conteúdo enviado é inválido." }, 400);
  }

  if (payload.action === "list") {
    const atual = await adminClient
      .from("user_roles")
      .select("user_id, email, display_name, role, created_at")
      .order("display_name");
    if (!atual.error) return json({ users: atual.data });
    if (!colunaAusente(atual.error)) {
      console.error("Falha ao listar usuários do sistema.", atual.error);
      return json({ error: "Não foi possível carregar a lista de usuários." }, 500);
    }

    const legado = await adminClient
      .from("user_roles")
      .select("id, nome, email, nivel_acesso, created_at")
      .order("nome");
    if (legado.error) {
      console.error("Falha ao listar usuários do schema legado.", legado.error);
      return json({ error: "Não foi possível carregar a lista de usuários." }, 500);
    }
    return json({
      users: (legado.data ?? []).map((user) => ({
        user_id: user.id,
        email: user.email,
        display_name: user.nome,
        role: String(user.nivel_acesso),
        created_at: user.created_at,
      })),
    });
  }

  if (payload.action === "create") {
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const displayName = typeof payload.displayName === "string" ? payload.displayName.trim() : "";
    const password = typeof payload.password === "string" ? payload.password : "";
    const role = typeof payload.role === "string" ? payload.role : "";
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      displayName.length < 2 ||
      password.length < 12 ||
      !["00", "01", "02", "03"].includes(String(role))
    ) {
      return json(
        { error: "Informe nome, e-mail válido, senha com no mínimo 12 caracteres e nível válido." },
        400,
      );
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (createError || !created.user) {
      return json(
        { error: createError?.message ?? "Não foi possível criar a conta." },
        createError?.status === 422 ? 409 : 400,
      );
    }

    let profileResult = await adminClient.from("user_roles").insert({
      user_id: created.user.id,
      email,
      display_name: displayName,
      role,
    });
    if (colunaAusente(profileResult.error)) {
      profileResult = await adminClient.from("user_roles").insert({
        id: created.user.id,
        nome: displayName,
        email,
        nivel_acesso: role,
      });
    }
    const { error: profileError } = profileResult;
    if (profileError) {
      const { error: cleanupError } = await adminClient.auth.admin.deleteUser(created.user.id);
      if (cleanupError) {
        console.error("Falha ao remover usuário após erro no cadastro do perfil.", cleanupError);
      }
      console.error("Falha ao salvar o nível de acesso do usuário.", profileError);
      return json({ error: "Não foi possível salvar o perfil e o nível do usuário." }, 500);
    }

    return json(
      {
        user: {
          user_id: created.user.id,
          email,
          display_name: displayName,
          role,
          created_at: created.user.created_at,
        },
      },
      201,
    );
  }

  if (payload.action === "update") {
    const userId = typeof payload.userId === "string" ? payload.userId : "";
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const displayName =
      typeof payload.displayName === "string" ? payload.displayName.trim() : "";
    const role = typeof payload.role === "string" ? payload.role : "";
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        userId,
      ) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      displayName.length < 2 ||
      displayName.length > 120 ||
      !["00", "01", "02", "03"].includes(role)
    ) {
      return json({ error: "Os dados informados para o usuário são inválidos." }, 400);
    }
    if (userId === authenticated.user.id && role !== "00") {
      return json({ error: "Você não pode reduzir seu próprio nível de administrador." }, 400);
    }

    let currentResult = await adminClient
      .from("user_roles")
      .select("email")
      .eq("user_id", userId)
      .maybeSingle();
    const formatoLegado = colunaAusente(currentResult.error);
    if (formatoLegado) {
      currentResult = await adminClient
        .from("user_roles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();
    }
    const { data: current, error: currentError } = currentResult;
    if (currentError) {
      console.error("Falha ao localizar perfil para atualização.", currentError);
      return json({ error: "Não foi possível localizar o cadastro do usuário." }, 500);
    }
    if (!current) return json({ error: "Usuário não encontrado." }, 404);

    if (current.email !== email) {
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      });
      if (authUpdateError) {
        return json({ error: "Não foi possível atualizar o e-mail da conta." }, 400);
      }
    } else {
      const { error: metadataError } = await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { display_name: displayName },
      });
      if (metadataError) {
        console.error("Falha ao atualizar nome nos metadados do usuário.", metadataError);
        return json({ error: "Não foi possível atualizar os dados da conta." }, 500);
      }
    }

    let profileResult = formatoLegado
      ? await adminClient
          .from("user_roles")
          .update({ email, nome: displayName, nivel_acesso: role })
          .eq("id", userId)
      : await adminClient
          .from("user_roles")
          .update({ email, display_name: displayName, role })
          .eq("user_id", userId);
    if (colunaAusente(profileResult.error) && !formatoLegado) {
      profileResult = await adminClient
        .from("user_roles")
        .update({ email, nome: displayName, nivel_acesso: role })
        .eq("id", userId);
    }
    const { error: profileError } = profileResult;
    if (profileError) {
      if (current.email !== email) {
        const { error: rollbackError } = await adminClient.auth.admin.updateUserById(userId, {
          email: current.email,
        });
        if (rollbackError) {
          console.error("Falha ao restaurar e-mail após erro ao atualizar perfil.", rollbackError);
        }
      }
      console.error("Falha ao atualizar perfil do usuário.", profileError);
      return json({ error: "Não foi possível salvar as alterações do usuário." }, 500);
    }

    return json({ success: true });
  }

  if (payload.action === "revoke") {
    const userId = typeof payload.userId === "string" ? payload.userId : "";
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        userId,
      ) ||
      userId === authenticated.user.id
    ) {
      return json({ error: "Não é permitido revogar esse acesso." }, 400);
    }

    let deleteResult = await adminClient
      .from("user_roles")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    if (colunaAusente(deleteResult.error)) {
      deleteResult = await adminClient
        .from("user_roles")
        .delete({ count: "exact" })
        .eq("id", userId);
    }
    const { error, count } = deleteResult;
    if (error) {
      console.error("Falha ao revogar acesso ao sistema.", error);
      return json({ error: "Não foi possível revogar o acesso do usuário." }, 500);
    }
    if (!count) return json({ error: "Usuário não encontrado." }, 404);
    return json({ success: true });
  }

  if (payload.action === "delete") {
    const userId = typeof payload.userId === "string" ? payload.userId : "";
    if (!userId || userId === authenticated.user.id) {
      return json({ error: "Não é permitido excluir a própria conta." }, 400);
    }

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      console.error("Falha ao excluir usuário.", error);
      return json({ error: "Não foi possível excluir o usuário." }, 500);
    }
    return json({ success: true });
  }

  return json({ error: "Ação de gestão não reconhecida." }, 400);
});
