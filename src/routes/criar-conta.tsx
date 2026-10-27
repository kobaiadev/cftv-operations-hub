import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { LoaderCircle, UserPlus } from "lucide-react";
import { AuthPage, authHead } from "@/components/auth-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cadastrarConta, mensagemAuth } from "@/lib/auth-flow";

export const Route = createFileRoute("/criar-conta")({
  head: () => authHead("Criar conta", "Cadastro de acesso ao sistema de OS e CFTV Nagumo."),
  component: CriarConta,
});

function CriarConta() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  async function enviar(event: FormEvent) {
    event.preventDefault(); setErro("");
    if (senha !== confirmacao) { setErro("As senhas não coincidem."); return; }
    setBusy(true);
    try {
      const { data, error } = await cadastrarConta(email, senha, window.location.origin);
      if (error) { setErro(mensagemAuth(error)); return; }
      setSucesso(data.session ? "Conta criada. O acesso às operações depende da autorização do administrador." : "Verifique seu e-mail para confirmar o cadastro. O acesso às operações depende da autorização do administrador.");
      setSenha(""); setConfirmacao("");
    } catch { setErro("Não foi possível criar a conta. Verifique a conexão."); }
    finally { setBusy(false); }
  }
  return <AuthPage title="Criar conta" description="Cadastre seu e-mail e senha.">
    {sucesso ? <p role="status" className="text-sm text-success">{sucesso}</p> : <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-2"><label htmlFor="cadastro-email">E-mail</label><Input id="cadastro-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><label htmlFor="cadastro-senha">Senha</label><Input id="cadastro-senha" type="password" autoComplete="new-password" required value={senha} onChange={e => setSenha(e.target.value)} /></div>
      <div className="space-y-2"><label htmlFor="cadastro-confirmacao">Confirmar senha</label><Input id="cadastro-confirmacao" type="password" autoComplete="new-password" required value={confirmacao} onChange={e => setConfirmacao(e.target.value)} /></div>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <Button className="w-full" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <UserPlus />}Criar conta</Button>
    </form>}
    <Button variant="link" className="mt-4 px-0" asChild><Link to="/login">Voltar para entrar</Link></Button>
  </AuthPage>;
}