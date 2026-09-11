-- Migración inicial de Supabase: esquema + RLS (versión corregida, sin recursión).
-- Ejecutar en: Supabase → SQL Editor → New query → Run.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('master', 'gerente', 'supervisor', 'invitado');
create type public.property_type as enum ('apartamento', 'casa', 'local');
create type public.price_currency as enum ('usd', 'bs');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'invitado',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type public.property_type not null,
  zone text not null,
  price_usd numeric(12,2),
  price_original numeric(12,2),
  price_currency public.price_currency,
  price_is_ref boolean not null default true,
  description text not null default '',
  is_active boolean not null default false,
  drive_folder_id text,
  images jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.settings (
  key text primary key,
  value text not null
);

insert into public.settings (key, value) values ('usd_to_bs_rate', '0');

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'invitado')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.settings enable row level security;

-- Helper de rol (security definer: evita recursión al leer profiles dentro de RLS).
create or replace function public.get_user_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- profiles: cada usuario ve su perfil; solo master gestiona los demás.
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_select_master" on public.profiles for select using (get_user_role() = 'master');
create policy "profiles_insert_master" on public.profiles for insert with check (get_user_role() = 'master');
create policy "profiles_update_master" on public.profiles for update using (get_user_role() = 'master');

-- properties: público ve solo activos; el resto por rol.
create policy "properties_select_public" on public.properties for select using (is_active = true);
create policy "properties_select_admin" on public.properties for select using (get_user_role() in ('master','gerente','supervisor','invitado'));
create policy "properties_insert_admin" on public.properties for insert with check (get_user_role() in ('master','gerente'));
create policy "properties_update_admin" on public.properties for update using (get_user_role() in ('master','gerente','supervisor')) with check (get_user_role() in ('master','gerente','supervisor'));
create policy "properties_delete_admin" on public.properties for delete using (get_user_role() in ('master','gerente'));

-- settings: lectura para autenticados, escritura solo master.
create policy "settings_select" on public.settings for select using (auth.role() = 'authenticated');
create policy "settings_update_master" on public.settings for update using (get_user_role() = 'master');
