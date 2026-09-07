# Base de données

Source de vérité : `supabase/migrations/*.sql` (Postgres 17 + PostGIS, via Supabase). Modèle détaillé : [docs/phase-0/04-modele-de-donnees.md](docs/phase-0/04-modele-de-donnees.md).

## Migrations v1

| Fichier                                      | Contenu                                                                                                                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260905000000_v1_foundation.sql`           | extensions, `uuid_generate_v7`, profils, rôles plateforme, appareils, consentements, villes, audit, idempotence                                                                                                            |
| `20260905000001_v1_organizations.sql`        | plans, organisations, membres, invitations, agences, documents, vérification, abonnements                                                                                                                                  |
| `20260907000000_v1_siren_siret.sql`          | `organizations.siren` (unique), `agencies.siret` (unique) + trigger de cohérence SIRET ⊃ SIREN ; suppression de `organizations.siret` (ADR-0010)                                                                           |
| `20260907000001_v1_modes_branding_plans.sql` | `profiles.preferred_mode`, personnalisation (`organizations.logo_path/banner_path/bio/website/accent/trial_ends_at`, `agencies.photo_path/description`), grille de plans (Starter par défaut, `free` désactivé) (ADR-0011) |
| `20260907000002_v1_messaging_reviews.sql`    | `conversations` (un fil général par client et loueur, un par réservation), `messages` (immuables), `reviews` (un par réservation, réponse, statut), RLS lecture (ADR-0012)                                                 |
| `20260907000003_v1_reports.sql`              | `reports` (cible, loueur rattaché, motif, statut, résolution), RLS lecture (ADR-0013)                                                                                                                                      |
| `20260907000004_v1_offers.sql`               | `offers` (cible véhicule ou flotte, remise, période, statut), `quotes.offer_id`, RLS lecture des offres actives (ADR-0015)                                                                                                 |
| `20260907000005_v1_stories.sql`              | `stories` (photo, légende ≤ 120, `expires_at` = création + 48 h), RLS lecture publique des stories non expirées (ADR-0016)                                                                                                 |
| `20260907000006_v1_stories_video.sql`        | `stories.media_path/media_type/duration_seconds` (photo ou vidéo filmée en direct), bucket public `story-media` (60 Mo, image + vidéo)                                                                                     |
| `20260905000002_v1_catalog.sql`              | véhicules, quotas de publication, photos, grilles tarifaires, blocages                                                                                                                                                     |
| `20260905000003_v1_bookings.sql`             | devis, réservations (contrainte d'exclusion), événements, favoris, notifications                                                                                                                                           |
| `20260905000004_v1_rls.sql`                  | policies RLS, buckets Storage                                                                                                                                                                                              |

## Conventions

- `id uuid` v7, `created_at`/`updated_at`, `organization_id` dénormalisé sur toute table d'organisation.
- Montants `*_cents integer` + `currency char(3)`.
- Périodes en `tstzrange` `[début, fin)`.
- Tables en ajout seul (`audit_log`, `booking_events`, `document_access_log`, `quotes`) protégées par trigger.
- Règles métier en base : quota de publication (table `plans`), au moins un owner par organisation, agence et véhicule dans la même organisation, immutabilité des colonnes financières d'une réservation.

## Travailler avec

```bash
pnpm db:start        # démarre et applique les migrations
pnpm db:reset        # rejoue tout + seed
supabase migration new <nom>   # nouvelle migration (jamais modifier une migration appliquée)
```

Une migration destructive (drop, changement de type) exige une note explicite dans la PR.
