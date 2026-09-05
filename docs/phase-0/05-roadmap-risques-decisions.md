# H. Roadmap — I. Risques — J. Décisions à prendre

## H. Roadmap par phases

Chaque phase a un **critère de sortie** vérifiable. On ne passe pas à la suivante sans l'atteindre. Les durées sont indicatives pour une équipe d'un fondateur + moi ; elles servent à ordonner, pas à s'engager.

### Phase 0 — Fondations (2 à 3 semaines)
- Git initialisé, monorepo pnpm/Turborepo, `apps/web` (RentMap déplacé), `apps/api`, `apps/mobile` (squelette), `packages/*`.
- Schéma v1 : migrations, seed, pgTAP de base. Supabase local et staging.
- API : serveur, vérification JWT, module `authz`, erreurs, logs, rate limiting, OpenAPI, tests d'intégration sur Postgres.
- Mobile : navigation, thème depuis `packages/tokens`, client API généré, session sécurisée, écrans squelettes avec états.
- CI : lint, typecheck, tests, build, gitleaks, audit ; déploiement staging automatique.
- Docs racine réécrites (README, ARCHITECTURE, SECURITY, DATABASE, API, DECISIONS, ROADMAP).
- **Sortie** : une PR qui casse un test ne peut pas être fusionnée ; l'app mobile se connecte à l'API staging et affiche un « bonjour » authentifié ; un test IDOR passe au rouge si on retire une ligne d'`authz`.

### Phase 1 — Authentification et profils (2 semaines)
- Inscription, connexion, récupération, vérification e-mail, suppression de compte, profil.
- Organisations : création, membres, invitations, rôles.
- Onboarding client (sans compte) et pro.
- Notifications push : enregistrement des appareils.
- **Sortie** : un pro crée son organisation et invite un agent ; l'agent ne voit rien d'une autre organisation (test) ; suppression de compte fonctionnelle.

### Phase 2 — Espace professionnel et véhicules (3 semaines)
- Agences, véhicules, photos (upload signé, compression, ordre, variantes), tarifs, conditions, publication.
- Documents et workflow de vérification ; admin web minimal (file de vérification, suspension).
- Back-office web : tableau de flotte, édition en masse des tarifs.
- **Sortie** : un pro passe de zéro à « vérifié, 5 véhicules publiés avec photos » en moins de 20 minutes sans aide.

### Phase 3 — Recherche client et fiches (2 semaines)
- Recherche par ville/position/rayon/dates, filtres, tri, liste et carte, fiche véhicule et agence, favoris, devis pour les dates.
- Pages web SEO rebranchées sur l'API v1 avec le filtre par dates.
- **Sortie** : un client trouve en moins de 30 secondes un véhicule disponible à ses dates, avec un prix exact.

### Phase 4 — Disponibilités et réservation (3 semaines)
- Calendrier pro, blocages, state machine, demande de réservation idempotente, acceptation/refus depuis la notification, expiration, annulation, mes réservations, rappels.
- Tests de concurrence et de sécurité sur tout le flux.
- **Sortie MVP** : première réservation réelle confirmée par un vrai loueur. Publication TestFlight / Play interne puis stores.

### Phase 5 — Abonnement loueur (2 à 3 semaines) — redéfinie par ADR-0008
- Stripe Billing rattaché à l'organisation : grille (paliers ou par véhicule), essai, quantité synchronisée avec les véhicules publiés, portail client, factures, quotas serveur.
- **Sortie** : un loueur publie au-delà du quota gratuit après paiement ; la dépublication à l'échec de paiement est non destructive.

### Option future — Paiement en ligne des locations (hors roadmap, sur demande des loueurs, après validation juridique)
- Stripe Connect Express (onboarding loueur, KYC par Stripe), paiement à la confirmation (ou acompte), caution par autorisation manuelle (jusqu'à 30 jours), commission, reversements, remboursements selon conditions d'annulation, réconciliation, factures.
- **Sortie** : un cycle complet réservation → paiement → location → libération de caution → reversement, réconcilié au centime.

### Phase 6 — Communication et notifications (2 à 3 semaines)
- Messagerie client ↔ loueur par réservation, pièces jointes contrôlées, modération, e-mails transactionnels complets, préférences.
- Avis après location terminée, réponse du loueur, modération.

### Phase 7 — Administration et sécurité avancée (2 à 3 semaines)
- Admin complet : utilisateurs, organisations, réservations, litiges, signalements, fraude (règles simples), audit consultable.
- MFA élargie, alertes de connexion, App Attest / Play Integrity, revue de sécurité externe (pentest) avant montée en charge.

### Phase 8 — Optimisation, analytics et scale (continu)
- Analytics produit (entonnoir recherche → demande → confirmation), tableaux de bord pro avancés, performance (cache recherche, CDN images), feature flags, saisonnalité et promotions dans le moteur de prix, livraison, options.

## I. Principaux risques

| # | Risque | Nature | Probabilité | Impact | Mitigation |
|---|---|---|---|---|---|
| R1 | **Pivot non assumé** : construire une marketplace en gardant les réflexes d'annuaire (ou l'inverse) | Produit | Haute si non tranché | Critique | Décision D1 avant tout code |
| R2 | **Démarrage à froid** : sans loueurs, pas de clients ; sans clients, pas de loueurs | Business | Haute | Critique | Concentrer le lancement sur 1 à 2 villes, import assisté de loueurs, pages SEO existantes comme aimant, MVP sans paiement pour abaisser la barrière côté pro |
| R3 | **Statut juridique** : le paiement fait passer d'hébergeur à intermédiaire commercial (obligations, responsabilité, KYC/AML via Stripe) | Réglementaire | Certaine en Phase 5 | Élevé | Conseil juridique avant Phase 5 ; MVP sans paiement ; CGU claires |
| R4 | **Deux frontends** (mobile + web) pour une petite équipe | Technique / capacité | Haute | Moyen | Contrats partagés, web limité au SEO et au back-office, pas de duplication des parcours client sur le web |
| R5 | **Documents d'identité** : fuite = atteinte grave à la vie privée et à la réputation | Sécurité | Faible | Critique | Bucket privé, URLs courtes, journal d'accès, conservation limitée, pentest avant scale |
| R6 | **Double réservation ou prix incohérent** | Technique | Moyenne sans garde-fous | Élevé | Contrainte d'exclusion, verrou, devis figé, tests de concurrence |
| R7 | **Dépendance Supabase** (Auth, Storage) | Technique | Faible | Moyen | SQL standard, stockage S3-compatible, JWT standard : la migration est un projet, pas une réécriture |
| R8 | **Refus store** (suppression de compte, permissions, login Apple, privacy labels) | Distribution | Moyenne | Moyen | Exigences intégrées dès Phase 1 ; vérification des règles à jour avant soumission |
| R9 | **Pro qui contourne la plateforme** après le premier contact | Business | Haute sans paiement | Moyen | Valeur d'outil (calendrier, notifications, réputation), puis paiement et avis en Phase 5–6 |
| R10 | **Sur-ingénierie** par excès de zèle | Technique | Moyenne | Moyen | Monolithe modulaire, un service, pas de Redis/Kafka/microservices sans preuve de besoin ; chaque complexité justifiée dans un ADR |
| R11 | **Dette de tests** si on « ira plus vite sans » | Qualité | Haute | Élevé | Règle : pas de fonctionnalité critique sans test d'intégration ; CI bloquante |
| R12 | **Fraude** : faux loueurs, faux véhicules, cartes volées (Phase 5) | Confiance | Moyenne | Élevé | Vérification manuelle au MVP, SIRET contrôlé, Stripe Radar, signalement |

## J. Décisions à prendre (par vous)

> **Mise à jour 2026-09-05** : D1, D3 et D4 acceptés tels que recommandés. **D2 tranchée différemment** : abonnement mensuel du loueur indexé sur le nombre de véhicules, aucune commission client, aucun paiement de location dans la plateforme (voir [ADR-0008](../adr/0008-monetisation-abonnement-par-vehicule.md)). La Phase 5 devient « Abonnement loueur » ; le paiement en ligne des locations est une option future.


Les décisions D1 à D4 bloquent le démarrage de la Phase 0 technique. Les autres peuvent être prises pendant la Phase 0.

| # | Décision | Ma recommandation | Pourquoi |
|---|---|---|---|
| **D1** | **Pivot** : transformer RentMap (annuaire, abonnement, sans commission) en marketplace transactionnelle, ou garder l'annuaire et ajouter une app mobile ? | **Pivot vers la marketplace**, en gardant le SEO web comme acquisition. | C'est ce que décrit votre brief ; l'annuaire n'a pas de barrière défensive et la valeur (réservation garantie) est ailleurs. Mais c'est un changement de statut juridique et de modèle : à assumer explicitement. |
| **D2** | **Monétisation** : abonnement pro (existant), commission sur réservation (Phase 5), ou hybride ? | **Gratuit pour les pros au lancement** (aucun paywall au MVP), commission à l'arrivée du paiement, abonnement optionnel plus tard pour les outils premium (back-office avancé, mise en avant). | Un paywall à l'inscription tue l'offre au démarrage à froid. Le code Stripe Billing est conservé mais désactivé par feature flag. |
| **D3** | **MVP sans paiement en ligne** (réservation confirmée par le pro, paiement sur place), paiement en Phase 5 ? | **Oui.** | Valide le flux principal 2 à 3 mois plus tôt, repousse la complexité juridique et Stripe Connect. Risque de contournement accepté temporairement. |
| **D4** | **Existe-t-il une base ou un site de production RentMap** avec des données réelles ? | Hypothèse : non. | Si oui, le plan de migration devient additif (voir modèle de données). |
| D5 | **Marché de lancement** : France uniquement, EUR, français ? Quelles 1 à 2 villes pilotes ? | France, EUR, FR ; villes à choisir selon vos contacts loueurs. | Le schéma porte `country_code` et `currency` dès le départ. |
| D6 | **Nom et marque** : RentMap est conservé, ou nouveau nom ? | Sans avis fort ; le nom conditionne les identifiants de bundle, le domaine, Sign in with Apple. À fixer avant Phase 1. | Changer un bundle identifier après publication est pénible. |
| D7 | **Pro sur mobile** : opérations quotidiennes sur mobile + gestion de flotte sur web (recommandé), ou tout sur mobile ? | **Mobile pour l'exploitation, web pour la gestion.** | Un tableau de 100 véhicules ne se gère pas sur un écran de 6 pouces. |
| D8 | **Connexion Apple/Google au lancement** ou en P1 ? | P1, juste après le MVP. | Réduit le périmètre Phase 1 ; à condition de prévoir les identifiants Apple dès D6. |
| D9 | **Hébergement de l'API** : Fly.io (recommandé), Railway ou Render ? | Fly.io région Paris. | Conteneur long-running en Europe, secrets, scale simple. Les trois sont acceptables. |
| D10 | **Budget conseil juridique** avant Phase 5 (statut, CGU/CGV, RGPD documents d'identité) ? | Oui, à prévoir. | Je ne peux pas me substituer à un avis juridique. |
| D11 | **Vérification des loueurs** : manuelle par vous au MVP (recommandé) ou fournisseur KYC dès le départ ? | Manuelle. | Volume faible au lancement, coût nul, apprentissage sur ce qu'il faut automatiser. |

Une fois D1 à D4 tranchées, je passe les ADR au statut « accepté », réécris les documents racine et démarre la Phase 0 technique par : `git init`, monorepo, schéma v1, API avec `authz` et tests, squelette mobile, CI.
