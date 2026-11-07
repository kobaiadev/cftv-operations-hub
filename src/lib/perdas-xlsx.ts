import readXlsxFile from "read-excel-file/browser";
import type { Loja, Perda } from "@/lib/cadastro-store";

export type PerdaImportada = Omit<Perda, "id">;

export type ResultadoImportacao = {
  perdas: PerdaImportada[];
  linhasLidas: number;
};

const CHAVES_MES = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

const normalizar = (valor: unknown) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]/g, "");

function normalizarLoja(valor: unknown) {
  const texto = normalizar(valor);
  const numero = texto.match(/^(?:loja)?0*(\d+)$/);
  return numero ? `loja${Number(numero[1])}` : texto;
}

function acharColuna(cabecalho: string[], nomes: string[]) {
  for (const nome of nomes) {
    const indice = cabecalho.indexOf(nome);
    if (indice >= 0) return indice;
  }
  return -1;
}

function lerMes(valor: unknown): string {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return String(valor.getUTCMonth() + 1).padStart(2, "0");
  }
  if (typeof valor === "number" && Number.isFinite(valor)) {
    if (Number.isInteger(valor) && valor >= 1 && valor <= 12) {
      return String(valor).padStart(2, "0");
    }
  }

  const texto = String(valor ?? "").trim();
  const numero = texto.match(/^\d{1,2}(?:[/.]\d{1,2}(?:[/.]\d{2,4})?)?$/);
  if (numero) {
    const mes = Number(texto.split(/[/.]/)[0]);
    if (mes >= 1 && mes <= 12) return String(mes).padStart(2, "0");
  }

  const mesPorNome = new Map([
    ["janeiro", "01"],
    ["fevereiro", "02"],
    ["marco", "03"],
    ["abril", "04"],
    ["maio", "05"],
    ["junho", "06"],
    ["julho", "07"],
    ["agosto", "08"],
    ["setembro", "09"],
    ["outubro", "10"],
    ["novembro", "11"],
    ["dezembro", "12"],
  ]);
  const chave = normalizar(texto);
  const encontrado = [...mesPorNome].find(([nome]) => chave.includes(nome));
  if (encontrado) return encontrado[1];
  throw new Error(`Mês inválido: "${texto}". Use um número de 1 a 12 ou o nome do mês.`);
}

function lerValor(valor: unknown): number {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    if (valor < 0) throw new Error("O valor de perdas não pode ser negativo.");
    return valor;
  }

  const original = String(valor ?? "").trim();
  let texto = original.replace(/\s|R\$|BRL/gi, "").replace(/[^\d,.-]/g, "");
  if (texto.includes(",") && texto.includes(".")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (texto.includes(",")) {
    texto = texto.replace(",", ".");
  } else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(texto)) {
    texto = texto.replace(/\./g, "");
  }
  const numero = Number(texto);
  if (!original || !Number.isFinite(numero) || numero < 0) {
    throw new Error(`Valor de perdas inválido: "${original}".`);
  }
  return numero;
}

/** Lê e valida as colunas da planilha "analise de dados". */
export async function analisarPlanilhaPerdas(
  conteudo: ArrayBuffer,
  lojas: Loja[],
): Promise<ResultadoImportacao> {
  if (conteudo.byteLength > 20 * 1024 * 1024) {
    throw new Error("O arquivo ultrapassa o limite de 20 MB.");
  }

  const abas = await readXlsxFile(conteudo);
  const temCabecalho = (dados: unknown[][]) =>
    dados.some((linha) => linha.some((celula) => normalizar(celula).startsWith("loja")));
  const aba =
    abas.find(({ sheet }) => normalizar(sheet) === "analisededados") ??
    abas.find(({ data }) => temCabecalho(data as unknown[][]));
  if (!aba) {
    throw new Error('Nenhuma aba da planilha possui a coluna "Loja".');
  }

  const linhas = aba.data as unknown[][];
  const indiceCabecalho = linhas.findIndex((linha) =>
    linha.some((celula) => normalizar(celula).startsWith("loja")),
  );
  if (indiceCabecalho < 0) {
    throw new Error(
      'Não foi encontrada a linha de cabeçalho com as colunas "Loja", "Ano", "Mês" e "Perdas (Brt)".',
    );
  }

  const linhaCabecalho = linhas[indiceCabecalho];
  if (!linhaCabecalho) {
    throw new Error("A linha de cabeçalho da planilha está vazia.");
  }
  const cabecalho = linhaCabecalho.map(normalizar);
  const colunas = {
    loja: acharColuna(cabecalho, ["loja", "nomeloja", "lojas", "filial"]),
    ano: acharColuna(cabecalho, ["ano", "exercicio"]),
    mes: acharColuna(cabecalho, ["mes", "meses", "competencia", "periodo"]),
    valor: acharColuna(cabecalho, ["perdasbrt", "perdasbruto", "perdabrt", "perdabruta", "perdasbrutas", "perdas", "perda", "valorperdas", "valorperda", "valor", "total"]),
  };
  const faltantes = Object.entries(colunas)
    .filter(([, indice]) => indice < 0)
    .map(([campo]) => campo);
  if (faltantes.length) {
    throw new Error(
      `Colunas obrigatórias não encontradas: ${faltantes.join(", ")}. São necessárias "Loja", "Ano", "Mês" e "Perdas (Brt)".`,
    );
  }

  const lojasPorNome = new Map(lojas.map((loja) => [normalizarLoja(loja.nome), loja]));
  const importadas = new Map<string, PerdaImportada>();
  const linhasPorChave = new Map<string, number>();
  const erros: string[] = [];
  let linhasLidas = 0;

  for (let indice = indiceCabecalho + 1; indice < linhas.length; indice++) {
    const linha = linhas[indice];
    if (!linha) continue;
    if (linha.every((celula) => String(celula ?? "").trim() === "")) continue;
    linhasLidas++;
    const numeroLinha = indice + 1;

    try {
      const nomeLoja = String(linha[colunas.loja] ?? "").trim();
      const loja = lojasPorNome.get(normalizarLoja(nomeLoja));
      if (!loja) {
        throw new Error(`A loja "${nomeLoja}" não está cadastrada.`);
      }

      const anoBruto = linha[colunas.ano];
      const ano = typeof anoBruto === "number" ? anoBruto : Number(String(anoBruto).trim());
      if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
        throw new Error(`Ano inválido: "${String(anoBruto)}".`);
      }

      const mes = lerMes(linha[colunas.mes]);
      const valor = lerValor(linha[colunas.valor]);
      const chave = `${loja.id}:${ano}:${mes}`;
      const linhaAnterior = linhasPorChave.get(chave);
      if (linhaAnterior !== undefined) {
        throw new Error(
          `Duplicidade de loja, ano e mês; o mesmo período já aparece na linha ${linhaAnterior}.`,
        );
      }
      linhasPorChave.set(chave, numeroLinha);
      importadas.set(chave, {
        lojaId: loja.id,
        ano,
        mes,
        valor,
      });
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Dados inválidos.";
      erros.push(`Linha ${numeroLinha}: ${mensagem}`);
    }
  }

  if (erros.length) {
    throw new Error(
      `A planilha contém erros e não foi carregada:\n${erros.slice(0, 8).join("\n")}`,
    );
  }
  if (importadas.size === 0) {
    throw new Error("A planilha não contém registros válidos para carregar.");
  }

  return { perdas: [...importadas.values()], linhasLidas };
}

export function validarDuplicidadesPerdas(
  importadas: PerdaImportada[],
  existentes: Perda[],
): string[] {
  const chavesExistentes = new Set(
    existentes.map((perda) => `${perda.lojaId}:${perda.ano}:${perda.mes}`),
  );
  return importadas
    .filter((perda) => chavesExistentes.has(`${perda.lojaId}:${perda.ano}:${perda.mes}`))
    .map((perda) => `${perda.lojaId}:${perda.ano}:${perda.mes}`);
}

export type CoberturaAnualPerdas = {
  lojaId: string;
  loja: string;
  ano: number;
  mesesCarregados: string[];
  mesesFaltantes: string[];
};

export function resumirCoberturaPerdas(
  perdas: Pick<Perda, "lojaId" | "mes" | "ano">[],
  lojas: Loja[],
): CoberturaAnualPerdas[] {
  const lojaPorId = new Map(lojas.map((loja) => [loja.id, loja.nome]));
  const grupos = new Map<string, Set<string>>();

  for (const perda of perdas) {
    const chave = `${perda.lojaId}:${perda.ano}`;
    const meses = grupos.get(chave) ?? new Set<string>();
    meses.add(perda.mes);
    grupos.set(chave, meses);
  }

  return [...grupos.entries()]
    .map(([chave, mesesCarregadosSet]) => {
      const separador = chave.lastIndexOf(":");
      const lojaId = chave.slice(0, separador);
      const ano = Number(chave.slice(separador + 1));
      const mesesCarregados = CHAVES_MES.filter((mes) => mesesCarregadosSet.has(mes));
      return {
        lojaId,
        loja: lojaPorId.get(lojaId) ?? "Loja não encontrada",
        ano,
        mesesCarregados,
        mesesFaltantes: CHAVES_MES.filter((mes) => !mesesCarregadosSet.has(mes)),
      };
    })
    .sort((a, b) => a.loja.localeCompare(b.loja, "pt-BR") || a.ano - b.ano);
}
