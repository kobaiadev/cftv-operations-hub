import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ClipboardList,
  Download,
  FileText,
  Eye,
  ImageUp,
  Link2,
  Loader2,
  Pencil,
  Save,
  ScanText,
  Search,
  Trash2,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useOS, nowBR, type OS, type OSStatus, type Severity } from "@/lib/os-store";
import { useCadastro } from "@/lib/cadastro-store";
import { interpretarBO, interpretarTexto, lerImagemParaOS } from "@/lib/ocr";
import { baixarPdfOS } from "@/lib/os-pdf";
import { salvarWorkOrder } from "@/lib/work-orders-api";
import {
  arquivoParaDataUrl,
  lerAnexos,
  removerAnexos,
  salvarAnexos,
  type Anexo,
} from "@/lib/os-files";
import { formatarTextoFormal, limparTextoCapturado } from "@/lib/os-text";
import { Paperclip } from "lucide-react";
import { Field, UploadBox } from "@/components/os-form-parts";
import { podeBaixar, podeEditar, useAuth } from "@/lib/auth";
import { ACEITE_IMAGEM_OU_PDF, ehImagemOuPdf } from "@/lib/documentos";

const extraVazio = () =>
  Array.from({ length: 4 }, () => ({ file: null as File | null, url: "", lendo: false }));

export const Route = createFileRoute("/ordens")({
  head: () => ({
    meta: [
      { title: "Ordens de Serviço — Controle PP" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "description",
        content: "Gere OS a partir de prints já vinculadas à reserva de imagem do CFTV.",
      },
      { property: "og:title", content: "Ordens de Serviço — Controle PP" },
      {
        property: "og:description",
        content: "Gere OS a partir de prints já vinculadas à reserva de imagem do CFTV.",
      },
    ],
  }),
  component: OrdensPage,
});

const sevCls: Record<Severity, string> = {
  Baixa: "bg-success/15 text-success border-success/30",
  Média: "bg-warning/15 text-warning border-warning/30",
  Alta: "bg-destructive/15 text-destructive border-destructive/30",
};

const normalizarBusca = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

function normalizarDataSupabase(data: string): string {
  const brasileira = data.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!brasileira) return data;

  const [, dia, mes, ano, hora, minuto] = brasileira;
  return hora && minuto ? `${ano}-${mes}-${dia}T${hora}:${minuto}:00` : `${ano}-${mes}-${dia}`;
}

function OrdensPage() {
  const { profile } = useAuth();
  const podeAlterar = podeEditar(profile?.role);
  const podeExportar = podeBaixar(profile?.role);
  const { ordens, addOS, removeOS, updateOS } = useOS();
  const { lojas } = useCadastro();
  const nomesLojas = lojas.map((l) => l.nome);
  const [editando, setEditando] = useState<OS | null>(null);
  const [anexosEditando, setAnexosEditando] = useState<Anexo[]>([]);
  const [carregandoEdicao, setCarregandoEdicao] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindoOS, setExcluindoOS] = useState<string | null>(null);
  const [baixandoPdf, setBaixandoPdf] = useState<string | null>(null);
  const [anexosPorOS, setAnexosPorOS] = useState<Record<string, Anexo[]>>({});
  const [ordensComAnexosAbertos, setOrdensComAnexosAbertos] = useState<Set<string>>(
    () => new Set(),
  );
  const [carregandoAnexosOS, setCarregandoAnexosOS] = useState<string | null>(null);
  const [rotuloNovoAnexo, setRotuloNovoAnexo] = useState("Documento adicional");
  const [filtroLoja, setFiltroLoja] = useState("todas");
  const [filtroData, setFiltroData] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const lojasRegistradas = useMemo(
    () =>
      [...new Set(ordens.map((ordem) => ordem.loja))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [ordens],
  );
  const ordensVisiveis = useMemo(() => {
    const consulta = normalizarBusca(filtroTexto.trim());
    const dataBr = filtroData ? filtroData.split("-").reverse().join("/") : "";
    return ordens.filter((ordem) => {
      if (filtroLoja !== "todas" && ordem.loja !== filtroLoja) return false;
      if (dataBr && !ordem.data.startsWith(dataBr)) return false;
      if (
        consulta &&
        !normalizarBusca(
          `${ordem.id} ${ordem.loja} ${ordem.setor} ${ordem.ocorrencia} ${ordem.descricao} ${ordem.bo?.numero ?? ""} ${ordem.reserva?.numero ?? ""}`,
        ).includes(consulta)
      ) {
        return false;
      }
      return true;
    });
  }, [ordens, filtroLoja, filtroData, filtroTexto]);
  const filtrosAtivos = filtroLoja !== "todas" || filtroData !== "" || filtroTexto !== "";

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

  // ---- Boletim de Ocorrência ----
  const boInput = useRef<HTMLInputElement>(null);
  const [boFile, setBoFile] = useState<File | null>(null);
  const [boUrl, setBoUrl] = useState("");
  const [bo, setBo] = useState({ numero: "", delegacia: "", data: "" });
  const [lendoBo, setLendoBo] = useState(false);

  // ---- Requisição policial de imagens ----
  const requisicaoInput = useRef<HTMLInputElement>(null);
  const [requisicaoFile, setRequisicaoFile] = useState<File | null>(null);
  const [requisicaoUrl, setRequisicaoUrl] = useState("");
  const [lendoRequisicao, setLendoRequisicao] = useState(false);

  const [osGerada, setOsGerada] = useState<string | null>(null);
  const [salvandoOS, setSalvandoOS] = useState(false);

  // ---- Textos lidos usados para complementar os campos do BO ----
  const textosOcr = useRef<Record<string, string>>({});
  const fontesComplementaresOcr = [
    "Print da ocorrência",
    "Reserva de imagem (CFTV)",
    "Requisição de Imagens (POLICIAL)",
    "Documento adicional 1",
    "Documento adicional 2",
    "Documento adicional 3",
    "Documento adicional 4",
  ];
  const recalcularDadosBO = () => {
    const resultado = interpretarBO(
      textosOcr.current["Boletim de Ocorrência"] ?? "",
      fontesComplementaresOcr.map((fonte) => textosOcr.current[fonte] ?? ""),
    );
    setBo(resultado);
    return resultado;
  };
  const removerTextoOcr = (rotulo: string) => {
    delete textosOcr.current[rotulo];
    recalcularDadosBO();
  };
  const atualizarDadosBO = (rotulo: string, texto: string) => {
    textosOcr.current[rotulo] = texto;
    return recalcularDadosBO();
  };
  const completarDadosDaDescricao = (descricao: string) => {
    const resultado = interpretarTexto(
      Object.values(textosOcr.current).join("\n"),
      nomesLojas,
      descricao,
    );
    setForm((anterior) => ({
      ...anterior,
      descricao,
      data: anterior.data || resultado.data,
      loja: anterior.loja || resultado.loja,
      setor: anterior.setor || resultado.setor,
      ocorrencia: anterior.ocorrencia || resultado.ocorrencia,
      gravidade: anterior.ocorrencia
        ? anterior.gravidade
        : resultado.ocorrencia
          ? resultado.gravidade
          : anterior.gravidade,
    }));
  };
  const [extras, setExtras] = useState(extraVazio);
  const escolherExtra = async (i: number, f: File | undefined) => {
    if (!f) return;
    if (!ehImagemOuPdf(f)) {
      toast.error("Selecione uma imagem ou um arquivo PDF.");
      return;
    }
    removerTextoOcr(`Documento adicional ${i + 1}`);
    const url = URL.createObjectURL(f);
    setExtras((p) =>
      p.map((x, j) => (j === i ? { file: f, url, lendo: f.type.startsWith("image/") } : x)),
    );
    if (!f.type.startsWith("image/")) return;
    try {
      const texto = await lerImagemParaOS(f, () => {});
      if (texto === null) {
        toast.info("Imagem com código de barras ignorada; nenhum dado foi extraído para a OS.");
        return;
      }
      atualizarDadosBO(`Documento adicional ${i + 1}`, texto);
      const o = interpretarTexto(texto, nomesLojas);
      setForm((prev) => ({
        ...prev,
        data: prev.data || o.data,
        loja: prev.loja || o.loja,
        setor: prev.setor || o.setor,
        ocorrencia: prev.ocorrencia || o.ocorrencia,
      }));
      if (o.reservaNumero) setResNumero((v) => v || o.reservaNumero);
      toast.success(`Documento adicional ${i + 1} lido.`);
    } catch {
      toast.error("Não foi possível ler o documento adicional.");
    } finally {
      setExtras((p) => p.map((x, j) => (j === i ? { ...x, lendo: false } : x)));
    }
  };

  const escolherPrint = (f: File | undefined) => {
    if (!f) return;
    removerTextoOcr("Print da ocorrência");
    setPrintFile(f);
    setPrintUrl(URL.createObjectURL(f));
    setOsGerada(null);
    void lerPrint(f);
  };

  const lerPrint = async (file: File | null = printFile) => {
    if (!file) return;
    setLendo(true);
    setProgresso(0);
    try {
      const texto = await lerImagemParaOS(file, setProgresso);
      if (texto === null) {
        toast.info("Imagem com código de barras ignorada; nenhum dado foi extraído para a OS.");
        return;
      }
      atualizarDadosBO("Print da ocorrência", texto);
      const r = interpretarTexto(texto, nomesLojas);
      setForm((prev) => ({
        ...prev,
        data: r.data || prev.data,
        loja: prev.loja || r.loja,
        setor: r.setor || prev.setor,
        ocorrencia: r.ocorrencia || prev.ocorrencia,
        gravidade: r.ocorrencia ? r.gravidade : prev.gravidade,
      }));
      if (r.reservaNumero) setResNumero((v) => v || r.reservaNumero);
      toast.success("Print lido e dados preenchidos. Confira antes de gerar a OS.");
    } catch {
      toast.error("Não foi possível ler a imagem. Tente um print mais nítido.");
    } finally {
      setLendo(false);
    }
  };

  const escolherReserva = (f: File | undefined) => {
    if (!f) return;
    removerTextoOcr("Reserva de imagem (CFTV)");
    setResFile(f);
    setResUrl(URL.createObjectURL(f));
    setResNumero("");
    void lerReserva(f);
  };

  const lerReserva = async (file: File | null = resFile) => {
    if (!file) return;
    setLendoRes(true);
    try {
      const texto = await lerImagemParaOS(file, () => {});
      if (texto === null) {
        toast.info("Imagem com código de barras ignorada; nenhum dado foi extraído para a OS.");
        return;
      }
      atualizarDadosBO("Reserva de imagem (CFTV)", texto);
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

  const escolherBo = (f: File | undefined) => {
    if (!f) return;
    removerTextoOcr("Boletim de Ocorrência");
    setBoFile(f);
    setBoUrl(URL.createObjectURL(f));
    void lerBo(f);
  };

  const lerBo = async (file: File | null = boFile) => {
    if (!file) return;
    setLendoBo(true);
    try {
      const texto = await lerImagemParaOS(file, () => {});
      if (texto === null) {
        toast.info("Imagem com código de barras ignorada; nenhum dado foi extraído para a OS.");
        return;
      }
      const r = atualizarDadosBO("Boletim de Ocorrência", texto);
      const o = interpretarTexto(texto, nomesLojas);
      // complementa dados da OS que ainda estiverem vazios
      setForm((prev) => ({
        ...prev,
        data: prev.data || o.data,
        loja: prev.loja || o.loja,
        setor: prev.setor || o.setor,
        ocorrencia: prev.ocorrencia || o.ocorrencia,
        gravidade: prev.ocorrencia ? prev.gravidade : o.ocorrencia ? o.gravidade : prev.gravidade,
      }));
      if (r.numero) toast.success(`BO identificado: ${r.numero}`);
      else toast.info("Número do BO não identificado. Digite manualmente.");
    } catch {
      toast.error("Não foi possível ler a imagem do BO.");
    } finally {
      setLendoBo(false);
    }
  };

  const lerRequisicao = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setLendoRequisicao(true);
    try {
      const texto = await lerImagemParaOS(file, () => {});
      if (texto === null) {
        toast.info("Imagem com código de barras ignorada; nenhum dado foi extraído para a OS.");
        return;
      }
      atualizarDadosBO("Requisição de Imagens (POLICIAL)", texto);
      toast.success("Requisição policial lida.");
    } catch {
      toast.error("Não foi possível ler a imagem da requisição policial.");
    } finally {
      setLendoRequisicao(false);
    }
  };

  const gerarOS = async () => {
    if (!podeAlterar) return;
    if (salvandoOS) return;
    const dadosReconhecidos = interpretarTexto(
      Object.values(textosOcr.current).join("\n"),
      nomesLojas,
      form.descricao,
    );
    if (!(form.ocorrencia || dadosReconhecidos.ocorrencia).trim()) {
      toast.error("Informe o tipo de ocorrência antes de gerar a OS.");
      return;
    }
    const temReserva = resNumero.trim() !== "";
    const arquivos: { rotulo: string; file: File }[] = [];
    if (printFile) arquivos.push({ rotulo: "Print da ocorrência", file: printFile });
    if (resFile) arquivos.push({ rotulo: "Print da reserva de imagem (CFTV)", file: resFile });
    if (boFile) arquivos.push({ rotulo: "Boletim de Ocorrência", file: boFile });
    if (requisicaoFile) {
      arquivos.push({ rotulo: "Requisição de Imagens (POLICIAL)", file: requisicaoFile });
    }
    extras.forEach(
      (x, i) => x.file && arquivos.push({ rotulo: `Documento adicional ${i + 1}`, file: x.file }),
    );
    const data = form.data || dadosReconhecidos.data || nowBR();
    const loja = limparTextoCapturado(form.loja || dadosReconhecidos.loja || "Não identificada");
    const ocorrencia = formatarTextoFormal(form.ocorrencia || dadosReconhecidos.ocorrencia);
    const setor = limparTextoCapturado(form.setor || dadosReconhecidos.setor || "—");
    const descricao = formatarTextoFormal(form.descricao);
    const gravidade = form.ocorrencia
      ? form.gravidade
      : dadosReconhecidos.ocorrencia
        ? dadosReconhecidos.gravidade
        : form.gravidade;

    setSalvandoOS(true);
    try {
      const nova = addOS({
        data,
        loja,
        setor,
        ocorrencia,
        descricao,
        gravidade,
        printNome: printFile?.name,
        anexosNomes: arquivos.map((a) => a.file.name),
        reserva: temReserva
          ? {
              numero: limparTextoCapturado(resNumero.trim()),
              imagemNome: limparTextoCapturado(resFile?.name ?? "—"),
              vinculadaEm: nowBR(),
            }
          : undefined,
        bo: bo.numero.trim()
          ? {
              numero: limparTextoCapturado(bo.numero.trim()),
              delegacia: limparTextoCapturado(bo.delegacia.trim()),
              data: limparTextoCapturado(bo.data.trim()),
              imagemNome: limparTextoCapturado(boFile?.name ?? "—"),
            }
          : undefined,
        dadosAdicionais:
          Object.entries(textosOcr.current)
            .filter(([, texto]) => texto.trim())
            .map(([fonte, texto]) => `${fonte}:\n${texto.trim()}`)
            .join("\n\n") || undefined,
      });
      setOsGerada(nova.id);
      setFiltroLoja("todas");
      setFiltroData("");
      setFiltroTexto("");

      let erroSupabase: unknown;
      try {
        await salvarWorkOrder({
          store_name: loja,
          event_date: normalizarDataSupabase(data),
          occurrence_type: ocorrencia,
          description: descricao,
        });
      } catch (error) {
        erroSupabase = error;
        console.error(
          `A ${nova.id} foi criada localmente, mas não sincronizada com o Supabase.`,
          error,
        );
      }

      try {
        const anexos = await Promise.all(
          arquivos.map(async (a) => ({
            rotulo: a.rotulo,
            nome: a.file.name,
            tipo: a.file.type,
            dataUrl: await arquivoParaDataUrl(a.file),
          })),
        );
        await salvarAnexos(nova.id, anexos);
      } catch (error) {
        console.error(
          `A OS ${nova.id} foi salva, mas os anexos não foram armazenados localmente.`,
          error,
        );
        toast.error(
          "A OS foi criada no painel, mas não foi possível guardar as imagens localmente.",
        );
      }
      if (erroSupabase) {
        const mensagem =
          erroSupabase instanceof Error ? erroSupabase.message : "Erro desconhecido.";
        toast.error(
          `${nova.id} criada no painel local, mas não sincronizada com o Supabase: ${mensagem}`,
        );
      } else {
        toast.success(
          `${nova.id} salva no Supabase${temReserva ? ` · reserva ${resNumero.trim()}` : ""}${bo.numero.trim() ? ` · BO ${bo.numero.trim()}` : ""}.`,
        );
      }
      setPrintFile(null);
      setPrintUrl("");
      setResFile(null);
      setResUrl("");
      setResNumero("");
      setBoFile(null);
      setBoUrl("");
      setBo({ numero: "", delegacia: "", data: "" });
      if (requisicaoUrl) URL.revokeObjectURL(requisicaoUrl);
      setRequisicaoFile(null);
      setRequisicaoUrl("");
      textosOcr.current = {};
      setForm({ data: "", loja: "", setor: "", ocorrencia: "", descricao: "", gravidade: "Média" });
      setExtras(extraVazio());
    } catch (error) {
      console.error("Não foi possível criar a OS no painel local.", error);
      const mensagem = error instanceof Error ? error.message : "Erro desconhecido.";
      toast.error(`Não foi possível criar a OS no painel: ${mensagem}`);
    } finally {
      setSalvandoOS(false);
    }
  };

  const abrirEdicao = async (os: OS) => {
    if (!podeAlterar) return;
    setEditando({ ...os });
    setAnexosEditando([]);
    setCarregandoEdicao(true);
    setRotuloNovoAnexo("Documento adicional");
    try {
      setAnexosEditando(await lerAnexos(os.id));
    } catch (error) {
      console.error(`Não foi possível carregar os anexos da ${os.id}.`, error);
      toast.error("Não foi possível carregar os anexos desta OS.");
      setEditando(null);
    } finally {
      setCarregandoEdicao(false);
    }
  };

  const [visualizando, setVisualizando] = useState<OS | null>(null);

  const baixarPdf = async (os: OS) => {
    if (!podeExportar) return;
    setBaixandoPdf(os.id);
    try {
      await baixarPdfOS(os);
      toast.success(`PDF da ocorrência ${os.id} gerado.`);
    } catch (error) {
      console.error(`Não foi possível gerar o PDF da ocorrência ${os.id}.`, error);
      toast.error(`Não foi possível gerar o PDF da ocorrência ${os.id}.`);
    } finally {
      setBaixandoPdf(null);
    }
  };

  const alternarAnexos = async (os: OS) => {
    if (ordensComAnexosAbertos.has(os.id)) {
      setOrdensComAnexosAbertos((atuais) => {
        const proximas = new Set(atuais);
        proximas.delete(os.id);
        return proximas;
      });
      return;
    }

    let anexos = anexosPorOS[os.id];
    if (!anexos) {
      setCarregandoAnexosOS(os.id);
      try {
        const carregados = await lerAnexos(os.id);
        anexos = carregados;
        setAnexosPorOS((atuais) => ({ ...atuais, [os.id]: carregados }));
      } catch (error) {
        console.error(`Não foi possível carregar os anexos da ${os.id}.`, error);
        toast.error(`Não foi possível carregar os anexos da ${os.id}.`);
        return;
      } finally {
        setCarregandoAnexosOS(null);
      }
    }

    if (anexos.length === 0) {
      toast.info(`A ${os.id} não possui anexos disponíveis para download.`);
      return;
    }

    setOrdensComAnexosAbertos((atuais) => new Set(atuais).add(os.id));
  };

  const baixarAnexo = (osId: string, anexo: Anexo) => {
    if (!podeExportar) return;
    try {
      const link = document.createElement("a");
      link.href = anexo.dataUrl;
      link.download = anexo.nome || `${anexo.rotulo}.bin`;
      link.rel = "noopener";
      document.body.append(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(`Não foi possível baixar "${anexo.nome}" da ${osId}.`, error);
      toast.error(`Não foi possível baixar o arquivo "${anexo.nome}".`);
    }
  };

  const adicionarAnexos = async (event: ChangeEvent<HTMLInputElement>) => {
    const arquivos = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (arquivos.length === 0) return;

    try {
      const anexos = await Promise.all(
        arquivos.map(async (arquivo, indice) => ({
          rotulo:
            rotuloNovoAnexo === "Documento adicional"
              ? `Documento adicional ${anexosEditando.filter((anexo) => anexo.rotulo.startsWith("Documento adicional")).length + indice + 1}`
              : rotuloNovoAnexo,
          nome: arquivo.name,
          tipo: arquivo.type || "application/octet-stream",
          dataUrl: await arquivoParaDataUrl(arquivo),
        })),
      );
      setAnexosEditando((atuais) => [...atuais, ...anexos]);
      toast.success(`${arquivos.length} arquivo(s) adicionado(s) à OS.`);
    } catch (error) {
      console.error("Não foi possível preparar os anexos selecionados.", error);
      toast.error("Não foi possível carregar um ou mais arquivos selecionados.");
    }
  };

  const substituirAnexo = async (indice: number, event: ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;

    try {
      const dataUrl = await arquivoParaDataUrl(arquivo);
      setAnexosEditando((atuais) =>
        atuais.map((anexo, i) =>
          i === indice
            ? {
                ...anexo,
                nome: arquivo.name,
                tipo: arquivo.type || "application/octet-stream",
                dataUrl,
              }
            : anexo,
        ),
      );
      toast.success("Anexo substituído.");
    } catch (error) {
      console.error("Não foi possível preparar o arquivo substituto.", error);
      toast.error("Não foi possível carregar o arquivo substituto.");
    }
  };

  const salvarEdicao = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!podeAlterar) return;
    if (!editando) return;
    if (!editando.ocorrencia.trim()) {
      toast.error("Informe o tipo de ocorrência.");
      return;
    }
    if (!editando.data.trim() || !editando.loja.trim()) {
      toast.error("Informe a data e a loja da ocorrência.");
      return;
    }

    setSalvandoEdicao(true);
    try {
      const atualizada: OS = {
        ...editando,
        loja: limparTextoCapturado(editando.loja),
        setor: limparTextoCapturado(editando.setor),
        ocorrencia: formatarTextoFormal(editando.ocorrencia),
        descricao: formatarTextoFormal(editando.descricao),
        printNome: editando.printNome ? limparTextoCapturado(editando.printNome) : undefined,
        dadosAdicionais: editando.dadosAdicionais
          ? formatarTextoFormal(editando.dadosAdicionais) || undefined
          : undefined,
        reserva: editando.reserva
          ? {
              ...editando.reserva,
              numero: limparTextoCapturado(editando.reserva.numero),
              imagemNome: limparTextoCapturado(editando.reserva.imagemNome),
            }
          : undefined,
        bo: editando.bo
          ? {
              ...editando.bo,
              numero: limparTextoCapturado(editando.bo.numero),
              delegacia: limparTextoCapturado(editando.bo.delegacia),
              imagemNome: limparTextoCapturado(editando.bo.imagemNome),
            }
          : undefined,
        anexosNomes: anexosEditando.map((anexo) => anexo.nome),
      };
      await salvarAnexos(editando.id, anexosEditando);
      setAnexosPorOS((atuais) => ({ ...atuais, [editando.id]: [...anexosEditando] }));
      updateOS(editando.id, atualizada);
      toast.success(`${editando.id} atualizada com sucesso.`);
      setEditando(null);
    } catch (error) {
      console.error(`Não foi possível salvar as alterações da ${editando.id}.`, error);
      toast.error("Não foi possível salvar as alterações. Tente novamente.");
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const excluirOrdem = async (os: OS) => {
    if (!podeAlterar) return;
    if (
      !window.confirm(
        `Tem certeza de que deseja excluir a ${os.id}? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    setExcluindoOS(os.id);
    try {
      await removerAnexos(os.id);
      removeOS(os.id);
      setAnexosPorOS((atuais) => {
        const proximos = { ...atuais };
        delete proximos[os.id];
        return proximos;
      });
      setOrdensComAnexosAbertos((atuais) => {
        const proximas = new Set(atuais);
        proximas.delete(os.id);
        return proximas;
      });
      if (editando?.id === os.id) setEditando(null);
      toast.success(`${os.id} e seus anexos foram excluídos.`);
    } catch (error) {
      console.error(`Não foi possível excluir a ${os.id}.`, error);
      toast.error("Não foi possível excluir a OS. Tente novamente.");
    } finally {
      setExcluindoOS(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ordens de Serviço</h1>
        <p className="text-sm text-muted-foreground">
          Envie os prints da ocorrência, da reserva de imagem e do Boletim de Ocorrência — tudo é
          lido e vinculado à OS.
        </p>
      </div>

      <div
        className={`rounded-lg border border-border bg-card p-5 shadow-card ${podeAlterar ? "" : "hidden"}`}
      >
        <h2 className="mb-1 flex items-center gap-2 font-semibold">
          <ScanText className="size-4 text-primary" /> Nova OS a partir de print
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Ao enviar cada imagem, o sistema lê e preenche os dados automaticamente. Os documentos
          adicionais também complementam campos não identificados nos três uploads principais.
        </p>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
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
                <Button
                  onClick={() => lerPrint()}
                  disabled={lendo}
                  variant="outline"
                  className="flex-1"
                >
                  {lendo ? (
                    <>
                      <Loader2 className="animate-spin" /> Lendo print… {progresso}%
                    </>
                  ) : (
                    <>
                      <ScanText /> Ler novamente
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
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progresso}%` }}
                />
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
                <Button
                  onClick={() => lerReserva()}
                  disabled={lendoRes}
                  variant="outline"
                  className="flex-1"
                >
                  {lendoRes ? (
                    <>
                      <Loader2 className="animate-spin" /> Lendo número…
                    </>
                  ) : (
                    <>
                      <ScanText /> Ler novamente
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

          {/* Boletim de Ocorrência */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <FileText className="size-3.5 text-primary" /> 3. Boletim de Ocorrência
            </p>
            <input
              ref={boInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => escolherBo(e.target.files?.[0])}
            />
            <UploadBox
              url={boUrl}
              alt="Print do Boletim de Ocorrência"
              texto="Clique para enviar o print do BO"
              onClick={() => boInput.current?.click()}
            />
            {boFile && (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  onClick={() => lerBo()}
                  disabled={lendoBo}
                  variant="outline"
                  className="flex-1"
                >
                  {lendoBo ? (
                    <>
                      <Loader2 className="animate-spin" /> Lendo BO…
                    </>
                  ) : (
                    <>
                      <ScanText /> Ler novamente
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setBoFile(null);
                    setBoUrl("");
                  }}
                  aria-label="Remover print do BO"
                >
                  <Trash2 />
                </Button>
              </div>
            )}
            <div className="mt-3 space-y-3">
              <Field label="Número do BO">
                <Input
                  value={bo.numero}
                  onChange={(e) => setBo({ ...bo, numero: e.target.value })}
                  placeholder="Ex.: AB1234/2026"
                  className="font-mono"
                />
              </Field>
              <Field label="Delegacia">
                <Input
                  value={bo.delegacia}
                  onChange={(e) => setBo({ ...bo, delegacia: e.target.value })}
                  placeholder="Ex.: 3º Distrito Policial"
                />
              </Field>
              <Field label="Data do registro">
                <Input
                  value={bo.data}
                  onChange={(e) => setBo({ ...bo, data: e.target.value })}
                  placeholder="dd/mm/aaaa"
                />
              </Field>
            </div>
          </div>

          {/* Requisição policial de imagens */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <FileText className="size-3.5 text-primary" /> 4. Requisição de Imagens (POLICIAL)
            </p>
            <input
              ref={requisicaoInput}
              type="file"
              accept={ACEITE_IMAGEM_OU_PDF}
              className="hidden"
              onChange={(event) => {
                const arquivo = event.target.files?.[0];
                if (!arquivo) return;
                if (!ehImagemOuPdf(arquivo)) {
                  toast.error("Selecione uma imagem ou um arquivo PDF.");
                  event.target.value = "";
                  return;
                }
                removerTextoOcr("Requisição de Imagens (POLICIAL)");
                setRequisicaoFile(arquivo);
                if (requisicaoUrl) URL.revokeObjectURL(requisicaoUrl);
                setRequisicaoUrl(
                  arquivo.type.startsWith("image/") ? URL.createObjectURL(arquivo) : "",
                );
                void lerRequisicao(arquivo);
                event.target.value = "";
              }}
            />
            <UploadBox
              url={requisicaoUrl}
              alt="Requisição policial de imagens"
              tipo={requisicaoFile?.type}
              texto={
                lendoRequisicao
                  ? "Lendo imagem da requisição..."
                  : (requisicaoFile?.name ?? "Clique para enviar a requisição policial")
              }
              onClick={() => requisicaoInput.current?.click()}
            />
            {requisicaoFile && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  if (requisicaoUrl) URL.revokeObjectURL(requisicaoUrl);
                  setRequisicaoFile(null);
                  setRequisicaoUrl("");
                }}
              >
                <Trash2 /> Remover requisição
              </Button>
            )}
          </div>
        </div>

        {/* Documentos adicionais */}
        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Paperclip className="size-3.5 text-primary" /> Documentos adicionais (opcional)
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            Envie imagens ou arquivos PDF. A leitura automática é feita nas imagens.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {extras.map((ex, i) => (
              <div key={i}>
                <input
                  id={`extra-${i}`}
                  type="file"
                  accept={ACEITE_IMAGEM_OU_PDF}
                  className="hidden"
                  onChange={(e) => {
                    void escolherExtra(i, e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <UploadBox
                  url={ex.file?.type.startsWith("image/") ? ex.url : ""}
                  alt={`Documento adicional ${i + 1}`}
                  tipo={ex.file?.type}
                  texto={ex.file ? ex.file.name : `Documento adicional ${i + 1}`}
                  onClick={() => document.getElementById(`extra-${i}`)?.click()}
                />
                {ex.file && (
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{ex.lendo ? "Lendo documento…" : ex.file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setExtras((p) =>
                          p.map((x, j) => (j === i ? { file: null, url: "", lendo: false } : x)),
                        )
                      }
                      aria-label={`Remover documento ${i + 1}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dados da OS */}
        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            5. Dados da OS
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Data da ocorrência">
              <Input
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                placeholder="dd/mm/aaaa hh:mm"
              />
            </Field>
            <Field label="Loja">
              <Select value={form.loja} onValueChange={(v) => setForm({ ...form, loja: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a loja" />
                </SelectTrigger>
                <SelectContent>
                  {nomesLojas.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Setor">
              <Input
                value={form.setor}
                onChange={(e) => setForm({ ...form, setor: e.target.value })}
                placeholder="Ex.: Açougue"
              />
            </Field>
            <Field label="Gravidade">
              <Select
                value={form.gravidade}
                onValueChange={(v) => setForm({ ...form, gravidade: v as Severity })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2 lg:col-span-4">
              <Field label="Tipo de ocorrência">
                <Input
                  value={form.ocorrencia}
                  onChange={(e) => setForm({ ...form, ocorrencia: e.target.value })}
                  placeholder="Ex.: Furto de carnes nobres"
                />
              </Field>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Field label="Descrição da ocorrência">
                <Textarea
                  value={form.descricao}
                  onChange={(e) => completarDadosDaDescricao(e.target.value)}
                  rows={3}
                  placeholder="Preencha manualmente, se necessário."
                />
              </Field>
            </div>
          </div>
        </div>

        <Button
          onClick={gerarOS}
          variant="secondary"
          className="mt-5 w-full"
          disabled={
            salvandoOS || lendo || lendoRes || lendoBo || extras.some((extra) => extra.lendo)
          }
        >
          {salvandoOS ? <Loader2 className="animate-spin" /> : <ClipboardList />}
          {salvandoOS
            ? "Salvando no Supabase..."
            : `Gerar OS${resNumero.trim() ? " e vincular reserva" : ""}`}
        </Button>
        {osGerada && (
          <p className="mt-3 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            {osGerada} criada e registrada no painel.
          </p>
        )}
      </div>

      {/* Lista de OS */}
      <div className="rounded-lg border border-border bg-card shadow-card">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Ordens de Serviço Registradas</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Consulte e pesquise os registros da operação.
                {podeAlterar && " Edite ou gerencie os registros conforme necessário."}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {ordensVisiveis.length} de {ordens.length} registros
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_180px_2fr_auto]">
            <div className="space-y-1.5">
              <label htmlFor="filtro-loja-os" className="text-xs font-medium text-muted-foreground">
                Loja
              </label>
              <Select value={filtroLoja} onValueChange={setFiltroLoja}>
                <SelectTrigger id="filtro-loja-os" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as lojas</SelectItem>
                  {lojasRegistradas.map((loja) => (
                    <SelectItem key={loja} value={loja}>
                      {loja}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="filtro-data-os" className="text-xs font-medium text-muted-foreground">
                Data
              </label>
              <Input
                id="filtro-data-os"
                type="date"
                value={filtroData}
                onChange={(event) => setFiltroData(event.target.value)}
                className="[color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="filtro-texto-os"
                className="text-xs font-medium text-muted-foreground"
              >
                OS, ocorrência ou palavra-chave
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filtro-texto-os"
                  value={filtroTexto}
                  onChange={(event) => setFiltroTexto(event.target.value)}
                  placeholder='Ex.: "furto", "açougue", "BO"'
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                disabled={!filtrosAtivos}
                onClick={() => {
                  setFiltroLoja("todas");
                  setFiltroData("");
                  setFiltroTexto("");
                }}
              >
                <X /> Limpar
              </Button>
            </div>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">OS</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead className="hidden lg:table-cell">Setor</TableHead>
              <TableHead className="hidden md:table-cell">Ocorrência</TableHead>
              <TableHead>Gravidade</TableHead>
              <TableHead>Reserva</TableHead>
              <TableHead>BO</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordensVisiveis.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  {ordens.length === 0
                    ? "Nenhuma OS registrada."
                    : "Nenhuma OS encontrada para os filtros informados."}
                </TableCell>
              </TableRow>
            )}
            {ordensVisiveis.map((o) => (
              <Fragment key={o.id}>
                <TableRow>
                  <TableCell className="pl-5 font-mono text-primary">{o.id}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {o.data}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{o.loja}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {o.setor}
                  </TableCell>
                  <TableCell
                    className="hidden text-muted-foreground md:table-cell"
                    title={o.descricao}
                  >
                    {o.ocorrencia}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                        sevCls[o.gravidade],
                      )}
                    >
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
                  <TableCell>
                    {o.bo ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs"
                        title={`${o.bo.delegacia || "Delegacia não informada"} — ${o.bo.data || "sem data"}`}
                      >
                        <FileText className="size-3" /> {o.bo.numero}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
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
                  <TableCell className="pr-5 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={carregandoAnexosOS !== null}
                      onClick={() => void alternarAnexos(o)}
                      aria-label={`${ordensComAnexosAbertos.has(o.id) ? "Ocultar" : "Exibir"} anexos da ${o.id}`}
                      title="Exibir anexos da ordem de serviço"
                    >
                      {carregandoAnexosOS === o.id ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Paperclip />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setVisualizando(o)}
                      aria-label={`Visualizar ${o.id}`}
                      title={`Visualizar ${o.id}`}
                    >
                      <Eye />
                    </Button>
                    <Button
                      hidden={!podeExportar}
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={baixandoPdf !== null}
                      onClick={() => void baixarPdf(o)}
                      aria-label={`Baixar PDF da ocorrência ${o.id}`}
                      title={`Baixar PDF da ocorrência ${o.id}`}
                    >
                      {baixandoPdf === o.id ? <Loader2 className="animate-spin" /> : <Download />}
                    </Button>
                    <Button
                      hidden={!podeAlterar}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void abrirEdicao(o)}
                      aria-label={`Editar ${o.id}`}
                    >
                      <Pencil /> Editar
                    </Button>
                    <Button
                      hidden={!podeAlterar}
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={excluindoOS === o.id}
                      onClick={() => void excluirOrdem(o)}
                      aria-label={`Excluir ${o.id}`}
                      title={`Excluir ${o.id}`}
                    >
                      {excluindoOS === o.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                    </Button>
                  </TableCell>
                </TableRow>
                {ordensComAnexosAbertos.has(o.id) && (
                  <TableRow>
                    <TableCell colSpan={10} className="bg-muted/20 px-5 py-4">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {(anexosPorOS[o.id] ?? []).map((anexo, indice) => (
                          <div
                            key={`${anexo.nome}-${indice}`}
                            className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-card p-3"
                          >
                            <p className="text-xs font-semibold text-foreground">{anexo.rotulo}</p>
                            <p
                              className="truncate text-xs text-muted-foreground"
                              title={anexo.nome}
                            >
                              {anexo.nome}
                            </p>
                            <Button
                              hidden={!podeExportar}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-auto w-full"
                              onClick={() => baixarAnexo(o.id, anexo)}
                            >
                              <Download /> Baixar arquivo
                            </Button>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={editando !== null}
        onOpenChange={(aberto) => {
          if (!aberto && !salvandoEdicao) setEditando(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar OS {editando?.id}</DialogTitle>
            <DialogDescription>
              Edite os dados da ordem, seus vínculos e os arquivos anexados.
            </DialogDescription>
          </DialogHeader>
          {editando &&
            (carregandoEdicao ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Carregando dados e anexos...
              </div>
            ) : (
              <form onSubmit={salvarEdicao} className="space-y-6">
                <section className="space-y-4">
                  <h3 className="border-b border-border pb-2 text-sm font-semibold">
                    Dados da ocorrência
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Data da ocorrência">
                      <Input
                        value={editando.data}
                        onChange={(event) => setEditando({ ...editando, data: event.target.value })}
                        placeholder="dd/mm/aaaa hh:mm"
                        required
                      />
                    </Field>
                    <Field label="Loja">
                      <Select
                        value={editando.loja}
                        onValueChange={(loja) => setEditando({ ...editando, loja })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a loja" />
                        </SelectTrigger>
                        <SelectContent>
                          {!nomesLojas.includes(editando.loja) && (
                            <SelectItem value={editando.loja}>{editando.loja}</SelectItem>
                          )}
                          {nomesLojas.map((loja) => (
                            <SelectItem key={loja} value={loja}>
                              {loja}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Setor">
                      <Input
                        value={editando.setor}
                        onChange={(event) =>
                          setEditando({ ...editando, setor: event.target.value })
                        }
                        placeholder="Ex.: Açougue"
                      />
                    </Field>
                    <Field label="Gravidade">
                      <Select
                        value={editando.gravidade}
                        onValueChange={(gravidade) =>
                          setEditando({ ...editando, gravidade: gravidade as Severity })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Baixa">Baixa</SelectItem>
                          <SelectItem value="Média">Média</SelectItem>
                          <SelectItem value="Alta">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Status">
                      <Select
                        value={editando.status}
                        onValueChange={(status) =>
                          setEditando({ ...editando, status: status as OSStatus })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Aguardando Imagens">Aguardando Imagens</SelectItem>
                          <SelectItem value="Em Análise">Em Análise</SelectItem>
                          <SelectItem value="Concluída">Concluída</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Nome do print da ocorrência">
                      <Input
                        value={editando.printNome ?? ""}
                        onChange={(event) =>
                          setEditando({ ...editando, printNome: event.target.value || undefined })
                        }
                        placeholder="Nome do arquivo"
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Tipo de ocorrência">
                        <Input
                          value={editando.ocorrencia}
                          onChange={(event) =>
                            setEditando({ ...editando, ocorrencia: event.target.value })
                          }
                          required
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Descrição da ocorrência">
                        <Textarea
                          value={editando.descricao}
                          onChange={(event) =>
                            setEditando({ ...editando, descricao: event.target.value })
                          }
                          rows={4}
                        />
                      </Field>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="border-b border-border pb-2 text-sm font-semibold">
                    Reserva de imagem (CFTV)
                  </h3>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(editando.reserva)}
                      onChange={(event) =>
                        setEditando({
                          ...editando,
                          reserva: event.target.checked
                            ? (editando.reserva ?? {
                                numero: "",
                                imagemNome: "",
                                vinculadaEm: nowBR(),
                              })
                            : undefined,
                        })
                      }
                    />
                    Esta OS possui reserva de imagem
                  </label>
                  {editando.reserva && (
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Número da reserva">
                        <Input
                          value={editando.reserva.numero}
                          onChange={(event) =>
                            setEditando({
                              ...editando,
                              reserva: { ...editando.reserva!, numero: event.target.value },
                            })
                          }
                        />
                      </Field>
                      <Field label="Nome do print da reserva">
                        <Input
                          value={editando.reserva.imagemNome}
                          onChange={(event) =>
                            setEditando({
                              ...editando,
                              reserva: { ...editando.reserva!, imagemNome: event.target.value },
                            })
                          }
                        />
                      </Field>
                      <Field label="Data do vínculo">
                        <Input
                          value={editando.reserva.vinculadaEm}
                          onChange={(event) =>
                            setEditando({
                              ...editando,
                              reserva: { ...editando.reserva!, vinculadaEm: event.target.value },
                            })
                          }
                          placeholder="dd/mm/aaaa hh:mm"
                        />
                      </Field>
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <h3 className="border-b border-border pb-2 text-sm font-semibold">
                    Boletim de Ocorrência
                  </h3>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(editando.bo)}
                      onChange={(event) =>
                        setEditando({
                          ...editando,
                          bo: event.target.checked
                            ? (editando.bo ?? {
                                numero: "",
                                delegacia: "",
                                data: "",
                                imagemNome: "",
                              })
                            : undefined,
                        })
                      }
                    />
                    Esta OS possui boletim de ocorrência
                  </label>
                  {editando.bo && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Número do BO">
                        <Input
                          value={editando.bo.numero}
                          onChange={(event) =>
                            setEditando({
                              ...editando,
                              bo: { ...editando.bo!, numero: event.target.value },
                            })
                          }
                        />
                      </Field>
                      <Field label="Delegacia">
                        <Input
                          value={editando.bo.delegacia}
                          onChange={(event) =>
                            setEditando({
                              ...editando,
                              bo: { ...editando.bo!, delegacia: event.target.value },
                            })
                          }
                        />
                      </Field>
                      <Field label="Data do registro">
                        <Input
                          value={editando.bo.data}
                          onChange={(event) =>
                            setEditando({
                              ...editando,
                              bo: { ...editando.bo!, data: event.target.value },
                            })
                          }
                          placeholder="dd/mm/aaaa"
                        />
                      </Field>
                      <Field label="Nome do print do BO">
                        <Input
                          value={editando.bo.imagemNome}
                          onChange={(event) =>
                            setEditando({
                              ...editando,
                              bo: { ...editando.bo!, imagemNome: event.target.value },
                            })
                          }
                        />
                      </Field>
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div className="border-b border-border pb-2">
                    <h3 className="text-sm font-semibold">Prints e documentos anexados</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Visualize, substitua, renomeie ou remova arquivos. Também é possível adicionar
                      novos anexos.
                    </p>
                  </div>
                  {anexosEditando.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                      Nenhum arquivo anexado a esta OS.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {anexosEditando.map((anexo, indice) => (
                        <div
                          key={`${anexo.nome}-${indice}`}
                          className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {anexo.tipo.startsWith("image/") ? (
                              <a
                                href={anexo.dataUrl}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Visualizar ${anexo.nome}`}
                              >
                                <img
                                  src={anexo.dataUrl}
                                  alt={anexo.nome}
                                  className="size-16 rounded border border-border object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={anexo.dataUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex size-16 shrink-0 items-center justify-center rounded border border-border bg-muted"
                                aria-label={`Abrir ${anexo.nome}`}
                              >
                                <FileText className="size-6 text-muted-foreground" />
                              </a>
                            )}
                            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                              <Field label="Descrição do anexo">
                                <Input
                                  value={anexo.rotulo}
                                  onChange={(event) =>
                                    setAnexosEditando((atuais) =>
                                      atuais.map((item, i) =>
                                        i === indice
                                          ? { ...item, rotulo: event.target.value }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                              </Field>
                              <Field label="Nome do arquivo">
                                <Input
                                  value={anexo.nome}
                                  onChange={(event) =>
                                    setAnexosEditando((atuais) =>
                                      atuais.map((item, i) =>
                                        i === indice ? { ...item, nome: event.target.value } : item,
                                      ),
                                    )
                                  }
                                />
                              </Field>
                            </div>
                          </div>
                          <div className="flex items-end justify-end gap-2">
                            <input
                              id={`substituir-anexo-${editando.id}-${indice}`}
                              type="file"
                              accept={ACEITE_IMAGEM_OU_PDF}
                              className="hidden"
                              onChange={(event) => void substituirAnexo(indice, event)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                document
                                  .getElementById(`substituir-anexo-${editando.id}-${indice}`)
                                  ?.click()
                              }
                            >
                              <ImageUp /> Substituir
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remover anexo ${anexo.nome}`}
                              onClick={() =>
                                setAnexosEditando((atuais) => atuais.filter((_, i) => i !== indice))
                              }
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <Field label="Tipo do novo anexo">
                      <Select value={rotuloNovoAnexo} onValueChange={setRotuloNovoAnexo}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Print da ocorrência">Print da ocorrência</SelectItem>
                          <SelectItem value="Print da reserva de imagem (CFTV)">
                            Print da reserva de imagem (CFTV)
                          </SelectItem>
                          <SelectItem value="Boletim de Ocorrência">
                            Boletim de Ocorrência
                          </SelectItem>
                          <SelectItem value="Documento adicional">Documento adicional</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex items-end">
                      <Input
                        type="file"
                        accept={ACEITE_IMAGEM_OU_PDF}
                        multiple
                        onChange={(event) => void adicionarAnexos(event)}
                        aria-label="Adicionar arquivo à OS"
                      />
                    </div>
                  </div>
                </section>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={salvandoEdicao}
                    onClick={() => setEditando(null)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={salvandoEdicao}>
                    {salvandoEdicao ? <Loader2 className="animate-spin" /> : <Save />}
                    {salvandoEdicao ? "Salvando..." : "Salvar todas as alterações"}
                  </Button>
                </DialogFooter>
              </form>
            ))}
        </DialogContent>
      </Dialog>

      <Dialog open={visualizando !== null} onOpenChange={(aberto) => !aberto && setVisualizando(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {visualizando && (
            <>
              <DialogHeader>
                <DialogTitle>Ordem de Serviço {visualizando.id}</DialogTitle>
                <DialogDescription>Visualização somente leitura.</DialogDescription>
              </DialogHeader>
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {([
                  ["Data", visualizando.data],
                  ["Status", visualizando.status],
                  ["Loja", visualizando.loja],
                  ["Setor", visualizando.setor],
                  ["Ocorrência", visualizando.ocorrencia],
                  ["Gravidade", visualizando.gravidade],
                  ["Reserva CFTV", visualizando.reserva ? `${visualizando.reserva.numero} (${visualizando.reserva.vinculadaEm})` : "Não vinculada"],
                  ["Boletim de Ocorrência", visualizando.bo ? `${visualizando.bo.numero} — ${visualizando.bo.delegacia} (${visualizando.bo.data})` : "Não informado"],
                ] as const).map(([rotulo, valor]) => (
                  <div key={rotulo}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</dt>
                    <dd className="font-medium">{valor || "—"}</dd>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Descrição</dt>
                  <dd className="whitespace-pre-wrap">{visualizando.descricao || "—"}</dd>
                </div>
                {visualizando.dadosAdicionais && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Dados adicionais</dt>
                    <dd className="whitespace-pre-wrap">{visualizando.dadosAdicionais}</dd>
                  </div>
                )}
              </dl>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setVisualizando(null)}>
                  Fechar
                </Button>
                {podeExportar && (
                  <Button type="button" disabled={baixandoPdf !== null} onClick={() => void baixarPdf(visualizando)}>
                    {baixandoPdf === visualizando.id ? <Loader2 className="animate-spin" /> : <Download />}
                    Gerar PDF
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
