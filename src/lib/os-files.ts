// Armazena as imagens/arquivos vinculados a cada OS no IndexedDB do navegador
// (localStorage é pequeno demais para imagens).

export type Anexo = { rotulo: string; nome: string; tipo: string; dataUrl: string };

const DB = "pp-os-arquivos";
const STORE = "anexos";
const STORE_SUPERVISOES = "fotos-supervisao";
let bancoPromise: Promise<IDBDatabase> | undefined;

function abrir(): Promise<IDBDatabase> {
  if (bancoPromise) return bancoPromise;

  bancoPromise = new Promise((resolve, reject) => {
    let bloqueado = false;
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      if (!req.result.objectStoreNames.contains(STORE_SUPERVISOES)) {
        req.result.createObjectStore(STORE_SUPERVISOES);
      }
    };
    req.onsuccess = () => {
      const banco = req.result;
      if (bloqueado) {
        banco.close();
        return;
      }
      banco.onversionchange = () => {
        banco.close();
        bancoPromise = undefined;
      };
      resolve(banco);
    };
    req.onerror = () => {
      bancoPromise = undefined;
      reject(req.error ?? new Error("Não foi possível abrir o armazenamento de arquivos."));
    };
    req.onblocked = () => {
      bloqueado = true;
      bancoPromise = undefined;
      reject(new Error("O armazenamento de arquivos está bloqueado por outra aba."));
    };
  });

  return bancoPromise;
}

export async function salvarAnexos(osId: string, anexos: Anexo[]) {
  const db = await abrir();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(anexos, osId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function lerAnexos(osId: string): Promise<Anexo[]> {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(osId);
    req.onsuccess = () => resolve((req.result as Anexo[] | undefined) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function removerAnexos(osId: string) {
  const db = await abrir();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(osId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("A remoção dos anexos foi cancelada."));
  });
}

export async function salvarFotosSupervisao(supervisaoId: string, fotos: Blob[]) {
  const db = await abrir();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SUPERVISOES, "readwrite");
    tx.objectStore(STORE_SUPERVISOES).put(fotos, supervisaoId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("O salvamento das fotos foi cancelado."));
  });
}

export async function lerFotosSupervisao(supervisaoId: string): Promise<Blob[]> {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_SUPERVISOES).objectStore(STORE_SUPERVISOES).get(supervisaoId);
    req.onsuccess = () => resolve((req.result as Blob[] | undefined) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function removerFotosSupervisao(supervisaoId: string) {
  const db = await abrir();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SUPERVISOES, "readwrite");
    tx.objectStore(STORE_SUPERVISOES).delete(supervisaoId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("A remoção das fotos foi cancelada."));
  });
}

export function arquivoParaDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
}
