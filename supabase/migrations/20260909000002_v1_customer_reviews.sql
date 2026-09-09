-- Evaluation des clients par les loueurs (ADR-0020) : une note par reservation terminee,
-- visible par le client sur son profil et par les loueurs sur ses demandes.
create table public.customer_reviews (
  id               uuid primary key default public.uuid_generate_v7(),
  booking_id       uuid not null unique references public.bookings (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  customer_id      uuid not null references public.profiles (id) on delete cascade,
  author_id        uuid references public.profiles (id) on delete set null,
  rating           smallint not null constraint customer_reviews_rating check (rating between 1 and 5),
  comment          text constraint customer_reviews_comment_len check (comment is null or char_length(comment) <= 600),
  created_at       timestamptz not null default now()
);
create index customer_reviews_customer_idx on public.customer_reviews (customer_id, created_at desc);

alter table public.customer_reviews enable row level security;
create policy customer_reviews_select on public.customer_reviews for select
  using (customer_id = auth.uid() or public.is_member(organization_id) or public.is_platform_staff());
