create table if not exists public.quiz_user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  total_respostas integer not null default 0 check (total_respostas >= 0),
  nivel integer not null default 0 check (nivel between 0 and 1000),
  updated_at timestamptz not null default now()
);

alter table public.quiz_user_progress enable row level security;
grant select on public.quiz_user_progress to authenticated;

create policy "Authenticated users can view quiz progression"
  on public.quiz_user_progress for select
  to authenticated
  using (public.current_user_role() in ('00', '01', '02', '03'));

insert into public.quiz_user_progress (user_id, display_name, total_respostas, nivel)
select user_id, max(display_name), 0, 0
from public.quiz_scores
group by user_id
on conflict (user_id) do nothing;

create table if not exists public.quiz_game_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  tema text not null check (
    tema in (
      'fundamentos',
      'penal',
      'processual-penal',
      'lgpd',
      'constitucional',
      'seguranca-privada'
    )
  ),
  respostas integer not null check (respostas > 0),
  pontuacao integer not null check (pontuacao >= 0),
  created_at timestamptz not null default now()
);

alter table public.quiz_game_sessions enable row level security;
revoke all on public.quiz_game_sessions from public, anon, authenticated;

drop view if exists public.quiz_ranking;
create view public.quiz_ranking with (security_invoker = true) as
select
  scores.user_id,
  progress.display_name,
  scores.tema,
  scores.best_score,
  scores.updated_at,
  progress.total_respostas,
  progress.nivel
from public.quiz_scores as scores
join public.quiz_user_progress as progress on progress.user_id = scores.user_id;

grant select on public.quiz_ranking to authenticated;

drop function if exists public.registrar_pontuacao_quiz(text, integer);

create or replace function public.registrar_pontuacao_quiz(
  p_tema text,
  p_pontuacao integer,
  p_respostas integer,
  p_sessao uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_display_name text;
  v_linhas_inseridas integer;
begin
  if
    v_user_id is null
    or coalesce(public.current_user_role() not in ('00', '01', '02', '03'), true)
  then
    raise exception 'Usuário não autorizado para registrar pontuação.';
  end if;

  if p_tema is null or p_tema not in (
    'fundamentos',
    'penal',
    'processual-penal',
    'lgpd',
    'constitucional',
    'seguranca-privada'
  ) or p_pontuacao is null or p_pontuacao < 0 or p_pontuacao % 10 <> 0 or p_pontuacao > p_respostas * 10 or p_respostas is null or p_respostas <= 0 or p_sessao is null then
    raise exception 'Tema, sessão, respostas ou pontuação inválidos.';
  end if;

  select display_name
  into v_display_name
  from public.user_roles
  where user_id = v_user_id;

  if v_display_name is null then
    raise exception 'Perfil do usuário não encontrado.';
  end if;

  if p_respostas = 1 then
    insert into public.quiz_game_sessions (session_id, user_id, tema, respostas, pontuacao)
    values (p_sessao, v_user_id, p_tema, 1, p_pontuacao)
    on conflict (session_id) do nothing;
  else
    update public.quiz_game_sessions
    set respostas = p_respostas,
        pontuacao = p_pontuacao
    where session_id = p_sessao
      and user_id = v_user_id
      and tema = p_tema
      and respostas = p_respostas - 1
      and pontuacao <= p_pontuacao;
  end if;

  get diagnostics v_linhas_inseridas = row_count;
  if v_linhas_inseridas = 0 then
    return;
  end if;

  insert into public.quiz_user_progress as progresso
    (user_id, display_name, total_respostas, nivel)
  values (
    v_user_id,
    v_display_name,
    1,
    0
  )
  on conflict (user_id) do update
  set display_name = excluded.display_name,
  total_respostas = progresso.total_respostas + 1,
  nivel = least(1000, (progresso.total_respostas + 1) / 10),
  updated_at = now();

  insert into public.quiz_scores as pontuacao_atual
    (user_id, tema, best_score, display_name)
  values (v_user_id, p_tema, p_pontuacao, v_display_name)
  on conflict (user_id, tema) do update
  set best_score = greatest(pontuacao_atual.best_score, excluded.best_score),
      display_name = excluded.display_name,
      updated_at = now();
end
$$;

revoke all on function public.registrar_pontuacao_quiz(text, integer, integer, uuid) from public;
grant execute on function public.registrar_pontuacao_quiz(text, integer, integer, uuid) to authenticated;

notify pgrst, 'reload schema';
