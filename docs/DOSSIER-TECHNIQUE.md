# Dossier technique — plateforme de location de voiture (nom provisoire « Location Voiture »)

Version du 7 septembre 2026 · destiné à un développeur qui reprend ou rejoint le projet.

Ce document explique **ce que fait le produit, comment il est construit, comment le lancer, ce qui est solide et ce qui reste à faire**. Les détails vivent dans le dépôt : `README.md`, `ARCHITECTURE.md`, `SECURITY.md`, `DATABASE.md`, `API.md`, `ROADMAP.md` et les 14 décisions d'architecture dans `docs/adr/`. Ce dossier est la porte d'entrée ; il ne remplace pas le code ni les ADR.

---

## 1. Le produit en deux minutes

**Mise en relation** entre des **loueurs de voitures professionnels** (agences, indépendants) et des **clients**. La plateforme **n'encaisse jamais la location** : le client paie le loueur, à l'agence, selon ses conditions (carte, virement, espèces dans la limite légale). **Aucune commission**, ni côté client, ni côté loueur.

**Modèle économique** : abonnement mensuel du loueur, indexé sur le nombre de véhicules publiés (Standard 1–3 véhicules 29 € HT, Premium 4–10 79 €, Ultra 11–30 179 €, Flotte sur devis), 14 jours d'essai. Inclus : page publique sur le site web et référencement local.

**Trois espaces dans une seule application** (un compte, un « mode ») :

- **Client** : feed des loueurs vérifiés, profil loueur avec grille de véhicules, recherche (ville, dates, filtres), favoris, demande de réservation, messagerie avec le loueur, suivi de location (compte à rebours, frise, contact de l'agence), avis après location, signalements.
- **Loueur** : tableau de bord, agences (SIRET, adresse géocodée), véhicules (photos, tarifs en centimes, publication), documents et vérification (Kbis, assurance), membres et invitations, demandes de réservation (accepter, refuser, départ, retour, no-show, litige), calendrier avec blocages, messages, avis et réponses, personnalisation (logo, bannière, bio, accent), abonnement.
- **Admin** (rôle plateforme, jamais choisi à l'inscription) : file de vérification des dossiers, liste des loueurs avec suspension, signalements, litiges, modération des avis.

**Site web public** (référencement) : accueil, profils loueurs, pages par ville, recherche, tarifs, page loueurs, page application. Il ne fait que lire l'API publique ; tout ce qui demande un compte se fait dans l'application.

---

## 2. Architecture

```
apps/mobile   Expo SDK 57 / React Native 0.86 / expo-router   → application iPhone et Android
apps/web      Next.js 16 (App Router, webpack)                → site public, rendu côté serveur
apps/api      Fastify 5 + Zod + Drizzle (Node 22)             → le moteur, seule autorité métier
packages/contracts   schémas Zod partagés (requêtes, réponses, permissions, erreurs)
packages/pricing     calcul de devis (centimes entiers)
packages/tokens      design system (couleurs, espacements, typographie Manrope)
supabase/            migrations SQL (Postgres 17 + PostGIS), templates d'e-mails
```

**Principes non négociables** (ADR-0002, 0003, 0007) :

1. **Le serveur est la seule autorité.** Le mobile et le site ne décident rien : identités, rôles, montants, transitions d'état sont revérifiés dans l'API. Les contrats Zod partagés valident chaque requête et chaque réponse.
2. **Autorisation centralisée** : `apps/api/src/shared/authz.ts` + matrice `packages/contracts/src/permissions.ts`. Deux familles de rôles : rôles d'organisation (owner, manager, agent) et rôles plateforme (support, admin, superadmin). Une ressource d'une autre organisation renvoie **404**, jamais 403 (anti-énumération).
3. **Postgres comme filet** : contraintes, triggers (machine à états, quotas, cohérence SIRET/SIREN, immuabilité des journaux), RLS activée sur toutes les tables en seconde ligne.
4. **Montants en centimes entiers** (ADR-0004), jamais de flottants.
5. **Journal d'audit** en écriture seule pour toute action sensible.

**Services externes** : Supabase (Postgres, Auth par code e-mail à 6 chiffres, Storage, MFA TOTP), Resend (e-mails transactionnels), Expo Push (notifications), Fly.io (hébergement API et site, région Paris), api-adresse.data.gouv.fr (géocodage), recherche-entreprises.api.gouv.fr (annuaire SIREN/SIRET), Stripe Billing (abonnements, inactif tant que les clés ne sont pas posées).

---

## 3. Le moteur (`apps/api`)

**Démarrage** : `src/main.ts` charge l'environnement (`src/env.ts`, validé au boot), construit le serveur (`src/server.ts`) et lance le job d'expiration des demandes. Chaque module vit dans `src/modules/<nom>/{routes,service}.ts` ; les routes ne font que valider et déléguer, les services portent la logique.

**Modules** (16) : `health`, `identity` (profil, suppression de compte), `devices` (jetons push), `organizations` (organisation, membres, invitations, personnalisation, suppression), `agencies`, `vehicles` (photos, tarifs, publication, suppression/archivage), `documents` (bucket privé, URL signées, vérification), `companies` (annuaire officiel), `public-catalog` (feed, profil loueur, recherche, villes, favoris), `availability` (blocages), `bookings` (devis, demande idempotente, machine à états), `subscriptions` (grille, abonnement, Stripe), `messaging`, `reviews`, `reports`, `admin`, `notifications`.

**Authentification** : JWT Supabase vérifiés par JWKS (ES256) ; l'acteur (rôles, appartenances) est rechargé en base à chaque requête pour qu'un retrait de droit soit immédiat. Les routes admin exigent une session MFA (`aal2`) en production (`API_ADMIN_REQUIRE_MFA`).

**Réservation** (ADR-0005) : devis figé 15 minutes → demande idempotente (`Idempotency-Key`) → `requested → confirmed | declined | expired | cancelled` → `confirmed → active | cancelled | no_show` → `active → completed | disputed` → `disputed → resolved`. Une contrainte d'exclusion Postgres interdit deux réservations fermes qui se chevauchent sur un véhicule ; la confirmation verrouille le véhicule (`SELECT … FOR UPDATE`).

**Documentation des routes** : `API.md` (toutes les routes, par phase) et `/openapi.json` servi par l'API.

**Tests** : `apps/api/test/*.integration.test.ts`, 51 tests d'intégration exécutés contre une vraie base (variable `TEST_DATABASE_URL`) : accès IDOR, machine à états, concurrence, quotas, messagerie, avis, litiges, facturation avec un double de Stripe. Plus des tests unitaires (annuaire, pricing).

---

## 4. L'application mobile (`apps/mobile`)

**Navigation** : `expo-router` avec routes typées. Un seul navigateur à onglets (`app/(tabs)`) et **trois capsules** selon le mode (`src/lib/mode.ts`) : client (Accueil, Messages, Locations, Favoris, Profil), loueur (Tableau de bord, Réservations, Véhicules, Messages, Profil), admin (Vérifications, Loueurs, Signalements, Profil). Les écrans profonds sont dans `app/(pro)`, `app/(admin)`, `app/loueurs`, `app/reservations`, `app/conversations`, `app/profil`.

**État** : TanStack Query pour tout ce qui vient de l'API (`src/lib/queries*.ts`, un fichier par domaine), Zustand pour l'état transverse (mode, recherche). Formulaires en `react-hook-form` + Zod.

**Sécurité côté appareil** : session dans le Keychain/Keystore (`expo-secure-store`, découpée en fragments), verrouillage Face ID / code (`src/lib/app-lock.ts`), double authentification TOTP (`app/profil/mfa.tsx`, `app/(auth)/mfa.tsx`). L'app n'embarque que des valeurs publiques (`EXPO_PUBLIC_*`).

**Envoi de fichiers** : photos redimensionnées à 1 600 px avant envoi, URL signées émises par l'API, confirmation du chemin par l'API (jamais d'écriture directe non contrôlée).

**Design system** : `packages/tokens` (mode nuit uniquement : noirs en couches, accent rouge `#e3243b`, Manrope), composants dans `src/components/ui` (Screen, Dock capsule flottante, Card, Sheet, Button, Input, Select, Badge, Avatar, EmptyState).

---

## 5. Le site web (`apps/web`)

Next.js 16, rendu côté serveur, **aucun secret** : trois variables publiques (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`) plus, à venir, les liens des stores. Le client d'API (`src/lib/api.ts`) valide les réponses avec les contrats partagés. Pages : accueil, `loueurs/[id]`, `villes`, `location-voiture/[ville]`, `recherche`, `tarifs`, `pro`, `application`, pages légales, `sitemap.xml`, `robots.txt`, données structurées JSON-LD (organisation, loueur, fil d'Ariane, FAQ).

Effets visuels : fond animé sur canvas (`src/components/fx/animated-background.tsx`, pause hors écran, version fixe si « réduire les animations »), cartes en verre inclinables, apparitions au défilement, invitations discrètes vers l'application sur téléphone.

Le build passe par webpack (`next build --webpack`) pour résoudre les imports `.js` → `.ts` des contrats partagés.

---

## 6. Données (`supabase/migrations`, `DATABASE.md`)

Tables principales : `profiles`, `platform_roles`, `organizations` (SIREN, statut de vérification, plan, personnalisation, essai), `organization_members`, `organization_invitations`, `agencies` (SIRET, position PostGIS), `vehicles`, `vehicle_photos`, `rate_plans`, `documents` (+ `document_access_log`), `verification_requests`, `plans`, `subscriptions`, `cities`, `quotes`, `bookings` (+ `booking_events` immuables), `availability_blocks`, `favorites`, `notifications`, `device_tokens`, `conversations`, `messages` (immuables), `reviews`, `reports`, `audit_log` (append-only), `idempotency_keys`.

Règles portées par la base : cohérence SIRET ⊃ SIREN (trigger), quota de publication par plan (trigger), rétrogradation douce quand le plan baisse, un seul propriétaire ne peut pas disparaître, machine à états des réservations, exclusion des chevauchements, RLS partout.

**Environnements** : un seul projet Supabase de **staging** aujourd'hui (`kgvblvfsypcyocpacydb`, eu-west-1). Les migrations y ont été appliquées via le connecteur Supabase ; la table d'historique du CLI n'est pas alignée (voir dette technique).

---

## 7. Lancer le projet

Prérequis : Node 22, `corepack` (pnpm), un compte Expo, l'application Expo Go sur un téléphone. Docker n'est pas nécessaire (la base est hébergée).

```bash
corepack pnpm install
# Moteur, en local, branché sur la base de staging (.env.local à la racine, jamais commité)
set -a; . ./.env.local; set +a; corepack pnpm --filter @lv/api dev
# Tests d'intégration (TEST_DATABASE_URL dans .env.local)
set -a; . ./.env.local; set +a; corepack pnpm --filter @lv/api test
# Application (le téléphone et le Mac doivent être sur le même compte Expo)
cd apps/mobile && npx expo start --go            # même Wi-Fi
cd apps/mobile && npx expo start --go --tunnel   # réseaux différents
# Site
cd apps/web && npx next dev --webpack
```

Vérifications avant chaque commit : `corepack pnpm --filter <paquet> typecheck`, `lint`, Prettier. La CI GitHub (`.github/workflows/ci.yml`) rejoue lint, typecheck et tests.

**Déploiement** : API sur Fly.io (`apps/api/fly.toml`, `scripts/fly-set-secrets.sh` lit `.env.local`), site sur Fly.io (`apps/web/fly.toml`). Adresses actuelles : `https://location-voiture-api-staging.fly.dev`, `https://location-voiture-web-staging.fly.dev`.

---

## 8. Sécurité : ce qui est en place

- Vérification des JWT par clés asymétriques ; rôles rechargés à chaque appel ; MFA exigée pour l'administration en production.
- Autorisation centralisée, 404 sur les ressources étrangères, matrice de permissions testée.
- Rate limiting global et par route sensible (inscriptions, envois, messages, annuaire), Helmet, CORS restreint.
- Idempotence des créations de réservation ; verrous et contraintes en base contre la double réservation.
- Documents d'identité et professionnels dans un bucket **privé**, lecture par URL signée courte, chaque consultation journalisée.
- Coordonnées de l'agence révélées au client seulement après confirmation ; nom complet du client jamais exposé publiquement (prénom + initiale).
- Journal d'audit immuable, messages et événements immuables, RLS sur toutes les tables.
- Logs structurés avec redaction (jetons, e-mails, téléphones, SIRET/SIREN).
- Secrets uniquement en variables d'environnement (Fly, `.env.local` git-ignoré) ; `gitleaks` en CI.
- Webhook Stripe vérifié par signature, corps brut, sans authentification utilisateur.
- Suppression de compte conforme aux exigences des stores ; anonymisation du profil.

---

## 9. Dette technique et points d'attention (à traiter avant la production)

| Sujet                                              | Pourquoi ça compte                                                         | Ce qu'il faut faire                                                                    |
| -------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Base de production séparée                         | Le staging sert aussi aux tests, qui créent et suppriment des données      | Créer un second projet Supabase, rejouer les migrations avec le CLI, poser les secrets |
| Historique des migrations CLI                      | Les migrations ont été appliquées à la main sur le staging                 | `supabase migration repair` puis n'utiliser que le CLI                                 |
| Image Docker de l'API                              | Exécute les sources TypeScript via `tsx` (image de 350 Mo, démarrage lent) | Bundle unique (tsup) et image plus petite                                              |
| Job d'expiration en mémoire                        | Ne survit pas à plusieurs instances                                        | Passer à une file (pg-boss)                                                            |
| Messagerie sans temps réel                         | Rafraîchissement toutes les 5 s                                            | Supabase Realtime ou WebSocket quand le volume le justifie                             |
| Fin d'essai non appliquée                          | Un loueur peut rester sur Starter sans payer après 14 jours                | À activer avec Stripe (décision commerciale)                                           |
| MFA admin désactivée sur le staging                | Confort de test                                                            | Repasser `API_ADMIN_REQUIRE_MFA=true` après validation sur téléphone                   |
| Pas de tests de composants mobiles                 | Les écrans ne sont vérifiés que par les types et à la main                 | jest-expo sur les écrans critiques (demande, décision, messagerie)                     |
| Option Fastify dépréciée (`disableRequestLogging`) | Retirée dans Fastify 6                                                     | Migrer vers `logController`                                                            |
| Site : loueurs fictifs dans la maquette            | Illustratif                                                                | Remplacer par de vraies captures dès la première flotte publiée                        |
| Nom de marque, domaine, e-mails                    | Adresses provisoires `.fly.dev`, e-mails limités à l'adresse du fondateur  | Choisir le nom, acheter le domaine, brancher Resend et Fly dessus                      |

---

## 10. Feuille de route restante

Phase 8 : analytics produit, tableaux de bord loueur, performance, feature flags, carte des résultats, promotions et saisonnalité. Publication sur les stores (compte Apple Developer, EAS Build, TestFlight, Google Play), mise en production (base séparée, domaine, e-mails, Stripe, MFA admin), pentest externe, App Attest / Play Integrity.

---

## 11. Où regarder en premier

1. `ARCHITECTURE.md` puis les ADR 0001 à 0014 (`docs/adr/README.md`) : chaque choix structurant, avec son pourquoi.
2. `packages/contracts/src` : le langage commun ; tout changement d'API commence ici.
3. `apps/api/src/modules/bookings` : le cœur métier, avec `state-machine.ts` et le test `bookings.integration.test.ts`.
4. `apps/mobile/app/(tabs)/_layout.tsx` et `src/lib/mode.ts` : comment une seule app sert trois espaces.
5. `SECURITY.md` : les règles à ne jamais contourner.
