-- =====================================================================
--  Schema v1 — organisations (loueurs), membres, agences, documents,
--  verification, abonnement (ADR-0007, ADR-0008)
-- =====================================================================

-- ---------------------------------------------------------------------
-- plans : grille d'abonnement (donnees, pas de code — ADR-0008)
-- ---------------------------------------------------------------------
create table public.plans (
  code                    text primary key,
  name                    text not null,
  max_published_vehicles  integer,              -- null = illimite
  monthly_price_cents     integer not null default 0,
  currency                char(3) not null default 'EUR',
  stripe_price_id         text unique,
  is_default              boolean not null default false,
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  constraint plans_price_nonneg check (monthly_price_cents >= 0),
  constraint plans_max_positive check (max_published_vehicles is null or max_published_vehicles >= 0)
);
create unique index plans_single_default_idx on public.plans (is_default) where is_default;

-- ---------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------
create table public.organizations (
  id                 uuid primary key default public.uuid_generate_v7(),
  name               text not null,
  slug               text not null unique,
  legal_name         text,
  siret              text,
  vat_number         text,
  country_code       char(2) not null default 'FR',
  status             public.organization_status not null default 'draft',
  status_reason      text,
  status_changed_at  timestamptz not null default now(),
  billing_email      text,
  plan_code          text not null references public.plans (code),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint organizations_name_len  check (char_length(name) between 2 and 120),
  constraint organizations_siret_fmt check (siret is null or siret ~ '^[0-9]{14}$')
);
create index organizations_status_idx on public.organizations (status);
create unique index organizations_siret_idx on public.organizations (siret) where siret is not null;

create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

create or replace function public.organizations_track_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;
create trigger organizations_track_status before update on public.organizations
  for each row execute function public.organizations_track_status();

-- ---------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------
create table public.organization_members (
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  role             public.organization_role not null,
  invited_by       uuid references public.profiles (id) on delete set null,
  joined_at        timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

-- Une organisation garde toujours au moins un owner.
create or replace function public.organization_members_keep_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  remaining integer;
begin
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
create trigger organization_members_keep_owner before update or delete on public.organization_members
  for each row execute function public.organization_members_keep_owner();

create table public.organization_invitations (
  id               uuid primary key default public.uuid_generate_v7(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  email            text not null,
  role             public.organization_role not null,
  token_hash       text not null unique,
  invited_by       uuid references public.profiles (id) on delete set null,
  expires_at       timestamptz not null,
  accepted_at      timestamptz,
  created_at       timestamptz not null default now(),
  constraint organization_invitations_role check (role <> 'owner')
);
create index organization_invitations_org_idx on public.organization_invitations (organization_id);

-- ---------------------------------------------------------------------
-- agencies : point de retrait d'une organisation
-- ---------------------------------------------------------------------
create table public.agencies (
  id               uuid primary key default public.uuid_generate_v7(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null,
  slug             text not null unique,
  address_line     text,
  postal_code      text,
  city_id          uuid references public.cities (id) on delete set null,
  city_name        text,
  latitude         double precision,
  longitude        double precision,
  location         extensions.geography(Point, 4326)
                   generated always as (extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography) stored,
  timezone         text not null default 'Europe/Paris',
  phone            text,
  email            text,
  opening_hours    jsonb not null default '{}'::jsonb,
  services         text[] not null default '{}',
  status           public.agency_status not null default 'draft',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint agencies_coords check ((latitude is null) = (longitude is null)),
  constraint agencies_lat_range check (latitude  is null or latitude  between -90 and 90),
  constraint agencies_lng_range check (longitude is null or longitude between -180 and 180)
);
create index agencies_org_idx      on public.agencies (organization_id);
create index agencies_location_idx on public.agencies using gist (location);
create index agencies_status_idx   on public.agencies (status);
create trigger agencies_set_updated_at before update on public.agencies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- documents : stockage prive, metadonnees ici
-- ---------------------------------------------------------------------
create table public.documents (
  id                uuid primary key default public.uuid_generate_v7(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  uploaded_by       uuid references public.profiles (id) on delete set null,
  kind              public.document_kind not null,
  storage_path      text not null unique,
  mime_type         text not null,
  size_bytes        integer not null,
  sha256            text,
  status            public.document_status not null default 'pending',
  reviewed_by       uuid references public.profiles (id) on delete set null,
  reviewed_at       timestamptz,
  rejection_reason  text,
  expires_at        date,
  subject_type      text not null default 'organization',
  subject_id        uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint documents_size check (size_bytes > 0 and size_bytes <= 10485760),
  constraint documents_mime check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp'))
);
create index documents_org_idx on public.documents (organization_id, kind);
create trigger documents_set_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

create table public.document_access_log (
  id            uuid primary key default public.uuid_generate_v7(),
  document_id   uuid not null references public.documents (id) on delete cascade,
  accessed_by   uuid,
  purpose       text not null,
  request_id    text,
  created_at    timestamptz not null default now()
);
create index document_access_log_doc_idx on public.document_access_log (document_id, created_at desc);
create trigger document_access_log_immutable before update or delete on public.document_access_log
  for each row execute function public.forbid_mutation();

-- ---------------------------------------------------------------------
-- verification_requests : historique des demandes de verification
-- ---------------------------------------------------------------------
create table public.verification_requests (
  id               uuid primary key default public.uuid_generate_v7(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  submitted_by     uuid references public.profiles (id) on delete set null,
  submitted_at     timestamptz not null default now(),
  decided_by       uuid references public.profiles (id) on delete set null,
  decided_at       timestamptz,
  decision         text,
  notes            text,
  constraint verification_requests_decision check (decision is null or decision in ('verified', 'rejected'))
);
create index verification_requests_org_idx on public.verification_requests (organization_id, submitted_at desc);

-- ---------------------------------------------------------------------
-- subscriptions : miroir Stripe Billing, rattache a l'organisation
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id                      uuid primary key default public.uuid_generate_v7(),
  organization_id         uuid not null unique references public.organizations (id) on delete cascade,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  stripe_price_id         text,
  plan_code               text not null references public.plans (code),
  status                  public.subscription_status not null default 'active',
  quantity                integer not null default 1,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  trial_ends_at           timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Le plan de l'organisation suit l'abonnement ; plan par defaut si inactif.
create or replace function public.sync_organization_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fallback text;
begin
  select code into fallback from public.plans where is_default limit 1;
  update public.organizations
  set plan_code = case when new.status in ('active', 'trialing') then new.plan_code else coalesce(fallback, plan_code) end
  where id = new.organization_id;
  return new;
end;
$$;
create trigger subscriptions_sync_plan after insert or update on public.subscriptions
  for each row execute function public.sync_organization_plan();
