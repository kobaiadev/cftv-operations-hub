import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Camera,
  Clock3,
  ExternalLink,
  Loader2,
  MapPin,
  Save,
  Trash2,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { lerFotosSupervisao, removerFotosSupervisao, salvarFotosSupervisao } from "@/lib/os-files";
import {
  gravarMetadadosNaFoto,
  obterLocalizacaoAtual,
  type LocalizacaoFoto,
} from "@/lib/supervisao-fotos";
import { useSupervisoes, type FotoSupervisao } from "@/lib/supervisao-store";
import { useCadastro, type TipoSupervisor } from "@/lib/cadastro-store";
import { podeEditar, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/supervisao")({
  head: () => ({
    meta: [
      { title: "Supervisão — Controle PP" },
      { property: "og:title", content: "Supervisão — Controle PP" },
      {
        property: "og:description",
        content: "Registre visitas de supervisão com fotos, data, hora e localização.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "description",
        content: "Registre visitas de supervisão com fotos, data, hora e localização.",
      },
    ],
  }),
  component: SupervisaoPage,
});

type Captura = FotoSupervisao & {
  blob: Blob;
  previaUrl: string;
};

const formatarDataHora = (valor: string | Date) =>
  new Date(valor).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

function RelogioAtual() {
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    const intervalo = window.setInterval(() => setAgora(new Date()), 15000);
    return () => window.clearInterval(intervalo);
  }, []);

  return <>{formatarDataHora(agora)}</>;
}

function SupervisaoPage() {
  const { profile } = useAuth();
  const podeAlterar = podeEditar(profile?.role);
  const { supervisoes, addSupervisao, removeSupervisao } = useSupervisoes();
  const { empresas, supervisores } = useCadastro();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoSupervisor | "">("");
  const [empresaId, setEmpresaId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [fotos, setFotos] = useState<(Captura | null)[]>([null, null]);
  const [processando, setProcessando] = useState<boolean[]>([false, false]);
  const [salvando, setSalvando] = useState(false);
  const fotosAtuaisRef = useRef(fotos);
  fotosAtuaisRef.current = fotos;
  const supervisoresDisponiveis = supervisores.filter(
    (supervisor) =>
      supervisor.tipo === tipo &&
      (tipo === "NAGUMO" || (tipo === "EXTERNO" && supervisor.empresaId === empresaId)),
  );

  useEffect(
    () => () =>
      fotosAtuaisRef.current.forEach((foto) => foto && URL.revokeObjectURL(foto.previaUrl)),
    [],
  );

  const capturarFoto = async (indice: number, arquivo?: File) => {
    if (!arquivo) return;
    const capturadaEm = new Date().toISOString();
    setProcessando((estado) => estado.map((valor, i) => (i === indice ? true : valor)));
    try {
      const localizacao: LocalizacaoFoto = await obterLocalizacaoAtual();
      const blob = await gravarMetadadosNaFoto(arquivo, capturadaEm, localizacao);
      const previaUrl = URL.createObjectURL(blob);
      setFotos((atuais) => {
        const anterior = atuais[indice];
        if (anterior) URL.revokeObjectURL(anterior.previaUrl);
        return atuais.map((foto, i) =>
          i === indice
            ? {
                nome: arquivo.name.replace(/\.[^.]+$/, "") + ".jpg",
                capturadaEm,
                latitude: localizacao.latitude,
                longitude: localizacao.longitude,
                precisaoMetros: localizacao.precisaoMetros,
                blob,
                previaUrl,
              }
            : foto,
        );
      });
      toast.success(`Foto ${indice + 1} registrada com localização.`);
    } catch (error) {
      console.error(`Não foi possível registrar a foto ${indice + 1} da supervisão.`, error);
      toast.error(error instanceof Error ? error.message : "Não foi possível processar esta foto.");
    } finally {
      setProcessando((estado) => estado.map((valor, i) => (i === indice ? false : valor)));
    }
  };

  const salvar = async () => {
    if (!podeAlterar) return;
    if (!nome.trim()) {
      toast.error("Informe o nome do supervisor.");
      return;
    }
    if (!tipo || !supervisorId || (tipo === "EXTERNO" && !empresaId)) {
      toast.error("Selecione o vínculo, a empresa e um supervisor cadastrado.");
      return;
    }
    const primeiraFoto = fotos[0];
    const segundaFoto = fotos[1];
    if (!primeiraFoto || !segundaFoto) {
      toast.error("Registre as duas fotos com data, hora e localização.");
      return;
    }

    const capturas: [Captura, Captura] = [primeiraFoto, segundaFoto];
    const id =
      globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const dataHora = new Date().toISOString();
    const registro = {
      supervisorNome: nome.trim(),
      supervisorId,
      tipoSupervisor: tipo,
      ...(tipo === "EXTERNO" ? { empresaId } : {}),
      dataHora,
      observacoes: observacoes.trim(),
      fotos: capturas.map(
        ({ nome: nomeArquivo, capturadaEm, latitude, longitude, precisaoMetros }) => ({
          nome: nomeArquivo,
          capturadaEm,
          latitude,
          longitude,
          precisaoMetros,
        }),
      ),
    };

    setSalvando(true);
    try {
      await salvarFotosSupervisao(
        id,
        capturas.map((foto) => foto.blob),
      );
      addSupervisao(registro, id);
      fotos.forEach((foto) => foto && URL.revokeObjectURL(foto.previaUrl));
      setNome("");
      setTipo("");
      setEmpresaId("");
      setSupervisorId("");
      setObservacoes("");
      setFotos([null, null]);
      toast.success("Registro de supervisão salvo.");
    } catch (error) {
      try {
        await removerFotosSupervisao(id);
      } catch (erroRemocao) {
        console.error("Não foi possível remover fotos após falha no salvamento.", erroRemocao);
      }
      console.error("Não foi possível salvar o registro de supervisão.", error);
      toast.error("Não foi possível salvar a supervisão neste dispositivo.");
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id: string, supervisor: string) => {
    if (!podeAlterar) return;
    if (!window.confirm(`Excluir o registro de supervisão de ${supervisor}?`)) return;
    try {
      await removerFotosSupervisao(id);
      removeSupervisao(id);
      toast.success("Registro de supervisão excluído.");
    } catch (error) {
      console.error("Não foi possível excluir o registro de supervisão.", error);
      toast.error("Não foi possível excluir o registro.");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Supervisão</h1>
        <p className="text-sm text-muted-foreground">
          Registre visitas com duas fotos identificadas por data, hora e geolocalização.
        </p>
      </header>

      <section
        className={`rounded-lg border border-border bg-card p-5 shadow-card ${podeAlterar ? "" : "hidden"}`}
      >
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <UsersRound className="size-4 text-primary" /> Novo registro de supervisão
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Vínculo</label>
            <Select
              value={tipo}
              onValueChange={(valor) => {
                if (valor === "NAGUMO" || valor === "EXTERNO") {
                  setTipo(valor);
                  setEmpresaId("");
                  setSupervisorId("");
                  setNome("");
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o vínculo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NAGUMO">Supervisão (Nagumo)</SelectItem>
                <SelectItem value="EXTERNO">Supervisor (Externo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Empresa</label>
            <Select
              value={tipo === "NAGUMO" ? "NAGUMO" : empresaId}
              onValueChange={(valor) => {
                setEmpresaId(valor);
                setSupervisorId("");
                setNome("");
              }}
              disabled={!tipo || tipo === "NAGUMO" || empresas.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !tipo
                      ? "Selecione o vínculo primeiro"
                      : tipo === "NAGUMO"
                        ? "NAGUMO"
                        : empresas.length
                          ? "Selecione a empresa"
                          : "Cadastre uma empresa primeiro"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {tipo === "NAGUMO" ? (
                  <SelectItem value="NAGUMO">NAGUMO</SelectItem>
                ) : (
                  empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome do supervisor</label>
            <Select
              value={supervisorId}
              onValueChange={(id) => {
                setSupervisorId(id);
                setNome(
                  supervisoresDisponiveis.find((supervisor) => supervisor.id === id)?.nome ?? "",
                );
              }}
              disabled={
                !tipo || (tipo === "EXTERNO" && !empresaId) || supervisoresDisponiveis.length === 0
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !tipo
                      ? "Selecione o vínculo primeiro"
                      : tipo === "EXTERNO" && !empresaId
                        ? "Selecione a empresa primeiro"
                        : supervisoresDisponiveis.length
                          ? "Selecione o supervisor"
                          : "Nenhum supervisor cadastrado"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {supervisoresDisponiveis.map((supervisor) => (
                  <SelectItem key={supervisor.id} value={supervisor.id}>
                    {supervisor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Data e hora do registro</p>
            <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm">
              <Clock3 className="size-4 text-muted-foreground" />
              <RelogioAtual />
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label
              htmlFor="supervisao-observacoes"
              className="text-xs font-medium text-muted-foreground"
            >
              Observações relevantes
            </label>
            <Textarea
              id="supervisao-observacoes"
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              placeholder="Descreva os pontos relevantes da supervisão"
              rows={4}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[0, 1].map((indice) => (
            <FotoInput
              key={indice}
              indice={indice}
              foto={fotos[indice]}
              processando={processando[indice]}
              onCapture={(arquivo) => void capturarFoto(indice, arquivo)}
              onRemove={() =>
                setFotos((atuais) => {
                  const anterior = atuais[indice];
                  if (anterior) URL.revokeObjectURL(anterior.previaUrl);
                  return atuais.map((foto, i) => (i === indice ? null : foto));
                })
              }
            />
          ))}
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" />A localização precisa ser autorizada para
          cada foto. Data, hora e coordenadas serão gravadas na imagem; em celulares, o botão
          solicita a câmera traseira.
        </p>
        <Button
          className="mt-5 w-full sm:w-auto"
          onClick={() => void salvar()}
          disabled={salvando || processando.some(Boolean)}
        >
          {salvando ? <Loader2 className="animate-spin" /> : <Save />}
          {salvando ? "Salvando..." : "Salvar supervisão"}
        </Button>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Registros de supervisão</h2>
          <p className="text-sm text-muted-foreground">
            {supervisoes.length} registro(s) salvo(s) neste dispositivo.
          </p>
        </div>
        {supervisoes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Nenhum registro de supervisão foi salvo.
          </div>
        ) : (
          <div className="space-y-4">
            {supervisoes.map((registro) => (
              <article
                key={registro.id}
                className="rounded-lg border border-border bg-card p-5 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{registro.supervisorNome}</h3>
                    <p className="text-sm text-muted-foreground">
                      {registro.tipoSupervisor === "NAGUMO"
                        ? "Supervisão (Nagumo)"
                        : registro.tipoSupervisor === "EXTERNO"
                          ? "Supervisor (Externo)"
                          : "Vínculo não informado"}
                      {" · "}
                      {formatarDataHora(registro.dataHora)}
                    </p>
                    {registro.empresaId && (
                      <p className="text-sm text-muted-foreground">
                        {empresas.find((empresa) => empresa.id === registro.empresaId)?.nome ??
                          "Empresa não encontrada"}
                      </p>
                    )}
                  </div>
                  <Button
                    hidden={!podeAlterar}
                    variant="ghost"
                    size="icon"
                    aria-label={`Excluir registro de ${registro.supervisorNome}`}
                    onClick={() => void excluir(registro.id, registro.supervisorNome)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
                {registro.observacoes && (
                  <p className="mt-3 whitespace-pre-wrap text-sm">{registro.observacoes}</p>
                )}
                <GaleriaFotos registroId={registro.id} fotos={registro.fotos} />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FotoInput({
  indice,
  foto,
  processando,
  onCapture,
  onRemove,
}: {
  indice: number;
  foto: Captura | null | undefined;
  processando: boolean | undefined;
  onCapture: (arquivo: File | undefined) => void;
  onRemove: () => void;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onCapture(event.target.files?.[0]);
    event.target.value = "";
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="mb-3 text-sm font-medium">Foto {indice + 1}</p>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        id={`supervisao-foto-${indice}`}
        onChange={handleChange}
      />
      {foto ? (
        <div className="space-y-3">
          <img
            src={foto.previaUrl}
            alt={`Foto ${indice + 1} com data, hora e localização`}
            className="max-h-72 w-full rounded-md object-contain"
          />
          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              {formatarDataHora(foto.capturadaEm)}
            </p>
            <p className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {foto.latitude.toFixed(6)}, {foto.longitude.toFixed(6)} (±
              {Math.round(foto.precisaoMetros)} m)
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onRemove}>
            <Trash2 /> Remover foto
          </Button>
        </div>
      ) : (
        <label
          htmlFor={`supervisao-foto-${indice}`}
          className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 p-5 text-center text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
        >
          {processando ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Camera className="size-5 text-primary" />
          )}
          {processando
            ? "Obtendo localização e preparando foto..."
            : "Toque para abrir a câmera e fotografar"}
        </label>
      )}
    </div>
  );
}

function GaleriaFotos({ registroId, fotos }: { registroId: string; fotos: FotoSupervisao[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;
    let urlsCriadas: string[] = [];
    void lerFotosSupervisao(registroId)
      .then((blobs) => {
        if (cancelado) return;
        urlsCriadas = blobs.map((blob) => URL.createObjectURL(blob));
        setUrls(urlsCriadas);
      })
      .catch((error: unknown) => {
        console.error(`Não foi possível carregar as fotos da supervisão ${registroId}.`, error);
        if (!cancelado) setErro("Não foi possível carregar as fotos deste registro.");
      });
    return () => {
      cancelado = true;
      urlsCriadas.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [registroId]);

  if (erro) return <p className="mt-4 text-sm text-destructive">{erro}</p>;
  if (urls.length === 0)
    return <p className="mt-4 text-sm text-muted-foreground">Carregando fotos...</p>;

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {urls.map((url, indice) => {
        const foto = fotos[indice];
        if (!foto) return null;
        const mapa = `https://www.google.com/maps?q=${foto.latitude},${foto.longitude}`;
        return (
          <figure key={`${registroId}-${indice}`} className="space-y-2">
            <img
              src={url}
              alt={`Foto ${indice + 1} da supervisão`}
              className="max-h-80 w-full rounded-md border border-border object-contain"
            />
            <figcaption className="space-y-1 text-xs text-muted-foreground">
              <p>{formatarDataHora(foto.capturadaEm)}</p>
              <a
                className="inline-flex items-center gap-1 text-primary underline"
                href={mapa}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin className="size-3.5" />
                {foto.latitude.toFixed(6)}, {foto.longitude.toFixed(6)} · mapa
                <ExternalLink className="size-3" />
              </a>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
