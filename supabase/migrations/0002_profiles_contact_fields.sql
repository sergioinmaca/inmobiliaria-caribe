-- Migración: campos de contacto en profiles (nombre, apellido, teléfono, email).
-- Ejecutar en: Supabase → SQL Editor → New query → Run.

alter table public.profiles
  add column first_name text not null default '',
  add column last_name text not null default '',
  add column phone text,
  add column email text not null default '';

-- Backfill: email desde auth.users.
update public.profiles p
set email = coalesce((select u.email from auth.users u where u.id = p.id), '');

-- Backfill: dividir full_name en nombre y apellido.
update public.profiles
set
  first_name = case
    when position(' ' in full_name) > 0 then split_part(full_name, ' ', 1)
    else full_name
  end,
  last_name = case
    when position(' ' in full_name) > 0 then substr(full_name, position(' ' in full_name) + 1)
    else ''
  end;

-- Trigger actualizado: poblar email y nombre/apellido en usuarios nuevos.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, first_name, last_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    'invitado'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
