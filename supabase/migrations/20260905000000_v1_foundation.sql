-- =====================================================================
--  Schema v1 — fondations
--  Extensions, utilitaires, identite, referentiel villes.
--  Voir docs/phase-0/04-modele-de-donnees.md et ADR-0003/0004/0007.
-- =====================================================================

create extension if not exists "pgcrypto"   with schema extensions;
create extension if not exists "postgis"    with schema extensions;
create extension if not exists "unaccent"   with schema extensions;
create extension if not exists "btree_gist" with schema extensions;

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.platform_role      as enum ('support', 'admin', 'superadmin');
create type public.organization_role  as enum ('owner', 'manager', 'agent');
create type public.organization_status as enum ('draft', 'submitted', 'under_review', 'verified', 'rejected', 'suspended');
create type public.agency_status      as enum ('draft', 'published', 'suspended');
create type public.vehicle_status     as enum ('draft', 'published', 'archived');
create type public.vehicle_category   as enum ('citadine', 'compacte', 'berline', 'suv', 'break', 'monospace', 'cabriolet', 'coupe', 'utilitaire', 'minibus', 'prestige', 'sans_permis');
create type public.transmission_type  as enum ('manuelle', 'automatique');
create type public.fuel_type          as enum ('essence', 'diesel', 'hybride', 'hybride_rechargeable', 'electrique', 'gpl');
create type public.booking_status     as enum ('requested', 'confirmed', 'active', 'completed', 'declined', 'expired', 'cancelled', 'no_show', 'disputed', 'resolved');
create type public.actor_type         as enum ('customer', 'organization_member', 'platform', 'system');
create type public.document_kind      as enum ('kbis', 'insurance', 'id_card', 'driving_license', 'vehicle_registration', 'other');
create type public.document_status    as enum ('pending', 'accepted', 'rejected');
create type public.block_reason       as enum ('maintenance', 'external_rental', 'other');
create type public.consent_kind       as enum ('terms', 'privacy', 'marketing');
create type public.device_platform    as enum ('ios', 'android');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid', 'paused');

-- ---------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------

-- UUID v7 (tri chronologique, non enumerable). Implementation standard en SQL.
create or replace function public.uuid_generate_v7()
returns uuid
language sql
volatile
set search_path = ''
as $$
  select encode(
    set_bit(
      set_bit(
        overlay(extensions.gen_random_bytes(16)
                placing substring(int8send((extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
                from 1 for 6),
        52, 1),
      53, 1),
    'hex')::uuid;
$$;

create or replace function public.slugify(value text)
returns text
language sql
stable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(value, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
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
  id             uuid primary key references auth.users (id) on delete cascade,
  first_name     text,
  last_name      text,
  phone          text,
  avatar_path    text,
  locale         text not null default 'fr',
  date_of_birth  date,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint profiles_first_name_len check (first_name is null or char_length(first_name) between 1 and 80),
  constraint profiles_last_name_len  check (last_name  is null or char_length(last_name)  between 1 and 80)
);
comment on table public.profiles is 'Profil applicatif. Aucun role ici : les roles vivent dans platform_roles et organization_members (ADR-0007).';

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cree le profil a l'inscription. Ne lit AUCUN role depuis les metadonnees client.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'first_name', ''), 80), ''),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'last_name', ''), 80), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- platform_roles : support / admin / superadmin (attribues par superadmin)
-- ---------------------------------------------------------------------
create table public.platform_roles (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  role        public.platform_role not null,
  granted_by  uuid references public.profiles (id) on delete set null,
  granted_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- device_tokens, consents
-- ---------------------------------------------------------------------
create table public.device_tokens (
  id            uuid primary key default public.uuid_generate_v7(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  platform      public.device_platform not null,
  token         text not null unique,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index device_tokens_user_idx on public.device_tokens (user_id);

create table public.consents (
  id           uuid primary key default public.uuid_generate_v7(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  kind         public.consent_kind not null,
  version      text not null,
  accepted_at  timestamptz not null default now(),
  ip_hash      text
);
create index consents_user_idx on public.consents (user_id, kind, accepted_at desc);

-- ---------------------------------------------------------------------
-- cities : referentiel geographique (repris de v0)
-- ---------------------------------------------------------------------
create table public.cities (
  id              uuid primary key default public.uuid_generate_v7(),
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
                  generated always as (extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography) stored,
  created_at      timestamptz not null default now()
);
create index cities_location_idx on public.cities using gist (location);
create index cities_name_idx     on public.cities (lower(name));

-- ---------------------------------------------------------------------
-- audit_log : ajout seul
-- ---------------------------------------------------------------------
create table public.audit_log (
  id               uuid primary key default public.uuid_generate_v7(),
  actor_id         uuid,
  actor_type       public.actor_type not null,
  action           text not null,
  subject_type     text not null,
  subject_id       uuid,
  organization_id  uuid,
  metadata         jsonb not null default '{}'::jsonb,
  ip_hash          text,
  request_id       text,
  created_at       timestamptz not null default now()
);
create index audit_log_subject_idx on public.audit_log (subject_type, subject_id, created_at desc);
create index audit_log_org_idx     on public.audit_log (organization_id, created_at desc) where organization_id is not null;

create or replace function public.forbid_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Table % en ajout seul', tg_table_name using errcode = 'insufficient_privilege';
end;
$$;
create trigger audit_log_immutable before update or delete on public.audit_log
  for each row execute function public.forbid_mutation();

-- ---------------------------------------------------------------------
-- idempotency_keys
-- ---------------------------------------------------------------------
create table public.idempotency_keys (
  key              text not null,
  user_id          uuid not null,
  route            text not null,
  request_hash     text not null,
  response_status  integer,
  response_body    jsonb,
  created_at       timestamptz not null default now(),
  primary key (user_id, key)
);
create index idempotency_keys_created_idx on public.idempotency_keys (created_at);
