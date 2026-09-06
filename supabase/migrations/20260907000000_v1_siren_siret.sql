-- ADR-0010 : l'organisation porte le SIREN (entreprise, 9 chiffres) ; chaque agence porte
-- le SIRET de son etablissement (14 chiffres, commence par le SIREN). Migration des donnees
-- existantes : le SIREN est extrait de l'ancien SIRET, qui est reporte sur la premiere agence.

alter table public.organizations add column siren text;
update public.organizations set siren = left(siret, 9) where siret is not null;
alter table public.organizations
  add constraint organizations_siren_fmt check (siren is null or siren ~ '^[0-9]{9}$');
create unique index organizations_siren_idx on public.organizations (siren) where siren is not null;

alter table public.agencies add column siret text;
alter table public.agencies
  add constraint agencies_siret_fmt check (siret is null or siret ~ '^[0-9]{14}$');
create unique index agencies_siret_idx on public.agencies (siret) where siret is not null;

update public.agencies a
set siret = o.siret
from public.organizations o
where a.organization_id = o.id
  and o.siret is not null
  and a.id = (
    select id from public.agencies where organization_id = o.id order by created_at, id limit 1
  );

-- Le SIRET d'une agence doit appartenir a l'entreprise de l'organisation.
create or replace function public.agencies_check_siret_siren()
returns trigger language plpgsql as $$
declare v_siren text;
begin
  if new.siret is null then return new; end if;
  select siren into v_siren from public.organizations where id = new.organization_id;
  if v_siren is null then
    raise exception 'SIREN de l organisation requis avant le SIRET d une agence' using errcode = 'check_violation';
  end if;
  if left(new.siret, 9) <> v_siren then
    raise exception 'Le SIRET % ne correspond pas au SIREN %', new.siret, v_siren using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger agencies_check_siret_siren before insert or update of siret, organization_id on public.agencies
  for each row execute function public.agencies_check_siret_siren();

drop index if exists public.organizations_siret_idx;
alter table public.organizations drop constraint if exists organizations_siret_fmt;
alter table public.organizations drop column siret;
