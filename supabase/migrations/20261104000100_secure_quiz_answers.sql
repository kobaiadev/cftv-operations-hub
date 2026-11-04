alter table public.quiz_game_sessions
  add column if not exists dificuldade text not null default 'normal'
    check (dificuldade in ('facil', 'normal', 'dificil')),
  add column if not exists pergunta_atual text,
  add column if not exists perguntas_vistas text[] not null default '{}',
  add column if not exists vidas smallint not null default 3 check (vidas between 0 and 3),
  add column if not exists concluida boolean not null default false;

alter table public.quiz_game_sessions
  drop constraint if exists quiz_game_sessions_respostas_check,
  add constraint quiz_game_sessions_respostas_check check (respostas >= 0);

create table if not exists public.quiz_game_answers (
  session_id uuid not null references public.quiz_game_sessions (session_id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  resposta_numero integer not null check (resposta_numero > 0),
  pergunta_id text not null,
  opcao_escolhida text not null,
  correta boolean not null,
  opcao_correta text not null,
  pontuacao integer not null check (pontuacao >= 0),
  total_respostas integer not null check (total_respostas > 0),
  vidas smallint not null check (vidas between 0 and 3),
  proxima_pergunta_id text,
  created_at timestamptz not null default now(),
  primary key (session_id, resposta_numero)
);

alter table public.quiz_game_answers enable row level security;
revoke all on public.quiz_game_answers from public, anon, authenticated;
revoke all on public.quiz_game_sessions from public, anon, authenticated;
grant select, insert, update on public.quiz_game_sessions to service_role;
grant select on public.quiz_game_answers, public.quiz_user_progress to service_role;

drop function if exists public.registrar_pontuacao_quiz(text, integer);
drop function if exists public.registrar_pontuacao_quiz(text, integer, integer, uuid);

create or replace function public.registrar_resposta_quiz(
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
returns table (
  correta boolean,
  opcao_correta text,
  pontuacao integer,
  total_respostas integer,
  vidas smallint,
  progresso_total integer,
  nivel integer,
  proxima_pergunta_id text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sessao public.quiz_game_sessions%rowtype;
  v_resposta public.quiz_game_answers%rowtype;
  v_progresso_total integer;
  v_nivel integer;
  v_pontuacao integer;
  v_total_respostas integer;
  v_vidas smallint;
  v_concluida boolean;
begin
  if p_user_id is null or p_session_id is null or p_tema is null
    or p_resposta_numero is null or p_resposta_numero < 1
    or p_pergunta_id is null or p_opcao_escolhida is null
    or p_opcao_correta is null or p_perguntas_vistas is null
    or p_correta is distinct from (p_opcao_escolhida = p_opcao_correta)
  then
    raise exception 'Resposta do quiz inválida.';
  end if;

  select *
  into v_sessao
  from public.quiz_game_sessions
  where session_id = p_session_id and user_id = p_user_id
  for update;

  if not found or v_sessao.tema <> p_tema then
    raise exception 'Sessão do quiz não encontrada.';
  end if;

  if p_resposta_numero <= v_sessao.respostas then
    select *
    into v_resposta
    from public.quiz_game_answers
    where session_id = p_session_id and resposta_numero = p_resposta_numero;

    if found
      and v_resposta.pergunta_id = p_pergunta_id
      and v_resposta.opcao_escolhida = p_opcao_escolhida
    then
      return query
        select v_resposta.correta, v_resposta.opcao_correta,
          v_resposta.pontuacao, v_resposta.total_respostas, v_resposta.vidas,
          progresso.total_respostas, progresso.nivel, v_resposta.proxima_pergunta_id
        from public.quiz_user_progress as progresso
        where progresso.user_id = p_user_id;
      return;
    end if;

    raise exception 'Esta resposta já foi registrada.';
  end if;

  if v_sessao.concluida
    or v_sessao.pergunta_atual is distinct from p_pergunta_id
    or p_resposta_numero <> v_sessao.respostas + 1
    or not (p_pergunta_id = any(p_perguntas_vistas))
  then
    raise exception 'A pergunta não corresponde à sessão atual.';
  end if;

  v_total_respostas := v_sessao.respostas + 1;
  v_pontuacao := v_sessao.pontuacao + case when p_correta then 10 else 0 end;
  v_vidas := v_sessao.vidas - case when p_correta then 0 else 1 end;
  v_concluida := v_vidas = 0;

  if v_concluida and p_proxima_pergunta_id is not null then
    raise exception 'Uma partida encerrada não pode avançar para outra pergunta.';
  end if;
  if not v_concluida and p_proxima_pergunta_id is null then
    raise exception 'A próxima pergunta da sessão não foi informada.';
  end if;

  update public.quiz_game_sessions
  set respostas = v_total_respostas,
      pontuacao = v_pontuacao,
      vidas = v_vidas,
      concluida = v_concluida,
      pergunta_atual = p_proxima_pergunta_id,
      perguntas_vistas = p_perguntas_vistas
  where session_id = p_session_id;

  insert into public.quiz_game_answers (
    session_id, user_id, resposta_numero, pergunta_id, opcao_escolhida,
    correta, opcao_correta, pontuacao, total_respostas, vidas,
    proxima_pergunta_id
  )
  values (
    p_session_id, p_user_id, p_resposta_numero, p_pergunta_id, p_opcao_escolhida,
    p_correta, p_opcao_correta, v_pontuacao, v_total_respostas, v_vidas,
    p_proxima_pergunta_id
  );

  insert into public.quiz_user_progress as progresso (
    user_id, display_name, total_respostas, nivel
  )
  select p_user_id, roles.display_name, 1, 0
  from public.user_roles as roles
  where roles.user_id = p_user_id and roles.role in ('00', '01', '02', '03')
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      total_respostas = progresso.total_respostas + 1,
      nivel = least(1000, (progresso.total_respostas + 1) / 10),
      updated_at = now()
  returning progresso.total_respostas, progresso.nivel
  into v_progresso_total, v_nivel;

  if v_progresso_total is null then
    raise exception 'Perfil do usuário não encontrado.';
  end if;

  insert into public.quiz_scores as pontuacao_atual (
    user_id, tema, best_score, display_name
  )
  select p_user_id, p_tema, v_pontuacao, roles.display_name
  from public.user_roles as roles
  where roles.user_id = p_user_id
  on conflict (user_id, tema) do update
  set best_score = greatest(pontuacao_atual.best_score, excluded.best_score),
      display_name = excluded.display_name,
      updated_at = now();

  return query
    select p_correta, p_opcao_correta, v_pontuacao, v_total_respostas,
      v_vidas, v_progresso_total, v_nivel, p_proxima_pergunta_id;
end
$$;

revoke all on function public.registrar_resposta_quiz(
  uuid, uuid, text, integer, text, text, boolean, text, text, text[]
) from public, anon, authenticated;
grant execute on function public.registrar_resposta_quiz(
  uuid, uuid, text, integer, text, text, boolean, text, text, text[]
) to service_role;

notify pgrst, 'reload schema';
