import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { DificuldadeQuiz, PerguntaQuiz } from "@/lib/quiz-seguranca";
import { obterPerguntasDoTema, temasQuiz } from "@/lib/quiz-seguranca";

const temasValidos = temasQuiz.map((tema) => tema.id) as [string, ...string[]];
const temaSchema = z.enum(temasValidos);
const dificuldadeSchema = z.enum(["facil", "normal", "dificil"]);
const niveisPorDificuldade: Record<DificuldadeQuiz, PerguntaQuiz["nivel"][]> = {
  facil: ["Básico"],
  normal: ["Básico", "Intermediário"],
  dificil: ["Intermediário", "Avançado"],
};

const schemasAcesso = {
  tema: temaSchema,
  dificuldade: dificuldadeSchema,
};

type PerguntaPublica = Omit<PerguntaQuiz, "correta">;

function validarDificuldade(value: string): DificuldadeQuiz {
  if (value === "facil" || value === "normal" || value === "dificil") return value;
  throw new Error("A dificuldade salva para esta partida é inválida.");
}

function perguntaPublica(pergunta: PerguntaQuiz): PerguntaPublica {
  const { correta: _correta, ...conteudo } = pergunta;
  return conteudo;
}

function escolherPergunta<T>(perguntas: readonly T[]): T {
  const indice = new Uint32Array(1);
  crypto.getRandomValues(indice);
  const escolhida = perguntas[indice[0]! % perguntas.length];
  if (!escolhida) throw new Error("Não há perguntas cadastradas para esta seleção.");
  return escolhida;
}

async function verificarAcesso(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data || !["00", "01", "02", "03"].includes(data.role)) {
    throw new Error("Não foi possível validar seu acesso ao quiz.");
  }
}

export const iniciarQuizSeguro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object(schemasAcesso).strict().parse(input))
  .handler(async ({ data, context }) => {
    await verificarAcesso(context.supabase, context.userId);
    const perguntas = obterPerguntasDoTema(data.tema, data.dificuldade);
    if (perguntas.length === 0) {
      throw new Error("Não há perguntas cadastradas para o tema e nível selecionados.");
    }

    const pergunta = escolherPergunta(perguntas);
    const sessionId = crypto.randomUUID();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("quiz_game_sessions").insert({
      session_id: sessionId,
      user_id: context.userId,
      tema: data.tema,
      respostas: 0,
      pontuacao: 0,
      dificuldade: data.dificuldade,
      pergunta_atual: pergunta.id,
      perguntas_vistas: [pergunta.id],
      vidas: 3,
      concluida: false,
    });
    if (error) throw new Error("Não foi possível iniciar a partida. Tente novamente.");

    return { sessionId, pergunta: perguntaPublica(pergunta) };
  });

const respostaSchema = z.object({
  sessionId: z.string().uuid(),
  tema: temaSchema,
  respostaNumero: z.number().int().min(1).max(100_000),
  perguntaId: z.string().min(1).max(100),
  opcaoEscolhida: z.string().min(1).max(2_000),
});

export const responderQuizSeguro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => respostaSchema.strict().parse(input))
  .handler(async ({ data, context }) => {
    await verificarAcesso(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("quiz_game_sessions")
      .select(
        "session_id, user_id, tema, respostas, pontuacao, dificuldade, pergunta_atual, perguntas_vistas, vidas, concluida",
      )
      .eq("session_id", data.sessionId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (sessionError || !session) throw new Error("A partida do quiz não foi encontrada.");
    if (session.tema !== data.tema)
      throw new Error("A partida não corresponde ao tema selecionado.");

    const { data: respostaExistente, error: respostaExistenteError } = await supabaseAdmin
      .from("quiz_game_answers")
      .select(
        "pergunta_id, opcao_escolhida, correta, opcao_correta, pontuacao, total_respostas, vidas, proxima_pergunta_id",
      )
      .eq("session_id", data.sessionId)
      .eq("resposta_numero", data.respostaNumero)
      .maybeSingle();
    if (respostaExistenteError) throw new Error("Não foi possível verificar a resposta salva.");

    if (respostaExistente) {
      if (
        respostaExistente.pergunta_id !== data.perguntaId ||
        respostaExistente.opcao_escolhida !== data.opcaoEscolhida
      ) {
        throw new Error("Esta resposta já foi registrada.");
      }
      const dificuldade = validarDificuldade(session.dificuldade);
      const proximaPergunta = respostaExistente.proxima_pergunta_id
        ? obterPerguntasDoTema(session.tema, dificuldade).find(
            (item) => item.id === respostaExistente.proxima_pergunta_id,
          )
        : undefined;
      const { data: progress, error: progressError } = await supabaseAdmin
        .from("quiz_user_progress")
        .select("total_respostas, nivel")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (progressError || !progress) {
        throw new Error("Não foi possível carregar o progresso atualizado.");
      }
      return {
        correta: respostaExistente.correta,
        opcaoCorreta: respostaExistente.opcao_correta,
        pontuacao: respostaExistente.pontuacao,
        respostas: respostaExistente.total_respostas,
        vidas: respostaExistente.vidas,
        progressoTotal: progress.total_respostas,
        nivel: progress.nivel,
        proximaPergunta: proximaPergunta ? perguntaPublica(proximaPergunta) : null,
      };
    }

    if (
      session.concluida ||
      session.pergunta_atual !== data.perguntaId ||
      session.respostas + 1 !== data.respostaNumero
    ) {
      throw new Error("A pergunta não corresponde à partida atual.");
    }

    const dificuldade = validarDificuldade(session.dificuldade);
    const perguntas = obterPerguntasDoTema(session.tema, dificuldade);
    const pergunta = perguntas.find((item) => item.id === session.pergunta_atual);
    if (!pergunta || !pergunta.opcoes.includes(data.opcaoEscolhida)) {
      throw new Error("A opção selecionada não é válida para esta pergunta.");
    }

    const correta = data.opcaoEscolhida === pergunta.opcoes[pergunta.correta];
    const opcaoCorreta = pergunta.opcoes[pergunta.correta];
    if (!opcaoCorreta) throw new Error("A resposta correta não está cadastrada.");
    const vidas = session.vidas - (correta ? 0 : 1);
    const semVidas = vidas === 0;
    const perguntasVistas = session.perguntas_vistas ?? [];
    let proximaPergunta: PerguntaQuiz | undefined;

    if (!semVidas) {
      let disponiveis = perguntas.filter((item) => !perguntasVistas.includes(item.id));
      if (disponiveis.length === 0) {
        disponiveis = perguntas.filter((item) => item.id !== pergunta.id);
      }
      if (disponiveis.length === 0) disponiveis = [pergunta];
      proximaPergunta = escolherPergunta(disponiveis);
    }

    const novasPerguntasVistas = proximaPergunta
      ? perguntasVistas.includes(proximaPergunta.id)
        ? [proximaPergunta.id]
        : [...perguntasVistas, proximaPergunta.id]
      : perguntasVistas;

    const { data: resultado, error } = await supabaseAdmin.rpc("registrar_resposta_quiz", {
      p_user_id: context.userId,
      p_session_id: data.sessionId,
      p_tema: session.tema,
      p_resposta_numero: data.respostaNumero,
      p_pergunta_id: pergunta.id,
      p_opcao_escolhida: data.opcaoEscolhida,
      p_correta: correta,
      p_opcao_correta: opcaoCorreta,
      p_proxima_pergunta_id: proximaPergunta?.id ?? null,
      p_perguntas_vistas: novasPerguntasVistas,
    });
    if (error) {
      throw new Error("Não foi possível salvar sua resposta. Tente novamente.");
    }
    const resumo = resultado?.[0];
    if (!resumo) throw new Error("O servidor não confirmou o salvamento da resposta.");
    const perguntaSeguinte = resumo.proxima_pergunta_id
      ? perguntas.find((item) => item.id === resumo.proxima_pergunta_id)
      : undefined;
    if (resumo.proxima_pergunta_id && !perguntaSeguinte) {
      throw new Error("A próxima pergunta da sessão não foi encontrada.");
    }

    return {
      correta: resumo.correta,
      opcaoCorreta: resumo.opcao_correta,
      pontuacao: resumo.pontuacao,
      respostas: resumo.total_respostas,
      vidas: resumo.vidas,
      progressoTotal: resumo.progresso_total,
      nivel: resumo.nivel,
      proximaPergunta: perguntaSeguinte ? perguntaPublica(perguntaSeguinte) : null,
    };
  });
