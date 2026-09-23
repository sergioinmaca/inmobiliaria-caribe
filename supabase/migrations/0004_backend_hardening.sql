-- Migración 0004: endurecimiento del backend.
-- Ejecutar en: Supabase → SQL Editor → New query → Run.
-- Decisiones (Fase 1): mínimo 1 imagen para activar; la tasa la edita solo master.
--
-- Es idempotente en lo posible (if not exists / drop trigger if exists) para poder
-- reejecutarse sin daño si una parte falla.

-- ---------------------------------------------------------------------------
-- 0) Comprobación previa: inmuebles activos que no cumplirían el CHECK.
--    Si devuelve filas, desactívalas antes de aplicar el CHECK (sección 3).
-- ---------------------------------------------------------------------------
do $$
declare
  bad_count integer;
begin
  select count(*) into bad_count
  from public.propiedades
  where is_active = true
    and (
      jsonb_array_length(images) < 1
      or btrim(titulo) = ''
      or btrim(parroquia) = ''
    );

  if bad_count > 0 then
    raise exception
      'Hay % inmueble(s) activo(s) que no cumplen la regla de activación. Desactívalos antes de continuar.',
      bad_count;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1) Índices para el catálogo (filtros y orden)
-- ---------------------------------------------------------------------------
create index if not exists propiedades_active_created_idx
  on public.propiedades (is_active, created_at desc);

create index if not exists propiedades_tipo_idx
  on public.propiedades (tipo)
  where is_active = true;

create index if not exists propiedades_parroquia_idx
  on public.propiedades (parroquia)
  where is_active = true;

create index if not exists propiedades_price_usd_idx
  on public.propiedades (price_usd)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- 2) CHECK de precios no negativos
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'propiedades_price_usd_nonneg') then
    alter table public.propiedades
      add constraint propiedades_price_usd_nonneg
      check (price_usd is null or price_usd >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'propiedades_price_original_nonneg') then
    alter table public.propiedades
      add constraint propiedades_price_original_nonneg
      check (price_original is null or price_original >= 0);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) CHECK de activación: un inmueble activo debe tener >= 1 imagen y campos.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'propiedades_active_requires_data') then
    alter table public.propiedades
      add constraint propiedades_active_requires_data
      check (
        is_active = false
        or (
          jsonb_array_length(images) >= 1
          and btrim(titulo) <> ''
          and btrim(parroquia) <> ''
        )
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Trigger: actualizar `updated_at` en cada UPDATE
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists propiedades_set_updated_at on public.propiedades;
create trigger propiedades_set_updated_at
  before update on public.propiedades
  for each row
  execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5) Nota de permisos
--    La política `settings_update_master` ya restringe la edición de la tasa a
--    `master`, en línea con la decisión de Fase 1. No requiere cambios.
--    La política `properties_update_admin` permite a `supervisor` actualizar la
--    fila completa (incluida `images`); el control de imágenes por rol se aplica
--    en la Edge Function `propiedades`. Acotarlo por columna requeriría un
--    trigger adicional (pendiente, ver 05-deuda-tecnica-y-riesgos.md).
-- ---------------------------------------------------------------------------
