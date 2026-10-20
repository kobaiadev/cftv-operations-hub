import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Store, UserCog, ClipboardCheck, ShieldHalf, Trash2, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCadastro, type Funcao } from "@/lib/cadastro-store";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastro — Controle PP" },
      { name: "description", content: "Cadastro de lojas, gerentes, fiscais e seguranças." },
      { property: "og:title", content: "Cadastro — Controle PP" },
      { property: "og:description", content: "Cadastro de lojas, gerentes, fiscais e seguranças." },
    ],
  }),
  component: CadastroPage,
});

const funcoes: { value: Funcao; label: string; plural: string; icon: typeof Store }[] = [
  { value: "gerente", label: "Gerente", plural: "Gerentes", icon: UserCog },
  { value: "fiscal", label: "Fiscal", plural: "Fiscais", icon: ClipboardCheck },
  { value: "seguranca", label: "Segurança", plural: "Seguranças", icon: ShieldHalf },
];

function CadastroPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cadastro</h1>
        <p className="text-sm text-muted-foreground">Gerencie lojas e as equipes responsáveis por cada unidade.</p>
      </div>
      <Tabs defaultValue="lojas">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="lojas"><Store /> Lojas</TabsTrigger>
          {funcoes.map((f) => (
            <TabsTrigger key={f.value} value={f.value}><f.icon /> {f.plural}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="lojas" className="mt-4"><LojasTab /></TabsContent>
        {funcoes.map((f) => (
          <TabsContent key={f.value} value={f.value} className="mt-4">
            <PessoasTab funcao={f.value} label={f.label} plural={f.plural} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-card">
      <div className="border-b border-border px-5 py-4 font-semibold">{title}</div>
      {children}
    </div>
  );
}

const lojaSchema = z.object({
  codigo: z.string().trim().regex(/^\d{1,4}$/, "Use até 4 dígitos"),
  nome: z.string().trim().min(2, "Informe o nome").max(80),
  endereco: z.string().trim().min(3, "Informe o endereço").max(150),
  telefone: z.string().trim().max(20),
});

function LojasTab() {
  const { lojas, addLoja, removeLoja } = useCadastro();
  const empty = { codigo: "", nome: "", endereco: "", telefone: "" };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = lojaSchema.safeParse(form);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    if (lojas.some((l) => l.codigo === r.data.codigo.padStart(3, "0"))) {
      setErrors({ codigo: "Código já cadastrado" });
      return;
    }
    addLoja({ ...r.data, codigo: r.data.codigo.padStart(3, "0") });
    setForm(empty);
    setErrors({});
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Panel title="Nova loja">
        <form onSubmit={submit} className="space-y-4 p-5">
          <Field label="Código" error={errors["codigo"]}>
            <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="014" />
          </Field>
          <Field label="Nome da loja" error={errors["nome"]}>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Centro" />
          </Field>
          <Field label="Endereço" error={errors["endereco"]}>
            <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          </Field>
          <Field label="Telefone" error={errors["telefone"]}>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 4000-0000" />
          </Field>
          <Button type="submit" className="w-full"><Plus /> Cadastrar loja</Button>
        </form>
      </Panel>
      <Panel title={`Lojas cadastradas (${lojas.length})`}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Endereço</TableHead>
              <TableHead className="hidden sm:table-cell">Telefone</TableHead>
              <TableHead className="pr-5 w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lojas.length === 0 && <EmptyRow cols={5} />}
            {lojas.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="pl-5 font-mono text-primary">{l.codigo}</TableCell>
                <TableCell>{l.nome}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{l.endereco}</TableCell>
                <TableCell className="hidden sm:table-cell font-mono text-xs">{l.telefone}</TableCell>
                <TableCell className="pr-5">
                  <Button variant="ghost" size="icon" aria-label={`Excluir loja ${l.nome}`}
                    onClick={() => confirm(`Excluir a loja ${l.nome} e sua equipe?`) && removeLoja(l.id)}>
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
  const { lojas, pessoas, addPessoa, removePessoa } = useCadastro();
  const empty = { nome: "", matricula: "", telefone: "", lojaId: "", turno: "" };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lista = pessoas.filter((p) => p.funcao === funcao);
  const lojaNome = (id: string) => {
    const l = lojas.find((x) => x.id === id);
    return l ? `Loja ${l.codigo} — ${l.nome}` : "—";
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
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
      <Panel title={`Novo ${label.toLowerCase()}`}>
        <form onSubmit={submit} className="space-y-4 p-5">
          <Field label="Nome completo" error={errors["nome"]}>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Matrícula" error={errors["matricula"]}>
            <Input value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} />
          </Field>
          <Field label="Telefone" error={errors["telefone"]}>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 90000-0000" />
          </Field>
          <Field label="Loja" error={errors["lojaId"]}>
            <Select value={form.lojaId} onValueChange={(v) => setForm({ ...form, lojaId: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder={lojas.length ? "Selecione" : "Cadastre uma loja primeiro"} /></SelectTrigger>
              <SelectContent>
                {lojas.map((l) => <SelectItem key={l.id} value={l.id}>Loja {l.codigo} — {l.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Turno" error={errors["turno"]}>
            <Select value={form.turno} onValueChange={(v) => setForm({ ...form, turno: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {["Manhã", "Tarde", "Noite", "Integral"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit" className="w-full"><Plus /> Cadastrar {label.toLowerCase()}</Button>
        </form>
      </Panel>
      <Panel title={`${plural} cadastrados (${lista.length})`}>
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
                <TableCell className="hidden sm:table-cell font-mono text-xs">{p.matricula}</TableCell>
                <TableCell className="whitespace-nowrap">{lojaNome(p.lojaId)}</TableCell>
                <TableCell className="hidden md:table-cell">{p.turno}</TableCell>
                <TableCell className="hidden md:table-cell font-mono text-xs">{p.telefone}</TableCell>
                <TableCell className="pr-5">
                  <Button variant="ghost" size="icon" aria-label={`Excluir ${p.nome}`}
                    onClick={() => confirm(`Excluir ${p.nome}?`) && removePessoa(p.id)}>
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
      <TableCell colSpan={cols} className="py-10 text-center text-muted-foreground">Nenhum registro ainda.</TableCell>
    </TableRow>
  );
}
