-- Groupes de favoris (retour fondateur, 2026-09-10) : « Mariage Mejdi 2027 », etc.
-- Un favori appartient a zero ou un groupe ; supprimer le groupe garde les favoris.
create table public.favorite_groups (
  id          uuid primary key default public.uuid_generate_v7(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.favorites
  add column group_id uuid references public.favorite_groups (id) on delete set null;
create index favorites_group_idx on public.favorites (group_id);

alter table public.favorite_groups enable row level security;
create policy favorite_groups_own on public.favorite_groups for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
