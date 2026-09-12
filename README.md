# KARSON — plateforme de réservation entre loueurs professionnels et clients

Les clients trouvent et réservent un véhicule près de chez eux, à des dates précises, auprès de loueurs professionnels vérifiés. Les loueurs paient un abonnement mensuel indexé sur le nombre de véhicules publiés ; aucune commission n'est prélevée sur les clients ([ADR-0008](docs/adr/0008-monetisation-abonnement-par-vehicule.md)).

Ce dépôt succède à RentMap v0.1 (annuaire web), archivé dans [docs/legacy](docs/legacy/README.md). Le cadrage complet est dans [docs/phase-0](docs/phase-0/00-README.md).

## Structure

```
apps/
  mobile/     Expo (iOS / Android) — client et professionnel
  web/        Next.js — pages SEO, back-office pro, admin (ex-RentMap)
  api/        Fastify — l'autorité : autorisation, réservation, prix, documents
packages/
  contracts/  schémas Zod partagés (requêtes, réponses, permissions, enums)
  pricing/    moteur de prix pur (centimes), testé
  tokens/     design tokens (couleurs, typo, espacements)
  config/     tsconfig, eslint partagés
supabase/     migrations SQL (source de vérité du schéma), seed, config locale
docs/         phase-0 (cadrage), adr (décisions), legacy
```

## Démarrage

Prérequis : Node 22 (`.nvmrc`), pnpm via corepack, Docker Desktop et la CLI Supabase pour la base locale.

```bash
corepack enable            # une fois (peut demander sudo) ; sinon utilisez `corepack pnpm`
pnpm install
cp .env.example .env.local # puis renseignez les clés affichées par `supabase start`
pnpm db:start              # Postgres + Auth + Storage en local, migrations appliquées
pnpm --filter @lv/api dev  # API sur http://localhost:4000 (OpenAPI : /openapi.json)
pnpm --filter @lv/mobile dev
pnpm --filter @lv/web dev
```

Sans Docker, tout compile et les tests unitaires passent ; seuls les tests d'intégration (base réelle) sont sautés.

## Commandes

| Commande                     | Effet                                                 |
| ---------------------------- | ----------------------------------------------------- |
| `pnpm check`                 | lint + typecheck + tests, tous packages               |
| `pnpm --filter @lv/api test` | tests API (intégration si `TEST_DATABASE_URL`)        |
| `pnpm db:reset`              | réapplique migrations + seed                          |
| `pnpm db:types`              | régénère les types Supabase dans `packages/contracts` |

## Déploiement

- **API staging** : Fly.io, app `location-voiture-api-staging`, région Paris, `https://location-voiture-api-staging.fly.dev`. Depuis le Mac : `~/.fly/bin/flyctl deploy --config apps/api/fly.toml --dockerfile apps/api/Dockerfile --remote-only .` ; secrets via `scripts/fly-set-secrets.sh location-voiture-api-staging` (lit `.env.local`).
- **Base et Auth** : projet Supabase `kgvblvfsypcyocpacydb` (eu-west-1), migrations appliquées via le connecteur Supabase, e-mails via Resend.
- **Web staging** : Fly.io, app `location-voiture-web-staging`, `https://location-voiture-web-staging.fly.dev`. Depuis le Mac : `~/.fly/bin/flyctl deploy --config apps/web/fly.toml --dockerfile apps/web/Dockerfile --remote-only .` (variables publiques dans `apps/web/fly.toml`).
- **Web** : `apps/web` est un site public (SEO) qui ne parle qu'à l'API : `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME` (voir `apps/web/.env.example`), déployable sur Netlify (`netlify.toml`). Aucun secret côté site.
- **Mobile** : `apps/mobile/.env.local` pointe `EXPO_PUBLIC_API_URL` vers l'API staging ; `npx expo start --go` puis Expo Go (même compte Expo sur le Mac et le téléphone). Hors Wi-Fi commun : `npx expo start --go --tunnel` (passe par internet, dépendance `@expo/ngrok`).

## Documentation

[ARCHITECTURE.md](ARCHITECTURE.md) · [SECURITY.md](SECURITY.md) · [DATABASE.md](DATABASE.md) · [API.md](API.md) · [DECISIONS.md](DECISIONS.md) · [ROADMAP.md](ROADMAP.md)
