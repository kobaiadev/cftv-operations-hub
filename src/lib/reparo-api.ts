import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type ImagemReparo = { rotulo: string; detalhes: string; path: string; tipo: string };
export type SolicitacaoReparo = {
  id: string;
  loja: string;
  empresa_responsavel: string;
  gerente: string;
  solicitante: string;
  glpi_numero: string;
  descricao: string;
  imagens: ImagemReparo[];
  created_at: string;
};

const BUCKET = "repair-images";
export const reparosQueryKey = ["solicitacoes-reparo"] as const;

export async function listarReparos(): Promise<SolicitacaoReparo[]> {
  const { data, error } = await supabase
    .from("repair_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    imagens: Array.isArray(r.imagens) ? (r.imagens as unknown as ImagemReparo[]) : [],
  }));
}

export type NovaSolicitacao = Omit<SolicitacaoReparo, "id" | "created_at" | "imagens"> & {
  arquivos: { rotulo: string; detalhes: string; file: File }[];
};

export type ResultadoReparo = { id: string; avisos: string[] };

async function removerArquivos(paths: string[], contexto: string): Promise<string[]> {
  if (paths.length === 0) return [];
  try {
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (!error) return [];
    console.error(contexto, error);
    return ["Alguns anexos não puderam ser removidos."];
  } catch (error) {
    console.error(contexto, error);
    return ["Alguns anexos não puderam ser removidos."];
  }
}

async function desfazerUploads(paths: string[], erroOriginal: unknown): Promise<never> {
  const avisos = await removerArquivos(paths, "Falha ao limpar anexos de reparo não salvos.");
  if (avisos.length > 0) {
    const mensagemOriginal =
      erroOriginal instanceof Error ? erroOriginal.message : String(erroOriginal);
    throw new Error(
      `${mensagemOriginal} Além disso, alguns anexos temporários não puderam ser removidos.`,
    );
  }
  throw erroOriginal;
}

export async function criarReparo(nova: NovaSolicitacao): Promise<ResultadoReparo> {
  const id = `SR-${Date.now().toString().slice(-6)}-${crypto.randomUUID().slice(0, 8)}`;
  const imagens: ImagemReparo[] = [];
  const enviados: string[] = [];
  try {
    for (const [i, a] of nova.arquivos.entries()) {
      const ext =
        a.file.name
          .split(".")
          .pop()
          ?.replace(/[^a-z0-9]/gi, "") || "png";
      const path = `${id}/${i + 1}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, a.file, { contentType: a.file.type, upsert: false });
      if (error) throw error;
      enviados.push(path);
      imagens.push({ rotulo: a.rotulo, detalhes: a.detalhes, path, tipo: a.file.type });
    }
    const { arquivos: _a, ...campos } = nova;
    const { error } = await supabase
      .from("repair_requests")
      .insert({ ...campos, id, imagens: imagens as never });
    if (error) throw error;
    return { id, avisos: [] };
  } catch (error) {
    return desfazerUploads(enviados, error);
  }
}

export async function excluirReparo(id: string): Promise<string[]> {
  const { data: row, error: loadError } = await supabase
    .from("repair_requests")
    .select("imagens")
    .eq("id", id)
    .maybeSingle();
  if (loadError) throw loadError;

  const { error } = await supabase.from("repair_requests").delete().eq("id", id);
  if (error) throw error;

  const imagens = Array.isArray(row?.imagens) ? (row.imagens as unknown as ImagemReparo[]) : [];
  return removerArquivos(
    imagens.map((imagem) => imagem.path),
    `Falha ao limpar anexos da solicitação ${id}.`,
  );
}

export async function atualizarReparo(
  id: string,
  nova: NovaSolicitacao,
  existentes: ImagemReparo[],
): Promise<ResultadoReparo> {
  const imagens = [...existentes];
  const enviados: string[] = [];
  try {
    for (const a of nova.arquivos) {
      const path = `${id}/${crypto.randomUUID()}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, a.file, { contentType: a.file.type });
      if (error) throw error;
      enviados.push(path);
      const index = imagens.findIndex((img) => img.rotulo === a.rotulo);
      const img = { rotulo: a.rotulo, detalhes: a.detalhes, path, tipo: a.file.type };
      if (index < 0) imagens.push(img);
      else imagens[index] = img;
    }
    const { arquivos: _arquivos, solicitante: _solicitante, ...campos } = nova;
    const { error } = await supabase
      .from("repair_requests")
      .update({ ...campos, imagens: imagens as unknown as Json })
      .eq("id", id)
      .select("id")
      .single();
    if (error) throw error;
    const pathsAtuais = new Set(imagens.map((imagem) => imagem.path));
    const pathsSubstituidos = existentes
      .filter((imagem) => !pathsAtuais.has(imagem.path))
      .map((imagem) => imagem.path);
    const avisos = await removerArquivos(
      pathsSubstituidos,
      `Falha ao limpar anexos substituídos da solicitação ${id}.`,
    );
    return { id, avisos };
  } catch (error) {
    return desfazerUploads(enviados, error);
  }
}

/** Baixa as imagens como data URL para incorporar no PDF. */
export async function carregarImagensReparo(imagens: ImagemReparo[]) {
  const out: { rotulo: string; detalhes: string; tipo: string; dataUrl: string }[] = [];
  for (const img of imagens) {
    const { data, error } = await supabase.storage.from(BUCKET).download(img.path);
    if (error || !data) {
      throw new Error(
        `Não foi possível carregar o anexo "${img.rotulo}"${error ? `: ${error.message}` : "."}`,
      );
    }
    const dataUrl = await new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(data);
    });
    out.push({ rotulo: img.rotulo, detalhes: img.detalhes, tipo: img.tipo, dataUrl });
  }
  return out;
}
