-- Stories (ADR-0016) : bulles en tete du feed. Contenu genere (offres, nouveaux vehicules)
-- + story manuelle du loueur (photo, legende), valable 48 h.

create table public.stories (
  id               uuid primary key default public.uuid_generate_v7(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  photo_path       text not null,
  caption          text constraint stories_caption_len check (caption is null or char_length(caption) <= 120),
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default (now() + interval '48 hours')
);
create index stories_org_idx on public.stories (organization_id, expires_at desc);

alter table public.stories enable row level security;
create policy stories_select on public.stories for select
  using (expires_at > now() or public.is_member(organization_id) or public.is_platform_staff());
