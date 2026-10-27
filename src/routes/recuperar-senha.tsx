import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { LoaderCircle, Mail } from "lucide-react";
import { AuthPage, authHead } from "@/components/auth-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recuperarSenha, mensagemAuth } from "@/lib/auth-flow";

export const Route = createFileRoute("/recuperar-senha")({ head: () => authHead("Recuperar senha", "Recuperação segura de acesso ao sistema Nagumo."), component: RecuperarSenha });
function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);
  async function enviar(event: FormEvent) {
    event.preventDefault(); setBusy(true); setErro("");
    try {
      const { error } = await recuperarSenha(email, window.location.origin);
      if (error) { setErro(mensagemAuth(error)); return; }
      setEnviado(true);
    } catch { setErro("Não foi possível enviar a solicitação. Verifique a conexão."); }
    finally { setBusy(false); }
  }
  return <AuthPage title="Recuperar senha" description="Receba um link para definir uma nova senha.">
    {enviado ? <p role="status" className="text-sm text-success">Se houver uma conta com este e-mail, você receberá o link de recuperação. Verifique também a caixa de spam.</p> : <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-2"><label htmlFor="recuperacao-email">E-mail</label><Input id="recuperacao-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <Button className="w-full" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Mail />}Enviar link de recuperação</Button>
    </form>}
    <Button variant="link" className="mt-4 px-0" asChild><Link to="/login">Voltar para entrar</Link></Button>
  </AuthPage>;
}