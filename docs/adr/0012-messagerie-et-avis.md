# ADR-0012 — Messagerie client-loueur et avis après location

Statut : accepté · Date : 2026-09-06

## Contexte

« Contacter le loueur » est au cœur du produit (ADR-0009) et le fondateur veut que les messages remplacent la recherche dans la barre du bas. Les avis crédibilisent le feed. Le fondateur est absent : les décisions ci-dessous sont prises par l'équipe technique et restent rééquilibrables.

## Décisions

1. **Fils de discussion.** Un fil par couple client / loueur (`booking_id` nul) et un fil par réservation. Le côté loueur est partagé par tous les membres de l'organisation ; le client voit le nom du loueur, jamais celui d'un employé ; le loueur voit prénom + initiale. Le client peut ouvrir un fil avec tout loueur vérifié (depuis un véhicule, le profil ou une réservation). Le loueur n'écrit qu'à partir d'une réservation : il ne démarche jamais.
2. **Livraison.** Pas de temps réel natif en v1 : le fil ouvert se rafraîchit toutes les 5 s, les listes toutes les 15 s, et chaque message déclenche une notification push (`message.new`, ouvre le fil). Messages immuables (trigger), 2000 caractères, limites de débit (30/min). Le partage de coordonnées n'est pas bloqué : mise en relation pure. TECH DEBT : Supabase Realtime ou WebSocket quand le volume le justifiera.
3. **Avis.** Un avis par réservation **terminée**, dans les **30 jours**, note 1 à 5 et commentaire optionnel ; réponse publique unique du loueur ; masquage par l'administration avec motif (route admin, MFA en production). La note moyenne et le nombre d'avis publiés alimentent le feed et le profil. Le client est invité par notification (`review.request`) au moment du retour du véhicule.
4. **Navigation.** Client : Accueil, Messages, Locations, Favoris, Profil (la recherche reste dans l'en-tête de l'accueil). Loueur : Tableau de bord, Réservations, Véhicules, Messages, Profil (le calendrier est un raccourci du tableau de bord). Pastille rouge sur l'onglet Messages quand il y a du non-lu.

## Conséquences

- Migration `20260907000002_v1_messaging_reviews.sql` (+ correctif cascade du fil sur suppression de réservation), routes `/v1/conversations*`, `/v1/me/conversations`, `/v1/me/unread`, `/v1/bookings/:id/review`, `/v1/loueurs/:id/reviews`, `/v1/reviews/:id/reply`, `/v1/admin/reviews/:id/moderation`.
- TECH DEBT : signalement d'un message ou d'un avis par les utilisateurs (Phase 7), pièces jointes, temps réel.
