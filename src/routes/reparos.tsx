import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Save, ScanText, Search, Trash2, Wrench, X } from "lucide-react";
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
import { Field, UploadBox } from "@/components/os-form-parts";
import { useCadastro } from "@/lib/cadastro-store";
import { interpretarTexto, lerImagemParaOS } from "@/lib/ocr";
import { baixarPdfReparo } from "@/lib/os-pdf";
import { podeBaixar, podeEditar, useAuth } from "@/lib/auth";
import {
  carregarImagensReparo,
  criarReparo,
  excluirReparo,
  listarReparos,
  reparosQueryKey,
} from "@/lib/reparo-api";

const TITLE = "Solicitação de Reparo — Controle PP";
const DESC = "Registre solicitações de reparo com leitura do chamado GLPI e PDF formal.";

export const Route = createFileRoute("/reparos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReparosPage,
});

type Slot = { file: File | null; url: string; detalhes: string };
const slotsVazios = (): Slot[] => Array.from({ length: 3 }, () => ({ file: null, url: "", detalhes: "" }));
const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function ReparosPage() {
  const { lojas } = useCadastro();
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const editar = podeEditar(profile?.role);
  const solicitante = profile?.display_name || profile?.email || user?.email || "";

  const { data: lista = [], isLoading } = useQuery({
    queryKey: reparosQueryKey,
    queryFn: listarReparos,
  });

  const [loja, setLoja] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [descricao, setDescricao] = useState("");
  const gerente = lojas.find((l) => l.nome === loja)?.gerente ?? "";

  const glpiInput = useRef<HTMLInputElement>(null);
  const [glpiFile, setGlpiFile] = useState<File | null>(null);
  const [glpiUrl, setGlpiUrl] = useState("");
  const [glpiNumero, setGlpiNumero] = useState("");
  const [lendoGlpi, setLendoGlpi] = useState(false);
  const extraInputs = useRef<(HTMLInputElement | null)[]>([]);
  const [slots, setSlots] = useState<Slot[]>(slotsVazios);
  const [busca, setBusca] = useState("");

  const lerGlpi = async (f: File | undefined) => {
    if (!f) return;
    setGlpiFile(f);
    setGlpiUrl(URL.createObjectURL(f));
    setGlpiNumero("");
    setLendoGlpi(true);
    try {
      const texto = await lerImagemParaOS(f, () => {});
      if (texto === null) {
        toast.info("Imagem com código de barras ignorada; digite o número manualmente.");
        return;
      }
      const r = interpretarTexto(texto, lojas.map((l) => l.nome));
      if (r.reservaNumero) {
        setGlpiNumero(r.reservaNumero);
        toast.success(`Número GLPI identificado: ${r.reservaNumero}`);
      } else toast.info("Número não identificado no print. Digite manualmente.");
    } catch {
      toast.error("Não foi possível ler a imagem da solicitação GLPI.");
    } finally {
      setLendoGlpi(false);
    }
  };

  const limpar = () => {
    setLoja("");
    setEmpresa("");
    setDescricao("");
    setGlpiFile(null);
    setGlpiUrl("");
    setGlpiNumero("");
    setSlots(slotsVazios());
  };

  const salvar = useMutation({
    mutationFn: () =>
      criarReparo({
        loja,
        empresa_responsavel: empresa.trim(),
        gerente,
        solicitante,
        glpi_numero: glpiNumero.trim(),
        descricao: descricao.trim(),
        arquivos: [
          ...(glpiFile ? [{ rotulo: "Solicitação GLPI", detalhes: "", file: glpiFile }] : []),
          ...slots.flatMap((s, i) =>
            s.file ? [{ rotulo: `Imagem adicional ${i + 1}`, detalhes: s.detalhes, file: s.file }] : [],
          ),
        ],
      }),
    onSuccess: (id) => {
      toast.success(`${id} registrada.`);
      limpar();
      void qc.invalidateQueries({ queryKey: reparosQueryKey });
    },
    onError: (e) => toast.error(`Não foi possível salvar: ${e instanceof Error ? e.message : e}`),
  });

  const excluir = useMutation({
    mutationFn: excluirReparo,
    onSuccess: () => void qc.invalidateQueries({ queryKey: reparosQueryKey }),
    onError: () => toast.error("Não foi possível excluir."),
  });

  const visiveis = useMemo(() => {
    const q = norm(busca.trim());
    if (!q) return lista;
    return lista.filter((r) =>
      norm(`${r.id} ${r.loja} ${r.empresa_responsavel} ${r.glpi_numero} ${r.descricao} ${r.solicitante}`).includes(q),
    );
  }, [lista, busca]);

  const baixar = async (id: string) => {
    const sr = lista.find((r) => r.id === id);
    if (!sr) return;
    try {
      await baixarPdfReparo(sr, await carregarImagensReparo(sr.imagens));
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar o PDF.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
          <Wrench className="size-6 text-primary" /> Solicitação de Reparo
        </h1>
        <p className="text-sm text-muted-foreground">{DESC}</p>
      </div>

      {editar && (
        <section className="space-y-5 rounded-xl border border-border bg-card p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Loja">
              <Select value={loja} onValueChange={setLoja}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a loja" />
                </SelectTrigger>
                <SelectContent>
                  {lojas.map((l) => (
                    <SelectItem key={l.id} value={l.nome}>
                      {l.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Empresa responsável pelo reparo">
              <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
            </Field>
            <Field label="Gerente responsável pela loja">
              <Input value={gerente} readOnly placeholder="Selecione a loja" className="bg-muted/40" />
            </Field>
            <Field label="Solicitante">
              <Input value={solicitante} readOnly className="bg-muted/40" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Solicitação GLPI</p>
              <input
                ref={glpiInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void lerGlpi(e.target.files?.[0])}
              />
              <UploadBox url={glpiUrl} alt="Solicitação GLPI" texto="Enviar print" onClick={() => glpiInput.current?.click()} />
              <div className="relative">
                <Input
                  value={glpiNumero}
                  onChange={(e) => setGlpiNumero(e.target.value)}
                  placeholder="Nº da solicitação"
                  className="font-mono"
                />
                {lendoGlpi && (
                  <span className="absolute right-2 top-2.5 flex items-center gap-1 text-xs text-primary">
                    <ScanText className="size-3.5" /> lendo…
                  </span>
                )}
              </div>
            </div>
            {slots.map((s, i) => (
              <div key={i} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Imagens adicionais</p>
                <input
                  ref={(el) => {
                    extraInputs.current[i] = el;
                  }}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setSlots((p) => p.map((x, j) => (j === i ? { ...x, file: f, url: URL.createObjectURL(f) } : x)));
                  }}
                />
                <UploadBox url={s.url} alt={`Imagem adicional ${i + 1}`} texto="Enviar imagem" onClick={() => extraInputs.current[i]?.click()} />
                <Input
                  value={s.detalhes}
                  onChange={(e) =>
                    setSlots((p) => p.map((x, j) => (j === i ? { ...x, detalhes: e.target.value } : x)))
                  }
                  placeholder="Detalhes da imagem"
                />
              </div>
            ))}
          </div>

          <Field label="Descrição da Solicitação">
            <Textarea rows={5} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Field>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={limpar}>
              <X /> Limpar
            </Button>
            <Button
              disabled={!loja || !descricao.trim() || salvar.isPending || lendoGlpi}
              onClick={() => salvar.mutate()}
            >
              {salvar.isPending ? <Loader2 className="animate-spin" /> : <Save />} Registrar solicitação
            </Button>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Search className="size-4 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar por loja, empresa, GLPI ou palavra" />
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Solicitação</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead className="hidden md:table-cell">Empresa</TableHead>
              <TableHead>GLPI</TableHead>
              <TableHead className="hidden lg:table-cell">Solicitante</TableHead>
              <TableHead className="pr-5 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {isLoading ? "Carregando…" : "Nenhuma solicitação registrada."}
                </TableCell>
              </TableRow>
            )}
            {visiveis.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="pl-5 font-mono text-primary">{r.id}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </TableCell>
                <TableCell className="whitespace-nowrap">{r.loja}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{r.empresa_responsavel || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{r.glpi_numero || "—"}</TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">{r.solicitante}</TableCell>
                <TableCell className="pr-5 text-right">
                  <div className="flex justify-end gap-1">
                    {podeBaixar(profile?.role) && (
                      <Button size="sm" variant="outline" onClick={() => void baixar(r.id)}>
                        <Download /> PDF
                      </Button>
                    )}
                    {editar && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Excluir ${r.id}`}
                        onClick={() => excluir.mutate(r.id)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
