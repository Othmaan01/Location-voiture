# Architecture

Résumé opérationnel. Le raisonnement complet et les alternatives écartées sont dans [docs/phase-0/02-architecture-et-stack.md](docs/phase-0/02-architecture-et-stack.md).

## Principes

1. **L'API est l'autorité.** Mobile et web n'écrivent jamais directement en base ; toute règle métier, tout calcul de prix, toute transition de réservation vit dans `apps/api`.
2. **RLS en seconde ligne.** Les policies Postgres restent actives : un défaut d'autorisation dans l'API ne suffit pas à exposer une organisation.
3. **Monolithe modulaire.** `apps/api/src/modules/<domaine>` : `routes` (HTTP + schémas), `service` (règles, autorisation), accès base. Un module n'importe pas les tables d'un autre.
4. **Contrats partagés.** `packages/contracts` = schémas Zod uniques pour le serveur, le mobile et le web, et source de l'OpenAPI.
5. **La base protège les invariants** : contrainte d'exclusion anti-double réservation, montants non négatifs, immutabilité des devis, audit en ajout seul.

## Flux d'une requête authentifiée

`Authorization: Bearer <jwt Supabase>` → `shared/plugins.authPlugin` vérifie la signature (JWKS, ou secret HS256 en local) → `shared/actor.loadActor` charge rôle plateforme et appartenances **à chaque requête** → la route appelle `assertCan` / `assertCanOrHide` (`shared/authz`) avant toute lecture → réponse validée par le schéma Zod.

## Stack

Expo SDK 57 · Next.js 16 · Fastify 5 · Drizzle · Zod 4 · Postgres 17 + PostGIS (Supabase) · Supabase Auth & Storage · pg-boss (jobs, Phase 4) · Stripe Billing (abonnement, Phase 5) · Sentry · PostHog EU · MapLibre + OpenFreeMap · Fly.io (cdg) · Netlify · EAS.

## Environnements

local (`supabase start`) · staging (branche `develop`, projet Supabase dédié, Fly `lv-api-staging`) · production (tag, approbation manuelle). Aucun partage de clés ni de données.
