import type { Severity } from "@/lib/os-store";
import { formatarTextoFormal, limparTextoCapturado } from "@/lib/os-text";

export type OcrResult = {
  texto: string;
  data: string;
  loja: string;
  setor: string;
  ocorrencia: string;
  descricao: string;
  gravidade: Severity;
  reservaNumero: string;
};

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const OCORRENCIAS: { chave: string; rotulo: string; gravidade: Severity }[] = [
  { chave: "roubo", rotulo: "Roubo", gravidade: "Alta" },
  { chave: "furto", rotulo: "Furto", gravidade: "Alta" },
  { chave: "sangria", rotulo: "Divergência de sangria", gravidade: "Média" },
  { chave: "nota fiscal", rotulo: "Falta em nota fiscal", gravidade: "Alta" },
  { chave: "violacao", rotulo: "Violação de embalagem", gravidade: "Média" },
  { chave: "avaria", rotulo: "Avaria de mercadoria", gravidade: "Baixa" },
  { chave: "quebra", rotulo: "Quebra de mercadoria", gravidade: "Baixa" },
  { chave: "inventario", rotulo: "Divergência de inventário", gravidade: "Média" },
];

const SETORES = [
  "açougue",
  "acougue",
  "frente de caixa",
  "caixa",
  "bebidas",
  "perfumaria",
  "recebimento",
  "hortifruti",
  "padaria",
  "mercearia",
  "estacionamento",
  "deposito",
  "depósito",
];

/** Extrai campos de uma OS a partir do texto lido no print. */
export function interpretarTexto(texto: string, lojasCadastradas: string[]): OcrResult {
  texto = limparTextoCapturado(texto);
  const n = norm(texto);

  // Data dd/mm/aaaa (e hora opcional hh:mm)
  const mData = texto.match(/(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}))?/);
  const data = mData ? `${mData[1]}${mData[2] ? ` ${mData[2]}` : ""}` : "";

  // Número de reserva: "reserva 1234", "res. nº 1234", "reserva nº 1234"
  const mRes = n.match(/res(?:erva)?\.?\s*(?:n[ºo°.]*\s*)?(\d{3,})/);
  const reservaNumero = mRes?.[1] ?? "";

  // Loja: casa com nomes cadastrados ou padrão "loja 014"
  let loja = "";
  for (const l of lojasCadastradas) {
    if (n.includes(norm(l))) {
      loja = l;
      break;
    }
  }

  // Setor
  let setor = "";
  for (const s of SETORES) {
    if (n.includes(norm(s))) {
      setor = s
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
        .replace("Acougue", "Açougue")
        .replace("Deposito", "Depósito");
      break;
    }
  }

  // Ocorrência e gravidade por palavra-chave
  let ocorrencia = "";
  let gravidade: Severity = "Média";
  for (const o of OCORRENCIAS) {
    if (n.includes(o.chave)) {
      ocorrencia = o.rotulo;
      gravidade = o.gravidade;
      break;
    }
  }

  // Descrição: primeiras linhas úteis do texto
  const descricao = texto
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 12)
    .slice(0, 3)
    .join(" ")
    .slice(0, 300);

  return {
    texto,
    data,
    loja,
    setor,
    ocorrencia,
    descricao: formatarTextoFormal(descricao),
    gravidade,
    reservaNumero,
  };
}

export type BoResult = { numero: string; delegacia: string; data: string };

/** Extrai número do BO, delegacia e data a partir do texto de um Boletim de Ocorrência. */
export function interpretarBO(texto: string): BoResult {
  texto = limparTextoCapturado(texto);
  const n = norm(texto);
  const mNum =
    n.match(
      /(?:boletim de ocorrencia|b\.?\s?o\.?)\s*(?:n[ºo°.]*\s*|numero\s*)?[:-]?\s*([a-z]{0,3}\d[\d./-]{3,})/,
    ) ?? n.match(/n[ºo°]\s*[:-]?\s*(\d[\d./-]{3,})/);
  const numero = mNum?.[1]?.toUpperCase() ?? "";
  const linhaDp = texto
    .split(/\n+/)
    .map((l) => l.trim())
    .find((l) => /delegacia|distrito policial|\bd\.?p\.?\b/i.test(l));
  const delegacia = linhaDp ? limparTextoCapturado(linhaDp.slice(0, 120)) : "";
  const mData = texto.match(/(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}))?/);
  const data = mData ? `${mData[1]}${mData[2] ? ` ${mData[2]}` : ""}` : "";
  return { numero, delegacia, data };
}

/** Executa OCR em uma imagem (somente no navegador). */
export async function lerImagem(file: File, onProgress: (pct: number) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("por", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress(Math.round(m.progress * 100));
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
