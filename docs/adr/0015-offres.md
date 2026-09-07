# ADR-0015 — Offres des loueurs (remises temporaires)

Statut : accepté · Date : 2026-09-07

## Contexte

Le fondateur veut donner aux loueurs un levier pour attirer des clients et au feed une raison d'être consulté : une catégorie « Offres ».

## Décisions

1. **Une offre = une remise temporaire** créée par un manager ou un propriétaire : sur un véhicule publié ou sur toute la flotte ; en pourcentage (5 à 70 %) ou montant fixe par location ; durée de 1 à 90 jours à partir de la création. Une seule offre en cours par cible : en créer une nouvelle archive la précédente (historique conservé).
2. **Le moteur applique la remise, jamais l'app.** Le devis (`packages/pricing`) ajoute une ligne `discount` positive soustraite du sous-total, jamais de la caution, plafonnée pour laisser 1 € minimum. L'offre retenue est celle en cours au moment de la demande (offre ciblée sur le véhicule prioritaire sur l'offre « toute la flotte », puis remise la plus forte). Le devis mémorise `offer_id`.
3. **Exposition publique** : les cartes véhicule portent `offer` et `discountedDailyCents` (prix barré à titre indicatif), le loueur porte sa meilleure offre en cours, le feed a un onglet `offers` ne listant que les loueurs avec une offre active. RLS : lecture publique des offres actives uniquement.

## Conséquences

- Migration `20260907000004_v1_offers.sql`, routes `GET/POST /v1/organizations/:id/offers`, `DELETE /v1/offers/:id`.
- TECH DEBT : codes promo, offres par créneau (week-end seulement), notification push aux favoris quand un loueur lance une offre.
