import { useSyncExternalStore } from "react";
import type { TipoSupervisor } from "@/lib/cadastro-store";

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
  localStorage.setItem(KEY, JSON.stringify(proximas));
  supervisoes = proximas;
  listeners.forEach((listener) => listener());
}

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
