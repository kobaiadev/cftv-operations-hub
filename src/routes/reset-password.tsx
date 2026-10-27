import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { AuthPage, authHead } from "@/components/auth-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { redefinirSenha, mensagemAuth } from "@/lib/auth-flow";

export const Route = createFileRoute("/reset-password")({ head: () => authHead("Definir nova senha", "Redefina sua senha de acesso ao sistema Nagumo."), component: ResetPassword });
function ResetPassword() {
  const { recovery, session, loading, signOut } = useAuth();
  const [linkRecuperacao, setLinkRecuperacao] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  useEffect(() => {
    setLinkRecuperacao(new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery");
  }, []);
  async function enviar(event: FormEvent) {
    event.preventDefault(); setErro("");
    if (!session || !(recovery || linkRecuperacao)) { setErro("Solicite um novo link de recuperação."); return; }
    if (senha !== confirmacao) { setErro("As senhas não coincidem."); return; }
    setBusy(true);
    try {
      const { error } = await redefinirSenha(senha);
      if (error) { setErro(mensagemAuth(error)); return; }
      setSucesso(true); setSenha(""); setConfirmacao("");
      await signOut(false);
    } catch { setErro("Não foi possível concluir a redefinição. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <AuthPage title="Definir nova senha" description="Escolha uma nova senha para sua conta.">
    {sucesso ? <p role="status" className="text-sm text-success">Senha atualizada. Entre novamente com a nova senha.</p> : loading ? <p role="status">Validando link...</p> : !session || !(recovery || linkRecuperacao) ? <div className="space-y-3"><p role="alert" className="text-sm text-destructive">Link inválido ou expirado. Solicite uma nova recuperação.</p><Button asChild variant="outline"><Link to="/recuperar-senha">Solicitar novo link</Link></Button></div> : <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-2"><label htmlFor="nova-senha">Nova senha</label><Input id="nova-senha" type="password" autoComplete="new-password" required value={senha} onChange={e => setSenha(e.target.value)} /></div>
      <div className="space-y-2"><label htmlFor="confirmar-nova-senha">Confirmar nova senha</label><Input id="confirmar-nova-senha" type="password" autoComplete="new-password" required value={confirmacao} onChange={e => setConfirmacao(e.target.value)} /></div>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <Button className="w-full" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Save />}Salvar nova senha</Button>
    </form>}
    <Button asChild variant="link" className="mt-4 px-0"><Link to="/login">Voltar para entrar</Link></Button>
  </AuthPage>;
}