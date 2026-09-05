# Feuille de route

Ce qui est fait, ce qui manque, et dans quel ordre l'aborder.

---

## Fait — le socle (v0.1)

- [x] Schéma PostgreSQL + PostGIS complet : profils, villes, agences, véhicules, indisponibilités, demandes, avis, favoris, abonnements
- [x] Row Level Security sur toutes les tables + buckets Storage
- [x] Quotas d'abonnement appliqués par triggers en base
- [x] Authentification deux rôles (Pro / Client) + middleware de protection
- [x] Recherche cartographique : carte MapLibre avec clustering, filtres, tri, pagination
- [x] Pages publiques : accueil, recherche, ville, agence, véhicule, villes, tarifs, espace pro
- [x] SEO : pages ville pré-générées, JSON-LD, sitemap dynamique, robots
- [x] Formulaire de contact (lead) avec anti-spam
- [x] Tableau de bord pro : vue d'ensemble, CRUD véhicules, demandes reçues, fiche agence, abonnement
- [x] Stripe : checkout, portail client, webhook, synchronisation des paliers
- [x] Design system (tokens, primitives) et 46 villes françaises en données de démonstration
- [x] Configuration Netlify + CI GitHub Actions

---

## Priorité 1 — indispensable avant d'ouvrir à de vrais loueurs

1. **Téléversement des photos.** Les buckets Supabase Storage et leurs policies existent déjà ; il manque le composant d'upload (glisser-déposer, redimensionnement, ordre des photos). C'est le manque le plus visible aujourd'hui : une fiche sans photo ne convertit pas.
2. **Notifications par e-mail.** Prévenir le pro à chaque nouvelle demande, et accuser réception auprès du client. Fournisseur suggéré : Resend. Sans cela, un pro doit se connecter pour découvrir ses demandes.
3. **Mentions légales et CGU réelles.** Les pages existent en modèle. À faire relire — notamment le statut de « simple hébergeur de petites annonces » plutôt que d'intermédiaire.
4. **Bannière de consentement cookies.** Obligatoire dès qu'un outil de mesure d'audience est ajouté.
5. **Import initial de loueurs.** Un annuaire vide ne convertit personne. Pré-remplir les fiches des agences les plus visibles par ville (statut `draft`, non publié) puis les inviter à les revendiquer.

## Priorité 2 — qualité et conversion

6. **Disponibilités réelles.** La table `vehicle_unavailability` existe mais n'est ni éditée ni filtrée. Ajouter un calendrier dans le tableau de bord et un filtre par dates dans la recherche.
7. **Favoris côté client.** La table existe, l'interface (bouton cœur) reste à brancher.
8. **Avis clients.** Le modèle et le calcul de note sont en place ; il manque le formulaire de dépôt et la modération.
9. **Recherche par adresse libre.** Brancher `api-adresse.data.gouv.fr` (gratuit, sans clé) pour accepter « 12 rue de la Paix » et pas seulement une ville.
10. **Statistiques pro.** Vues par véhicule, taux de contact, comparaison mensuelle — c'est ce qui justifie le renouvellement de l'abonnement.

## Priorité 3 — croissance

11. **Revendication de fiche.** Un loueur pré-référencé prouve son identité (SIRET, e-mail du domaine) et récupère sa fiche.
12. **Pages ville × catégorie.** `/location-voiture/lyon/utilitaire` : multiplie la surface SEO par le nombre de catégories.
13. **Espace administrateur.** Modération des fiches, vérification des agences, statistiques globales.
14. **Facturation annuelle.** Les prix annuels existent dans `plans.ts` ; il manque les prix Stripe correspondants et le sélecteur mensuel/annuel.
15. **Application mobile.** Expo, en réutilisant l'API Supabase et les mêmes règles RLS.

---

## Dette technique connue

- `src/types/database.ts` est écrit à la main. Le remplacer par `npm run db:types` dès que la base tourne.
- Le client Supabase n'est pas typé avec le générique `Database` (choix assumé pour garantir un build vert sans base). À rétablir après régénération des types.
- Aucun test automatisé. Commencer par les triggers de quota (le point le plus critique du modèle économique), puis les Server Actions.
- Pas de journalisation ni de suivi d'erreurs en production. Sentry est le candidat naturel.
- Le fond de carte est fixé en clair ; le mode sombre attend un style de carte assorti.
