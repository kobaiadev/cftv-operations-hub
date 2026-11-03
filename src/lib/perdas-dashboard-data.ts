import type { Loja, Perda } from "@/lib/cadastro-store";

export type FiltroAnoPerdas = string;
export type PontoGraficoPerdas = Record<string, string | number>;
export type LojaAgrupada = { chave: string; nome: string; ids: string[] };

function normalizarNomeLoja(nome: string): string {
  const normalizado = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
  const lojaNumerica = normalizado.match(/^loja\s*0*(\d+)$/);
  if (lojaNumerica?.[1]) return `loja-${Number(lojaNumerica[1])}`;
  return normalizado.replace(/[^a-z0-9]/g, "");
}

function nomeCanonicoLoja(nome: string): string {
  const normalizado = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const lojaNumerica = normalizado.match(/^loja\s*0*(\d+)$/i);
  if (lojaNumerica?.[1]) return `Loja ${Number(lojaNumerica[1])}`;
  return nome.trim().replace(/\s+/g, " ");
}

export function agruparLojas(lojas: Loja[]): LojaAgrupada[] {
  const grupos = new Map<string, LojaAgrupada>();
  for (const loja of lojas) {
    const chave = normalizarNomeLoja(loja.nome);
    if (!chave) continue;
    const grupo = grupos.get(chave);
    if (grupo) {
      grupo.ids.push(loja.id);
    } else {
      grupos.set(chave, {
        chave,
        nome: nomeCanonicoLoja(loja.nome),
        ids: [loja.id],
      });
    }
  }
  return [...grupos.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function unificarPerdasPorLoja(perdas: Perda[], lojas: Loja[]): Perda[] {
  const chavePorId = new Map(
    agruparLojas(lojas).flatMap((loja) => loja.ids.map((id) => [id, loja.chave] as const)),
  );
  return perdas.map((perda) => ({
    ...perda,
    lojaId: chavePorId.get(perda.lojaId) ?? perda.lojaId,
  }));
}

export function obterLojasParaGrafico(
  perdas: Perda[],
  lojaSelecionada: string,
  anoSelecionado: FiltroAnoPerdas,
): string[] {
  const perdasDoAno = perdas.filter(
    (perda) => anoSelecionado === "todos" || perda.ano === Number(anoSelecionado),
  );

  if (lojaSelecionada !== "todas") {
    return perdasDoAno.some((perda) => perda.lojaId === lojaSelecionada) ? [lojaSelecionada] : [];
  }

  const totaisPorLoja = new Map<string, number>();
  for (const perda of perdasDoAno) {
    totaisPorLoja.set(perda.lojaId, (totaisPorLoja.get(perda.lojaId) ?? 0) + perda.valor);
  }
  return [...totaisPorLoja.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([lojaId]) => lojaId);
}

export function criarDadosComparativoLojas(
  perdas: Perda[],
  lojasParaGrafico: string[],
  anos: number[],
  nomePorLoja: Map<string, string>,
): PontoGraficoPerdas[] {
  return lojasParaGrafico.map((lojaId) => {
    const ponto: PontoGraficoPerdas = {
      loja: nomePorLoja.get(lojaId) ?? "Loja removida",
    };
    for (const ano of anos) {
      ponto[String(ano)] = perdas
        .filter((perda) => perda.lojaId === lojaId && perda.ano === ano)
        .reduce((soma, perda) => soma + perda.valor, 0);
    }
    return ponto;
  });
}

export function criarDadosParticipacao(
  perdas: Perda[],
  anos: number[],
  lojaSelecionada: string,
): { lojas: string[]; dados: PontoGraficoPerdas[] } {
  const anosSelecionados = new Set(anos);
  const totaisPorAnoELoja = new Map<number, Map<string, number>>();
  const totaisAcumulados = new Map<string, number>();

  for (const perda of perdas) {
    if (!anosSelecionados.has(perda.ano)) continue;
    const totaisPorLoja = totaisPorAnoELoja.get(perda.ano) ?? new Map<string, number>();
    totaisPorLoja.set(perda.lojaId, (totaisPorLoja.get(perda.lojaId) ?? 0) + perda.valor);
    totaisPorAnoELoja.set(perda.ano, totaisPorLoja);
    totaisAcumulados.set(perda.lojaId, (totaisAcumulados.get(perda.lojaId) ?? 0) + perda.valor);
  }

  const lojas = [...totaisAcumulados.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([lojaId]) => lojaId);

  if (lojaSelecionada !== "todas" && totaisAcumulados.has(lojaSelecionada)) {
    if (!lojas.includes(lojaSelecionada)) lojas[lojas.length - 1] = lojaSelecionada;
  }

  const dados = anos.map((ano) => {
    const totaisPorLoja = totaisPorAnoELoja.get(ano) ?? new Map<string, number>();
    const totalAnual = [...totaisPorLoja.values()].reduce((soma, valor) => soma + valor, 0);
    const ponto: PontoGraficoPerdas = { ano };
    let demais = 0;

    for (const [lojaId, valor] of totaisPorLoja) {
      if (totalAnual === 0) continue;
      const percentual = (valor / totalAnual) * 100;
      if (lojas.includes(lojaId)) ponto[lojaId] = percentual;
      else demais += percentual;
    }

    ponto["demais"] = demais;
    return ponto;
  });

  return { lojas, dados };
}
