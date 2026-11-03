create table if not exists public.quiz_scores (
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
  best_score integer not null check (best_score >= 0),
  display_name text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, tema)
);

alter table public.quiz_scores enable row level security;
grant select on public.quiz_scores to authenticated;

create policy "Authenticated users can view quiz rankings"
  on public.quiz_scores for select
  to authenticated
  using (public.current_user_role() in ('00', '01', '02', '03'));

create or replace function public.registrar_pontuacao_quiz(
  p_tema text,
  p_pontuacao integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_display_name text;
begin
  if v_user_id is null or public.current_user_role() not in ('00', '01', '02', '03') then
    raise exception 'Usuário não autorizado para registrar pontuação.';
  end if;

  if p_tema is null or p_tema not in (
    'fundamentos',
    'penal',
    'processual-penal',
    'lgpd',
    'constitucional',
    'seguranca-privada'
  ) or p_pontuacao is null or p_pontuacao < 0 then
    raise exception 'Tema ou pontuação inválidos.';
  end if;

  select display_name
  into v_display_name
  from public.user_roles
  where user_id = v_user_id;

  if v_display_name is null then
    raise exception 'Perfil do usuário não encontrado.';
  end if;

  insert into public.quiz_scores as pontuacao_atual (user_id, tema, best_score, display_name)
  values (v_user_id, p_tema, p_pontuacao, v_display_name)
  on conflict (user_id, tema) do update
  set best_score = greatest(pontuacao_atual.best_score, excluded.best_score),
      display_name = excluded.display_name,
      updated_at = now();
end
$$;

revoke all on function public.registrar_pontuacao_quiz(text, integer) from public;
grant execute on function public.registrar_pontuacao_quiz(text, integer) to authenticated;

create index if not exists quiz_scores_theme_rank_idx
  on public.quiz_scores (tema, best_score desc, updated_at asc);

notify pgrst, 'reload schema';
