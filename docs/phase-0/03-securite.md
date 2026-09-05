# E. Architecture sécurité

Principes : security by design, privacy by design, least privilege, defense in depth, secure by default. Référentiel : OWASP ASVS (niveau 2 visé), OWASP MASVS pour le mobile, OWASP API Security Top 10.

## 1. Rôles et permissions

Deux familles de rôles, volontairement séparées :

**Rôles plateforme** (table `platform_roles`, attribués uniquement par un superadmin, MFA obligatoire) : `support`, `admin`, `superadmin`.

**Rôles d'organisation** (table `organization_members`, un utilisateur peut appartenir à plusieurs organisations) : `owner`, `manager`, `agent`.

Un utilisateur sans rôle plateforme ni appartenance est un **client**. Il n'y a pas de « rôle client » stocké : c'est l'absence de privilège.

### Matrice de permissions (extrait, source de vérité dans `packages/contracts/permissions.ts`)

| Action | client | agent | manager | owner | support | admin |
|---|---|---|---|---|---|---|
| Rechercher, consulter le catalogue publié | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Créer une demande de réservation | ✓ | — | — | — | — | — |
| Voir ses propres réservations | ✓ | — | — | — | lecture | lecture |
| Voir les réservations de l'organisation | — | ✓ | ✓ | ✓ | lecture | lecture |
| Accepter / refuser une demande | — | ✓ | ✓ | ✓ | — | — |
| Créer / modifier un véhicule | — | — | ✓ | ✓ | — | — |
| Publier / dépublier un véhicule | — | — | ✓ | ✓ | — | suspendre |
| Modifier les tarifs | — | — | ✓ | ✓ | — | — |
| Bloquer une disponibilité | — | ✓ | ✓ | ✓ | — | — |
| Gérer les membres | — | — | — | ✓ | — | — |
| Déposer les documents de l'organisation | — | — | ✓ | ✓ | — | — |
| Lire les documents de l'organisation | — | — | — | ✓ | ✓ (vérification) | ✓ |
| Vérifier / rejeter une organisation | — | — | — | — | ✓ | ✓ |
| Suspendre un utilisateur / une organisation | — | — | — | — | — | ✓ |
| Attribuer un rôle plateforme | — | — | — | — | — | superadmin |

Toute vérification suit le même chemin : `authz.can(actor, action, resource)` dans l'API, où `resource` porte son `organization_id`. Un test d'intégration par ligne de la matrice.

## 2. Isolation multi-tenant

- Chaque table métier d'organisation porte `organization_id` (dénormalisé même quand une clé étrangère indirecte existe, pour que les policies et les requêtes soient simples et indexées).
- L'API résout l'organisation depuis la ressource, jamais depuis un paramètre client. Un `organization_id` envoyé par le mobile n'est qu'une intention ; l'appartenance est revérifiée en base.
- RLS : policy générique `organization_id in (select organization_id from organization_members where user_id = auth.uid())`, avec un helper `security definer` stable.
- Tests IDOR systématiques : pour chaque route qui prend un identifiant, un test appelle la route avec l'identifiant d'une autre organisation et attend `404` (jamais `403`, pour ne pas confirmer l'existence).

## 3. Authentification

| Sujet | Décision |
|---|---|
| Fournisseur | Supabase Auth. JWT courts (accès ≈ 1 h), refresh tokens à rotation, révocables. Signature asymétrique (ES256) : l'API vérifie via JWKS, sans secret partagé. |
| Méthodes MVP | E-mail + mot de passe (politique : 10 caractères minimum, vérification contre listes de mots de passe compromis, pas de règles de composition absurdes). OTP e-mail pour vérification et récupération. |
| Méthodes P1 | Sign in with Apple, Google. Apple exige *Sign in with Apple* dès qu'un login social tiers existe. |
| MFA | TOTP obligatoire pour `support`, `admin`, `superadmin`. Proposée aux `owner`. |
| Stockage mobile | Session dans le Keychain / Keystore via `expo-secure-store` (avec adaptateur chiffré pour la limite de 2 Ko). Jamais dans AsyncStorage, jamais en clair. |
| Biométrie | Déverrouillage local de l'app (P1), ne remplace jamais l'authentification serveur. |
| Sessions | Liste des appareils, déconnexion à distance, invalidation de tous les refresh tokens au changement de mot de passe. |
| Changement d'e-mail / téléphone | Double confirmation (ancien et nouveau canal), notification sur l'ancien canal. |
| Anti-brute force | Rate limiting par IP et par identifiant, délai progressif, pas de verrouillage définitif (vecteur de déni de service). Messages d'erreur identiques succès/échec sur « mot de passe oublié » (anti-énumération). |
| Suppression de compte | Dans l'app (exigence Apple/Google). Anonymisation des données liées à des réservations passées (obligation de conservation comptable) plutôt que suppression physique ; suppression réelle du reste. |

## 4. Sécurité des API

| Menace | Contrôle |
|---|---|
| Broken access control, IDOR | `authz` central + RLS + tests IDOR ; identifiants UUID v7 non devinables |
| Mass assignment | Schémas Zod stricts (`.strict()`), DTO explicites, jamais `req.body` passé à un `update` |
| Injection | ORM paramétré, SQL brut uniquement avec paramètres liés, jamais de concaténation |
| Brute force / abuse | Rate limiting par route (auth : strict ; recherche : modéré ; création de réservation : par utilisateur) ; quotas quotidiens sur les actions coûteuses |
| Énumération | Réponses uniformes, `404` sur ressource étrangère, pas d'identifiants séquentiels |
| Replay / double soumission | `Idempotency-Key` obligatoire sur les créations (réservations, paiements), stockée 24 h avec la réponse |
| Scraping | Rate limiting, pagination bornée, pas d'export massif public, champs de contact du pro visibles seulement après confirmation |
| Manipulation de prix | Le client ne transmet jamais un montant ; il transmet un `quote_id`, le serveur recalcule et compare |
| Webhooks forgés | Vérification de signature Stripe, horodatage, idempotence par `event.id` |
| Fuites via erreurs | Erreurs typées, messages génériques en production, détails uniquement dans Sentry |
| Transport | TLS 1.2+ uniquement, HSTS, certificate pinning mobile étudié en P2 (coût de rotation à peser) |
| En-têtes | CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (déjà partiellement en place sur Netlify) |

## 5. Données sensibles

| Catégorie | Exemples | Protection |
|---|---|---|
| PII de base | nom, e-mail, téléphone | Chiffrement au repos (Supabase), accès par rôle, masquage dans les logs (pino redaction), export et suppression RGPD |
| Documents d'identité et professionnels | permis, pièce d'identité, Kbis, assurance, carte grise | **Bucket privé**, URL signée de lecture (durée ≤ 5 min), URL signée d'upload (durée ≤ 10 min, type MIME et taille contraints), validation serveur du type réel (magic bytes), scan antivirus (ClamAV en job, P1), conservation limitée, accès journalisé (qui a ouvert quel document quand) |
| Données financières | IBAN des loueurs, cartes | **Jamais stockées chez nous** : Stripe Connect Express et Stripe Elements/Payment Sheet ; nous ne conservons que des identifiants Stripe |
| Localisation | position du client au moment d'une recherche | Non persistée ; seule la ville/rayon de recherche est journalisée pour l'analytics, arrondie |
| Communications | message joint à une demande | Accès limité aux deux parties + support ; pas de messagerie libre au MVP |
| Réservations | dates, montants, parties | Nécessaires à la conservation comptable après suppression du compte (anonymisées) |

Minimisation : aucune donnée n'est collectée sans usage identifié dans ce document ou dans un ADR ultérieur. La date de naissance n'est demandée qu'au moment de la réservation (âge minimum du conducteur), pas à l'inscription.

## 6. Threat model initial

Méthode : par actif, qui attaque, comment, ce qu'on fait. Priorisé par impact × vraisemblance.

| # | Actif | Menace | Vraisemblance | Impact | Contrôles (MVP sauf mention) |
|---|---|---|---|---|---|
| T1 | Données d'une organisation | Un pro accède aux réservations/clients/documents d'un concurrent (IDOR, faille d'autorisation) | Moyenne | Critique | authz central, RLS, tests IDOR, UUID v7, audit |
| T2 | Documents d'identité | Fuite par URL publique ou signée trop longue, accès interne non tracé | Moyenne | Critique | bucket privé, URL courtes, journal d'accès, MFA admin, rôle `support` limité |
| T3 | Réservation | Double réservation par concurrence ; prix manipulé côté client ; demande rejouée | Haute (bugs naturels) | Élevé | verrou par véhicule + contrainte d'exclusion, devis serveur figé, idempotence |
| T4 | Comptes | Credential stuffing, brute force, reset de mot de passe abusif | Haute | Élevé | rate limiting, mots de passe compromis refusés, MFA admin, notification de connexion inhabituelle (P1) |
| T5 | Plateforme | Faux loueurs, véhicules fictifs, documents falsifiés | Moyenne | Élevé (confiance) | vérification manuelle avant publication, SIRET contrôlé (API Sirene, P1), signalement client (P1), suspension admin |
| T6 | Admin | Compte admin compromis | Faible | Critique | MFA obligatoire, sessions courtes, journal d'audit immuable, accès réseau restreint à l'admin (P2) |
| T7 | Paiement (Phase 5) | Webhook forgé, capture erronée, remboursement frauduleux | Moyenne | Critique | signature Stripe, idempotence, réconciliation quotidienne, règles de remboursement côté serveur |
| T8 | Disponibilité | Scraping massif, déni de service applicatif sur la recherche | Moyenne | Moyen | rate limiting, pagination bornée, cache des recherches populaires, CDN |
| T9 | Secrets | Clé Stripe ou service role dans Git ou dans le bundle mobile | Moyenne (erreur humaine) | Critique | gitleaks en CI, secrets par environnement, aucune clé privilégiée côté mobile (uniquement la clé `anon` Supabase, publique par conception) |
| T10 | Vie privée | Journalisation excessive (tokens, PII dans les logs) | Haute | Élevé (RGPD) | redaction pino, revue des logs, pas de body loggé par défaut |
| T11 | Mobile | Reverse engineering du binaire, requêtes rejouées depuis un client modifié | Haute (inévitable) | Faible si serveur autoritaire | Aucune confiance dans le client ; rien de secret dans le bundle ; App Attest / Play Integrity étudiés en P2 |
| T12 | Supply chain | Dépendance compromise | Faible | Élevé | lockfile, `pnpm audit` / OSV en CI, mises à jour hebdomadaires revues, peu de dépendances |

## 7. Tests de sécurité (à intégrer dans la suite d'intégration)

Pour chaque fonctionnalité sensible, un test par question :

- accès à la ressource d'une autre organisation → `404` ;
- modification du `organization_id` ou du `user_id` dans le corps → ignoré, ressource rattachée à l'acteur réel ;
- envoi d'un montant dans une demande de réservation → ignoré, montant recalculé ;
- deux demandes concurrentes sur le même véhicule et les mêmes dates → une seule confirmée ;
- même `Idempotency-Key` deux fois → même ressource, pas de doublon ;
- upload d'un fichier `.exe` renommé `.pdf` → refusé sur les magic bytes ;
- token expiré → `401` sans fuite d'information ;
- agent qui tente de modifier un tarif → `403` ;
- 50 tentatives de connexion → limitation active.

## 8. Journalisation et audit

- Logs applicatifs structurés, sans PII ni secrets, corrélés par `request_id`.
- Table `audit_log` en ajout seul (append-only) pour : changements de rôle, vérifications, suspensions, accès aux documents, transitions de réservation, remboursements. Écrite dans la même transaction que l'action.
- Alertes : taux d'erreurs 5xx, échecs d'authentification anormaux, échecs de webhook, jobs en échec.

## 9. RGPD — ce qui relève de la technique, ce qui relève du juridique

**Technique (prévu)** : consentement tracé (table `consents` avec version du texte), export de données (job asynchrone, fichier signé), suppression/anonymisation, durées de conservation par catégorie (documents de vérification : supprimés après décision + délai ; réservations : conservation comptable), bannière cookies sur le web dès qu'un outil de mesure est ajouté, registre des traitements maintenu dans `SECURITY.md`.

**Juridique (à faire valider par un conseil, hors de mon champ)** : statut de la plateforme (hébergeur vs intermédiaire commercial, surtout avec le paiement), CGU/CGV, durée de conservation précise des documents d'identité, base légale de chaque traitement, obligations KYC/AML qui découlent de Stripe Connect, mentions d'information à l'inscription. Rien dans ce document ne constitue un avis juridique.
