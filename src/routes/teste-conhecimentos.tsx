import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Check,
  Heart,
  Medal,
  RotateCcw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  dificuldadesQuiz,
  embaralhar,
  obterPerguntasDoTema,
  temasQuiz,
  type DificuldadeQuiz,
  obterProgressoQuiz,
  type PerguntaQuiz,
} from "@/lib/quiz-seguranca";

export const Route = createFileRoute("/teste-conhecimentos")({
  head: () => ({
    meta: [
      { title: "Teste seus conhecimentos — Segurança Patrimonial Nagumo" },
      { property: "og:title", content: "Teste seus conhecimentos — Segurança Patrimonial Nagumo" },
      { property: "og:description", content: "Quiz de segurança patrimonial, legislação penal, processo penal, LGPD e direitos fundamentais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "description",
        content:
          "Quiz de segurança patrimonial, legislação penal, processo penal, LGPD e direitos fundamentais.",
      },
    ],
  }),
  component: TesteConhecimentosPage,
});

const iconesTema = {
  shield: Shield,
  scale: Scale,
  lock: ShieldCheck,
  landmark: BadgeCheck,
  badge: ShieldAlert,
  clipboard: BookOpen,
};

type PontuacaoRanking = {
  user_id: string;
  display_name: string;
  best_score: number;
  total_respostas: number;
  nivel: number;
};

function TesteConhecimentosPage() {
  const [temaSelecionado, setTemaSelecionado] = useState<string | null>(null);
  const [dificuldadeSelecionada, setDificuldadeSelecionada] = useState<DificuldadeQuiz | null>(
    null,
  );
  const [pergunta, setPergunta] = useState<PerguntaQuiz | null>(null);
  const [opcoes, setOpcoes] = useState<string[]>([]);
  const [respostaEscolhida, setRespostaEscolhida] = useState<number | null>(null);
  const [acertou, setAcertou] = useState<boolean | null>(null);
  const [pontos, setPontos] = useState(0);
  const [vidas, setVidas] = useState(3);
  const [respondidas, setRespondidas] = useState(0);
  const [temaRanking, setTemaRanking] = useState(temasQuiz[0]?.id ?? "");
  const [ranking, setRanking] = useState<PontuacaoRanking[]>([]);
  const [carregandoRanking, setCarregandoRanking] = useState(true);
  const [erroRanking, setErroRanking] = useState<string | null>(null);
  const [versaoRanking, setVersaoRanking] = useState(0);
  const [progressoUsuario, setProgressoUsuario] = useState<{
    total_respostas: number;
    nivel: number;
  } | null>(null);
  const [carregandoProgresso, setCarregandoProgresso] = useState(true);
  const [erroProgresso, setErroProgresso] = useState<string | null>(null);
  const filaRef = useRef<PerguntaQuiz[]>([]);
  const ultimaPerguntaRef = useRef<string | null>(null);
  const sessaoRef = useRef<string | null>(null);
  const respostaPendenteRef = useRef<{
    tema: string;
    sessao: string;
    respostas: number;
    pontuacao: number;
  } | null>(null);
  const respostasAcumuladasInicioRef = useRef(0);
  const [salvandoResposta, setSalvandoResposta] = useState(false);
  const [erroSalvarResposta, setErroSalvarResposta] = useState<string | null>(null);
  const [respostasDaPartidaPersistidas, setRespostasDaPartidaPersistidas] = useState(0);

  const carregarPergunta = useCallback((tema: string, dificuldade: DificuldadeQuiz) => {
    if (filaRef.current.length === 0) {
      filaRef.current = embaralhar(obterPerguntasDoTema(tema, dificuldade));
      if (filaRef.current.length > 1 && filaRef.current[0]?.id === ultimaPerguntaRef.current) {
        const primeira = filaRef.current.shift();
        if (primeira) filaRef.current.push(primeira);
      }
    }

    const proxima = filaRef.current.shift();
    if (!proxima) {
      throw new Error(
        `Não há perguntas cadastradas para o tema "${tema}" no nível "${dificuldade}".`,
      );
    }
    ultimaPerguntaRef.current = proxima.id;
    setPergunta(proxima);
    setOpcoes(embaralhar(proxima.opcoes));
    setRespostaEscolhida(null);
    setAcertou(null);
  }, []);

  const iniciarQuiz = (tema: string, dificuldade: DificuldadeQuiz) => {
    setTemaSelecionado(tema);
    setDificuldadeSelecionada(dificuldade);
    setTemaRanking(tema);
    setPontos(0);
    setVidas(3);
    setRespondidas(0);
    respostaPendenteRef.current = null;
    setErroSalvarResposta(null);
    setRespostasDaPartidaPersistidas(0);
    respostasAcumuladasInicioRef.current = progressoUsuario?.total_respostas ?? 0;
    sessaoRef.current = crypto.randomUUID();
    filaRef.current = embaralhar(obterPerguntasDoTema(tema, dificuldade));
    ultimaPerguntaRef.current = null;
    carregarPergunta(tema, dificuldade);
  };

  const salvarRespostaPendente = useCallback(async () => {
    const respostaPendente = respostaPendenteRef.current;
    if (!respostaPendente || salvandoResposta) return;

    setSalvandoResposta(true);
    setErroSalvarResposta(null);
    try {
      const { error } = await supabase.rpc("registrar_pontuacao_quiz", {
        p_tema: respostaPendente.tema,
        p_pontuacao: respostaPendente.pontuacao,
        p_respostas: respostaPendente.respostas,
        p_sessao: respostaPendente.sessao,
      });

      if (error) {
        setErroSalvarResposta("Sua resposta ainda não foi salva. Tente novamente.");
        toast.error("Não foi possível salvar seu progresso.");
        return;
      }

      respostaPendenteRef.current = null;
      setRespostasDaPartidaPersistidas((total) => total + 1);
      setVersaoRanking((versao) => versao + 1);
    } catch {
      setErroSalvarResposta("Sua resposta ainda não foi salva. Tente novamente.");
      toast.error("Não foi possível salvar seu progresso.");
    } finally {
      setSalvandoResposta(false);
    }
  }, [salvandoResposta, setRespostasDaPartidaPersistidas]);

  const responder = (indice: number) => {
    if (!pergunta || respostaEscolhida !== null || vidas === 0 || salvandoResposta) return;
    const correta = opcoes[indice] === pergunta.opcoes[pergunta.correta];
    const proximaResposta = respondidas + 1;
    const proximaPontuacao = pontos + (correta ? 10 : 0);
    const sessao = sessaoRef.current;
    if (!sessao || !temaSelecionado) return;

    setRespostaEscolhida(indice);
    setAcertou(correta);
    setRespondidas(proximaResposta);
    setPontos(proximaPontuacao);
    if (!correta) setVidas((total) => Math.max(0, total - 1));
    respostaPendenteRef.current = {
      tema: temaSelecionado,
      sessao,
      respostas: proximaResposta,
      pontuacao: proximaPontuacao,
    };
    void salvarRespostaPendente();
  };

  const voltarTemas = () => {
    setTemaSelecionado(null);
    setDificuldadeSelecionada(null);
    setPergunta(null);
    setRespostaEscolhida(null);
    setAcertou(null);
    filaRef.current = [];
    ultimaPerguntaRef.current = null;
    respostaPendenteRef.current = null;
    sessaoRef.current = null;
  };

  const temaAtual = temasQuiz.find((tema) => tema.id === temaSelecionado);
  const dificuldadeAtual = dificuldadesQuiz.find(
    (dificuldade) => dificuldade.id === dificuldadeSelecionada,
  );
  const temaRankingAtual = temasQuiz.find((tema) => tema.id === temaRanking);
  const encerrado = vidas === 0;
  const progressoAtual = obterProgressoQuiz(
    sessaoRef.current
      ? Math.max(
          respostasAcumuladasInicioRef.current + respondidas,
          (progressoUsuario?.total_respostas ?? 0) +
            Math.max(0, respondidas - respostasDaPartidaPersistidas),
        )
      : (progressoUsuario?.total_respostas ?? 0),
  );
  const indiceCorreto = pergunta
    ? opcoes.findIndex((opcao) => opcao === pergunta.opcoes[pergunta.correta])
    : -1;

  useEffect(() => {
    let ativo = true;
    setCarregandoRanking(true);
    setErroRanking(null);

    void supabase
      .from("quiz_ranking")
      .select("user_id, display_name, best_score, total_respostas, nivel")
      .eq("tema", temaRanking)
      .order("best_score", { ascending: false })
      .order("updated_at", { ascending: true })
      .limit(10)
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) {
          setErroRanking("Não foi possível carregar o ranking. Tente novamente mais tarde.");
          setRanking([]);
        } else {
          setRanking((data ?? []).flatMap((linha): PontuacaoRanking[] => {
            if (linha.user_id === null || linha.display_name === null || linha.best_score === null || linha.total_respostas === null || linha.nivel === null) return [];
            return [{ user_id: linha.user_id, display_name: linha.display_name, best_score: linha.best_score, total_respostas: linha.total_respostas, nivel: linha.nivel }];
          }));
        }
        setCarregandoRanking(false);
      });

    return () => {
      ativo = false;
    };
  }, [temaRanking, versaoRanking]);

  useEffect(() => {
    let ativo = true;
    setCarregandoProgresso(true);
    setErroProgresso(null);

    void supabase.auth.getUser().then(async ({ data, error }) => {
      if (!ativo) return;
      if (error || !data.user) {
        setErroProgresso("Não foi possível identificar seu usuário para carregar o progresso.");
        setProgressoUsuario(null);
        setCarregandoProgresso(false);
        return;
      }

      const resultado = await supabase
        .from("quiz_user_progress")
        .select("total_respostas, nivel")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!ativo) return;
      if (resultado.error) {
        setErroProgresso("Não foi possível carregar seu progresso.");
        setProgressoUsuario(null);
      } else {
        setProgressoUsuario(resultado.data);
      }
      setCarregandoProgresso(false);
    });

    return () => {
      ativo = false;
    };
  }, [versaoRanking]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="relative p-5 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full bg-primary/10 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-3 gap-1.5 border-primary/30 bg-primary/5">
                <ShieldCheck className="size-3.5 text-primary" />
                Treinamento de segurança patrimonial
              </Badge>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Teste seus conhecimentos
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                Escolha um tema e uma dificuldade. Some pontos e acompanhe sua posição no ranking de
                cada assunto.
              </p>
            </div>
            {temaSelecionado && (
              <Button
                type="button"
                variant="outline"
                onClick={voltarTemas}
                disabled={salvandoResposta || Boolean(erroSalvarResposta)}
              >
                <ArrowLeft />
                Trocar tema
              </Button>
            )}
          </div>
        </div>
      </header>

      {!temaSelecionado ? (
        <section aria-labelledby="selecione-tema" className="space-y-4">
          <div>
            <h2 id="selecione-tema" className="text-xl font-semibold">
              Qual tema você gostaria de responder?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Primeiro selecione uma área para continuar.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {temasQuiz.map((tema) => {
              const Icone = iconesTema[tema.icon];
              return (
                <button
                  key={tema.id}
                  type="button"
                  onClick={() => {
                    setTemaSelecionado(tema.id);
                    setTemaRanking(tema.id);
                  }}
                  className="group flex min-h-36 items-start gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-card transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Icone className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold group-hover:text-primary">
                      {tema.titulo}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                      {tema.descricao}
                    </span>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      Escolher tema <Sparkles className="size-3.5" />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="rounded-lg border border-border bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
            Conteúdo educativo baseado em legislação brasileira. Consulte os textos oficiais
            atualizados e os procedimentos da sua organização; este quiz não substitui treinamento
            profissional nem orientação jurídica.
          </p>
        </section>
      ) : !dificuldadeSelecionada ? (
        <section aria-labelledby="selecione-dificuldade" className="space-y-4">
          <div>
            <Badge variant="secondary">{temaAtual?.titulo}</Badge>
            <h2 id="selecione-dificuldade" className="mt-3 text-xl font-semibold">
              Qual nível de dificuldade você deseja responder?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              As perguntas serão selecionadas de acordo com o nível escolhido.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {dificuldadesQuiz.map((dificuldade) => (
              <button
                key={dificuldade.id}
                type="button"
                onClick={() => iniciarQuiz(temaSelecionado, dificuldade.id)}
                className="group flex min-h-36 flex-col items-start rounded-xl border border-border bg-card p-5 text-left shadow-card transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Target className="size-5" />
                </span>
                <span className="mt-3 font-semibold group-hover:text-primary">
                  {dificuldade.titulo}
                </span>
                <span className="mt-1 text-sm leading-5 text-muted-foreground">
                  {dificuldade.descricao}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : encerrado ? (
        <section className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 text-center shadow-card sm:p-10">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Heart className="size-7 fill-current" />
          </span>
          <h2 className="mt-4 text-2xl font-bold">Fim das tentativas</h2>
          <p className="mt-2 text-muted-foreground">
            Você respondeu {respondidas} {respondidas === 1 ? "pergunta" : "perguntas"} e marcou{" "}
            <strong className="text-foreground">{pontos} pontos</strong> em {temaAtual?.titulo} —{" "}
            nível {dificuldadeAtual?.titulo}.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua melhor pontuação neste tema aparece no ranking. Revise as explicações e tente
            novamente.
          </p>
          {salvandoResposta && (
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              Salvando sua resposta e seu progresso...
            </p>
          )}
          {erroSalvarResposta && (
            <div className="mt-4 space-y-3" role="alert">
              <p className="text-sm text-destructive">{erroSalvarResposta}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void salvarRespostaPendente()}
                disabled={salvandoResposta}
              >
                Tentar salvar novamente
              </Button>
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              disabled={salvandoResposta || Boolean(erroSalvarResposta)}
              onClick={() =>
                temaSelecionado &&
                dificuldadeSelecionada &&
                iniciarQuiz(temaSelecionado, dificuldadeSelecionada)
              }
            >
              <RotateCcw />
              Tentar novamente
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={voltarTemas}
              disabled={salvandoResposta || Boolean(erroSalvarResposta)}
            >
              Escolher outro tema
            </Button>
          </div>
        </section>
      ) : (
        <section aria-labelledby="pergunta-titulo" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Indicador
              icone={<Target className="size-4 text-primary" />}
              rotulo="Pontuação"
              valor={pontos}
            />
            <Indicador
              icone={<BookOpen className="size-4 text-sky-600" />}
              rotulo="Respondidas"
              valor={respondidas}
            />
            <div className="col-span-2 rounded-xl border border-border bg-card p-4 shadow-card sm:col-span-1">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Heart className="size-4 text-rose-500" />
                Chances restantes
              </div>
              <div className="mt-2 flex gap-1.5" aria-label={`${vidas} chances restantes`}>
                {Array.from({ length: 3 }, (_, indice) => (
                  <Heart
                    key={indice}
                    className={`size-5 ${indice < vidas ? "fill-rose-500 text-rose-500" : "text-muted"}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {pergunta && (
            <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{temaAtual?.titulo}</Badge>
                  <Badge variant="outline">
                    {dificuldadeAtual?.titulo} · {pergunta.nivel}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  Pergunta {respondidas + (respostaEscolhida === null ? 1 : 0)}
                </span>
              </div>

              <div className="p-4 sm:p-6">
                <h2 id="pergunta-titulo" className="text-lg font-semibold leading-7 sm:text-xl">
                  {pergunta.enunciado}
                </h2>
                <div className="mt-5 grid gap-2.5">
                  {opcoes.map((opcao, indice) => {
                    const selecionada = respostaEscolhida === indice;
                    const eCorreta = indiceCorreto === indice;
                    const respondido = respostaEscolhida !== null;
                    const estilo =
                      respondido && eCorreta
                        ? "border-emerald-500 bg-emerald-500/10 text-foreground"
                        : selecionada && acertou === false
                          ? "border-destructive bg-destructive/10 text-foreground"
                          : "border-border bg-background hover:border-primary/40 hover:bg-primary/5";

                    return (
                      <button
                        key={`${pergunta.id}-${opcao}`}
                        type="button"
                        disabled={respondido}
                        onClick={() => responder(indice)}
                        className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-4 ${estilo} disabled:cursor-default`}
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-current/20 text-xs font-bold">
                          {String.fromCharCode(65 + indice)}
                        </span>
                        <span className="min-w-0 flex-1 pt-1 leading-5">{opcao}</span>
                        {respondido && eCorreta && (
                          <Check className="mt-1 size-4 shrink-0 text-emerald-600" />
                        )}
                        {selecionada && acertou === false && (
                          <X className="mt-1 size-4 shrink-0 text-destructive" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {respostaEscolhida !== null && (
                  <div
                    aria-live="polite"
                    className={`mt-5 rounded-xl border p-4 ${
                      acertou
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-amber-500/30 bg-amber-500/5"
                    }`}
                  >
                    <p className="font-semibold">
                      {acertou
                        ? "Resposta correta! +10 pontos"
                        : "Resposta incorreta. Você perdeu uma chance."}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {pergunta.explicacao}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        Referência: {pergunta.artigo}
                      </span>
                      <a
                        href={pergunta.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        <BookOpen className="size-3.5" />
                        Consultar {pergunta.fonte}
                      </a>
                    </div>
                  </div>
                )}

                {respostaEscolhida !== null && vidas > 0 && (
                  <div className="mt-5 flex justify-end">
                    {erroSalvarResposta ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void salvarRespostaPendente()}
                      >
                        Tentar salvar novamente
                      </Button>
                    ) : salvandoResposta ? (
                      <p role="status" className="text-sm text-muted-foreground">
                        Salvando resposta...
                      </p>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => carregarPergunta(temaSelecionado, dificuldadeSelecionada)}
                      >
                        Próxima pergunta
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </article>
          )}

          <p className="rounded-lg border border-border bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
            Material de estudo, não aconselhamento jurídico. Aplique a legislação vigente e os
            procedimentos da organização; em caso real, procure a supervisão e as autoridades
            competentes.
          </p>
        </section>
      )}

      <section
        aria-labelledby="meu-progresso-titulo"
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
      >
        <div className="border-b border-border p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-2">
            <Target className="size-5 text-primary" />
            <h2 id="meu-progresso-titulo" className="min-w-0 text-lg font-semibold sm:text-xl">
              Meu progresso
            </h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Complete cada sequência de 10 respostas para conquistar o nível correspondente. O
            progresso continua entre temas e partidas.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 md:p-6 xl:grid-cols-3">
          <div className="min-w-0 rounded-xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Nível atual</p>
            <p className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-1 text-2xl font-bold leading-tight tabular-nums sm:text-3xl">
              <span className="min-w-0 break-words">
                {progressoAtual.nivel === 0
                  ? "Em andamento"
                  : String(progressoAtual.nivel).padStart(2, "0")}
              </span>
              <span className="text-sm font-medium text-muted-foreground sm:text-base">/ 1000</span>
            </p>
            {!carregandoProgresso && (
              <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                {progressoAtual.respostasParaProximoNivel === 0
                  ? "Nível máximo alcançado"
                  : `Mais ${progressoAtual.respostasParaProximoNivel} respostas para ${
                      progressoAtual.nivel === 0
                        ? "conquistar o nível 01"
                        : "alcançar o próximo nível"
                    }`}
              </p>
            )}
          </div>
          <div className="min-w-0 rounded-xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Respostas acumuladas</p>
            <p className="mt-1 break-words text-2xl font-bold tabular-nums sm:text-3xl">
              {progressoAtual.totalRespostas.toLocaleString("pt-BR")}
            </p>
            <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
              {carregandoProgresso
                ? "Carregando seu histórico..."
                : erroProgresso
                  ? erroProgresso
                  : "Contagem geral em todos os temas"}
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-border bg-background p-4 md:col-span-2 xl:col-span-1">
            <p className="text-sm text-muted-foreground">Medalha</p>
            <div className="mt-2 flex min-w-0 items-center gap-2">
              <Medal
                className={`size-7 shrink-0 ${
                  progressoAtual.medalha === "ouro"
                    ? "text-amber-500"
                    : progressoAtual.medalha === "prata"
                      ? "text-slate-400"
                      : progressoAtual.medalha === "bronze"
                        ? "text-amber-700"
                        : "text-muted"
                }`}
              />
              <span className="min-w-0 break-words text-base font-semibold capitalize sm:text-lg">
                {progressoAtual.medalha ?? "Ainda sem medalha"}
              </span>
            </div>
            <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
              {progressoAtual.respostasParaProximaMedalha === 0
                ? "Todas as medalhas conquistadas"
                : `Faltam ${progressoAtual.respostasParaProximaMedalha.toLocaleString("pt-BR")} respostas para a próxima medalha`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 px-5 pb-5 sm:px-6 sm:pb-6">
          {[
            { nome: "Bronze", respostas: 100, estilo: "text-amber-700" },
            { nome: "Prata", respostas: 500, estilo: "text-slate-500" },
            { nome: "Ouro", respostas: 1000, estilo: "text-amber-500" },
          ].map((marco) => (
            <Badge
              key={marco.nome}
              variant="outline"
              className={
                progressoAtual.totalRespostas >= marco.respostas
                  ? marco.estilo
                  : "text-muted-foreground"
              }
            >
              <Medal className="mr-1 size-3.5" />
              {marco.nome}: {marco.respostas.toLocaleString("pt-BR")} respostas
            </Badge>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="ranking-titulo"
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
      >
        <div className="border-b border-border p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-amber-500" />
            <h2 id="ranking-titulo" className="text-xl font-semibold">
              Ranking por tema
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Melhores pontuações dos usuários em cada assunto.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {temasQuiz.map((tema) => (
              <Button
                key={tema.id}
                type="button"
                size="sm"
                variant={temaRanking === tema.id ? "default" : "outline"}
                onClick={() => setTemaRanking(tema.id)}
              >
                {tema.titulo}
              </Button>
            ))}
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <h3 className="mb-3 font-semibold">{temaRankingAtual?.titulo}</h3>
          {carregandoRanking ? (
            <p className="text-sm text-muted-foreground">Carregando ranking...</p>
          ) : erroRanking ? (
            <p role="alert" className="text-sm text-destructive">
              {erroRanking}
            </p>
          ) : ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda não há pontuações registradas neste tema. Seja o primeiro a jogar!
            </p>
          ) : (
            <ol className="space-y-2">
              {ranking.map((linha, indice) => {
                const progressoLinha = obterProgressoQuiz(linha.total_respostas);
                const nivelLinha =
                  linha.nivel === 0
                    ? "Nível 01 em andamento"
                    : `Nível ${String(linha.nivel).padStart(2, "0")}`;
                return (
                  <li
                    key={linha.user_id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-bold tabular-nums">
                      {indice < 3 ? (
                        <Medal
                          className={`size-5 ${indice === 0 ? "text-amber-500" : indice === 1 ? "text-slate-400" : "text-amber-700"}`}
                        />
                      ) : (
                        indice + 1
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {linha.display_name}
                    </span>
                    <span className="hidden text-right text-xs text-muted-foreground sm:block">
                      <span className="block">
                        {nivelLinha} · {linha.total_respostas.toLocaleString("pt-BR")} respostas
                      </span>
                      {progressoLinha.medalha && (
                        <span className="block capitalize">{progressoLinha.medalha}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-bold tabular-nums">
                        {linha.best_score} pontos
                      </span>
                      <span className="block text-xs text-muted-foreground sm:hidden">
                        {nivelLinha} · {linha.total_respostas.toLocaleString("pt-BR")} resp.
                        {progressoLinha.medalha ? ` · ${progressoLinha.medalha}` : ""}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}

function Indicador({
  icone,
  rotulo,
  valor,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icone}
        {rotulo}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{valor}</p>
    </div>
  );
}
