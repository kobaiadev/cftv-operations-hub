import { obterClienteSupabase } from "@/lib/supabase";

export type Anexo = { rotulo: string; nome: string; tipo: string; dataUrl: string };
type AttachmentRow = {
  id: string;
  entity_type: "os" | "supervisao";
  entity_id: string;
  label: string;
  file_name: string;
  content_type: string;
  storage_path: string;
};

const BUCKET = "private-attachments";
const LEGACY_DB = "pp-os-arquivos";
const LEGACY_OS_STORE = "anexos";
const LEGACY_SUPERVISION_STORE = "fotos-supervisao";

function nomeSeguro(nome: string) {
  return nome.replace(/[^\p{L}\p{N}._-]/gu, "_").slice(0, 120) || "arquivo";
}

async function obterAnexos(entityType: AttachmentRow["entity_type"], entityId: string) {
  const { data, error } = await obterClienteSupabase()
    .from("app_attachments")
    .select("id, entity_type, entity_id, label, file_name, content_type, storage_path")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  if (error) throw new Error(`Não foi possível carregar os anexos: ${error.message}`);
  return (data ?? []) as AttachmentRow[];
}

async function baixarConteudoParaVisualizacao(id: string) {
  const supabase = obterClienteSupabase();
  const { data, error } = await supabase.auth.getSession();
  const session = data.session;
  const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (error || !session || !url || !apiKey) {
    throw new Error("Sua sessão expirou; entre novamente para abrir este anexo.");
  }
  const response = await fetch(`${url}/functions/v1/view-attachment?id=${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: apiKey },
  });
  if (!response.ok) {
    const mensagem = await response.text();
    throw new Error(mensagem || "Não foi possível carregar o anexo.");
  }
  return response.blob();
}

function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function excluirAnexos(entityType: AttachmentRow["entity_type"], entityId: string) {
  const existentes = await obterAnexos(entityType, entityId);
  if (!existentes.length) return;
  const { error: storageError } = await obterClienteSupabase()
    .storage.from(BUCKET)
    .remove(existentes.map((item) => item.storage_path));
  if (storageError) throw new Error(`Não foi possível remover arquivos: ${storageError.message}`);
  const { error } = await obterClienteSupabase()
    .from("app_attachments")
    .delete()
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  if (error) throw new Error(`Não foi possível remover os registros de anexos: ${error.message}`);
}

async function adicionarArquivo(
  entityType: AttachmentRow["entity_type"],
  entityId: string,
  label: string,
  fileName: string,
  file: Blob,
) {
  const storagePath = `${entityType}/${entityId}/${crypto.randomUUID()}-${nomeSeguro(fileName)}`;
  const contentType = file.type || "application/octet-stream";
  const { error: uploadError } = await obterClienteSupabase()
    .storage.from(BUCKET)
    .upload(storagePath, file, { contentType, upsert: false });
  if (uploadError) throw new Error(`Não foi possível enviar "${fileName}": ${uploadError.message}`);

  const { data, error: insertError } = await obterClienteSupabase()
    .from("app_attachments")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      label,
      file_name: fileName,
      content_type: contentType,
      storage_path: storagePath,
    })
    .select("id")
    .single();
  if (insertError) {
    const { error: cleanupError } = await obterClienteSupabase()
      .storage.from(BUCKET)
      .remove([storagePath]);
    if (cleanupError) {
      console.error(
        "Não foi possível limpar o arquivo após erro ao salvar metadados.",
        cleanupError,
      );
    }
    throw new Error(`Não foi possível registrar "${fileName}": ${insertError.message}`);
  }
  return data.id as string;
}

async function blobDaDataUrl(dataUrl: string) {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error("Não foi possível ler o arquivo selecionado.");
  return response.blob();
}

export async function salvarAnexos(osId: string, anexos: Anexo[]) {
  const carregados: string[] = [];
  try {
    for (const anexo of anexos) {
      const blob = await blobDaDataUrl(anexo.dataUrl);
      carregados.push(await adicionarArquivo("os", osId, anexo.rotulo, anexo.nome, blob));
    }
    const antigos = await obterAnexos("os", osId);
    const idsNovos = new Set(carregados);
    const registrosAntigos = antigos.filter((item) => !idsNovos.has(item.id));
    if (registrosAntigos.length) {
      const { error: storageError } = await obterClienteSupabase()
        .storage.from(BUCKET)
        .remove(registrosAntigos.map((item) => item.storage_path));
      if (storageError)
        throw new Error(`Não foi possível substituir os anexos: ${storageError.message}`);
      const { error } = await obterClienteSupabase()
        .from("app_attachments")
        .delete()
        .in(
          "id",
          registrosAntigos.map((item) => item.id),
        );
      if (error) throw new Error(`Não foi possível atualizar os anexos: ${error.message}`);
    }
  } catch (error) {
    const novos = await obterClienteSupabase()
      .from("app_attachments")
      .select("id, storage_path")
      .in("id", carregados);
    if (!novos.error && novos.data?.length) {
      const { error: cleanupError } = await obterClienteSupabase()
        .storage.from(BUCKET)
        .remove(novos.data.map((item) => item.storage_path));
      if (cleanupError) console.error("Falha ao remover uploads incompletos.", cleanupError);
      const { error: metadataError } = await obterClienteSupabase()
        .from("app_attachments")
        .delete()
        .in("id", carregados);
      if (metadataError)
        console.error("Falha ao remover metadados de uploads incompletos.", metadataError);
    }
    throw error;
  }
}

export async function lerAnexos(osId: string): Promise<Anexo[]> {
  const rows = await obterAnexos("os", osId);
  return Promise.all(
    rows.map(async (row) => ({
      rotulo: row.label,
      nome: row.file_name,
      tipo: row.content_type,
      dataUrl: await blobParaDataUrl(await baixarConteudoParaVisualizacao(row.id)),
    })),
  );
}

export async function removerAnexos(osId: string) {
  await excluirAnexos("os", osId);
}

export async function salvarFotosSupervisao(supervisaoId: string, fotos: Blob[]) {
  const carregados: string[] = [];
  try {
    for (const [indice, foto] of fotos.entries()) {
      carregados.push(
        await adicionarArquivo(
          "supervisao",
          supervisaoId,
          `Foto ${indice + 1}`,
          `foto-${indice + 1}.jpg`,
          foto,
        ),
      );
    }
  } catch (error) {
    const { data, error: queryError } = await obterClienteSupabase()
      .from("app_attachments")
      .select("id, storage_path")
      .in("id", carregados);
    if (!queryError && data?.length) {
      const { error: cleanupError } = await obterClienteSupabase()
        .storage.from(BUCKET)
        .remove(data.map((item) => item.storage_path));
      if (cleanupError) console.error("Falha ao limpar fotos incompletas.", cleanupError);
      const { error: metadataError } = await obterClienteSupabase()
        .from("app_attachments")
        .delete()
        .in("id", carregados);
      if (metadataError)
        console.error("Falha ao limpar metadados de fotos incompletas.", metadataError);
    }
    throw error;
  }
}

export async function lerFotosSupervisao(supervisaoId: string): Promise<Blob[]> {
  const rows = await obterAnexos("supervisao", supervisaoId);
  return Promise.all(
    rows.map(async (row) => {
      return baixarConteudoParaVisualizacao(row.id);
    }),
  );
}

export async function removerFotosSupervisao(supervisaoId: string) {
  await excluirAnexos("supervisao", supervisaoId);
}

export async function migrarArquivosLegados() {
  const legacyDb = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DB, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(LEGACY_OS_STORE)) {
        request.result.createObjectStore(LEGACY_OS_STORE);
      }
      if (!request.result.objectStoreNames.contains(LEGACY_SUPERVISION_STORE)) {
        request.result.createObjectStore(LEGACY_SUPERVISION_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Não foi possível abrir os anexos locais."));
  });

  try {
    const lerEntradas = async <T>(storeName: string) =>
      new Promise<[IDBValidKey, T][]>((resolve, reject) => {
        const transaction = legacyDb.transaction(storeName);
        const store = transaction.objectStore(storeName);
        const keysRequest = store.getAllKeys();
        const valuesRequest = store.getAll();
        transaction.oncomplete = () =>
          resolve(keysRequest.result.map((key, index) => [key, valuesRequest.result[index] as T]));
        transaction.onerror = () =>
          reject(transaction.error ?? new Error("Não foi possível ler os anexos locais."));
      });

    const anexosOS = await lerEntradas<Anexo[]>(LEGACY_OS_STORE);
    for (const [key, anexos] of anexosOS) {
      const osId = String(key);
      const atuais = await obterAnexos("os", osId);
      const nomesAtuais = new Set(atuais.map((item) => `${item.label}:${item.file_name}`));
      for (const anexo of anexos) {
        if (nomesAtuais.has(`${anexo.rotulo}:${anexo.nome}`)) continue;
        await adicionarArquivo(
          "os",
          osId,
          anexo.rotulo,
          anexo.nome,
          await blobDaDataUrl(anexo.dataUrl),
        );
      }
    }

    const fotosSupervisao = await lerEntradas<Blob[]>(LEGACY_SUPERVISION_STORE);
    for (const [key, fotos] of fotosSupervisao) {
      const supervisaoId = String(key);
      const atuais = await obterAnexos("supervisao", supervisaoId);
      const indicesAtuais = new Set(
        atuais
          .map((item) => item.file_name.match(/^foto-(\d+)\.jpg$/)?.[1])
          .filter((indice): indice is string => Boolean(indice)),
      );
      for (const [indice, foto] of fotos.entries()) {
        const nome = `foto-${indice + 1}.jpg`;
        if (indicesAtuais.has(String(indice + 1))) continue;
        await adicionarArquivo("supervisao", supervisaoId, `Foto ${indice + 1}`, nome, foto);
      }
    }
  } finally {
    legacyDb.close();
  }
}

export function arquivoParaDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
}
