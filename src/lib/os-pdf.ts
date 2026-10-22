import type { OS } from "@/lib/os-store";
import { lerAnexos } from "@/lib/os-files";
import logoUrl from "@/assets/logo-nagumo.png";

// Paleta da plataforma (Nagumo) em RGB para impressão em fundo branco
const NAVY: [number, number, number] = [22, 38, 77];
const CYAN: [number, number, number] = [92, 196, 214];
const RED: [number, number, number] = [200, 30, 50];
const GRAY: [number, number, number] = [95, 105, 120];
const SEV: Record<string, [number, number, number]> = {
  Baixa: [34, 150, 80],
  Média: [200, 140, 0],
  Alta: [200, 50, 40],
};

async function carregar(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/** Gera e baixa o PDF completo da OS (dados + prints vinculados). */
export async function baixarPdfOS(os: OS) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 15;
  const CW = W - M * 2;
  let y = 0;

  const rodape = () => {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setDrawColor(...CYAN);
      doc.setLineWidth(0.4);
      doc.line(M, 284, W - M, 284);
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text("Nagumo · Prevenção de Perdas · Documento interno confidencial", M, 289);
      doc.text(`${os.id} · Página ${i} de ${n}`, W - M, 289, { align: "right" });
    }
  };

  const novaPagina = () => {
    doc.addPage();
    y = 20;
  };
  const garantir = (h: number) => {
    if (y + h > 278) novaPagina();
  };

  // Cabeçalho
  const logo = await carregar(logoUrl);
  const lw = 34;
  const lh = (logo.naturalHeight / logo.naturalWidth) * lw;
  doc.addImage(logo, "PNG", M, 12, lw, lh);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Relatório de Ordem de Serviço", W - M, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text("Prevenção de Perdas · Controle de OS e Reservas CFTV", W - M, 23, { align: "right" });
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, W - M, 27.5, { align: "right" });
  y = Math.max(12 + lh, 30) + 3;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(M, y, W - M, y);
  doc.setDrawColor(...CYAN);
  doc.setLineWidth(0.4);
  doc.line(M, y + 1.2, W - M, y + 1.2);
  y += 9;

  // Identificação
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text(os.id, M, y);
  const sev = SEV[os.gravidade] ?? GRAY;
  doc.setFontSize(9);
  const tag = `Gravidade ${os.gravidade}`;
  const tw = doc.getTextWidth(tag) + 6;
  doc.setDrawColor(...sev);
  doc.setTextColor(...sev);
  doc.roundedRect(W - M - tw, y - 5, tw, 7, 1.5, 1.5);
  doc.text(tag, W - M - tw / 2, y - 0.4, { align: "center" });
  y += 8;

  const secao = (titulo: string) => {
    garantir(14);
    doc.setFillColor(...NAVY);
    doc.rect(M, y, 1.2, 5.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    doc.text(titulo.toUpperCase(), M + 3.5, y + 4.2);
    y += 9;
  };

  const linhas = (pares: [string, string][]) => {
    for (const [k, v] of pares) {
      doc.setFontSize(9.5);
      const txt = doc.splitTextToSize(v || "—", CW - 48) as string[];
      garantir(txt.length * 4.6 + 2);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GRAY);
      doc.text(k, M + 2, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(25, 25, 35);
      doc.text(txt, M + 48, y);
      y += txt.length * 4.6 + 1.6;
      doc.setDrawColor(230, 232, 238);
      doc.setLineWidth(0.2);
      doc.line(M, y - 2.6, W - M, y - 2.6);
    }
    y += 4;
  };

  secao("Dados da ocorrência");
  linhas([
    ["Data / hora", os.data],
    ["Loja", os.loja],
    ["Setor", os.setor],
    ["Tipo de ocorrência", os.ocorrencia],
    ["Status", os.status],
    ["Descrição", os.descricao],
  ]);

  secao("Reserva de imagem (CFTV)");
  linhas(
    os.reserva
      ? [["Número da reserva", os.reserva.numero], ["Arquivo", os.reserva.imagemNome], ["Vinculada em", os.reserva.vinculadaEm]]
      : [["Reserva", "Não vinculada"]],
  );

  secao("Boletim de Ocorrência");
  linhas(
    os.bo
      ? [["Número do BO", os.bo.numero], ["Delegacia", os.bo.delegacia], ["Data do registro", os.bo.data]]
      : [["BO", "Não informado"]],
  );

  if (os.dadosAdicionais?.trim()) {
    secao("Dados adicionais lidos dos prints");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 50);
    const txt = doc.splitTextToSize(os.dadosAdicionais.trim(), CW - 4) as string[];
    for (const l of txt) {
      garantir(4.2);
      doc.text(l, M + 2, y);
      y += 4;
    }
    y += 4;
  }

  // Prints e anexos
  let anexos: Awaited<ReturnType<typeof lerAnexos>> = [];
  try {
    anexos = await lerAnexos(os.id);
  } catch {
    /* sem anexos */
  }
  if (anexos.length) {
    secao("Prints e documentos vinculados");
    for (const a of anexos) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      if (a.tipo.startsWith("image/")) {
        try {
          const img = await carregar(a.dataUrl);
          let w = CW;
          let h = (img.naturalHeight / img.naturalWidth) * w;
          if (h > 200) {
            h = 200;
            w = (img.naturalWidth / img.naturalHeight) * h;
          }
          garantir(h + 10);
          doc.setTextColor(...NAVY);
          doc.text(`${a.rotulo} — ${a.nome}`, M, y);
          y += 3;
          const fmt = a.tipo.includes("png") ? "PNG" : "JPEG";
          doc.addImage(a.dataUrl, fmt, M + (CW - w) / 2, y, w, h);
          doc.setDrawColor(210, 214, 222);
          doc.rect(M + (CW - w) / 2, y, w, h);
          y += h + 8;
          continue;
        } catch {
          /* cai para listagem por nome */
        }
      }
      garantir(8);
      doc.setTextColor(...NAVY);
      doc.text(`${a.rotulo} — ${a.nome}`, M, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text("(arquivo anexado no sistema; formato não visualizável no PDF)", M, y + 4.5);
      y += 10;
    }
  }

  // Assinaturas
  garantir(30);
  y += 14;
  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.3);
  doc.line(M, y, M + 75, y);
  doc.line(W - M - 75, y, W - M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text("Analista de Prevenção de Perdas", M + 37.5, y + 4.5, { align: "center" });
  doc.text("Diretoria / Gerência responsável", W - M - 37.5, y + 4.5, { align: "center" });
  void RED;

  rodape();
  doc.save(`${os.id}.pdf`);
}
