-- =====================================================================
--  Schema v1 — Row Level Security (defense en profondeur, ADR-0003)
--  L'API est l'autorite ; ces policies protegent la base si un acces
--  PostgREST est ouvert ou si une route a un defaut d'autorisation.
--  Tout est ferme par defaut.
-- =====================================================================

create or replace function public.current_platform_role()
returns public.platform_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.platform_roles where user_id = auth.uid();
$$;

create or replace function public.is_platform_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_platform_role() is not null;
$$;

create or replace function public.member_role(p_organization_id uuid)
returns public.organization_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.organization_members
  where organization_id = p_organization_id and user_id = auth.uid();
$$;

create or replace function public.is_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.member_role(p_organization_id) is not null;
$$;

create or replace function public.is_member_at_least(p_organization_id uuid, p_role public.organization_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.member_role(p_organization_id)
    when 'owner'   then true
    when 'manager' then p_role in ('manager', 'agent')
    when 'agent'   then p_role = 'agent'
    else false
  end;
$$;

grant execute on function public.current_platform_role, public.is_platform_staff, public.member_role, public.is_member, public.is_member_at_least to authenticated;

-- ---------------------------------------------------------------------
alter table public.profiles                 enable row level security;
alter table public.platform_roles           enable row level security;
alter table public.device_tokens            enable row level security;
alter table public.consents                 enable row level security;
alter table public.cities                   enable row level security;
alter table public.audit_log                enable row level security;
alter table public.idempotency_keys         enable row level security;
alter table public.plans                    enable row level security;
alter table public.organizations            enable row level security;
alter table public.organization_members     enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.agencies                 enable row level security;
alter table public.documents                enable row level security;
alter table public.document_access_log      enable row level security;
alter table public.verification_requests    enable row level security;
alter table public.subscriptions            enable row level security;
alter table public.vehicles                 enable row level security;
alter table public.vehicle_photos           enable row level security;
alter table public.rate_plans               enable row level security;
alter table public.availability_blocks      enable row level security;
alter table public.quotes                   enable row level security;
alter table public.bookings                 enable row level security;
alter table public.booking_events           enable row level security;
alter table public.favorites                enable row level security;
alter table public.notifications            enable row level security;

-- profiles : soi-meme ; le staff lit.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_platform_staff());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- platform_roles : lecture de son propre role uniquement ; ecriture par service role (API).
create policy platform_roles_select_self on public.platform_roles for select to authenticated
  using (user_id = auth.uid());

create policy device_tokens_own on public.device_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy consents_own_select on public.consents for select to authenticated
  using (user_id = auth.uid());
create policy consents_own_insert on public.consents for insert to authenticated
  with check (user_id = auth.uid());

create policy cities_public_read on public.cities for select to anon, authenticated using (true);
create policy plans_public_read  on public.plans  for select to anon, authenticated using (is_active);

-- audit_log, idempotency_keys : jamais accessibles hors service role.

-- organizations : publiees (verified) lisibles par tous ; membres et staff lisent tout ; owner modifie.
create policy organizations_public_read on public.organizations for select to anon, authenticated
  using (status = 'verified');
create policy organizations_member_read on public.organizations for select to authenticated
  using (public.is_member(id) or public.is_platform_staff());
create policy organizations_owner_update on public.organizations for update to authenticated
  using (public.is_member_at_least(id, 'owner')) with check (public.is_member_at_least(id, 'owner'));

create policy organization_members_read on public.organization_members for select to authenticated
  using (public.is_member(organization_id) or public.is_platform_staff());
create policy organization_members_owner_write on public.organization_members for all to authenticated
  using (public.is_member_at_least(organization_id, 'owner'))
  with check (public.is_member_at_least(organization_id, 'owner'));

create policy organization_invitations_owner on public.organization_invitations for all to authenticated
  using (public.is_member_at_least(organization_id, 'owner'))
  with check (public.is_member_at_least(organization_id, 'owner'));

-- agencies
create policy agencies_public_read on public.agencies for select to anon, authenticated
  using (status = 'published' and exists (select 1 from public.organizations o where o.id = agencies.organization_id and o.status = 'verified'));
create policy agencies_member_read on public.agencies for select to authenticated
  using (public.is_member(organization_id) or public.is_platform_staff());
create policy agencies_manager_write on public.agencies for all to authenticated
  using (public.is_member_at_least(organization_id, 'manager'))
  with check (public.is_member_at_least(organization_id, 'manager'));

-- documents : owner + staff en lecture ; manager+ en insertion ; jamais de lecture publique.
create policy documents_read on public.documents for select to authenticated
  using (public.is_member_at_least(organization_id, 'owner') or public.is_platform_staff());
create policy documents_insert on public.documents for insert to authenticated
  with check (public.is_member_at_least(organization_id, 'manager') and uploaded_by = auth.uid());
-- document_access_log : service role uniquement.

create policy verification_requests_read on public.verification_requests for select to authenticated
  using (public.is_member_at_least(organization_id, 'owner') or public.is_platform_staff());

create policy subscriptions_owner_read on public.subscriptions for select to authenticated
  using (public.is_member_at_least(organization_id, 'owner') or public.is_platform_staff());

-- vehicles : publies lisibles par tous (organisation verifiee) ; membres lisent tout ; manager+ ecrit.
create policy vehicles_public_read on public.vehicles for select to anon, authenticated
  using (status = 'published' and suspended_at is null
         and exists (select 1 from public.organizations o where o.id = vehicles.organization_id and o.status = 'verified'));
create policy vehicles_member_read on public.vehicles for select to authenticated
  using (public.is_member(organization_id) or public.is_platform_staff());
create policy vehicles_manager_write on public.vehicles for all to authenticated
  using (public.is_member_at_least(organization_id, 'manager'))
  with check (public.is_member_at_least(organization_id, 'manager'));

create policy vehicle_photos_public_read on public.vehicle_photos for select to anon, authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_photos.vehicle_id and v.status = 'published'));
create policy vehicle_photos_member_read on public.vehicle_photos for select to authenticated
  using (public.is_member(organization_id));
create policy vehicle_photos_manager_write on public.vehicle_photos for all to authenticated
  using (public.is_member_at_least(organization_id, 'manager'))
  with check (public.is_member_at_least(organization_id, 'manager'));

create policy rate_plans_public_read on public.rate_plans for select to anon, authenticated
  using (is_active and exists (select 1 from public.vehicles v where v.id = rate_plans.vehicle_id and v.status = 'published'));
create policy rate_plans_member_read on public.rate_plans for select to authenticated
  using (public.is_member(organization_id));
create policy rate_plans_manager_write on public.rate_plans for all to authenticated
  using (public.is_member_at_least(organization_id, 'manager'))
  with check (public.is_member_at_least(organization_id, 'manager'));

create policy availability_blocks_member on public.availability_blocks for all to authenticated
  using (public.is_member_at_least(organization_id, 'agent'))
  with check (public.is_member_at_least(organization_id, 'agent'));

-- quotes : le demandeur lit le sien.
create policy quotes_own_read on public.quotes for select to authenticated
  using (user_id = auth.uid());

-- bookings : client = les siennes ; membres = celles de leur organisation ; staff lit.
create policy bookings_customer_read on public.bookings for select to authenticated
  using (customer_id = auth.uid());
create policy bookings_member_read on public.bookings for select to authenticated
  using (public.is_member(organization_id) or public.is_platform_staff());
-- Toute ecriture sur bookings passe par l'API (service role) : state machine + verrous.

create policy booking_events_read on public.booking_events for select to authenticated
  using (public.is_member(organization_id) or public.is_platform_staff()
         or exists (select 1 from public.bookings b where b.id = booking_events.booking_id and b.customer_id = auth.uid()));

create policy favorites_own on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Storage : photos publiques (vehicle-photos), documents prives (documents)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vehicle-photos', 'vehicle-photos', true,  8388608,  array['image/jpeg', 'image/png', 'image/webp']),
  ('documents',      'documents',      false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy storage_vehicle_photos_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'vehicle-photos');
-- Chemin : vehicle-photos/<organization_id>/<vehicle_id>/<uuid>.<ext>
create policy storage_vehicle_photos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicle-photos' and public.is_member_at_least(((storage.foldername(name))[1])::uuid, 'manager'));
create policy storage_vehicle_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'vehicle-photos' and public.is_member_at_least(((storage.foldername(name))[1])::uuid, 'manager'));
-- documents : aucun acces direct ; l'API signe les URLs avec le service role et journalise.
