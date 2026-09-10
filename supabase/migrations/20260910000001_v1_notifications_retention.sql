-- Centre de notifications (retour, 2026-09-10) : les notifications sont gardees 90 jours,
-- purgees par la meme tache quotidienne (ADR-0017). Le type de retour change : on recree la fonction.
drop function if exists public.purge_expired();

create function public.purge_expired()
returns table (idempotency_keys bigint, quotes bigint, stories bigint, audit_log bigint, notifications bigint)
language plpgsql security definer set search_path = '' as $$
declare k bigint; q bigint; s bigint; a bigint; n bigint;
begin
  -- Cles d'idempotence : utiles 24 h, gardees 48 h.
  delete from public.idempotency_keys where created_at < now() - interval '48 hours';
  get diagnostics k = row_count;
  -- Devis expires sans reservation : 7 jours de marge pour le support.
  delete from public.quotes qt
    where qt.expires_at < now() - interval '7 days'
      and not exists (select 1 from public.bookings b where b.quote_id = qt.id);
  get diagnostics q = row_count;
  -- Stories : 48 h de vie, la ligne est gardee 7 jours de plus (le fichier est purge par l'API).
  delete from public.stories where expires_at < now() - interval '7 days';
  get diagnostics s = row_count;
  -- Journal d'audit : 24 mois.
  delete from public.audit_log where created_at < now() - interval '24 months';
  get diagnostics a = row_count;
  -- Notifications : 90 jours.
  delete from public.notifications where created_at < now() - interval '90 days';
  get diagnostics n = row_count;
  return query select k, q, s, a, n;
end $$;

revoke all on function public.purge_expired() from public, anon, authenticated;
