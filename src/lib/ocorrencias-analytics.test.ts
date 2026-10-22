import { describe, expect, it } from "vitest";
import type { Loja } from "@/lib/cadastro-store";
import type { OS } from "@/lib/os-store";
import {
  classificarTipoOcorrencia,
  filtrarOrdens,
  listarLojasParaAnalise,
  obterPeriodoOS,
  possuiRegistroDelegacia,
  type FiltrosOcorrencias,
} from "@/lib/ocorrencias-analytics";

const ordem = (dados: Partial<OS> = {}): OS => ({
  id: "OS-1",
  data: "22/10/2026 14:30",
  loja: "Loja Centro",
  setor: "Açougue",
  ocorrencia: "Furto de mercadorias",
  descricao: "",
  gravidade: "Alta",
  status: "Aguardando Imagens",
  ...dados,
});

describe("análises de ocorrências", () => {
  it("interpreta datas brasileiras e ISO, rejeitando datas impossíveis", () => {
    expect(obterPeriodoOS("22/10/2026 14:30")).toEqual({ ano: 2026, mes: 10 });
    expect(obterPeriodoOS("2025-03-10")).toEqual({ ano: 2025, mes: 3 });
    expect(obterPeriodoOS("31/02/2026")).toBeNull();
    expect(obterPeriodoOS("data desconhecida")).toBeNull();
  });

  it("agrupa tipos recorrentes por categoria e preserva tipos não classificados", () => {
    expect(classificarTipoOcorrencia("Furto de carnes nobres")).toBe("Furto");
    expect(classificarTipoOcorrencia("FURTO em loja")).toBe("Furto");
    expect(classificarTipoOcorrencia("Avaria de destilados")).toBe("Avaria de mercadoria");
    expect(classificarTipoOcorrencia("Ocorrência específica")).toBe("Ocorrência específica");
    expect(classificarTipoOcorrencia("")).toBe("Não informado");
  });

  it("conta boletim vinculado ou identificado explicitamente e ignora requisição policial", () => {
    expect(
      possuiRegistroDelegacia(
        ordem({ bo: { numero: "123", delegacia: "", data: "", imagemNome: "" } }),
      ),
    ).toBe(true);
    expect(
      possuiRegistroDelegacia(ordem({ dadosAdicionais: "Boletim de Ocorrência nº 123" })),
    ).toBe(true);
    expect(
      possuiRegistroDelegacia(ordem({ dadosAdicionais: "Órgão solicitante: Delegacia Central" })),
    ).toBe(false);
    expect(possuiRegistroDelegacia(ordem())).toBe(false);
  });

  it("inclui lojas cadastradas sem ocorrências e unidades encontradas apenas nas OS", () => {
    const lojas: Loja[] = [
      {
        id: "1",
        nome: "Loja Centro",
        gerente: "",
        endereco: "",
        estado: "SP",
        cidade: "São Paulo",
        telefone: "",
      },
      {
        id: "2",
        nome: "Loja Norte",
        gerente: "",
        endereco: "",
        estado: "SP",
        cidade: "São Paulo",
        telefone: "",
      },
    ];
    const resultado = listarLojasParaAnalise(
      [ordem(), ordem({ id: "OS-2", loja: "Loja Externa" })],
      lojas,
    );

    expect(resultado).toEqual([
      { nome: "Loja Centro", total: 1 },
      { nome: "Loja Externa", total: 1 },
      { nome: "Loja Norte", total: 0 },
    ]);
  });

  it("aplica filtros combinados e permite comparar ignorando loja ou ano", () => {
    const filtros: FiltrosOcorrencias = {
      ano: "2026",
      mes: "10",
      loja: "Loja Centro",
      tipo: "Furto",
      setor: "Açougue",
      gravidade: "Alta",
      status: "Aguardando Imagens",
      boletim: "nao",
      reserva: "nao",
    };
    const registros = [
      ordem(),
      ordem({ id: "OS-2", loja: "Loja Norte" }),
      ordem({ id: "OS-3", data: "22/10/2025 14:30" }),
      ordem({ id: "OS-4", data: "22/09/2026 14:30" }),
      ordem({ id: "OS-5", ocorrencia: "Avaria de mercadoria" }),
      ordem({ id: "OS-6", gravidade: "Média" }),
      ordem({
        id: "OS-7",
        bo: { numero: "123", delegacia: "DP", data: "22/10/2026", imagemNome: "bo.pdf" },
      }),
      ordem({ id: "OS-8", reserva: { numero: "456", imagemNome: "reserva.png", vinculadaEm: "" } }),
    ];

    expect(filtrarOrdens(registros, filtros).map((registro) => registro.id)).toEqual(["OS-1"]);
    expect(filtrarOrdens(registros, filtros, "loja").map((registro) => registro.id)).toContain(
      "OS-2",
    );
    expect(filtrarOrdens(registros, filtros, "ano").map((registro) => registro.id)).toContain(
      "OS-3",
    );
  });
});
