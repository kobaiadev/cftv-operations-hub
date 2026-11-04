CREATE TABLE IF NOT EXISTS public.quiz_user_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  total_respostas integer NOT NULL DEFAULT 0 CHECK (total_respostas >= 0),
  nivel integer NOT NULL DEFAULT 0 CHECK (nivel BETWEEN 0 AND 1000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_user_progress ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.quiz_user_progress TO authenticated;

CREATE POLICY "Authenticated users can view quiz progression"
  ON public.quiz_user_progress FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('00', '01', '02', '03'));

INSERT INTO public.quiz_user_progress (user_id, display_name, total_respostas, nivel)
SELECT user_id, max(display_name), 0, 0
FROM public.quiz_scores
GROUP BY user_id
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.quiz_game_sessions (
  session_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tema text NOT NULL CHECK (
    tema IN (
      'fundamentos',
      'penal',
      'processual-penal',
      'lgpd',
      'constitucional',
      'seguranca-privada'
    )
  ),
  respostas integer NOT NULL CHECK (respostas > 0),
  pontuacao integer NOT NULL CHECK (pontuacao >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_game_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quiz_game_sessions FROM public, anon, authenticated;

DROP VIEW IF EXISTS public.quiz_ranking;
CREATE VIEW public.quiz_ranking WITH (security_invoker = true) AS
SELECT
  scores.user_id,
  progress.display_name,
  scores.tema,
  scores.best_score,
  scores.updated_at,
  progress.total_respostas,
  progress.nivel
FROM public.quiz_scores AS scores
JOIN public.quiz_user_progress AS progress ON progress.user_id = scores.user_id;

GRANT SELECT ON public.quiz_ranking TO authenticated;

DROP FUNCTION IF EXISTS public.registrar_pontuacao_quiz(text, integer);

CREATE OR REPLACE FUNCTION public.registrar_pontuacao_quiz(
  p_tema text,
  p_pontuacao integer,
  p_respostas integer,
  p_sessao uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_display_name text;
  v_linhas_inseridas integer;
BEGIN
  IF
    v_user_id IS NULL
    OR coalesce(public.current_user_role() NOT IN ('00', '01', '02', '03'), true)
  THEN
    RAISE EXCEPTION 'Usuário não autorizado para registrar pontuação.';
  END IF;

  IF p_tema IS NULL OR p_tema NOT IN (
    'fundamentos',
    'penal',
    'processual-penal',
    'lgpd',
    'constitucional',
    'seguranca-privada'
  ) OR p_pontuacao IS NULL OR p_pontuacao < 0 OR p_pontuacao % 10 <> 0 OR p_pontuacao > p_respostas * 10 OR p_respostas IS NULL OR p_respostas <= 0 OR p_sessao IS NULL THEN
    RAISE EXCEPTION 'Tema, sessão, respostas ou pontuação inválidos.';
  END IF;

  SELECT display_name
  INTO v_display_name
  FROM public.user_roles
  WHERE user_id = v_user_id;

  IF v_display_name IS NULL THEN
    RAISE EXCEPTION 'Perfil do usuário não encontrado.';
  END IF;

  IF p_respostas = 1 THEN
    INSERT INTO public.quiz_game_sessions (session_id, user_id, tema, respostas, pontuacao)
    VALUES (p_sessao, v_user_id, p_tema, 1, p_pontuacao)
    ON CONFLICT (session_id) DO NOTHING;
  ELSE
    UPDATE public.quiz_game_sessions
    SET respostas = p_respostas,
        pontuacao = p_pontuacao
    WHERE session_id = p_sessao
      AND user_id = v_user_id
      AND tema = p_tema
      AND respostas = p_respostas - 1
      AND pontuacao <= p_pontuacao;
  END IF;

  GET DIAGNOSTICS v_linhas_inseridas = ROW_COUNT;
  IF v_linhas_inseridas = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.quiz_user_progress AS progresso
    (user_id, display_name, total_respostas, nivel)
  VALUES (
    v_user_id,
    v_display_name,
    1,
    0
  )
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = excluded.display_name,
      total_respostas = progresso.total_respostas + 1,
      nivel = least(1000, (progresso.total_respostas + 1) / 10),
      updated_at = now();

  INSERT INTO public.quiz_scores AS pontuacao_atual
    (user_id, tema, best_score, display_name)
  VALUES (v_user_id, p_tema, p_pontuacao, v_display_name)
  ON CONFLICT (user_id, tema) DO UPDATE
  SET best_score = greatest(pontuacao_atual.best_score, excluded.best_score),
      display_name = excluded.display_name,
      updated_at = now();
END
$$;

REVOKE ALL ON FUNCTION public.registrar_pontuacao_quiz(text, integer, integer, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.registrar_pontuacao_quiz(text, integer, integer, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
