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
const versoesEstado = new Map<AppNamespace, number>();

export function registrarEstadoApp(namespace: AppNamespace, adapter: StoreAdapter) {
  stores.set(namespace, adapter);
}

export async function sincronizarEstadoApp(role: string, userId: string) {
  const supabase = obterClienteSupabase();
  for (const [namespace, store] of stores) {
    const { data: row, error } = await supabase
      .from("app_state")
      .select("data, version")
      .eq("namespace", namespace)
      .maybeSingle();
    if (error) {
      throw new Error(`Não foi possível carregar os dados de ${namespace}: ${error.message}`);
    }

    if (row) {
      versoesEstado.set(namespace, row.version);
      const legacy = store.legacySnapshot();
      let data = row.data;
      if (legacy !== null && (role === "00" || role === "01")) {
        data = store.merge(row.data, legacy);
        if (JSON.stringify(data) !== JSON.stringify(row.data)) {
          localStorage.setItem(`${store.legacyKey}-migration-backup`, JSON.stringify(legacy));
          const { data: saved, error: mergeError } = await supabase
            .from("app_state")
            .update({
              data,
              version: row.version + 1,
              updated_at: new Date().toISOString(),
              updated_by: userId,
            })
            .eq("namespace", namespace)
            .eq("version", row.version)
            .select("version")
            .maybeSingle();
          if (mergeError) {
            throw new Error(
              `Não foi possível mesclar os dados locais de ${namespace}: ${mergeError.message}`,
            );
          }
          if (!saved) {
            throw new Error(
              `Os dados de ${namespace} foram alterados por outra sessão. Atualize a página antes de continuar.`,
            );
          }
          versoesEstado.set(namespace, saved.version);
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
          { namespace, data: dataInicial, version: 1, updated_by: userId },
          { onConflict: "namespace", ignoreDuplicates: true },
        );
      if (saveError) {
        throw new Error(`Não foi possível migrar os dados de ${namespace}: ${saveError.message}`);
      }

      const { data: saved, error: savedError } = await supabase
        .from("app_state")
        .select("data, version")
        .eq("namespace", namespace)
        .single();
      if (savedError) {
        throw new Error(
          `Não foi possível confirmar os dados de ${namespace}: ${savedError.message}`,
        );
      }
      versoesEstado.set(namespace, saved.version);
      const legacy = store.legacySnapshot();
      let dataSalva = saved.data;
      if (legacy !== null && (role === "00" || role === "01")) {
        if (JSON.stringify(saved.data) !== JSON.stringify(dataInicial)) {
          dataSalva = store.merge(saved.data, legacy);
          if (JSON.stringify(dataSalva) !== JSON.stringify(saved.data)) {
            localStorage.setItem(`${store.legacyKey}-migration-backup`, JSON.stringify(legacy));
            const { data: merged, error: mergeError } = await supabase
              .from("app_state")
              .update({
                data: dataSalva,
                version: saved.version + 1,
                updated_at: new Date().toISOString(),
                updated_by: userId,
              })
              .eq("namespace", namespace)
              .eq("version", saved.version)
              .select("version")
              .maybeSingle();
            if (mergeError) {
              throw new Error(
                `Não foi possível mesclar os dados locais de ${namespace}: ${mergeError.message}`,
              );
            }
            if (!merged) {
              throw new Error(
                `Os dados de ${namespace} foram alterados por outra sessão. Atualize a página antes de continuar.`,
              );
            }
            versoesEstado.set(namespace, merged.version);
          }
        }
        localStorage.removeItem(store.legacyKey);
      } else if (legacy !== null) {
        localStorage.setItem(`${store.legacyKey}-migration-backup`, JSON.stringify(legacy));
      }
      store.hydrate(dataSalva);
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
  void atual
    .finally(() => {
      if (gravacoes.get(namespace) === atual) gravacoes.delete(namespace);
    })
    .catch(() => {});
  return atual;
}

async function gravarEstadoApp(namespace: AppNamespace, data: unknown) {
  const supabase = obterClienteSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error("Sua sessão expirou. Entre novamente para salvar as alterações.");
  }

  let versaoAtual = versoesEstado.get(namespace);
  if (versaoAtual === undefined) {
    const { data: row, error: loadError } = await supabase
      .from("app_state")
      .select("version")
      .eq("namespace", namespace)
      .maybeSingle();
    if (loadError) {
      throw new Error(`Não foi possível validar a versão de ${namespace}: ${loadError.message}`);
    }

    if (row) {
      versaoAtual = row.version;
      versoesEstado.set(namespace, row.version);
    } else {
      const { error: insertError } = await supabase.from("app_state").insert({
        namespace,
        data,
        version: 1,
        updated_by: authData.user.id,
      });
      if (insertError) {
        throw new Error(`Não foi possível salvar ${namespace}: ${insertError.message}`);
      }
      versoesEstado.set(namespace, 1);
      return;
    }
  }

  if (versaoAtual === undefined) {
    throw new Error(`Não foi possível determinar a versão atual de ${namespace}.`);
  }
  const versaoEsperada = versaoAtual;

  const { data: saved, error } = await supabase
    .from("app_state")
    .update({
      data,
      version: versaoEsperada + 1,
      updated_at: new Date().toISOString(),
      updated_by: authData.user.id,
    })
    .eq("namespace", namespace)
    .eq("version", versaoEsperada)
    .select("version")
    .maybeSingle();
  if (error) throw new Error(`Não foi possível salvar ${namespace}: ${error.message}`);
  if (!saved) {
    throw new Error(
      `Os dados de ${namespace} foram alterados por outra sessão. Atualize a página e tente novamente.`,
    );
  }
  versoesEstado.set(namespace, saved.version);
}
