# ADR-0022 — Choix du forfait avant d'entrer dans l'espace loueur

Statut : accepté · Date : 2026-09-09

## Contexte

Le loueur arrivait dans l'application directement sur le forfait de départ. Le fondateur veut une pré-étape simple : les forfaits, ce qu'ils comprennent, un choix validé avec le paiement, puis l'accès. Et quand la limite du forfait est atteinte, l'écran des forfaits doit s'ouvrir avec un passage au forfait supérieur en un geste.

## Décisions

1. **`organizations.plan_chosen_at`** : null tant que le loueur n'a pas choisi. L'app impose l'écran des forfaits (sans retour) dès qu'une organisation sans choix est active, sauf pendant sa création. Les organisations existantes sont considérées comme ayant choisi.
2. **`POST /v1/organizations/:id/subscription/plan`** : avec Stripe configuré, renvoie l'URL de paiement et le choix est marqué quand Stripe confirme l'abonnement (webhook) ; sans Stripe, le choix est enregistré immédiatement avec l'essai de 14 jours. Les offres sur devis sont refusées ici.
3. **Un seul écran des forfaits** (`plans.tsx`) : liste des forfaits avec prix et nombre de véhicules, ce qui est compris dans tous, un bouton de validation. Deux modes : `required=1` à l'entrée, `reason=limit` quand le quota est atteint, avec le forfait suivant recommandé et présélectionné.
4. **Limite atteinte** : le bloqueur `quota_reached` sur la fiche véhicule ouvre cet écran ; le moteur reste seul juge du quota.

## Conséquences

- Migration `20260909000004_v1_plan_choice.sql`.
- TECH DEBT : rétrogradation de forfait avec contrôle du nombre de véhicules publiés, facturation au prorata gérée par Stripe.
