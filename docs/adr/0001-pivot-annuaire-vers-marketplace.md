# ADR-0001 — Pivot de l'annuaire RentMap vers une marketplace transactionnelle

Statut : accepté · Date : 2026-09-05

## Contexte

Le dépôt contient RentMap v0.1 : annuaire web de loueurs, abonnement pro, demandes de contact, aucune réservation ni commission (choix motivé par le statut d'hébergeur). Le brief produit décrit une application mobile de mise en relation avec disponibilités, réservation, paiement, documents et litiges.

## Options

1. Garder l'annuaire et lui ajouter une app mobile « vitrine ».
2. Pivoter vers une marketplace transactionnelle en réutilisant les fondations (Postgres/PostGIS, RLS, SEO web).
3. Repartir de zéro.

## Décision

Option 2. Les fondations techniques sont saines ; le modèle de données et le modèle économique changent. Les pages SEO web restent l'entonnoir d'acquisition.

## Conséquences

- Changement de statut juridique probable dès l'introduction du paiement (validation juridique requise avant Phase 5).
- Réécriture du schéma (organisations, réservations, devis, documents, montants en centimes).
- Le code Stripe Billing (abonnements) est conservé derrière un feature flag, hors chemin critique, jusqu'à la décision de monétisation.
