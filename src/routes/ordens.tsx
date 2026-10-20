import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ClipboardList,
  ImageUp,
  Link2,
  Loader2,
  ScanText,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import { useOS, nowBR, type Severity } from "@/lib/os-store";
import { useCadastro } from "@/lib/cadastro-store";
import { interpretarTexto, lerImagem } from "@/lib/ocr";

export const Route = createFileRoute("/ordens")({
  head: () => ({
    meta: [
      { title: "Ordens de Serviço — Controle PP" },
      { name: "description", content: "Gere OS a partir de prints já vinculadas à reserva de imagem do CFTV." },
      { property: "og:title", content: "Ordens de Serviço — Controle PP" },
      { property: "og:description", content: "Gere OS a partir de prints já vinculadas à reserva de imagem do CFTV." },
    ],
  }),
  component: OrdensPage,
});

const sevCls: Record<Severity, string> = {
  Baixa: "bg-success/15 text-success border-success/30",
  Média: "bg-warning/15 text-warning border-warning/30",
  Alta: "bg-destructive/15 text-destructive border-destructive/30",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function UploadBox({
  url,
  alt,
  texto,
  onClick,
}: {
  url: string;
  alt: string;
  texto: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-background/40 px-4 py-5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
    >
      {url ? (
        <img src={url} alt={alt} className="max-h-36 rounded-md object-contain" />
      ) : (
        <>
          <ImageUp className="size-5 text-primary" />
          {texto}
        </>
      )}
    </button>
  );
}

function OrdensPage() {
  const { ordens, addOS, removeOS } = useOS();
  const { lojas } = useCadastro();
  const nomesLojas = lojas.map((l) => l.nome);

  // ---- Print da ocorrência ----
  const printInput = useRef<HTMLInputElement>(null);
  const [printFile, setPrintFile] = useState<File | null>(null);
  const [printUrl, setPrintUrl] = useState("");
  const [lendo, setLendo] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [form, setForm] = useState({
    data: "",
    loja: "",
    setor: "",
    ocorrencia: "",
    descricao: "",
    gravidade: "Média" as Severity,
  });

  // ---- Reserva de imagem (dentro da mesma OS) ----
  const resInput = useRef<HTMLInputElement>(null);
  const [resFile, setResFile] = useState<File | null>(null);
  const [resUrl, setResUrl] = useState("");
  const [resNumero, setResNumero] = useState("");
  const [lendoRes, setLendoRes] = useState(false);

  const [osGerada, setOsGerada] = useState<string | null>(null);

  const escolherPrint = (f: File | undefined) => {
    if (!f) return;
    setPrintFile(f);
    setPrintUrl(URL.createObjectURL(f));
    setOsGerada(null);
  };

  const lerPrint = async () => {
    if (!printFile) return;
    setLendo(true);
    setProgresso(0);
    try {
      const texto = await lerImagem(printFile, setProgresso);
      const r = interpretarTexto(texto, nomesLojas);
      setForm({
        data: r.data || nowBR(),
        loja: r.loja,
        setor: r.setor,
        ocorrencia: r.ocorrencia,
        descricao: r.descricao,
        gravidade: r.gravidade,
      });
      if (r.reservaNumero && !resNumero) setResNumero(r.reservaNumero);
      toast.success("Print lido. Confira os dados antes de gerar a OS.");
    } catch {
      toast.error("Não foi possível ler a imagem. Tente um print mais nítido.");
    } finally {
      setLendo(false);
    }
  };

  const escolherReserva = (f: File | undefined) => {
    if (!f) return;
    setResFile(f);
    setResUrl(URL.createObjectURL(f));
  };

  const lerReserva = async () => {
    if (!resFile) return;
    setLendoRes(true);
    try {
      const texto = await lerImagem(resFile, () => {});
      const r = interpretarTexto(texto, nomesLojas);
      if (r.reservaNumero) {
        setResNumero(r.reservaNumero);
        toast.success(`Número de reserva identificado: ${r.reservaNumero}`);
      } else {
        toast.info("Número não identificado no print. Digite manualmente.");
      }
    } catch {
      toast.error("Não foi possível ler a imagem da reserva.");
    } finally {
      setLendoRes(false);
    }
  };

  const gerarOS = () => {
    if (!form.ocorrencia.trim()) {
      toast.error("Informe o tipo de ocorrência antes de gerar a OS.");
      return;
    }
    const temReserva = resNumero.trim() !== "";
    const nova = addOS({
      data: form.data || nowBR(),
      loja: form.loja || "Não identificada",
      setor: form.setor || "—",
      ocorrencia: form.ocorrencia,
      descricao: form.descricao,
      gravidade: form.gravidade,
      printNome: printFile?.name,
      reserva: temReserva
        ? { numero: resNumero.trim(), imagemNome: resFile?.name ?? "—", vinculadaEm: nowBR() }
        : undefined,
    });
    setOsGerada(nova.id);
    toast.success(
      temReserva
        ? `${nova.id} gerada e vinculada à reserva ${resNumero.trim()}.`
        : `${nova.id} gerada com sucesso.`,
    );
    // limpa o formulário para a próxima OS
    setPrintFile(null);
    setPrintUrl("");
    setResFile(null);
    setResUrl("");
    setResNumero("");
    setForm({ data: "", loja: "", setor: "", ocorrencia: "", descricao: "", gravidade: "Média" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ordens de Serviço</h1>
        <p className="text-sm text-muted-foreground">
          Envie o print da ocorrência e o print da reserva de imagem — a OS é gerada já vinculada à reserva.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-card">
        <h2 className="mb-1 flex items-center gap-2 font-semibold">
          <ScanText className="size-4 text-primary" /> Nova OS a partir de print
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          O sistema lê os prints e preenche os dados automaticamente.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Print da ocorrência */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              1. Print da ocorrência
            </p>
            <input
              ref={printInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => escolherPrint(e.target.files?.[0])}
            />
            <UploadBox
              url={printUrl}
              alt="Print da ocorrência"
              texto="Clique para enviar o print da ocorrência"
              onClick={() => printInput.current?.click()}
            />
            {printFile && (
              <div className="mt-3 flex items-center gap-2">
                <Button onClick={lerPrint} disabled={lendo} className="flex-1">
                  {lendo ? (
                    <>
                      <Loader2 className="animate-spin" /> Lendo print… {progresso}%
                    </>
                  ) : (
                    <>
                      <ScanText /> Ler print e preencher OS
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setPrintFile(null);
                    setPrintUrl("");
                  }}
                  aria-label="Remover print"
                >
                  <Trash2 />
                </Button>
              </div>
            )}
            {lendo && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${progresso}%` }} />
              </div>
            )}
          </div>

          {/* Reserva de imagem */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Link2 className="size-3.5 text-primary" /> 2. Reserva de imagem (CFTV)
            </p>
            <input
              ref={resInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => escolherReserva(e.target.files?.[0])}
            />
            <UploadBox
              url={resUrl}
              alt="Print da reserva"
              texto="Clique para enviar o print da reserva"
              onClick={() => resInput.current?.click()}
            />
            {resFile && (
              <div className="mt-3 flex items-center gap-2">
                <Button onClick={lerReserva} disabled={lendoRes} variant="outline" className="flex-1">
                  {lendoRes ? (
                    <>
                      <Loader2 className="animate-spin" /> Lendo número…
                    </>
                  ) : (
                    <>
                      <ScanText /> Ler número da reserva
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setResFile(null);
                    setResUrl("");
                  }}
                  aria-label="Remover print da reserva"
                >
                  <Trash2 />
                </Button>
              </div>
            )}
            <div className="mt-3">
              <Field label="Número da reserva (vinculado a esta OS)">
                <Input
                  value={resNumero}
                  onChange={(e) => setResNumero(e.target.value)}
                  placeholder="Ex.: 45872"
                  className="font-mono"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Dados da OS */}
        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            3. Dados da OS
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Data da ocorrência">
              <Input value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} placeholder="dd/mm/aaaa hh:mm" />
            </Field>
            <Field label="Loja">
              <Select value={form.loja} onValueChange={(v) => setForm({ ...form, loja: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a loja" />
                </SelectTrigger>
                <SelectContent>
                  {nomesLojas.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Setor">
              <Input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} placeholder="Ex.: Açougue" />
            </Field>
            <Field label="Gravidade">
              <Select value={form.gravidade} onValueChange={(v) => setForm({ ...form, gravidade: v as Severity })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2 lg:col-span-4">
              <Field label="Tipo de ocorrência">
                <Input value={form.ocorrencia} onChange={(e) => setForm({ ...form, ocorrencia: e.target.value })} placeholder="Ex.: Furto de carnes nobres" />
              </Field>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Field label="Descrição">
                <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} placeholder="Detalhes lidos do print…" />
              </Field>
            </div>
          </div>
        </div>

        <Button onClick={gerarOS} variant="secondary" className="mt-5 w-full">
          <ClipboardList /> Gerar OS{resNumero.trim() ? " e vincular reserva" : ""}
        </Button>
        {osGerada && (
          <p className="mt-3 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            {osGerada} criada e registrada no painel.
          </p>
        )}
      </div>

      {/* Lista de OS */}
      <div className="rounded-lg border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">OS Registradas</h2>
          <span className="text-xs text-muted-foreground">{ordens.length} registros</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">OS</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead className="hidden md:table-cell">Ocorrência</TableHead>
              <TableHead>Gravidade</TableHead>
              <TableHead>Reserva</TableHead>
              <TableHead className="pr-5">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordens.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="pl-5 font-mono text-primary">{o.id}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{o.data}</TableCell>
                <TableCell className="whitespace-nowrap">{o.loja}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell" title={o.descricao}>
                  {o.ocorrencia}
                </TableCell>
                <TableCell>
                  <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-xs font-medium", sevCls[o.gravidade])}>
                    {o.gravidade}
                  </span>
                </TableCell>
                <TableCell>
                  {o.reserva ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md border border-info/30 bg-info/10 px-2 py-0.5 font-mono text-xs text-info"
                      title={`Print: ${o.reserva.imagemNome} — vinculada em ${o.reserva.vinculadaEm}`}
                    >
                      <Link2 className="size-3" /> {o.reserva.numero}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="pr-5">
                  <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
                    <span
                      className={cn("size-2 rounded-full", {
                        "bg-warning": o.status === "Aguardando Imagens",
                        "bg-info": o.status === "Em Análise",
                        "bg-success": o.status === "Concluída",
                      })}
                    />
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
