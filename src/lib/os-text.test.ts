import { describe, expect, it } from "vitest";
import { interpretarBO, interpretarTexto } from "@/lib/ocr";
import { formatarTextoFormal, limparTextoCapturado } from "@/lib/os-text";

describe("formatação de textos de OS", () => {
  it("remove marcação, emojis e ruídos de captura e organiza marcadores", () => {
    const texto = [
      "## *Furto* 🚨",
      "16:03",
      "Responder...",
      "- cliente relatou perda -- loja",
      "Bateria 87%",
      "16:04 4G 78%",
      "vc tá esperando pra falar com o gerente",
    ].join("\n");

    expect(formatarTextoFormal(texto)).toBe(
      "Furto.\n• Cliente relatou perda loja.\nVocê está esperando para falar com o Gerente.",
    );
  });

  it("preserva metadados e conteúdo útil ao limpar o texto do OCR", () => {
    const resultado = interpretarTexto(
      "**Loja Centro**\nFurto no açougue\nCliente relatou a ocorrência às 16:03.\nEncaminhar",
      ["Loja Centro"],
    );

    expect(resultado.loja).toBe("Loja Centro");
    expect(resultado.ocorrencia).toBe("Furto");
    expect(resultado.texto).not.toContain("**");
    expect(resultado.texto).not.toContain("Encaminhar");
  });

  it("completa dados da OS usando a descrição quando os prints não os identificam", () => {
    const resultado = interpretarTexto(
      "Informações incompletas no print.",
      ["Nagumo Centro"],
      "Data: 22/10/2026\nLoja: Nagumo Centro\nFurto no açougue.",
    );

    expect(resultado.data).toBe("22/10/2026");
    expect(resultado.loja).toBe("Nagumo Centro");
    expect(resultado.setor).toBe("Açougue");
    expect(resultado.ocorrencia).toBe("Furto");
    expect(resultado.gravidade).toBe("Alta");
  });

  it("prioriza dados dos prints em relação aos dados divergentes da descrição", () => {
    const resultado = interpretarTexto(
      "Data: 20/10/2026\nLoja: Nagumo Centro\nFurto no açougue.",
      ["Nagumo Centro", "Nagumo Matriz"],
      "Data: 22/10/2026\nLoja: Nagumo Matriz\nAvaria no depósito.",
    );

    expect(resultado.data).toBe("20/10/2026");
    expect(resultado.loja).toBe("Nagumo Centro");
    expect(resultado.ocorrencia).toBe("Furto");
    expect(resultado.setor).toBe("Açougue");
  });

  it("completa a loja por correspondência exata com o cadastro, ignorando diferenças de caixa e acento", () => {
    const resultado = interpretarTexto("Unidade: NÁGUMO CENTRO", [
      "Nagumo Central",
      "Nagumo Centro",
    ]);

    expect(resultado.loja).toBe("Nagumo Centro");
  });

  it("corrige um erro simples do OCR no nome da loja quando a correspondência é segura", () => {
    const resultado = interpretarTexto("Loja: Nagumo Centra", [
      "Nagumo Centro",
      "Nagumo Ponte Alta",
    ]);

    expect(resultado.loja).toBe("Nagumo Centro");
  });

  it("não escolhe uma loja se o texto do OCR combinar igualmente com mais de um cadastro", () => {
    const resultado = interpretarTexto("Loja: Nagumo Centra", ["Nagumo Centro", "Nagumo Central"]);

    expect(resultado.loja).toBe("");
  });

  it("não usa aproximação para localizar loja sem rótulo explícito", () => {
    const resultado = interpretarTexto("Relato da ocorrência em Nagumo Centra", ["Nagumo Centro"]);

    expect(resultado.loja).toBe("");
  });

  it("remove marcações sem descartar rótulos com valores", () => {
    expect(limparTextoCapturado("*Loja:* Nagumo Centro")).toBe("Loja: Nagumo Centro");
  });

  it("preserva determinações que começam com verbos usados também em botões", () => {
    expect(formatarTextoFormal("Encaminhar as imagens do período solicitado")).toBe(
      "Encaminhar as imagens do período solicitado.",
    );
    expect(limparTextoCapturado("Encaminhar...")).toBe("");
  });

  it("extrai o número de Chamado da solicitação de filmagem para vincular a reserva", () => {
    const resultado = interpretarTexto("Solicitação Filmagem (Chamado: 123456)", []);

    expect(resultado.reservaNumero).toBe("123456");
  });

  it("prioriza o número do Chamado em relação a outro número de reserva no print", () => {
    const resultado = interpretarTexto(
      "Reserva nº 98765\nSolicitação Filmagem (Chamado: 123456)",
      [],
    );

    expect(resultado.reservaNumero).toBe("123456");
  });

  it("prioriza a data do registro do BO e completa dados com outras imagens", () => {
    const resultado = interpretarBO(
      [
        "Boletim de Ocorrência nº 123456",
        "Data da ocorrência: 18/10/2026",
        "Data do registro: 20/10/2026",
      ].join("\n"),
      ["3º Distrito Policial"],
    );

    expect(resultado).toEqual({
      numero: "123456",
      delegacia: "3º Distrito Policial",
      data: "20/10/2026",
    });
  });

  it("busca os dados do BO nas demais imagens quando o print do BO não os contém", () => {
    const resultado = interpretarBO("", [
      "Número do BO: AB1234/2026\nDelegacia: 2º Distrito Policial\nData do registro: 21/10/2026",
    ]);

    expect(resultado).toEqual({
      numero: "AB1234/2026",
      delegacia: "2º Distrito Policial",
      data: "21/10/2026",
    });
  });

  it("não confunde a data da ocorrência de outra imagem com a data do registro do BO", () => {
    const resultado = interpretarBO("", ["Número do BO: 123456\nData da ocorrência: 18/10/2026"]);

    expect(resultado).toEqual({
      numero: "123456",
      delegacia: "",
      data: "",
    });
  });

  it("localiza a data do registro quando o OCR separa o rótulo e a data em linhas", () => {
    const resultado = interpretarBO("Número do BO: 123456\nData do registro:\n22.10.2026 14:35");

    expect(resultado.data).toBe("22/10/2026 14:35");
  });

  it("reconhece a data do registro em formato ISO", () => {
    const resultado = interpretarBO("Registro do BO\n2026-10-22");

    expect(resultado.data).toBe("22/10/2026");
  });
});
