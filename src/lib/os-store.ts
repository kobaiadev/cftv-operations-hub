import { useSyncExternalStore } from "react";

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
    { id: "OS-2481", data: "20/10/2026 18:42", loja: "Loja Centro", setor: "Açougue", ocorrencia: "Furto de carnes nobres", descricao: "Cliente identificado como João ocultou peças de picanha na mochila.", gravidade: "Alta", status: "Aguardando Imagens" },
    { id: "OS-2480", data: "20/10/2026 16:10", loja: "Loja Matriz", setor: "Frente de Caixa", ocorrencia: "Divergência de sangria", descricao: "Operadora Maria relatou diferença de R$ 200 na sangria do caixa 05.", gravidade: "Média", status: "Em Análise" },
    { id: "OS-2479", data: "20/10/2026 11:25", loja: "Loja Centro", setor: "Bebidas", ocorrencia: "Avaria de destilados", descricao: "Repositor derrubou caixa de whisky durante abastecimento.", gravidade: "Baixa", status: "Concluída" },
    { id: "OS-2478", data: "19/10/2026 21:03", loja: "Loja Matriz", setor: "Perfumaria", ocorrencia: "Violação de embalagem", descricao: "Embalagens de perfume abertas próximas ao corredor 12, suspeito saiu de carro prata.", gravidade: "Média", status: "Em Análise" },
    { id: "OS-2477", data: "19/10/2026 14:47", loja: "Loja Matriz", setor: "Recebimento", ocorrencia: "Falta em nota fiscal", descricao: "Motorista do caminhão entregou 3 volumes a menos que a nota.", gravidade: "Alta", status: "Concluída" },
  ],
};

let state: State = seed;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch {
    /* ignore */
  }
}
function set(next: State) {
  state = next;
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

function nextOSId(): string {
  const max = state.ordens.reduce((acc, o) => {
    const n = parseInt(o.id.replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, 2481);
  return `OS-${max + 1}`;
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
      l();
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
    removeOS: (id: string) => set({ ordens: state.ordens.filter((o) => o.id !== id) }),
  };
}
