import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const originPermitido = Deno.env.get("APP_ORIGIN");
const corsHeaders = {
  ...(originPermitido ? { "Access-Control-Allow-Origin": originPermitido } : {}),
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

Deno.serve(async (request) => {
  if (!originPermitido) {
    return json({ error: "A origem permitida da aplicação não foi configurada." }, 500);
  }
  if (request.headers.get("Origin") !== originPermitido) {
    return json({ error: "Origem não autorizada." }, 403);
  }
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
  const { data: requesterRole, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", authenticated.user.id)
    .maybeSingle();
  if (roleError) {
    console.error("Falha ao validar permissão de gestão de usuários.", roleError);
    return json({ error: "Não foi possível validar seu nível de acesso." }, 500);
  }
  if (requesterRole?.role !== "00") {
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
    const { data, error } = await adminClient
      .from("user_roles")
      .select("user_id, email, display_name, role, created_at")
      .order("display_name");
    if (error) {
      console.error("Falha ao listar usuários do sistema.", error);
      return json({ error: "Não foi possível carregar a lista de usuários." }, 500);
    }
    return json({ users: data });
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

    const { error: profileError } = await adminClient.from("user_roles").insert({
      user_id: created.user.id,
      email,
      display_name: displayName,
      role,
    });
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
