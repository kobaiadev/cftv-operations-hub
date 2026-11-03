import { supabase } from "@/integrations/supabase/client";

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

export async function criarReparo(nova: NovaSolicitacao): Promise<string> {
  const id = `SR-${Date.now().toString().slice(-6)}`;
  const imagens: ImagemReparo[] = [];
  for (const [i, a] of nova.arquivos.entries()) {
    const ext = a.file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "png";
    const path = `${id}/${i + 1}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, a.file, { contentType: a.file.type, upsert: false });
    if (error) throw error;
    imagens.push({ rotulo: a.rotulo, detalhes: a.detalhes, path, tipo: a.file.type });
  }
  const { arquivos: _a, ...campos } = nova;
  const { error } = await supabase
    .from("repair_requests")
    .insert({ ...campos, id, imagens: imagens as never });
  if (error) throw error;
  return id;
}

export async function excluirReparo(id: string) {
  const { error } = await supabase.from("repair_requests").delete().eq("id", id);
  if (error) throw error;
}

export async function atualizarReparo(id: string, nova: NovaSolicitacao, existentes: ImagemReparo[]): Promise<string> {
  const imagens = [...existentes];
  const enviados: string[] = [];
  try {
    for (const a of nova.arquivos) {
      const path = `${id}/${crypto.randomUUID()}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, a.file, { contentType: a.file.type });
      if (error) throw error;
      enviados.push(path);
      const index = imagens.findIndex((img) => img.rotulo === a.rotulo);
      const img = { rotulo: a.rotulo, detalhes: a.detalhes, path, tipo: a.file.type };
      if (index < 0) imagens.push(img);
      else imagens[index] = img;
    }
    const { arquivos: _arquivos, solicitante: _solicitante, ...campos } = nova;
    const { error } = await supabase.from("repair_requests").update({ ...campos, imagens }).eq("id", id).select("id").single();
    if (error) throw error;
    return id;
  } catch (error) {
    if (enviados.length) await supabase.storage.from(BUCKET).remove(enviados);
    throw error;
  }
}

/** Baixa as imagens como data URL para incorporar no PDF. */
export async function carregarImagensReparo(imagens: ImagemReparo[]) {
  const out: { rotulo: string; detalhes: string; tipo: string; dataUrl: string }[] = [];
  for (const img of imagens) {
    const { data, error } = await supabase.storage.from(BUCKET).download(img.path);
    if (error || !data) {
      console.error("Falha ao baixar imagem da solicitação", error);
      continue;
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
