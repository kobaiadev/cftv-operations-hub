alter table public.app_state
  add column if not exists version integer not null default 1
    check (version > 0);

notify pgrst, 'reload schema';
