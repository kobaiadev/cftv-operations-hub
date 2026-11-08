export const ACEITE_IMAGEM_OU_PDF = "image/*,application/pdf,.pdf";

const EXTENSOES_IMAGEM = /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|svg|tiff?|webp)$/i;

export function ehArquivoPdf(arquivo: Pick<File, "name" | "type">) {
  const tipo = arquivo.type.toLocaleLowerCase();
  return tipo === "application/pdf" || tipo === "application/x-pdf" || /\.pdf$/i.test(arquivo.name);
}

export function ehImagemOuPdf(arquivo: Pick<File, "name" | "type">) {
  const tipo = arquivo.type.toLocaleLowerCase();
  return (
    tipo.startsWith("image/") ||
    ehArquivoPdf(arquivo) ||
    (tipo === "" && EXTENSOES_IMAGEM.test(arquivo.name))
  );
}
