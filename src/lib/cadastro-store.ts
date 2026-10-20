import { useSyncExternalStore } from "react";

export type Loja = { id: string; codigo: string; nome: string; endereco: string; telefone: string };
export type Funcao = "gerente" | "fiscal" | "seguranca";
export type Pessoa = { id: string; funcao: Funcao; nome: string; matricula: string; telefone: string; lojaId: string; turno: string };

type State = { lojas: Loja[]; pessoas: Pessoa[] };

const KEY = "pp-cadastro-v1";
const seed: State = {
  lojas: [
    { id: "l1", codigo: "003", nome: "Matriz", endereco: "Av. Principal, 1000", telefone: "(11) 4000-0003" },
    { id: "l2", codigo: "014", nome: "Centro", endereco: "Rua XV de Novembro, 250", telefone: "(11) 4000-0014" },
  ],
  pessoas: [
    { id: "p1", funcao: "gerente", nome: "Carlos Mendes", matricula: "10234", telefone: "(11) 98888-1001", lojaId: "l1", turno: "Integral" },
    { id: "p2", funcao: "fiscal", nome: "Ana Souza", matricula: "20411", telefone: "(11) 98888-2002", lojaId: "l2", turno: "Manhã" },
    { id: "p3", funcao: "seguranca", nome: "Roberto Lima", matricula: "30987", telefone: "(11) 98888-3003", lojaId: "l2", turno: "Noite" },
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
const uid = () => Math.random().toString(36).slice(2, 10);

export function useCadastro() {
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
    addLoja: (l: Omit<Loja, "id">) => set({ ...state, lojas: [...state.lojas, { ...l, id: uid() }] }),
    removeLoja: (id: string) =>
      set({ lojas: state.lojas.filter((l) => l.id !== id), pessoas: state.pessoas.filter((p) => p.lojaId !== id) }),
    addPessoa: (p: Omit<Pessoa, "id">) => set({ ...state, pessoas: [...state.pessoas, { ...p, id: uid() }] }),
    removePessoa: (id: string) => set({ ...state, pessoas: state.pessoas.filter((p) => p.id !== id) }),
  };
}
