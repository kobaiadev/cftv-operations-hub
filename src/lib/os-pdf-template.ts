import type { jsPDF } from "jspdf";
import { formatarTextoFormal, limparTextoCapturado } from "@/lib/os-text";
import logoUrl from "@/assets/logo-nagumo.png";

// Paleta da plataforma (Nagumo) em RGB para impressão em fundo branco
export const NAVY: [number, number, number] = [22, 38, 77];
export const CYAN: [number, number, number] = [92, 196, 214];
export const GRAY: [number, number, number] = [95, 105, 120];
export const LIGHT: [number, number, number] = [246, 248, 251];

const normalizarChave = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]/g, "");

const ROTULOS_DESTACADOS = [
  "fiscal",
  "vigilante",
  "tipo de ocorrencia",
  "data",
  "horario",
  "relato",
  "providencias adotadas",
  "solicitacao oficial de imagens",
];

const ROTULOS_EM_LINHA = [
  "FISCAL",
  "VIGILANTE",
  "TIPO DE OCORRÊNCIA",
  "DATA",
  "HORÁRIO",
  "RELATO",
  "PROVIDÊNCIAS ADOTADAS",
  "SOLICITAÇÃO OFICIAL DE IMAGENS",
];

export function normalizarTextoRelatorio(texto: string): string {
  const rotulos = ROTULOS_EM_LINHA.map((rotulo) => rotulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length)
    .join("|");
  const antesDoRotulo = new RegExp(`\\s+(?=(?:${rotulos})\\s*:)`, "giu");

  return texto.normalize("NFC")
    .replace(/#\s*ô\s*h\s*o\s*r\s*á\s*r\s*i\s*o\s*:?/giu, "HORÁRIO:")
    .replace(/#\s*h\s*o\s*r\s*a\s*r\s*i\s*o\s*:?/giu, "HORÁRIO:")
    .replace(antesDoRotulo, "\n")
    .split(/\r?\n/)
    .map((linha) => linha.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


export function tituloFormalAnexo(rotulo: string) {
  const chave = normalizarChave(rotulo);
  if (chave.includes("requisicao") || chave.includes("policial")) {
    return "Anexo: Documento Policial";
  }
  if (chave.includes("boletim") || chave === "bo") {
    return "Anexo: Boletim de Ocorrência";
  }
  if (chave.includes("reserva") || chave.includes("cftv")) {
    return "Anexo: Reserva de Imagens (CFTV)";
  }
  if (chave.includes("print") || chave.includes("ocorrencia")) {
    return "Anexo: Captura de Tela da Ocorrência";
  }
  return "Anexo: Documento Complementar";
}

async function carregar(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

export type AnexoRelatorio = { rotulo: string; nome?: string; tipo: string; dataUrl: string; detalhes?: string };

/** Única estrutura de impressão para OS e Reparo: cabeçalho, grids, relato, anexos e rodapé. */
export async function criarTemplateOS(doc: jsPDF, id: string, titulo: string) {
  const W = 210;
  const M = 18;
  const CW = W - M * 2;
  let y = 0;
  const rodape = () => {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setDrawColor(...CYAN);
      doc.setLineWidth(0.4);
      doc.line(M, 278, W - M, 278);
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text("Nagumo · Segurança Patrimonial · Documento interno confidencial", M, 284);
      doc.text(`${id} · Página ${i} de ${n}`, W - M, 284, { align: "right" });
    }
  };

  const novaPagina = () => {
    doc.addPage();
    y = 22;
  };
  const garantir = (h: number) => {
    if (y + h > 272) novaPagina();
  };

  // Cabeçalho
  const logo = await carregar(logoUrl);
  const lw = 34;
  const lh = (logo.naturalHeight / logo.naturalWidth) * lw;
  doc.addImage(logo, "PNG", M, 12, lw, lh);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(titulo, W - M, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text("Segurança Patrimonial · Controle de OS e Reservas CFTV", W - M, 23, {
    align: "right",
  });
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, W - M, 27.5, { align: "right" });
  y = Math.max(12 + lh, 30) + 3;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(M, y, W - M, y);
  doc.setDrawColor(...CYAN);
  doc.setLineWidth(0.4);
  doc.line(M, y + 1.2, W - M, y + 1.2);
  y += 9;

  const identificacao = (gravidade?: string, cor?: [number, number, number]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...NAVY);
    doc.text(id, M, y);
    if (gravidade && cor) {
      doc.setFontSize(9);
      const tag = `Gravidade ${gravidade}`;
      const tw = doc.getTextWidth(tag) + 6;
      doc.setDrawColor(...cor);
      doc.setTextColor(...cor);
      doc.roundedRect(W - M - tw, y - 5, tw, 7, 1.5, 1.5);
      doc.text(tag, W - M - tw / 2, y - 0.4, { align: "center" });
    }
    y += 8;
  };

  const secao = (titulo: string) => {
    garantir(13);
    doc.setFillColor(...NAVY);
    doc.roundedRect(M, y, CW, 7, 1, 1, "F");
    doc.setFillColor(...CYAN);
    doc.rect(M, y, 1.5, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(titulo.toLocaleUpperCase("pt-BR"), M + 4, y + 4.8);
    y += 11;
  };

  const linhas = (pares: [string, string][]) => {
    for (const [i, par] of pares.entries()) {
      const [rotulo, valorBruto] = par;
      const prefixo = `${rotulo}: `;
      const valor =
        limparTextoCapturado(`${prefixo}${valorBruto.normalize("NFC")}`).slice(prefixo.length).trim() ||
        "Não informado";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const textoLinhas = doc.splitTextToSize(valor, CW - 10) as string[];
      const altura = 10 + textoLinhas.length * 4.5;
      garantir(altura + 2);
      doc.setFillColor(...LIGHT);
      doc.setDrawColor(225, 230, 237);
      doc.setLineWidth(0.2);
      doc.roundedRect(M, y, CW, altura, 1.2, 1.2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(`${rotulo}:`, M + 4, y + 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(25, 25, 35);
      doc.text(textoLinhas, M + 4, y + 8.5);
      y += altura + 2;
    }
    y += 3;
  };

  const linhasGrade = (pares: [string, string][], colunas: number) => {
    const espacamento = 3;
    const larguraCelula = (CW - espacamento * (colunas - 1)) / colunas;
    for (let inicio = 0; inicio < pares.length; inicio += colunas) {
      const linha = pares.slice(inicio, inicio + colunas);
      const celulas = linha.map(([rotulo, valorBruto]) => {
        const valor = limparTextoCapturado(valorBruto.normalize("NFC")).trim() || "Não informado";
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        const rotuloLinhas = doc.splitTextToSize(rotulo, larguraCelula - 8) as string[];
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        const valorLinhas = doc.splitTextToSize(valor, larguraCelula - 8) as string[];
        return {
          rotuloLinhas,
          valorLinhas,
          alturaRotulo: Math.max(1, rotuloLinhas.length) * 3.5,
          alturaValor: Math.max(1, valorLinhas.length) * 4.2,
        };
      });
      const alturaRotulo = Math.max(...celulas.map((celula) => celula.alturaRotulo));
      const alturaValor = Math.max(...celulas.map((celula) => celula.alturaValor));
      const altura = 4 + alturaRotulo + 2 + alturaValor + 4;
      garantir(altura + 2);
      for (const [indice, celula] of celulas.entries()) {
        const x = M + indice * (larguraCelula + espacamento);
        doc.setFillColor(...LIGHT);
        doc.setDrawColor(225, 230, 237);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, y, larguraCelula, altura, 1.2, 1.2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...GRAY);
        doc.text(celula.rotuloLinhas, x + 4, y + 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(25, 25, 35);
        doc.text(celula.valorLinhas, x + 4, y + 4 + alturaRotulo + 2);
      }
      y += altura + 2;
    }
    y += 3;
  };

  const paragrafo = (texto: string, comoLista = false, espacamentoEntreLinhas = 0) => {
    const normalizado = normalizarTextoRelatorio(texto);
    const fonte = comoLista
      ? normalizado
          .split(/[;\n]+/)
          .map((item) => item.replace(/^\s*[•-]\s*/, "").trim())
          .filter(Boolean)
          .map((item) => `• ${item}`)
          .join("\n")
      : normalizado;
    const formal = fonte
      .split(/\n\s*\n/)
      .map((bloco) => formatarTextoFormal(bloco))
      .filter(Boolean)
      .join("\n\n");
    if (!formal) return;
    const blocos = formal.split("\n");
    for (const bloco of blocos) {
      const linha = bloco.trim();
      if (!linha) {
        y += 2.5;
        continue;
      }

      const itemLista = linha.startsWith("• ");
      const conteudo = itemLista ? linha.slice(2).trim() : linha;
      const correspondencia = conteudo.match(/^([^:]{2,55}:)\s*(.*)$/);
      const rotulo = correspondencia?.[1] ?? "";
      const valor = correspondencia?.[2] ?? "";
      const destacar =
        rotulo !== "" && ROTULOS_DESTACADOS.includes(normalizarChave(rotulo.slice(0, -1)));
      const recuo = itemLista ? 9 : 4;
      const x = M + recuo;
      const larguraDisponivel = CW - recuo - 4;

      if (itemLista) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(25, 25, 35);
        doc.text("•", M + 4, y);
      }

      if (destacar && !valor) {
        const titulos = doc.splitTextToSize(rotulo, larguraDisponivel) as string[];
        for (const titulo of titulos) {
          garantir(5);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(55, 65, 80);
          doc.text(titulo, x, y);
          y += 5;
        }
        y += 1 + espacamentoEntreLinhas;
        continue;
      }

      if (destacar) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(55, 65, 80);
        doc.text(rotulo, x, y);
        const larguraRotulo = doc.getTextWidth(rotulo) + 1.5;
        const linhasValor = doc.splitTextToSize(
          valor,
          Math.max(20, larguraDisponivel - larguraRotulo),
        ) as string[];
        doc.setFont("helvetica", "normal");
        doc.setTextColor(25, 25, 35);
        doc.text(linhasValor[0] ?? "", x + larguraRotulo, y);
        y += 5;
        for (const linhaValor of linhasValor.slice(1)) {
          garantir(5);
          doc.text(linhaValor, x, y);
          y += 5;
        }
        y += espacamentoEntreLinhas;
        continue;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(55, 65, 80);
      const linhasTexto = doc.splitTextToSize(conteudo, larguraDisponivel) as string[];
      for (const linhaTexto of linhasTexto) {
        garantir(5);
        doc.text(linhaTexto, x, y);
        y += 5;
      }
      y += espacamentoEntreLinhas;
    }
    y += 4;
  };

  const renderizarAnexos = async (anexos: AnexoRelatorio[]) => {
    for (const a of anexos) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      if (a.tipo.startsWith("image/")) {
        try {
          const img = await carregar(a.dataUrl);
          let w = CW;
          let h = (img.naturalHeight / img.naturalWidth) * w;
          if (h > 200) {
            h = 200;
            w = (img.naturalWidth / img.naturalHeight) * h;
          }
          garantir(h + 10);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(...NAVY);
          doc.text(tituloFormalAnexo(a.rotulo), M, y);
          y += 3;
          const fmt = a.tipo.includes("png") ? "PNG" : "JPEG";
          doc.addImage(a.dataUrl, fmt, M + (CW - w) / 2, y, w, h);
          doc.setDrawColor(210, 214, 222);
          doc.rect(M + (CW - w) / 2, y, w, h);
          y += h + 8;
          if (a.detalhes?.trim()) paragrafo(`Detalhes: ${a.detalhes}`);
          continue;
        } catch (error) {
          console.error(`Não foi possível incorporar a imagem ${a.nome} ao PDF.`, error);
          garantir(14);
          doc.setTextColor(...NAVY);
          doc.text(tituloFormalAnexo(a.rotulo), M, y);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(...GRAY);
          doc.text(
            "Não foi possível exibir a imagem no PDF; o anexo original permanece no sistema.",
            M,
            y + 4.5,
          );
          y += 12;
          continue;
        }
      }
      garantir(8);
      doc.setTextColor(...NAVY);
      doc.text(tituloFormalAnexo(a.rotulo), M, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text("(Arquivo anexado ao sistema; formato não exibido no PDF.)", M, y + 4.5);
      y += 10;
    }
  };
  return { secao, linhas, linhasGrade, paragrafo, renderizarAnexos, identificacao, garantir, rodape, W, M, getY: () => y, avancar: (altura: number) => { y += altura; } };
}
