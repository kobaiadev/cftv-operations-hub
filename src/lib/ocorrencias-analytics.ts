import type { Loja } from "@/lib/cadastro-store";
import type { OS } from "@/lib/os-store";

export const MESES = [
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
] as const;

export type PeriodoOS = { ano: number; mes: number };
export type Contagem = { nome: string; total: number };
export type FiltrosOcorrencias = {
  ano: string;
  mes: string;
  loja: string;
  tipo: string;
  setor: string;
  gravidade: string;
  status: string;
  boletim: string;
  reserva: string;
};

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]/g, "");

export function obterPeriodoOS(data: string): PeriodoOS | null {
  const brasileira = data.match(/(?:^|\D)(\d{2})\/(\d{2})\/(\d{4})(?:\D|$)/);
  const iso = data.match(/(?:^|\D)(\d{4})-(\d{2})-(\d{2})(?:\D|$)/);
  const dia = brasileira ? Number(brasileira[1]) : iso ? Number(iso[3]) : 0;
  const mes = brasileira ? Number(brasileira[2]) : iso ? Number(iso[2]) : 0;
  const ano = brasileira ? Number(brasileira[3]) : iso ? Number(iso[1]) : 0;
  if (!ano || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const dataValida = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    dataValida.getUTCFullYear() !== ano ||
    dataValida.getUTCMonth() !== mes - 1 ||
    dataValida.getUTCDate() !== dia
  ) {
    return null;
  }
  return { ano, mes };
}

export function classificarTipoOcorrencia(tipo: string): string {
  const chave = normalizar(tipo);
  if (!chave) return "Não informado";
  const classificacoes: [RegExp, string][] = [
    [/furto/, "Furto"],
    [/roubo/, "Roubo"],
    [/sangria/, "Divergência de sangria"],
    [/(?:nota fiscal|falta.*nota)/, "Falta em nota fiscal"],
    [/violacao/, "Violação de embalagem"],
    [/avaria/, "Avaria de mercadoria"],
    [/quebra/, "Quebra de mercadoria"],
    [/inventario/, "Divergência de inventário"],
    [/agress/, "Agressão"],
    [/ameaca/, "Ameaça"],
    [/fraude|estelionato/, "Fraude"],
    [/acidente/, "Acidente"],
  ];
  return classificacoes.find(([regra]) => regra.test(chave))?.[1] ?? tipo.trim();
}

export function possuiRegistroDelegacia(os: OS): boolean {
  const boletim = os.bo;
  if (boletim && [boletim.numero, boletim.delegacia, boletim.data].some((valor) => valor.trim())) {
    return true;
  }
  const textoOcr = (os.dadosAdicionais ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return /\b(?:boletim de ocorrencia|numero do bo|n[ºo]\s*(?:do\s*)?bo)\b/i.test(textoOcr);
}

export function filtrarOrdens(
  ordens: OS[],
  filtros: FiltrosOcorrencias,
  ignorar?: keyof FiltrosOcorrencias,
): OS[] {
  return ordens.filter((ordem) => {
    const periodo = obterPeriodoOS(ordem.data);
    if (ignorar !== "ano" && filtros.ano !== "todos" && periodo?.ano !== Number(filtros.ano)) {
      return false;
    }
    if (ignorar !== "mes" && filtros.mes !== "todos" && periodo?.mes !== Number(filtros.mes)) {
      return false;
    }
    if (
      ignorar !== "loja" &&
      filtros.loja !== "todas" &&
      normalizar(ordem.loja.trim() || "Não informada") !== normalizar(filtros.loja)
    ) {
      return false;
    }
    if (
      ignorar !== "tipo" &&
      filtros.tipo !== "todos" &&
      normalizar(classificarTipoOcorrencia(ordem.ocorrencia)) !== normalizar(filtros.tipo)
    ) {
      return false;
    }
    if (
      ignorar !== "setor" &&
      filtros.setor !== "todos" &&
      normalizar(ordem.setor.trim() || "Não informado") !== normalizar(filtros.setor)
    ) {
      return false;
    }
    if (
      ignorar !== "gravidade" &&
      filtros.gravidade !== "todas" &&
      normalizar(ordem.gravidade) !== normalizar(filtros.gravidade)
    ) {
      return false;
    }
    if (
      ignorar !== "status" &&
      filtros.status !== "todos" &&
      normalizar(ordem.status) !== normalizar(filtros.status)
    ) {
      return false;
    }
    if (ignorar !== "boletim" && filtros.boletim !== "todos") {
      if (possuiRegistroDelegacia(ordem) !== (filtros.boletim === "sim")) return false;
    }
    if (ignorar !== "reserva" && filtros.reserva !== "todos") {
      const possuiReserva = Boolean(ordem.reserva?.numero.trim());
      if (possuiReserva !== (filtros.reserva === "sim")) return false;
    }
    return true;
  });
}

export function contarPor(
  ordens: OS[],
  chave: (ordem: OS) => string,
  quantidade = Number.MAX_SAFE_INTEGER,
): Contagem[] {
  const contagens = new Map<string, { nome: string; total: number }>();
  for (const ordem of ordens) {
    const nome = chave(ordem).trim() || "Não informado";
    const chaveNormalizada = normalizar(nome);
    const atual = contagens.get(chaveNormalizada);
    contagens.set(chaveNormalizada, { nome: atual?.nome ?? nome, total: (atual?.total ?? 0) + 1 });
  }
  return [...contagens.values()]
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, quantidade);
}

export function listarLojasParaAnalise(ordens: OS[], lojas: Loja[]): Contagem[] {
  const nomes = new Map<string, string>();
  for (const loja of lojas) nomes.set(normalizar(loja.nome), loja.nome);
  for (const ordem of ordens) {
    const nome = ordem.loja.trim();
    if (!nome) continue;
    if (!nomes.has(normalizar(nome))) nomes.set(normalizar(nome), nome);
  }
  const contagens = new Map([...nomes].map(([chave, nome]) => [chave, { nome, total: 0 }]));
  for (const ordem of ordens) {
    const nome = ordem.loja.trim();
    if (!nome) continue;
    const chave = normalizar(nome);
    const atual = contagens.get(chave);
    if (atual) atual.total++;
  }
  return [...contagens.values()].sort(
    (a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"),
  );
}
