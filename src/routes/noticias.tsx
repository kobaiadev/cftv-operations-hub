import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Newspaper,
  RefreshCw,
  Shield,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { carregarNoticias } from "@/lib/noticias.functions";
import { categoriasNoticias, type CategoriaNoticia, type Noticia } from "@/lib/noticias";

type DadosNoticias = { noticias: Noticia[]; atualizadaEm: string };

export const Route = createFileRoute("/noticias")({
  head: () => ({
    meta: [
      { title: "Notícias — Segurança Patrimonial Nagumo" },
      {
        name: "description",
        content:
          "Notícias sobre segurança privada, segurança patrimonial, prevenção de perdas, varejo e CFTV.",
      },
    ],
  }),
  component: NoticiasPage,
});

function tempoRelativo(data: string): string {
  const minutos = Math.max(0, Math.floor((Date.now() - Date.parse(data)) / 60000));
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} dia${dias === 1 ? "" : "s"}`;
}

function dataPorExtenso(data: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(data));
}

function NoticiasPage() {
  const carregar = useServerFn(carregarNoticias);
  const [categoria, setCategoria] = useState<CategoriaNoticia>("todas");
  const [dados, setDados] = useState<DadosNoticias | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const atualizar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await carregar({ data: categoria }));
    } catch (causa) {
      console.error("Não foi possível carregar o painel de notícias.", causa);
      setErro(causa instanceof Error ? causa.message : "Não foi possível carregar as notícias.");
    } finally {
      setCarregando(false);
    }
  }, [carregar, categoria]);

  useEffect(() => {
    void atualizar();
  }, [atualizar]);

  const noticias = dados?.noticias ?? [];
  const principal = noticias[0];
  const destaques = noticias.slice(1, 4);
  const demais = noticias.slice(4);
  const nomeCategoria = (id: CategoriaNoticia) =>
    categoriasNoticias.find((item) => item.id === id)?.nome ?? "Segurança";

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="flex flex-col gap-5 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-destructive">
              <span className="size-2 rounded-full bg-destructive" />
              Central de informação
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">NOTÍCIAS</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Segurança privada, patrimônio e varejo: o que importa para proteger pessoas e
              operações.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs text-muted-foreground sm:block">
              <div className="flex items-center justify-end gap-1.5">
                <CalendarDays className="size-3.5" />
                {dataPorExtenso(new Date().toISOString())}
              </div>
              {dados && (
                <div className="mt-1 flex items-center justify-end gap-1.5">
                  <Clock3 className="size-3.5" />
                  Atualizado às{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(dados.atualizadaEm))}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void atualizar()}
              disabled={carregando}
            >
              <RefreshCw className={carregando ? "animate-spin" : ""} />
              Atualizar
            </Button>
          </div>
        </div>
        <nav
          aria-label="Categorias de notícias"
          className="flex gap-2 overflow-x-auto p-3 sm:flex-wrap sm:px-6"
        >
          {categoriasNoticias.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={categoria === item.id}
              onClick={() => setCategoria(item.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                categoria === item.id
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {item.nome}
            </button>
          ))}
        </nav>
      </header>

      {erro && (
        <section
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3 text-sm text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            {erro}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void atualizar()}>
            Tentar novamente
          </Button>
        </section>
      )}

      {carregando && !dados ? (
        <div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
          <div className="h-80 animate-pulse rounded-xl bg-muted" />
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      ) : principal ? (
        <>
          <section
            aria-label="Manchete e destaques"
            className="grid gap-5 lg:grid-cols-[1.65fr_1fr]"
          >
            <a
              href={principal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex min-h-80 flex-col justify-end overflow-hidden rounded-xl bg-[#15283f] p-6 text-white shadow-card sm:min-h-[25rem] sm:p-9"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_10%,rgba(239,68,68,0.42),transparent_35%),linear-gradient(135deg,transparent_30%,rgba(0,0,0,0.48))]"
              />
              <div className="absolute right-8 top-8 hidden size-36 items-center justify-center rounded-full border border-white/15 bg-white/5 sm:flex">
                <Shield className="size-16 text-white/60" strokeWidth={1} />
              </div>
              <div className="relative max-w-2xl">
                <div className="mb-5 flex items-center gap-2">
                  <Badge className="border-0 bg-destructive text-white hover:bg-destructive">
                    MANCHETE
                  </Badge>
                  <span className="text-xs font-medium text-white/75">
                    {nomeCategoria(principal.categoria)}
                  </span>
                </div>
                <h2 className="text-2xl font-black leading-tight tracking-tight transition-colors group-hover:text-red-100 sm:text-4xl">
                  {principal.titulo}
                </h2>
                {principal.resumo && (
                  <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                    {principal.resumo}
                  </p>
                )}
                <div className="mt-6 flex items-center gap-3 text-xs font-semibold text-white/70">
                  <span>{principal.fonte}</span>
                  <span aria-hidden="true">•</span>
                  <span>{tempoRelativo(principal.publicadaEm)}</span>
                  <ArrowUpRight className="ml-auto size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
              </div>
            </a>

            <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-bold">Mais lidas na pauta</h2>
                <Newspaper className="size-4 text-destructive" />
              </div>
              <div className="divide-y divide-border">
                {destaques.map((noticia, indice) => (
                  <a
                    key={noticia.id}
                    href={noticia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-1 gap-4 p-5 transition-colors hover:bg-accent/40"
                  >
                    <span className="text-2xl font-black leading-none text-destructive/50">
                      0{indice + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-destructive">
                        {nomeCategoria(noticia.categoria)}
                      </span>
                      <span className="line-clamp-3 block text-sm font-bold leading-5 group-hover:text-primary">
                        {noticia.titulo}
                      </span>
                      <span className="mt-2 block text-xs text-muted-foreground">
                        {noticia.fonte} · {tempoRelativo(noticia.publicadaEm)}
                      </span>
                    </span>
                  </a>
                ))}
                {destaques.length === 0 && (
                  <p className="p-5 text-sm text-muted-foreground">
                    Não há outros destaques nesta categoria.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section aria-labelledby="ultimas-noticias">
            <div className="mb-4 flex items-end justify-between border-b-2 border-foreground pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-destructive">
                  Informação em tempo real
                </p>
                <h2 id="ultimas-noticias" className="mt-1 text-2xl font-black tracking-tight">
                  Últimas notícias
                </h2>
              </div>
              {carregando && <span className="text-xs text-muted-foreground">Atualizando...</span>}
            </div>
            {demais.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {demais.map((noticia) => (
                  <a
                    key={noticia.id}
                    href={noticia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-52 flex-col rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <Badge variant="outline" className="border-destructive/30 text-destructive">
                        {nomeCategoria(noticia.categoria)}
                      </Badge>
                      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                    <h3 className="line-clamp-3 text-lg font-bold leading-snug group-hover:text-primary">
                      {noticia.titulo}
                    </h3>
                    {noticia.resumo && (
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
                        {noticia.resumo}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-5 text-xs text-muted-foreground">
                      <span className="truncate font-semibold">{noticia.fonte}</span>
                      <span className="shrink-0">{tempoRelativo(noticia.publicadaEm)}</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nenhuma outra notícia encontrada nesta categoria.
              </p>
            )}
          </section>
        </>
      ) : (
        !erro && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nenhuma notícia encontrada. Tente outra categoria.
          </div>
        )
      )}

      <footer className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        As manchetes e resumos são obtidos do Google Notícias. O conteúdo completo, a autoria e os
        direitos pertencem aos veículos de origem; abra a notícia para ler a publicação original.
      </footer>
    </main>
  );
}
