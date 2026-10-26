import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pdf = vi.hoisted(() => ({
  textos: [] as string[],
  opcoesTexto: [] as ({ align?: string; charSpace?: number } | undefined)[],
  posicoesY: [] as number[],
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
      _x: number,
      y: number,
      opcoes?: { align?: string; charSpace?: number },
    ) {
      pdf.textos.push(...(Array.isArray(texto) ? texto : [texto]));
      pdf.opcoesTexto.push(opcoes);
      pdf.posicoesY.push(y);
    }
  }

  return { jsPDF: JsPDFSimulado };
});

vi.mock("@/lib/os-files", () => ({
  lerAnexos: vi.fn().mockResolvedValue([]),
}));

import { baixarPdfOS, normalizarTextoRelatorio } from "@/lib/os-pdf";
import type { OS } from "@/lib/os-store";

describe("layout do relatório de OS em PDF", () => {
  beforeEach(() => {
    pdf.textos.length = 0;
    pdf.opcoesTexto.length = 0;
    pdf.posicoesY.length = 0;
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
    expect(pdf.textos.some((texto) => texto.startsWith("Loja:"))).toBe(true);
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

    expect(texto).toContain("Gerente responsável:");
    expect(texto).toContain("Ana Silva");
    expect(texto).toContain("Fiscal:");
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
    expect(texto).toContain("Chamados / Protocolos:");
    expect(texto).toContain("Não informado");
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
    expect(texto).toContain("Inquérito: 456/2026");
    expect(texto).toContain("10 dias, por meio digital");
    expect(texto).toContain("Encaminhar as imagens do período informado.");
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
    expect(texto).toContain("Fiscal:");
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
