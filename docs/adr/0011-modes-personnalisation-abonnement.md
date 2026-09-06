# ADR-0011 — Un compte, trois espaces ; personnalisation des espaces pro ; grille d'abonnement provisoire

Statut : accepté · Date : 2026-09-06

## Contexte

Le fondateur veut des espaces distincts et bien rangés pour le client, le loueur et l'admin, choisis dès l'inscription, sans surcharger chaque écran (D9). Il veut aussi que les loueurs personnalisent leur vitrine (D9 bis) et que l'abonnement soit visible avant même le paiement (D10).

## Décisions

1. **Un seul compte, trois modes.** Le mode (`client`, `pro`, `admin`) est un confort d'affichage : choisi à l'inscription (`profiles.preferred_mode`, valeurs `client` | `pro`), mémorisé sur l'appareil et sur le compte, basculable depuis le profil. Il n'est **jamais** une autorisation : le serveur revérifie appartenances et rôles à chaque appel (ADR-0007). Le mode admin n'est proposé qu'aux rôles plateforme et ne se choisit pas à l'inscription.
2. **Une seule barre à onglets, trois capsules.** Un navigateur unique déclare tous les onglets ; la capsule n'affiche que ceux du mode courant, un garde ramène à l'accueil du mode. Client : Accueil, Explorer, Locations, Favoris, Profil. Loueur : Tableau de bord, Réservations, Véhicules, Calendrier, Profil. Admin : Vérifications, Loueurs, Profil. Les écrans loueur sont des vues réutilisées (routes profondes et onglets partagent le même code).
3. **Personnalisation.** Organisation : logo, bannière, présentation (600 caractères), site, accent parmi **quatre** teintes (rouge, or, bleu, vert) pour préserver l'unité du mode nuit. Agence : photo et présentation. Images via URL signée puis confirmation, dans le bucket public des photos sous `branding/<organisation>/`.
4. **Grille provisoire (D10).** Starter 1–3 véhicules 29 €, Pro 4–10 79 €, Business 11–30 179 €, Flotte 31+ sur devis ; 14 jours d'essai ; prix HT. Fondement : coût marginal quasi nul par loueur, logiciels de gestion de flotte à 30–100 €/mois sur le marché, ~6–10 € par véhicule et par mois décroissants. Rééquilibrable sans migration. `starter` devient l'offre par défaut avec `trial_ends_at` ; l'ancienne offre `free` est désactivée. Le changement d'offre et le paiement arrivent en Phase 5 ; l'expiration d'essai n'est **pas** encore appliquée (TECH DEBT volontaire).

## Conséquences

- Migration `20260907000001_v1_modes_branding_plans.sql`, routes `PATCH /v1/me` (`preferredMode`), `.../branding`, `.../agencies/:id/photo`, `GET /v1/plans`, `GET /v1/organizations/:id/subscription`, `GET /v1/admin/organizations`.
- TECH DEBT : appliquer l'expiration d'essai (dépublication douce) avec Stripe (Phase 5) ; signalements et litiges pour l'admin (Phase 7).
