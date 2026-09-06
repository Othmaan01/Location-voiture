-- Phase 7 (ADR-0013) : signalements par les utilisateurs (loueur, vehicule, avis, message),
-- traites par l'administration. Les litiges reutilisent la machine a etats des reservations.

create table public.reports (
  id               uuid primary key default public.uuid_generate_v7(),
  reporter_id      uuid references public.profiles (id) on delete set null,
  target_type      text not null constraint reports_target_type check (target_type in ('organization', 'vehicle', 'review', 'conversation')),
  target_id        uuid not null,
  organization_id  uuid references public.organizations (id) on delete cascade,
  reason           text not null constraint reports_reason check (reason in ('fraud', 'inappropriate', 'spam', 'safety', 'other')),
  details          text constraint reports_details_len check (details is null or char_length(details) <= 1000),
  status           text not null default 'open' constraint reports_status check (status in ('open', 'resolved', 'dismissed')),
  resolution_note  text constraint reports_note_len check (resolution_note is null or char_length(resolution_note) <= 1000),
  resolved_by      uuid references public.profiles (id) on delete set null,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);

alter table public.reports enable row level security;
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_platform_staff());
