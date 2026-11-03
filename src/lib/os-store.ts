import { useSyncExternalStore } from "react";
import { registrarEstadoApp, salvarEstadoApp } from "@/lib/app-state";

export type Severity = "Baixa" | "Média" | "Alta";
export type OSStatus = "Aguardando Imagens" | "Em Análise" | "Concluída";

export type Reserva = {
  numero: string;
  imagemNome: string;
  vinculadaEm: string;
};

export type OS = {
  id: string;
  data: string;
  loja: string;
  setor: string;
  ocorrencia: string;
  descricao: string;
  gravidade: Severity;
  status: OSStatus;
  printNome?: string | undefined;
  reserva?: Reserva | undefined;
  bo?: BoletimOcorrencia | undefined;
  dadosAdicionais?: string | undefined;
  anexosNomes?: string[] | undefined;
};

export type BoletimOcorrencia = {
  numero: string;
  delegacia: string;
  data: string;
  imagemNome: string;
};

type State = { ordens: OS[] };

const KEY = "pp-os-v1";
const seed: State = {
  ordens: [
    {
      id: "OS-2481",
      data: "20/10/2026 18:42",
      loja: "Loja Centro",
      setor: "Açougue",
      ocorrencia: "Furto de carnes nobres",
      descricao: "Cliente identificado como João ocultou peças de picanha na mochila.",
      gravidade: "Alta",
      status: "Aguardando Imagens",
    },
    {
      id: "OS-2480",
      data: "20/10/2026 16:10",
      loja: "Loja Matriz",
      setor: "Frente de Caixa",
      ocorrencia: "Divergência de sangria",
      descricao: "Operadora Maria relatou diferença de R$ 200 na sangria do caixa 05.",
      gravidade: "Média",
      status: "Em Análise",
    },
    {
      id: "OS-2479",
      data: "20/10/2026 11:25",
      loja: "Loja Centro",
      setor: "Bebidas",
      ocorrencia: "Avaria de destilados",
      descricao: "Repositor derrubou caixa de whisky durante abastecimento.",
      gravidade: "Baixa",
      status: "Concluída",
    },
    {
      id: "OS-2478",
      data: "19/10/2026 21:03",
      loja: "Loja Matriz",
      setor: "Perfumaria",
      ocorrencia: "Violação de embalagem",
      descricao:
        "Embalagens de perfume abertas próximas ao corredor 12, suspeito saiu de carro prata.",
      gravidade: "Média",
      status: "Em Análise",
    },
    {
      id: "OS-2477",
      data: "19/10/2026 14:47",
      loja: "Loja Matriz",
      setor: "Recebimento",
      ocorrencia: "Falta em nota fiscal",
      descricao: "Motorista do caminhão entregou 3 volumes a menos que a nota.",
      gravidade: "Alta",
      status: "Concluída",
    },
  ],
};

let state: State = seed;
let loaded = false;
let persistVersion = 0;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch (error) {
    console.error("Não foi possível carregar as ordens de serviço salvas.", error);
  }
}
function set(next: State) {
  const anterior = state;
  const versao = ++persistVersion;
  state = next;
  listeners.forEach((l) => l());
  void salvarEstadoApp("os", next).catch((error: unknown) => {
    console.error("Não foi possível persistir as ordens de serviço.", error);
    if (persistVersion === versao) {
      state = anterior;
      listeners.forEach((listener) => listener());
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("app-state-error", {
          detail: error instanceof Error ? error.message : "Falha ao salvar ordens de serviço.",
        }),
      );
    }
  });
}

registrarEstadoApp("os", {
  snapshot: () => {
    load();
    return state;
  },
  legacySnapshot: () => {
    load();
    return typeof window !== "undefined" && localStorage.getItem(KEY) ? state : null;
  },
  emptySnapshot: () => ({ ordens: [] }) satisfies State,
  merge: (remote, legacy) => {
    const remoto = remote as State;
    const legado = legacy as State;
    const idsRemotos = new Set(remoto.ordens.map((ordem) => ordem.id));
    return {
      ...remoto,
      ordens: [...remoto.ordens, ...legado.ordens.filter((ordem) => !idsRemotos.has(ordem.id))],
    } satisfies State;
  },
  hydrate: (data) => {
    if (!data || typeof data !== "object" || !Array.isArray((data as State).ordens)) {
      throw new Error("Os dados remotos de ordens de serviço possuem formato inválido.");
    }
    state = data as State;
    loaded = true;
    listeners.forEach((listener) => listener());
  },
  legacyKey: KEY,
});

/** Gera o próximo número no formato OS-AAAA-NNN, reiniciando a sequência a cada ano. */
export function proximoNumeroOS(idsExistentes: string[], ano = new Date().getFullYear()): string {
  const prefixo = `OS-${ano}-`;
  const max = idsExistentes.reduce((acc, id) => {
    if (!id.startsWith(prefixo)) return acc;
    const n = parseInt(id.slice(prefixo.length), 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, 0);
  return `${prefixo}${String(max + 1).padStart(3, "0")}`;
}

function nextOSId(): string {
  return proximoNumeroOS(state.ordens.map((o) => o.id));
}

export function nowBR(): string {
  return new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function useOS() {
  const s = useSyncExternalStore(
    (l) => {
      load();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => seed,
  );
  return {
    ...s,
    addOS: (o: Omit<OS, "id" | "data" | "status"> & { data?: string; status?: OSStatus }): OS => {
      const nova: OS = {
        ...o,
        id: nextOSId(),
        data: o.data ?? nowBR(),
        status: o.status ?? (o.reserva ? "Em Análise" : "Aguardando Imagens"),
      };
      set({ ordens: [nova, ...state.ordens] });
      return nova;
    },
    linkReserva: (osId: string, reserva: Reserva) =>
      set({
        ordens: state.ordens.map((o) =>
          o.id === osId ? { ...o, reserva, status: "Em Análise" as OSStatus } : o,
        ),
      }),
    updateOS: (id: string, updates: Partial<Omit<OS, "id">>) =>
      set({ ordens: state.ordens.map((o) => (o.id === id ? { ...o, ...updates } : o)) }),
    removeOS: (id: string) => set({ ordens: state.ordens.filter((o) => o.id !== id) }),
  };
}
