# ADR-0003 — Supabase conservé ; l'API est l'autorité ; RLS en défense en profondeur

Statut : accepté · Date : 2026-09-05

## Contexte

Supabase est déjà en place (Postgres + PostGIS, Auth, Storage, RLS complète). Le brief impose que le serveur soit l'autorité et que l'isolation multi-tenant soit garantie côté serveur.

## Options

- Tout en RLS + PostgREST (client parle à la base).
- Tout dans l'API, RLS désactivée.
- API autoritaire + RLS active en seconde ligne.

## Décision

Toute écriture métier passe par `apps/api` avec un module `authz` unique et testé. Les policies RLS restent actives sur toutes les tables : si un accès PostgREST est un jour ouvert, ou si une route de l'API a un défaut d'autorisation, la base refuse. L'API vérifie les JWT Supabase via JWKS (signature asymétrique), sans secret partagé. Le mobile n'embarque que la clé `anon` (publique par conception) et n'écrit jamais directement en base.

Ce qu'on n'utilise pas : PostgREST comme API applicative, Edge Functions pour la logique métier, Realtime (pas de besoin au MVP).

## Conséquences

- Deux expressions de l'autorisation (authz + policies) à garder cohérentes : tests pgTAP sur les policies, tests d'intégration sur authz.
- Migration hors de Supabase possible (SQL standard, stockage S3-compatible, JWT standard) mais non gratuite.
