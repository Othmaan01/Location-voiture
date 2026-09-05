# C. Architecture recommandée — D. Stack recommandée

## C. Architecture

### Vue d'ensemble

```
                     ┌────────────────────┐        ┌────────────────────┐
                     │  apps/mobile       │        │  apps/web          │
                     │  Expo (iOS/Android)│        │  Next.js           │
                     │  client + pro      │        │  SEO public        │
                     └─────────┬──────────┘        │  back-office pro   │
                               │                   │  admin interne     │
            auth (SDK Supabase)│  HTTPS / JSON     └─────────┬──────────┘
            upload signé       │  OpenAPI v1                 │
                               ▼                             ▼
                     ┌──────────────────────────────────────────────┐
                     │  apps/api  — Fastify, TypeScript              │
                     │  modules : identity · organizations · catalog │
                     │  availability · pricing · bookings · documents│
                     │  notifications · (payments) · admin           │
                     │  authz central · rate limiting · audit        │
                     │  jobs (pg-boss) · webhooks Stripe             │
                     └───────┬──────────────┬──────────────┬─────────┘
                             │              │              │
                   ┌─────────▼───┐  ┌───────▼──────┐  ┌────▼─────────┐
                   │ Postgres    │  │ Supabase     │  │ Supabase     │
                   │ + PostGIS   │  │ Auth (JWT,   │  │ Storage      │
                   │ (Supabase)  │  │ JWKS, MFA)   │  │ privé/public │
                   │ RLS = 2e    │  └──────────────┘  └──────────────┘
                   │ ligne       │
                   └─────────────┘
         Observabilité : Sentry (mobile, web, api) · logs structurés pino · métriques API
         Externes : Stripe Connect (Phase 5) · Expo Push / APNs / FCM · Resend (e-mail)
```

### Principes

1. **Une seule autorité : l'API.** Toute écriture métier (réservation, prix, publication, documents, membres) passe par `apps/api`. Le mobile et le web sont des interfaces. Elles ne parlent jamais directement à la base pour écrire.
2. **RLS en deuxième ligne, pas en première.** Les policies Row Level Security restent actives sur toutes les tables (héritage RentMap) : si un jour un client accède à PostgREST ou si une route de l'API a un bug d'autorisation, la base refuse quand même. Mais la logique d'autorisation de référence vit dans un module `authz` unique, testé, dans l'API.
3. **Monolithe modulaire.** Un seul service, des modules par domaine métier avec des frontières explicites (chaque module expose des fonctions, pas ses tables). Extraction en service séparé seulement si une contrainte réelle l'exige.
4. **Contrat partagé.** Les schémas Zod des requêtes/réponses vivent dans `packages/contracts` et servent à la fois à la validation serveur, aux types du client mobile, aux types du web et à la génération OpenAPI. Une seule source de vérité pour la forme des données.
5. **La base protège les invariants critiques.** Anti-double réservation par contrainte d'exclusion, montants non négatifs par `check`, intégrité par clés étrangères. Même si l'API a un bug, la base ne laisse pas passer une incohérence.
6. **Tout est reproductible.** Migrations SQL versionnées, environnements décrits par fichier, secrets hors dépôt, `docker compose` pour le local.

### Pourquoi une API dédiée et pas « Supabase seul » ou « Next.js seul »

| Option | Pour | Contre | Verdict |
|---|---|---|---|
| **Supabase seul** (PostgREST + RLS + Edge Functions) | Zéro serveur, très rapide pour du CRUD | La réservation (transaction, verrou, devis figé, idempotence), les webhooks Stripe, les jobs planifiés, le rate limiting fin et l'audit finissent en PL/pgSQL ou en fonctions Deno dispersées ; difficile à tester, à observer, à faire évoluer | Non pour une marketplace transactionnelle |
| **Next.js seul** (Route Handlers sur Netlify) | Un seul déploiement, code déjà là | Fonctions serverless : temps d'exécution limité, pas de jobs longs, cold starts, couplage du déploiement web et API, tests d'intégration pénibles | Acceptable pour un annuaire, pas pour le cœur transactionnel |
| **API dédiée Node/TypeScript** + Supabase pour Postgres/Auth/Storage | Une autorité, un contrat, testable en isolation, jobs et webhooks naturels, déploiement indépendant, même langage partout | Un service de plus à opérer (Docker, monitoring) | **Retenu.** Le coût d'exploitation est faible avec un hébergeur type Fly.io/Railway |

### Découpage en modules (apps/api/src/modules)

| Module | Responsabilité | Dépend de |
|---|---|---|
| `identity` | Vérification JWT, profil, suppression de compte, appareils (push tokens) | — |
| `organizations` | Organisations, membres, invitations, agences, vérification | identity |
| `catalog` | Véhicules, photos, publication, recherche géographique | organizations |
| `availability` | Blocages, calcul de disponibilité sur une période | catalog |
| `pricing` | Grilles tarifaires, calcul d'un devis (délègue à `packages/pricing`) | catalog |
| `bookings` | Demandes, state machine, transitions, idempotence, devis figés | availability, pricing |
| `documents` | Upload signé, validation, URLs temporaires, workflow de revue | organizations |
| `notifications` | Push, e-mail, préférences, gabarits | identity |
| `payments` (Phase 5) | Stripe Connect, intents, cautions, reversements, webhooks | bookings |
| `admin` | Opérations internes, audit | tous, en lecture |
| `shared/authz` | Matrice de permissions, `can(user, action, resource)` | — |

Règle : un module n'importe jamais les tables d'un autre module ; il appelle son API interne. Cela garde la porte ouverte à une extraction future sans la payer aujourd'hui.

### Flux critique : demande de réservation

```
Mobile                          API                                      Postgres
──────                          ───                                      ────────
POST /quotes {vehicle, dates} → availability.check + pricing.quote     → lecture blocages + bookings
                              ← quote {id, lines, total_cents, expires}   insert quotes (snapshot)

POST /bookings {quote_id,     → bookings.create
  Idempotency-Key}              vérifie quote non expiré, même user
                                BEGIN
                                  SELECT vehicle FOR UPDATE            → verrou par véhicule
                                  re-check disponibilité               → blocages + bookings confirmés
                                  INSERT booking (status=requested)    → contrainte d'exclusion (filet)
                                  INSERT booking_event
                                COMMIT
                                enqueue notify(pro)                     → pg-boss
                              ← 201 booking
```

Toute requête de création porte une `Idempotency-Key` : un retry réseau renvoie la même réservation, jamais une seconde.

## D. Stack recommandée

Toutes les versions ci-dessous sont celles constatées début septembre 2026 ; elles seront figées (`pnpm-lock.yaml`) au démarrage de la Phase 0 technique.

### Mobile — Expo (React Native)

| Choix | Pourquoi | Alternatives écartées |
|---|---|---|
| **Expo SDK 56** (React Native 0.85, React 19.2, Nouvelle Architecture obligatoire) | Une base TypeScript commune avec l'API et le web ; EAS Build/Submit/Update industrialisent la livraison ; l'écosystème (expo-router, expo-image, expo-secure-store, expo-notifications) couvre le MVP sans module natif maison | **Flutter** : excellent, mais Dart isole le mobile du reste du monorepo TypeScript (contrats, validateurs, moteur de prix partagés). **RN sans Expo** : plus de configuration native pour zéro gain au MVP. **Deux apps natives** : hors budget |
| **expo-router** | Navigation par fichiers, deep links et universal links natifs, typage des routes | React Navigation nu : plus de câblage manuel |
| **TanStack Query** | Cache serveur, retry, invalidation, états loading/error de série | SWR (moins complet), Redux (inutile pour de l'état serveur) |
| **Zustand** (état local minime) | Léger, sans boilerplate ; réservé à l'état UI transverse (dates de recherche, session) | Redux Toolkit : surdimensionné |
| **react-hook-form + Zod** | Mêmes schémas que le serveur (`packages/contracts`) | Formik |
| **expo-secure-store** (+ adaptateur pour dépasser 2 Ko) | Keychain iOS / Keystore Android pour la session ; jamais AsyncStorage pour un token | — |
| **expo-image** | Cache disque, placeholders, transitions ; indispensable pour les galeries | Image RN de base |
| **MapLibre React Native** (`@maplibre/maplibre-react-native`) | Cohérent avec le web, tuiles OpenFreeMap sans clé | react-native-maps (Google/Apple Maps : clés, quotas, deux rendus différents) |
| **Sentry** (`@sentry/react-native`) | Crash reporting + performance, même outil que l'API et le web | Crashlytics (Firebase only) |
| **Maestro** (E2E) | Tests de flux sur simulateur et device, lisibles, stables | Detox : plus lourd à maintenir |

Une seule application Expo héberge le mode client et le mode pro (segments de routes `(client)` et `(pro)`), avec bascule selon l'appartenance à une organisation. Deux binaires seraient plus « propres » mais doubleraient le coût de publication et de maintenance pour un gain nul au MVP. Point de vigilance : garder les deux zones strictement séparées dans le code (`features/client/*`, `features/pro/*`) pour pouvoir scinder plus tard.

### Backend — API

| Choix | Pourquoi | Alternatives écartées |
|---|---|---|
| **Node.js 22 LTS + TypeScript strict** | Même langage que le mobile et le web ; partage des contrats | Go/Rust : performants, mais coupent le partage de code et le vivier de contributeurs |
| **Fastify 5** | Rapide, schémas JSON natifs, écosystème de plugins sobre, génération OpenAPI via `fastify-type-provider-zod` | **NestJS** : structure imposée utile en grande équipe, mais lourde (décorateurs, DI) pour deux personnes ; **Hono** : excellent mais écosystème serveur long-running moins mûr (jobs, plugins) |
| **Drizzle ORM** | SQL typé, migrations lisibles en SQL, pas de runtime magique, PostGIS via SQL brut sans friction | **Prisma** : bon DX mais moteur de requêtes opaque et PostGIS pénible ; **Kysely** : très bien, Drizzle apporte en plus le schéma typé |
| **Zod 4** | Validation aux frontières, partagé avec les clients | Valibot, TypeBox |
| **pg-boss** | File de jobs sur Postgres (notifications, expiration de demandes, rappels) : pas de Redis à opérer au départ | BullMQ (+Redis) : quand le volume le justifiera |
| **pino** + redaction | Logs structurés JSON, champs sensibles masqués par configuration | winston |
| **Sentry** | Erreurs + traces | — |
| **Vitest** + **testcontainers** (Postgres) | Tests unitaires rapides, tests d'intégration contre une vraie base avec les vraies contraintes | Jest ; mocks de base (ne testent pas les contraintes) |
| **Docker** → **Fly.io** (région `cdg`, Paris) | Déploiement simple d'un conteneur long-running en Europe, scale horizontal quand besoin, secrets gérés | Railway/Render (équivalents, choix par préférence), AWS ECS (trop tôt) |

### Données, auth, stockage — Supabase (conservé)

| Brique | Rôle | Pourquoi le garder |
|---|---|---|
| **Postgres 17 + PostGIS** (Supabase, région EU) | Base unique | Déjà en place ; SQL standard, migrable vers Postgres autogéré ou Neon si besoin |
| **Supabase Auth** | Inscription, connexion, OTP, OAuth Apple/Google, MFA TOTP, JWT signés en asymétrique (JWKS) | Éviter d'écrire soi-même le flux de récupération de mot de passe, la rotation des refresh tokens, les OAuth ; l'API vérifie les JWT via JWKS sans partager de secret. Alternatives : Clerk (plus cher, moins de contrôle), Better Auth (bien, mais à opérer soi-même) |
| **Supabase Storage** | Buckets publics (photos) et privés (documents), URLs signées d'upload et de lecture | Intégré aux policies, S3-compatible en cas de migration |
| **Migrations** | `supabase/migrations/*.sql` appliquées par la CLI, schéma Drizzle généré depuis la base | Le SQL reste la source de vérité |

Ce qu'on **n'utilise pas** de Supabase : PostgREST comme API applicative, Edge Functions pour la logique métier, Realtime (pas de besoin au MVP).

### Web — Next.js (conservé)

Next.js 16 / React 19 / Tailwind v4 restent pour : pages SEO, back-office pro, admin. Les Server Actions existantes sont remplacées progressivement par des appels à l'API v1 (le web devient un client comme un autre, avec un token de session). Hébergement : Netlify conservé pour l'instant ; réévaluer Vercel si les limitations Netlify sur Next.js 16 posent problème.

### Services externes

| Besoin | Choix | Note |
|---|---|---|
| Paiement marketplace (Phase 5) | **Stripe Connect** (comptes Express pour les loueurs), PaymentIntents avec `capture_method: manual` pour les cautions, autorisations étendues jusqu'à 30 jours | Voir ADR-0005 |
| Push | **Expo Push Service** (APNs/FCM) | Migration directe APNs/FCM possible plus tard |
| E-mail transactionnel | **Resend** | Domaine dédié, DKIM/SPF/DMARC |
| Cartes | **MapLibre + OpenFreeMap** | Sans clé ; MapTiler en secours |
| Géocodage adresse (FR) | `api-adresse.data.gouv.fr` | Gratuit, sans clé ; abstraction pour changer de fournisseur hors France |
| Analytics produit | **PostHog** (EU cloud) | Événements produits, feature flags, sans données sensibles |
| Secrets | Fly secrets, EAS secrets, Netlify env, GitHub Environments | Jamais dans Git |

## Organisation du dépôt (monorepo)

```
.
├── apps/
│   ├── mobile/            Expo (client + pro)
│   ├── web/               Next.js (SEO, back-office, admin)  ← code RentMap déplacé ici
│   └── api/               Fastify
│       └── src/
│           ├── modules/<domaine>/{routes,service,repository,schemas}.ts
│           ├── shared/{authz,errors,logger,db,jobs}
│           └── server.ts
├── packages/
│   ├── contracts/         schémas Zod + types partagés (requêtes, réponses, événements)
│   ├── pricing/           moteur de prix pur, sans I/O, testé exhaustivement
│   ├── db/                schéma Drizzle généré + helpers de requête
│   ├── tokens/            design tokens (JSON) → Tailwind (web) et thème RN (mobile)
│   └── config/            eslint, tsconfig, prettier partagés
├── supabase/
│   ├── migrations/        SQL versionné, source de vérité du schéma
│   └── seed.sql
├── docs/
│   ├── phase-0/           ce dossier
│   └── adr/               décisions
├── .github/workflows/     CI
├── docker-compose.yml     Postgres/PostGIS local (ou `supabase start`)
├── turbo.json  pnpm-workspace.yaml  package.json
└── README.md  ARCHITECTURE.md  SECURITY.md  DATABASE.md  API.md  DECISIONS.md  ROADMAP.md
```

Outils : **pnpm** (workspaces, installs déterministes) + **Turborepo** (cache des builds/tests par package). Pas de Nx : plus de puissance que nécessaire.

## Environnements

| | Local | Staging | Production |
|---|---|---|---|
| Base | `supabase start` (Docker) ou docker-compose | Projet Supabase dédié (EU) | Projet Supabase dédié (EU), sauvegardes quotidiennes, PITR dès que possible |
| API | `pnpm dev` | Fly app `api-staging` | Fly app `api` |
| Web | `next dev` | Netlify deploy preview / branche `develop` | Netlify prod |
| Mobile | Expo Go / dev build | Build EAS canal `staging`, TestFlight interne | Build EAS canal `production`, stores |
| Stripe | clés test + `stripe listen` | clés test, webhook staging | clés live, webhook prod |
| Secrets | `.env.local` (git-ignoré), `.env.example` versionné | GitHub Environment `staging` | GitHub Environment `production`, approbation manuelle |

Aucun partage de clés, de données ou de webhooks entre environnements. Les données de staging sont synthétiques (seed), jamais une copie de prod.

## Stratégie de tests

| Niveau | Outil | Cibles prioritaires |
|---|---|---|
| Unitaires | Vitest | `packages/pricing` (chaque règle tarifaire), state machine de réservation, matrice `authz`, validateurs |
| Intégration API | Vitest + testcontainers Postgres | Routes de réservation (concurrence : deux demandes simultanées sur le même véhicule), IDOR (un membre d'une org ne voit pas l'autre org), idempotence, upload de documents |
| Base | pgTAP | Policies RLS, contrainte d'exclusion, triggers |
| Composants mobile | React Native Testing Library | Formulaires, états vides/erreur des écrans clés |
| E2E mobile | Maestro | Inscription → recherche → demande ; pro : accepter une demande |
| E2E web | Playwright | Vérification admin, back-office flotte |
| Sécurité | tests dédiés dans la suite d'intégration | Cf. `03-securite.md` § tests de sécurité |

Règle : une fonctionnalité qui touche réservation, prix, disponibilité, permissions ou documents n'est pas « terminée » sans test d'intégration.

## CI/CD

```
PR → lint · typecheck · tests unitaires · tests d'intégration (Postgres en service) · build
   · gitleaks (secrets) · pnpm audit / osv-scanner (dépendances) · migrations : dry-run sur base vierge
   · Expo : `expo doctor` + typecheck (build natif seulement sur tag)

merge develop → déploiement staging automatique (API Fly, web Netlify, EAS Update canal staging)
tag vX.Y.Z    → déploiement production avec approbation manuelle (GitHub Environment)
              → EAS Build + Submit (TestFlight / Play interne), puis promotion manuelle en store
```

Un code qui ne compile pas ou qui casse un test ne part pas. Les migrations destructives (drop, type change) exigent une revue explicite et une note dans la PR.

## Design system initial

Base : les tokens OKLCH existants (encre profonde + ambre) sont conservés comme identité, exportés en JSON dans `packages/tokens` et déclinés en **hex/rgb pour React Native** (RN ne comprend pas `oklch()`).

| Token | Décision |
|---|---|
| Couleurs | `ink` 50→950, `brand` (ambre) 3 nuances, `surface`, `border`, `success/warning/danger`, avec contraste ≥ 4.5:1 texte / 3:1 UI vérifié |
| Typographie | Inter (variable) ; échelle 12/14/16/18/22/28/34 ; interlignes fixés ; support Dynamic Type |
| Espacement | Échelle 4 : 4, 8, 12, 16, 24, 32, 48 |
| Rayons | 8 (contrôles), 14 (cartes), 24 (sheets), plein (pastilles) |
| Ombres | 2 niveaux (`soft`, `lift`), jamais plus |
| Zones tactiles | 44 × 44 pt minimum |
| Composants v1 | Button (4 variantes × 3 tailles), Input, Select/Sheet picker, DateRangePicker, Card, VehicleCard, Badge, Chip (filtres), Sheet, Modal, Toast, EmptyState, Skeleton, ListItem, Avatar, Tabs, Stepper (onboarding), MapPin |
| Motion | 150–250 ms, easing standard, uniquement pour feedback et continuité (sheet, transition galerie) ; respect de « réduire les animations » |
| Mode sombre | Prévu par les tokens dès le début, activé quand le fond de carte sombre sera choisi |

Chaque écran important est cadré avant d'être codé (objectif, action principale, hiérarchie, états, erreurs), conformément au brief § 57.

## Standards de code

- TypeScript `strict`, `noUncheckedIndexedAccess`, aucun `any` non justifié par un commentaire.
- ESLint (config partagée) + Prettier ; import ordonnés ; pas de `console.log` hors scripts.
- Validation Zod à toutes les frontières (HTTP, jobs, webhooks, variables d'environnement).
- Erreurs typées (`DomainError` avec code stable), jamais de message d'erreur brut de la base renvoyé au client.
- Montants : `number` entier en centimes + `currency`, jamais de flottant ; helpers dans `packages/pricing/money`.
- Dates : ISO 8601 UTC en transit ; fuseau de l'agence pour l'affichage et la logique de journée de location.
- Identifiants : UUID v7 (tri chronologique, non énumérables).
- Commits : Conventional Commits (`feat(bookings): …`), petits, un sujet par commit.
- Chaque PR : description, tests, note de migration si schéma, note `TECH DEBT` si compromis.
- Documentation vivante : `README`, `ARCHITECTURE`, `SECURITY`, `DATABASE`, `API` (générée depuis OpenAPI), `DECISIONS` (index des ADR), `ROADMAP`.
