# ADR-0021 — Remise du véhicule confirmée, fiche véhicule et calendrier partagé

Statut : accepté · Date : 2026-09-09

## Contexte

L'application ne gère ni le paiement ni le contrat, qui se font en agence. Le fondateur veut que le loueur confirme dans l'application que les étapes nécessaires ont eu lieu avant que le véhicule soit considéré comme remis, que le client consulte une fiche véhicule avec ses disponibilités avant de réserver, et que tous les calendriers partagent la même logique.

## Décisions

1. **Remise du véhicule = deux confirmations.** `POST /v1/bookings/:id/start` exige `{ inspectionDone: true, contractSigned: true }` ; le moteur enregistre `handed_over_at` et `contract_signed_at`, passe la réservation en location et notifie le client. Dans l'application, la case « État des lieux effectué » est verrouillée cochée quand un état des lieux de départ existe, sinon le loueur la coche lui-même (papier) ; la case « Contrat signé » est toujours manuelle.
2. **Fiche véhicule publique** (`GET /v1/catalog/vehicles/:id`) : toutes les photos, caractéristiques, tarif, agence, loueur, disponibilité sur les dates choisies. Sous `/v1/catalog` pour ne pas entrer en collision avec les routes loueur `/v1/vehicles/:id`.
3. **Une seule source de disponibilité** : `GET /v1/catalog/vehicles/:id/availability?from&to` renvoie les intervalles occupés (réservations confirmées ou en cours, blocages) sans détail. La fiche, le sélecteur de dates et l'espace loueur lisent la même base ; un blocage posé par le loueur apparaît immédiatement au client.
4. **Un composant calendrier partagé** (`MonthCalendar`) avec cinq états visuels sobres : indisponible (barré), demande en attente (point ambre), confirmée (point rouge), en location (point vert), bloqué (point gris) ; la sélection est un début et une fin. Le sélecteur de dates propose des créneaux de 30 minutes et le jour même.
5. **Espace loueur** : vue semaine (une ligne par véhicule, barres) et vue mois (calendrier partagé pour un véhicule), même légende.

## Conséquences

- Migration `20260909000003_v1_handover.sql`. Routes catalog et corps de `start` documentés dans API.md.
- TECH DEBT : heures de retrait par agence (horaires d'ouverture) dans les créneaux, disponibilité au-delà de trois mois à la demande.
