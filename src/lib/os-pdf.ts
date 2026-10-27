import type { OS } from "@/lib/os-store";
import { lerAnexos } from "@/lib/os-files";
import { formatarTextoFormal, limparTextoCapturado } from "@/lib/os-text";
import logoUrl from "@/assets/logo-nagumo.png";

// Paleta da plataforma (Nagumo) em RGB para impressão em fundo branco
const NAVY: [number, number, number] = [22, 38, 77];
const CYAN: [number, number, number] = [92, 196, 214];
const GRAY: [number, number, number] = [95, 105, 120];
const LIGHT: [number, number, number] = [246, 248, 251];
const SEV: Record<string, [number, number, number]> = {
  Baixa: [34, 150, 80],
  Média: [200, 140, 0],
  Alta: [200, 50, 40],
};

const normalizarChave = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]/g, "");

const SECOES_RELATORIO = [
  "dados gerais da ocorrencia",
  "dados da ocorrencia",
  "envolvidos e equipe",
  "relato consolidado dos fatos",
  "relato dos fatos",
  "providencias adotadas",
  "solicitacao e requisicao oficial de imagens",
  "solicitacao oficial de imagens",
  "registros internos e anexos",
  "vinculos e documentos",
  "prints e documentos vinculados",
];

function lerCampo(texto: string, rotulos: string[]) {
  const rotulosNormalizados = rotulos.map(normalizarChave);
  for (const linha of texto.split(/\r?\n/)) {
    const separador = linha.indexOf(":");
    if (separador < 0) continue;
    const rotuloOriginal = linha.slice(0, separador).replace(/^[•\-\s]+/, "");
    const rotulo = normalizarChave(rotuloOriginal);
    if (!rotulosNormalizados.includes(rotulo)) continue;
    const valor = linha.slice(separador + 1).trim();
    if (valor) return valor;
  }
  return "";
}

function lerEnvolvidoNaDescricao(descricao: string, rotulos: string[]) {
  const descricaoNormalizada = descricao.replace(
    /\s+(?=(?:gerente(?:\s+responsável)?|fiscal)\s*:)/giu,
    "\n",
  );
  return lerCampo(descricaoNormalizada, rotulos);
}

function buscarValorRotulado(texto: string, rotulos: RegExp) {
  const linhas = texto.split(/\r?\n/).map((linha) => linha.trim());
  for (let indice = 0; indice < linhas.length; indice++) {
    const linha = linhas[indice] ?? "";
    const correspondencia = linha.match(rotulos);
    if (!correspondencia) continue;

    const valorNaLinha = correspondencia[1]?.trim();
    if (valorNaLinha) return valorNaLinha;

    const proximaLinha = linhas[indice + 1]?.trim();
    if (proximaLinha && !/^[\p{L}][\p{L}\s/]{0,40}:$/u.test(proximaLinha)) {
      return proximaLinha;
    }
  }
  return "";
}

function extrairOrgaoSolicitante(texto: string) {
  return (
    buscarValorRotulado(texto, /^\s*(?:de|órgão solicitante|origem)\s*[:-]\s*(.*)$/i) ||
    texto
      .split(/\r?\n/)
      .map((linha) => linha.trim())
      .find((linha) => /delegacia.{0,50}pol[ií]cia|pol[ií]cia civil/i.test(linha)) ||
    ""
  );
}

function extrairAutoridadePolicial(texto: string) {
  const linhas = texto.split(/\r?\n/).map((linha) => linha.trim());
  for (let indice = linhas.length - 1; indice >= 0; indice--) {
    const assinatura = linhas[indice] ?? "";
    if (!/(?:oficial|agente|inspetor).{0,35}pol[ií]cia civil/i.test(assinatura)) continue;

    const nome = linhas
      .slice(Math.max(0, indice - 2), indice)
      .reverse()
      .find((linha) => /[\p{Lu}][\p{L}]+(?:\s+[\p{Lu}][\p{L}]+){1,5}/u.test(linha));
    const matricula = linhas[indice + 1]?.match(/\b\d(?:[\d.-]*\d)?\b/)?.[0] ?? "";
    return [nome, assinatura, matricula && !assinatura.includes(matricula) ? matricula : ""]
      .filter(Boolean)
      .join(" - ");
  }
  return lerCampo(texto, [
    "Autoridade policial / matrícula",
    "Autoridade policial",
    "Delegado",
    "Delegada",
    "Escrivão",
    "Matrícula",
  ]);
}

function extrairNumeroOficioData(texto: string) {
  const textoPlano = texto.replace(/\s+/g, " ");
  const linhaOficio = textoPlano.match(
    /\b(?:OF\.?|OF[IÍ]CIO)\s*(?:N[ºO°.]?\s*)?([A-Z0-9][A-Z0-9./-]{3,})/i,
  );
  const data = textoPlano.match(
    /\b\d{1,2}\s+de\s+(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+\d{4}\b/i,
  )?.[0];
  if (linhaOficio) {
    return `OF. ${linhaOficio[1]}${data ? ` / ${data}` : ""}`;
  }
  return lerCampo(texto, ["Número do ofício / data", "Número do ofício", "Ofício"]);
}

function extrairPrazoCondicoes(texto: string) {
  const rotulado = lerCampo(texto, [
    "Prazo e condições de entrega",
    "Prazo",
    "Condições de entrega",
  ]);
  if (rotulado) return rotulado;

  const textoPlano = texto.replace(/\s+/g, " ");
  return (
    textoPlano.match(/\bprazo\b[^.!?]{0,500}?\b\d+\s*(?:dias?|horas?)(?:[^.!?]{0,350})/i)?.[0] ?? ""
  );
}

function extrairDeterminacao(texto: string) {
  const rotulada =
    lerCampo(texto, ["Determinação", "Exigências da autoridade"]) ||
    lerSecao(texto, ["determinacao"]);
  if (rotulada) return rotulada;

  const textoPlano = texto.replace(/\s+/g, " ");
  const frases = textoPlano.split(/(?<=[.!?])\s+/);
  const motivo = frases.find(
    (frase) =>
      /imagens?|gravações?|filmagens?/i.test(frase) &&
      /solicit|requis|monitor|flagr|motiv|ocorr|subtra|abord|investig/i.test(frase),
  );
  if (motivo) return motivo;

  return (
    textoPlano.match(
      /\b(?:solicito|requisito|encaminh(?:ar|amento)|fornecimento)\b[^.!?]{0,500}\b(?:imagens?|gravações?|filmagens?)\b[^.!?]{0,500}/i,
    )?.[0] ?? ""
  );
}

function lerSecao(texto: string, titulos: string[]) {
  const titulosNormalizados = titulos.map(normalizarChave);
  const linhas = limparTextoCapturado(normalizarTextoRelatorio(texto)).split(/\r?\n/);
  const inicio = linhas.findIndex((linha) => {
    const titulo = normalizarChave(linha.replace(/^\d+[.)]\s*/, ""));
    return titulosNormalizados.some((item) => titulo.startsWith(item));
  });
  if (inicio < 0) return "";
  const conteudo: string[] = [];
  const linhaTitulo = linhas[inicio];
  if (!linhaTitulo) return "";
  const tituloLinha = linhaTitulo.replace(/^\d+[.)]\s*/, "");
  const separador = tituloLinha.indexOf(":");
  if (separador >= 0) {
    const tituloAntesDoSeparador = normalizarChave(tituloLinha.slice(0, separador));
    if (titulosNormalizados.some((item) => tituloAntesDoSeparador.startsWith(item))) {
      const valorNaLinha = tituloLinha.slice(separador + 1).trim();
      if (valorNaLinha) conteudo.push(valorNaLinha);
    }
  }
  for (const linha of linhas.slice(inicio + 1)) {
    const chave = normalizarChave(linha.replace(/^\d+[.)]\s*/, ""));
    if (SECOES_RELATORIO.some((secao) => chave.startsWith(normalizarChave(secao)))) break;
    if (linha.trim()) conteudo.push(linha.trim());
  }
  return conteudo.join("\n");
}

const ROTULOS_RELATORIO = [
  "OS / Identificação",
  "Loja",
  "Setor",
  "Data e Horário da Ocorrência",
  "Horário",
  "Tipo de Ocorrência",
  "Gravidade",
  "Status",
  "Gerente responsável",
  "Fiscal",
  "Vigilante",
  "Órgão Solicitante",
  "Autoridade Policial / Matrícula",
  "Número do Ofício / Data",
  "Procedimento / Referência",
  "Prazo e Condições de Entrega",
  "Determinação",
  "Chamados / Protocolos",
  "Chamado",
  "Chamado GLPI/TI",
  "Chamados GLPI/TI",
  "Protocolo",
  "Protocolo GLPI",
  "GLPI/TI",
];

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

  return texto
    .replace(/#\s*ô\s*h\s*o\s*r\s*á\s*r\s*i\s*o\s*:?/giu, "HORÁRIO:")
    .replace(/#\s*h\s*o\s*r\s*a\s*r\s*i\s*o\s*:?/giu, "HORÁRIO:")
    .replace(antesDoRotulo, "\n")
    .split(/\r?\n/)
    .map((linha) => linha.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removerMetadados(texto: string) {
  let dentroDeSecao = false;
  return texto
    .split(/\r?\n/)
    .filter((linha) => {
      const limpa = linha.trim();
      if (!limpa) return false;
      const chave = normalizarChave(limpa.replace(/^\d+[.)]\s*/, ""));
      if (SECOES_RELATORIO.some((secao) => chave.startsWith(normalizarChave(secao)))) {
        dentroDeSecao = true;
        return false;
      }
      if (dentroDeSecao) return false;
      if (
        /^(?:print da ocorrencia|reserva de imagem|boletim de ocorrencia|documento adicional \d+):?$/i.test(
          limpa,
        )
      ) {
        return false;
      }
      const separador = limpa.indexOf(":");
      if (separador < 0) return true;
      const rotulo = normalizarChave(limpa.slice(0, separador).replace(/^[•\-\s]+/, ""));
      return !ROTULOS_RELATORIO.some((item) => normalizarChave(item) === rotulo);
    })
    .join("\n");
}

function tituloFormalAnexo(rotulo: string) {
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

/** Gera e baixa o PDF completo da OS (dados + prints vinculados). */
export async function baixarPdfOS(os: OS) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 18;
  const CW = W - M * 2;
  let y = 0;
  const textoOcr = limparTextoCapturado(normalizarTextoRelatorio(os.dadosAdicionais ?? ""));
  const providenciasOcr = removerMetadados(lerSecao(textoOcr, ["providencias adotadas"]));
  const solicitacaoOcr = lerSecao(textoOcr, [
    "solicitacao e requisicao oficial de imagens",
    "solicitacao oficial de imagens",
  ]);
  const requisicaoPolicialOcr =
    lerSecao(textoOcr, ["requisicao de imagens policial", "requisicao policial"]) || textoOcr;
  const relatoConsolidado = os.descricao.trim();

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
      doc.text(`${os.id} · Página ${i} de ${n}`, W - M, 284, { align: "right" });
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
  doc.text("RELATÓRIO CONSOLIDADO DE OCORRÊNCIA", W - M, 18, { align: "right" });
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

  // Identificação
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text(os.id, M, y);
  const sev = SEV[os.gravidade] ?? GRAY;
  doc.setFontSize(9);
  const tag = `Gravidade ${os.gravidade}`;
  const tw = doc.getTextWidth(tag) + 6;
  doc.setDrawColor(...sev);
  doc.setTextColor(...sev);
  doc.roundedRect(W - M - tw, y - 5, tw, 7, 1.5, 1.5);
  doc.text(tag, W - M - tw / 2, y - 0.4, { align: "center" });
  y += 8;

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
        limparTextoCapturado(`${prefixo}${valorBruto}`).slice(prefixo.length).trim() ||
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
        const valor = limparTextoCapturado(valorBruto).trim() || "Não informado";
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

  secao("1. Dados gerais da ocorrência");
  const dadosGerais: [string, string][] = [
    ["OS / Identificação", os.id],
    ["Loja", os.loja],
    ["Setor", os.setor],
    ["Data e horário da ocorrência", os.data],
    ["Tipo de ocorrência", os.ocorrencia],
    ["Gravidade", os.gravidade],
    ["Status", os.status],
  ];
  const horarioOcr = lerCampo(textoOcr, ["Horário"]);
  if (horarioOcr) dadosGerais.splice(4, 0, ["HORÁRIO", horarioOcr]);
  linhasGrade(dadosGerais, 3);

  secao("2. Envolvidos e equipe");
  linhasGrade(
    [
      [
        "Gerente responsável",
        lerEnvolvidoNaDescricao(os.descricao, ["Gerente responsável", "Gerente"]) ||
          lerCampo(textoOcr, ["Gerente responsável", "Gerente"]),
      ],
      [
        "Fiscal",
        lerEnvolvidoNaDescricao(os.descricao, ["Fiscal"]) || lerCampo(textoOcr, ["Fiscal"]),
      ],
      ["Vigilante", lerCampo(textoOcr, ["Vigilante"])],
    ],
    3,
  );

  secao("3. Relato consolidado dos fatos");
  paragrafo(relatoConsolidado || "Relato não informado.", false, 3);

  secao("4. Providências adotadas");
  if (providenciasOcr) paragrafo(providenciasOcr, true);
  paragrafo(`Ordem de Serviço nº ${os.id} registrada no sistema.`, true);
  if (os.status !== "Aguardando Imagens") {
    paragrafo(`Status atualizado para ${os.status}.`, true);
  }
  if (os.reserva)
    paragrafo(`Reserva de imagens nº ${os.reserva.numero} vinculada à ocorrência.`, true);
  if (os.bo) {
    paragrafo(`Boletim de Ocorrência nº ${os.bo.numero} vinculado à ocorrência.`, true);
  }

  secao("5. Solicitação e requisição oficial de imagens");
  const orgaoSolicitante =
    extrairOrgaoSolicitante(requisicaoPolicialOcr) ||
    lerCampo(textoOcr, [
      "Órgão solicitante",
      "Órgão",
      "Delegacia",
      "Distrito Policial",
      "Unidade policial",
    ]);
  const procedimentoReferencia =
    lerCampo(textoOcr, [
      "Procedimento / referência",
      "Procedimento",
      "Referência",
      "Inquérito policial",
      "Inquérito",
      "Registro de ocorrência",
    ]) ||
    requisicaoPolicialOcr.match(/\b\d{3}[-/]\d{4,}\/\d{4}\b/)?.[0] ||
    "";
  linhas([
    ["Órgão solicitante", orgaoSolicitante || os.bo?.delegacia || ""],
    [
      "Autoridade policial / matrícula",
      extrairAutoridadePolicial(requisicaoPolicialOcr) || extrairAutoridadePolicial(textoOcr),
    ],
    ["Número do ofício / data", extrairNumeroOficioData(requisicaoPolicialOcr)],
    [
      "Procedimento / referência",
      procedimentoReferencia ||
        (os.bo?.numero
          ? `Boletim de Ocorrência nº ${os.bo.numero}${os.bo.data ? `, registrado em ${os.bo.data}` : ""}`
          : ""),
    ],
    [
      "Prazo e condições de entrega",
      extrairPrazoCondicoes(requisicaoPolicialOcr) || extrairPrazoCondicoes(textoOcr),
    ],
    [
      "Determinação",
      extrairDeterminacao(requisicaoPolicialOcr) ||
        extrairDeterminacao(textoOcr) ||
        lerSecao(solicitacaoOcr, ["determinacao"]),
    ],
  ]);
  if (solicitacaoOcr) paragrafo(removerMetadados(solicitacaoOcr));

  const anexos = await lerAnexos(os.id);
  const titulosAnexos = [
    ...anexos.map((anexo) => tituloFormalAnexo(anexo.rotulo)),
    ...(os.printNome ? ["Anexo: Captura de Tela da Ocorrência"] : []),
    ...(os.reserva?.imagemNome ? ["Anexo: Reserva de Imagens (CFTV)"] : []),
    ...(os.bo?.imagemNome ? ["Anexo: Boletim de Ocorrência"] : []),
    ...((os.anexosNomes?.length ?? 0) > 0 ? ["Anexo: Documento Complementar"] : []),
  ];

  secao("6. Registros internos e anexos");
  linhas([
    ["Documentos vinculados", [...new Set(titulosAnexos)].join(", ")],
    ["Responsável pelo registro", "Daniel da Silva Lima — Analista Supervisor de Segurança"],
  ]);
  if (os.reserva) {
    linhas([
      ["Número da reserva de CFTV", os.reserva.numero],
      ["Data do vínculo", os.reserva.vinculadaEm],
    ]);
  }

  // Assinaturas
  garantir(34);
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("Daniel da Silva Lima", M + 39, y + 4, { align: "center" });
  doc.text("Donizete Campos", W - M - 39, y + 4, { align: "center" });
  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.3);
  doc.line(M, y + 7, M + 78, y + 7);
  doc.line(W - M - 78, y + 7, W - M, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("Analista Supervisor de Segurança", M + 39, y + 12, { align: "center" });
  doc.text("Diretoria / Gerência responsável", W - M - 39, y + 12, { align: "center" });
  y += 20;

  // Prints e anexos
  if (anexos.length) {
    secao("Prints e documentos vinculados");
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
          doc.setTextColor(...NAVY);
          doc.text(tituloFormalAnexo(a.rotulo), M, y);
          y += 3;
          const fmt = a.tipo.includes("png") ? "PNG" : "JPEG";
          doc.addImage(a.dataUrl, fmt, M + (CW - w) / 2, y, w, h);
          doc.setDrawColor(210, 214, 222);
          doc.rect(M + (CW - w) / 2, y, w, h);
          y += h + 8;
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
  }

  rodape();
  doc.save(`${os.id}.pdf`);
}

/** Mesmo template formal das OS, mapeado para os campos de Solicitação de Reparo. */
export async function baixarPdfReparo(
  sr: import("@/lib/reparo-api").SolicitacaoReparo,
  imagens: { rotulo: string; detalhes: string; tipo: string; dataUrl: string }[],
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 18;
  const CW = W - M * 2;
  let y = 0;
  const garantir = (h: number) => {
    if (y + h > 272) {
      doc.addPage();
      y = 22;
    }
  };
  const logo = await carregar(logoUrl);
  const lw = 34;
  const lh = (logo.naturalHeight / logo.naturalWidth) * lw;
  doc.addImage(logo, "PNG", M, 12, lw, lh);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("SOLICITAÇÃO DE REPARO", W - M, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text("Segurança Patrimonial · Controle de Reparos", W - M, 23, { align: "right" });
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, W - M, 27.5, { align: "right" });
  y = Math.max(12 + lh, 30) + 3;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(M, y, W - M, y);
  doc.setDrawColor(...CYAN);
  doc.setLineWidth(0.4);
  doc.line(M, y + 1.2, W - M, y + 1.2);
  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text(sr.id, M, y);
  y += 8;

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
    for (const [rotulo, v] of pares) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const t = doc.splitTextToSize(v.trim() || "Não informado", CW - 10) as string[];
      const altura = 10 + t.length * 4.5;
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
      doc.text(t, M + 4, y + 8.5);
      y += altura + 2;
    }
    y += 3;
  };

  secao("Dados da solicitação");
  linhas([
    ["Data", new Date(sr.created_at).toLocaleString("pt-BR")],
    ["Loja", sr.loja],
    ["Gerente responsável pela loja", sr.gerente],
    ["Empresa responsável pelo reparo", sr.empresa_responsavel],
    ["Solicitante", sr.solicitante],
    ["Nº Solicitação GLPI", sr.glpi_numero],
  ]);
  secao("Descrição da solicitação");
  linhas([["Descrição", sr.descricao]]);

  if (imagens.length) {
    secao("Imagens vinculadas");
    for (const a of imagens) {
      try {
        const img = await carregar(a.dataUrl);
        let w = CW;
        let h = (img.naturalHeight / img.naturalWidth) * w;
        if (h > 190) {
          h = 190;
          w = (img.naturalWidth / img.naturalHeight) * h;
        }
        garantir(h + 16);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(...NAVY);
        doc.text(a.rotulo, M, y);
        y += 3;
        doc.addImage(a.dataUrl, a.tipo.includes("png") ? "PNG" : "JPEG", M + (CW - w) / 2, y, w, h);
        y += h + 4;
        if (a.detalhes.trim()) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(...GRAY);
          const t = doc.splitTextToSize(`Detalhes: ${a.detalhes}`, CW) as string[];
          garantir(t.length * 4);
          doc.text(t, M, y);
          y += t.length * 4;
        }
        y += 5;
      } catch (error) {
        console.error("Não foi possível incorporar a imagem ao PDF.", error);
      }
    }
  }

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...CYAN);
    doc.setLineWidth(0.4);
    doc.line(M, 278, W - M, 278);
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text("Nagumo · Segurança Patrimonial · Documento interno confidencial", M, 284);
    doc.text(`${sr.id} · Página ${i} de ${n}`, W - M, 284, { align: "right" });
  }
  doc.save(`${sr.id}.pdf`);
}
