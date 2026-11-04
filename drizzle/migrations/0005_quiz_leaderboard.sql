CREATE TABLE IF NOT EXISTS public.quiz_scores (
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
  best_score integer NOT NULL CHECK (best_score >= 0),
  display_name text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tema)
);

ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.quiz_scores TO authenticated;

CREATE POLICY "Authenticated users can view quiz rankings"
  ON public.quiz_scores FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('00', '01', '02', '03'));

CREATE OR REPLACE FUNCTION public.registrar_pontuacao_quiz(
  p_tema text,
  p_pontuacao integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_display_name text;
BEGIN
  IF v_user_id IS NULL OR public.current_user_role() NOT IN ('00', '01', '02', '03') THEN
    RAISE EXCEPTION 'Usuário não autorizado para registrar pontuação.';
  END IF;

  IF p_tema IS NULL OR p_tema NOT IN (
    'fundamentos',
    'penal',
    'processual-penal',
    'lgpd',
    'constitucional',
    'seguranca-privada'
  ) OR p_pontuacao IS NULL OR p_pontuacao < 0 THEN
    RAISE EXCEPTION 'Tema ou pontuação inválidos.';
  END IF;

  SELECT display_name
  INTO v_display_name
  FROM public.user_roles
  WHERE user_id = v_user_id;

  IF v_display_name IS NULL THEN
    RAISE EXCEPTION 'Perfil do usuário não encontrado.';
  END IF;

  INSERT INTO public.quiz_scores AS pontuacao_atual (user_id, tema, best_score, display_name)
  VALUES (v_user_id, p_tema, p_pontuacao, v_display_name)
  ON CONFLICT (user_id, tema) DO UPDATE
  SET best_score = greatest(pontuacao_atual.best_score, excluded.best_score),
      display_name = excluded.display_name,
      updated_at = now();
END
$$;

REVOKE ALL ON FUNCTION public.registrar_pontuacao_quiz(text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.registrar_pontuacao_quiz(text, integer) TO authenticated;

CREATE INDEX IF NOT EXISTS quiz_scores_theme_rank_idx
  ON public.quiz_scores (tema, best_score DESC, updated_at ASC);

NOTIFY pgrst, 'reload schema';
