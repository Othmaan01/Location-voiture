# ADR-0018 — États des lieux : croquis, signature à l'écran, PDF envoyé par e-mail

Statut : accepté · Date : 2026-09-09

## Contexte

Le fondateur veut un état des lieux dans l'application : un croquis de voiture générique pour pointer les dommages, une signature à la main sur l'écran, un commentaire, et l'envoi au client par e-mail, l'adresse du loueur étant celle de l'agence.

## Décisions

1. **Un état des lieux est un document signé, jamais modifié après coup.** Table `inspections` : départ ou retour, kilométrage, carburant en huitièmes, dommages (positions relatives 0 à 1 sur le croquis, nature, précision), commentaire, signature du client (traits en coordonnées relatives), auteur, PDF archivé. Lecture : membres de l'organisation, client de la réservation, équipe plateforme.
2. **Le croquis est partagé entre l'app et le PDF** (`CAR_SKETCH` dans les contrats) : mêmes tracés, mêmes proportions, donc les repères tombent au même endroit sur l'écran et sur le papier.
3. **Le PDF est produit par le moteur** avec pdf-lib, sans navigateur ni service tiers, et déposé dans le bucket privé `documents` ; l'app reçoit un lien de lecture d'une heure.
4. **E-mail** : le client reçoit le PDF sur l'adresse de son compte, jamais exposée au loueur ; l'agence est en copie et en adresse de réponse ; le loueur peut ajouter jusqu'à trois adresses. Envoi via Resend derrière une passerelle inerte sans clé : sans envoi possible, le document reste archivé et consultable par les deux parties.
5. **Règles** : réservation confirmée, en cours ou terminée ; pas d'état des lieux de départ sur une location terminée ; signature obligatoire.

## Conséquences

- Migration `20260909000001_v1_inspections.sql`, routes `GET/POST /v1/bookings/:id/inspections`, écran `bookings/[bookingId]/inspection.tsx`, carte « États des lieux » sur la réservation côté loueur et côté client.
- TECH DEBT : photos jointes à chaque dommage ; signature du loueur en plus de celle du client ; domaine d'envoi vérifié chez Resend (aujourd'hui l'expéditeur générique n'atteint que l'adresse du compte Resend).
