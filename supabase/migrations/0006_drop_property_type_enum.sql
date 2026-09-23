-- Migración 0006: limpieza del enum de tipos (DESTRUCTIVA).
-- Ejecutar SOLO después de:
--   1) Aplicar `0005` y desplegar las Edge Functions + frontend nuevos.
--   2) Verificar en E2E que todo funciona.
--
-- Esta migración retira el esquema antiguo de tipos (`tipo` + enum `property_type`).
-- Una vez ejecutada, no hay rollback sin restaurar el esquema: el código nuevo ya no usa `tipo`.

-- Guarda previa: no continuar si algún inmueble quedó sin `tipo_id`.
do $$
declare
  bad_count integer;
begin
  select count(*) into bad_count
  from public.propiedades
  where tipo_id is null;

  if bad_count > 0 then
    raise exception
      'Hay % inmueble(s) sin tipo_id. Asígnales un tipo antes de ejecutar esta migración.',
      bad_count;
  end if;
end $$;

-- Índice que dependía de la columna `tipo`.
drop index if exists public.propiedades_tipo_idx;

-- Columna y enum antiguos.
alter table public.propiedades drop column if exists tipo;
drop type if exists public.property_type;
