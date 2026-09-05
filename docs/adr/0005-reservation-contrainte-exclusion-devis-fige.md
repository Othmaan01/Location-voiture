# ADR-0005 — Réservation : contrainte d'exclusion, verrou par véhicule, devis figé, idempotence

Statut : accepté · Date : 2026-09-05

## Contexte

La réservation est le domaine critique : double réservation, conditions de concurrence, prix modifié pendant le parcours, requêtes rejouées sur réseau mobile instable.

## Décision

1. **Contrainte d'exclusion Postgres** (`btree_gist`) sur `bookings (vehicle_id, period)` pour les statuts `confirmed` et `active` : deux réservations fermes ne peuvent jamais se chevaucher, quel que soit le code.
2. **Verrou par véhicule** (`select … for update` sur la ligne `vehicles`) dans la transaction de confirmation, avec re-vérification des blocages manuels.
3. **Devis figé** : le client obtient un `quote_id` (lignes, total, expiration ≈ 15 min) ; la demande de réservation référence ce devis ; le serveur recalcule et compare ; le client ne transmet jamais un montant.
4. **Idempotence** : en-tête `Idempotency-Key` obligatoire sur toute création ; réponse mémorisée 24 h ; un retry renvoie la même ressource.
5. **State machine explicite** en code (`requested → confirmed → active → completed`, plus `declined / expired / cancelled / no_show / disputed`), transitions autorisées par état et par type d'acteur, journal `booking_events` écrit dans la même transaction.

## Conséquences

- Les demandes `requested` peuvent se chevaucher (le pro arbitre) ; la contrainte n'agit qu'à la confirmation.
- Tests obligatoires : concurrence (deux confirmations simultanées), idempotence, manipulation de montant, transitions interdites.
- La Phase 5 ajoute des états de paiement sans changer la structure.
