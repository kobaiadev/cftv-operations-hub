import { describe, expect, it } from "vitest";
import {
  embaralhar,
  obterPerguntasDoTema,
  obterProgressoQuiz,
  perguntasQuiz,
  temasQuiz,
} from "@/lib/quiz-seguranca";

describe("quiz de segurança patrimonial", () => {
  it("oferece perguntas equilibradas para cada tema cadastrado", () => {
    for (const tema of temasQuiz) {
      const perguntas = obterPerguntasDoTema(tema.id);
      expect(perguntas).toHaveLength(5);
      expect(perguntas.map((pergunta) => pergunta.nivel)).toEqual([
        "Básico",
        "Básico",
        "Intermediário",
        "Intermediário",
        "Avançado",
      ]);
    }
  });

  it("define cinco alternativas, resposta válida e referência para cada pergunta", () => {
    for (const pergunta of perguntasQuiz) {
      expect(pergunta.opcoes).toHaveLength(5);
      expect(new Set(pergunta.opcoes).size).toBe(5);
      expect(pergunta.correta).toBeGreaterThanOrEqual(0);
      expect(pergunta.correta).toBeLessThan(pergunta.opcoes.length);
      expect(pergunta.artigo.length).toBeGreaterThan(0);
      expect(pergunta.url).toMatch(/^https:\/\/www\.planalto\.gov\.br\//);
    }
  });

  it("filtra as perguntas conforme a dificuldade selecionada", () => {
    for (const tema of temasQuiz) {
      const faceis = obterPerguntasDoTema(tema.id, "facil");
      const normais = obterPerguntasDoTema(tema.id, "normal");
      const dificeis = obterPerguntasDoTema(tema.id, "dificil");

      expect(faceis).toHaveLength(2);
      expect(faceis.every((pergunta) => pergunta.nivel === "Básico")).toBe(true);
      expect(normais).toHaveLength(4);
      expect(
        normais.every(
          (pergunta) => pergunta.nivel === "Básico" || pergunta.nivel === "Intermediário",
        ),
      ).toBe(true);
      expect(dificeis).toHaveLength(3);
      expect(
        dificeis.every(
          (pergunta) => pergunta.nivel === "Intermediário" || pergunta.nivel === "Avançado",
        ),
      ).toBe(true);
    }
  });

  it("embaralha sem modificar a lista original e mantém todos os itens", () => {
    const original = ["A", "B", "C", "D", "E"];
    const copia = [...original];
    const resultado = embaralhar(original, () => 0.4);

    expect(original).toEqual(copia);
    expect(resultado).toHaveLength(original.length);
    expect([...resultado].sort()).toEqual([...original].sort());
  });

  it("não altera a ordem com uma lista vazia ou de um único item", () => {
    expect(embaralhar([])).toEqual([]);
    expect(embaralhar(["único"])).toEqual(["único"]);
  });

  it.each([
    [0, 0, null],
    [9, 0, null],
    [10, 1, null],
    [19, 1, null],
    [20, 2, null],
    [99, 9, null],
    [100, 10, "bronze"],
    [499, 49, "bronze"],
    [500, 50, "prata"],
    [999, 99, "prata"],
    [1000, 100, "ouro"],
    [9990, 999, "ouro"],
    [10000, 1000, "ouro"],
    [11000, 1000, "ouro"],
  ] as const)("calcula nível e medalha para %i respostas", (respostas, nivel, medalha) => {
    const progresso = obterProgressoQuiz(respostas);
    expect(progresso.nivel).toBe(nivel);
    expect(progresso.medalha).toBe(medalha);
    expect(progresso.totalRespostas).toBe(respostas);
  });

  it("calcula quantas respostas faltam para nível e medalha seguintes", () => {
    expect(obterProgressoQuiz(7).respostasParaProximoNivel).toBe(3);
    expect(obterProgressoQuiz(10).respostasParaProximoNivel).toBe(10);
    expect(obterProgressoQuiz(19).respostasParaProximoNivel).toBe(1);
    expect(obterProgressoQuiz(99).respostasParaProximaMedalha).toBe(1);
    expect(obterProgressoQuiz(500).respostasParaProximaMedalha).toBe(500);
    expect(obterProgressoQuiz(1000).respostasParaProximaMedalha).toBe(0);
    expect(obterProgressoQuiz(-5).totalRespostas).toBe(0);
  });
});
