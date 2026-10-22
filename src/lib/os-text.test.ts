import { describe, expect, it } from "vitest";
import { interpretarTexto } from "@/lib/ocr";
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

  it("remove marcações sem descartar rótulos com valores", () => {
    expect(limparTextoCapturado("*Loja:* Nagumo Centro")).toBe("Loja: Nagumo Centro");
  });

  it("preserva determinações que começam com verbos usados também em botões", () => {
    expect(formatarTextoFormal("Encaminhar as imagens do período solicitado")).toBe(
      "Encaminhar as imagens do período solicitado.",
    );
    expect(limparTextoCapturado("Encaminhar...")).toBe("");
  });
});
