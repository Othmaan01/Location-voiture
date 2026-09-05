-- =====================================================================
--  Suppression de compte (Phase 1)
--  Le compte Auth est supprime, mais la ligne `profiles` est conservee
--  anonymisee : les reservations passees (obligations comptables) y
--  restent rattachees. La cle etrangere vers auth.users est donc retiree.
-- =====================================================================

alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles add column if not exists auth_deleted_at timestamptz;

comment on column public.profiles.deleted_at is 'Anonymisation demandee par l utilisateur : nom, telephone et avatar effaces.';
comment on column public.profiles.auth_deleted_at is 'Compte Auth supprime chez Supabase (plus de connexion possible).';

-- Un profil anonymise ne doit plus etre lisible par lui-meme (il n y a plus de session), seul le staff y accede.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using ((id = auth.uid() and deleted_at is null) or public.is_platform_staff());
