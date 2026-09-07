# Publication sur l'App Store — dossier prêt à remplir

Tout ce que Apple demande, déjà rédigé. Ce qui reste à faire côté humain est marqué **À FAIRE**.

## Identité technique

| Élément               | Valeur                                                        |
| --------------------- | ------------------------------------------------------------- |
| Nom de l'app          | Location Voiture                                              |
| Identifiant du paquet | `fr.locationvoiture.app`                                      |
| Version               | 0.1.0 (numéro de build géré automatiquement par EAS)          |
| Compte Expo           | `othmanb`, projet `@othmanb/location-voiture`                 |
| Chiffrement           | Aucun chiffrement non exempté (déclaré dans la configuration) |
| Langue principale     | Français (France)                                             |

## Fiche du magasin

**Sous-titre (30 caractères max)**
Louez chez un pro, sans frais

**Texte promotionnel (170 caractères max)**
Des loueurs professionnels vérifiés partout en France. Zéro commission, paiement en agence, réservation en trois minutes.

**Description**

Location Voiture met en relation les particuliers et les loueurs professionnels vérifiés, partout en France. Vous réservez en trois minutes, vous payez le loueur directement, sans commission ajoutée.

Pourquoi l'application

- Des loueurs professionnels vérifiés : SIREN contrôlé, documents vérifiés par notre équipe.
- Aucune commission, ni pour vous, ni pour le loueur. Le prix affiché est le prix payé.
- Le paiement se fait auprès du loueur, y compris en espèces s'il l'accepte.
- Les offres du moment et les nouveautés des loueurs, en un coup d'œil.
- Une messagerie directe avec l'agence, et vos réservations suivies de bout en bout.

Pour les loueurs professionnels

- Publiez votre flotte, vos tarifs et vos agences en quelques minutes.
- Recevez les demandes, confirmez, suivez départs et retours depuis un tableau de bord.
- Lancez des offres temporaires et publiez des stories pour vous faire voir.
- Abonnement mensuel selon le nombre de véhicules publiés, sans commission sur vos locations.

Mariage, déménagement, week-end, voiture immobilisée : trouvez le bon véhicule près de chez vous, chez un professionnel.

**Mots-clés (100 caractères max)**
location voiture,louer,agence,auto,véhicule,utilitaire,réservation,loueur,sans commission

**Catégorie** : Voyage (principale), Style de vie (secondaire)
**Classification par âge** : 4+
**URL d'assistance** : https://location-voiture-web-staging.fly.dev/contact
**URL de politique de confidentialité** : https://location-voiture-web-staging.fly.dev/confidentialite
**URL marketing** : https://location-voiture-web-staging.fly.dev

## Confidentialité (questionnaire App Store)

| Donnée                  | Collectée | Usage                                    | Liée à l'identité | Suivi publicitaire |
| ----------------------- | --------- | ---------------------------------------- | ----------------- | ------------------ |
| Adresse e-mail          | Oui       | Fonctionnement de l'app, compte          | Oui               | Non                |
| Nom, téléphone          | Oui       | Fonctionnement de l'app, réservation     | Oui               | Non                |
| Position approximative  | Oui       | Fonctionnement de l'app (à proximité)    | Non               | Non                |
| Photos envoyées         | Oui       | Contenu utilisateur (véhicules, stories) | Oui               | Non                |
| Identifiants d'appareil | Oui       | Notifications push                       | Oui               | Non                |
| Historique d'achat      | Non       | —                                        | —                 | —                  |

Aucun traceur publicitaire, aucun partage avec des courtiers en données.

## Notes pour l'équipe de revue

À coller dans « App Review Information » :

> L'application fonctionne sans compte pour parcourir les loueurs et les véhicules. Un compte est nécessaire pour réserver et pour l'espace professionnel. Un compte de démonstration est fourni ci-dessous, avec un loueur vérifié, des véhicules, une offre en cours et une story. Le paiement se fait hors application, directement auprès du loueur : l'application ne vend aucun bien ou service numérique.

**À FAIRE** : créer le compte de démonstration et coller ses identifiants dans App Store Connect.

## Étapes restantes

1. **À FAIRE (Othman)** — Créer l'app dans App Store Connect : nom, identifiant `fr.locationvoiture.app`, langue française.
2. **À FAIRE (Othman)** — Lancer la compilation : `npx eas build --platform ios --profile production` depuis `apps/mobile`, en se connectant avec l'identifiant Apple du compte développeur.
3. **À FAIRE** — Envoyer la version : `npx eas submit --platform ios --latest`.
4. **À FAIRE** — Captures d'écran 6,7 pouces (au moins trois) et 6,5 pouces si demandé.
5. **À FAIRE** — Remplir la fiche avec les textes ci-dessus, puis soumettre à la revue.

## Point d'attention

L'application compilée pointe aujourd'hui vers l'API de préproduction (`location-voiture-api-staging`). Avant la mise en vente publique, il faut une base et une API de production séparées, et remplacer `EXPO_PUBLIC_API_URL` dans `apps/mobile/eas.json`.
