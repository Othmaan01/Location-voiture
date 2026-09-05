# Audit de l'existant — RentMap v0.1

Date : 2026-09-05. Périmètre : le contenu du dossier au moment du cadrage (Next.js 16, Supabase, Netlify, ~90 fichiers source, 3 migrations SQL, 1 seed).

## 1. Ce que c'est

RentMap est un **annuaire cartographié** de loueurs professionnels :

- le pro paie un **abonnement** (Découverte 0 € / Starter 29 € / Pro 79 €) pour publier son agence et ses véhicules ;
- le client cherche sur une carte, filtre, et **envoie une demande de contact** (`leads`) ;
- **aucune réservation, aucun paiement de location, aucune commission**. Le README et `ARCHITECTURE.md` présentent ce choix comme structurant, pour éviter le statut d'intermédiaire commercial.

Le brief CTO décrit autre chose : une **marketplace mobile** avec disponibilités, réservation, paiement, documents, litiges. Ce n'est pas une évolution incrémentale de RentMap, c'est un changement de modèle économique et de statut juridique. C'est la décision n° 1 du dossier.

## 2. État de production du dépôt

| Constat | Conséquence |
|---|---|
| Pas de dépôt Git (`.git` absent) | Aucun historique, aucune traçabilité, aucune protection contre la perte. À corriger le jour 1. |
| Pas de `node_modules`, pas de `.env.example`, pas de `.gitignore` | Le projet n'a probablement jamais été installé ni lancé sur cette machine. Le README y fait pourtant référence. |
| Pas de dossier `.github/` | Le ROADMAP coche « CI GitHub Actions » : c'est faux, il n'y a pas de pipeline. |
| Aucun test | Assumé dans le ROADMAP. |
| `src/types/database.ts` écrit à la main, client Supabase non typé | Dette documentée, mais réelle : le compilateur ne protège pas les requêtes. |
| Aucune trace de projet Supabase ou Netlify de production | À confirmer avec vous. Hypothèse retenue : **aucune donnée de production n'existe**, donc le schéma peut être réécrit proprement plutôt que migré. |

## 3. Ce qui est bien fait et que l'on garde

Le code a été écrit avec de bons réflexes. Il ne faut pas le jeter.

- **PostgreSQL + PostGIS** : colonnes `geography` générées, index GIST, `ST_DWithin` pour le rayon. C'est exactement ce qu'il faut pour la recherche géographique.
- **Row Level Security partout**, « tout fermé par défaut », helpers `security definer` pour éviter la récursion de policies. Le rôle ne peut pas être auto-attribué (`handle_new_user` refuse `admin`, `freeze_profile_role` empêche l'escalade).
- **Règles métier en base** (triggers de quota, synchronisation plan/abonnement). Le front n'est pas l'autorité.
- **Recherche en une fonction SQL** (`search_vehicles`) avec `total_count` pour la pagination, vue dénormalisée `security_invoker`.
- **Server Actions + Zod**, honeypot sur le formulaire public.
- **Webhook Stripe** : vérification de signature, table `subscriptions` écrite uniquement par le service role.
- **Design tokens** en OKLCH dans `globals.css` (palette encre + ambre), une vraie base de design system.
- **SEO local** : pages ville pré-générées, JSON-LD, sitemap. C'est un actif d'acquisition que la version mobile ne remplace pas.
- **MapLibre + OpenFreeMap** : pas de clé, pas de facture surprise, clustering natif.

## 4. Ce qui ne correspond pas à la cible et doit changer

| Sujet | Existant | Cible (brief) | Action |
|---|---|---|---|
| Multi-tenant | `agencies.owner_id` = une personne. Un pro = un compte = ses agences. | Entreprise avec plusieurs membres et rôles (propriétaire, manager, employé). | Introduire `organizations` + `organization_members`. L'agence devient un point de retrait rattaché à une organisation. |
| Rôles | Enum `client / pro / admin` sur le profil. | Rôles plateforme (support, admin, superadmin) distincts des rôles d'organisation. | Séparer rôles plateforme et rôles d'organisation, matrice de permissions côté serveur. |
| Montants | `numeric(10,2)` (`price_per_day`, `deposit_amount`, …). | Entiers dans la plus petite unité monétaire. | Colonnes `*_cents integer` + `currency`. |
| Réservation | Table `leads` (demande de contact libre). | Machine à états, verrouillage, idempotence, devis figé. | Nouveau domaine `bookings` (voir modèle de données). |
| Disponibilités | Table `vehicle_unavailability` non utilisée. | Calendrier + filtre par dates + contrainte anti-chevauchement. | Réécrire en `availability_blocks` + contrainte d'exclusion sur `bookings`. |
| Prix | 3 colonnes (jour/semaine/mois) sur le véhicule. | Moteur tarifaire évolutif. | Table `rate_plans` + package `pricing` pur, testé. |
| Images | Bucket public, `images text[]` sur le véhicule. | Ordre, variantes, suppression sûre. | Table `vehicle_photos` ; bucket public acceptable pour les photos de véhicules (contenu public par nature). |
| Documents | Inexistant. | Permis, identité, Kbis, assurance, en stockage privé. | Bucket privé + URLs signées + table `documents` + workflow de vérification. |
| Vérification pro | `is_verified boolean`. | `submitted / under_review / verified / rejected / suspended`. | Enum + table `verification_requests`. |
| Monétisation | Abonnement Stripe Billing, quotas par palier en trigger. | Non tranché (abonnement, commission, hybride). | Conserver le code Billing en l'état, hors chemin critique, jusqu'à la décision. |
| Client mobile | Aucun. Site responsive. | Application iOS/Android premium. | `apps/mobile` (Expo). |
| Autorité serveur | Server Actions Next.js + RLS. | API contractuelle consommée par mobile et web, jobs, webhooks. | `apps/api` dédiée (voir architecture). |

## 5. Points de sécurité relevés dans l'existant

Aucune faille grave. Quelques points à traiter dans la réécriture :

1. `increment_vehicle_views` est `security definer`, exécutable par `anon`, sans limitation : un script peut gonfler les compteurs à volonté. Mineur, mais typique de ce qu'un rate limiting côté API règle.
2. `subscriptions.status` est casté directement depuis la valeur Stripe sans validation d'enum : une valeur inattendue de Stripe ferait échouer l'upsert (comportement sûr, mais silencieux côté logs).
3. Les Server Actions `deleteVehicle` et `toggleVehicleStatus` ignorent l'erreur Supabase et redirigent quand même : l'utilisateur ne sait pas si l'action a échoué.
4. La suppression de véhicule est un `delete` physique. Avec des réservations passées rattachées, ce sera interdit : il faudra un archivage (`status = archived`), déjà prévu dans l'enum.
5. `leads` accepte les insertions `anon` avec un e-mail libre : sans rate limiting ni vérification, c'est une surface de spam. Le honeypot ne suffit pas seul.

## 6. Verdict

**On garde les fondations Postgres/PostGIS/RLS et l'application web Next.js comme un des deux frontends.** On ne garde pas le modèle de données en l'état : il est conçu pour un annuaire, pas pour une marketplace transactionnelle. Puisqu'aucune donnée de production n'existe (à confirmer), on réécrit les migrations en un schéma v1 propre plutôt que de migrer un schéma vide.
