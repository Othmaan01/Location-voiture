-- =====================================================================
--  Correctif : les tables en ajout seul (audit, journal d'acces aux
--  documents, evenements de reservation) bloquaient les suppressions en
--  cascade de leur parent. Une suppression declenchee par une cle
--  etrangere (profondeur de trigger > 1) est autorisee ; toute
--  modification ou suppression directe reste interdite.
-- =====================================================================

create or replace function public.forbid_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'Table % en ajout seul', tg_table_name using errcode = 'insufficient_privilege';
end;
$$;
