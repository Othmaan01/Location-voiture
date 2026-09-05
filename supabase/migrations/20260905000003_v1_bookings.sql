-- =====================================================================
--  Schema v1 — devis, reservations, evenements (ADR-0005)
-- =====================================================================

create table public.quotes (
  id                 uuid primary key default public.uuid_generate_v7(),
  user_id            uuid references public.profiles (id) on delete cascade,
  vehicle_id         uuid not null references public.vehicles (id) on delete cascade,
  organization_id    uuid not null references public.organizations (id) on delete cascade,
  rate_plan_id       uuid not null references public.rate_plans (id) on delete restrict,
  pickup_agency_id   uuid not null references public.agencies (id) on delete restrict,
  period             tstzrange not null,
  lines              jsonb not null,
  subtotal_cents     integer not null,
  fees_cents         integer not null default 0,
  total_cents        integer not null,
  deposit_cents      integer not null default 0,
  currency           char(3) not null,
  expires_at         timestamptz not null,
  created_at         timestamptz not null default now(),
  constraint quotes_period check (not isempty(period) and lower_inc(period) and not upper_inc(period)),
  constraint quotes_amounts check (subtotal_cents >= 0 and fees_cents >= 0 and total_cents >= 0 and deposit_cents >= 0)
);
create index quotes_user_idx on public.quotes (user_id, created_at desc);
create index quotes_expires_idx on public.quotes (expires_at);
create trigger quotes_immutable before update on public.quotes
  for each row execute function public.forbid_mutation();

-- Reference lisible, non sequentielle : LV-XXXXXX (alphabet sans caracteres ambigus).
create or replace function public.generate_booking_reference()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'LV-' || string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), '')
  from generate_series(1, 6);
$$;

create table public.bookings (
  id                    uuid primary key default public.uuid_generate_v7(),
  reference             text not null unique default public.generate_booking_reference(),
  organization_id       uuid not null references public.organizations (id) on delete restrict,
  agency_id             uuid not null references public.agencies (id) on delete restrict,
  vehicle_id            uuid not null references public.vehicles (id) on delete restrict,
  customer_id           uuid not null references public.profiles (id) on delete restrict,
  quote_id              uuid not null references public.quotes (id) on delete restrict,
  period                tstzrange not null,
  status                public.booking_status not null default 'requested',
  status_changed_at     timestamptz not null default now(),
  customer_message      text,
  decline_reason        text,
  cancellation_reason   text,
  cancelled_by          public.actor_type,
  total_cents           integer not null,
  deposit_cents         integer not null default 0,
  currency              char(3) not null,
  price_snapshot        jsonb not null,
  expires_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint bookings_period check (not isempty(period) and lower_inc(period) and not upper_inc(period)),
  constraint bookings_amounts check (total_cents >= 0 and deposit_cents >= 0),
  constraint bookings_message_len check (customer_message is null or char_length(customer_message) <= 1000),
  -- Anti-double reservation : deux reservations fermes ne se chevauchent jamais (ADR-0005).
  constraint bookings_no_overlap exclude using gist (vehicle_id with =, period with &&)
    where (status in ('confirmed', 'active'))
);
create index bookings_org_status_idx      on public.bookings (organization_id, status, created_at desc);
create index bookings_customer_idx        on public.bookings (customer_id, created_at desc);
create index bookings_vehicle_period_idx  on public.bookings using gist (vehicle_id, period);
create index bookings_expires_idx         on public.bookings (expires_at) where status = 'requested';
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

create or replace function public.bookings_track_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  -- Les colonnes financieres et la periode sont figees apres creation.
  if new.total_cents <> old.total_cents or new.currency <> old.currency or new.period <> old.period
     or new.quote_id <> old.quote_id or new.customer_id <> old.customer_id or new.vehicle_id <> old.vehicle_id then
    raise exception 'Reservation : montant, periode, devis et parties sont immuables' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger bookings_track_status before update on public.bookings
  for each row execute function public.bookings_track_status();

create table public.booking_events (
  id               uuid primary key default public.uuid_generate_v7(),
  booking_id       uuid not null references public.bookings (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  from_status      public.booking_status,
  to_status        public.booking_status not null,
  actor_id         uuid,
  actor_type       public.actor_type not null,
  reason           text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);
create index booking_events_booking_idx on public.booking_events (booking_id, created_at);
create trigger booking_events_immutable before update or delete on public.booking_events
  for each row execute function public.forbid_mutation();

-- ---------------------------------------------------------------------
create table public.favorites (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  vehicle_id  uuid not null references public.vehicles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, vehicle_id)
);

create table public.notifications (
  id             uuid primary key default public.uuid_generate_v7(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  kind           text not null,
  payload        jsonb not null default '{}'::jsonb,
  read_at        timestamptz,
  sent_push_at   timestamptz,
  sent_email_at  timestamptz,
  created_at     timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Disponibilite d'un vehicule sur une periode (blocages + reservations fermes)
-- ---------------------------------------------------------------------
create or replace function public.vehicle_is_available(p_vehicle_id uuid, p_period tstzrange)
returns boolean
language sql
stable
set search_path = ''
as $$
  select not exists (
    select 1 from public.availability_blocks b where b.vehicle_id = p_vehicle_id and b.period && p_period
  ) and not exists (
    select 1 from public.bookings k where k.vehicle_id = p_vehicle_id and k.period && p_period and k.status in ('confirmed', 'active')
  );
$$;
