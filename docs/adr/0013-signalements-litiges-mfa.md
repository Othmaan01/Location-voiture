# ADR-0013 — Signalements, litiges et double authentification

Statut : accepté · Date : 2026-09-06

## Contexte

Phase 7 de la feuille de route : donner à l'administration les outils pour agir (signalements, litiges) et rendre l'administration compatible avec l'exigence MFA du moteur en production (ADR-0007, `API_ADMIN_REQUIRE_MFA`).

## Décisions

1. **Signalements.** Tout utilisateur connecté peut signaler un loueur, un véhicule, un avis ou une conversation (motif fermé : arnaque, inapproprié, spam, sécurité, autre ; précisions libres). Le signalement est rattaché au loueur concerné, jamais transmis à celui-ci, et traité par l'administration (traité ou classé, note interne). On ne signale pas sa propre organisation.
2. **Litiges.** Pendant une location en cours, client ou loueur ouvre un litige avec un motif obligatoire (`active → disputed`) ; l'autre partie est notifiée. Seule la plateforme clôt (`disputed → resolved`) avec une décision motivée envoyée aux deux parties. Liste des litiges ouverts pour l'administration.
3. **Double authentification (TOTP).** Enrôlement dans l'app via Supabase Auth (aucun secret ne transite par notre moteur) ; à la connexion, si un facteur est actif, un code est demandé avant d'entrer (session `aal2`). Obligatoire pour les rôles plateforme en production, recommandée pour tous. Le staging garde `API_ADMIN_REQUIRE_MFA=false` jusqu'à validation sur téléphone (TECH DEBT à lever avant l'ouverture).
4. **Navigation admin.** Vérifications, Loueurs, Signalements (signalements + litiges), Profil.

## Conséquences

- Migration `20260907000003_v1_reports.sql`, routes `POST /v1/reports`, `GET /v1/admin/reports`, `POST /v1/admin/reports/:id/resolution`, `GET /v1/admin/disputes`, `POST /v1/bookings/:id/dispute`, `POST /v1/bookings/:id/resolve`.
- TECH DEBT : App Attest / Play Integrity, pentest externe (fin de Phase 7), blocage automatique après N signalements.
