# G. Modèle de données initial (v1 marketplace)

Conventions : `id uuid` (v7) partout, `created_at` / `updated_at timestamptz`, clés étrangères explicites, `organization_id` dénormalisé sur toute table d'organisation, montants en **centimes** (`integer`) + `currency char(3)`, soft delete uniquement là où le métier l'exige (véhicules → `archived`, jamais de `delete` physique après une réservation).

## Vue d'ensemble

```
auth.users ─1─ profiles ──< organization_members >── organizations ──< agencies
                 │                                        │               │
                 │                                        ├──< documents  │
                 │                                        ├──< verification_requests
                 │                                        └──< vehicles ──┘ (agency_id)
                 │                                               ├──< vehicle_photos
                 │                                               ├──1 rate_plans (v1 : un plan actif)
                 │                                               ├──< availability_blocks
                 │                                               └──< bookings ──< booking_events
                 ├──< quotes ─────────────────────────────────────────┘ (quote_id)
                 ├──< favorites
                 ├──< device_tokens
                 ├──< consents
                 └──< platform_roles
cities (référentiel)        audit_log (append-only)        idempotency_keys
```

## Tables

### Identité

**profiles** — miroir applicatif de `auth.users`.
`id (fk auth.users)`, `first_name`, `last_name`, `phone`, `avatar_path`, `locale`, `date_of_birth` (nullable, demandé à la première réservation), `deleted_at` (anonymisation), timestamps.

**platform_roles** — `user_id`, `role enum(support, admin, superadmin)`, `granted_by`, `granted_at`. Unique `(user_id)`.

**device_tokens** — `user_id`, `platform enum(ios, android)`, `token`, `last_seen_at`. Unique `(token)`.

**consents** — `user_id`, `kind enum(terms, privacy, marketing)`, `version`, `accepted_at`, `ip_hash`. Journal en ajout seul.

### Organisations (loueurs)

**organizations** — `name`, `legal_name`, `siret`, `vat_number`, `country_code`, `status enum(draft, submitted, under_review, verified, rejected, suspended)`, `status_reason`, `status_changed_at`, `billing_email`, `stripe_account_id` (Phase 5), `commission_bps` (Phase 5, points de base), timestamps.
Index : `status`, unique partiel `siret where siret is not null`.

**organization_members** — `organization_id`, `user_id`, `role enum(owner, manager, agent)`, `invited_by`, `joined_at`. PK `(organization_id, user_id)`. Contrainte : au moins un `owner` par organisation (trigger).

**organization_invitations** — `organization_id`, `email`, `role`, `token_hash`, `expires_at`, `accepted_at`.

**agencies** — point de retrait. `organization_id`, `name`, `slug`, `address_line`, `postal_code`, `city_id`, `city_name`, `latitude`, `longitude`, `location geography (generated)`, `timezone`, `phone`, `email`, `opening_hours jsonb`, `services text[]`, `status enum(draft, published, suspended)`, timestamps.
Index GIST sur `location`, `organization_id`.

**documents** — `organization_id`, `uploaded_by`, `kind enum(kbis, insurance, id_card, driving_license, vehicle_registration, other)`, `storage_path` (bucket privé), `mime_type`, `size_bytes`, `sha256`, `status enum(pending, accepted, rejected)`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `expires_at` (assurance), `subject_type` / `subject_id` (organisation ou véhicule), timestamps.

**verification_requests** — `organization_id`, `submitted_at`, `decided_at`, `decided_by`, `decision enum(verified, rejected)`, `notes`. Historique complet ; le statut courant est sur `organizations.status`.

### Catalogue

**vehicles** — `organization_id`, `agency_id`, `brand`, `model`, `version`, `year`, `category enum`, `transmission enum`, `fuel enum`, `seats`, `doors`, `luggage`, `color`, `license_plate` (chiffrée applicativement, visible du pro seulement), `options text[]`, `description`, `min_driver_age`, `min_license_years`, `status enum(draft, published, archived)`, `suspended_at`, `suspended_reason`, timestamps.
Index : `(organization_id, status)`, `agency_id`, `category`.

**vehicle_photos** — `vehicle_id`, `organization_id`, `storage_path`, `position smallint`, `width`, `height`, `blurhash`, timestamps. Unique `(vehicle_id, position)`. Les variantes (miniature, moyenne, grande) sont dérivées par transformation d'image à la lecture (Supabase Image Transformation ou job de génération), pas stockées en colonnes.

**rate_plans** — grille tarifaire d'un véhicule. `vehicle_id`, `organization_id`, `currency`, `daily_cents`, `weekend_daily_cents` (nullable), `weekly_cents` (nullable), `monthly_cents` (nullable), `deposit_cents`, `km_included_per_day`, `extra_km_cents`, `min_days`, `max_days`, `valid_from`, `valid_to`, `is_active`. Un seul plan actif par véhicule en v1 (contrainte unique partielle) ; la table est déjà multi-lignes pour accueillir saisonnalité et promotions sans migration.

### Disponibilité et réservation

**availability_blocks** — indisponibilités manuelles. `vehicle_id`, `organization_id`, `period tstzrange`, `reason enum(maintenance, external_rental, other)`, `note`, `created_by`. Index GIST `(vehicle_id, period)`.

**quotes** — devis figé. `id`, `user_id` (nullable si non connecté : le devis est alors lié à la session), `vehicle_id`, `rate_plan_id`, `period tstzrange`, `pickup_agency_id`, `lines jsonb` (détail : jours, week-end, réductions, options), `subtotal_cents`, `fees_cents`, `total_cents`, `deposit_cents`, `currency`, `expires_at` (≈ 15 min), `created_at`. Jamais modifié.

**bookings** — `id`, `reference` (lisible, ex. `LV-7K3M2Q`), `organization_id`, `agency_id`, `vehicle_id`, `customer_id`, `quote_id`, `period tstzrange`, `status enum` (voir state machine), `status_changed_at`, `customer_message`, `decline_reason`, `cancellation_reason`, `cancelled_by`, `total_cents`, `deposit_cents`, `currency`, `price_snapshot jsonb` (copie du devis), `payment_status enum(none, pending, authorized, paid, refunded, partially_refunded)` (Phase 5), `expires_at` (délai de réponse du pro), timestamps.

Contrainte anti-double réservation, au niveau base :

```sql
create extension if not exists btree_gist;
alter table bookings add constraint bookings_no_overlap
  exclude using gist (vehicle_id with =, period with &&)
  where (status in ('confirmed', 'active'));
```

Deux demandes `requested` peuvent se chevaucher (le pro choisit) ; deux réservations confirmées ne le peuvent jamais, quel que soit le chemin de code.

**booking_events** — journal des transitions. `booking_id`, `organization_id`, `from_status`, `to_status`, `actor_id`, `actor_type enum(customer, organization_member, system, platform)`, `reason`, `metadata jsonb`, `created_at`. Ajout seul.

**idempotency_keys** — `key`, `user_id`, `route`, `request_hash`, `response_status`, `response_body jsonb`, `created_at`. TTL 24 h.

### Client

**favorites** — `user_id`, `vehicle_id`, `created_at`. PK composite.

### Transverse

**cities** — référentiel conservé de RentMap (slug, coordonnées, département, population).

**audit_log** — `actor_id`, `actor_type`, `action`, `subject_type`, `subject_id`, `organization_id`, `metadata jsonb`, `ip_hash`, `created_at`. Ajout seul, jamais mis à jour ni supprimé par l'application.

**notifications** — `user_id`, `kind`, `payload jsonb`, `read_at`, `sent_push_at`, `sent_email_at`, `created_at`.

## State machine de réservation

```
                 ┌──────────┐  pro refuse / délai dépassé   ┌──────────┐
   client crée   │requested │ ─────────────────────────────▶│ declined │
  ──────────────▶│          │                               │ expired  │
                 └────┬─────┘                               └──────────┘
        pro accepte   │           client annule
                      ▼          ┌──────────────────────────▶ cancelled
                 ┌──────────┐    │
                 │confirmed │────┤   (Phase 5 : confirmed → payment_pending → paid → …)
                 └────┬─────┘    │
    retrait effectué  │          │ pro annule (motif obligatoire, alerte admin)
   (pro, jour J)      ▼          │
                 ┌──────────┐    │
                 │  active  │────┘  no-show déclaré par le pro → no_show
                 └────┬─────┘
    retour effectué   │
                      ▼
                 ┌──────────┐      litige (Phase 5+)
                 │completed │ ───────────────────────▶ disputed ──▶ resolved
                 └──────────┘
```

Règles :

- Chaque transition est une fonction nommée dans `modules/bookings/state-machine.ts`, avec la liste exhaustive des transitions autorisées par état et par type d'acteur. Toute autre transition est refusée.
- `requested` expire automatiquement (job) après un délai configurable par organisation (défaut 24 h), avec rappel push au pro à mi-délai.
- L'annulation client après confirmation est libre au MVP (pas de paiement) mais tracée ; les conditions d'annulation deviennent une règle tarifaire en Phase 5.
- Le passage à `active` et `completed` est déclenché par le pro (P0) ; automatisable par date en P1.

## Moteur de prix

`packages/pricing` est une fonction pure :

```
quote(input: { ratePlan, period, agencyTimezone, options[] }) → { lines[], subtotal, fees, total, deposit }
```

- v1 : nombre de jours de location (règle : toute journée entamée est due, calculée dans le fuseau de l'agence), tarif jour, tarif week-end s'il existe, paliers semaine/mois s'ils sont plus avantageux, caution.
- Chaque règle est une `PricingRule` composable qui produit des lignes ; ajouter la saisonnalité, une promotion ou des frais de livraison = ajouter une règle et ses tests, pas réécrire le calcul.
- Arithmétique entière uniquement ; arrondis explicites et testés ; aucune opération monétaire hors de ce package.
- La commission plateforme (Phase 5) est une ligne calculée côté serveur, jamais transmise par le client.

## Recherche

`search_vehicles` (RentMap) est conservée dans l'esprit et réécrite pour :

- filtrer par période : exclure les véhicules ayant un `availability_block` ou un `booking` confirmé/actif qui chevauche la période ;
- lire les prix depuis `rate_plans` en centimes ;
- exposer le prix « pour ces dates » (calcul rapide en SQL pour le tri, devis exact via l'API à l'ouverture de la fiche).

## Migration depuis le schéma RentMap

Hypothèse : aucune donnée de production. Plan :

1. Nouvelle série de migrations `v1` remplaçant les trois migrations existantes (les fichiers actuels sont archivés dans `docs/legacy/` pour référence).
2. Reprise à l'identique : extensions, `cities`, helpers `slugify` / `set_updated_at`, `handle_new_user` (sans rôle en métadonnées), pattern de policies.
3. Seed réécrit : 46 villes conservées, organisations et véhicules de démonstration avec tarifs en centimes.

Si une base de production existe, le plan devient additif (nouvelles tables, backfill `organizations` depuis `agencies.owner_id`, colonnes `_cents` calculées depuis `numeric`, bascule, suppression différée) et sera écrit dans un ADR dédié.
