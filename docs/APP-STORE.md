# Publication sur l'App Store — dossier prêt à remplir

Tout ce que Apple demande, déjà rédigé. Ce qui reste à faire côté humain est marqué **À FAIRE**.

## Identité technique

| Élément               | Valeur                                                        |
| --------------------- | ------------------------------------------------------------- |
| Nom de l'app          | KARSON                                                        |
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

KARSON met en relation les particuliers et les loueurs professionnels vérifiés, partout en France. Vous réservez en trois minutes, vous payez le loueur directement, sans commission ajoutée.

Pourquoi l'application

- Des loueurs professionnels vérifiés : SIREN contrôlé, documents vérifiés par notre équipe.
- Aucune commission, ni pour vous, ni pour le loueur. Le prix affiché est le prix payé.
- Le paiement se fait auprès du loueur, y compris en espèces s'il l'accepte, dans la limite légale.
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
**URL d'assistance** : https://karson.fr/contact
**URL de politique de confidentialité** : https://karson.fr/confidentialite
**URL marketing** : https://karson.fr

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

## Compte Apple et identifiants (fait le 7 septembre 2026)

| Élément                              | Valeur                                                         |
| ------------------------------------ | -------------------------------------------------------------- |
| Programme                            | Apple Developer Program, personne physique, jusqu'au 8/09/2027 |
| Identifiant d'équipe                 | `N7L9C827XP`                                                   |
| Identifiant Apple du compte          | `bbelhamid@outlook.com`                                        |
| Clé API App Store Connect            | nom `EAS Build`, rôle Admin, identifiant `5GNSU7B7TG`          |
| Émetteur de la clé                   | `4b43fcd1-8820-4c8b-952a-f0a2cf09908b`                         |
| Fichier de la clé (jamais commité)   | `~/.appstoreconnect/private_keys/AuthKey_5GNSU7B7TG.p8`        |
| Identifiant de l'app chez Apple      | `fr.locationvoiture.app`, enregistré, notifications activées   |
| Certificat et profil de distribution | créés par EAS, valables jusqu'au 7/09/2027                     |

La clé API évite les codes à six chiffres. Commande de compilation :

```bash
cd apps/mobile && export EXPO_ASC_API_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_5GNSU7B7TG.p8" \
  EXPO_ASC_KEY_ID=5GNSU7B7TG EXPO_ASC_ISSUER_ID=4b43fcd1-8820-4c8b-952a-f0a2cf09908b \
  EXPO_NO_CAPABILITY_SYNC=1 && npx eas build --platform ios --profile production
```

`EXPO_NO_CAPABILITY_SYNC=1` contourne un défaut de l'API Apple sur la synchronisation des capacités ; les capacités se règlent à la main sur la fiche de l'identifiant.

## Étapes restantes

1. **À FAIRE (Othman)** — Clé de notifications push. La création via la ligne de commande exige une authentification personnelle avec code à six chiffres, qui n'aboutit pas sur ce compte (aucun appareil connecté à l'identifiant `@outlook.com`). Méthode sans code : developer.apple.com, _Certificates, Identifiers & Profiles_, _Keys_, bouton **+**, cocher _Apple Push Notifications service_, télécharger le fichier `.p8`, puis `npx eas credentials` pour le remettre à Expo. Sans cette clé, l'application fonctionne mais n'envoie pas de notifications.
2. **À FAIRE** — Créer l'app dans App Store Connect (ou laisser `eas submit` la créer), puis envoyer la version : `npx eas submit --platform ios --latest`.
3. **À FAIRE** — Captures d'écran 6,7 pouces, au moins trois.
4. **À FAIRE** — Remplir la fiche avec les textes ci-dessus, coller les identifiants du compte de démonstration, puis soumettre à la revue.

## Point d'attention

L'application compilée pointe aujourd'hui vers l'API de préproduction (`location-voiture-api-staging`). Avant la mise en vente publique, il faut une base et une API de production séparées, et remplacer `EXPO_PUBLIC_API_URL` dans `apps/mobile/eas.json`.
