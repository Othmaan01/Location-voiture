# ADR-0002 — Monorepo : mobile Expo, web Next.js, API dédiée Fastify

Statut : accepté · Date : 2026-09-05

## Contexte

Deux surfaces (mobile client/pro, web SEO/back-office/admin) et une logique métier transactionnelle (réservation, prix, documents, paiements, jobs, webhooks). Équipe réduite, tout en TypeScript.

## Options

- Supabase seul (PostgREST + RLS + Edge Functions) : la logique transactionnelle finit en PL/pgSQL et fonctions Deno dispersées, difficile à tester.
- Next.js seul (Route Handlers serverless) : limites d'exécution, pas de jobs, couplage web/API.
- API dédiée Node/Fastify + Supabase pour Postgres/Auth/Storage.
- Flutter pour le mobile : isole le mobile du monorepo TypeScript (contrats, moteur de prix partagés).

## Décision

Monorepo pnpm + Turborepo : `apps/mobile` (Expo SDK 57, expo-router), `apps/web` (Next.js 16, code RentMap déplacé), `apps/api` (Fastify 5, Drizzle, Zod, pg-boss), `packages/{contracts,pricing,db,tokens,config}`. Une seule app Expo pour client et pro, segments de routes séparés.

## Conséquences

- Un service à opérer (Docker, Fly.io région Paris). Coût accepté.
- Contrats Zod partagés : une seule définition des formes de données pour serveur, mobile et web.
- Les Server Actions Next.js existantes migrent progressivement vers des appels API v1.
