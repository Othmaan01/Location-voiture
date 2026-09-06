# ADR-0014 — Abonnement loueur avec Stripe Billing

Statut : accepté · Date : 2026-09-07

## Contexte

Phase 5 : encaisser l'abonnement loueur (ADR-0008, grille ADR-0011). Le fondateur n'a pas encore de compte Stripe : l'intégration doit être complète, testée, et inerte tant que les clés manquent.

## Décisions

1. **Stripe Billing derrière une passerelle.** Le moteur ne parle à Stripe qu'à travers `BillingGateway` (client, prix, session de paiement, portail, vérification de webhook). Sans `STRIPE_SECRET_KEY`, la passerelle est `null` : la page Abonnement reste consultable, les actions de paiement répondent `503` « bientôt », rien n'est bloqué.
2. **Produits et prix créés à la volée.** Au premier paiement d'une offre, le moteur crée le produit et le prix Stripe à partir de la table `plans` et mémorise `stripe_price_id`. Aucun paramétrage manuel côté Stripe au-delà des clés.
3. **Paiement dans le navigateur.** Checkout Stripe (mode abonnement, essai restant reporté si > 2 jours, codes promo autorisés) ouvert depuis l'app ; retour par lien profond `lv://organizations/<id>/subscription?checkout=success|cancel`. Portail client Stripe pour cartes, factures, résiliation.
4. **Le webhook est la vérité.** `POST /v1/billing/webhook` (corps brut, signature vérifiée, pas d'authentification utilisateur) reflète l'abonnement en base ; le trigger `subscriptions_sync_plan` met à jour le plan de l'organisation, donc le quota de publication. Échec de paiement → notification au loueur. Abonnement résilié ou impayé → bloqueur `subscription_required` sur les nouvelles publications (les véhicules déjà publiés restent en ligne : rétrogradation douce par le trigger de quota).
5. **Essai expiré sans abonnement** : signalé dans l'app, pas encore bloquant (décision commerciale à prendre au lancement).

## Mise en service (à faire par le fondateur)

Créer le compte Stripe, copier la clé secrète et le secret du webhook (endpoint `https://<api>/v1/billing/webhook`, événements `customer.subscription.*`, `invoice.payment_failed`) dans `.env.local`, puis `scripts/fly-set-secrets.sh`. Aucune autre configuration.

## Conséquences

- Dépendance `stripe` côté API, `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` optionnelles, routes `/v1/organizations/:id/subscription/checkout` et `/portal`, `/v1/billing/webhook`.
- TECH DEBT : facturation par véhicule au-delà des paliers (quantité), TVA (Stripe Tax), relances d'essai, tableau admin des abonnements.
