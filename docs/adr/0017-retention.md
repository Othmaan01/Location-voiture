# ADR-0017 — Rétention des données : purger l'inutile, garder l'historique

Statut : accepté · Date : 2026-09-09

## Contexte

Le fondateur craint que la base « se surcharge pour rien » et propose de supprimer les réservations passées après 30 jours.

## Décisions

1. **Les réservations ne sont jamais supprimées automatiquement.** Une réservation est un contrat : les avis, les litiges, les signalements et la facturation s'y rattachent, et la loi impose de conserver les pièces commerciales plusieurs années. Une ligne de réservation pèse environ 1 Ko : cent mille réservations font 100 Mo, ce qui n'est rien. Ce qui pèse, ce sont les fichiers (photos, vidéos), stockés hors base.
2. **L'application n'affiche que 30 jours par défaut** dans « Passées », côté loueur comme côté client, avec un bouton « Voir plus ancien ». L'historique reste accessible, il n'encombre plus l'écran.
3. **Une tâche quotidienne purge ce qui n'a plus de valeur** (`public.purge_expired()`, pg_cron à 3 h 15) : clés d'idempotence après 48 h, devis expirés sans réservation après 7 jours, lignes de stories 7 jours après expiration, journal d'audit après 24 mois.
4. **RGPD, à venir avant le lancement** : anonymisation des données personnelles des clients sur les réservations de plus de 3 ans (nom, téléphone, e-mail), la réservation elle-même restant comptabilisée.

## Conséquences

- Migration `20260909000000_v1_retention.sql`.
- TECH DEBT : purge des fichiers de stories expirées dans le bucket `story-media` (tâche API hebdomadaire), anonymisation à 3 ans, export comptable des réservations.
