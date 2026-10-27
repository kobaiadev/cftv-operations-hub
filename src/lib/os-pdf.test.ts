import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pdf = vi.hoisted(() => ({
  textos: [] as string[],
  opcoesTexto: [] as ({ align?: string; charSpace?: number } | undefined)[],
  posicoesY: [] as number[],
  posicoesX: [] as number[],
  anexos: [] as { rotulo: string; nome: string; tipo: string; dataUrl: string }[],
}));

vi.mock("jspdf", () => {
  class JsPDFSimulado {
    addPage() {}
    addImage() {}
    getNumberOfPages() {
      return 1;
    }
    getTextWidth(texto: string) {
      return texto.length * 1.2;
    }
    line() {}
    rect() {}
    roundedRect() {}
    save() {}
    setDrawColor() {}
    setFillColor() {}
    setFont() {}
    setFontSize() {}
    setLineWidth() {}
    setPage() {}
    setTextColor() {}
    splitTextToSize(texto: string) {
      const palavras = texto.split(/\s+/);
      const linhas: string[] = [];
      let linha = "";
      for (const palavra of palavras) {
        const proxima = linha ? `${linha} ${palavra}` : palavra;
        if (proxima.length > 105 && linha) {
          linhas.push(linha);
          linha = palavra;
        } else {
          linha = proxima;
        }
      }
      if (linha) linhas.push(linha);
      return linhas;
    }
    text(
      texto: string | string[],
      x: number,
      y: number,
      opcoes?: { align?: string; charSpace?: number },
    ) {
      pdf.textos.push(...(Array.isArray(texto) ? texto : [texto]));
      pdf.opcoesTexto.push(opcoes);
      pdf.posicoesX.push(x);
      pdf.posicoesY.push(y);
    }
  }

  return { jsPDF: JsPDFSimulado };
});

vi.mock("@/lib/os-files", () => ({
  lerAnexos: vi.fn(async () => pdf.anexos),
}));

import { baixarPdfOS, baixarPdfReparo, normalizarTextoRelatorio } from "@/lib/os-pdf";
import type { OS } from "@/lib/os-store";

describe("layout do relatório de OS em PDF", () => {
  beforeEach(() => {
    pdf.textos.length = 0;
    pdf.opcoesTexto.length = 0;
    pdf.posicoesY.length = 0;
    pdf.posicoesX.length = 0;
    pdf.anexos.length = 0;
    vi.stubGlobal(
      "Image",
      class {
        naturalHeight = 300;
        naturalWidth = 1000;
        src = "";
        async decode() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preserva dados e acentos do reparo sem enviar emojis ou acentos decompostos ao PDF", async () => {
    await baixarPdfReparo(
      {
        id: "SR-1234",
        created_at: "2026-10-27T22:00:00Z",
        loja: "São João",
        gerente: "João Gonçalves",
        empresa_responsavel: "Manutenc\u0327a\u0303o Técnica",
        solicitante: "José da Conceição",
        glpi_numero: "12345",
        descricao:
          "Solicitação de manutenção. 🔧\n\nAc\u0327a\u0303o necessária: substituição da peça.",
        imagens: [],
      },
      [],
    );
    expect(pdf.textos).toContain("SR-1234");
    expect(pdf.textos).toContain("12345");
    expect(pdf.textos).toContain("São João");
    expect(pdf.textos).toContain("João Gonçalves");
    expect(pdf.textos).toContain("Manutenção Técnica");
    expect(pdf.textos).toContain("José da Conceição");
    expect(pdf.textos).toContain("Solicitação de manutenção.");
    expect(pdf.textos).toContain("Ação necessária: substituição da peça.");
    expect(pdf.textos.join("\n")).not.toMatch(/[\u0300-\u036f]|🔧/u);
  });

  it("corrige rótulos OCR compactados e padroniza o campo de horário", () => {
    expect(
      normalizarTextoRelatorio("#ô H O R Á R I O : 18:30 FISCAL: Ana Silva VIGILANTE: João Souza"),
    ).toBe("HORÁRIO: 18:30\nFISCAL: Ana Silva\nVIGILANTE: João Souza");
  });

  it("organiza o relatório em seções e identifica os responsáveis pelas assinaturas", async () => {
    const os: OS = {
      id: "OS-2481",
      data: "20/10/2026 18:42",
      loja: "Loja Centro",
      setor: "Açougue",
      ocorrencia: "Furto de carnes",
      descricao:
        "O gerente informou que uma ocorrência foi observada no setor e solicitou que as gravações fossem preservadas para análise da equipe de segurança.",
      gravidade: "Alta",
      status: "Aguardando Imagens",
    };

    await baixarPdfOS(os);

    expect(pdf.textos).toContain("RELATÓRIO CONSOLIDADO DE OCORRÊNCIA");
    expect(pdf.textos).toContain("1. DADOS GERAIS DA OCORRÊNCIA");
    expect(pdf.textos).toContain("2. ENVOLVIDOS E EQUIPE");
    expect(pdf.textos).toContain("3. RELATO CONSOLIDADO DOS FATOS");
    expect(pdf.textos).toContain("4. PROVIDÊNCIAS ADOTADAS");
    expect(pdf.textos).toContain("5. SOLICITAÇÃO E REQUISIÇÃO OFICIAL DE IMAGENS");
    expect(pdf.textos).toContain("6. REGISTROS INTERNOS E ANEXOS");
    expect(pdf.textos).toContain("Daniel da Silva Lima");
    expect(pdf.textos).toContain("Donizete Campos");
    expect(pdf.textos).toContain("Analista Supervisor de Segurança");
    expect(pdf.textos).toContain("Diretoria / Gerência responsável");
    expect(pdf.textos).toContain("Loja");
  });

  it("consolida dados identificados sem repetir fatos ou inventar exigências policiais", async () => {
    const os: OS = {
      id: "OS-2483",
      data: "22/10/2026 14:30",
      loja: "Loja Centro",
      setor: "Açougue",
      ocorrencia: "Furto",
      descricao: "O vigilante observou a retirada de mercadorias sem pagamento.",
      gravidade: "Alta",
      status: "Aguardando Imagens",
      dadosAdicionais: [
        "Envolvidos e equipe",
        "Gerente responsável: Ana Silva",
        "Fiscal: Bruno Santos",
        "Vigilante: Carlos Souza",
        "Relato consolidado dos fatos",
        "O vigilante observou a retirada de mercadorias sem pagamento.",
        "Providências adotadas",
        "A gerência foi comunicada.",
        "Solicitação e requisição oficial de imagens",
        "Órgão solicitante: 93ª Delegacia de Polícia",
        "Autoridade policial / matrícula: Delegada Maria Lopes / 12345",
        "Número do ofício / data: Ofício nº 194002-1093/2026, de 22/10/2026",
        "Procedimento / referência: Inquérito nº 456/2026",
        "Prazo e condições de entrega: 10 dias, por meio digital",
        "Determinação: Encaminhar as imagens do período informado.",
      ].join("\n"),
    };

    await baixarPdfOS(os);
    const texto = pdf.textos.join("\n");

    expect(texto).toContain("Gerente responsável");
    expect(texto).toContain("Ana Silva");
    expect(texto).toContain("Fiscal");
    expect(texto).toContain("Bruno Santos");
    expect(texto).toContain("Órgão solicitante:");
    expect(texto).toContain("93ª Delegacia de Polícia");
    expect(texto).toContain("Ofício nº 194002-1093/2026");
    expect(texto).toContain("Inquérito nº 456/2026");
    expect(texto).toContain("Encaminhar as imagens do período informado.");
    expect(
      texto.match(/O vigilante observou a retirada de mercadorias sem pagamento\./g),
    ).toHaveLength(1);
    expect(texto).not.toContain("Solicita-se a preservação");
    expect(texto).not.toContain("Chamados / Protocolos:");
    expect(texto).toContain("Não informado");
  });

  it("usa gerente e fiscal descritos na ocorrência e omite chamados do PDF", async () => {
    const os: OS = {
      id: "OS-2487",
      data: "26/10/2026 12:00",
      loja: "Loja Centro",
      setor: "Açougue",
      ocorrencia: "Furto",
      descricao: "GERENTE RESPONSÁVEL: Ana Silva FISCAL: Bruno Santos",
      gravidade: "Alta",
      status: "Aguardando Imagens",
      dadosAdicionais: "Vigilante: Carlos Souza\nChamados / Protocolos: CH-12345",
    };

    await baixarPdfOS(os);
    const inicioEnvolvidos = pdf.textos.indexOf("2. ENVOLVIDOS E EQUIPE");
    const fimEnvolvidos = pdf.textos.indexOf("3. RELATO CONSOLIDADO DOS FATOS");
    const envolvidos = pdf.textos.slice(inicioEnvolvidos, fimEnvolvidos).join("\n");

    expect(envolvidos).toContain("Gerente responsável");
    expect(envolvidos).toContain("Ana Silva");
    expect(envolvidos).not.toContain("Não informado");
    expect(envolvidos).toContain("Fiscal");
    expect(envolvidos).toContain("Bruno Santos");
    expect(envolvidos).toContain("Vigilante");
    expect(envolvidos).toContain("Carlos Souza");
    expect(pdf.textos.join("\n")).not.toContain("Chamados / Protocolos:");
    expect(pdf.textos.join("\n")).not.toContain("CH-12345");
  });

  it("preserva quebras de parágrafo e separa visualmente os blocos do relato", async () => {
    const os: OS = {
      id: "OS-2488",
      data: "26/10/2026 12:30",
      loja: "Loja Centro",
      setor: "Açougue",
      ocorrencia: "Furto",
      descricao:
        "Primeiro parágrafo do relato.\n\nSegundo parágrafo com informações complementares.",
      gravidade: "Alta",
      status: "Aguardando Imagens",
    };

    await baixarPdfOS(os);

    const primeiroParagrafo = pdf.textos.indexOf("Primeiro parágrafo do relato.");
    const segundoParagrafo = pdf.textos.indexOf(
      "Segundo parágrafo com informações complementares.",
    );

    expect(primeiroParagrafo).toBeGreaterThanOrEqual(0);
    expect(segundoParagrafo).toBeGreaterThan(primeiroParagrafo);
    expect(pdf.posicoesY[segundoParagrafo]! - pdf.posicoesY[primeiroParagrafo]!).toBeGreaterThan(5);
  });

  it("exibe somente a descrição no relato e organiza os dados gerais em colunas", async () => {
    const os: OS = {
      id: "OS-2489",
      data: "26/10/2026 13:00",
      loja: "Loja Centro",
      setor: "Açougue",
      ocorrencia: "Furto",
      descricao: "Relato escrito pelo usuário.\nSegunda linha do relato.",
      gravidade: "Alta",
      status: "Aguardando Imagens",
      dadosAdicionais: [
        "Relato consolidado dos fatos",
        "Texto bruto extraído de imagem que não deve aparecer no relato.",
        "Requisição de Imagens (POLICIAL):",
        "De: Delegacia de Polícia Civil",
      ].join("\n"),
    };

    await baixarPdfOS(os);

    const inicioRelato = pdf.textos.indexOf("3. RELATO CONSOLIDADO DOS FATOS");
    const fimRelato = pdf.textos.indexOf("4. PROVIDÊNCIAS ADOTADAS");
    const relatoPdf = pdf.textos.slice(inicioRelato, fimRelato).join("\n");
    const xLoja = pdf.posicoesX[pdf.textos.indexOf("Loja")]!;
    const xSetor = pdf.posicoesX[pdf.textos.indexOf("Setor")]!;

    expect(relatoPdf).toContain("Relato escrito pelo usuário.");
    expect(relatoPdf).toContain("Segunda linha do relato.");
    expect(relatoPdf).not.toContain("Texto bruto extraído de imagem");
    expect(relatoPdf).not.toContain("Delegacia de Polícia Civil");
    expect(pdf.posicoesY[pdf.textos.indexOf("Loja")]).toBe(
      pdf.posicoesY[pdf.textos.indexOf("Setor")],
    );
    expect(xLoja).toBeLessThan(xSetor);
  });

  it("usa títulos formais nos anexos e posiciona assinaturas antes das imagens", async () => {
    const os: OS = {
      id: "OS-2490",
      data: "26/10/2026 13:30",
      loja: "Loja Centro",
      setor: "Açougue",
      ocorrencia: "Furto",
      descricao: "Relato para o anexo.",
      gravidade: "Alta",
      status: "Aguardando Imagens",
    };
    pdf.anexos.push({
      rotulo: "Print da ocorrência",
      nome: "1.jpg",
      tipo: "image/jpeg",
      dataUrl: "data:image/jpeg;base64,abc",
    });

    await baixarPdfOS(os);

    const texto = pdf.textos.join("\n");
    const ultimaOcorrenciaDoTitulo = pdf.textos.lastIndexOf("Anexo: Captura de Tela da Ocorrência");

    expect(texto).toContain("Anexo: Captura de Tela da Ocorrência");
    expect(texto).not.toContain("1.jpg");
    expect(pdf.textos.indexOf("Daniel da Silva Lima")).toBeLessThan(ultimaOcorrenciaDoTitulo);
    expect(pdf.textos.indexOf("Donizete Campos")).toBeLessThan(ultimaOcorrenciaDoTitulo);
  });

  it("preenche a requisição com os dados identificados no OCR do registro policial", async () => {
    const os: OS = {
      id: "OS-2485",
      data: "24/10/2026 12:00",
      loja: "Loja Centro",
      setor: "Açougue",
      ocorrencia: "Furto",
      descricao: "Registro policial recebido.",
      gravidade: "Alta",
      status: "Aguardando Imagens",
      dadosAdicionais: [
        "Boletim de Ocorrência:",
        "Delegacia: 2º Distrito Policial",
        "Autoridade policial: Delegada Ana Souza",
        "Ofício: nº 123/2026, de 24/10/2026",
        "Inquérito: 456/2026",
        "Prazo: 10 dias, por meio digital",
        "Determinação: Encaminhar as imagens do período informado.",
      ].join("\n"),
    };

    await baixarPdfOS(os);
    const texto = pdf.textos.join("\n");

    expect(texto).toContain("Órgão solicitante:");
    expect(texto).toContain("2º Distrito Policial");
    expect(texto).toContain("Delegada Ana Souza");
    expect(texto).toContain("nº 123/2026");
    expect(texto).toContain("456/2026");
    expect(texto).toContain("10 dias, por meio digital");
    expect(texto).toContain("Encaminhar as imagens do período informado.");
  });

  it("extrai campos de ofício policial do cabeçalho, corpo e assinatura do OCR", async () => {
    const os: OS = {
      id: "OS-2486",
      data: "26/10/2026 10:00",
      loja: "Nagumo Ponte Alta",
      setor: "Mercearia",
      ocorrencia: "Furto",
      descricao: "Subtração de mercadoria.",
      gravidade: "Alta",
      status: "Aguardando Imagens",
      dadosAdicionais: [
        "Requisição de Imagens (POLICIAL):",
        "POLÍCIA CIVIL DO ESTADO DO RIO DE JANEIRO",
        "De: Delegacia de Polícia da 093a. Delegacia de Polícia / Volta Redonda",
        "OF. 194002-1093/2026 / 05 de outubro de 2026",
        "Ref.: 093-11871/2026",
        "Solicito o envio no prazo de 7 dias, em mídia física (CD, DVD ou Pen-Drive), de Segunda a Sexta, das 10h às 16h.",
        "Imagens do monitoramento que flagraram a subtração da mercadoria e motivaram a abordagem do indivíduo no supermercado Nagumo, unidade Ponte Alta.",
        "Ítalo Patheli Silva Leite",
        "Oficial de Polícia Civil - 5.157.346-6",
      ].join("\n"),
    };

    await baixarPdfOS(os);
    const texto = pdf.textos.join("\n");

    expect(texto).toContain("Delegacia de Polícia da 093a. Delegacia de Polícia / Volta Redonda");
    expect(texto).toContain("Ítalo Patheli Silva Leite - Oficial de Polícia Civil - 5.157.346-6");
    expect(texto).toContain("OF. 194002-1093/2026 / 05 de outubro de 2026");
    expect(texto).toContain("093-11871/2026");
    expect(texto).toContain("prazo de 7 dias, em mídia física (CD, DVD ou Pen-Drive)");
    expect(texto).toContain("Imagens do monitoramento que flagraram a subtração");
  });

  it("destaca rótulos do relato e exibe providências separadas em tópicos", async () => {
    const os: OS = {
      id: "OS-2484",
      data: "23/10/2026 18:30",
      loja: "Loja Centro",
      setor: "Açougue",
      ocorrencia: "Furto",
      descricao: "RELATO: A equipe identificou uma ocorrência durante a ronda.",
      gravidade: "Alta",
      status: "Aguardando Imagens",
      dadosAdicionais: [
        "#ô H O R Á R I O : 18:30",
        "Envolvidos e equipe",
        "Fiscal: Ana Silva",
        "Vigilante: João Souza",
        "Providências adotadas",
        "A gerência foi comunicada; A área foi isolada;",
        "Solicitação oficial de imagens",
      ].join("\n"),
    };

    await baixarPdfOS(os);
    const texto = pdf.textos.join("\n");

    expect(texto).toContain("HORÁRIO:");
    expect(texto).toContain("18:30");
    expect(texto).toContain("Fiscal");
    expect(texto).toContain("Vigilante:");
    expect(texto).toContain("RELATO:");
    expect(pdf.textos.filter((linha) => linha === "•")).toHaveLength(3);
    expect(texto).toContain("A gerência foi comunicada");
    expect(texto).toContain("A área foi isolada");
  });

  it("usa espaçamento confortável entre linhas de parágrafos longos", async () => {
    const os: OS = {
      id: "OS-2482",
      data: "21/10/2026 10:00",
      loja: "Loja Matriz",
      setor: "Recebimento",
      ocorrencia: "Divergência",
      descricao:
        "A equipe responsável pelo recebimento identificou uma divergência durante a conferência dos produtos entregues. Os itens foram separados para análise e a gerência foi comunicada para que as providências necessárias sejam tomadas conforme os procedimentos internos da empresa.",
      gravidade: "Média",
      status: "Em Análise",
    };

    await baixarPdfOS(os);

    const temLinhaComEspacamentoConfortavel = pdf.posicoesY.some((posicao, indice, todas) =>
      todas.slice(indice + 1).some((seguinte) => Math.abs(seguinte - posicao - 5) < 0.001),
    );
    expect(temLinhaComEspacamentoConfortavel).toBe(true);
  });
});
