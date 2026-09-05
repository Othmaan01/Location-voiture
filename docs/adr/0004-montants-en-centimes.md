# ADR-0004 — Montants monétaires en entiers (centimes) + devise

Statut : accepté · Date : 2026-09-05

## Contexte

Le schéma RentMap stocke les prix en `numeric(10,2)` et le code applicatif les manipule en `number` flottant. Le brief exige des entiers dans la plus petite unité monétaire.

## Décision

Toute colonne monétaire est `integer` (ou `bigint` pour les agrégats) nommée `*_cents`, accompagnée d'une colonne `currency char(3)` sur l'entité porteuse. Contraintes `check (x_cents >= 0)`. En TypeScript, un type `Money = { cents: number; currency: string }` et des helpers dans `packages/pricing/money` ; aucune opération arithmétique monétaire hors de ce package ; arrondis explicites et testés. Les API renvoient les centimes ; le formatage est fait par les clients avec `Intl.NumberFormat`.

## Conséquences

- Aucune erreur de flottant sur les totaux, commissions et reversements.
- Multi-devise possible plus tard sans migration de type (la devise est déjà portée).
- Réécriture des colonnes existantes (pas de migration de données : hypothèse « pas de production »).
