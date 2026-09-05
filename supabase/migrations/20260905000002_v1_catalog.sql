-- =====================================================================
--  Schema v1 — catalogue : vehicules, photos, grilles tarifaires,
--  indisponibilites. Montants en centimes (ADR-0004).
-- =====================================================================

create table public.vehicles (
  id                 uuid primary key default public.uuid_generate_v7(),
  organization_id    uuid not null references public.organizations (id) on delete cascade,
  agency_id          uuid not null references public.agencies (id) on delete restrict,
  brand              text not null,
  model              text not null,
  version            text,
  year               integer,
  category           public.vehicle_category not null,
  transmission       public.transmission_type not null,
  fuel               public.fuel_type not null,
  seats              smallint not null default 5,
  doors              smallint not null default 5,
  luggage            smallint not null default 2,
  color              text,
  license_plate      text,                       -- visible du pro uniquement (RLS + API)
  options            text[] not null default '{}',
  description        text,
  min_driver_age     smallint not null default 21,
  min_license_years  smallint not null default 2,
  status             public.vehicle_status not null default 'draft',
  suspended_at       timestamptz,
  suspended_reason   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint vehicles_year check (year is null or year between 1950 and 2100),
  constraint vehicles_seats check (seats between 1 and 60),
  constraint vehicles_doors check (doors between 2 and 6),
  constraint vehicles_min_age check (min_driver_age between 16 and 99),
  constraint vehicles_desc_len check (description is null or char_length(description) <= 4000)
);
create index vehicles_org_status_idx on public.vehicles (organization_id, status);
create index vehicles_agency_idx     on public.vehicles (agency_id);
create index vehicles_category_idx   on public.vehicles (category) where status = 'published';
create trigger vehicles_set_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();

-- L'agence d'un vehicule appartient a la meme organisation.
create or replace function public.vehicles_check_agency_org()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.agencies a where a.id = new.agency_id and a.organization_id = new.organization_id) then
    raise exception 'L agence n appartient pas a cette organisation' using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;
create trigger vehicles_check_agency_org before insert or update of agency_id, organization_id on public.vehicles
  for each row execute function public.vehicles_check_agency_org();

-- Quota de publication selon le plan (ADR-0008). Source de verite : table plans.
create or replace function public.vehicles_enforce_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_allowed integer;
  published_count integer;
begin
  if new.status <> 'published' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'published' then
    return new;
  end if;
  select p.max_published_vehicles into max_allowed
  from public.organizations o join public.plans p on p.code = o.plan_code
  where o.id = new.organization_id;
  if max_allowed is null then
    return new;
  end if;
  select count(*) into published_count
  from public.vehicles where organization_id = new.organization_id and status = 'published' and id <> new.id;
  if published_count >= max_allowed then
    raise exception 'Quota de publication atteint (% vehicule(s))', max_allowed using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger vehicles_enforce_quota before insert or update on public.vehicles
  for each row execute function public.vehicles_enforce_quota();

-- Retrogradation de plan : depublication non destructive de l'excedent.
create or replace function public.organizations_demote_over_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_allowed integer;
begin
  if new.plan_code = old.plan_code then
    return new;
  end if;
  select max_published_vehicles into max_allowed from public.plans where code = new.plan_code;
  if max_allowed is null then
    return new;
  end if;
  update public.vehicles v
  set status = 'draft'
  where v.organization_id = new.id and v.status = 'published'
    and v.id not in (
      select id from public.vehicles where organization_id = new.id and status = 'published'
      order by updated_at desc limit max_allowed
    );
  return new;
end;
$$;
create trigger organizations_demote_over_quota after update of plan_code on public.organizations
  for each row execute function public.organizations_demote_over_quota();

-- ---------------------------------------------------------------------
create table public.vehicle_photos (
  id               uuid primary key default public.uuid_generate_v7(),
  vehicle_id       uuid not null references public.vehicles (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  storage_path     text not null unique,
  position         smallint not null,
  width            integer,
  height           integer,
  blurhash         text,
  created_at       timestamptz not null default now(),
  unique (vehicle_id, position),
  constraint vehicle_photos_position check (position between 0 and 29)
);
create index vehicle_photos_vehicle_idx on public.vehicle_photos (vehicle_id, position);

-- ---------------------------------------------------------------------
create table public.rate_plans (
  id                   uuid primary key default public.uuid_generate_v7(),
  vehicle_id           uuid not null references public.vehicles (id) on delete cascade,
  organization_id      uuid not null references public.organizations (id) on delete cascade,
  currency             char(3) not null default 'EUR',
  daily_cents          integer not null,
  weekend_daily_cents  integer,
  weekly_cents         integer,
  monthly_cents        integer,
  deposit_cents        integer not null default 0,
  km_included_per_day  integer,
  extra_km_cents       integer,
  min_days             smallint not null default 1,
  max_days             smallint,
  valid_from           date,
  valid_to             date,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint rate_plans_daily_pos    check (daily_cents > 0),
  constraint rate_plans_nonneg       check (coalesce(weekend_daily_cents, 0) >= 0 and coalesce(weekly_cents, 0) >= 0 and coalesce(monthly_cents, 0) >= 0 and deposit_cents >= 0 and coalesce(extra_km_cents, 0) >= 0),
  constraint rate_plans_days         check (min_days >= 1 and (max_days is null or max_days >= min_days)),
  constraint rate_plans_validity     check (valid_from is null or valid_to is null or valid_to >= valid_from)
);
-- v1 : un seul plan actif par vehicule.
create unique index rate_plans_one_active_idx on public.rate_plans (vehicle_id) where is_active;
create trigger rate_plans_set_updated_at before update on public.rate_plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
create table public.availability_blocks (
  id               uuid primary key default public.uuid_generate_v7(),
  vehicle_id       uuid not null references public.vehicles (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  period           tstzrange not null,
  reason           public.block_reason not null default 'other',
  note             text,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint availability_blocks_period check (not isempty(period) and lower_inc(period) and not upper_inc(period))
);
create index availability_blocks_vehicle_period_idx on public.availability_blocks using gist (vehicle_id, period);
