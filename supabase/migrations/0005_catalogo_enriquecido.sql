-- Migración 0005: catálogo enriquecido (aditiva).
-- Ejecutar en: Supabase → SQL Editor → New query → Run.
--
-- Contenido:
--   1) Catálogo de tipos de inmueble (`tipos_inmueble`) + seed.
--   2) División territorial Estado → Municipio → Parroquia + seed
--      (3 estados, 23 municipios, 74 parroquias; fuente: siretravi/src/lib/geografia.ts).
--   3) Nuevas columnas en `propiedades`: FKs territoriales/tipo y métricas.
--   4) Backfill de `tipo_id` desde el enum `tipo` actual.
--   5) Índices parciales y RLS.
--
-- IMPORTANTE: esta migración NO elimina la columna `tipo` ni el enum `property_type`.
-- Eso lo hace `0006_drop_property_type_enum.sql` una vez desplegado y verificado el código nuevo.
--
-- Es idempotente en lo posible (if not exists / on conflict / drop ... if exists).

-- ---------------------------------------------------------------------------
-- 1) TIPOS DE INMUEBLE
-- ---------------------------------------------------------------------------
create table if not exists public.tipos_inmueble (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  orden integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.tipos_inmueble (nombre, orden) values
  ('Apartamento', 1),
  ('Casa', 2),
  ('Local Comercial', 3),
  ('Galpón', 4),
  ('Terreno', 5),
  ('Oficina', 6)
on conflict (nombre) do nothing;

drop trigger if exists tipos_inmueble_set_updated_at on public.tipos_inmueble;
create trigger tipos_inmueble_set_updated_at
  before update on public.tipos_inmueble
  for each row
  execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) DIVISIÓN TERRITORIAL
-- ---------------------------------------------------------------------------
create table if not exists public.estados (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.municipios (
  id uuid primary key default gen_random_uuid(),
  estado_id uuid not null references public.estados(id) on delete cascade,
  nombre text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (estado_id, nombre)
);

create table if not exists public.parroquias (
  id uuid primary key default gen_random_uuid(),
  municipio_id uuid not null references public.municipios(id) on delete cascade,
  nombre text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (municipio_id, nombre)
);

-- Seed: estados
insert into public.estados (nombre) values
  ('Distrito Capital'),
  ('La Guaira'),
  ('Miranda')
on conflict (nombre) do nothing;

-- Seed: municipios (estado, municipio)
insert into public.municipios (estado_id, nombre)
select e.id, m.nombre
from (values
  ('Distrito Capital', 'Libertador'),
  ('La Guaira', 'Vargas'),
  ('Miranda', 'Acevedo'),
  ('Miranda', 'Andrés Bello'),
  ('Miranda', 'Baruta'),
  ('Miranda', 'Brión'),
  ('Miranda', 'Buroz'),
  ('Miranda', 'Carrizal'),
  ('Miranda', 'Chacao'),
  ('Miranda', 'Cristóbal Rojas'),
  ('Miranda', 'El Hatillo'),
  ('Miranda', 'Guaicaipuro'),
  ('Miranda', 'Independencia'),
  ('Miranda', 'Los Salias'),
  ('Miranda', 'Páez'),
  ('Miranda', 'Paz Castillo'),
  ('Miranda', 'Pedro Gual'),
  ('Miranda', 'Plaza'),
  ('Miranda', 'Simón Bolívar'),
  ('Miranda', 'Sucre'),
  ('Miranda', 'Tomás Lander'),
  ('Miranda', 'Urdaneta'),
  ('Miranda', 'Zamora')
) as m(estado, nombre)
join public.estados e on e.nombre = m.estado
on conflict (estado_id, nombre) do nothing;

-- Seed: parroquias (estado, municipio, parroquia)
insert into public.parroquias (municipio_id, nombre)
select mu.id, p.nombre
from (values
  -- Distrito Capital / Libertador (22)
  ('Distrito Capital', 'Libertador', '23 de Enero'),
  ('Distrito Capital', 'Libertador', 'Altagracia'),
  ('Distrito Capital', 'Libertador', 'Antímano'),
  ('Distrito Capital', 'Libertador', 'Caricuao'),
  ('Distrito Capital', 'Libertador', 'Catedral'),
  ('Distrito Capital', 'Libertador', 'Coche'),
  ('Distrito Capital', 'Libertador', 'El Junquito'),
  ('Distrito Capital', 'Libertador', 'El Paraíso'),
  ('Distrito Capital', 'Libertador', 'El Recreo'),
  ('Distrito Capital', 'Libertador', 'El Valle'),
  ('Distrito Capital', 'Libertador', 'La Candelaria'),
  ('Distrito Capital', 'Libertador', 'La Pastora'),
  ('Distrito Capital', 'Libertador', 'La Vega'),
  ('Distrito Capital', 'Libertador', 'Macarao'),
  ('Distrito Capital', 'Libertador', 'San Agustín'),
  ('Distrito Capital', 'Libertador', 'San Bernardino'),
  ('Distrito Capital', 'Libertador', 'San José'),
  ('Distrito Capital', 'Libertador', 'San Juan'),
  ('Distrito Capital', 'Libertador', 'San Pedro'),
  ('Distrito Capital', 'Libertador', 'Santa Rosalía'),
  ('Distrito Capital', 'Libertador', 'Santa Teresa'),
  ('Distrito Capital', 'Libertador', 'Sucre'),
  -- La Guaira / Vargas (11)
  ('La Guaira', 'Vargas', 'Caraballeda'),
  ('La Guaira', 'Vargas', 'Carayaca'),
  ('La Guaira', 'Vargas', 'Carlos Soublette'),
  ('La Guaira', 'Vargas', 'Caruao'),
  ('La Guaira', 'Vargas', 'Catia La Mar'),
  ('La Guaira', 'Vargas', 'El Junko'),
  ('La Guaira', 'Vargas', 'La Guaira'),
  ('La Guaira', 'Vargas', 'Macuto'),
  ('La Guaira', 'Vargas', 'Maiquetía'),
  ('La Guaira', 'Vargas', 'Naiguatá'),
  ('La Guaira', 'Vargas', 'Urimare'),
  -- Miranda / Acevedo (8)
  ('Miranda', 'Acevedo', 'Aragüita'),
  ('Miranda', 'Acevedo', 'Arévalo González'),
  ('Miranda', 'Acevedo', 'Capaya'),
  ('Miranda', 'Acevedo', 'Caucagua'),
  ('Miranda', 'Acevedo', 'El Café'),
  ('Miranda', 'Acevedo', 'Marizapa'),
  ('Miranda', 'Acevedo', 'Panaquire'),
  ('Miranda', 'Acevedo', 'Ribas'),
  -- Miranda / Andrés Bello (2)
  ('Miranda', 'Andrés Bello', 'Cumbo'),
  ('Miranda', 'Andrés Bello', 'San José de Barlovento'),
  -- Miranda / Baruta (3)
  ('Miranda', 'Baruta', 'Baruta'),
  ('Miranda', 'Baruta', 'El Cafetal'),
  ('Miranda', 'Baruta', 'Las Minas'),
  -- Miranda / Brión (3)
  ('Miranda', 'Brión', 'Higuerote'),
  ('Miranda', 'Brión', 'Curiepe'),
  ('Miranda', 'Brión', 'Tacarigua'),
  -- Miranda / Buroz (1)
  ('Miranda', 'Buroz', 'Mamporal'),
  -- Miranda / Carrizal (1)
  ('Miranda', 'Carrizal', 'Carrizal'),
  -- Miranda / Chacao (1)
  ('Miranda', 'Chacao', 'Chacao'),
  -- Miranda / Cristóbal Rojas (2)
  ('Miranda', 'Cristóbal Rojas', 'Charallave'),
  ('Miranda', 'Cristóbal Rojas', 'Las Brisas'),
  -- Miranda / El Hatillo (1)
  ('Miranda', 'El Hatillo', 'El Hatillo'),
  -- Miranda / Guaicaipuro (7)
  ('Miranda', 'Guaicaipuro', 'Los Teques'),
  ('Miranda', 'Guaicaipuro', 'San Pedro de Los Altos'),
  ('Miranda', 'Guaicaipuro', 'Paracotos'),
  ('Miranda', 'Guaicaipuro', 'Tácata'),
  ('Miranda', 'Guaicaipuro', 'Altagracia de la Montaña'),
  ('Miranda', 'Guaicaipuro', 'Cecilio Acosta'),
  ('Miranda', 'Guaicaipuro', 'El Jarillo'),
  -- Miranda / Independencia (2)
  ('Miranda', 'Independencia', 'El Cartanal'),
  ('Miranda', 'Independencia', 'Santa Teresa del Tuy'),
  -- Miranda / Los Salias (1)
  ('Miranda', 'Los Salias', 'San Antonio de Los Altos'),
  -- Miranda / Páez (5)
  ('Miranda', 'Páez', 'Río Chico'),
  ('Miranda', 'Páez', 'Páparo'),
  ('Miranda', 'Páez', 'Tacarigua de La Laguna'),
  ('Miranda', 'Páez', 'El Guapo'),
  ('Miranda', 'Páez', 'San Fernando del Guapo'),
  -- Miranda / Paz Castillo (1)
  ('Miranda', 'Paz Castillo', 'Santa Lucía del Tuy'),
  -- Miranda / Pedro Gual (2)
  ('Miranda', 'Pedro Gual', 'Cupira'),
  ('Miranda', 'Pedro Gual', 'Machurucuto'),
  -- Miranda / Plaza (1)
  ('Miranda', 'Plaza', 'Guarenas'),
  -- Miranda / Simón Bolívar (2)
  ('Miranda', 'Simón Bolívar', 'San Francisco de Yare'),
  ('Miranda', 'Simón Bolívar', 'San Antonio de Yare'),
  -- Miranda / Sucre (5)
  ('Miranda', 'Sucre', 'Petare'),
  ('Miranda', 'Sucre', 'Leoncio Martínez'),
  ('Miranda', 'Sucre', 'Caucaguita'),
  ('Miranda', 'Sucre', 'Filas de Mariche'),
  ('Miranda', 'Sucre', 'La Dolorita'),
  -- Miranda / Tomás Lander (3)
  ('Miranda', 'Tomás Lander', 'Ocumare del Tuy'),
  ('Miranda', 'Tomás Lander', 'La Democracia'),
  ('Miranda', 'Tomás Lander', 'Santa Bárbara'),
  -- Miranda / Urdaneta (2)
  ('Miranda', 'Urdaneta', 'Cúa'),
  ('Miranda', 'Urdaneta', 'Nueva Cúa'),
  -- Miranda / Zamora (2)
  ('Miranda', 'Zamora', 'Guatire'),
  ('Miranda', 'Zamora', 'Bolívar')
) as p(estado, municipio, nombre)
join public.estados e on e.nombre = p.estado
join public.municipios mu on mu.estado_id = e.id and mu.nombre = p.municipio
on conflict (municipio_id, nombre) do nothing;

-- ---------------------------------------------------------------------------
-- 3) NUEVAS COLUMNAS EN `propiedades` (todas aditivas y nullables)
-- ---------------------------------------------------------------------------
alter table public.propiedades
  add column if not exists tipo_id uuid references public.tipos_inmueble(id),
  add column if not exists estado_id uuid references public.estados(id),
  add column if not exists municipio_id uuid references public.municipios(id),
  add column if not exists parroquia_id uuid references public.parroquias(id),
  add column if not exists habitaciones smallint,
  add column if not exists banos smallint,
  add column if not exists puestos_estacionamiento smallint,
  add column if not exists metros_construccion numeric(10,2),
  add column if not exists metros_terreno numeric(10,2);

-- ---------------------------------------------------------------------------
-- 4) Backfill de `tipo_id` desde el enum `tipo` (departamento/casa/local)
-- ---------------------------------------------------------------------------
update public.propiedades p
set tipo_id = t.id
from public.tipos_inmueble t
where p.tipo_id is null
  and t.nombre = case p.tipo
    when 'apartamento' then 'Apartamento'
    when 'casa' then 'Casa'
    when 'local' then 'Local Comercial'
    else null
  end;

-- Relajar `tipo` (no se borra en esta migración): permite que la Edge Function
-- nueva inserte escribiendo solo `tipo_id` durante la transición.
alter table public.propiedades alter column tipo drop not null;

-- ---------------------------------------------------------------------------
-- 5) CHECK de métricas no negativas
-- ---------------------------------------------------------------------------
do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('propiedades_habitaciones_nonneg', 'habitaciones'),
      ('propiedades_banos_nonneg', 'banos'),
      ('propiedades_puestos_estacionamiento_nonneg', 'puestos_estacionamiento'),
      ('propiedades_metros_construccion_nonneg', 'metros_construccion'),
      ('propiedades_metros_terreno_nonneg', 'metros_terreno')
    ) as t(conname, col)
  loop
    if not exists (select 1 from pg_constraint where conname = c.conname) then
      execute format(
        'alter table public.propiedades add constraint %I check (%I is null or %I >= 0)',
        c.conname, c.col, c.col
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6) Índices parciales del catálogo
-- ---------------------------------------------------------------------------
create index if not exists propiedades_tipo_id_idx
  on public.propiedades (tipo_id)
  where is_active = true;

create index if not exists propiedades_estado_id_idx
  on public.propiedades (estado_id)
  where is_active = true;

create index if not exists propiedades_municipio_id_idx
  on public.propiedades (municipio_id)
  where is_active = true;

create index if not exists propiedades_parroquia_id_idx
  on public.propiedades (parroquia_id)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- 7) RLS
-- ---------------------------------------------------------------------------
alter table public.tipos_inmueble enable row level security;
alter table public.estados enable row level security;
alter table public.municipios enable row level security;
alter table public.parroquias enable row level security;

-- tipos_inmueble: público ve activos; internos ven todo; escritura master/gerente.
drop policy if exists "tipos_select_public" on public.tipos_inmueble;
create policy "tipos_select_public" on public.tipos_inmueble
  for select using (is_active = true);

drop policy if exists "tipos_select_admin" on public.tipos_inmueble;
create policy "tipos_select_admin" on public.tipos_inmueble
  for select using (get_user_role() in ('master','gerente','supervisor','invitado'));

drop policy if exists "tipos_insert_admin" on public.tipos_inmueble;
create policy "tipos_insert_admin" on public.tipos_inmueble
  for insert with check (get_user_role() in ('master','gerente'));

drop policy if exists "tipos_update_admin" on public.tipos_inmueble;
create policy "tipos_update_admin" on public.tipos_inmueble
  for update using (get_user_role() in ('master','gerente'))
  with check (get_user_role() in ('master','gerente'));

drop policy if exists "tipos_delete_admin" on public.tipos_inmueble;
create policy "tipos_delete_admin" on public.tipos_inmueble
  for delete using (get_user_role() in ('master','gerente'));

-- Territorio: solo lectura para todos (seed). Sin políticas de escritura:
-- solo service_role (Edge Functions) puede modificarlo.
drop policy if exists "estados_select" on public.estados;
create policy "estados_select" on public.estados for select using (true);

drop policy if exists "municipios_select" on public.municipios;
create policy "municipios_select" on public.municipios for select using (true);

drop policy if exists "parroquias_select" on public.parroquias;
create policy "parroquias_select" on public.parroquias for select using (true);
