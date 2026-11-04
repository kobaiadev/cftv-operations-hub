alter table public.quiz_game_sessions
  ADD COLUMN IF NOT EXISTS dificuldade text NOT NULL DEFAULT 'normal'
    CHECK (dificuldade IN ('facil', 'normal', 'dificil')),
  ADD COLUMN IF NOT EXISTS pergunta_atual text,
  ADD COLUMN IF NOT EXISTS perguntas_vistas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vidas smallint NOT NULL DEFAULT 3 CHECK (vidas BETWEEN 0 AND 3),
  ADD COLUMN IF NOT EXISTS concluida boolean NOT NULL DEFAULT false;

ALTER TABLE public.quiz_game_sessions
  DROP CONSTRAINT IF EXISTS quiz_game_sessions_respostas_check,
  ADD CONSTRAINT quiz_game_sessions_respostas_check CHECK (respostas >= 0);

CREATE TABLE IF NOT EXISTS public.quiz_game_answers (
  session_id uuid NOT NULL REFERENCES public.quiz_game_sessions (session_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  resposta_numero integer NOT NULL CHECK (resposta_numero > 0),
  pergunta_id text NOT NULL,
  opcao_escolhida text NOT NULL,
  correta boolean NOT NULL,
  opcao_correta text NOT NULL,
  pontuacao integer NOT NULL CHECK (pontuacao >= 0),
  total_respostas integer NOT NULL CHECK (total_respostas > 0),
  vidas smallint NOT NULL CHECK (vidas BETWEEN 0 AND 3),
  proxima_pergunta_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, resposta_numero)
);

ALTER TABLE public.quiz_game_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quiz_game_answers FROM public, anon, authenticated;
REVOKE ALL ON public.quiz_game_sessions FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.quiz_game_sessions TO service_role;
GRANT SELECT ON public.quiz_game_answers, public.quiz_user_progress TO service_role;

DROP FUNCTION IF EXISTS public.registrar_pontuacao_quiz(text, integer);
DROP FUNCTION IF EXISTS public.registrar_pontuacao_quiz(text, integer, integer, uuid);

CREATE OR REPLACE FUNCTION public.registrar_resposta_quiz(
  p_user_id uuid,
  p_session_id uuid,
  p_tema text,
  p_resposta_numero integer,
  p_pergunta_id text,
  p_opcao_escolhida text,
  p_correta boolean,
  p_opcao_correta text,
  p_proxima_pergunta_id text,
  p_perguntas_vistas text[]
)
RETURNS TABLE (
  correta boolean,
  opcao_correta text,
  pontuacao integer,
  total_respostas integer,
  vidas smallint,
  progresso_total integer,
  nivel integer,
  proxima_pergunta_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sessao public.quiz_game_sessions%ROWTYPE;
  v_resposta public.quiz_game_answers%ROWTYPE;
  v_progresso_total integer;
  v_nivel integer;
  v_pontuacao integer;
  v_total_respostas integer;
  v_vidas smallint;
  v_concluida boolean;
BEGIN
  IF p_user_id IS NULL OR p_session_id IS NULL OR p_tema IS NULL
    OR p_resposta_numero IS NULL OR p_resposta_numero < 1
    OR p_pergunta_id IS NULL OR p_opcao_escolhida IS NULL
    OR p_opcao_correta IS NULL OR p_perguntas_vistas IS NULL
    OR p_correta IS DISTINCT FROM (p_opcao_escolhida = p_opcao_correta)
  THEN
    RAISE EXCEPTION 'Resposta do quiz inválida.';
  END IF;

  SELECT *
  INTO v_sessao
  FROM public.quiz_game_sessions
  WHERE session_id = p_session_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_sessao.tema <> p_tema THEN
    RAISE EXCEPTION 'Sessão do quiz não encontrada.';
  END IF;

  IF p_resposta_numero <= v_sessao.respostas THEN
    SELECT *
    INTO v_resposta
    FROM public.quiz_game_answers
    WHERE session_id = p_session_id AND resposta_numero = p_resposta_numero;

    IF FOUND
      AND v_resposta.pergunta_id = p_pergunta_id
      AND v_resposta.opcao_escolhida = p_opcao_escolhida
    THEN
      RETURN QUERY
        SELECT v_resposta.correta, v_resposta.opcao_correta,
          v_resposta.pontuacao, v_resposta.total_respostas, v_resposta.vidas,
          progresso.total_respostas, progresso.nivel, v_resposta.proxima_pergunta_id
        FROM public.quiz_user_progress AS progresso
        WHERE progresso.user_id = p_user_id;
      RETURN;
    END IF;

    RAISE EXCEPTION 'Esta resposta já foi registrada.';
  END IF;

  IF v_sessao.concluida
    OR v_sessao.pergunta_atual IS DISTINCT FROM p_pergunta_id
    OR p_resposta_numero <> v_sessao.respostas + 1
    OR NOT (p_pergunta_id = ANY(p_perguntas_vistas))
  THEN
    RAISE EXCEPTION 'A pergunta não corresponde à sessão atual.';
  END IF;

  v_total_respostas := v_sessao.respostas + 1;
  v_pontuacao := v_sessao.pontuacao + CASE WHEN p_correta THEN 10 ELSE 0 END;
  v_vidas := v_sessao.vidas - CASE WHEN p_correta THEN 0 ELSE 1 END;
  v_concluida := v_vidas = 0;

  IF v_concluida AND p_proxima_pergunta_id IS NOT NULL THEN
    RAISE EXCEPTION 'Uma partida encerrada não pode avançar para outra pergunta.';
  END IF;
  IF NOT v_concluida AND p_proxima_pergunta_id IS NULL THEN
    RAISE EXCEPTION 'A próxima pergunta da sessão não foi informada.';
  END IF;

  UPDATE public.quiz_game_sessions
  SET respostas = v_total_respostas,
      pontuacao = v_pontuacao,
      vidas = v_vidas,
      concluida = v_concluida,
      pergunta_atual = p_proxima_pergunta_id,
      perguntas_vistas = p_perguntas_vistas
  WHERE session_id = p_session_id;

  INSERT INTO public.quiz_game_answers (
    session_id, user_id, resposta_numero, pergunta_id, opcao_escolhida,
    correta, opcao_correta, pontuacao, total_respostas, vidas,
    proxima_pergunta_id
  )
  VALUES (
    p_session_id, p_user_id, p_resposta_numero, p_pergunta_id, p_opcao_escolhida,
    p_correta, p_opcao_correta, v_pontuacao, v_total_respostas, v_vidas,
    p_proxima_pergunta_id
  );

  INSERT INTO public.quiz_user_progress AS progresso (
    user_id, display_name, total_respostas, nivel
  )
  SELECT p_user_id, roles.display_name, 1, 0
  FROM public.user_roles AS roles
  WHERE roles.user_id = p_user_id AND roles.role IN ('00', '01', '02', '03')
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = excluded.display_name,
      total_respostas = progresso.total_respostas + 1,
      nivel = least(1000, (progresso.total_respostas + 1) / 10),
      updated_at = now()
  RETURNING progresso.total_respostas, progresso.nivel
  INTO v_progresso_total, v_nivel;

  IF v_progresso_total IS NULL THEN
    RAISE EXCEPTION 'Perfil do usuário não encontrado.';
  END IF;

  INSERT INTO public.quiz_scores AS pontuacao_atual (
    user_id, tema, best_score, display_name
  )
  SELECT p_user_id, p_tema, v_pontuacao, roles.display_name
  FROM public.user_roles AS roles
  WHERE roles.user_id = p_user_id
  ON CONFLICT (user_id, tema) DO UPDATE
  SET best_score = greatest(pontuacao_atual.best_score, excluded.best_score),
      display_name = excluded.display_name,
      updated_at = now();

  RETURN QUERY
    SELECT p_correta, p_opcao_correta, v_pontuacao, v_total_respostas,
      v_vidas, v_progresso_total, v_nivel, p_proxima_pergunta_id;
END
$$;

REVOKE ALL ON FUNCTION public.registrar_resposta_quiz(
  uuid, uuid, text, integer, text, text, boolean, text, text, text[]
) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_resposta_quiz(
  uuid, uuid, text, integer, text, text, boolean, text, text, text[]
) TO service_role;

NOTIFY pgrst, 'reload schema';
