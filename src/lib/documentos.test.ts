import { describe, expect, it } from "vitest";
import { ACEITE_IMAGEM_OU_PDF, ehImagemOuPdf } from "@/lib/documentos";

const arquivo = (name: string, type: string) => ({ name, type });

describe("documentos da ordem de serviço", () => {
  it("oferece imagens e PDF no seletor de arquivos", () => {
    expect(ACEITE_IMAGEM_OU_PDF).toContain("image/*");
    expect(ACEITE_IMAGEM_OU_PDF).toContain("application/pdf");
    expect(ACEITE_IMAGEM_OU_PDF).toContain(".pdf");
  });

  it.each([
    arquivo("requisicao.pdf", "application/pdf"),
    arquivo("documento.PDF", ""),
    arquivo("foto.jpg", "image/jpeg"),
    arquivo("print.png", "image/png"),
    arquivo("imagem-sem-mime.webp", ""),
  ])("aceita $name", (item) => {
    expect(ehImagemOuPdf(item)).toBe(true);
  });

  it.each([
    arquivo("planilha.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    arquivo("texto.txt", "text/plain"),
    arquivo("documento.docx", ""),
  ])("recusa $name", (item) => {
    expect(ehImagemOuPdf(item)).toBe(false);
  });
});
