import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import logoUrl from "@/assets/logo-nagumo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { obterClienteSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Segurança Patrimonial Nagumo" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { session, profile, loading, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (session && profile) return <Navigate to="/" replace />;

  const entrar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const { error: loginError } = await obterClienteSupabase().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });
      if (loginError) throw new Error("E-mail ou senha inválidos.");
    } catch (cause) {
      console.error("Falha na autenticação do usuário.", cause);
      setErro(cause instanceof Error ? cause.message : "Não foi possível iniciar a sessão.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#17365d] px-4 py-10 text-slate-900">
      <div className="pointer-events-none absolute -left-36 -top-40 size-[26rem] rounded-full border border-[#6dc7d4]/20" />
      <div className="pointer-events-none absolute -bottom-48 -right-36 size-[32rem] rounded-full border border-[#6dc7d4]/20" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/30 md:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[34rem] flex-col justify-between overflow-hidden bg-[#17365d] p-10 text-white md:flex">
          <div className="absolute inset-x-0 bottom-0 h-2 bg-[#6dc7d4]" />
          <img src={logoUrl} alt="Nagumo" className="h-auto w-56 rounded-md" />
          <div className="relative max-w-md">
            <div className="mb-5 flex size-12 items-center justify-center rounded-xl border border-[#6dc7d4]/40 bg-white/5 text-[#6dc7d4]">
              <ShieldCheck className="size-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6dc7d4]">
              Segurança patrimonial
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight">
              Operação protegida, informação confiável.
            </h1>
            <p className="mt-4 text-sm leading-6 text-blue-100/80">
              Acesse ordens de serviço, reservas CFTV, supervisões e indicadores em um só lugar.
            </p>
          </div>
          <p className="text-xs text-blue-100/60">Ambiente restrito a usuários autorizados.</p>
        </section>

        <section className="flex min-h-[34rem] flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
          <img src={logoUrl} alt="Nagumo" className="mb-8 h-auto w-44 md:hidden" />
          <div className="mb-8">
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-[#c9273d]/10 text-[#c9273d]">
              <LockKeyhole className="size-5" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#17365d]">
              Acessar sistema
            </h2>
            <p className="mt-2 text-sm text-slate-600">Entre com seu e-mail corporativo e senha.</p>
          </div>

          <form className="space-y-5" onSubmit={entrar}>
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium text-slate-700">
                E-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nome@nagumo.com.br"
                  className="h-11 border-slate-300 bg-white pl-10 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#6dc7d4]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="login-senha" className="text-sm font-medium text-slate-700">
                Senha
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="login-senha"
                  type={mostrarSenha ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  placeholder="Sua senha"
                  className="h-11 border-slate-300 bg-white pl-10 pr-11 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#6dc7d4]"
                />
                <button
                  type="button"
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#17365d]"
                >
                  {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {(erro || authError) && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {erro ?? authError}
              </p>
            )}

            <Button
              type="submit"
              disabled={enviando || loading}
              className="h-11 w-full bg-[#c9273d] text-white hover:bg-[#ae1f33]"
            >
              {enviando || loading ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                "Entrar com segurança"
              )}
            </Button>
          </form>

          <p className="mt-8 border-t border-[#6dc7d4]/40 pt-5 text-center text-xs text-slate-500">
            Segurança Patrimonial · Controle de OS e Reservas CFTV
          </p>
        </section>
      </div>
    </div>
  );
}
