-- Roles enum + table
create type public.app_role as enum ('admin', 'medical_reviewer', 'reviewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  organization text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Security definer role check
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Cases (admin-managed; demo cases stay static in code)
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  case_ref text not null unique,
  patient jsonb not null default '{}'::jsonb,
  suspect_drug jsonb not null default '{}'::jsonb,
  events jsonb not null default '[]'::jsonb,
  narrative jsonb not null default '[]'::jsonb,
  ai_prediction jsonb not null default '{}'::jsonb,
  seriousness text[] not null default '{}',
  status text not null default 'New',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cases enable row level security;

-- Notes (apply to either DB case or static case_ref)
create table public.case_notes (
  id uuid primary key default gen_random_uuid(),
  case_ref text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.case_notes enable row level security;

-- Causality decisions
create type public.causality_decision as enum ('confirmed', 'rejected', 'forwarded');

create table public.case_decisions (
  id uuid primary key default gen_random_uuid(),
  case_ref text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  decision causality_decision not null,
  rationale text,
  created_at timestamptz not null default now()
);
alter table public.case_decisions enable row level security;

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger cases_set_updated_at before update on public.cases
  for each row execute function public.set_updated_at();

-- Auto-create profile + default reviewer role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role) values (new.id, 'reviewer');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== RLS Policies =====
-- profiles: everyone authenticated reads; user updates own
create policy "profiles_select_auth" on public.profiles for select to authenticated using (true);
create policy "profiles_update_own"  on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles_insert_own"  on public.profiles for insert to authenticated with check (auth.uid() = id);

-- user_roles: everyone authenticated reads; only admins write
create policy "roles_select_auth" on public.user_roles for select to authenticated using (true);
create policy "roles_admin_insert" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "roles_admin_delete" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "roles_admin_update" on public.user_roles for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- cases: authenticated read; admin write
create policy "cases_select_auth" on public.cases for select to authenticated using (true);
create policy "cases_admin_insert" on public.cases for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "cases_admin_update" on public.cases for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "cases_admin_delete" on public.cases for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- case_notes: authenticated read; reviewer/medical_reviewer/admin insert; own update/delete
create policy "notes_select_auth" on public.case_notes for select to authenticated using (true);
create policy "notes_insert_reviewers" on public.case_notes for insert to authenticated
  with check (
    auth.uid() = user_id and (
      public.has_role(auth.uid(),'reviewer') or
      public.has_role(auth.uid(),'medical_reviewer') or
      public.has_role(auth.uid(),'admin')
    )
  );
create policy "notes_update_own" on public.case_notes for update to authenticated using (auth.uid() = user_id);
create policy "notes_delete_own" on public.case_notes for delete to authenticated using (auth.uid() = user_id);

-- case_decisions: same pattern
create policy "decisions_select_auth" on public.case_decisions for select to authenticated using (true);
create policy "decisions_insert_reviewers" on public.case_decisions for insert to authenticated
  with check (
    auth.uid() = user_id and (
      public.has_role(auth.uid(),'reviewer') or
      public.has_role(auth.uid(),'medical_reviewer') or
      public.has_role(auth.uid(),'admin')
    )
  );
create policy "decisions_update_own" on public.case_decisions for update to authenticated using (auth.uid() = user_id);
create policy "decisions_delete_own" on public.case_decisions for delete to authenticated using (auth.uid() = user_id);
