import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  FileCheck2,
  FileText,
  type LucideIcon,
  ListChecks,
  MapPin,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Loja } from "@/lib/cadastro-store";
import type { OS } from "@/lib/os-store";
import {
  classificarTipoOcorrencia,
  filtrarOrdens,
  listarLojasParaAnalise,
  MESES,
  obterPeriodoOS,
  possuiRegistroDelegacia,
  type FiltrosOcorrencias,
} from "@/lib/ocorrencias-analytics";

const CORES_GRAFICO = ["#1689f8", "#e56835", "#14b8a6", "#8b5cf6", "#eab308", "#ec4899"];
const COR_GRAVIDADE: Record<string, string> = {
  Alta: "#ef4444",
  Média: "#f59e0b",
  Baixa: "#22c55e",
};
const COR_STATUS: Record<string, string> = {
  "Aguardando Imagens": "#f59e0b",
  "Em Análise": "#1689f8",
  Concluída: "#22c55e",
};
const numero = new Intl.NumberFormat("pt-BR");
const percentual = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function Cartao({
  titulo,
  valor,
  detalhe,
  icon: Icon,
  cor = "text-primary",
}: {
  titulo: string;
  valor: string;
  detalhe: string;
  icon: LucideIcon;
  cor?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{titulo}</span>
        <span className={`flex size-9 items-center justify-center rounded-lg bg-secondary ${cor}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-4 truncate font-mono text-2xl font-semibold tracking-tight">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );
}

function Painel({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="mb-4">
        <h3 className="font-semibold">{titulo}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{descricao}</p>
      </div>
      {children}
    </section>
  );
}

type OpcaoFiltro = { valor: string; rotulo: string };

function CampoFiltro({
  id,
  titulo,
  valor,
  opcoes,
  aoAlterar,
}: {
  id: string;
  titulo: string;
  valor: string;
  opcoes: OpcaoFiltro[];
  aoAlterar: (valor: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {titulo}
      </label>
      <Select value={valor} onValueChange={aoAlterar}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((opcao) => (
            <SelectItem key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function BlocoDistribuicao({
  titulo,
  dados,
  cores,
  icon: Icon,
}: {
  titulo: string;
  dados: { nome: string; total: number }[];
  cores: Record<string, string>;
  icon: LucideIcon;
}) {
  const total = dados.reduce((soma, item) => soma + item.total, 0);
  return (
    <Painel titulo={titulo} descricao="Quantidade e participação nas ocorrências do período.">
      {total === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Sem ocorrências para apresentar.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {dados.map((item) => (
            <div
              key={item.nome}
              className="flex items-center justify-between gap-3 rounded-lg bg-secondary/50 p-3"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <Icon
                  className="size-4 shrink-0"
                  style={{ color: cores[item.nome] ?? "#64748b" }}
                />
                <span className="truncate">{item.nome}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-sm font-semibold">
                  {numero.format(item.total)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {percentual.format((item.total / total) * 100)}%
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Painel>
  );
}

export function OcorrenciasDashboard({ ordens, lojas }: { ordens: OS[]; lojas: Loja[] }) {
  const anos = useMemo(
    () =>
      [
        ...new Set(
          ordens
            .map((ordem) => obterPeriodoOS(ordem.data)?.ano)
            .filter((ano): ano is number => ano !== undefined),
        ),
      ].sort((a, b) => b - a),
    [ordens],
  );
  const [filtros, setFiltros] = useState<FiltrosOcorrencias>({
    ano: "todos",
    mes: "todos",
    loja: "todas",
    tipo: "todos",
    setor: "todos",
    gravidade: "todas",
    status: "todos",
    boletim: "todos",
    reserva: "todos",
  });
  const lojasDisponiveis = useMemo(
    () => listarLojasParaAnalise(ordens, lojas).map((loja) => loja.nome),
    [ordens, lojas],
  );
  const tiposDisponiveis = useMemo(
    () =>
      [...new Set(ordens.map((ordem) => classificarTipoOcorrencia(ordem.ocorrencia)))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [ordens],
  );
  const setoresDisponiveis = useMemo(
    () =>
      [...new Set(ordens.map((ordem) => ordem.setor.trim() || "Não informado"))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [ordens],
  );
  const lojasFiltro = lojasDisponiveis.map((nome) => ({ valor: nome, rotulo: nome }));
  if (ordens.some((ordem) => !ordem.loja.trim())) {
    lojasFiltro.unshift({ valor: "Não informada", rotulo: "Loja não informada" });
  }
  const ordensFiltradas = useMemo(() => filtrarOrdens(ordens, filtros), [ordens, filtros]);
  const ordensSemFiltroAno = useMemo(
    () => filtrarOrdens(ordens, filtros, "ano"),
    [ordens, filtros],
  );
  const ordensSemFiltroLoja = useMemo(
    () => filtrarOrdens(ordens, filtros, "loja"),
    [ordens, filtros],
  );
  const ordensDemaisFiltros = useMemo(
    () => filtrarOrdens(ordens, { ...filtros, ano: "todos", mes: "todos" }, "ano"),
    [ordens, filtros],
  );
  const lojasComContagem = useMemo(
    () => listarLojasParaAnalise(ordensFiltradas, lojas),
    [ordensFiltradas, lojas],
  );
  const lojasComOcorrencias = lojasComContagem.filter((loja) => loja.total > 0);
  const tipos = useMemo(
    () =>
      agrupar(ordensFiltradas, (ordem) => classificarTipoOcorrencia(ordem.ocorrencia)).slice(0, 8),
    [ordensFiltradas],
  );
  const setores = useMemo(
    () => agrupar(ordensFiltradas, (ordem) => ordem.setor || "Não informado").slice(0, 8),
    [ordensFiltradas],
  );
  const lojasParaComparacao = useMemo(
    () => listarLojasParaAnalise(ordensSemFiltroLoja, lojas),
    [ordensSemFiltroLoja, lojas],
  );
  const lojasComparacaoComOcorrencias = lojasParaComparacao.filter((loja) => loja.total > 0);
  const totaisPorLoja = lojasParaComparacao.filter((loja) => loja.total > 0).slice(0, 10);
  const ordensComBO = ordensFiltradas.filter(possuiRegistroDelegacia).length;
  const ordensComReserva = ordensFiltradas.filter((ordem) => Boolean(ordem.reserva?.numero)).length;
  const percentualBO =
    ordensFiltradas.length > 0 ? (ordensComBO / ordensFiltradas.length) * 100 : 0;
  const gravidades = agrupar(ordensFiltradas, (ordem) => ordem.gravidade);
  const status = agrupar(ordensFiltradas, (ordem) => ordem.status);
  const contagemGravidade = (nome: string) =>
    gravidades.find((item) => item.nome === nome)?.total ?? 0;
  const ordensAlta = contagemGravidade("Alta");
  const anosComFiltro = useMemo(
    () =>
      [
        ...new Set(
          ordensSemFiltroAno
            .map((ordem) => obterPeriodoOS(ordem.data)?.ano)
            .filter((ano): ano is number => ano !== undefined),
        ),
      ].sort((a, b) => b - a),
    [ordensSemFiltroAno],
  );
  const anosTendencia =
    filtros.ano === "todos"
      ? anosComFiltro.slice(0, 5).sort((a, b) => a - b)
      : [Number(filtros.ano)];
  const mesNomeSelecionado =
    filtros.mes === "todos" ? "" : (MESES[Number(filtros.mes) - 1] ?? "Mês selecionado");
  const mesesTendencia =
    filtros.mes === "todos"
      ? MESES.map((nome, indice) => ({ nome, indice }))
      : [{ nome: mesNomeSelecionado, indice: Number(filtros.mes) - 1 }];
  const tendenciaMensal = mesesTendencia.map(({ nome, indice }) => {
    const ponto: Record<string, string | number> = { mes: nome.slice(0, 3) };
    for (const ano of anosTendencia) {
      ponto[String(ano)] = ordensSemFiltroAno.filter((ordem) => {
        const periodo = obterPeriodoOS(ordem.data);
        return periodo?.ano === ano && periodo.mes === indice + 1;
      }).length;
    }
    return ponto;
  });
  const totaisAnuais = anosComFiltro.map((ano) => ({
    ano,
    total: ordensSemFiltroAno.filter((ordem) => obterPeriodoOS(ordem.data)?.ano === ano).length,
  }));
  const anoBase = filtros.ano === "todos" ? (anosComFiltro[0] ?? null) : Number(filtros.ano);
  const totalAnoBase =
    anoBase === null ? 0 : (totaisAnuais.find((item) => item.ano === anoBase)?.total ?? 0);
  const totalAnoAnterior =
    anoBase === null ? undefined : totaisAnuais.find((item) => item.ano === anoBase - 1)?.total;
  const variacaoAnual =
    totalAnoAnterior && totalAnoAnterior > 0
      ? ((totalAnoBase - totalAnoAnterior) / totalAnoAnterior) * 100
      : null;
  const lojasSemOcorrencias = lojasComContagem.filter((loja) => loja.total === 0);
  const registrosSemData = ordensDemaisFiltros.filter(
    (ordem) => !obterPeriodoOS(ordem.data),
  ).length;
  const registrosSemLoja = ordensFiltradas.filter((ordem) => !ordem.loja.trim()).length;
  const registrosSemTipo = ordensFiltradas.filter((ordem) => !ordem.ocorrencia.trim()).length;
  const registrosSemSetor = ordensFiltradas.filter((ordem) => !ordem.setor.trim()).length;
  const semAnexos = ordensFiltradas.filter(
    (ordem) => !ordem.printNome && !ordem.anexosNomes?.length && !ordem.bo && !ordem.reserva,
  ).length;
  const lojaMaisOcorrencias = lojasComparacaoComOcorrencias[0];
  const lojaMenosOcorrencias = lojasComparacaoComOcorrencias.at(-1);
  const tipoMaisFrequente = tipos[0];
  const statusMaisComum = [...status].sort((a, b) => b.total - a.total)[0];

  const descricaoPeriodo =
    [
      filtros.ano !== "todos" ? filtros.ano : "",
      filtros.mes !== "todos" ? mesNomeSelecionado : "",
      filtros.loja !== "todas" ? filtros.loja : "",
      filtros.tipo !== "todos" ? filtros.tipo : "",
      filtros.setor !== "todos" ? filtros.setor : "",
      filtros.gravidade !== "todas" ? `Gravidade ${filtros.gravidade}` : "",
      filtros.status !== "todos" ? filtros.status : "",
      filtros.boletim !== "todos"
        ? `BO ${filtros.boletim === "sim" ? "vinculado" : "não vinculado"}`
        : "",
      filtros.reserva !== "todos"
        ? `Reserva ${filtros.reserva === "sim" ? "vinculada" : "não vinculada"}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ") || "Todo o histórico";
  const semDados = ordensFiltradas.length === 0;
  const filtrosPadrao: FiltrosOcorrencias = {
    ano: "todos",
    mes: "todos",
    loja: "todas",
    tipo: "todos",
    setor: "todos",
    gravidade: "todas",
    status: "todos",
    boletim: "todos",
    reserva: "todos",
  };
  const possuiFiltrosAtivos = Object.keys(filtrosPadrao).some(
    (chave) =>
      filtros[chave as keyof FiltrosOcorrencias] !==
      filtrosPadrao[chave as keyof FiltrosOcorrencias],
  );
  const alterarFiltro = (chave: keyof FiltrosOcorrencias, valor: string) =>
    setFiltros((atuais) => ({ ...atuais, [chave]: valor }));
  const configuracoesFiltro: {
    chave: keyof FiltrosOcorrencias;
    id: string;
    titulo: string;
    valor: string;
    opcoes: OpcaoFiltro[];
  }[] = [
    {
      chave: "ano",
      id: "filtro-ano-ocorrencias",
      titulo: "Ano",
      valor: filtros.ano,
      opcoes: [
        { valor: "todos", rotulo: "Todos os anos" },
        ...anos.map((ano) => ({ valor: String(ano), rotulo: String(ano) })),
      ],
    },
    {
      chave: "mes",
      id: "filtro-mes-ocorrencias",
      titulo: "Mês",
      valor: filtros.mes,
      opcoes: [
        { valor: "todos", rotulo: "Todos os meses" },
        ...MESES.map((mes, indice) => ({ valor: String(indice + 1), rotulo: mes })),
      ],
    },
    {
      chave: "loja",
      id: "filtro-loja-ocorrencias",
      titulo: "Loja",
      valor: filtros.loja,
      opcoes: [{ valor: "todas", rotulo: "Todas as lojas" }, ...lojasFiltro],
    },
    {
      chave: "tipo",
      id: "filtro-tipo-ocorrencias",
      titulo: "Tipo de ocorrência",
      valor: filtros.tipo,
      opcoes: [
        { valor: "todos", rotulo: "Todos os tipos" },
        ...tiposDisponiveis.map((tipo) => ({ valor: tipo, rotulo: tipo })),
      ],
    },
    {
      chave: "setor",
      id: "filtro-setor-ocorrencias",
      titulo: "Setor",
      valor: filtros.setor,
      opcoes: [
        { valor: "todos", rotulo: "Todos os setores" },
        ...setoresDisponiveis.map((setor) => ({ valor: setor, rotulo: setor })),
      ],
    },
    {
      chave: "gravidade",
      id: "filtro-gravidade-ocorrencias",
      titulo: "Gravidade",
      valor: filtros.gravidade,
      opcoes: [
        { valor: "todas", rotulo: "Todas as gravidades" },
        ...["Alta", "Média", "Baixa"].map((gravidade) => ({
          valor: gravidade,
          rotulo: gravidade,
        })),
      ],
    },
    {
      chave: "status",
      id: "filtro-status-ocorrencias",
      titulo: "Status da OS",
      valor: filtros.status,
      opcoes: [
        { valor: "todos", rotulo: "Todos os status" },
        ...["Aguardando Imagens", "Em Análise", "Concluída"].map((status) => ({
          valor: status,
          rotulo: status,
        })),
      ],
    },
    {
      chave: "boletim",
      id: "filtro-bo-ocorrencias",
      titulo: "Registro em delegacia",
      valor: filtros.boletim,
      opcoes: [
        { valor: "todos", rotulo: "Com e sem BO" },
        { valor: "sim", rotulo: "Com BO" },
        { valor: "nao", rotulo: "Sem BO" },
      ],
    },
    {
      chave: "reserva",
      id: "filtro-reserva-ocorrencias",
      titulo: "Reserva de imagens",
      valor: filtros.reserva,
      opcoes: [
        { valor: "todos", rotulo: "Com e sem reserva" },
        { valor: "sim", rotulo: "Com reserva" },
        { valor: "nao", rotulo: "Sem reserva" },
      ],
    },
  ];

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <ChartNoAxesCombined className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Painel de ocorrências</h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Distribuição por unidade, natureza, gravidade, setor, situação e registros policiais,
            com base nas Ordens de Serviço cadastradas.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/ordens">
            <ClipboardList />
            Ordens de Serviço
          </Link>
        </Button>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Filtros da análise</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Os indicadores e gráficos são recalculados conforme os critérios selecionados.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {numero.format(ordensFiltradas.length)} de {numero.format(ordens.length)} OS
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!possuiFiltrosAtivos}
              onClick={() => setFiltros(filtrosPadrao)}
            >
              <X /> Limpar filtros
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {configuracoesFiltro.map((campo) => (
            <CampoFiltro
              key={campo.chave}
              id={campo.id}
              titulo={campo.titulo}
              valor={campo.valor}
              opcoes={campo.opcoes}
              aoAlterar={(valor) => alterarFiltro(campo.chave, valor)}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Cartao
          titulo="Ocorrências registradas"
          valor={numero.format(ordensFiltradas.length)}
          detalhe={descricaoPeriodo}
          icon={ClipboardList}
        />
        <Cartao
          titulo="Com registro de BO"
          valor={numero.format(ordensComBO)}
          detalhe={`${percentual.format(percentualBO)}% das OS do período`}
          icon={FileCheck2}
          cor="text-info"
        />
        <Cartao
          titulo="Com reserva de imagens"
          valor={numero.format(ordensComReserva)}
          detalhe="OS com número de reserva CFTV vinculado"
          icon={FileText}
          cor="text-info"
        />
        <Cartao
          titulo="Gravidade alta"
          valor={numero.format(ordensAlta)}
          detalhe={`${ordensFiltradas.length ? percentual.format((ordensAlta / ordensFiltradas.length) * 100) : "0"}% das ocorrências`}
          icon={ShieldAlert}
          cor="text-destructive"
        />
        <Cartao
          titulo="Lojas impactadas"
          valor={`${numero.format(lojasComOcorrencias.length)} / ${numero.format(lojasComContagem.length)}`}
          detalhe={`${numero.format(lojasSemOcorrencias.length)} sem ocorrência no período`}
          icon={Building2}
          cor="text-warning"
        />
        <Cartao
          titulo="Variação anual"
          valor={
            variacaoAnual === null
              ? "—"
              : `${variacaoAnual > 0 ? "+" : ""}${percentual.format(variacaoAnual)}%`
          }
          detalhe={
            anoBase !== null && totalAnoAnterior !== undefined
              ? `${anoBase} comparado a ${anoBase - 1}`
              : "Sem ano anterior comparável"
          }
          icon={variacaoAnual !== null && variacaoAnual > 0 ? ArrowUpRight : ArrowDownRight}
          cor={variacaoAnual !== null && variacaoAnual > 0 ? "text-destructive" : "text-success"}
        />
      </div>

      <Painel
        titulo="Resumo do período"
        descricao="Principais sinais observados conforme os filtros selecionados."
      >
        {semDados ? (
          <p className="text-sm text-muted-foreground">
            Não há Ordens de Serviço cadastradas para o período selecionado.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <p className="rounded-lg bg-secondary/50 p-3 text-sm">
              <strong>Unidade com maior volume:</strong>{" "}
              {lojaMaisOcorrencias
                ? `${lojaMaisOcorrencias.nome}, com ${numero.format(lojaMaisOcorrencias.total)} ocorrência(s), entre as lojas comparáveis.`
                : "Não há unidade com ocorrências."}
            </p>
            <p className="rounded-lg bg-secondary/50 p-3 text-sm">
              <strong>Unidade com menor volume:</strong>{" "}
              {lojaMenosOcorrencias
                ? `${lojaMenosOcorrencias.nome}, com ${numero.format(lojaMenosOcorrencias.total)} ocorrência(s), entre as lojas comparáveis.`
                : "Não há unidades com ocorrências."}
            </p>
            <p className="rounded-lg bg-secondary/50 p-3 text-sm">
              <strong>Natureza mais frequente:</strong>{" "}
              {tipoMaisFrequente
                ? `${tipoMaisFrequente.nome}, com ${numero.format(tipoMaisFrequente.total)} registro(s).`
                : "Não identificada."}
            </p>
            <p className="rounded-lg bg-secondary/50 p-3 text-sm">
              <strong>Situação predominante:</strong>{" "}
              {statusMaisComum
                ? `${statusMaisComum.nome}, com ${numero.format(statusMaisComum.total)} OS.`
                : "Não identificada."}
            </p>
          </div>
        )}
      </Painel>

      {!semDados && (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Painel
              titulo="Evolução mensal das ocorrências"
              descricao={
                filtros.ano === "todos"
                  ? filtros.mes === "todos"
                    ? `Comparação mensal dos ${anosTendencia.length} anos mais recentes com os demais filtros selecionados.`
                    : `Ocorrências em ${mesNomeSelecionado} nos anos comparáveis.`
                  : filtros.mes === "todos"
                    ? `Quantidade por mês em ${filtros.ano}, conforme os demais filtros selecionados.`
                    : `Ocorrências em ${mesNomeSelecionado} de ${filtros.ano}, conforme os demais filtros.`
              }
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={tendenciaMensal}
                  margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={38} />
                  <Tooltip
                    formatter={(valor) => [numero.format(Number(valor)), "Ocorrências"]}
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      borderColor: "var(--border)",
                      borderRadius: 12,
                    }}
                  />
                  <Legend />
                  {anosTendencia.map((ano, indice) => (
                    <Line
                      key={ano}
                      type="monotone"
                      dataKey={String(ano)}
                      name={String(ano)}
                      stroke={CORES_GRAFICO[indice % CORES_GRAFICO.length]}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Painel>

            <Painel
              titulo="Lojas com maior número de ocorrências"
              descricao="Comparação entre as lojas, mantendo os demais filtros e desconsiderando apenas a loja selecionada."
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={totaisPorLoja}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={112}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(valor) => [numero.format(Number(valor)), "Ocorrências"]}
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      borderColor: "var(--border)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="total" name="Ocorrências" fill="#1689f8" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Painel>

            <Painel
              titulo="Naturezas mais frequentes"
              descricao="Classificação padronizada por palavras-chave do tipo de ocorrência informado."
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={tipos}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={160}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(valor) => [numero.format(Number(valor)), "Ocorrências"]}
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      borderColor: "var(--border)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="total" name="Ocorrências" fill="#8b5cf6" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-2 text-xs text-muted-foreground">
                Tipos sem correspondência são mantidos com a descrição original; confira a OS para
                validar a classificação.
              </p>
            </Painel>

            <Painel
              titulo="Distribuição por setor"
              descricao="Setores com maior concentração de registros no período."
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={setores}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={130}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(valor) => [numero.format(Number(valor)), "Ocorrências"]}
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      borderColor: "var(--border)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="total" name="Ocorrências" fill="#14b8a6" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Painel>

            <BlocoDistribuicao
              titulo="Ocorrências por gravidade"
              dados={["Alta", "Média", "Baixa"].map((nome) => ({
                nome,
                total: contagemGravidade(nome),
              }))}
              cores={COR_GRAVIDADE}
              icon={AlertTriangle}
            />

            <BlocoDistribuicao
              titulo="Ordens por situação"
              dados={["Aguardando Imagens", "Em Análise", "Concluída"].map((nome) => ({
                nome,
                total: status.find((item) => item.nome === nome)?.total ?? 0,
              }))}
              cores={COR_STATUS}
              icon={ListChecks}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Painel
              titulo="Unidades com mais ocorrências"
              descricao={`Ranking das lojas com maior volume — ${descricaoPeriodo.toLocaleLowerCase("pt-BR")}.`}
            >
              <div className="space-y-2">
                {lojasComparacaoComOcorrencias.slice(0, 5).map((loja, indice) => (
                  <div
                    key={loja.nome}
                    className="flex items-center justify-between gap-3 rounded-lg bg-secondary/50 p-3"
                  >
                    <span className="flex min-w-0 items-center gap-3 text-sm">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">
                        {indice + 1}
                      </span>
                      <span className="truncate">{loja.nome}</span>
                    </span>
                    <span className="font-mono text-sm font-semibold">
                      {numero.format(loja.total)}
                    </span>
                  </div>
                ))}
                {lojasComparacaoComOcorrencias.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma loja com ocorrência no período.
                  </p>
                )}
              </div>
            </Painel>

            <Painel
              titulo="Unidades com menos ocorrências"
              descricao="Comparação entre as lojas; as demais seleções são aplicadas, exceto a loja."
            >
              <div className="space-y-2">
                {[...lojasParaComparacao]
                  .sort((a, b) => a.total - b.total || a.nome.localeCompare(b.nome, "pt-BR"))
                  .slice(0, 5)
                  .map((loja, indice) => (
                    <div
                      key={loja.nome}
                      className="flex items-center justify-between gap-3 rounded-lg bg-secondary/50 p-3"
                    >
                      <span className="flex min-w-0 items-center gap-3 text-sm">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success/15 font-mono text-xs font-semibold text-success">
                          {indice + 1}
                        </span>
                        <span className="truncate">{loja.nome}</span>
                      </span>
                      <span className="font-mono text-sm font-semibold">
                        {numero.format(loja.total)}
                      </span>
                    </div>
                  ))}
              </div>
            </Painel>
          </div>
        </>
      )}

      <Painel
        titulo="Completude e interpretação dos registros"
        descricao="Indicadores de qualidade da base completa. Os dados ausentes não são estimados."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ItemQualidade
            titulo="Sem boletim vinculado"
            total={ordensFiltradas.length - ordensComBO}
            descricao="OS sem registro de BO estruturado ou identificado explicitamente no OCR."
            icon={FileText}
          />
          <ItemQualidade
            titulo="Sem data reconhecível"
            total={registrosSemData}
            descricao="Registros compatíveis com os filtros, exceto o ano e o mês."
            icon={CalendarDays}
          />
          <ItemQualidade
            titulo="Sem tipo de ocorrência"
            total={registrosSemTipo}
            descricao="Registros do período sem natureza preenchida."
            icon={Activity}
          />
          <ItemQualidade
            titulo="Sem loja informada"
            total={registrosSemLoja}
            descricao="Registros do período sem unidade identificada."
            icon={Building2}
          />
          <ItemQualidade
            titulo="Sem setor informado"
            total={registrosSemSetor}
            descricao="Registros do período sem setor preenchido."
            icon={MapPin}
          />
          <ItemQualidade
            titulo="Sem anexo ou vínculo"
            total={semAnexos}
            descricao="Sem print, anexo listado, boletim ou reserva de imagem."
            icon={FileText}
          />
          <ItemQualidade
            titulo="Lojas cadastradas"
            total={lojas.length}
            descricao="Unidades disponíveis no cadastro do sistema."
            icon={Building2}
          />
          <ItemQualidade
            titulo="OS aguardando imagens"
            total={status.find((item) => item.nome === "Aguardando Imagens")?.total ?? 0}
            descricao="Volume pendente de imagens no período selecionado."
            icon={AlertTriangle}
          />
          <ItemQualidade
            titulo="OS concluídas"
            total={status.find((item) => item.nome === "Concluída")?.total ?? 0}
            descricao="Ordens com status concluído no período selecionado."
            icon={FileCheck2}
          />
        </div>
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          A contagem de registro em delegacia considera boletins vinculados à OS ou referências
          explícitas a Boletim de Ocorrência no texto OCR. A simples menção a uma delegacia como
          órgão solicitante não é contabilizada como boletim registrado.
        </p>
      </Painel>

      <p className="text-xs text-muted-foreground">
        A variação anual compara a quantidade de OS do período mais recente disponível com o ano
        anterior. O gráfico mensal exibe os cinco anos mais recentes. Os rankings incluem somente
        lojas cadastradas e unidades já encontradas nas OS.
      </p>
    </section>
  );
}

function agrupar(ordens: OS[], obterNome: (ordem: OS) => string) {
  const contagens = new Map<string, { nome: string; total: number }>();
  for (const ordem of ordens) {
    const nome = obterNome(ordem).trim() || "Não informado";
    const chave = nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
    const atual = contagens.get(chave);
    contagens.set(chave, { nome: atual?.nome ?? nome, total: (atual?.total ?? 0) + 1 });
  }
  return [...contagens.values()].sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));
}

function ItemQualidade({
  titulo,
  total,
  descricao,
  icon: Icon,
}: {
  titulo: string;
  total: number;
  descricao: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{titulo}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-2 font-mono text-xl font-semibold">{numero.format(total)}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{descricao}</p>
    </div>
  );
}
