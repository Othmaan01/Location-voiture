-- Noms des forfaits (retour, 2026-09-10) : Standard, Premium, Ultra ; Flotte sur devis, Decouverte inchangee.
update public.plans set name = 'Standard' where code = 'starter';
update public.plans set name = 'Premium'  where code = 'pro';
update public.plans set name = 'Ultra'    where code = 'business';
