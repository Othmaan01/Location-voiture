# ADR-0019 — Inscription par le moteur, type de compte fixé à la création

Statut : accepté · Date : 2026-09-09

## Contexte

L'envoi d'e-mails de confirmation par Supabase échouait (« Error sending confirmation email »), bloquant toute création de compte. Par ailleurs le fondateur veut que le type de compte, client ou loueur, se choisisse uniquement à l'inscription.

## Décisions

1. **`POST /v1/auth/signup`** : le moteur crée le compte avec la clé de service, déjà confirmé, puis l'app se connecte avec le mot de passe. Limité à 10 inscriptions par heure et par adresse IP. La règle de mot de passe est partagée : 8 caractères, une lettre, un chiffre.
2. **Le type de compte ne change plus après l'inscription.** `preferred_mode` est écrit à la création et retiré des mises à jour de profil ; le moteur refuse la création d'une organisation à un compte client ; l'app n'affiche plus de bascule client/loueur, seule l'équipe plateforme garde le passage en Admin.
3. **Avant le lancement public** : vérification de l'adresse par un e-mail envoyé via Resend depuis le domaine de la marque, en gardant le même point d'entrée.

## Conséquences

- Comptes existants créés avec un mode : inchangés. Un utilisateur voulant les deux rôles crée deux comptes.
- TECH DEBT : e-mail de vérification, captcha si abus constaté sur l'inscription.
