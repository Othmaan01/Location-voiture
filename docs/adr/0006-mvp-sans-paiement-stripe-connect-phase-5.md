# ADR-0006 — MVP sans paiement en ligne ; Stripe Connect en Phase 5

Statut : accepté (partiellement) · Date : 2026-09-05 · Voir ADR-0008 : le paiement en ligne des locations devient une option future ; seule la partie « MVP sans paiement en ligne » est acceptée

## Contexte

Le paiement marketplace implique Stripe Connect (comptes loueurs, KYC), cautions, remboursements, litiges, commission, factures, et un changement probable de statut juridique. C'est le bloc le plus lourd du projet.

## Options

- Paiement dès le MVP.
- MVP « réservation confirmée par le pro, paiement sur place », paiement en Phase 5.

## Décision

Option 2. Le flux réservation est validé par l'usage avant d'y attacher l'argent. Le modèle de données est prêt dès le MVP (`payment_status`, montants en centimes, `stripe_account_id`, `commission_bps`, devis figé).

En Phase 5 : Stripe Connect **Express** (Stripe porte le KYC et l'interface de reversement), PaymentIntent à la confirmation, **caution par autorisation manuelle** (`capture_method: manual`, autorisations étendues jusqu'à 30 jours pour les locations longues, sinon renouvellement), commission via `application_fee_amount`, remboursements pilotés par les conditions d'annulation côté serveur, webhooks signés et idempotents, réconciliation quotidienne.

Nous ne stockons jamais de données de carte ni d'IBAN.

## Conséquences

- Risque temporaire de contournement de la plateforme et de no-show, accepté.
- Validation juridique (statut, CGV, KYC/AML) requise avant la Phase 5.
