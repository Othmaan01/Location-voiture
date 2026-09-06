-- =====================================================================
--  Reordonnancement des photos : l'unicite (vehicle_id, position) est
--  verifiee en fin de transaction, ce qui permet de permuter des positions
--  en une seule passe sans valeur temporaire hors bornes.
-- =====================================================================

alter table public.vehicle_photos drop constraint if exists vehicle_photos_vehicle_id_position_key;
alter table public.vehicle_photos
  add constraint vehicle_photos_vehicle_id_position_key unique (vehicle_id, position) deferrable initially deferred;
