-- =====================================================================
--  Correctif : le garde-fou "au moins un proprietaire" bloquait la
--  suppression d'une organisation entiere (cascade sur ses membres).
--  Il ne s'applique plus quand l'organisation elle-meme disparait.
-- =====================================================================

create or replace function public.organization_members_keep_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  remaining integer;
begin
  -- Suppression en cascade : l'organisation n'existe deja plus, rien a proteger.
  if not exists (select 1 from public.organizations o where o.id = old.organization_id) then
    return coalesce(new, old);
  end if;
  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    select count(*) into remaining
    from public.organization_members
    where organization_id = old.organization_id and role = 'owner' and user_id <> old.user_id;
    if remaining = 0 then
      raise exception 'Une organisation doit conserver au moins un proprietaire' using errcode = 'check_violation';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
