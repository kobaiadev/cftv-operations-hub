import { obterClienteSupabase } from "@/lib/supabase";
import { migrarArquivosLegados } from "@/lib/os-files";

export type AppNamespace = "os" | "cadastro" | "supervisoes";

type StoreAdapter = {
  snapshot: () => unknown;
  legacySnapshot: () => unknown | null;
  emptySnapshot: () => unknown;
  merge: (remote: unknown, legacy: unknown) => unknown;
  hydrate: (data: unknown) => void;
  legacyKey: string;
};

const stores = new Map<AppNamespace, StoreAdapter>();

export function registrarEstadoApp(namespace: AppNamespace, adapter: StoreAdapter) {
  stores.set(namespace, adapter);
}

export async function sincronizarEstadoApp(role: string, userId: string) {
  const supabase = obterClienteSupabase();
  for (const [namespace, store] of stores) {
    const { data: row, error } = await supabase
      .from("app_state")
      .select("data")
      .eq("namespace", namespace)
      .maybeSingle();
    if (error) {
      throw new Error(`Não foi possível carregar os dados de ${namespace}: ${error.message}`);
    }

    if (row) {
      const legacy = store.legacySnapshot();
      let data = row.data;
      if (legacy !== null && (role === "00" || role === "01")) {
        data = store.merge(row.data, legacy);
        if (JSON.stringify(data) !== JSON.stringify(row.data)) {
          localStorage.setItem(`${store.legacyKey}-migration-backup`, JSON.stringify(legacy));
          const { error: mergeError } = await supabase
            .from("app_state")
            .upsert({ namespace, data, updated_by: userId }, { onConflict: "namespace" });
          if (mergeError) {
            throw new Error(
              `Não foi possível mesclar os dados locais de ${namespace}: ${mergeError.message}`,
            );
          }
        }
        localStorage.removeItem(store.legacyKey);
      } else if (legacy !== null) {
        localStorage.setItem(`${store.legacyKey}-migration-backup`, JSON.stringify(legacy));
      }
      store.hydrate(data);
      continue;
    }

    if (role === "00" || role === "01") {
      const dataInicial = store.legacySnapshot() ?? store.snapshot();
      const { error: saveError } = await supabase
        .from("app_state")
        .upsert(
          { namespace, data: dataInicial, updated_by: userId },
          { onConflict: "namespace", ignoreDuplicates: true },
        );
      if (saveError) {
        throw new Error(`Não foi possível migrar os dados de ${namespace}: ${saveError.message}`);
      }

      const { data: saved, error: savedError } = await supabase
        .from("app_state")
        .select("data")
        .eq("namespace", namespace)
        .single();
      if (savedError) {
        throw new Error(
          `Não foi possível confirmar os dados de ${namespace}: ${savedError.message}`,
        );
      }
      store.hydrate(saved.data);
      localStorage.removeItem(store.legacyKey);
    } else {
      store.hydrate(store.emptySnapshot());
    }
  }
  if (role === "00" || role === "01") await migrarArquivosLegados();
}

const gravacoes = new Map<AppNamespace, Promise<void>>();

export function salvarEstadoApp(namespace: AppNamespace, data: unknown): Promise<void> {
  const anterior = gravacoes.get(namespace) ?? Promise.resolve();
  const atual = anterior.catch(() => {}).then(() => gravarEstadoApp(namespace, data));
  gravacoes.set(namespace, atual);
  void atual.finally(() => {
    if (gravacoes.get(namespace) === atual) gravacoes.delete(namespace);
  }).catch(() => {});
  return atual;
}

async function gravarEstadoApp(namespace: AppNamespace, data: unknown) {
  const { data: authData, error: authError } = await obterClienteSupabase().auth.getUser();
  if (authError || !authData.user) {
    throw new Error("Sua sessão expirou. Entre novamente para salvar as alterações.");
  }
  const { error } = await obterClienteSupabase()
    .from("app_state")
    .upsert({ namespace, data, updated_by: authData.user.id }, { onConflict: "namespace" });
  if (error) throw new Error(`Não foi possível salvar ${namespace}: ${error.message}`);
}
