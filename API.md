# API

Base : `apps/api` (Fastify). Contrat généré : `GET /openapi.json` (source : schémas Zod de `packages/contracts`).

## Conventions

- Préfixe `/v1`. Réponses JSON validées par schéma ; erreurs au format `{ error: { code, message, requestId, details? } }` avec codes stables (`packages/contracts/src/errors.ts`).
- Authentification : `Authorization: Bearer <jwt Supabase>`. Token absent = anonyme ; token invalide = `401` (jamais ignoré).
- Rate limiting global (300/min par utilisateur ou IP) et par route sensible.
- Créations : en-tête `Idempotency-Key` (Phase 4).
- Ressource d'une autre organisation : `404`.

## Routes (Phase 0)

| Méthode | Route                           | Auth           | Description                                      |
| ------- | ------------------------------- | -------------- | ------------------------------------------------ |
| GET     | `/health`                       | non            | état du service                                  |
| GET     | `/v1/me`                        | oui            | identité, rôle plateforme, appartenances         |
| PATCH   | `/v1/me`                        | oui            | prénom, nom, téléphone                           |
| POST    | `/v1/organizations`             | oui            | crée une organisation, le créateur devient owner |
| GET     | `/v1/organizations/:id`         | membre / staff | fiche organisation                               |
| GET     | `/v1/organizations/:id/members` | membre / staff | membres                                          |
