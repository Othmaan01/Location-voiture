-- Retention (ADR-0017) : on purge ce qui ne sert plus, jamais l'historique des reservations
-- (obligation de conservation des contrats, avis, litiges). Tache quotidienne pg_cron a 3h15.
create extension if not exists pg_cron;

create or replace function public.purge_expired()
returns table (idempotency_keys bigint, quotes bigint, stories bigint, audit_log bigint)
language plpgsql security definer set search_path = '' as $$
declare k bigint; q bigint; s bigint; a bigint;
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
  return query select k, q, s, a;
end $$;

revoke all on function public.purge_expired() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'purge-expired') then
    perform cron.schedule('purge-expired', '15 3 * * *', 'select public.purge_expired()');
  end if;
end $$;
