import type { OS } from "@/lib/os-store";
import { lerAnexos } from "@/lib/os-files";
import { limparTextoCapturado } from "@/lib/os-text";
import { criarTemplateOS, normalizarTextoRelatorio, tituloFormalAnexo, NAVY, GRAY } from "@/lib/os-pdf-template";
export { normalizarTextoRelatorio } from "@/lib/os-pdf-template";

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

/** Gera e baixa o PDF completo da OS (dados + prints vinculados). */
export async function baixarPdfOS(os: OS) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const textoOcr = limparTextoCapturado(normalizarTextoRelatorio(os.dadosAdicionais ?? ""));
  const providenciasOcr = removerMetadados(lerSecao(textoOcr, ["providencias adotadas"]));
  const solicitacaoOcr = lerSecao(textoOcr, [
    "solicitacao e requisicao oficial de imagens",
    "solicitacao oficial de imagens",
  ]);
  const requisicaoPolicialOcr =
    lerSecao(textoOcr, ["requisicao de imagens policial", "requisicao policial"]) || textoOcr;
  const relatoConsolidado = os.descricao.trim();

  const template = await criarTemplateOS(doc, os.id, "RELATÓRIO CONSOLIDADO DE OCORRÊNCIA");
  const { secao, linhas, linhasGrade, paragrafo, garantir, W, M, rodape } = template;
  template.identificacao(os.gravidade, SEV[os.gravidade] ?? GRAY);

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
  template.avancar(3);
  const y = template.getY();
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
  template.avancar(20);

  // Prints e anexos
  if (anexos.length) {
    secao("Prints e documentos vinculados");
    await template.renderizarAnexos(anexos);
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
  const template = await criarTemplateOS(doc, sr.id, "RELATÓRIO DE SOLICITAÇÃO DE REPARO");
  template.identificacao();
  template.secao("1. DADOS GERAIS");
  template.linhasGrade([
    ["Nº da Solicitação", sr.id],
    ["Data/Hora", new Date(sr.created_at).toLocaleString("pt-BR")],
    ["Loja", sr.loja],
    ["Nº Solicitação GLPI", sr.glpi_numero],
  ], 2);
  template.secao("2. ENVOLVIDOS");
  template.linhasGrade([
    ["Gerente da loja", sr.gerente],
    ["Empresa responsável pelo reparo", sr.empresa_responsavel],
    ["Solicitante", sr.solicitante],
  ], 3);
  template.secao("3. DESCRIÇÃO DA SOLICITAÇÃO");
  template.paragrafo(sr.descricao || "Descrição não informada.", false, 3);
  template.secao("4. PRINTS E DOCUMENTOS VINCULADOS");
  await template.renderizarAnexos(imagens);
  template.rodape();
  doc.save(`${sr.id}.pdf`);
}
