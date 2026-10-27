import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import {
  Store,
  ClipboardCheck,
  ShieldHalf,
  Trash2,
  Plus,
  Pencil,
  Save,
  Building2,
  UsersRound,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { useQuery } from "@tanstack/react-query";
import { ESTADOS, cidadesQuery } from "@/lib/localidades";
import { useCadastro, type Funcao } from "@/lib/cadastro-store";
import { podeEditar, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastro — Controle PP" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "Cadastro de lojas, fiscais e seguranças." },
      { property: "og:title", content: "Cadastro — Controle PP" },
      { property: "og:description", content: "Cadastro de lojas, fiscais e seguranças." },
    ],
  }),
  component: CadastroPage,
});

const funcoes: { value: Funcao; label: string; plural: string; icon: typeof Store }[] = [
  { value: "fiscal", label: "Fiscal", plural: "Fiscais", icon: ClipboardCheck },
  { value: "seguranca", label: "Segurança", plural: "Seguranças", icon: ShieldHalf },
];

function CadastroPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cadastro</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie lojas e as equipes responsáveis por cada unidade.
        </p>
      </div>
      <Tabs defaultValue="lojas">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="lojas">
            <Store /> Lojas
          </TabsTrigger>
          {funcoes.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              <f.icon /> {f.plural}
            </TabsTrigger>
          ))}
          <TabsTrigger value="supervisores">
            <UsersRound /> Supervisores
          </TabsTrigger>
          <TabsTrigger value="empresas">
            <Building2 /> Empresas
          </TabsTrigger>
        </TabsList>
        <TabsContent value="lojas" className="mt-4">
          <LojasTab />
        </TabsContent>
        {funcoes.map((f) => (
          <TabsContent key={f.value} value={f.value} className="mt-4">
            <PessoasTab funcao={f.value} label={f.label} plural={f.plural} />
          </TabsContent>
        ))}
        <TabsContent value="supervisores" className="mt-4">
          <SupervisoresTab />
        </TabsContent>
        <TabsContent value="empresas" className="mt-4">
          <EmpresasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Panel({
  title,
  children,
  oculto = false,
}: {
  title: string;
  children: React.ReactNode;
  oculto?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-card shadow-card ${oculto ? "hidden" : ""}`}
    >
      <div className="border-b border-border px-5 py-4 font-semibold">{title}</div>
      {children}
    </div>
  );
}

const lojaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(80),
  gerente: z.string().trim().min(3, "Informe o gerente responsável").max(100),
  endereco: z.string().trim().min(3, "Informe o endereço").max(150),
  estado: z.string().length(2, "Selecione o estado"),
  cidade: z.string().min(1, "Selecione a cidade"),
  telefone: z.string().trim().max(20),
});

function LojasTab() {
  const { profile } = useAuth();
  const podeAlterar = podeEditar(profile?.role);
  const { lojas, addLoja, updateLoja, removeLoja } = useCadastro();
  const empty = { nome: "", gerente: "", endereco: "", estado: "", cidade: "", telefone: "" };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const cidades = useQuery(cidadesQuery(form.estado));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setErrors({});
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!podeAlterar) return;
    const r = lojaSchema.safeParse(form);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    if (editId) updateLoja(editId, r.data);
    else addLoja(r.data);
    reset();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Panel oculto={!podeAlterar} title={editId ? "Editar loja" : "Nova loja"}>
        <form onSubmit={submit} className="space-y-4 p-5">
          <Field label="Nome da loja" error={errors["nome"]}>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Centro"
            />
          </Field>
          <Field label="Gerente responsável" error={errors["gerente"]}>
            <Input
              value={form.gerente}
              onChange={(e) => setForm({ ...form, gerente: e.target.value })}
            />
          </Field>
          <Field label="Endereço" error={errors["endereco"]}>
            <Input
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            />
          </Field>
          <Field label="Estado" error={errors["estado"]}>
            <Select
              value={form.estado}
              onValueChange={(v) => setForm({ ...form, estado: v, cidade: "" })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o estado" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {ESTADOS.map(([uf, nome]) => (
                  <SelectItem key={uf} value={uf}>
                    {nome} ({uf})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Cidade"
            error={
              errors["cidade"] ??
              (cidades.isError ? "Não foi possível carregar as cidades" : undefined)
            }
          >
            <Select
              value={form.cidade}
              onValueChange={(v) => setForm({ ...form, cidade: v })}
              disabled={!form.estado || cidades.isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !form.estado
                      ? "Selecione o estado primeiro"
                      : cidades.isLoading
                        ? "Carregando cidades..."
                        : "Selecione a cidade"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {(cidades.data ?? (form.cidade ? [form.cidade] : [])).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Telefone" error={errors["telefone"]}>
            <Input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="(11) 4000-0000"
            />
          </Field>
          <Button type="submit" className="w-full">
            {editId ? (
              <>
                <Save /> Salvar alterações
              </>
            ) : (
              <>
                <Plus /> Cadastrar loja
              </>
            )}
          </Button>
          {editId && (
            <Button type="button" variant="outline" className="w-full" onClick={reset}>
              Cancelar
            </Button>
          )}
        </form>
      </Panel>
      <Panel title={`Lojas cadastradas (${lojas.length})`}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Nome</TableHead>
              <TableHead>Gerente responsável</TableHead>
              <TableHead className="hidden md:table-cell">Endereço</TableHead>
              <TableHead className="hidden sm:table-cell">Cidade/UF</TableHead>
              <TableHead className="hidden xl:table-cell">Telefone</TableHead>
              <TableHead className="pr-5 w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lojas.length === 0 && <EmptyRow cols={6} />}
            {lojas.map((l) => (
              <TableRow key={l.id} className={editId === l.id ? "bg-primary/10" : undefined}>
                <TableCell className="pl-5 font-medium">{l.nome}</TableCell>
                <TableCell>{l.gerente}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {l.endereco}
                </TableCell>
                <TableCell className="hidden sm:table-cell whitespace-nowrap">
                  {l.cidade ? `${l.cidade}/${l.estado}` : "—"}
                </TableCell>
                <TableCell className="hidden xl:table-cell font-mono text-xs">
                  {l.telefone}
                </TableCell>
                <TableCell className="pr-5 whitespace-nowrap">
                  <Button
                    hidden={!podeAlterar}
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar loja ${l.nome}`}
                    onClick={() => {
                      if (!podeAlterar) return;
                      setEditId(l.id);
                      setErrors({});
                      setForm({
                        nome: l.nome,
                        gerente: l.gerente,
                        endereco: l.endereco,
                        estado: l.estado ?? "",
                        cidade: l.cidade ?? "",
                        telefone: l.telefone,
                      });
                    }}
                  >
                    <Pencil className="text-primary" />
                  </Button>
                  <Button
                    hidden={!podeAlterar}
                    variant="ghost"
                    size="icon"
                    aria-label={`Excluir loja ${l.nome}`}
                    onClick={() => {
                      if (!podeAlterar) return;
                      if (confirm(`Excluir a loja ${l.nome} e sua equipe?`)) {
                        removeLoja(l.id);
                        if (editId === l.id) reset();
                      }
                    }}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </div>
  );
}

const pessoaSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo").max(100),
  matricula: z.string().trim().min(1, "Informe a matrícula").max(20),
  telefone: z.string().trim().max(20),
  lojaId: z.string().min(1, "Selecione a loja"),
  turno: z.string().min(1, "Selecione o turno"),
});

function PessoasTab({ funcao, label, plural }: { funcao: Funcao; label: string; plural: string }) {
  const { profile } = useAuth();
  const podeAlterar = podeEditar(profile?.role);
  const { lojas, pessoas, addPessoa, removePessoa } = useCadastro();
  const empty = { nome: "", matricula: "", telefone: "", lojaId: "", turno: "" };
  const [form, setForm] = useState(empty);
  const [lojaFiltro, setLojaFiltro] = useState("todas");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lista = pessoas.filter(
    (p) => p.funcao === funcao && (lojaFiltro === "todas" || p.lojaId === lojaFiltro),
  );
  const lojaNome = (id: string) => {
    const l = lojas.find((x) => x.id === id);
    return l ? l.nome : "—";
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!podeAlterar) return;
    const r = pessoaSchema.safeParse(form);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    addPessoa({ ...r.data, funcao });
    setForm(empty);
    setErrors({});
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Panel oculto={!podeAlterar} title={`Novo ${label.toLowerCase()}`}>
        <form onSubmit={submit} className="space-y-4 p-5">
          <Field label="Nome completo" error={errors["nome"]}>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Matrícula" error={errors["matricula"]}>
            <Input
              value={form.matricula}
              onChange={(e) => setForm({ ...form, matricula: e.target.value })}
            />
          </Field>
          <Field label="Telefone" error={errors["telefone"]}>
            <Input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="(11) 90000-0000"
            />
          </Field>
          <Field label="Loja" error={errors["lojaId"]}>
            <Select value={form.lojaId} onValueChange={(v) => setForm({ ...form, lojaId: v })}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={lojas.length ? "Selecione" : "Cadastre uma loja primeiro"}
                />
              </SelectTrigger>
              <SelectContent>
                {lojas.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Turno" error={errors["turno"]}>
            <Select value={form.turno} onValueChange={(v) => setForm({ ...form, turno: v })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {["Manhã", "Tarde", "Noite", "Integral"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit" className="w-full">
            <Plus /> Cadastrar {label.toLowerCase()}
          </Button>
        </form>
      </Panel>
      <Panel title={`${plural} cadastrados (${lista.length})`}>
        {funcao === "fiscal" && (
          <div className="px-5 pt-4">
            <Field label="Filtrar fiscais por loja">
              <Select value={lojaFiltro} onValueChange={setLojaFiltro}>
                <SelectTrigger className="w-full sm:max-w-sm">
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as lojas</SelectItem>
                  {lojas.map((loja) => (
                    <SelectItem key={loja.id} value={loja.id}>
                      {loja.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Matrícula</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead className="hidden md:table-cell">Turno</TableHead>
              <TableHead className="hidden md:table-cell">Telefone</TableHead>
              <TableHead className="pr-5 w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && <EmptyRow cols={6} />}
            {lista.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="pl-5">{p.nome}</TableCell>
                <TableCell className="hidden sm:table-cell font-mono text-xs">
                  {p.matricula}
                </TableCell>
                <TableCell className="whitespace-nowrap">{lojaNome(p.lojaId)}</TableCell>
                <TableCell className="hidden md:table-cell">{p.turno}</TableCell>
                <TableCell className="hidden md:table-cell font-mono text-xs">
                  {p.telefone}
                </TableCell>
                <TableCell className="pr-5">
                  <Button
                    hidden={!podeAlterar}
                    variant="ghost"
                    size="icon"
                    aria-label={`Excluir ${p.nome}`}
                    onClick={() => {
                      if (podeAlterar && confirm(`Excluir ${p.nome}?`)) removePessoa(p.id);
                    }}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </div>
  );
}

const empresaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da empresa.").max(120),
  cnpj: z
    .string()
    .trim()
    .refine((value) => value.replace(/\D/g, "").length === 14, "Informe um CNPJ com 14 dígitos."),
});

function EmpresasTab() {
  const { profile } = useAuth();
  const podeAlterar = podeEditar(profile?.role);
  const { empresas, supervisores, addEmpresa, removeEmpresa } = useCadastro();
  const vazio = { nome: "", cnpj: "" };
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!podeAlterar) return;
    const resultado = empresaSchema.safeParse(form);
    if (!resultado.success) {
      setErros(
        Object.fromEntries(resultado.error.issues.map((issue) => [issue.path[0], issue.message])),
      );
      return;
    }
    const cnpj = resultado.data.cnpj.replace(/\D/g, "");
    if (empresas.some((empresa) => empresa.cnpj.replace(/\D/g, "") === cnpj)) {
      setErro("Já existe uma empresa cadastrada com este CNPJ.");
      return;
    }
    addEmpresa({ ...resultado.data, cnpj });
    setForm(vazio);
    setErros({});
    setErro("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Panel oculto={!podeAlterar} title="Cadastro de empresa">
        <form onSubmit={submit} className="space-y-4 p-5">
          <Field label="Nome da empresa" error={erros["nome"]}>
            <Input
              value={form.nome}
              onChange={(event) => setForm({ ...form, nome: event.target.value })}
              placeholder="Razão social ou nome"
            />
          </Field>
          <Field label="CNPJ" error={erros["cnpj"]}>
            <Input
              value={form.cnpj}
              onChange={(event) => setForm({ ...form, cnpj: event.target.value })}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
            />
          </Field>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <Button type="submit" className="w-full">
            <Plus /> Cadastrar empresa
          </Button>
        </form>
      </Panel>
      <Panel title={`Empresas cadastradas (${empresas.length})`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Nome da empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead className="w-16 pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresas.length === 0 && <EmptyRow cols={3} />}
            {empresas.map((empresa) => {
              const emUso = supervisores.some((supervisor) => supervisor.empresaId === empresa.id);
              return (
                <TableRow key={empresa.id}>
                  <TableCell className="pl-5 font-medium">{empresa.nome}</TableCell>
                  <TableCell className="font-mono text-xs">{empresa.cnpj}</TableCell>
                  <TableCell className="pr-5">
                    <Button
                      hidden={!podeAlterar}
                      variant="ghost"
                      size="icon"
                      aria-label={`Excluir ${empresa.nome}`}
                      disabled={emUso}
                      title={emUso ? "Há supervisores vinculados a esta empresa." : undefined}
                      onClick={() => {
                        if (!podeAlterar) return;
                        if (confirm(`Excluir a empresa ${empresa.nome}?`))
                          removeEmpresa(empresa.id);
                      }}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Panel>
    </div>
  );
}

const supervisorSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo.").max(100),
  tipo: z.enum(["NAGUMO", "EXTERNO"], { error: "Selecione o vínculo do supervisor." }),
  regiao: z.string().trim(),
  empresaId: z.string(),
});

function SupervisoresTab() {
  const { profile } = useAuth();
  const podeAlterar = podeEditar(profile?.role);
  const { empresas, supervisores, addSupervisor, removeSupervisor } = useCadastro();
  const vazio = { nome: "", tipo: "", regiao: "", empresaId: "" };
  const [form, setForm] = useState(vazio);
  const [erros, setErros] = useState<Record<string, string>>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!podeAlterar) return;
    const resultado = supervisorSchema.safeParse(form);
    if (!resultado.success) {
      setErros(
        Object.fromEntries(resultado.error.issues.map((issue) => [issue.path[0], issue.message])),
      );
      return;
    }
    if (resultado.data.tipo === "NAGUMO" && !resultado.data.regiao.trim()) {
      setErros({ regiao: "Informe a região supervisionada." });
      return;
    }
    if (resultado.data.tipo === "EXTERNO" && !resultado.data.empresaId) {
      setErros({ empresaId: "Selecione a empresa do supervisor." });
      return;
    }
    addSupervisor({
      nome: resultado.data.nome,
      tipo: resultado.data.tipo,
      ...(resultado.data.tipo === "NAGUMO"
        ? { regiao: resultado.data.regiao.trim() }
        : { empresaId: resultado.data.empresaId }),
    });
    setForm(vazio);
    setErros({});
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Panel oculto={!podeAlterar} title="Cadastro de supervisores">
        <form onSubmit={submit} className="space-y-4 p-5">
          <Field label="Vínculo" error={erros["tipo"]}>
            <Select
              value={form.tipo}
              onValueChange={(tipo) => setForm({ ...form, tipo, regiao: "", empresaId: "" })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione NAGUMO ou EXTERNO" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NAGUMO">NAGUMO</SelectItem>
                <SelectItem value="EXTERNO">EXTERNO</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Empresa" error={erros["empresaId"]}>
            <Select
              value={form.tipo === "NAGUMO" ? "nagumo" : form.empresaId}
              onValueChange={(empresaId) => setForm({ ...form, empresaId, nome: "" })}
              disabled={!form.tipo || form.tipo === "NAGUMO" || empresas.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !form.tipo
                      ? "Selecione o vínculo primeiro"
                      : form.tipo === "NAGUMO"
                        ? "NAGUMO"
                        : empresas.length
                          ? "Selecione a empresa"
                          : "Cadastre uma empresa primeiro"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {form.tipo === "NAGUMO" ? (
                  <SelectItem value="nagumo">NAGUMO</SelectItem>
                ) : (
                  empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nome do supervisor" error={erros["nome"]}>
            <Input
              value={form.nome}
              onChange={(event) => setForm({ ...form, nome: event.target.value })}
              disabled={form.tipo === "EXTERNO" && !form.empresaId}
              placeholder={
                form.tipo === "EXTERNO" && !form.empresaId ? "Selecione a empresa primeiro" : ""
              }
            />
          </Field>
          {form.tipo === "NAGUMO" && (
            <Field label="Região supervisionada" error={erros["regiao"]}>
              <Input
                value={form.regiao}
                onChange={(event) => setForm({ ...form, regiao: event.target.value })}
                placeholder="Ex.: Região Norte"
              />
            </Field>
          )}
          <Button type="submit" className="w-full">
            <Plus /> Cadastrar supervisor
          </Button>
        </form>
      </Panel>
      <Panel title={`Supervisores cadastrados (${supervisores.length})`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Nome</TableHead>
              <TableHead>Vínculo</TableHead>
              <TableHead>Região / empresa</TableHead>
              <TableHead className="w-16 pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {supervisores.length === 0 && <EmptyRow cols={4} />}
            {supervisores.map((supervisor) => (
              <TableRow key={supervisor.id}>
                <TableCell className="pl-5 font-medium">{supervisor.nome}</TableCell>
                <TableCell>{supervisor.tipo}</TableCell>
                <TableCell>
                  {supervisor.tipo === "NAGUMO"
                    ? supervisor.regiao
                    : (empresas.find((empresa) => empresa.id === supervisor.empresaId)?.nome ??
                      "Empresa não encontrada")}
                </TableCell>
                <TableCell className="pr-5">
                  <Button
                    hidden={!podeAlterar}
                    variant="ghost"
                    size="icon"
                    aria-label={`Excluir ${supervisor.nome}`}
                    onClick={() => {
                      if (!podeAlterar) return;
                      if (confirm(`Excluir o cadastro de ${supervisor.nome}?`))
                        removeSupervisor(supervisor.id);
                    }}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </div>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-10 text-center text-muted-foreground">
        Nenhum registro ainda.
      </TableCell>
    </TableRow>
  );
}
