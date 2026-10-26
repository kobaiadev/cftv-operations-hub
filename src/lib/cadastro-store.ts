import { useSyncExternalStore } from "react";

export type Loja = {
  id: string;
  nome: string;
  gerente: string;
  endereco: string;
  estado: string;
  cidade: string;
  telefone: string;
};
export type Funcao = "fiscal" | "seguranca";
export type Pessoa = {
  id: string;
  funcao: Funcao;
  nome: string;
  matricula: string;
  telefone: string;
  lojaId: string;
  turno: string;
};
export type Perda = { id: string; lojaId: string; mes: string; ano: number; valor: number };
export type Empresa = { id: string; nome: string; cnpj: string };
export type TipoSupervisor = "NAGUMO" | "EXTERNO";
export type Supervisor = {
  id: string;
  nome: string;
  tipo: TipoSupervisor;
  regiao?: string;
  empresaId?: string;
};

type State = {
  lojas: Loja[];
  pessoas: Pessoa[];
  perdas: Perda[];
  empresas: Empresa[];
  supervisores: Supervisor[];
};

const KEY = "pp-cadastro-v2";
const seed: State = {
  lojas: [
    {
      id: "l1",
      nome: "Loja Matriz",
      gerente: "Carlos Mendes",
      endereco: "Av. Principal, 1000",
      estado: "SP",
      cidade: "São Paulo",
      telefone: "(11) 4000-0003",
    },
    {
      id: "l2",
      nome: "Loja Centro",
      gerente: "Fernanda Rocha",
      endereco: "Rua XV de Novembro, 250",
      estado: "SP",
      cidade: "Guarulhos",
      telefone: "(11) 4000-0014",
    },
  ],
  pessoas: [
    {
      id: "p1",
      funcao: "fiscal",
      nome: "Ana Souza",
      matricula: "20411",
      telefone: "(11) 98888-2002",
      lojaId: "l2",
      turno: "Manhã",
    },
    {
      id: "p2",
      funcao: "seguranca",
      nome: "Roberto Lima",
      matricula: "30987",
      telefone: "(11) 98888-3003",
      lojaId: "l2",
      turno: "Noite",
    },
  ],
  perdas: [],
  empresas: [],
  supervisores: [],
};

let state: State = seed;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<State>;
      state = {
        lojas: saved.lojas ?? seed.lojas,
        pessoas: saved.pessoas ?? seed.pessoas,
        perdas: saved.perdas ?? [],
        empresas: saved.empresas ?? [],
        supervisores: saved.supervisores ?? [],
      };
    }
  } catch (error) {
    console.error("Não foi possível carregar os dados do cadastro.", error);
  }
}
function set(next: State) {
  localStorage.setItem(KEY, JSON.stringify(next));
  state = next;
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
    addLoja: (l: Omit<Loja, "id">) =>
      set({ ...state, lojas: [...state.lojas, { ...l, id: uid() }] }),
    updateLoja: (id: string, l: Omit<Loja, "id">) =>
      set({ ...state, lojas: state.lojas.map((x) => (x.id === id ? { ...l, id } : x)) }),
    removeLoja: (id: string) =>
      set({
        ...state,
        lojas: state.lojas.filter((l) => l.id !== id),
        pessoas: state.pessoas.filter((p) => p.lojaId !== id),
        perdas: state.perdas.filter((p) => p.lojaId !== id),
      }),
    addPessoa: (p: Omit<Pessoa, "id">) =>
      set({ ...state, pessoas: [...state.pessoas, { ...p, id: uid() }] }),
    removePessoa: (id: string) =>
      set({ ...state, pessoas: state.pessoas.filter((p) => p.id !== id) }),
    addEmpresa: (empresa: Omit<Empresa, "id">) =>
      set({ ...state, empresas: [...state.empresas, { ...empresa, id: uid() }] }),
    removeEmpresa: (id: string) =>
      set({ ...state, empresas: state.empresas.filter((empresa) => empresa.id !== id) }),
    addSupervisor: (supervisor: Omit<Supervisor, "id">) =>
      set({ ...state, supervisores: [...state.supervisores, { ...supervisor, id: uid() }] }),
    removeSupervisor: (id: string) =>
      set({
        ...state,
        supervisores: state.supervisores.filter((supervisor) => supervisor.id !== id),
      }),
    addPerda: (p: Omit<Perda, "id">) => {
      const existente = state.perdas.find(
        (x) => x.lojaId === p.lojaId && x.mes === p.mes && x.ano === p.ano,
      );
      if (existente) {
        throw new Error("Já existe um lançamento de perdas para esta loja, mês e ano.");
      }
      set({
        ...state,
        perdas: [{ ...p, id: uid() }, ...state.perdas],
      });
    },
    importPerdas: (lancamentos: Omit<Perda, "id">[]) => {
      const chavesImportadas = new Set<string>();
      const chavesExistentes = new Set(
        state.perdas.map((perda) => `${perda.lojaId}:${perda.ano}:${perda.mes}`),
      );
      for (const perda of lancamentos) {
        const chave = `${perda.lojaId}:${perda.ano}:${perda.mes}`;
        if (chavesImportadas.has(chave) || chavesExistentes.has(chave)) {
          throw new Error(
            `Já existe um lançamento de perdas para a loja, ano e mês ${perda.lojaId}:${perda.ano}:${perda.mes}.`,
          );
        }
        chavesImportadas.add(chave);
      }
      set({
        ...state,
        perdas: [...lancamentos.map((perda) => ({ ...perda, id: uid() })), ...state.perdas],
      });
    },
    removePerda: (id: string) => set({ ...state, perdas: state.perdas.filter((p) => p.id !== id) }),
  };
}
