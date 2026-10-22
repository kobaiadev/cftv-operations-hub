import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  CircleCheck,
  Store,
  TrendingUp,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Loja, Perda } from "@/lib/cadastro-store";

const NOMES_MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const CORES_ANO = ["#1689f8", "#1d318f", "#e56835", "#8b5cf6", "#14b8a6"];
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const milhar = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const percentual = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function Card({
  titulo,
  valor,
  legenda,
  icon: Icon,
  cor = "text-primary",
}: {
  titulo: string;
  valor: string;
  legenda: string;
  icon: typeof Store;
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
      <p className="mt-1 text-xs text-muted-foreground">{legenda}</p>
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

export function PerdasDashboard({ perdas, lojas }: { perdas: Perda[]; lojas: Loja[] }) {
  const [lojaSelecionada, setLojaSelecionada] = useState("todas");
  const [anoSelecionado, setAnoSelecionado] = useState("todos");
  const lojaPorId = useMemo(() => new Map(lojas.map((loja) => [loja.id, loja.nome])), [lojas]);
  const anos = useMemo(
    () => [...new Set(perdas.map((perda) => perda.ano))].sort((a, b) => a - b),
    [perdas],
  );
  const anosParaFiltro = anos.map(String);
  const perdasDaLoja = perdas.filter(
    (perda) => lojaSelecionada === "todas" || perda.lojaId === lojaSelecionada,
  );
  const perdasFiltradas = perdasDaLoja.filter(
    (perda) => anoSelecionado === "todos" || perda.ano === Number(anoSelecionado),
  );
  const total = perdasFiltradas.reduce((soma, perda) => soma + perda.valor, 0);
  const periodos = new Set(perdasFiltradas.map((perda) => `${perda.ano}-${perda.mes}`));
  const mediaMensal = periodos.size > 0 ? total / periodos.size : 0;
  const totalRede = perdas
    .filter((perda) => anoSelecionado === "todos" || perda.ano === Number(anoSelecionado))
    .reduce((soma, perda) => soma + perda.valor, 0);
  const impactoRede =
    lojaSelecionada === "todas" || totalRede === 0 ? 100 : (total / totalRede) * 100;

  const seriesAnos = useMemo(
    () => (anoSelecionado === "todos" ? anos : [Number(anoSelecionado)]),
    [anos, anoSelecionado],
  );
  const totaisAnuaisLoja = anos.map((ano) => ({
    ano,
    valor: perdasDaLoja
      .filter((perda) => perda.ano === ano)
      .reduce((soma, perda) => soma + perda.valor, 0),
  }));
  const anoAtual = anoSelecionado === "todos" ? seriesAnos.at(-1) : Number(anoSelecionado);
  const anoAnterior = anoAtual === undefined ? undefined : anoAtual - 1;
  const valorAnoAtual = totaisAnuaisLoja.find((item) => item.ano === anoAtual)?.valor ?? 0;
  const valorAnoAnterior = totaisAnuaisLoja.find((item) => item.ano === anoAnterior)?.valor;
  const variacao =
    valorAnoAnterior && valorAnoAnterior > 0
      ? ((valorAnoAtual - valorAnoAnterior) / valorAnoAnterior) * 100
      : null;
  const statusPerformance =
    variacao === null
      ? "Sem histórico comparável"
      : Math.abs(variacao) <= 10
        ? "Estável"
        : variacao < 0
          ? "Redução de perdas"
          : "Atenção";

  const totaisPorAno = anos.map((ano) => ({
    ano,
    total: perdasDaLoja
      .filter((perda) => perda.ano === ano)
      .reduce((soma, perda) => soma + perda.valor, 0),
  }));

  const dadosMensais = NOMES_MESES.map((mes, indice) => {
    const ponto: Record<string, string | number> = { mes };
    for (const ano of seriesAnos) {
      ponto[String(ano)] = perdasFiltradas
        .filter((perda) => perda.ano === ano && Number(perda.mes) === indice + 1)
        .reduce((soma, perda) => soma + perda.valor, 0);
    }
    return ponto;
  });

  const lojasParaGrafico = useMemo(() => {
    const acumulado = new Map<string, number>();
    for (const perda of perdas) {
      if (anoSelecionado !== "todos" && perda.ano !== Number(anoSelecionado)) continue;
      acumulado.set(perda.lojaId, (acumulado.get(perda.lojaId) ?? 0) + perda.valor);
    }
    return [...acumulado.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([lojaId]) => lojaId);
  }, [perdas, anoSelecionado]);

  const dadosPorLoja = lojasParaGrafico.map((lojaId) => {
    const ponto: Record<string, string | number> = {
      loja: lojaPorId.get(lojaId) ?? "Loja removida",
    };
    for (const ano of seriesAnos) {
      ponto[String(ano)] = perdas
        .filter((perda) => perda.lojaId === lojaId && perda.ano === ano)
        .reduce((soma, perda) => soma + perda.valor, 0);
    }
    return ponto;
  });

  const lojasParticipacao = useMemo(() => {
    const totais = new Map<string, number>();
    for (const perda of perdas)
      totais.set(perda.lojaId, (totais.get(perda.lojaId) ?? 0) + perda.valor);
    return [...totais.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([lojaId]) => lojaId);
  }, [perdas]);
  const dadosParticipacao = anos.map((ano) => {
    const dados: Record<string, number> = { ano };
    let demais = 0;
    const totalAnual = perdas
      .filter((perda) => perda.ano === ano)
      .reduce((soma, perda) => soma + perda.valor, 0);
    for (const perda of perdas.filter((item) => item.ano === ano)) {
      if (totalAnual === 0) continue;
      const chave = lojasParticipacao.includes(perda.lojaId) ? perda.lojaId : "demais";
      const valor = (perda.valor / totalAnual) * 100;
      if (chave === "demais") demais += valor;
      else dados[chave] = (dados[chave] ?? 0) + valor;
    }
    dados["demais"] = demais;
    return dados;
  });

  const dadosSemPerdas = perdas.length === 0;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <ChartNoAxesCombined className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Painel de perdas da rede</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare lojas, anos e meses. Os indicadores são atualizados pelos registros e pelas
            planilhas carregadas.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:w-auto sm:min-w-[340px] sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="filtro-loja-perdas"
              className="text-xs font-medium text-muted-foreground"
            >
              Loja selecionada
            </label>
            <Select value={lojaSelecionada} onValueChange={setLojaSelecionada}>
              <SelectTrigger id="filtro-loja-perdas" className="w-full">
                <SelectValue />
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
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="filtro-ano-perdas"
              className="text-xs font-medium text-muted-foreground"
            >
              Ano em análise
            </label>
            <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
              <SelectTrigger id="filtro-ano-perdas" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os anos</SelectItem>
                {anosParaFiltro.map((ano) => (
                  <SelectItem key={ano} value={ano}>
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {totaisPorAno.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {totaisPorAno.map((item, indice) => (
            <div
              key={item.ano}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-card"
            >
              <div
                className="h-1.5"
                style={{ backgroundColor: CORES_ANO[indice % CORES_ANO.length] }}
              />
              <div className="p-4">
                <p className="text-sm text-muted-foreground">Total em {item.ano}</p>
                <p className="mt-2 font-mono text-2xl font-semibold">{moeda.format(item.total)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lojaSelecionada === "todas" ? "Todas as lojas" : lojaPorId.get(lojaSelecionada)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card
          titulo="Perdas no período"
          valor={moeda.format(total)}
          legenda={`${perdasFiltradas.length} registros no filtro`}
          icon={TrendingUp}
        />
        <Card
          titulo="Média mensal"
          valor={moeda.format(mediaMensal)}
          legenda={`${periodos.size} meses com registro`}
          icon={ChartNoAxesCombined}
          cor="text-info"
        />
        <Card
          titulo="Impacto na rede"
          valor={`${percentual.format(impactoRede)}%`}
          legenda={
            lojaSelecionada === "todas" ? "Visão de toda a rede" : "Participação no total da rede"
          }
          icon={Store}
          cor="text-warning"
        />
        <Card
          titulo="Variação anual"
          valor={
            variacao === null ? "—" : `${variacao > 0 ? "+" : ""}${percentual.format(variacao)}%`
          }
          legenda={
            anoAnterior === undefined
              ? "Sem ano comparável"
              : `${anoAtual} comparado a ${anoAnterior}`
          }
          icon={variacao !== null && variacao > 0 ? ArrowUpRight : ArrowDownRight}
          cor={variacao !== null && variacao > 0 ? "text-destructive" : "text-success"}
        />
        <Card
          titulo="Desempenho"
          valor={statusPerformance}
          legenda="Estável quando a variação anual é de até 10%"
          icon={CircleCheck}
          cor={
            statusPerformance === "Estável" || statusPerformance === "Redução de perdas"
              ? "text-success"
              : "text-warning"
          }
        />
      </div>

      {dadosSemPerdas ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center">
          <FileSpreadsheetPlaceholder />
          <h3 className="mt-3 font-semibold">Aguardando dados de perdas</h3>
          <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
            Registre valores nesta página ou carregue uma planilha XLSX válida para visualizar
            comparações por loja, mês e ano.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Painel
              titulo="Comparativo anual por loja"
              descricao="As lojas com maior volume de perdas aparecem primeiro."
            >
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={dadosPorLoja} margin={{ top: 8, right: 12, bottom: 28, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="loja"
                    tickLine={false}
                    axisLine={false}
                    angle={-28}
                    textAnchor="end"
                    interval={0}
                    height={55}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(valor: number) => `${milhar.format(valor / 1000)} mil`}
                    width={66}
                  />
                  <Tooltip
                    formatter={(valor) => moeda.format(Number(valor))}
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      borderColor: "var(--border)",
                      borderRadius: 12,
                    }}
                  />
                  <Legend />
                  {seriesAnos.map((ano, indice) => (
                    <Bar
                      key={ano}
                      dataKey={String(ano)}
                      name={String(ano)}
                      fill={CORES_ANO[indice % CORES_ANO.length]}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={30}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Painel>

            <Painel
              titulo="Evolução mensal"
              descricao={`${lojaSelecionada === "todas" ? "Rede completa" : lojaPorId.get(lojaSelecionada)} · comparação dos anos disponíveis`}
            >
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={dadosMensais} margin={{ top: 10, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(valor: number) => `${milhar.format(valor / 1000)} mil`}
                    width={66}
                  />
                  <Tooltip
                    formatter={(valor) => moeda.format(Number(valor))}
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      borderColor: "var(--border)",
                      borderRadius: 12,
                    }}
                  />
                  <Legend />
                  {seriesAnos.map((ano, indice) => (
                    <Line
                      key={ano}
                      type="monotone"
                      dataKey={String(ano)}
                      name={String(ano)}
                      stroke={CORES_ANO[indice % CORES_ANO.length]}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Painel>

            <div className="xl:col-span-2">
              <Painel
                titulo="Participação das lojas no total anual"
                descricao="Distribuição percentual das perdas da rede em cada ano."
              >
                <ResponsiveContainer width="100%" height={Math.max(190, anos.length * 64)}>
                  <BarChart
                    data={dadosParticipacao}
                    layout="vertical"
                    margin={{ top: 8, right: 28, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="var(--border)"
                    />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(valor: number) => `${valor}%`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="ano"
                      tickLine={false}
                      axisLine={false}
                      width={50}
                    />
                    <Tooltip
                      formatter={(valor) => `${percentual.format(Number(valor))}%`}
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        borderColor: "var(--border)",
                        borderRadius: 12,
                      }}
                    />
                    <Legend />
                    {lojasParticipacao.map((lojaId, indice) => (
                      <Bar
                        key={lojaId}
                        dataKey={lojaId}
                        name={lojaPorId.get(lojaId) ?? "Loja removida"}
                        stackId="participacao"
                        fill={CORES_ANO[indice % CORES_ANO.length]}
                        maxBarSize={35}
                      />
                    ))}
                    <Bar
                      dataKey="demais"
                      name="Demais lojas"
                      stackId="participacao"
                      fill="#94a3b8"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={35}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Painel>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            A variação anual compara o ano analisado com o ano imediatamente anterior. O desempenho
            é considerado estável quando a variação absoluta não ultrapassa 10%; reduções são
            indicadas como redução de perdas.
          </p>
        </>
      )}
    </section>
  );
}

function FileSpreadsheetPlaceholder() {
  return (
    <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
      <ChartNoAxesCombined className="size-6" />
    </span>
  );
}
