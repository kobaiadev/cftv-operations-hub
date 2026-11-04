CREATE TABLE public.quiz_scores (
 user_id uuid NOT NULL, tema text NOT NULL CHECK (tema IN ('fundamentos','penal','processual-penal','lgpd','constitucional','seguranca-privada')),
 best_score integer NOT NULL CHECK (best_score >= 0), display_name text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,tema)
);
GRANT SELECT ON public.quiz_scores TO authenticated;
GRANT ALL ON public.quiz_scores TO service_role;
ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view quiz rankings" ON public.quiz_scores FOR SELECT TO authenticated USING (public.current_user_role() IN ('00','01','02','03'));
CREATE INDEX quiz_scores_theme_rank_idx ON public.quiz_scores(tema,best_score DESC,updated_at ASC);
CREATE TABLE public.quiz_user_progress (
 user_id uuid PRIMARY KEY, display_name text NOT NULL, total_respostas integer NOT NULL DEFAULT 0 CHECK(total_respostas >= 0), nivel integer NOT NULL DEFAULT 0 CHECK(nivel BETWEEN 0 AND 1000), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_user_progress TO authenticated;
GRANT ALL ON public.quiz_user_progress TO service_role;
ALTER TABLE public.quiz_user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view quiz progression" ON public.quiz_user_progress FOR SELECT TO authenticated USING(public.current_user_role() IN ('00','01','02','03'));
CREATE TABLE public.quiz_game_sessions (
 session_id uuid PRIMARY KEY, user_id uuid NOT NULL, tema text NOT NULL CHECK(tema IN ('fundamentos','penal','processual-penal','lgpd','constitucional','seguranca-privada')), respostas integer NOT NULL CHECK(respostas > 0), pontuacao integer NOT NULL CHECK(pontuacao >= 0), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.quiz_game_sessions TO service_role;
REVOKE ALL ON public.quiz_game_sessions FROM PUBLIC,anon,authenticated;
ALTER TABLE public.quiz_game_sessions ENABLE ROW LEVEL SECURITY;
CREATE VIEW public.quiz_ranking WITH(security_invoker = true) AS SELECT scores.user_id,progress.display_name,scores.tema,scores.best_score,scores.updated_at,progress.total_respostas,progress.nivel FROM public.quiz_scores AS scores JOIN public.quiz_user_progress AS progress ON progress.user_id=scores.user_id;
GRANT SELECT ON public.quiz_ranking TO authenticated;
GRANT ALL ON public.quiz_ranking TO service_role;
CREATE OR REPLACE FUNCTION public.registrar_pontuacao_quiz(p_tema text,p_pontuacao integer,p_respostas integer,p_sessao uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user_id uuid := auth.uid(); v_display_name text; v_linhas_inseridas integer;
BEGIN
 IF v_user_id IS NULL OR coalesce(public.current_user_role() NOT IN ('00','01','02','03'),true) THEN RAISE EXCEPTION 'Usuário não autorizado para registrar pontuação.'; END IF;
 IF p_tema IS NULL OR p_tema NOT IN ('fundamentos','penal','processual-penal','lgpd','constitucional','seguranca-privada') OR p_pontuacao IS NULL OR p_pontuacao < 0 OR p_pontuacao % 10 <> 0 OR p_respostas IS NULL OR p_respostas <= 0 OR p_pontuacao::bigint > p_respostas::bigint * 10 OR p_sessao IS NULL THEN RAISE EXCEPTION 'Tema, sessão, respostas ou pontuação inválidos.'; END IF;
 SELECT display_name INTO v_display_name FROM public.user_roles WHERE user_id=v_user_id;
 IF v_display_name IS NULL THEN RAISE EXCEPTION 'Perfil do usuário não encontrado.'; END IF;
 IF p_respostas=1 THEN
 INSERT INTO public.quiz_game_sessions(session_id,user_id,tema,respostas,pontuacao) VALUES(p_sessao,v_user_id,p_tema,1,p_pontuacao) ON CONFLICT(session_id) DO NOTHING;
 ELSE
 UPDATE public.quiz_game_sessions SET respostas=p_respostas,pontuacao=p_pontuacao WHERE session_id=p_sessao AND user_id=v_user_id AND tema=p_tema AND respostas=p_respostas-1 AND pontuacao<=p_pontuacao;
 END IF;
 GET DIAGNOSTICS v_linhas_inseridas=ROW_COUNT;
 IF v_linhas_inseridas=0 THEN RETURN; END IF;
 INSERT INTO public.quiz_user_progress AS progresso(user_id,display_name,total_respostas,nivel) VALUES(v_user_id,v_display_name,1,0) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,total_respostas=progresso.total_respostas+1,nivel=least(1000,(progresso.total_respostas+1)/10),updated_at=now();
 INSERT INTO public.quiz_scores AS pontuacao_atual(user_id,tema,best_score,display_name) VALUES(v_user_id,p_tema,p_pontuacao,v_display_name) ON CONFLICT(user_id,tema) DO UPDATE SET best_score=greatest(pontuacao_atual.best_score,excluded.best_score),display_name=excluded.display_name,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.registrar_pontuacao_quiz(text,integer,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.registrar_pontuacao_quiz(text,integer,integer,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';