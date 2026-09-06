-- Phase 6 (ADR-0012) : messagerie client <-> loueur (fil par organisation, rattachable a une
-- reservation) et avis apres location (un avis par reservation terminee, reponse du loueur).

create table public.conversations (
  id                    uuid primary key default public.uuid_generate_v7(),
  organization_id       uuid not null references public.organizations (id) on delete cascade,
  customer_id           uuid not null references public.profiles (id) on delete cascade,
  booking_id            uuid references public.bookings (id) on delete cascade,
  vehicle_id            uuid references public.vehicles (id) on delete set null,
  last_message_at       timestamptz,
  last_message_preview  text,
  customer_read_at      timestamptz,
  organization_read_at  timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
-- Un seul fil general par client et par loueur ; un fil par reservation.
create unique index conversations_general_idx on public.conversations (organization_id, customer_id) where booking_id is null;
create unique index conversations_booking_idx on public.conversations (booking_id) where booking_id is not null;
create index conversations_customer_idx on public.conversations (customer_id, last_message_at desc);
create index conversations_org_idx on public.conversations (organization_id, last_message_at desc);
create trigger conversations_set_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

create table public.messages (
  id               uuid primary key default public.uuid_generate_v7(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid references public.profiles (id) on delete set null,
  sender_type      public.actor_type not null,
  body             text not null constraint messages_body_len check (char_length(body) between 1 and 2000),
  created_at       timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create trigger messages_immutable before update or delete on public.messages
  for each row execute function public.forbid_mutation();

create table public.reviews (
  id               uuid primary key default public.uuid_generate_v7(),
  booking_id       uuid not null unique references public.bookings (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  vehicle_id       uuid references public.vehicles (id) on delete set null,
  customer_id      uuid not null references public.profiles (id) on delete cascade,
  rating           integer not null constraint reviews_rating check (rating between 1 and 5),
  comment          text constraint reviews_comment_len check (comment is null or char_length(comment) <= 1000),
  reply            text constraint reviews_reply_len check (reply is null or char_length(reply) <= 1000),
  replied_at       timestamptz,
  status           text not null default 'published' constraint reviews_status check (status in ('published', 'hidden')),
  hidden_reason    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index reviews_org_idx on public.reviews (organization_id, status, created_at desc);
create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

-- RLS : seconde ligne de defense (l'API est l'autorite).
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.reviews       enable row level security;
create policy conversations_select on public.conversations for select to authenticated
  using (customer_id = auth.uid() or public.is_member(organization_id) or public.is_platform_staff());
create policy messages_select on public.messages for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id
    and (c.customer_id = auth.uid() or public.is_member(c.organization_id) or public.is_platform_staff())));
create policy reviews_select_public on public.reviews for select
  using (status = 'published' or customer_id = auth.uid() or public.is_member(organization_id) or public.is_platform_staff());
