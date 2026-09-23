-- =============================================================================
-- Script de introspección del esquema (Supabase / PostgreSQL)
-- Uso: Supabase Dashboard -> SQL Editor -> New query -> pegar -> Run.
-- Copiar el resultado como JSON.
--
-- Reejecutar cada vez que cambie el esquema para actualizar
-- documentacion/01-estado-actual.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Inventario completo del esquema "public" (una sola fila JSON)
-- -----------------------------------------------------------------------------
select jsonb_pretty(jsonb_build_object(
  'generated_at', now(),
  'pg_version', version(),
  'columns', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', c.table_name, 'ordinal', c.ordinal_position, 'column', c.column_name,
      'data_type', c.data_type, 'udt', c.udt_name,
      'nullable', c.is_nullable, 'default', c.column_default,
      'numeric_precision', c.numeric_precision, 'numeric_scale', c.numeric_scale
    ) order by c.table_name, c.ordinal_position), '[]'::jsonb)
    from information_schema.columns c where c.table_schema = 'public'
  ),
  'enums', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'type', t.typname, 'value', e.enumlabel, 'sort', e.enumsortorder
    ) order by t.typname, e.enumsortorder), '[]'::jsonb)
    from pg_type t join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public'
  ),
  'constraints', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', rel.relname, 'name', con.conname, 'type', con.contype,
      'definition', pg_get_constraintdef(con.oid)
    ) order by rel.relname, con.conname), '[]'::jsonb)
    from pg_constraint con join pg_class rel on rel.oid = con.conrelid
    join pg_namespace n on n.oid = rel.relnamespace where n.nspname = 'public'
  ),
  'indexes', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', tablename, 'name', indexname, 'definition', indexdef
    ) order by tablename, indexname), '[]'::jsonb)
    from pg_indexes where schemaname = 'public'
  ),
  'policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', tablename, 'name', policyname, 'cmd', cmd,
      'roles', roles, 'using', qual, 'with_check', with_check
    ) order by tablename, policyname), '[]'::jsonb)
    from pg_policies where schemaname = 'public'
  ),
  'triggers', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'table', rel.relname,
      'name', tg.tgname, 'definition', pg_get_triggerdef(tg.oid)
    ) order by n.nspname, rel.relname, tg.tgname), '[]'::jsonb)
    from pg_trigger tg
    join pg_class rel on rel.oid = tg.tgrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname in ('public', 'auth') and not tg.tgisinternal
  ),
  'functions', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', p.proname, 'args', pg_get_function_identity_arguments(p.oid),
      'returns', pg_get_function_result(p.oid), 'security_definer', p.prosecdef
    ) order by p.proname), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  ),
  'extensions', (
    select coalesce(jsonb_agg(jsonb_build_object('name', extname, 'version', extversion)
      order by extname), '[]'::jsonb) from pg_extension
  ),
  'row_estimates', (
    select coalesce(jsonb_agg(jsonb_build_object('table', relname, 'live_rows', n_live_tup)
      order by relname), '[]'::jsonb)
    from pg_stat_user_tables where schemaname = 'public'
  ),
  'settings_rows', (
    select coalesce(jsonb_agg(jsonb_build_object('key', key, 'value', value)), '[]'::jsonb)
    from public.settings
  )
));

-- -----------------------------------------------------------------------------
-- 2) Conteos rápidos
-- -----------------------------------------------------------------------------
select
  (select count(*) from auth.users)          as auth_users,
  (select count(*) from public.profiles)     as profiles,
  (select count(*) from public.propiedades)  as propiedades;

-- -----------------------------------------------------------------------------
-- 3) Comprobación previa/verificación del CHECK de activación.
--    Lista inmuebles activos que NO cumplen la regla: mínimo 1 imagen y campos.
--    (Decisión de negocio Fase 1: MIN_IMAGES_TO_ACTIVATE = 1.)
-- -----------------------------------------------------------------------------
select id, titulo, jsonb_array_length(images) as num_images
from public.propiedades
where is_active = true
  and (jsonb_array_length(images) < 1 or btrim(titulo) = '' or btrim(parroquia) = '');
