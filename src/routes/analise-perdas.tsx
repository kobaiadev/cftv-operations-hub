import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { z } from "zod";
import { FileSpreadsheet, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCadastro } from "@/lib/cadastro-store";
import {
  analisarPlanilhaPerdas,
  resumirCoberturaPerdas,
  validarDuplicidadesPerdas,
  type ResultadoImportacao,
} from "@/lib/perdas-xlsx";

export const Route = createFileRoute("/analise-perdas")({
  head: () => ({
    meta: [
      { title: "Análise de Perdas — Controle PP" },
      {
        name: "description",
        content: "Registre e consulte os valores mensais de perdas por loja.",
      },
    ],
  }),
  component: AnalisePerdasPage,
});

const meses = [
  ["01", "Janeiro"],
  ["02", "Fevereiro"],
  ["03", "Março"],
  ["04", "Abril"],
  ["05", "Maio"],
  ["06", "Junho"],
  ["07", "Julho"],
  ["08", "Agosto"],
  ["09", "Setembro"],
  ["10", "Outubro"],
  ["11", "Novembro"],
  ["12", "Dezembro"],
] as const;

const schema = z.object({
  lojaId: z.string().min(1, "Selecione uma loja."),
  mes: z.string().min(1, "Selecione o mês."),
  ano: z.coerce
    .number()
    .int()
    .min(2000, "Informe um ano válido.")
    .max(2100, "Informe um ano válido."),
  valor: z.coerce
    .number()
    .nonnegative("Informe um valor igual ou maior que zero.")
    .finite("Informe um valor válido."),
});

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function AnalisePerdasPage() {
  const { lojas, perdas, addPerda, importPerdas, removePerda } = useCadastro();
  const anoAtual = new Date().getFullYear();
  const [form, setForm] = useState({ lojaId: "", mes: "", ano: String(anoAtual), valor: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [arquivoNome, setArquivoNome] = useState("");
  const [previa, setPrevia] = useState<ResultadoImportacao | null>(null);
  const [erroPlanilha, setErroPlanilha] = useState("");
  const [lendoPlanilha, setLendoPlanilha] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(false);
  const lojaPorId = new Map(lojas.map((loja) => [loja.id, loja.nome]));
  const ordenadas = [...perdas].sort(
    (a, b) =>
      b.ano - a.ano ||
      b.mes.localeCompare(a.mes) ||
      (lojaPorId.get(a.lojaId) ?? "").localeCompare(lojaPorId.get(b.lojaId) ?? ""),
  );
  const cobertura = resumirCoberturaPerdas(perdas, lojas);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const resultado = schema.safeParse(form);
    if (!resultado.success) {
      setErrors(
        Object.fromEntries(resultado.error.issues.map((issue) => [issue.path[0], issue.message])),
      );
      return;
    }

    try {
      addPerda(resultado.data);
      setForm({ ...form, valor: "" });
      setErrors({});
      toast.success("Valor de perda registrado.");
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Não foi possível registrar o valor.";
      toast.error(mensagem);
    }
  };

  const selecionarPlanilha = async (event: ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    setPrevia(null);
    setErroPlanilha("");
    setArquivoNome(arquivo?.name ?? "");
    if (!arquivo) return;
    if (!arquivo.name.toLocaleLowerCase("pt-BR").endsWith(".xlsx")) {
      setErroPlanilha("Selecione um arquivo no formato .xlsx.");
      return;
    }
    if (arquivo.size > 20 * 1024 * 1024) {
      setErroPlanilha("O arquivo ultrapassa o limite de 20 MB.");
      return;
    }

    setLendoPlanilha(true);
    try {
      const resultado = await analisarPlanilhaPerdas(await arquivo.arrayBuffer(), lojas);
      const duplicidades = validarDuplicidadesPerdas(resultado.perdas, perdas);
      if (duplicidades.length) {
        const detalhes = duplicidades.map((chave) => {
          const [lojaId, ano, mes] = chave.split(":");
          const nomeLoja = lojaPorId.get(lojaId ?? "") ?? "Loja não encontrada";
          const nomeMes = meses.find(([numero]) => numero === mes)?.[1] ?? mes;
          return `${nomeLoja} — ${nomeMes}/${ano}`;
        });
        throw new Error(
          `A planilha não foi carregada porque já existem registros para estes períodos:\n${detalhes.join("\n")}`,
        );
      }
      setPrevia(resultado);
      toast.success("Planilha validada. Revise a prévia e carregue os dados.");
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Não foi possível ler a planilha.";
      setErroPlanilha(mensagem);
      toast.error("A planilha não pôde ser validada.");
    } finally {
      setLendoPlanilha(false);
    }
  };

  const carregarPlanilha = () => {
    if (!previa) return;
    setCarregandoDados(true);
    try {
      importPerdas(previa.perdas);
      toast.success(`${previa.perdas.length} registros de perdas carregados no Dashboard.`);
      setPrevia(null);
      setArquivoNome("");
      setErroPlanilha("");
    } catch (erro) {
      console.error("Não foi possível carregar os dados da planilha.", erro);
      toast.error(
        "Não foi possível carregar os dados. Verifique o espaço disponível e tente novamente.",
      );
    } finally {
      setCarregandoDados(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Análise de Perdas</h1>
        <p className="text-sm text-muted-foreground">
          Registre os valores mensais por loja e acompanhe os lançamentos no Dashboard.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-card">
        <div className="border-b border-border px-5 py-4 font-semibold">Registrar perdas</div>
        {lojas.length === 0 ? (
          <div className="space-y-3 p-5 text-sm text-muted-foreground">
            <p>Cadastre uma loja antes de registrar os valores de perdas.</p>
            <Button asChild variant="outline">
              <Link to="/cadastro">Ir para Cadastro de lojas</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <label htmlFor="loja-perda" className="text-xs font-medium text-muted-foreground">
                Loja
              </label>
              <Select value={form.lojaId} onValueChange={(lojaId) => setForm({ ...form, lojaId })}>
                <SelectTrigger id="loja-perda" className="w-full">
                  <SelectValue placeholder="Selecione a loja" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {lojas.map((loja) => (
                    <SelectItem key={loja.id} value={loja.id}>
                      {loja.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors["lojaId"] && <p className="text-xs text-destructive">{errors["lojaId"]}</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="mes-perda" className="text-xs font-medium text-muted-foreground">
                Mês
              </label>
              <Select value={form.mes} onValueChange={(mes) => setForm({ ...form, mes })}>
                <SelectTrigger id="mes-perda" className="w-full">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {meses.map(([valor, nome]) => (
                    <SelectItem key={valor} value={valor}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors["mes"] && <p className="text-xs text-destructive">{errors["mes"]}</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ano-perda" className="text-xs font-medium text-muted-foreground">
                Ano
              </label>
              <Input
                id="ano-perda"
                type="number"
                min="2000"
                max="2100"
                step="1"
                value={form.ano}
                onChange={(event) => setForm({ ...form, ano: event.target.value })}
              />
              {errors["ano"] && <p className="text-xs text-destructive">{errors["ano"]}</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="valor-perda" className="text-xs font-medium text-muted-foreground">
                Valor das perdas (R$)
              </label>
              <Input
                id="valor-perda"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.valor}
                onChange={(event) => setForm({ ...form, valor: event.target.value })}
              />
              {errors["valor"] && <p className="text-xs text-destructive">{errors["valor"]}</p>}
            </div>
            <div className="md:col-span-2 xl:col-span-4">
              <Button type="submit">
                <Plus /> Registrar valor
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Um lançamento por loja, mês e ano. Valores iguais a zero também são aceitos.
              </p>
            </div>
          </form>
        )}
        <div className="space-y-4 border-t border-border p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
              <FileSpreadsheet className="size-5" />
            </span>
            <div>
              <h3 className="font-semibold">Importar planilha XLSX</h3>
              <p className="text-sm text-muted-foreground">
                Selecione o arquivo com a aba “analise de dados” e as colunas Loja, Ano, Mês e
                Perdas (Brt).
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <Input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => void selecionarPlanilha(event)}
              aria-label="Selecionar planilha XLSX de perdas"
              disabled={lendoPlanilha || carregandoDados}
            />
            <div>
              <Button
                type="button"
                onClick={carregarPlanilha}
                disabled={!previa || lendoPlanilha || carregandoDados}
              >
                {lendoPlanilha || carregandoDados ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Upload />
                )}
                {lendoPlanilha
                  ? "Lendo planilha..."
                  : carregandoDados
                    ? "Carregando dados..."
                    : "Carregar dados"}
              </Button>
            </div>
          </div>
          {arquivoNome && (
            <p className="text-xs text-muted-foreground">Arquivo selecionado: {arquivoNome}</p>
          )}
          {erroPlanilha && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <p className="whitespace-pre-line">{erroPlanilha}</p>
              {erroPlanilha.includes("não está cadastrada") && (
                <Button asChild variant="outline" className="mt-3">
                  <Link to="/cadastro">Cadastrar lojas ausentes</Link>
                </Button>
              )}
            </div>
          )}
          {previa && (
            <div className="rounded-md border border-success/30 bg-success/10 p-4">
              <p className="font-medium text-success">Planilha validada e pronta para carregar</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {previa.linhasLidas} linhas analisadas; nenhum período duplicado ou já registrado.
                Os valores serão mantidos no armazenamento local do programa após o carregamento.
              </p>
              <div className="mt-3 space-y-2">
                {resumirCoberturaPerdas([...perdas, ...previa.perdas], lojas).map((item) => (
                  <p key={`${item.lojaId}-${item.ano}`} className="text-sm">
                    <span className="font-medium">
                      {item.loja} — {item.ano}:
                    </span>{" "}
                    {item.mesesFaltantes.length === 0 ? (
                      <span className="font-semibold text-success">OK</span>
                    ) : (
                      <span className="text-muted-foreground">
                        faltam{" "}
                        {item.mesesFaltantes
                          .map((mes) => meses.find(([numero]) => numero === mes)?.[1] ?? mes)
                          .join(", ")}
                      </span>
                    )}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Cobertura dos dados por loja e ano</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A indicação OK confirma que os 12 meses do ano estão registrados.
          </p>
        </div>
        <div className="space-y-2 p-5">
          {cobertura.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum dado anual carregado.</p>
          ) : (
            cobertura.map((item) => (
              <p key={`${item.lojaId}-${item.ano}`} className="text-sm">
                <span className="font-medium">
                  {item.loja} — {item.ano}:
                </span>{" "}
                {item.mesesFaltantes.length === 0 ? (
                  <span className="font-semibold text-success">OK</span>
                ) : (
                  <span className="text-muted-foreground">
                    faltam{" "}
                    {item.mesesFaltantes
                      .map((mes) => meses.find(([numero]) => numero === mes)?.[1] ?? mes)
                      .join(", ")}
                  </span>
                )}
              </p>
            ))
          )}
        </div>
      </div>

      <details className="group rounded-lg border border-border bg-card shadow-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
          <span>Detalhamento dos valores registrados</span>
          <span className="text-xs font-normal text-muted-foreground">
            {perdas.length} lançamentos · expandir para consultar ou excluir
          </span>
        </summary>
        <div className="border-t border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Loja</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-16 pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenadas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    Nenhum valor de perda registrado.
                  </TableCell>
                </TableRow>
              )}
              {ordenadas.map((perda) => (
                <TableRow key={perda.id}>
                  <TableCell className="pl-5 font-medium">
                    {lojaPorId.get(perda.lojaId) ?? "Loja não encontrada"}
                  </TableCell>
                  <TableCell>
                    {meses.find(([valor]) => valor === perda.mes)?.[1]} de {perda.ano}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {moeda.format(perda.valor)}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Excluir perdas de ${lojaPorId.get(perda.lojaId) ?? "loja"} em ${perda.mes}/${perda.ano}`}
                      onClick={() => removePerda(perda.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </div>
  );
}
