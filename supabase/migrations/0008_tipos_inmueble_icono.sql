-- Migración 0008: icono por tipo de inmueble (aditiva).
-- Ejecutar en: Supabase → SQL Editor → New query → Run.
--
-- Agrega la columna `icono` a `tipos_inmueble` (clase de Remix Icon) y la
-- siembra para los tipos base. Es idempotente: si la columna ya existe o el
-- icono ya está definido, no lo sobreescribe.

alter table public.tipos_inmueble
  add column if not exists icono text;

update public.tipos_inmueble
set icono = case nombre
  when 'Apartamento' then 'ri-building-4-fill'
  when 'Casa' then 'ri-home-9-fill'
  when 'Local Comercial' then 'ri-store-3-fill'
  when 'Galpón' then 'ri-building-3-fill'
  when 'Terreno' then 'ri-plant-fill'
  when 'Oficina' then 'ri-computer-fill'
  else icono
end
where icono is null;
