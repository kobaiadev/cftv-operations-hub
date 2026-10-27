import { useSyncExternalStore } from "react";
import type { TipoSupervisor } from "@/lib/cadastro-store";
import { registrarEstadoApp, salvarEstadoApp } from "@/lib/app-state";

export type FotoSupervisao = {
  nome: string;
  capturadaEm: string;
  latitude: number;
  longitude: number;
  precisaoMetros: number;
};

export type Supervisao = {
  id: string;
  supervisorNome: string;
  supervisorId?: string | undefined;
  tipoSupervisor?: TipoSupervisor | undefined;
  empresaId?: string | undefined;
  dataHora: string;
  observacoes: string;
  fotos: FotoSupervisao[];
};

const KEY = "pp-supervisoes-v1";
const vazio: Supervisao[] = [];
const listeners = new Set<() => void>();
let supervisoes: Supervisao[] = [];
let carregado = false;
let persistVersion = 0;

function carregar() {
  if (carregado || typeof window === "undefined") return;
  carregado = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const dados: unknown = JSON.parse(raw);
      if (!Array.isArray(dados))
        throw new Error("O formato dos registros de supervisão é inválido.");
      supervisoes = dados as Supervisao[];
    }
  } catch (error) {
    console.error("Não foi possível carregar os registros de supervisão.", error);
  }
}

function publicar(proximas: Supervisao[]) {
  const anteriores = supervisoes;
  const versao = ++persistVersion;
  supervisoes = proximas;
  listeners.forEach((listener) => listener());
  void salvarEstadoApp("supervisoes", proximas).catch((error: unknown) => {
    console.error("Não foi possível persistir os registros de supervisão.", error);
    if (persistVersion === versao) {
      supervisoes = anteriores;
      listeners.forEach((listener) => listener());
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("app-state-error", {
          detail: error instanceof Error ? error.message : "Falha ao salvar supervisões.",
        }),
      );
    }
  });
}

registrarEstadoApp("supervisoes", {
  snapshot: () => {
    carregar();
    return supervisoes;
  },
  legacySnapshot: () => {
    carregar();
    return typeof window !== "undefined" && localStorage.getItem(KEY) ? supervisoes : null;
  },
  emptySnapshot: () => [],
  merge: (remote, legacy) => {
    const remoto = remote as Supervisao[];
    const legado = legacy as Supervisao[];
    const idsRemotos = new Set(remoto.map((registro) => registro.id));
    return [...remoto, ...legado.filter((registro) => !idsRemotos.has(registro.id))];
  },
  hydrate: (data) => {
    if (!Array.isArray(data)) {
      throw new Error("Os registros remotos de supervisão possuem formato inválido.");
    }
    supervisoes = data as Supervisao[];
    carregado = true;
    listeners.forEach((listener) => listener());
  },
  legacyKey: KEY,
});

const novoId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useSupervisoes() {
  const registros = useSyncExternalStore(
    (listener) => {
      carregar();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => supervisoes,
    () => vazio,
  );

  return {
    supervisoes: registros,
    addSupervisao: (registro: Omit<Supervisao, "id">, id = novoId()) => {
      const nova = { ...registro, id };
      publicar([nova, ...supervisoes]);
      return nova;
    },
    removeSupervisao: (id: string) =>
      publicar(supervisoes.filter((supervisao) => supervisao.id !== id)),
  };
}
