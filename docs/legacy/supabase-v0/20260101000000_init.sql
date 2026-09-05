-- =====================================================================
--  RentMap - Schema initial
--  Plateforme de reference et de mise en avant des loueurs de voitures.
--
--  Deux roles metier :
--    - "pro"    : le loueur professionnel. Il paie un abonnement pour
--                 publier son agence et ses vehicules.
--    - "client" : le particulier qui cherche un vehicule et contacte le pro.
--
--  La plateforme ne prend PAS de commission sur les locations :
--  la monetisation passe uniquement par l'abonnement du pro.
-- =====================================================================

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "postgis" with schema extensions;
create extension if not exists "unaccent" with schema extensions;

-- ---------------------------------------------------------------------
-- Types enumeres
-- ---------------------------------------------------------------------

create type public.user_role as enum ('client', 'pro', 'admin');

create type public.plan_tier as enum ('free', 'starter', 'pro');

create type public.subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid'
);

create type public.agency_status as enum ('draft', 'pending', 'published', 'suspended');

create type public.vehicle_status as enum ('draft', 'published', 'archived');

create type public.vehicle_category as enum (
  'citadine', 'compacte', 'berline', 'suv', 'break', 'monospace',
  'cabriolet', 'coupe', 'utilitaire', 'minibus', 'prestige', 'sans_permis'
);

create type public.transmission_type as enum ('manuelle', 'automatique');

create type public.fuel_type as enum (
  'essence', 'diesel', 'hybride', 'hybride_rechargeable', 'electrique', 'gpl'
);

create type public.lead_status as enum ('nouveau', 'contacte', 'converti', 'perdu');

-- ---------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------

-- Genere un slug URL-safe a partir d'un texte libre ("Auto Prestige Lyon" -> "auto-prestige-lyon").
create or replace function public.slugify(value text)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select trim(
    both '-' from regexp_replace(
      lower(extensions.unaccent(coalesce(value, ''))),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles : miroir applicatif de auth.users
-- ---------------------------------------------------------------------

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          public.user_role not null default 'client',
  full_name     text,
  phone         text,
  avatar_url    text,
  city_id       uuid,
  marketing_opt_in boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Profil applicatif lie a un compte auth. Porte le role metier (client / pro / admin).';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- A la creation d'un compte, on cree le profil et on lit le role
-- transmis a l'inscription (options.data.role cote client Supabase).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
begin
  begin
    requested_role := coalesce(
      (new.raw_user_meta_data ->> 'role')::public.user_role,
      'client'
    );
  exception when others then
    requested_role := 'client';
  end;

  -- Le role "admin" ne peut jamais etre auto-attribue a l'inscription.
  if requested_role = 'admin' then
    requested_role := 'client';
  end if;

  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    requested_role,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- cities : referentiel geographique, socle des pages SEO locales
-- ---------------------------------------------------------------------

create table public.cities (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  postal_code     text,
  department_code text,
  department_name text,
  region_name     text,
  country_code    text not null default 'FR',
  latitude        double precision not null,
  longitude       double precision not null,
  population      integer,
  location        extensions.geography(Point, 4326)
                  generated always as (
                    extensions.st_setsrid(
                      extensions.st_makepoint(longitude, latitude), 4326
                    )::extensions.geography
                  ) stored,
  created_at      timestamptz not null default now()
);

comment on table public.cities is 'Villes couvertes par la plateforme. Chaque ville genere une page SEO /location-voiture/<slug>.';

create index cities_location_idx on public.cities using gist (location);
create index cities_name_idx on public.cities (lower(name));
create index cities_department_idx on public.cities (department_code);

alter table public.profiles
  add constraint profiles_city_id_fkey
  foreign key (city_id) references public.cities (id) on delete set null;

-- ---------------------------------------------------------------------
-- agencies : le loueur professionnel (l'entite qui paie)
-- ---------------------------------------------------------------------

create table public.agencies (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles (id) on delete cascade,
  name            text not null,
  slug            text not null unique,
  legal_name      text,
  siret           text,
  description     text,
  logo_url        text,
  cover_url       text,
  email           text,
  phone           text,
  website         text,

  address_line    text,
  postal_code     text,
  city_id         uuid references public.cities (id) on delete set null,
  city_name       text,
  latitude        double precision,
  longitude       double precision,
  location        extensions.geography(Point, 4326)
                  generated always as (
                    extensions.st_setsrid(
                      extensions.st_makepoint(longitude, latitude), 4326
                    )::extensions.geography
                  ) stored,

  -- Horaires : { "mon": [["09:00","19:00"]], ..., "sun": [] }
  opening_hours   jsonb not null default '{}'::jsonb,
  -- Services : livraison, aeroport, gare, 24_7, jeune_conducteur, sans_caution...
  services        text[] not null default '{}',

  status          public.agency_status not null default 'draft',
  is_verified     boolean not null default false,
  plan            public.plan_tier not null default 'free',

  rating_average  numeric(2,1) not null default 0,
  rating_count    integer not null default 0,
  view_count      integer not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint agencies_rating_range check (rating_average >= 0 and rating_average <= 5)
);

comment on table public.agencies is 'Fiche du loueur professionnel. Un pro peut gerer plusieurs agences (multi-points de vente).';

create index agencies_owner_idx     on public.agencies (owner_id);
create index agencies_city_idx      on public.agencies (city_id);
create index agencies_status_idx    on public.agencies (status);
create index agencies_location_idx  on public.agencies using gist (location);

create trigger agencies_set_updated_at
  before update on public.agencies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- vehicles : l'unite mise en avant et facturee
-- ---------------------------------------------------------------------

create table public.vehicles (
  id                    uuid primary key default gen_random_uuid(),
  agency_id             uuid not null references public.agencies (id) on delete cascade,

  brand                 text not null,
  model                 text not null,
  version               text,
  year                  integer,
  category              public.vehicle_category not null default 'citadine',
  transmission          public.transmission_type not null default 'manuelle',
  fuel                  public.fuel_type not null default 'essence',
  seats                 smallint not null default 5,
  doors                 smallint not null default 5,
  luggage               smallint not null default 2,
  color                 text,
  license_plate         text,

  price_per_day         numeric(10,2) not null,
  price_per_week        numeric(10,2),
  price_per_month       numeric(10,2),
  deposit_amount        numeric(10,2),
  mileage_included_day  integer,
  extra_km_price        numeric(6,2),

  min_driver_age        smallint default 21,
  min_license_years     smallint default 2,

  -- Options : gps, siege_bebe, clim, bluetooth, camera_recul, attelage...
  options               text[] not null default '{}',
  description           text,
  images                text[] not null default '{}',

  status                public.vehicle_status not null default 'draft',
  is_featured           boolean not null default false,
  view_count            integer not null default 0,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint vehicles_price_positive check (price_per_day > 0),
  constraint vehicles_seats_range check (seats between 1 and 60)
);

comment on table public.vehicles is 'Vehicule publie par une agence. Le nombre de vehicules publies est plafonne par le palier d abonnement.';

create index vehicles_agency_idx    on public.vehicles (agency_id);
create index vehicles_status_idx    on public.vehicles (status);
create index vehicles_category_idx  on public.vehicles (category);
create index vehicles_price_idx     on public.vehicles (price_per_day);
create index vehicles_featured_idx  on public.vehicles (is_featured) where is_featured;

create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- vehicle_unavailability : periodes ou le vehicule n'est pas louable
-- ---------------------------------------------------------------------

create table public.vehicle_unavailability (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references public.vehicles (id) on delete cascade,
  starts_on   date not null,
  ends_on     date not null,
  reason      text,
  created_at  timestamptz not null default now(),

  constraint vehicle_unavailability_range check (ends_on >= starts_on)
);

create index vehicle_unavailability_vehicle_idx
  on public.vehicle_unavailability (vehicle_id, starts_on, ends_on);

-- ---------------------------------------------------------------------
-- leads : la mise en relation (coeur de la valeur rendue au pro)
-- ---------------------------------------------------------------------

create table public.leads (
  id             uuid primary key default gen_random_uuid(),
  agency_id      uuid not null references public.agencies (id) on delete cascade,
  vehicle_id     uuid references public.vehicles (id) on delete set null,
  client_id      uuid references public.profiles (id) on delete set null,

  first_name     text not null,
  last_name      text,
  email          text not null,
  phone          text,
  message        text,
  desired_start  date,
  desired_end    date,

  status         public.lead_status not null default 'nouveau',
  source         text not null default 'site',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.leads is 'Demande de contact envoyee par un client a un pro. C est la metrique de valeur montree au pro dans son tableau de bord.';

create index leads_agency_idx  on public.leads (agency_id, created_at desc);
create index leads_client_idx  on public.leads (client_id);
create index leads_status_idx  on public.leads (status);

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- favorites : vehicules sauvegardes par un client
-- ---------------------------------------------------------------------

create table public.favorites (
  client_id   uuid not null references public.profiles (id) on delete cascade,
  vehicle_id  uuid not null references public.vehicles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (client_id, vehicle_id)
);

-- ---------------------------------------------------------------------
-- reviews : avis clients sur une agence
-- ---------------------------------------------------------------------

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references public.agencies (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  rating      smallint not null,
  comment     text,
  is_published boolean not null default true,
  created_at  timestamptz not null default now(),

  constraint reviews_rating_range check (rating between 1 and 5),
  unique (agency_id, author_id)
);

create index reviews_agency_idx on public.reviews (agency_id);

-- Recalcule la note moyenne de l'agence a chaque ecriture d'avis.
create or replace function public.refresh_agency_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.agency_id, old.agency_id);
begin
  update public.agencies a
  set rating_average = coalesce(stats.avg_rating, 0),
      rating_count   = coalesce(stats.total, 0)
  from (
    select round(avg(rating)::numeric, 1) as avg_rating, count(*) as total
    from public.reviews
    where agency_id = target and is_published
  ) as stats
  where a.id = target;

  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_agency_rating();

-- ---------------------------------------------------------------------
-- subscriptions : miroir local de l'abonnement Stripe du pro
-- ---------------------------------------------------------------------

create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  agency_id               uuid not null unique references public.agencies (id) on delete cascade,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  stripe_price_id         text,
  plan                    public.plan_tier not null default 'free',
  status                  public.subscription_status not null default 'active',
  quantity                integer not null default 1,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  trial_ends_at           timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.subscriptions is 'Etat de l abonnement Stripe. Ecrit uniquement par le webhook (service role).';

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Le plan de l'agence suit toujours celui de son abonnement.
create or replace function public.sync_agency_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.agencies
  set plan = case
        when new.status in ('active', 'trialing') then new.plan
        else 'free'::public.plan_tier
      end
  where id = new.agency_id;
  return new;
end;
$$;

create trigger subscriptions_sync_agency_plan
  after insert or update on public.subscriptions
  for each row execute function public.sync_agency_plan();
