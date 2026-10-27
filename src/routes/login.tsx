import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Entrar — Segurança Patrimonial Nagumo" },
    { name: "description", content: "Acesso restrito ao controle de ordens de serviço e reservas CFTV Nagumo." },
    { property: "og:title", content: "Entrar — Segurança Patrimonial Nagumo" },
    { property: "og:description", content: "Acesso restrito ao controle de ordens de serviço e reservas CFTV Nagumo." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (session && !loading) return <Navigate to="/" replace />;

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando || loading) return;
    setErro(null);
    setEnviando(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password: senha,
      });
      if (error) {
        setErro(error.code === "invalid_credentials" ? "E-mail ou senha inválidos."
          : error.code === "email_not_confirmed" ? "Confirme seu e-mail antes de entrar."
          : error.status === 429 ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
          : "Não foi possível entrar. Tente novamente ou contate o administrador.");
        return;
      }
      if (!data.session) { setErro("Não foi possível iniciar a sessão. Tente novamente."); return; }
      setSenha("");
      await navigate({ to: "/", replace: true });
    } catch {
      setErro("Não foi possível conectar. Verifique sua conexão e tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return <main className="login-theme flex min-h-screen items-center justify-center bg-login-background px-4 py-10 text-login-foreground">
    <section aria-labelledby="login-title" className="w-full max-w-md rounded-lg border border-login-border bg-login-card px-6 py-9 shadow-card sm:px-9">
      <div aria-label="Nagumo" className="mb-9 flex items-center justify-center gap-3">
        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-login-action text-4xl font-bold leading-none text-login-foreground">n</span>
        <span aria-hidden="true" className="text-3xl font-bold">NAGUMO</span>
      </div>
      <h1 id="login-title" className="text-2xl font-semibold">Acessar sistema</h1>
      <p className="mb-7 mt-2 text-sm text-login-muted">Segurança Patrimonial</p>
      <form onSubmit={entrar} className="space-y-5" aria-busy={enviando || loading}>
        <div className="space-y-2">
          <label htmlFor="login-email" className="text-sm font-medium">E-mail</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-login-muted" />
            <Input id="login-email" type="email" autoComplete="username" required disabled={enviando} value={email} onChange={e => setEmail(e.target.value)} placeholder="Seu e-mail" className="h-12 border-login-border bg-login-input pl-10 text-login-foreground placeholder:text-login-muted" />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="login-senha" className="text-sm font-medium">Senha</label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-login-muted" />
            <Input id="login-senha" type={mostrarSenha ? "text" : "password"} autoComplete="current-password" required disabled={enviando} value={senha} onChange={e => setSenha(e.target.value)} placeholder="Sua senha" className="h-12 border-login-border bg-login-input pl-10 pr-12 text-login-foreground placeholder:text-login-muted" />
            <Button type="button" size="icon" variant="ghost" aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"} title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"} onClick={() => setMostrarSenha(value => !value)} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-login-muted">
              {mostrarSenha ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        </div>
        {(erro || authError) && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-destructive">{erro ?? authError}</p>}
        <Button type="submit" variant="login" disabled={enviando || loading} className="h-12 w-full">
          {(enviando || loading) && <LoaderCircle className="animate-spin motion-reduce:animate-none" />}
          {enviando ? "Entrando..." : loading ? "Verificando acesso..." : "Entrar"}
        </Button>
      </form>
      <p className="mt-8 border-t border-login-border pt-5 text-center text-xs leading-5 text-login-muted">OS e Reservas CFTV · Acesso restrito</p>
    </section>
  </main>;
}
