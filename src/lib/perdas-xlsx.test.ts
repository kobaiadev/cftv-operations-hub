import { describe, expect, it, vi } from "vitest";
import type { Loja } from "@/lib/cadastro-store";
import readXlsxFile, { type Row } from "read-excel-file/browser";
import {
  analisarPlanilhaPerdas,
  resumirCoberturaPerdas,
  validarDuplicidadesPerdas,
} from "@/lib/perdas-xlsx";

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
  it("lê cabeçalhos e associa os períodos às lojas cadastradas", async () => {
    prepararPlanilha([
      ["Loja", "Ano", "Mês", "Perdas (Brt)"],
      ["Loja 09", 2025, "Janeiro", "R$ 1.234,56"],
    ]);
    const resultado = await analisarPlanilhaPerdas(new ArrayBuffer(1), lojas);

    expect(resultado.linhasLidas).toBe(1);
    expect(resultado.perdas).toEqual([{ lojaId: "loja-9", ano: 2025, mes: "01", valor: 1234.56 }]);
  });

  it("rejeita períodos repetidos na mesma planilha em vez de somar ou substituir valores", async () => {
    prepararPlanilha([
      ["Loja", "Ano", "Mês", "Perdas (Brt)"],
      ["Loja 09", 2025, "Janeiro", 100],
      ["Loja 9", 2025, 1, 200],
    ]);

    await expect(analisarPlanilhaPerdas(new ArrayBuffer(1), lojas)).rejects.toThrow(
      "Duplicidade de loja, ano e mês; o mesmo período já aparece na linha 2.",
    );
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

  it("detecta duplicidade com períodos já armazenados", () => {
    const duplicidades = validarDuplicidadesPerdas(
      [{ lojaId: "loja-9", ano: 2025, mes: "01", valor: 200 }],
      [{ id: "existente", lojaId: "loja-9", ano: 2025, mes: "01", valor: 100 }],
    );

    expect(duplicidades).toEqual(["loja-9:2025:01"]);
  });

  it("resume ano como OK apenas com os doze meses e lista os meses faltantes", () => {
    const resumo = resumirCoberturaPerdas(
      [
        ...Array.from({ length: 12 }, (_, indice) => ({
          lojaId: "loja-9",
          ano: 2024,
          mes: String(indice + 1).padStart(2, "0"),
        })),
        { lojaId: "loja-9", ano: 2025, mes: "01" },
      ],
      lojas,
    );

    expect(resumo).toEqual([
      {
        lojaId: "loja-9",
        loja: "Loja 09",
        ano: 2024,
        mesesCarregados: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"],
        mesesFaltantes: [],
      },
      {
        lojaId: "loja-9",
        loja: "Loja 09",
        ano: 2025,
        mesesCarregados: ["01"],
        mesesFaltantes: ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"],
      },
    ]);
  });
});
