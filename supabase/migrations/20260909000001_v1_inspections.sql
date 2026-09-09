-- Etats des lieux (ADR-0018) : depart et retour, croquis des dommages, signature du client,
-- PDF genere par le moteur et envoye par e-mail. Une ligne par etat des lieux, jamais modifiee apres signature.
create table public.inspections (
  id                 uuid primary key default public.uuid_generate_v7(),
  booking_id         uuid not null references public.bookings (id) on delete cascade,
  organization_id    uuid not null references public.organizations (id) on delete cascade,
  vehicle_id         uuid references public.vehicles (id) on delete set null,
  kind               text not null constraint inspections_kind check (kind in ('departure', 'return')),
  mileage_km         integer constraint inspections_mileage check (mileage_km is null or mileage_km between 0 and 2000000),
  fuel_eighths       smallint constraint inspections_fuel check (fuel_eighths is null or fuel_eighths between 0 and 8),
  damages            jsonb not null default '[]'::jsonb,
  comment            text constraint inspections_comment_len check (comment is null or char_length(comment) <= 2000),
  customer_signature jsonb,
  staff_name         text,
  pdf_path           text,
  sent_to            text[] not null default '{}',
  sent_at            timestamptz,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now()
);
create index inspections_booking_idx on public.inspections (booking_id, created_at desc);
create index inspections_org_idx on public.inspections (organization_id, created_at desc);

alter table public.inspections enable row level security;
create policy inspections_select on public.inspections for select
  using (
    public.is_member(organization_id)
    or public.is_platform_staff()
    or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid())
  );
