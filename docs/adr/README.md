# Architecture Decision Records

Une décision structurante par fichier. Format : contexte, options, décision, conséquences. Statut : `proposé` → `accepté` → éventuellement `remplacé par ADR-xxxx`.

| ADR                                                           | Titre                                                                                              | Statut                           |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------- |
| [0001](./0001-pivot-annuaire-vers-marketplace.md)             | Pivot de l'annuaire RentMap vers une plateforme de réservation                                     | accepté                          |
| [0002](./0002-monorepo-mobile-expo-web-nextjs-api-dediee.md)  | Monorepo : mobile Expo, web Next.js, API dédiée Fastify                                            | accepté                          |
| [0003](./0003-supabase-conserve-api-autorite.md)              | Supabase conservé (Postgres, Auth, Storage) ; l'API est l'autorité, RLS en défense en profondeur   | accepté                          |
| [0004](./0004-montants-en-centimes.md)                        | Montants monétaires en entiers (centimes) + devise                                                 | accepté                          |
| [0005](./0005-reservation-contrainte-exclusion-devis-fige.md) | Réservation : contrainte d'exclusion, verrou par véhicule, devis figé, idempotence                 | accepté                          |
| [0006](./0006-mvp-sans-paiement-stripe-connect-phase-5.md)    | MVP sans paiement en ligne ; Stripe Connect en option future                                       | accepté partiellement, voir 0008 |
| [0007](./0007-roles-plateforme-et-roles-organisation.md)      | Deux familles de rôles : plateforme et organisation ; matrice de permissions serveur               | accepté                          |
| [0008](./0008-monetisation-abonnement-par-vehicule.md)        | Monétisation : abonnement loueur indexé sur le nombre de véhicules, aucune commission client       | accepté                          |
| [0009](./0009-direction-produit-et-design-validee.md)         | Direction produit et interface validée : feed de loueurs, mise en relation pure, mode nuit premium | accepté                          |
| [0010](./0010-siren-siret-suppressions-verrouillage.md)       | SIREN par organisation, SIRET par agence ; politique de suppression ; verrouillage Face ID         | accepté                          |
| [0011](./0011-modes-personnalisation-abonnement.md)           | Un compte, trois espaces ; personnalisation des espaces pro ; grille d'abonnement provisoire       | accepté                          |
| [0012](./0012-messagerie-et-avis.md)                          | Messagerie client-loueur (fils, non-lus, push) et avis après location (note, réponse, modération)  | accepté                          |
| [0013](./0013-signalements-litiges-mfa.md)                    | Signalements, litiges (ouverture, résolution par la plateforme) et double authentification TOTP    | accepté                          |
