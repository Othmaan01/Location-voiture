# Décisions

Index des ADR : [docs/adr/README.md](docs/adr/README.md). Décisions produit tranchées le 2026-09-05 :

- **D1** Pivot de l'annuaire vers une plateforme de réservation ; le SEO web reste l'acquisition (ADR-0001).
- **D2** Abonnement loueur indexé sur le nombre de véhicules, aucune commission client, aucun paiement de location dans la plateforme (ADR-0008). Grille exacte à fixer avant la Phase 2.
- **D3** MVP sans paiement en ligne (ADR-0006, partiellement).
- **D4** Aucune donnée de production : schéma v1 réécrit, v0 archivé.

Décisions du 2026-09-06 après tests sur iPhone (ADR-0010) :

- **D5** SIREN sur l'organisation, SIRET sur chaque agence, cohérence imposée ; annuaire officiel en aide à la saisie.
- **D6** Suppressions : le serveur tranche (supprimé sans historique, archivé sinon ; organisation refusée avec historique de réservations).
- **D7** Verrouillage Face ID / code de l'appareil, sans code maison.
- **D8** Voitures uniquement au lancement : utilitaires et minibus masqués dans l'app, conservés dans le moteur.
- **D9** Un seul compte, plusieurs **modes** (client / loueur / admin) choisis à l'inscription et basculables depuis le profil, chacun avec son accueil et sa barre (à construire, lot suivant).
- **D10** Grille d'abonnement provisoire à afficher avant Stripe (Phase 5) : Starter 1–3 véhicules, Pro 4–10, Business 11–30, Flotte sur devis, 14 jours d'essai ; prix fixés par l'équipe technique sur étude de rentabilité, rééquilibrables.

Décisions ouvertes : marché pilote et villes, nom de marque et identifiants de bundle (actuellement `fr.locationvoiture.app`, provisoire), connexion Apple/Google (P1), hébergeur API (Fly.io proposé), conseil juridique, grille d'abonnement.
