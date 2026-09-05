# ADR-0009 — Direction produit et interface validée : feed de loueurs, mise en relation pure, mode nuit premium

Statut : accepté · Date : 2026-09-06

## Contexte
Les premières maquettes (claires, ambre, recherche-first) ont été jugées trop proches des plateformes existantes. Le fondateur a validé le 2026-09-06 une direction précise sur maquettes.

## Décision — produit
- **Mise en relation pure.** La plateforme n'encaisse jamais le client. Le prix affiché est celui du loueur. Sur un véhicule, deux actions seulement : **Demander une réservation** et **Contacter le loueur**.
- **Accueil = feed de loueurs** avec onglets (Tous, Près de moi, Premium, Utilitaires, Nouveaux). Chaque carte ouvre le **profil du loueur** : en-tête (note, nombre de véhicules, taux et délai de réponse), boutons Contacter / Itinéraire, onglets Véhicules / Avis / Infos, **grille de véhicules avec prix** et bouton d'action par véhicule ouvrant une feuille avec les deux actions.
- **Suivi de location** pour le client : compte à rebours, progression, frise demande → confirmée → retiré → retour, actions Appeler / Itinéraire / Prolonger.
- **Barre de navigation** client : Accueil, Explorer, Locations, Favoris, Profil.
- « Contacter le loueur » est central : le contact (appel + message simple) entre dans le MVP ; la messagerie complète reste en Phase 6.

## Décision — interface
- **Mode nuit uniquement**, premium : noirs étagés (`#08080a`, `#0e0e11`, `#16161a`, `#1e1e24`, `#26262d`), texte blanc chaud `#f4f2ee`, rouge d'accent `#e3243b` (teinte `#ff5c6d`, fond `#2a1216`), police **Manrope**.
- **Barre d'onglets en capsule flottante** : détachée des bords, entièrement arrondie, icônes seules (libellés accessibles), onglet actif en pastille rouge, fond translucide avec flou fort, toujours visible pendant le défilement.
- Maquettes de référence : artefact « Location Voiture — écrans MVP » (10 écrans, client et pro).

## Conséquences
- `packages/tokens` passe à la palette nuit et à Manrope avant tout écran ; les composants de base (capsule, cartes, feuilles, badges, frise) sont construits en Phase 1.
- Le modèle de données v1 reste valable ; l'extension de location (« Prolonger ») est une transition supplémentaire de la réservation, prévue après le MVP.
- La roadmap est réordonnée : le feed et le profil loueur deviennent le cœur de la Phase 3, le contact et le suivi de location entrent dans la Phase 4.
