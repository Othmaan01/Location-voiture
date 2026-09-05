# RentMap

**L'annuaire cartographié des loueurs de voitures.**
Les particuliers trouvent une agence près de chez eux ; les professionnels paient un abonnement pour être visibles. Aucune commission sur les locations.

---

## Sommaire

- [Le produit en une minute](#le-produit-en-une-minute)
- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Base de données](#base-de-données)
- [Stripe](#stripe)
- [Déploiement Netlify](#déploiement-netlify)
- [Structure du projet](#structure-du-projet)
- [Commandes](#commandes)

---

## Le produit en une minute

Deux profils :

| Profil | Ce qu'il fait | Ce qu'il paie |
|---|---|---|
| **Pro** (loueur professionnel) | Crée sa fiche agence géolocalisée, publie ses véhicules avec prix, options et conditions, reçoit les demandes de contact | Un abonnement mensuel : Découverte 0 € (1 véhicule) / Starter 29 € (5 véhicules) / Pro 79 € (illimité + mise en avant) |
| **Client** (particulier) | Cherche sur la carte, filtre, compare, contacte l'agence directement | Rien |

La plateforme **ne prend aucune commission** sur les locations. Le contrat se conclut entre le client et l'agence. Ce choix est structurant : il évite le statut d'intermédiaire commercial et aligne nos intérêts avec ceux des loueurs.

---

## Stack technique

| Brique | Choix | Pourquoi |
|---|---|---|
| Framework | **Next.js 16** (App Router, React 19.2, TypeScript, Turbopack) | Rendu serveur et génération statique : indispensable pour le SEO local ("location voiture Lyon") |
| Styles | **Tailwind CSS v4** + composants maison | Design system piloté par tokens dans `src/app/globals.css` |
| Base de données | **PostgreSQL + PostGIS** via **Supabase** | Requêtes géographiques natives, Row Level Security, temps réel |
| Authentification | **Supabase Auth** (e-mail / mot de passe) | Deux rôles gérés en base, protégés par RLS |
| Cartographie | **MapLibre GL** + tuiles **OpenFreeMap** | Gratuit, sans clé d'API, basé sur OpenStreetMap |
| Paiement | **Stripe Billing** (abonnements) | Checkout + portail client + webhook |
| Hébergement | **Netlify** (`@netlify/plugin-nextjs`) | SSR, ISR et routes API supportés |

---

## Démarrage rapide

### 1. Prérequis

```bash
node -v      # 20.9 minimum, 22 recommandé
npm -v
```

Optionnel mais recommandé pour travailler en local avec une vraie base :

```bash
brew install supabase/tap/supabase   # CLI Supabase
```

### 2. Installation

```bash
npm install
cp .env.example .env.local
```

### 3. Base de données locale

```bash
supabase init          # à ne faire qu'une fois — crée supabase/config.toml
supabase start         # démarre Postgres + Auth + Storage en Docker
supabase db reset      # applique les migrations et charge les données de démo
```

`supabase start` affiche l'URL de l'API et la clé `anon` : reportez-les dans `.env.local`.

Comptes de démonstration créés par le seed :

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Pro | `pro@rentmap.test` | `Demo1234!` |
| Client | `client@rentmap.test` | `Demo1234!` |

### 4. Lancer le site

```bash
npm run dev
```

→ http://localhost:3000

> Le projet démarre même **sans** Supabase configuré : les pages s'affichent avec des listes vides plutôt que de planter. Pratique pour travailler le design avant de brancher la base.

---

## Base de données

Les migrations sont dans `supabase/migrations/`, appliquées dans l'ordre :

| Fichier | Contenu |
|---|---|
| `20260101000000_init.sql` | Extensions, types énumérés, tables, triggers de base |
| `20260101000001_business_rules.sql` | Quotas d'abonnement, vue de recherche, RPC `search_vehicles` et `city_coverage` |
| `20260101000002_rls.sql` | Row Level Security sur toutes les tables + buckets Storage |

### Modèle

```
profiles ──< agencies ──< vehicles ──< vehicle_unavailability
                │  │         │
                │  │         └──< leads >── profiles (client)
                │  ├──< reviews
                │  └──1 subscriptions
cities ─────────┘
```

### Points structurants

- **Quotas appliqués en base.** Le trigger `vehicles_enforce_quota` empêche de publier plus de véhicules que le palier ne l'autorise. Le front ne peut pas contourner la règle, même en appelant l'API directement.
- **Rétrogradation non destructive.** Si une agence repasse à un palier inférieur, les véhicules en excédent repassent en brouillon — ils ne sont jamais supprimés.
- **RLS partout.** Lecture publique du catalogue publié uniquement ; écriture réservée au propriétaire de l'agence. La table `subscriptions` n'est écrite que par le webhook Stripe (clé `service_role`).
- **PostGIS.** Les colonnes `location` sont générées automatiquement à partir de `latitude`/`longitude` et indexées en GIST. La recherche par rayon utilise `ST_DWithin`.

### Régénérer les types TypeScript

`src/types/database.ts` est écrit à la main pour que le projet compile sans base. Dès que Supabase tourne :

```bash
npm run db:types
```

---

## Stripe

1. Créez deux produits **récurrents mensuels** dans le tableau de bord Stripe : Starter (29 €) et Pro (79 €).
2. Copiez les identifiants de prix (`price_...`) dans `.env.local` :
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PRICE_STARTER=price_...
   STRIPE_PRICE_PRO=price_...
   ```
3. En local, relayez les événements :
   ```bash
   npm run stripe:listen
   ```
   La commande affiche `whsec_...` → à mettre dans `STRIPE_WEBHOOK_SECRET`.
4. En production, créez le webhook vers `https://votre-domaine/api/stripe/webhook` en écoutant :
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

Tant que Stripe n'est pas configuré, l'application fonctionne normalement : seul le paiement est désactivé, et les paliers restent modifiables directement en base.

---

## Déploiement Netlify

1. Poussez le dépôt sur GitHub.
2. Sur Netlify : **Add new site → Import an existing project**.
3. La configuration est déjà dans `netlify.toml` (build `npm run build`, plugin Next.js officiel).
4. Ajoutez les variables d'environnement dans **Site settings → Environment variables** :
   `NEXT_PUBLIC_SITE_URL` (l'URL Netlify), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, et les variables Stripe.
5. Dans Supabase → **Authentication → URL Configuration**, ajoutez l'URL Netlify aux *Redirect URLs* (`https://votre-site.netlify.app/auth/callback`).

Pour la base de production, créez un projet Supabase en **région européenne** puis appliquez les migrations :

```bash
supabase link --project-ref <ref>
supabase db push
```

---

## Structure du projet

```
src/
├── app/
│   ├── (auth)/               connexion, inscription
│   ├── api/stripe/           checkout, portal, webhook
│   ├── dashboard/            espace pro (véhicules, demandes, agence, abonnement)
│   ├── compte/               espace particulier
│   ├── location-voiture/     pages ville — le cœur du SEO local
│   ├── agence/[slug]/        fiche publique d'une agence
│   ├── vehicule/[id]/        fiche publique d'un véhicule
│   ├── recherche/            carte + filtres
│   ├── villes/  tarifs/  pro/
│   ├── sitemap.ts  robots.ts
│   └── globals.css           design system (tokens de couleur, ombres, carte)
├── components/
│   ├── auth/  brand/  dashboard/  forms/  layout/
│   ├── map/                  MapCanvas (MapLibre) et carte de couverture
│   ├── search/               coquille de recherche et barre d'accueil
│   ├── ui/                   primitives (bouton, champ, carte, badge)
│   └── vehicles/             carte véhicule et visuel de repli
├── lib/                      supabase (3 clients), env, requêtes, plans, SEO, validateurs
├── server/actions/           Server Actions (agences, véhicules, leads, auth)
├── types/database.ts         types de la base
└── proxy.ts                  session + protection des routes (ex-middleware)

supabase/
├── migrations/               schéma versionné
└── seed.sql                  46 villes + données de démonstration
```

---

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run check` | Types + lint |
| `npm run db:start` / `db:stop` | Supabase local |
| `npm run db:reset` | Réapplique migrations + seed |
| `npm run db:types` | Régénère `src/types/database.ts` |
| `npm run stripe:listen` | Relaie les webhooks Stripe en local |

---

Voir [`ARCHITECTURE.md`](./ARCHITECTURE.md) pour les décisions techniques et [`ROADMAP.md`](./ROADMAP.md) pour la suite.
