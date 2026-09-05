# A. Vision produit — B. MVP — F. User flows et écrans

## A. Vision produit (reformulée)

**Une plateforme de location de véhicules qui met en relation des loueurs professionnels et des clients, avec la qualité d'exécution d'une application de premier rang.**

Trois convictions structurent le produit :

1. **Offre professionnelle uniquement.** Contrairement aux plateformes entre particuliers, chaque véhicule appartient à une entreprise identifiée, vérifiée, assurée. C'est l'argument de confiance côté client et l'argument de sérieux côté loueur.
2. **Un outil métier, pas une vitrine.** Le loueur ne « poste une annonce » : il gère une flotte, un calendrier, des réservations. Un loueur de 100 véhicules doit être aussi à l'aise qu'un loueur de 3.
3. **Local et transactionnel.** Le client cherche près de lui, pour des dates précises, et obtient une réponse ferme : disponible, à ce prix, réservé. Pas une liste de numéros de téléphone.

Ce que ça n'est pas : un agrégateur des majors (Rentalcars, Booking), une plateforme entre particuliers (Getaround), un annuaire (RentMap v0.1).

### Deux expériences

| | Client | Professionnel |
|---|---|---|
| Objectif | Trouver, comparer, réserver un véhicule sans friction et sans doute | Remplir son planning, décider vite, gérer sa flotte sans ressaisie |
| Surface principale | Application mobile | Application mobile (opérations du quotidien) + back-office web (gestion de flotte, tableaux, bulk) |
| Émotion visée | Rassuré, en contrôle | Efficace, en contrôle |

### Où finit RentMap, où commence la marketplace

RentMap v0.1 apporte un actif que la marketplace ne doit pas perdre : les **pages ville SEO** et la **carte publique**. Elles restent l'entonnoir d'acquisition web ; l'application mobile est le lieu de la transaction. Les deux consomment la même API et la même base.

## B. MVP recommandé

### Principe de découpe

Le MVP doit permettre à un vrai loueur de recevoir et confirmer une vraie réservation d'un vrai client, sur mobile, avec des disponibilités et un prix garantis par le serveur. **Le paiement en ligne n'est pas dans le MVP** : il arrive en Phase 5, une fois le flux de réservation validé par l'usage. Justification :

- le paiement marketplace (Stripe Connect, KYC des loueurs, cautions, remboursements, litiges) est le bloc le plus lourd juridiquement et techniquement ; le mettre au lancement retarde la validation du besoin principal de plusieurs mois ;
- une réservation « confirmée par le pro, payée sur place » est déjà un progrès énorme par rapport à un annuaire ;
- le modèle de données et la state machine sont conçus dès le MVP pour accueillir le paiement sans refonte (statuts `payment_pending`, `paid`, montants en centimes, devis figé).

Le risque de cette découpe (no-show client, pro qui contourne la plateforme) est accepté pour le MVP et traité en Phase 5 par l'acompte ou la caution.

### Périmètre P0 (lancement)

**Transverse**
- Compte : inscription e-mail + mot de passe, connexion, réinitialisation, suppression de compte (exigence stores), profil minimal.
- Connexion Apple et Google : P1, mais à prévoir dès l'architecture (Apple exige *Sign in with Apple* dès qu'un autre login tiers est proposé).
- Notifications push : nouvelle demande (pro), réponse à la demande (client), rappels J-1.
- États d'interface complets (chargement, vide, erreur, hors-ligne) sur chaque écran.

**Client**
- Recherche : ville ou position, rayon, dates de début/fin, filtres (catégorie, boîte, énergie, places, prix).
- Résultats en liste et sur carte, triés par pertinence/prix/distance, **filtrés par disponibilité réelle**.
- Fiche véhicule : galerie, caractéristiques, conditions (âge, permis, caution, km inclus), agence, devis pour les dates choisies.
- Demande de réservation : récapitulatif, devis figé côté serveur, message optionnel, confirmation.
- Mes réservations : liste, détail, statut, coordonnées de l'agence une fois confirmé, annulation.
- Favoris.

**Professionnel**
- Onboarding : création de l'organisation (raison sociale, SIRET, adresse), première agence, dépôt des documents de vérification.
- Véhicules : création/édition, photos (ordre, compression, miniatures), tarifs (jour, semaine, mois, week-end, caution, km inclus, km supplémentaire), conditions, publication.
- Disponibilités : calendrier par véhicule, blocages manuels, réservations confirmées visibles.
- Réservations : boîte de réception, accepter/refuser avec motif, détail client, calendrier.
- Tableau de bord : demandes en attente, réservations à venir, taux d'acceptation.
- Membres : inviter un collaborateur (rôle manager ou agent). Une organisation, plusieurs comptes.

**Administration (interne, web, minimal)**
- File de vérification des organisations (documents, décision, motif).
- Suspension d'une organisation ou d'un véhicule.
- Recherche d'un utilisateur, d'une réservation.

### Repoussé volontairement après le MVP

| Fonctionnalité | Priorité | Pourquoi plus tard |
|---|---|---|
| Paiement en ligne, commission, caution, remboursement | P1 (Phase 5) | Bloc juridique et technique lourd ; le flux de réservation doit être validé avant |
| Messagerie client ↔ loueur | P1 | Le MVP utilise des statuts structurés + message libre à la demande + coordonnées après confirmation ; une messagerie temps réel est un domaine à part entière (modération, notifications, pièces jointes) |
| Avis et notes | P1 | Sans réservation terminée, pas d'avis légitime ; à activer après les premières locations complétées |
| Livraison du véhicule, retrait en dehors de l'agence | P2 | Complexifie prix et disponibilités |
| Promotions, codes, fidélité | P2 | Levier de croissance, pas de validation |
| Assurance, options payantes | P2 | Dépend du paiement |
| Location longue durée, abonnement véhicule | P3 | Autre modèle de contrat |
| Multi-pays, multi-devise, multi-langue | P3 | Le schéma porte `currency` et `country_code` dès le début ; l'interface reste FR/EUR |
| Statistiques avancées pro | P2 | Le MVP montre les 4 chiffres qui comptent ; le reste vient avec les données |
| Vérification d'identité automatisée (KYC fournisseur) | P2 | Le MVP vérifie manuellement les documents en admin |
| Anti-fraude automatisé | P2 | Architecture prête (événements, audit), règles plus tard |

## F. User journeys

### Parcours client

```
Découverte           Recherche                 Décision                 Réservation                  Location
─────────            ─────────                 ────────                 ───────────                  ────────
Store / SEO ville →  Ville ou position      →  Fiche véhicule        →  Récapitulatif + devis     →  Rappel J-1
Onboarding 3 écrans  Dates                     Galerie, conditions      Compte requis ici            Coordonnées agence
(sans compte)        Filtres                   Devis pour mes dates     Message optionnel            Retrait sur place
                     Liste ⇄ Carte             Agence, vérifiée         Envoi → "en attente"         Retour
                     Favori                                             Push : confirmée / refusée   Avis (post-MVP)
```

Règles UX :
- **Aucun compte requis avant la demande de réservation.** On ne demande une inscription qu'au moment où elle a une valeur pour l'utilisateur.
- **Les dates sont saisies tôt** (barre de recherche) et persistent : chaque prix affiché est un prix pour *ces* dates, pas un « à partir de ».
- **Le devis affiché est celui qui sera réservé.** Il est calculé côté serveur, figé avec une durée de validité, et la demande de réservation référence ce devis. Si le prix a changé, l'application le dit et redemande confirmation.
- La localisation n'est demandée qu'au tap sur « Autour de moi », jamais au lancement.

### Parcours professionnel

```
Acquisition          Onboarding                     Mise en ligne                Exploitation
───────────          ──────────                     ─────────────                ────────────
Page /pro (web) →    Compte                      →  Véhicule 1                →  Push : nouvelle demande
Bouche à oreille     Organisation (SIRET…)          Photos, tarifs, conditions   Accepter / refuser en 2 taps
Import assisté       Agence (adresse, horaires)     Calendrier                   Calendrier du jour
                     Documents (Kbis, assurance)    Publication                  Blocage rapide d'un véhicule
                     → "en cours de vérification"   (visible dès vérification)   Inviter un collaborateur
                                                                                 Back-office web pour la flotte
```

Règles UX :
- **Le pro peut tout préparer avant d'être vérifié** (véhicules en brouillon). La vérification ne bloque que la publication. Zéro temps mort.
- **La décision sur une demande se prend depuis la notification**, avec les 5 informations utiles (véhicule, dates, montant, client, ancienneté du compte), sans navigation.
- **Le calendrier est la vue centrale du pro**, pas la liste de véhicules. Un loueur pense en planning.
- Les opérations de masse (tarifs sur 20 véhicules, blocage d'une catégorie pour un week-end) sont conçues pour le **back-office web** dès la Phase 2, pas pour le mobile.

## Écrans nécessaires au MVP

### Mobile — client (≈ 22 écrans)

| Zone | Écrans |
|---|---|
| Onboarding | Splash, 3 écrans de valeur, choix « je cherche un véhicule / je suis loueur » |
| Auth | Connexion, inscription, mot de passe oublié, code de vérification, (Apple/Google en P1) |
| Recherche | Accueil-recherche, sélecteur de lieu, sélecteur de dates, filtres (sheet), résultats liste, résultats carte, fiche véhicule, galerie plein écran, fiche agence |
| Réservation | Récapitulatif + devis, confirmation d'envoi, liste des réservations, détail réservation, annulation |
| Compte | Profil, favoris, notifications, paramètres, suppression de compte, mentions légales |

### Mobile — professionnel (≈ 18 écrans)

| Zone | Écrans |
|---|---|
| Onboarding | Organisation, agence, documents, statut de vérification |
| Tableau de bord | Vue du jour (demandes, départs, retours) |
| Réservations | Boîte de réception, détail, accepter/refuser (sheet avec motif), calendrier |
| Flotte | Liste véhicules (recherche, filtres, statut), fiche véhicule, édition (caractéristiques, photos, tarifs, conditions), disponibilités du véhicule |
| Organisation | Membres, invitation, agences, paramètres, notifications |

### Web (Next.js, existant, à faire évoluer)

| Zone | État |
|---|---|
| Public SEO : accueil, ville, agence, véhicule, recherche | Existant, à rebrancher sur l'API v1 et le filtre par dates |
| Back-office pro : flotte en tableau, bulk tarifs, calendrier multi-véhicules, membres, exports | Phase 2, nouveau |
| Admin interne : vérifications, suspensions, recherche | Phase 2 (minimal) puis Phase 7 |
