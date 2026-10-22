import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pdf = vi.hoisted(() => ({
  textos: [] as string[],
  opcoesTexto: [] as ({ align?: string; charSpace?: number } | undefined)[],
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
      _y: number,
      opcoes?: { align?: string; charSpace?: number },
    ) {
      pdf.textos.push(...(Array.isArray(texto) ? texto : [texto]));
      pdf.opcoesTexto.push(opcoes);
    }
  }

  return { jsPDF: JsPDFSimulado };
});

vi.mock("@/lib/os-files", () => ({
  lerAnexos: vi.fn().mockResolvedValue([]),
}));

import { baixarPdfOS } from "@/lib/os-pdf";
import type { OS } from "@/lib/os-store";

describe("layout do relatório de OS em PDF", () => {
  beforeEach(() => {
    pdf.textos.length = 0;
    pdf.opcoesTexto.length = 0;
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

  it("usa espaçamento de justificação nos parágrafos que ocupam mais de uma linha", async () => {
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

    expect(pdf.opcoesTexto.some((opcoes) => (opcoes?.charSpace ?? 0) > 0)).toBe(true);
  });
});
