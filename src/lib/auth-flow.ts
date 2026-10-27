import { obterClienteSupabase } from "@/lib/supabase";

export function destinoSeguro(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/";
  const url = new URL(value, "https://app.local");
  if (url.origin !== "https://app.local" || ["/login", "/auth", "/reset-password", "/recuperar-senha", "/criar-conta"].includes(url.pathname)) return "/";
  return url.pathname + url.search + url.hash;
}

export async function cadastrarConta(email: string, password: string, origin: string) {
  return obterClienteSupabase().auth.signUp({
    email: email.trim().toLowerCase(), password,
    options: { emailRedirectTo: `${origin}/login` },
  });
}

export async function recuperarSenha(email: string, origin: string) {
  return obterClienteSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${origin}/reset-password`,
  });
}

export async function redefinirSenha(password: string) {
  return obterClienteSupabase().auth.updateUser({ password });
}

export function mensagemAuth(error: { code?: string; message: string }) {
  switch (error.code) {
    case "email_not_confirmed": return "Confirme seu e-mail antes de entrar.";
    case "user_already_exists": return "Este e-mail já está cadastrado. Entre ou recupere sua senha.";
    case "signup_disabled": return "O cadastro de novas contas está desativado no Supabase.";
    case "weak_password": return "A senha não atende aos requisitos de segurança do Supabase.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit": return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    case "invalid_credentials": return "E-mail ou senha inválidos.";
    default: return "Não foi possível concluir a solicitação. Tente novamente ou verifique a conexão.";
  }
}