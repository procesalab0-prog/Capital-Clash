-- ============================================================
-- Capital Clash — Esquema de base de datos para Supabase
-- Pegar completo en: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ---------- Tablas ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Jugador',
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  mode text not null default 'simulado' check (mode in ('real', 'simulado')),
  invite_code text not null unique,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.seasons (
  id uuid primary key default gen_random_uuid (),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  contribution_amount numeric(14, 2) not null check (contribution_amount > 0),
  status text not null default 'active' check (status in ('draft', 'active', 'closed')),
  final_value numeric(14, 2),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.season_participants (
  season_id uuid not null references public.seasons (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  contribution numeric(14, 2) not null check (contribution > 0),
  primary key (season_id, user_id)
);

create table public.proposals (
  id uuid primary key default gen_random_uuid (),
  season_id uuid not null references public.seasons (id) on delete cascade,
  proposed_by uuid not null references public.profiles (id),
  type text not null check (type in ('buy', 'sell')),
  ticker text not null,
  company_name text not null default '',
  amount_usd numeric(14, 2),
  shares numeric(18, 4),
  thesis text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'executed', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours')
);

create table public.votes (
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  value text not null check (value in ('yes', 'no')),
  created_at timestamptz not null default now(),
  primary key (proposal_id, user_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid (),
  season_id uuid not null references public.seasons (id) on delete cascade,
  proposal_id uuid references public.proposals (id),
  proposed_by uuid references public.profiles (id),
  type text not null check (type in ('buy', 'sell')),
  ticker text not null,
  company_name text not null default '',
  shares numeric(18, 4) not null check (shares > 0),
  price numeric(14, 4) not null check (price > 0),
  total numeric(14, 2) not null check (total >= 0),
  executed_at timestamptz not null default now()
);

create table public.fund_snapshots (
  season_id uuid not null references public.seasons (id) on delete cascade,
  date date not null,
  fund_value numeric(14, 2) not null,
  benchmark_value numeric(14, 2),
  primary key (season_id, date)
);

create index on public.group_members (user_id);
create index on public.seasons (group_id);
create index on public.proposals (season_id);
create index on public.transactions (season_id);

-- ---------- Perfil automático al registrarse ----------

create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user ();

-- ---------- Funciones auxiliares para RLS ----------
-- SECURITY DEFINER para evitar recursión de políticas sobre group_members.

create or replace function public.is_group_member (gid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin (gid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.season_group (sid uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select group_id from seasons where id = sid;
$$;

-- ---------- RPCs (crear grupo / unirse con código) ----------

create or replace function public.create_group (p_name text, p_mode text)
returns public.groups
language plpgsql security definer set search_path = public
as $$
declare
  v_group public.groups;
  v_code text;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_mode not in ('real', 'simulado') then
    raise exception 'Modo inválido';
  end if;
  -- Código de invitación único de 6 caracteres (sin 0/O/1/I).
  -- Solo funciones del core de Postgres: gen_random_bytes (pgcrypto) vive en
  -- el esquema "extensions" en Supabase y no está en el search_path.
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from groups where invite_code = v_code);
  end loop;

  insert into groups (name, mode, invite_code, created_by)
  values (p_name, p_mode, v_code, auth.uid())
  returning * into v_group;

  insert into group_members (group_id, user_id, role)
  values (v_group.id, auth.uid(), 'admin');

  return v_group;
end;
$$;

create or replace function public.join_group_with_code (p_code text)
returns public.groups
language plpgsql security definer set search_path = public
as $$
declare
  v_group public.groups;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  select * into v_group from groups where invite_code = upper(trim(p_code));
  if not found then
    return null;
  end if;
  insert into group_members (group_id, user_id, role)
  values (v_group.id, auth.uid(), 'member')
  on conflict do nothing;
  return v_group;
end;
$$;

-- ---------- Row Level Security ----------

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.seasons enable row level security;
alter table public.season_participants enable row level security;
alter table public.proposals enable row level security;
alter table public.votes enable row level security;
alter table public.transactions enable row level security;
alter table public.fund_snapshots enable row level security;

-- Perfiles: visibles para usuarios autenticados (nombres en rankings),
-- editables solo por su dueño.
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- Grupos: solo los ve quien es miembro. Altas vía RPC create_group.
create policy "groups_select_member" on public.groups
  for select to authenticated using (public.is_group_member (id));

-- Miembros: visibles dentro del grupo. Altas vía RPCs.
create policy "members_select" on public.group_members
  for select to authenticated using (public.is_group_member (group_id));

-- Temporadas: miembros leen; solo admin crea/edita.
create policy "seasons_select" on public.seasons
  for select to authenticated using (public.is_group_member (group_id));
create policy "seasons_insert_admin" on public.seasons
  for insert to authenticated with check (public.is_group_admin (group_id));
create policy "seasons_update_admin" on public.seasons
  for update to authenticated using (public.is_group_admin (group_id));

-- Participantes: miembros leen; admin inscribe.
create policy "participants_select" on public.season_participants
  for select to authenticated
  using (public.is_group_member (public.season_group (season_id)));
create policy "participants_insert_admin" on public.season_participants
  for insert to authenticated
  with check (public.is_group_admin (public.season_group (season_id)));

-- Propuestas: miembros leen y crean (a su nombre); miembros actualizan el
-- estado (aprobación/ejecución la dispara cualquier voto decisivo).
create policy "proposals_select" on public.proposals
  for select to authenticated
  using (public.is_group_member (public.season_group (season_id)));
create policy "proposals_insert_member" on public.proposals
  for insert to authenticated
  with check (
    proposed_by = auth.uid()
    and public.is_group_member (public.season_group (season_id))
  );
create policy "proposals_update_member" on public.proposals
  for update to authenticated
  using (public.is_group_member (public.season_group (season_id)));

-- Votos: cada quien el suyo, dentro de su grupo.
create policy "votes_select" on public.votes
  for select to authenticated
  using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_id
        and public.is_group_member (public.season_group (p.season_id))
    )
  );
create policy "votes_upsert_own" on public.votes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.proposals p
      where p.id = proposal_id
        and public.is_group_member (public.season_group (p.season_id))
    )
  );
create policy "votes_update_own" on public.votes
  for update to authenticated using (user_id = auth.uid());

-- Transacciones: miembros leen y registran (la app valida la lógica).
create policy "transactions_select" on public.transactions
  for select to authenticated
  using (public.is_group_member (public.season_group (season_id)));
create policy "transactions_insert_member" on public.transactions
  for insert to authenticated
  with check (public.is_group_member (public.season_group (season_id)));

-- Snapshots del fondo: miembros leen y escriben (upsert diario).
create policy "snapshots_select" on public.fund_snapshots
  for select to authenticated
  using (public.is_group_member (public.season_group (season_id)));
create policy "snapshots_insert" on public.fund_snapshots
  for insert to authenticated
  with check (public.is_group_member (public.season_group (season_id)));
create policy "snapshots_update" on public.fund_snapshots
  for update to authenticated
  using (public.is_group_member (public.season_group (season_id)));
