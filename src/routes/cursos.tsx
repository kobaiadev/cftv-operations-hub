import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, ExternalLink, GraduationCap, Plus, Search, Shield, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/cursos")({
  head: () => ({
    meta: [
      { title: "Cursos — Segurança Patrimonial Nagumo" },
      {
        name: "description",
        content:
          "Acervo de videoaulas, playlists e materiais de referência para segurança e conformidade legal.",
      },
    ],
  }),
  component: CursosPage,
});

const categorias = [
  "Segurança Patrimonial / Corporativa",
  "Direito Penal & Legislação",
  "Processo Penal & Prisões",
] as const;

type CategoriaCurso = (typeof categorias)[number];
type FiltroCategoria = "Todos" | CategoriaCurso;

type Curso = {
  id: string;
  titulo: string;
  categoria: CategoriaCurso;
  descricao: string;
  url: string;
};

const cursosIniciais: Curso[] = [
  {
    id: "vigilante-qap",
    titulo: "Cursos de Segurança Privada (Vigilante QAP)",
    categoria: "Segurança Patrimonial / Corporativa",
    descricao:
      "Playlist focada em dicas práticas, atualizações normativas e rotinas operacionais da área.",
    url: "https://www.youtube.com/playlist?list=PLlRvZTyGS4cNixYEeBfLK5qkPt2sWhR7R",
  },
  {
    id: "gestao-seguranca-vertical",
    titulo: "Gestão em Segurança Privada (Vertical Treinamentos)",
    categoria: "Segurança Patrimonial / Corporativa",
    descricao:
      "Visão estratégica do gestor de segurança, estruturação de postos e análise de riscos.",
    url: "https://www.youtube.com/watch?v=vxgraUCU6ow",
  },
  {
    id: "direito-penal-diogo-lopes",
    titulo: "Direito Penal - Parte Geral (Prof. Diogo Lopes)",
    categoria: "Direito Penal & Legislação",
    descricao:
      "Sequência organizada cobrindo teoria do crime, tipicidade, ilicitude e excludentes (legítima defesa).",
    url: "https://www.youtube.com/playlist?list=PLX5WCi0ZXy3s",
  },
  {
    id: "prisao-flagrante-ana-aidar",
    titulo: "Aula Completa sobre Prisão em Flagrante (Profª Ana Carolina Aidar)",
    categoria: "Processo Penal & Prisões",
    descricao:
      "Explicação didática do Código de Processo Penal sobre espécies de flagrante e procedimentos de abordagem.",
    url: "https://www.youtube.com/watch?v=4HHAZu3CP1Q",
  },
  {
    id: "prisao-flagrante-direito-desenhado",
    titulo: "Resumo de Prisão em Flagrante (Direito Desenhado)",
    categoria: "Processo Penal & Prisões",
    descricao:
      "Aula esquematizada cobrindo os artigos 301 a 310 do CPP, essencial para atuação legal.",
    url: "https://www.youtube.com/watch?v=6XQ_MbsWd40",
  },
];

const chaveCursosAdicionais = "cftv-cursos-adicionais";

function CursosPage() {
  const [termoBusca, setTermoBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoria>("Todos");
  const [cursosAdicionais, setCursosAdicionais] = useState<Curso[]>([]);
  const [cursosCarregados, setCursosCarregados] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaCategoria, setNovaCategoria] = useState<CategoriaCurso>(categorias[0]);
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaUrl, setNovaUrl] = useState("");

  useEffect(() => {
    try {
      const salvos = window.localStorage.getItem(chaveCursosAdicionais);
      if (salvos) {
        const cursos: unknown = JSON.parse(salvos);
        if (
          !Array.isArray(cursos) ||
          !cursos.every(
            (curso): curso is Curso =>
              typeof curso === "object" &&
              curso !== null &&
              typeof curso.id === "string" &&
              typeof curso.titulo === "string" &&
              categorias.includes(curso.categoria) &&
              typeof curso.descricao === "string" &&
              typeof curso.url === "string",
          )
        ) {
          throw new Error("Os cursos adicionais salvos estão em um formato inválido.");
        }
        setCursosAdicionais(cursos);
      }
    } catch (error) {
      console.error("Não foi possível carregar os cursos adicionais.", error);
      toast.error("Não foi possível carregar os cursos salvos neste navegador.");
    } finally {
      setCursosCarregados(true);
    }
  }, []);

  useEffect(() => {
    if (!cursosCarregados) return;
    try {
      window.localStorage.setItem(chaveCursosAdicionais, JSON.stringify(cursosAdicionais));
    } catch (error) {
      console.error("Não foi possível salvar os cursos adicionais.", error);
      toast.error("Não foi possível salvar os cursos neste navegador.");
    }
  }, [cursosAdicionais, cursosCarregados]);

  const cursosFiltrados = useMemo(() => {
    const consulta = termoBusca.trim().toLocaleLowerCase("pt-BR");
    return [...cursosIniciais, ...cursosAdicionais].filter((curso) => {
      const correspondeCategoria =
        filtroCategoria === "Todos" || curso.categoria === filtroCategoria;
      const textoCurso = `${curso.titulo} ${curso.descricao} ${curso.categoria}`.toLocaleLowerCase(
        "pt-BR",
      );
      return correspondeCategoria && (!consulta || textoCurso.includes(consulta));
    });
  }, [cursosAdicionais, filtroCategoria, termoBusca]);

  function adicionarCurso(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let url: URL;
    try {
      url = new URL(novaUrl.trim());
    } catch {
      toast.error("Informe um link válido.");
      return;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      toast.error("O link deve começar com http:// ou https://.");
      return;
    }

    setCursosAdicionais((cursos) => [
      ...cursos,
      {
        id: crypto.randomUUID(),
        titulo: novoTitulo.trim(),
        categoria: novaCategoria,
        descricao: novaDescricao.trim(),
        url: url.href,
      },
    ]);
    setNovoTitulo("");
    setNovaCategoria(categorias[0]);
    setNovaDescricao("");
    setNovaUrl("");
    setFormAberto(false);
    toast.success("Curso adicionado ao seu acervo neste navegador.");
  }

  function removerCurso(id: string) {
    setCursosAdicionais((cursos) => cursos.filter((curso) => curso.id !== id));
    toast.success("Curso removido do seu acervo.");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="relative p-5 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full bg-primary/10 blur-3xl"
          />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 max-w-3xl">
              <Badge variant="outline" className="mb-3 gap-1.5 border-primary/30 bg-primary/5">
                <GraduationCap className="size-3.5 text-primary" />
                Acervo de aprendizagem
              </Badge>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Cursos e Trilhas de Aprendizado
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                Acervo de videoaulas, playlists e materiais de referência para capacitação em
                segurança e conformidade legal.
              </p>
            </div>
            <Button
              type="button"
              variant={formAberto ? "outline" : "default"}
              className="shrink-0"
              onClick={() => setFormAberto((aberto) => !aberto)}
              aria-expanded={formAberto}
              aria-controls="form-adicionar-curso"
            >
              {formAberto ? <X /> : <Plus />}
              {formAberto ? "Fechar formulário" : "Adicionar curso"}
            </Button>
          </div>

          {formAberto && (
            <form
              id="form-adicionar-curso"
              className="relative mt-6 grid gap-4 rounded-xl border border-border bg-background/80 p-4 sm:grid-cols-2 sm:p-5"
              onSubmit={adicionarCurso}
            >
              <div className="space-y-2">
                <label htmlFor="curso-titulo" className="text-sm font-medium">
                  Título
                </label>
                <Input
                  id="curso-titulo"
                  value={novoTitulo}
                  onChange={(event) => setNovoTitulo(event.target.value)}
                  placeholder="Nome do curso ou material"
                  maxLength={140}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="curso-categoria" className="text-sm font-medium">
                  Categoria
                </label>
                <Select
                  value={novaCategoria}
                  onValueChange={(value: CategoriaCurso) => setNovaCategoria(value)}
                >
                  <SelectTrigger id="curso-categoria">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((categoria) => (
                      <SelectItem key={categoria} value={categoria}>
                        {categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="curso-descricao" className="text-sm font-medium">
                  Descrição
                </label>
                <Input
                  id="curso-descricao"
                  value={novaDescricao}
                  onChange={(event) => setNovaDescricao(event.target.value)}
                  placeholder="Resumo do conteúdo"
                  maxLength={300}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="curso-url" className="text-sm font-medium">
                  Link
                </label>
                <Input
                  id="curso-url"
                  type="url"
                  value={novaUrl}
                  onChange={(event) => setNovaUrl(event.target.value)}
                  placeholder="https://..."
                  required
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2 sm:justify-end">
                <Button type="button" variant="ghost" onClick={() => setFormAberto(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  <Plus />
                  Salvar curso
                </Button>
              </div>
            </form>
          )}
        </div>
      </header>

      <section aria-label="Buscar e filtrar cursos" className="space-y-4">
        <div className="relative max-w-xl">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={termoBusca}
            onChange={(event) => setTermoBusca(event.target.value)}
            placeholder="Buscar por curso, tema ou palavra-chave..."
            aria-label="Buscar cursos"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Filtrar por categoria">
          {(["Todos", ...categorias] as const).map((categoria) => {
            const selecionada = filtroCategoria === categoria;
            return (
              <Button
                key={categoria}
                type="button"
                size="sm"
                variant={selecionada ? "default" : "outline"}
                className="h-auto min-h-9 whitespace-normal text-left"
                aria-pressed={selecionada}
                onClick={() => setFiltroCategoria(categoria)}
              >
                {categoria}
              </Button>
            );
          })}
        </div>
      </section>

      <section aria-label="Cursos disponíveis">
        {cursosFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center">
            <BookOpen className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-3 font-semibold">Nenhum curso encontrado</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tente outra palavra-chave ou selecione uma categoria diferente.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cursosFiltrados.map((curso) => {
              const personalizado = cursosAdicionais.some(({ id }) => id === curso.id);
              return (
                <Card
                  key={curso.id}
                  className="flex min-w-0 flex-col overflow-hidden shadow-card transition-colors hover:border-primary/40"
                >
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        {curso.categoria === "Segurança Patrimonial / Corporativa" ? (
                          <Shield className="size-5" />
                        ) : (
                          <BookOpen className="size-5" />
                        )}
                      </span>
                      {personalizado && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label={`Remover ${curso.titulo}`}
                          title="Remover curso"
                          onClick={() => removerCurso(curso.id)}
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                    <Badge variant="secondary" className="w-fit whitespace-normal">
                      {curso.categoria}
                    </Badge>
                    <CardTitle className="break-words text-base leading-6 sm:text-lg">
                      {curso.titulo}
                    </CardTitle>
                    <CardDescription className="break-words leading-6">
                      {curso.descricao}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pt-0">
                    <CardFooter className="p-0">
                      <Button asChild className="w-full">
                        <a href={curso.url} target="_blank" rel="noopener noreferrer">
                          {curso.url.includes("playlist") ? "Acessar Playlist" : "Assistir Aula"}
                          <ExternalLink />
                        </a>
                      </Button>
                    </CardFooter>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
