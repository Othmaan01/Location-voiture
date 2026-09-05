-- =====================================================================
--  Row Level Security
--  Principe : tout est ferme par defaut. On ouvre explicitement
--  la lecture publique du catalogue publie, et l'ecriture au proprietaire.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers (security definer pour eviter la recursion de policies)
-- ---------------------------------------------------------------------

create or replace function public.current_role_is(p_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = p_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role_is('admin');
$$;

create or replace function public.owns_agency(p_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.agencies
    where id = p_agency_id and owner_id = auth.uid()
  );
$$;

grant execute on function public.is_admin to authenticated;
grant execute on function public.owns_agency to authenticated;
grant execute on function public.current_role_is to authenticated;

-- ---------------------------------------------------------------------
alter table public.profiles                enable row level security;
alter table public.cities                  enable row level security;
alter table public.agencies                enable row level security;
alter table public.vehicles                enable row level security;
alter table public.vehicle_unavailability  enable row level security;
alter table public.leads                   enable row level security;
alter table public.favorites               enable row level security;
alter table public.reviews                 enable row level security;
alter table public.subscriptions           enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy "profiles_select_self"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Un utilisateur peut modifier son profil, mais jamais son propre role :
-- un trigger est plus sur (et plus lisible) qu'une sous-requete dans la policy.
create or replace function public.freeze_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_freeze_role
  before update on public.profiles
  for each row execute function public.freeze_profile_role();

create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- cities : referentiel public en lecture
-- ---------------------------------------------------------------------
create policy "cities_public_read"
  on public.cities for select
  to anon, authenticated
  using (true);

create policy "cities_admin_write"
  on public.cities for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- agencies
-- ---------------------------------------------------------------------
create policy "agencies_public_read_published"
  on public.agencies for select
  to anon, authenticated
  using (status = 'published');

create policy "agencies_owner_read"
  on public.agencies for select
  to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create policy "agencies_owner_insert"
  on public.agencies for insert
  to authenticated
  with check (owner_id = auth.uid() and public.current_role_is('pro'));

create policy "agencies_owner_update"
  on public.agencies for update
  to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy "agencies_owner_delete"
  on public.agencies for delete
  to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- vehicles
-- ---------------------------------------------------------------------
create policy "vehicles_public_read_published"
  on public.vehicles for select
  to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.agencies a
      where a.id = vehicles.agency_id and a.status = 'published'
    )
  );

create policy "vehicles_owner_read"
  on public.vehicles for select
  to authenticated
  using (public.owns_agency(agency_id) or public.is_admin());

create policy "vehicles_owner_write"
  on public.vehicles for insert
  to authenticated
  with check (public.owns_agency(agency_id));

create policy "vehicles_owner_update"
  on public.vehicles for update
  to authenticated
  using (public.owns_agency(agency_id) or public.is_admin())
  with check (public.owns_agency(agency_id) or public.is_admin());

create policy "vehicles_owner_delete"
  on public.vehicles for delete
  to authenticated
  using (public.owns_agency(agency_id) or public.is_admin());

-- ---------------------------------------------------------------------
-- vehicle_unavailability
-- ---------------------------------------------------------------------
create policy "unavailability_public_read"
  on public.vehicle_unavailability for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_unavailability.vehicle_id and v.status = 'published'
    )
  );

create policy "unavailability_owner_all"
  on public.vehicle_unavailability for all
  to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_unavailability.vehicle_id and public.owns_agency(v.agency_id)
    )
  )
  with check (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_unavailability.vehicle_id and public.owns_agency(v.agency_id)
    )
  );

-- ---------------------------------------------------------------------
-- leads : n'importe qui peut envoyer une demande, seul le pro la lit
-- ---------------------------------------------------------------------
create policy "leads_public_insert"
  on public.leads for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.agencies a
      where a.id = leads.agency_id and a.status = 'published'
    )
  );

create policy "leads_agency_read"
  on public.leads for select
  to authenticated
  using (public.owns_agency(agency_id) or client_id = auth.uid() or public.is_admin());

create policy "leads_agency_update"
  on public.leads for update
  to authenticated
  using (public.owns_agency(agency_id) or public.is_admin())
  with check (public.owns_agency(agency_id) or public.is_admin());

-- ---------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------
create policy "favorites_owner_all"
  on public.favorites for all
  to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- ---------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------
create policy "reviews_public_read"
  on public.reviews for select
  to anon, authenticated
  using (is_published);

create policy "reviews_author_insert"
  on public.reviews for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "reviews_author_update"
  on public.reviews for update
  to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

create policy "reviews_author_delete"
  on public.reviews for delete
  to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- subscriptions : lecture par le proprietaire, ecriture par le webhook
-- (service_role contourne RLS, donc aucune policy d'ecriture ici)
-- ---------------------------------------------------------------------
create policy "subscriptions_owner_read"
  on public.subscriptions for select
  to authenticated
  using (public.owns_agency(agency_id) or public.is_admin());

-- ---------------------------------------------------------------------
-- Storage : photos de vehicules et logos d'agences
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vehicles', 'vehicles', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif']),
  ('agencies', 'agencies', true, 2097152, array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml'])
on conflict (id) do nothing;

create policy "storage_public_read_media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('vehicles', 'agencies'));

-- Un pro depose ses fichiers dans un dossier nomme d'apres son user id :
-- vehicles/<auth.uid()>/<uuid>.webp
create policy "storage_pro_insert_media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('vehicles', 'agencies')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_pro_update_media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('vehicles', 'agencies')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_pro_delete_media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('vehicles', 'agencies')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
