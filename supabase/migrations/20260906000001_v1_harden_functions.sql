-- =====================================================================
--  Durcissement : aucune fonction interne n'est exposee via PostgREST.
--  Les fonctions de trigger ne doivent jamais etre appelables par un
--  client ; les helpers RLS ne servent qu'aux policies (role authenticated).
--  Source : Supabase security advisor (0028 / 0029).
-- =====================================================================

-- Fonctions de trigger : aucun appel client, quel que soit le role.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.vehicles_enforce_quota() from public, anon, authenticated;
revoke execute on function public.organizations_demote_over_quota() from public, anon, authenticated;
revoke execute on function public.sync_organization_plan() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.forbid_mutation() from public, anon, authenticated;
revoke execute on function public.organizations_track_status() from public, anon, authenticated;
revoke execute on function public.organization_members_keep_owner() from public, anon, authenticated;
revoke execute on function public.vehicles_check_agency_org() from public, anon, authenticated;
revoke execute on function public.bookings_track_status() from public, anon, authenticated;

-- Helpers RLS : necessaires aux policies du role authenticated, inutiles a anon.
revoke execute on function public.current_platform_role() from public, anon;
revoke execute on function public.is_platform_staff() from public, anon;
revoke execute on function public.member_role(uuid) from public, anon;
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.is_member_at_least(uuid, public.organization_role) from public, anon;

-- Utilitaires : lecture seule, sans donnee sensible, mais inutiles cote client.
revoke execute on function public.uuid_generate_v7() from public, anon, authenticated;
revoke execute on function public.generate_booking_reference() from public, anon, authenticated;
revoke execute on function public.vehicle_is_available(uuid, tstzrange) from public, anon;

-- Par defaut, les futures fonctions ne seront pas exposees : on retire l'EXECUTE implicite.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
