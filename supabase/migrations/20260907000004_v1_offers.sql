-- Offres (ADR-0015) : remise temporaire d'un loueur sur un vehicule ou sur toute sa flotte.
-- Le devis applique la remise cote serveur ; le feed expose un onglet "Offres".

create table public.offers (
  id               uuid primary key default public.uuid_generate_v7(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  vehicle_id       uuid references public.vehicles (id) on delete cascade,   -- null = toute la flotte
  title            text not null constraint offers_title_len check (char_length(title) between 2 and 60),
  discount_type    text not null constraint offers_discount_type check (discount_type in ('percent', 'fixed')),
  discount_value   integer not null constraint offers_discount_value check (discount_value > 0),
  starts_at        timestamptz not null default now(),
  ends_at          timestamptz not null,
  status           text not null default 'active' constraint offers_status check (status in ('active', 'archived')),
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint offers_period check (ends_at > starts_at and ends_at <= starts_at + interval '90 days'),
  constraint offers_percent_range check (discount_type <> 'percent' or discount_value between 5 and 70)
);
create index offers_org_idx on public.offers (organization_id, status, ends_at);
create index offers_vehicle_idx on public.offers (vehicle_id) where vehicle_id is not null;
create trigger offers_set_updated_at before update on public.offers
  for each row execute function public.set_updated_at();

alter table public.quotes add column offer_id uuid references public.offers (id) on delete set null;

alter table public.offers enable row level security;
create policy offers_select on public.offers for select
  using ((status = 'active' and now() between starts_at and ends_at) or public.is_member(organization_id) or public.is_platform_staff());
