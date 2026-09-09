-- Remise du vehicule (retour fondateur, 2026-09-09) : le loueur confirme l'etat des lieux et le
-- contrat signe hors application ; on garde la trace horodatee de la remise.
alter table public.bookings
  add column handed_over_at timestamptz,
  add column contract_signed_at timestamptz;
