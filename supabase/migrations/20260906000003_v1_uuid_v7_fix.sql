-- =====================================================================
--  Correctif : uuid_generate_v7 posait les bits de version/variante par
--  set_bit sans effacer les bits aleatoires voisins ; le nibble de version
--  n'etait pas toujours 7 et les identifiants echouaient la validation UUID
--  stricte (RFC 9562). Implementation par octets, conforme.
-- =====================================================================

create or replace function public.uuid_generate_v7()
returns uuid
language sql
volatile
set search_path = ''
as $$
  with b as (
    select overlay(
      extensions.gen_random_bytes(16)
      placing substring(int8send((extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
      from 1 for 6
    ) as v
  )
  select encode(
    set_byte(
      set_byte(v, 6, (get_byte(v, 6) & 15) | 112),   -- version 7
      8, (get_byte(v, 8) & 63) | 128                 -- variante RFC 4122
    ),
    'hex')::uuid
  from b;
$$;
revoke execute on function public.uuid_generate_v7() from public, anon, authenticated;
