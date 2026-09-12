-- Un fil rattache a une reservation disparait avec elle (sinon il retomberait sur le fil general et le doublonnerait).
-- (Migration appliquee le 2026-09-06 via l'outil Supabase ; fichier retabli dans le depot lors du grand tour du 2026-09-12.)
alter table public.conversations drop constraint conversations_booking_id_fkey;
alter table public.conversations add constraint conversations_booking_id_fkey
  foreign key (booking_id) references public.bookings (id) on delete cascade;
