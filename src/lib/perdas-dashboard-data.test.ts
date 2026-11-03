import { describe, expect, it } from "vitest";
import type { Loja, Perda } from "@/lib/cadastro-store";
import {
  agruparLojas,
  criarDadosComparativoLojas,
  criarDadosParticipacao,
  obterLojasParaGrafico,
  unificarPerdasPorLoja,
} from "@/lib/perdas-dashboard-data";

const perdas: Perda[] = [
  { id: "1", lojaId: "loja-1", mes: "01", ano: 2024, valor: 100 },
  { id: "2", lojaId: "loja-36", mes: "01", ano: 2024, valor: 50 },
  { id: "3", lojaId: "loja-1", mes: "01", ano: 2025, valor: 200 },
  { id: "4", lojaId: "loja-36", mes: "01", ano: 2025, valor: 300 },
];

const lojasDuplicadas: Loja[] = [
  {
    id: "cadastro-36-a",
    nome: "Loja 36",
    gerente: "",
    endereco: "",
    estado: "RJ",
    cidade: "Volta Redonda",
    telefone: "",
  },
  {
    id: "cadastro-36-b",
    nome: "LOJA 036",
    gerente: "",
    endereco: "",
    estado: "RJ",
    cidade: "Volta Redonda",
    telefone: "",
  },
  {
    id: "cadastro-10",
    nome: "Loja 10",
    gerente: "",
    endereco: "",
    estado: "RJ",
    cidade: "Barra Mansa",
    telefone: "",
  },
];

describe("dados do painel de perdas", () => {
  it("exibe uma única opção por loja mesmo com nomes repetidos ou zeros à esquerda", () => {
    expect(agruparLojas(lojasDuplicadas)).toEqual([
      { chave: "loja-10", nome: "Loja 10", ids: ["cadastro-10"] },
      { chave: "loja-36", nome: "Loja 36", ids: ["cadastro-36-a", "cadastro-36-b"] },
    ]);
  });

  it("consolida lançamentos de IDs duplicados sob a mesma referência de loja", () => {
    const lancamentosDuplicados: Perda[] = [
      { id: "a", lojaId: "cadastro-36-a", mes: "01", ano: 2025, valor: 120 },
      { id: "b", lojaId: "cadastro-36-b", mes: "01", ano: 2025, valor: 80 },
    ];

    expect(unificarPerdasPorLoja(lancamentosDuplicados, lojasDuplicadas)).toEqual([
      { id: "a", lojaId: "loja-36", mes: "01", ano: 2025, valor: 120 },
      { id: "b", lojaId: "loja-36", mes: "01", ano: 2025, valor: 80 },
    ]);
    expect(
      obterLojasParaGrafico(
        unificarPerdasPorLoja(lancamentosDuplicados, lojasDuplicadas),
        "loja-36",
        "todos",
      ),
    ).toEqual(["loja-36"]);
  });

  it("mostra a loja escolhida em todos os anos, mesmo quando não está entre as maiores", () => {
    expect(obterLojasParaGrafico(perdas, "loja-36", "todos")).toEqual(["loja-36"]);
    expect(
      criarDadosComparativoLojas(
        perdas,
        ["loja-36"],
        [2024, 2025],
        new Map([["loja-36", "Loja 36"]]),
      ),
    ).toEqual([{ loja: "Loja 36", "2024": 50, "2025": 300 }]);
  });

  it("limita o comparativo ao ano selecionado e mantém a loja selecionada", () => {
    expect(obterLojasParaGrafico(perdas, "loja-36", "2024")).toEqual(["loja-36"]);
    expect(obterLojasParaGrafico(perdas, "loja-inexistente", "2024")).toEqual([]);
  });

  it("calcula a participação da loja selecionada em cada ano filtrado", () => {
    const resultado = criarDadosParticipacao(perdas, [2025], "loja-36");

    expect(resultado.lojas).toContain("loja-36");
    expect(resultado.dados).toEqual([{ ano: 2025, "loja-1": 40, "loja-36": 60, demais: 0 }]);
  });

  it("mantém o total da rede na participação quando todas as lojas estão selecionadas", () => {
    const resultado = criarDadosParticipacao(perdas, [2024], "todas");

    expect(resultado.dados).toEqual([
      { ano: 2024, "loja-1": 66.66666666666666, "loja-36": 33.33333333333333, demais: 0 },
    ]);
  });
});
