-- Choix du forfait (ADR-0022) : etape obligatoire avant d'entrer dans l'espace loueur.
-- Null tant que le loueur n'a pas choisi ; l'app renvoie a l'ecran des forfaits.
alter table public.organizations add column plan_chosen_at timestamptz;
-- Les organisations existantes gardent l'acces : on considere le forfait de depart choisi.
update public.organizations set plan_chosen_at = created_at where plan_chosen_at is null;
