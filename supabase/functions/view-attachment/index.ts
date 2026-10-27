import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const originPermitido = Deno.env.get("APP_ORIGIN");
const corsHeaders = {
  ...(originPermitido ? { "Access-Control-Allow-Origin": originPermitido } : {}),
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  Vary: "Origin",
};

const respostaErro = (mensagem: string, status: number) =>
  new Response(mensagem, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
  });

Deno.serve(async (request) => {
  if (!originPermitido) {
    return respostaErro("A origem permitida da aplicação não foi configurada.", 500);
  }
  if (request.headers.get("Origin") !== originPermitido) {
    return respostaErro("Origem não autorizada.", 403);
  }
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "GET") return respostaErro("Método não permitido.", 405);

  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const id = new URL(request.url).searchParams.get("id");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !id || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return respostaErro("Sessão ou identificador do anexo inválido.", 401);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return respostaErro("Sessão inválida ou expirada.", 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userRole, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (roleError) {
    console.error("Não foi possível validar acesso ao anexo.", roleError);
    return respostaErro("Não foi possível verificar o nível de acesso.", 500);
  }
  if (!userRole) return respostaErro("Conta sem nível de acesso.", 403);

  const { data: attachment, error: attachmentError } = await adminClient
    .from("app_attachments")
    .select("storage_path, content_type, file_name")
    .eq("id", id)
    .maybeSingle();
  if (attachmentError) {
    console.error("Não foi possível localizar metadados do anexo.", attachmentError);
    return respostaErro("Não foi possível localizar o anexo.", 500);
  }
  if (!attachment) return respostaErro("Anexo não encontrado.", 404);

  const { data: file, error: fileError } = await adminClient.storage
    .from("private-attachments")
    .download(attachment.storage_path);
  if (fileError || !file) {
    console.error("Não foi possível buscar o conteúdo do anexo.", fileError);
    return respostaErro("Não foi possível carregar o anexo.", 500);
  }

  return new Response(file, {
    headers: {
      ...corsHeaders,
      "Content-Type": attachment.content_type,
      "Content-Disposition": `inline; filename="${attachment.file_name.replace(/["\\\r\n]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
