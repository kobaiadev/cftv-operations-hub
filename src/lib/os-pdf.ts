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

function lerSecao(texto: string, titulos: string[]) {
  const titulosNormalizados = titulos.map(normalizarChave);
  const linhas = limparTextoCapturado(texto).split(/\r?\n/);
  const inicio = linhas.findIndex((linha) => {
    const titulo = normalizarChave(linha.replace(/^\d+[.)]\s*/, ""));
    return titulosNormalizados.some((item) => titulo.startsWith(item));
  });
  if (inicio < 0) return "";
  const conteudo: string[] = [];
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

function removerMetadados(texto: string) {
  return texto
    .split(/\r?\n/)
    .filter((linha) => {
      const limpa = linha.trim();
      if (!limpa) return false;
      const chave = normalizarChave(limpa.replace(/^\d+[.)]\s*/, ""));
      if (SECOES_RELATORIO.some((secao) => chave.startsWith(normalizarChave(secao)))) return false;
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

function consolidarRelato(textos: string[]) {
  const vistos = new Set<string>();
  const paragrafos: string[] = [];
  for (const texto of textos) {
    for (const linha of limparTextoCapturado(texto).split(/\r?\n/)) {
      const conteudo = linha.replace(/^\s*[•-]\s*/, "").trim();
      const chave = normalizarChave(conteudo);
      if (!chave || vistos.has(chave)) continue;
      vistos.add(chave);
      paragrafos.push(conteudo);
    }
  }
  return paragrafos.join("\n");
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
  const textoOcr = limparTextoCapturado(os.dadosAdicionais ?? "");
  const relatoOcr = lerSecao(textoOcr, ["relato consolidado dos fatos", "relato dos fatos"]);
  const providenciasOcr = removerMetadados(lerSecao(textoOcr, ["providencias adotadas"]));
  const solicitacaoOcr = lerSecao(textoOcr, [
    "solicitacao e requisicao oficial de imagens",
    "solicitacao oficial de imagens",
  ]);
  const relatoConsolidado = consolidarRelato([
    os.descricao,
    relatoOcr,
    relatoOcr ? "" : removerMetadados(textoOcr),
  ]);

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

  const paragrafo = (texto: string) => {
    const formal = formatarTextoFormal(texto);
    if (!formal) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(25, 25, 35);
    const linhasTexto = formal
      .split("\n")
      .flatMap((linha) => doc.splitTextToSize(linha, CW - 8) as string[]);
    for (const [i, linha] of linhasTexto.entries()) {
      garantir(5);
      const ultimaLinha = i === linhasTexto.length - 1;
      const largura = doc.getTextWidth(linha);
      const espacoCaracter =
        !ultimaLinha && linha.length > 1
          ? Math.min(0.45, Math.max(0, (CW - 8 - largura) / (linha.length - 1)))
          : 0;
      doc.text(linha, M + 4, y, { charSpace: espacoCaracter });
      y += 4.8;
    }
    y += 3;
  };

  secao("1. Dados gerais da ocorrência");
  linhas([
    ["OS / Identificação", os.id],
    ["Loja", os.loja],
    ["Setor", os.setor],
    ["Data e horário da ocorrência", os.data],
    ["Tipo de ocorrência", os.ocorrencia],
    ["Gravidade", os.gravidade],
    ["Status", os.status],
  ]);

  secao("2. Envolvidos e equipe");
  linhas([
    ["Gerente responsável", lerCampo(textoOcr, ["Gerente responsável", "Gerente"])],
    ["Fiscal", lerCampo(textoOcr, ["Fiscal"])],
    ["Vigilante", lerCampo(textoOcr, ["Vigilante"])],
  ]);

  secao("3. Relato consolidado dos fatos");
  paragrafo(relatoConsolidado || "Relato não informado.");

  secao("4. Providências adotadas");
  if (providenciasOcr) paragrafo(providenciasOcr);
  paragrafo(`Ordem de Serviço nº ${os.id} registrada no sistema.`);
  if (os.status !== "Aguardando Imagens") {
    paragrafo(`Status atualizado para ${os.status}.`);
  }
  if (os.reserva) paragrafo(`Reserva de imagens nº ${os.reserva.numero} vinculada à ocorrência.`);
  if (os.bo) {
    paragrafo(`Boletim de Ocorrência nº ${os.bo.numero} vinculado à ocorrência.`);
  }

  secao("5. Solicitação e requisição oficial de imagens");
  linhas([
    ["Órgão solicitante", lerCampo(textoOcr, ["Órgão solicitante"])],
    [
      "Autoridade policial / matrícula",
      lerCampo(textoOcr, ["Autoridade policial / matrícula", "Autoridade policial", "Matrícula"]),
    ],
    [
      "Número do ofício / data",
      lerCampo(textoOcr, ["Número do ofício / data", "Número do ofício", "Ofício"]),
    ],
    [
      "Procedimento / referência",
      lerCampo(textoOcr, ["Procedimento / referência", "Procedimento", "Referência"]),
    ],
    [
      "Prazo e condições de entrega",
      lerCampo(textoOcr, ["Prazo e condições de entrega", "Prazo", "Condições de entrega"]),
    ],
    [
      "Determinação",
      lerCampo(textoOcr, ["Determinação", "Exigências da autoridade"]) ||
        lerSecao(solicitacaoOcr, ["determinacao"]),
    ],
  ]);
  if (solicitacaoOcr) paragrafo(removerMetadados(solicitacaoOcr));

  secao("6. Registros internos e anexos");
  const protocolo = lerCampo(textoOcr, [
    "Chamados / Protocolos",
    "Chamado",
    "Chamado GLPI/TI",
    "Chamados GLPI/TI",
    "Protocolo",
    "Protocolo GLPI",
    "GLPI/TI",
  ]);
  linhas([
    ["Chamados / Protocolos", protocolo],
    [
      "Documentos vinculados",
      [
        ...new Set([
          ...(os.anexosNomes ?? []),
          os.printNome,
          os.reserva?.imagemNome,
          os.bo?.imagemNome,
        ]),
      ]
        .filter((nome): nome is string => Boolean(nome?.trim()))
        .join(", "),
    ],
    ["Responsável pelo registro", "Daniel da Silva Lima — Analista Supervisor de Segurança"],
  ]);
  if (os.reserva) {
    linhas([
      ["Número da reserva de CFTV", os.reserva.numero],
      ["Arquivo da reserva", os.reserva.imagemNome],
      ["Data do vínculo", os.reserva.vinculadaEm],
    ]);
  }

  // Prints e anexos
  const anexos = await lerAnexos(os.id);
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
          doc.text(`${limparTextoCapturado(a.rotulo)}: ${limparTextoCapturado(a.nome)}`, M, y);
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
          doc.text(`${limparTextoCapturado(a.rotulo)}: ${limparTextoCapturado(a.nome)}`, M, y);
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
      doc.text(`${limparTextoCapturado(a.rotulo)}: ${limparTextoCapturado(a.nome)}`, M, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text("(Arquivo anexado ao sistema; formato não exibido no PDF.)", M, y + 4.5);
      y += 10;
    }
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

  rodape();
  doc.save(`${os.id}.pdf`);
}
