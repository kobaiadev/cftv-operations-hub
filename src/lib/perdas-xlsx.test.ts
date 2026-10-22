import { describe, expect, it, vi } from "vitest";
import type { Loja } from "@/lib/cadastro-store";
import readXlsxFile, { type Row } from "read-excel-file/browser";
import { analisarPlanilhaPerdas } from "@/lib/perdas-xlsx";

vi.mock("read-excel-file/browser", () => ({
  default: vi.fn(),
}));

const lojas: Loja[] = [
  {
    id: "loja-9",
    nome: "Loja 09",
    gerente: "",
    endereco: "",
    estado: "SP",
    cidade: "São Paulo",
    telefone: "",
  },
];

function prepararPlanilha(linhas: unknown[][], nomeAba = "analise de dados") {
  vi.mocked(readXlsxFile).mockResolvedValue([{ sheet: nomeAba, data: linhas as Row[] }]);
}

describe("importação de planilhas de perdas", () => {
  it("lê cabeçalhos, associa lojas cadastradas e soma períodos repetidos", async () => {
    prepararPlanilha([
      ["Loja", "Ano", "Mês", "Perdas (Brt)"],
      ["Loja 09", 2025, "Janeiro", "R$ 1.234,56"],
      ["Loja 9", 2025, 1, 10.44],
    ]);
    const resultado = await analisarPlanilhaPerdas(new ArrayBuffer(1), lojas);

    expect(resultado.linhasLidas).toBe(2);
    expect(resultado.perdas).toEqual([{ lojaId: "loja-9", ano: 2025, mes: "01", valor: 1245 }]);
  });

  it("informa quando a planilha não contém a aba de análise solicitada", async () => {
    prepararPlanilha([["Loja"]], "Planilha1");
    await expect(analisarPlanilhaPerdas(new ArrayBuffer(1), lojas)).rejects.toThrow(
      'A planilha deve conter uma aba chamada "analise de dados".',
    );
  });

  it("rejeita a importação inteira quando há uma loja sem cadastro", async () => {
    prepararPlanilha([
      ["Loja", "Ano", "Mês", "Perdas (Brt)"],
      ["Loja 99", 2025, "Março", 50],
    ]);
    await expect(analisarPlanilhaPerdas(new ArrayBuffer(1), lojas)).rejects.toThrow(
      'Linha 2: A loja "Loja 99" não está cadastrada.',
    );
  });
});
