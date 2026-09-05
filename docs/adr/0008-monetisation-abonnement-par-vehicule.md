# ADR-0008 — Monétisation : abonnement mensuel du loueur, indexé sur le nombre de véhicules ; aucune commission client

Statut : accepté · Date : 2026-09-05 · Remplace la recommandation D2 du dossier Phase 0

## Contexte

Décision du fondateur : la plateforme ne se rémunère pas sur les clients. Le loueur paie un abonnement mensuel dont le montant dépend du nombre de véhicules publiés. C'est le modèle déjà implémenté dans RentMap v0.1 (Stripe Billing, quotas appliqués par trigger en base).

## Options de tarification

1. **Paliers** (existant : Découverte 1 véhicule / Starter 5 / Pro illimité).
2. **Par véhicule** : prix unitaire × nombre de véhicules publiés, facturé via une quantité Stripe mise à jour à chaque publication/dépublication (prorata automatique).
3. Hybride : paliers avec véhicules supplémentaires à l'unité.

## Décision

- Le **modèle abonnement** est retenu ; le code Stripe Billing et le pattern de quota côté serveur sont conservés et adaptés (quota lié à l'organisation, non plus à une agence).
- La **grille exacte** (paliers vs unitaire, prix, période d'essai) est une décision produit ouverte, à trancher avant la Phase 2. Recommandation technique : option 2 ou 3, car un loueur de 100 véhicules ne rentre dans aucun palier fixe, et Stripe gère nativement les quantités.
- **Aucune barrière à l'inscription** : un loueur peut créer son organisation, ses véhicules en brouillon et passer la vérification sans payer. Le paiement conditionne la **publication** au-delà du quota gratuit ou de l'essai. Le quota est appliqué côté serveur (trigger + vérification API), jamais uniquement dans l'interface.
- **Pas de paiement de location dans la plateforme** : le contrat de location se conclut entre le client et le loueur. La réservation reste une mise en relation qualifiée (dates, véhicule, prix affiché, acceptation ferme du loueur).

## Conséquences

- La Phase 5 « Paiement » du brief est redéfinie : elle couvre l'**abonnement loueur** (Stripe Billing, quantités, essai, factures, portail), pas Stripe Connect. Le paiement en ligne des locations (avec caution, commission) devient une option future, activable si les loueurs le réclament, et nécessiterait une validation juridique (ADR-0006 conservé à titre de plan de secours).
- Le statut juridique reste proche de l'hébergeur/annuaire qualifié, ce qui simplifie le lancement. À faire confirmer par un conseil.
- Le modèle de données garde `total_cents` et `price_snapshot` sur les réservations (prix affiché au moment de la demande, utile pour les litiges et les statistiques), mais `payment_status`, `stripe_account_id` et `commission_bps` sortent du schéma v1.
- La colonne `plan`/quota migre de `agencies` vers `organizations` ; la table `subscriptions` est rattachée à l'organisation.
