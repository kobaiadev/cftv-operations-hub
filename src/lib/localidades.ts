import { queryOptions } from "@tanstack/react-query";

export const ESTADOS = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"],
  ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"],
  ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"],
  ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"],
  ["SE", "Sergipe"], ["TO", "Tocantins"],
] as const;

// Official municipality list from IBGE, fetched per state.
export const cidadesQuery = (uf: string) =>
  queryOptions({
    queryKey: ["cidades", uf],
    enabled: !!uf,
    staleTime: Infinity,
    queryFn: async () => {
      const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
      if (!r.ok) throw new Error("Falha ao carregar cidades");
      const data = (await r.json()) as { nome: string }[];
      return data.map((c) => c.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
  });
