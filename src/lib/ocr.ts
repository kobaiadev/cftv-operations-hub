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

const normalizarLoja = (t: string) =>
  norm(t)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function distanciaEdicao(a: string, b: string): number {
  const linha = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = linha[0] ?? 0;
    linha[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const acima = linha[j] ?? 0;
      linha[j] = Math.min(
        (linha[j] ?? 0) + 1,
        (linha[j - 1] ?? 0) + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = acima;
    }
  }
  return linha[b.length] ?? 0;
}

function localizarLoja(texto: string, lojasCadastradas: string[]): string {
  const linhasRotuladas = texto
    .split(/\n+/)
    .filter((linha) => /^\s*(?:(?:nome\s+da\s+)?loja|unidade)\s*[:#-]/i.test(linha))
    .map((linha) =>
      normalizarLoja(linha.replace(/.*?\b(?:loja|unidade)\b\s*(?:n[ºo.]?\s*)?[:#-]?\s*/i, "")),
    )
    .filter(Boolean);
  const textosBusca = linhasRotuladas.length ? linhasRotuladas : [normalizarLoja(texto)];

  const correspondenciasExatas = lojasCadastradas.filter((loja) => {
    const nome = normalizarLoja(loja);
    return textosBusca.some((linha) => ` ${linha} `.includes(` ${nome} `));
  });
  if (correspondenciasExatas.length === 1) return correspondenciasExatas[0] ?? "";
  if (correspondenciasExatas.length > 1 || !linhasRotuladas.length) return "";

  const candidatas = lojasCadastradas
    .map((loja) => {
      const nome = normalizarLoja(loja);
      const palavras = nome.split(" ");
      let melhor = 0;
      for (const linha of linhasRotuladas) {
        const tokens = linha.split(" ");
        const tamanhos = new Set([palavras.length - 1, palavras.length, palavras.length + 1]);
        for (const tamanho of tamanhos) {
          if (tamanho < 1) continue;
          for (let inicio = 0; inicio <= tokens.length - tamanho; inicio++) {
            const janela = tokens.slice(inicio, inicio + tamanho).join(" ");
            const distancia = distanciaEdicao(nome, janela);
            const similaridade = 1 - distancia / Math.max(nome.length, janela.length);
            melhor = Math.max(melhor, similaridade);
          }
        }
      }
      return { loja, similaridade: melhor };
    })
    .filter((candidata) => candidata.similaridade >= 0.9)
    .sort((a, b) => b.similaridade - a.similaridade);

  const melhorCandidata = candidatas[0];
  const segundaCandidata = candidatas[1];
  if (
    !melhorCandidata ||
    (segundaCandidata && melhorCandidata.similaridade - segundaCandidata.similaridade < 0.08)
  ) {
    return "";
  }
  return melhorCandidata.loja;
}

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
export function interpretarTexto(
  texto: string,
  lojasCadastradas: string[],
  textoComplementar = "",
): OcrResult {
  texto = limparTextoCapturado(texto);
  const n = norm(texto);
  const complementar = textoComplementar.trim()
    ? interpretarTexto(textoComplementar, lojasCadastradas)
    : undefined;

  // Data dd/mm/aaaa (e hora opcional hh:mm)
  const mData = texto.match(/(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}))?/);
  const data =
    (mData ? `${mData[1]}${mData[2] ? ` ${mData[2]}` : ""}` : "") || complementar?.data || "";

  // Chamado da solicitação de filmagem tem prioridade sobre outros números do print.
  const mChamado = texto.match(/\bchamado\s*[:#-]?\s*([A-Z0-9]+(?:[./-][A-Z0-9]+)*)/i);
  const mRes = n.match(/res(?:erva)?\.?\s*(?:n[ºo°.]*\s*)?(\d{3,})/);
  const reservaNumero = mChamado?.[1] ?? mRes?.[1] ?? "";

  const loja = localizarLoja(texto, lojasCadastradas) || complementar?.loja || "";

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
  if (!setor) setor = complementar?.setor ?? "";

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
  const ocorrenciaDeclarada = texto
    .match(/(?:tipo\s+de\s+ocorr[eê]ncia|ocorr[eê]ncia)\s*[:-]\s*([^\n;]+)/i)?.[1]
    ?.trim()
    .replace(/[.,!?]+$/, "");
  if (ocorrenciaDeclarada) {
    ocorrencia = ocorrenciaDeclarada;
    const gravidadeDeclarada = OCORRENCIAS.find((item) =>
      norm(ocorrenciaDeclarada).includes(item.chave),
    );
    if (gravidadeDeclarada) gravidade = gravidadeDeclarada.gravidade;
  }
  if (!ocorrencia && complementar?.ocorrencia) {
    ocorrencia = complementar.ocorrencia;
    gravidade = complementar.gravidade;
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
    reservaNumero: reservaNumero || complementar?.reservaNumero || "",
  };
}

export type BoResult = { numero: string; delegacia: string; data: string };

function interpretarBOIndividual(texto: string, permitirDataSemRotulo = true): BoResult {
  texto = limparTextoCapturado(texto);
  const n = norm(texto);
  const mNum =
    n.match(
      /(?:boletim de ocorrencia|b\.?\s?o\.?)\s*(?:n[ºo°.]*\s*|numero\s*)?[:-]?\s*([a-z]{0,3}\d[\d./-]{3,})/,
    ) ??
    n.match(
      /(?:numero|n[ºo°])\s*(?:do\s*)?(?:b\.?\s?o\.?|boletim(?: de ocorrencia)?)\s*[:-]?\s*([a-z]{0,3}\d[\d./-]{3,})/,
    ) ??
    n.match(/n[ºo°]\s*[:-]?\s*(\d[\d./-]{3,})/);
  const numero = mNum?.[1]?.toUpperCase() ?? "";
  const linhaDp = texto
    .split(/\n+/)
    .map((l) => l.trim())
    .find((l) => /delegacia|distrito policial|\bd\.?p\.?\b/i.test(l));
  const delegacia = linhaDp
    ? limparTextoCapturado(
        linhaDp
          .replace(/^(?:delegacia(?: de polícia)?|distrito policial)\s*:\s*/i, "")
          .slice(0, 120),
      )
    : "";
  const linhas = texto.split(/\n+/).map((l) => l.trim());
  const registroNormalizado = norm(texto).match(
    /\b(?:data\s+(?:(?:do|de)\s+)?registro|registro(?:\s+do\s+bo)?|registrad[oa]\s+em)\b[\s\S]{0,100}?(\d{2}[./-]\d{2}[./-]\d{4}|\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?/,
  );
  const linhaRegistro = linhas.find((l) =>
    /data.{0,20}registro|registro.{0,20}data/i.test(norm(l)),
  );
  const mData =
    registroNormalizado ??
    linhaRegistro?.match(/(\d{2}[./-]\d{2}[./-]\d{4})(?:\s+(\d{2}:\d{2}))?/) ??
    (permitirDataSemRotulo
      ? texto.match(/(\d{2}[./-]\d{2}[./-]\d{4})(?:\s+(\d{2}:\d{2}))?/)
      : null);
  const dataBruta = mData?.[1] ?? "";
  const dataFormatada = /^\d{4}-\d{2}-\d{2}$/.test(dataBruta)
    ? `${dataBruta.slice(8, 10)}/${dataBruta.slice(5, 7)}/${dataBruta.slice(0, 4)}`
    : dataBruta.replace(/[.-]/g, "/");
  const data = `${dataFormatada}${mData?.[2] ? ` ${mData[2]}` : ""}`;
  return { numero, delegacia, data };
}

/** Extrai dados do BO, completando campos ausentes com os textos das demais imagens. */
export function interpretarBO(texto: string, textosComplementares: string[] = []): BoResult {
  const resultados = [
    ...(texto.trim() ? [interpretarBOIndividual(texto)] : []),
    ...textosComplementares
      .filter((conteudo) => conteudo.trim())
      .map((conteudo) => interpretarBOIndividual(conteudo, false)),
  ];

  return {
    numero: resultados.find((resultado) => resultado.numero)?.numero ?? "",
    delegacia: resultados.find((resultado) => resultado.delegacia)?.delegacia ?? "",
    data: resultados.find((resultado) => resultado.data)?.data ?? "",
  };
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

function digitoVerificadorGtinValido(digitos: string) {
  const payload = digitos.slice(0, -1);
  const esperado = Number(digitos.at(-1));
  const soma = [...payload]
    .reverse()
    .reduce((total, digito, indice) => total + Number(digito) * (indice % 2 === 0 ? 3 : 1), 0);
  return (10 - (soma % 10)) % 10 === esperado;
}

export function textoIndicaCodigoDeBarras(texto: string) {
  return texto.split(/\r?\n/).some((linha) => {
    const candidata = linha.trim();
    if (!/^[\d\s.-]+$/.test(candidata)) return false;
    const digitos = candidata.replace(/\D/g, "");
    return [8, 12, 13, 14].includes(digitos.length) && digitoVerificadorGtinValido(digitos);
  });
}

async function imagemContemCodigoDeBarras(file: File) {
  type BarcodeDetectorNativo = {
    detect: (source: ImageBitmap) => Promise<unknown[]>;
  };
  type ConstrutorBarcodeDetector = new () => BarcodeDetectorNativo;

  const construtor = (
    globalThis as typeof globalThis & { BarcodeDetector?: ConstrutorBarcodeDetector }
  ).BarcodeDetector;
  if (!construtor || typeof createImageBitmap !== "function") return false;

  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    return (await new construtor().detect(bitmap)).length > 0;
  } catch (error) {
    console.error("Não foi possível verificar se a imagem contém código de barras.", error);
    throw error;
  } finally {
    bitmap?.close();
  }
}

/** Impede que imagens com código de barras sejam usadas para extrair dados da OS. */
export async function lerImagemParaOS(
  file: File,
  onProgress: (pct: number) => void,
): Promise<string | null> {
  if (await imagemContemCodigoDeBarras(file)) return null;

  const texto = await lerImagem(file, onProgress);
  return textoIndicaCodigoDeBarras(texto) ? null : texto;
}
