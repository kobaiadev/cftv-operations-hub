create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('00', '01', '02', '03')),
  created_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.user_roles
  where user_id = (select auth.uid())
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

alter table public.user_roles enable row level security;
grant select on public.user_roles to authenticated;

create policy "Users can view their own role"
  on public.user_roles for select
  to authenticated
  using (user_id = (select auth.uid()) or public.current_user_role() = '00');

create table if not exists public.app_state (
  namespace text primary key check (namespace in ('os', 'cadastro', 'supervisoes')),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid not null default auth.uid() references auth.users (id)
);

alter table public.app_state enable row level security;
grant select, insert, update, delete on public.app_state to authenticated;

create policy "Authenticated users can view application data"
  on public.app_state for select
  to authenticated
  using (public.current_user_role() in ('00', '01', '02', '03'));

create policy "Editors can create application data"
  on public.app_state for insert
  to authenticated
  with check (public.current_user_role() in ('00', '01') and updated_by = (select auth.uid()));

create policy "Editors can update application data"
  on public.app_state for update
  to authenticated
  using (public.current_user_role() in ('00', '01'))
  with check (public.current_user_role() in ('00', '01') and updated_by = (select auth.uid()));

create policy "Editors can delete application data"
  on public.app_state for delete
  to authenticated
  using (public.current_user_role() in ('00', '01'));

create table if not exists public.app_attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('os', 'supervisao')),
  entity_id text not null,
  label text not null,
  file_name text not null,
  content_type text not null,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users (id)
);

create index if not exists app_attachments_entity_idx
  on public.app_attachments (entity_type, entity_id);

alter table public.app_attachments enable row level security;
grant select, insert, update, delete on public.app_attachments to authenticated;

create policy "Authenticated users can view attachment metadata"
  on public.app_attachments for select
  to authenticated
  using (public.current_user_role() in ('00', '01', '02', '03'));

create policy "Editors can add attachment metadata"
  on public.app_attachments for insert
  to authenticated
  with check (public.current_user_role() in ('00', '01') and created_by = (select auth.uid()));

create policy "Editors can update attachment metadata"
  on public.app_attachments for update
  to authenticated
  using (public.current_user_role() in ('00', '01'))
  with check (public.current_user_role() in ('00', '01') and created_by = (select auth.uid()));

create policy "Editors can delete attachment metadata"
  on public.app_attachments for delete
  to authenticated
  using (public.current_user_role() in ('00', '01'));

insert into storage.buckets (id, name, public, file_size_limit)
values ('private-attachments', 'private-attachments', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = 20971520;

drop policy if exists "Authenticated users can view attachments" on storage.objects;

create policy "Users with download permission can access stored attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'private-attachments'
    and public.current_user_role() in ('00', '01', '02')
  );

create policy "Editors can upload attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'private-attachments'
    and public.current_user_role() in ('00', '01')
  );

create policy "Editors can update attachments"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'private-attachments'
    and public.current_user_role() in ('00', '01')
  )
  with check (
    bucket_id = 'private-attachments'
    and public.current_user_role() in ('00', '01')
  );

create policy "Editors can delete attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'private-attachments'
    and public.current_user_role() in ('00', '01')
  );

do $$
begin
  if to_regclass('public.work_orders') is not null then
    execute 'alter table public.work_orders enable row level security';

    execute 'drop policy if exists "Authenticated users can view work orders" on public.work_orders';
    execute 'drop policy if exists "Editors can create work orders" on public.work_orders';
    execute 'drop policy if exists "Editors can update work orders" on public.work_orders';
    execute 'drop policy if exists "Editors can delete work orders" on public.work_orders';
    execute 'create policy "Authenticated users can view work orders"
      on public.work_orders for select to authenticated
      using (public.current_user_role() in (''00'', ''01'', ''02'', ''03''))';
    execute 'create policy "Editors can create work orders"
      on public.work_orders for insert to authenticated
      with check (public.current_user_role() in (''00'', ''01''))';
    execute 'create policy "Editors can update work orders"
      on public.work_orders for update to authenticated
      using (public.current_user_role() in (''00'', ''01''))
      with check (public.current_user_role() in (''00'', ''01''))';
    execute 'create policy "Editors can delete work orders"
      on public.work_orders for delete to authenticated
      using (public.current_user_role() in (''00'', ''01''))';
  end if;
end
$$;
