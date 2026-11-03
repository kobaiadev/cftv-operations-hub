import { createFileRoute, Link } from "@tanstack/react-router";
import { LoaderCircle, Pencil, Save, ShieldPlus, Trash2, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createAccount, updateAccount, revokeAccountAccess } from "@/lib/accounts.functions";
import { accountSchema, accountEditSchema } from "@/lib/account-rules";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ehAdministrador,
  mapearPerfilUsuario,
  NIVEIS_ACESSO,
  useAuth,
  type AccessRole,
} from "@/lib/auth";
import { obterClienteSupabase } from "@/lib/supabase";

type ManagedUser = {
  user_id: string;
  email: string;
  display_name: string;
  role: AccessRole;
};

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários do Sistema — Segurança Patrimonial Nagumo" },
      {
        name: "description",
        content: "Administração interna de usuários e níveis de acesso Nagumo.",
      },
      { property: "og:title", content: "Usuários do Sistema — Segurança Patrimonial Nagumo" },
      {
        property: "og:description",
        content: "Administração interna de usuários e níveis de acesso Nagumo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const create = useServerFn(createAccount);
  const update = useServerFn(updateAccount);
  const revoke = useServerFn(revokeAccountAccess);
  const { profile, loading, refreshProfile } = useAuth();
  const [editId, setEditId] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<ManagedUser[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nivel, setNivel] = useState<AccessRole>("03");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const carregarUsuarios = useCallback(async () => {
    setCarregando(true);
    try {
      const { data, error } = await obterClienteSupabase()
        .from("user_roles")
        .select("user_id, display_name, email, role")
        .order("display_name");
      if (error) throw new Error(`Não foi possível carregar os usuários: ${error.message}`);
      const perfis = (data ?? []).map((usuario) => {
        const perfil = mapearPerfilUsuario(usuario);
        if (!perfil) {
          throw new Error("A tabela user_roles contém um usuário com dados ou nível inválidos.");
        }
        return perfil;
      });
      setUsuarios(perfis);
    } catch (error) {
      console.error("Erro ao carregar usuários do sistema.", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar usuários.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (profile?.role === "00") void carregarUsuarios();
    else setCarregando(false);
  }, [profile?.role, carregarUsuarios]);

  if (loading) return null;
  if (!ehAdministrador(profile?.role)) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-card">
        <h1 className="text-lg font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apenas administradores (Nível 00) podem gerenciar usuários.
        </p>
        <Button asChild className="mt-5">
          <Link to="/">Voltar ao painel</Link>
        </Button>
      </div>
    );
  }

  const criarUsuario = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSalvando(true);
    try {
      if (!ehAdministrador(profile?.role)) throw new Error("Acesso não autorizado.");
      if (editId) {
        const input = accountEditSchema.parse({ userId: editId, nome, email, nivel });
        await update({ data: input });
        if (editId === profile?.user_id) await refreshProfile();
      } else {
        const input = accountSchema.safeParse({ nome, email, senha, nivel });
        if (!input.success) throw new Error("Verifique nome, e-mail, senha e nível de acesso.");
        await create({ data: input.data });
      }

      setNome("");
      setEmail("");
      setSenha("");
      setNivel("03");
      toast.success(editId ? "Cadastro do usuário atualizado." : "Usuário criado e nível de acesso atribuído.");
      setEditId(null);
      await carregarUsuarios();
    } catch (error) {
      console.error("Erro ao criar usuário do sistema.", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o usuário.");
    } finally {
      setSalvando(false);
    }
  };

  const excluirUsuario = async (usuario: ManagedUser) => {
    if (
      !window.confirm(
        `Revogar o acesso de ${usuario.display_name} (${usuario.email})? A conta será mantida no Lovable Cloud.`,
      )
    )
      return;
    setExcluindoId(usuario.user_id);
    try {
      await revoke({ data: { userId: usuario.user_id } });
      toast.success("Acesso ao sistema revogado. A conta foi mantida no Lovable Cloud.");
      await carregarUsuarios();
    } catch (error) {
      console.error("Erro ao excluir usuário do sistema.", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o usuário.");
    } finally {
      setExcluindoId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UsersRound className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Cadastro de Usuários do Sistema
            </h1>
            <p className="text-sm text-muted-foreground">
              Crie contas e atribua o nível de acesso adequado para cada pessoa.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <ShieldPlus className="size-5 text-primary" />
          <h2 className="font-semibold">{editId ? "Editar usuário" : "Criar usuário"}</h2>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={criarUsuario}>
          <div className="space-y-2">
            <label htmlFor="usuario-nome" className="text-sm font-medium">
              Nome do Usuário
            </label>
            <Input
              id="usuario-nome"
              required
              minLength={2}
              autoComplete="name"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="usuario-email" className="text-sm font-medium">
              E-mail do Usuário
            </label>
            <Input
              id="usuario-email"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="usuario@nagumo.com.br"
            />
          </div>
          {!editId && <div className="space-y-2">
            <label htmlFor="usuario-senha" className="text-sm font-medium">
              Senha inicial
            </label>
            <Input
              id="usuario-senha"
              required
              type="password"
              minLength={12}
              autoComplete="new-password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="Mínimo de 12 caracteres"
            />
            <p className="text-xs text-muted-foreground">
              Use uma senha exclusiva e compartilhe-a por um canal seguro.
            </p>
          </div>}
          <div className="space-y-2">
            <label htmlFor="usuario-nivel" className="text-sm font-medium">
              Nível de Acesso
            </label>
            <Select value={nivel} onValueChange={(value) => setNivel(value as AccessRole)}>
              <SelectTrigger id="usuario-nivel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NIVEIS_ACESSO.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 md:flex md:justify-end">
            {editId && <Button type="button" variant="outline" className="mr-2" disabled={salvando} onClick={() => { setEditId(null); setNome(""); setEmail(""); setSenha(""); setNivel("03"); }}>Cancelar</Button>}
            <Button type="submit" disabled={salvando} className="w-full md:w-auto">
              {salvando ? <LoaderCircle className="animate-spin" /> : <ShieldPlus />}
              {salvando ? "Salvando..." : editId ? "Salvar alterações" : "Criar usuário"}
            </Button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Usuários cadastrados</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Contas e níveis de acesso atribuídos pelos administradores.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <LoaderCircle className="mx-auto size-5 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : usuarios.length ? (
                usuarios.map((usuario) => (
                  <TableRow key={usuario.user_id}>
                    <TableCell className="font-medium">{usuario.display_name}</TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>
                      {NIVEIS_ACESSO.find((item) => item.value === usuario.role)?.label ??
                        `Nível ${usuario.role}`}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button type="button" variant="ghost" size="icon" title="Editar" aria-label={`Editar ${usuario.email}`} disabled={salvando} onClick={() => { if (!ehAdministrador(profile?.role)) return; setEditId(usuario.user_id); setNome(usuario.display_name); setEmail(usuario.email); setNivel(usuario.role); setSenha(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil className="text-primary" /></Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        aria-label={`Excluir ${usuario.email}`}
                        disabled={
                          usuario.user_id === profile?.user_id || excluindoId === usuario.user_id
                        }
                        onClick={() => void excluirUsuario(usuario)}
                      >
                        {excluindoId === usuario.user_id ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          <Trash2 />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Nenhum usuário cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
