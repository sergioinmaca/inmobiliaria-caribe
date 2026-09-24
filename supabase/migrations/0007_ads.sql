-- Migración 0007: publicidad (banner carrusel de la landing).
-- Ejecutar en: Supabase → SQL Editor → New query → Run.
--
-- Contenido:
--   1) Tabla `public.ads` (metadatos administrables; las imágenes viven en public/ads/).
--   2) Trigger `updated_at` (reusa public.set_updated_at de 0004).
--   3) Índice (is_active, sort_order).
--   4) RLS: select público solo activos y en vigencia; escritura master/gerente.
--   5) Seed de 1 anuncio de ejemplo.
--
-- Idempotente (if not exists / on conflict / drop ... if exists).

-- ---------------------------------------------------------------------------
-- 1) TABLA `ads`
-- ---------------------------------------------------------------------------
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  image_url_mobile text,
  link_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2) TRIGGER updated_at
-- ---------------------------------------------------------------------------
drop trigger if exists ads_set_updated_at on public.ads;
create trigger ads_set_updated_at
  before update on public.ads
  for each row
  execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) ÍNDICE
-- ---------------------------------------------------------------------------
create index if not exists ads_active_sort_idx
  on public.ads (is_active, sort_order);

-- ---------------------------------------------------------------------------
-- 4) RLS
-- ---------------------------------------------------------------------------
alter table public.ads enable row level security;

-- Público: solo anuncios activos y dentro de su vigencia.
drop policy if exists "ads_select_public" on public.ads;
create policy "ads_select_public" on public.ads
  for select using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

-- Interno: cualquier rol autenticado ve todo.
drop policy if exists "ads_select_admin" on public.ads;
create policy "ads_select_admin" on public.ads
  for select using (get_user_role() in ('master','gerente','supervisor','invitado'));

-- Escritura: master/gerente.
drop policy if exists "ads_insert_admin" on public.ads;
create policy "ads_insert_admin" on public.ads
  for insert with check (get_user_role() in ('master','gerente'));

drop policy if exists "ads_update_admin" on public.ads;
create policy "ads_update_admin" on public.ads
  for update using (get_user_role() in ('master','gerente'))
  with check (get_user_role() in ('master','gerente'));

drop policy if exists "ads_delete_admin" on public.ads;
create policy "ads_delete_admin" on public.ads
  for delete using (get_user_role() in ('master','gerente'));

-- ---------------------------------------------------------------------------
-- 5) SEED
-- ---------------------------------------------------------------------------
insert into public.ads (title, image_url, sort_order)
select 'Promoción', '/ads/promo-01-desktop.webp', 1
where not exists (
  select 1 from public.ads where image_url = '/ads/promo-01-desktop.webp'
);
