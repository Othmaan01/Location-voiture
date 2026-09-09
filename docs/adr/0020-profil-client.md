# ADR-0020 — Profil client : photo, historique, note donnée par les loueurs

Statut : accepté · Date : 2026-09-09

## Contexte

Le fondateur veut, à la manière d'Airbnb, que le client ait une photo de profil, que son nombre de locations soit visible, et que les agences puissent le noter, la note apparaissant sur son profil. Sans rien retirer de l'existant.

## Décisions

1. **Photo de profil** : envoi signé vers `avatars/<utilisateur>/…` dans le bucket public, confirmation par le moteur qui efface l'ancienne photo. Route `POST /v1/me/avatar/upload-url` puis `POST /v1/me/avatar`.
2. **Chiffres du profil**, calculés par le moteur, jamais saisis : locations terminées, évaluations reçues avec moyenne, année d'arrivée (`memberSince`). Exposés dans `GET /v1/me`.
3. **Note du client par le loueur** : table `customer_reviews`, une note par réservation (unicité sur `booking_id`), seulement après une location terminée, par un membre de l'organisation. Lecture : le client lui-même, les membres de l'organisation, l'équipe plateforme. Le moteur agrège la moyenne et le nombre ; le résumé client d'une réservation (`Booking.customer`) porte `avatarUrl`, `ratingAverage`, `ratingCount`, `reviewedByOrganization`.
4. **Symétrie et modération** : la note est publiée immédiatement, sans réponse du client dans un premier temps ; la modération par l'équipe plateforme et la réponse du client sont notées en dette.

## Conséquences

- Migration `20260909000002_v1_customer_reviews.sql`, routes `POST /v1/bookings/:id/customer-review`, `GET /v1/me/reviews`.
- Écrans : en-tête de profil (`ProfileHero`), carte « Ce que disent les loueurs », fiche réservation loueur avec photo, note et bouton « Noter le client ».
- TECH DEBT : réponse du client à une note, signalement d'une note abusive, ville sur le profil.
