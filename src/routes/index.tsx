import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Clock, Search, CheckCircle2, type LucideIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { useOS, type Severity, type OSStatus } from "@/lib/os-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Controle de OS e Reservas CFTV" },
      { name: "description", content: "Painel de prevenção de perdas: KPIs de OS e últimas ocorrências." },
      { property: "og:title", content: "Dashboard — Controle de OS e Reservas CFTV" },
      { property: "og:description", content: "Painel de prevenção de perdas: KPIs de OS e últimas ocorrências." },
    ],
  }),
  component: Dashboard,
});

type Tone = "primary" | "warning" | "info" | "success";
const toneCls: Record<Tone, string> = {
  primary: "bg-primary/15 text-primary",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
  success: "bg-success/15 text-success",
};

const kpis: { label: string; value: number; delta: string; icon: LucideIcon; tone: Tone }[] = [
  { label: "Total de OS", value: 248, delta: "+12 nesta semana", icon: ClipboardList, tone: "primary" },
  { label: "Aguardando Imagens", value: 37, delta: "8 vencem em 24h", icon: Clock, tone: "warning" },
  { label: "Em Análise", value: 22, delta: "Média 2,4 dias", icon: Search, tone: "info" },
  { label: "Concluídas", value: 189, delta: "76% do total", icon: CheckCircle2, tone: "success" },
];

type Severity = "Baixa" | "Média" | "Alta";
type Status = "Aguardando Imagens" | "Em Análise" | "Concluída";

const ordens: { id: string; data: string; loja: string; setor: string; ocorrencia: string; descricao: string; gravidade: Severity; status: Status }[] = [
  { id: "OS-2481", data: "20/10/2026 18:42", loja: "Loja 014 — Centro", setor: "Açougue", ocorrencia: "Furto de carnes nobres", descricao: "Cliente identificado como João ocultou peças de picanha na mochila.", gravidade: "Alta", status: "Aguardando Imagens" },
  { id: "OS-2480", data: "20/10/2026 16:10", loja: "Loja 007 — Vila Nova", setor: "Frente de Caixa", ocorrencia: "Divergência de sangria", descricao: "Operadora Maria relatou diferença de R$ 200 na sangria do caixa 05.", gravidade: "Média", status: "Em Análise" },
  { id: "OS-2479", data: "20/10/2026 11:25", loja: "Loja 022 — Jardins", setor: "Bebidas", ocorrencia: "Avaria de destilados", descricao: "Repositor derrubou caixa de whisky durante abastecimento.", gravidade: "Baixa", status: "Concluída" },
  { id: "OS-2478", data: "19/10/2026 21:03", loja: "Loja 014 — Centro", setor: "Perfumaria", ocorrencia: "Violação de embalagem", descricao: "Embalagens de perfume abertas próximas ao corredor 12, suspeito saiu de carro prata.", gravidade: "Média", status: "Em Análise" },
  { id: "OS-2477", data: "19/10/2026 14:47", loja: "Loja 003 — Matriz", setor: "Recebimento", ocorrencia: "Falta em nota fiscal", descricao: "Motorista do caminhão entregou 3 volumes a menos que a nota.", gravidade: "Alta", status: "Concluída" },
];

const sevCls: Record<Severity, string> = {
  Baixa: "bg-success/15 text-success border-success/30",
  Média: "bg-warning/15 text-warning border-warning/30",
  Alta: "bg-destructive/15 text-destructive border-destructive/30",
};
const statusCls: Record<Status, string> = {
  "Aguardando Imagens": "bg-warning",
  "Em Análise": "bg-info",
  Concluída: "bg-success",
};

const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const lojas = Array.from(new Set(ordens.map((o) => o.loja))).sort();

function Dashboard() {
  const [loja, setLoja] = useState("todas");
  const [data, setData] = useState("");
  const [termo, setTermo] = useState("");

  const filtradas = useMemo(() => {
    const q = norm(termo.trim());
    const dataBr = data ? data.split("-").reverse().join("/") : "";
    return ordens.filter((o) => {
      if (loja !== "todas" && o.loja !== loja) return false;
      if (dataBr && !o.data.startsWith(dataBr)) return false;
      if (q && !norm(`${o.ocorrencia} ${o.descricao} ${o.setor} ${o.id}`).includes(q)) return false;
      return true;
    });
  }, [loja, data, termo]);

  const ativo = loja !== "todas" || data !== "" || termo !== "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel Inicial</h1>
        <p className="text-sm text-muted-foreground">Visão geral das ordens de serviço de prevenção de perdas.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <span className="text-sm text-muted-foreground">{k.label}</span>
              <span className={cn("flex size-9 items-center justify-center rounded-md", toneCls[k.tone])}>
                <k.icon className="size-4" />
              </span>
            </div>
            <div className="mt-3 font-mono text-3xl font-semibold tabular-nums">{k.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <Search className="size-4 text-primary" /> Pesquisar OS
          </h2>
          {ativo && (
            <Button variant="ghost" size="sm" onClick={() => { setLoja("todas"); setData(""); setTermo(""); }}>
              <X /> Limpar
            </Button>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_180px_2fr]">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Loja</label>
            <Select value={loja} onValueChange={setLoja}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as lojas</SelectItem>
                {lojas.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Data</label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="[color-scheme:dark]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tipo de ocorrência / palavra-chave</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder='Ex.: "joão", "carro", "furto"' className="pl-9" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">Últimas OS Registradas</h2>
          <span className="text-xs text-muted-foreground">{filtradas.length} de {ordens.length} registros</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">OS</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead className="hidden md:table-cell">Setor</TableHead>
              <TableHead className="hidden lg:table-cell">Ocorrência</TableHead>
              <TableHead>Gravidade</TableHead>
              <TableHead className="pr-5">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nenhuma OS encontrada para os filtros informados.</TableCell></TableRow>
            )}
            {filtradas.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="pl-5 font-mono text-primary">{o.id}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{o.data}</TableCell>
                <TableCell className="whitespace-nowrap">{o.loja}</TableCell>
                <TableCell className="hidden md:table-cell">{o.setor}</TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground" title={o.descricao}>{o.ocorrencia}</TableCell>
                <TableCell>
                  <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-xs font-medium", sevCls[o.gravidade])}>
                    {o.gravidade}
                  </span>
                </TableCell>
                <TableCell className="pr-5">
                  <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
                    <span className={cn("size-2 rounded-full", statusCls[o.status])} />
                    {o.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
