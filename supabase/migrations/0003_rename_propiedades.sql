-- Renombrado de la tabla properties -> propiedades y de sus columnas.
-- Nota: este cambio ya fue aplicado manualmente en la base de datos de producción
-- (Supabase → SQL Editor). Esta migración documenta el estado final para que
-- un despliegue desde cero quede igual.
-- Ejecutar SOLO en entornos donde la tabla aún se llame "properties".

alter table public.properties rename to propiedades;

alter table public.propiedades rename column title to titulo;
alter table public.propiedades rename column type to tipo;
alter table public.propiedades rename column zone to parroquia;
