# Sécurité

Référence : [docs/phase-0/03-securite.md](docs/phase-0/03-securite.md) (rôles, threat model, données sensibles, tests).

## Règles non négociables

- Aucune confiance dans le client : identifiants, rôles, montants, organisation sont revérifiés côté API.
- Autorisation centralisée : `apps/api/src/shared/authz.ts` + matrice `packages/contracts/src/permissions.ts`. Ressource d'une autre organisation → `404`.
- Secrets uniquement en variables d'environnement (Fly, EAS, Netlify, GitHub Environments). `gitleaks` bloque la CI.
- Le mobile n'embarque que des valeurs publiques (`EXPO_PUBLIC_*`). Session dans Keychain/Keystore (`expo-secure-store`).
- Logs structurés avec redaction (`authorization`, tokens, e-mail, téléphone, SIRET).
- Documents d'identité et professionnels : bucket privé, URL signées courtes émises par l'API, accès journalisé (`document_access_log`).
- Montants : entiers en centimes (ADR-0004).
- Créations idempotentes (`Idempotency-Key`) dès la Phase 4.
- Verrouillage local optionnel (Face ID / Touch ID / code de l'appareil via `expo-local-authentication`) : protège l'écran, pas la session ; aucun code maison stocké (ADR-0010).
- Administration : rôle plateforme obligatoire ; MFA (session `aal2`) exigée par défaut en production (`API_ADMIN_REQUIRE_MFA`). **TECH DEBT** : le staging la désactive tant que l'app mobile ne propose pas l'enrôlement d'un second facteur ; à livrer avant l'ouverture de la production.

## Signaler une vulnérabilité

Écrire à l'adresse de contact du dépôt (à définir avant le lancement public). Ne pas ouvrir d'issue publique.

## Registre des traitements (RGPD) — à compléter avant lancement

| Traitement          | Données                                | Base légale (à valider)       | Conservation                    |
| ------------------- | -------------------------------------- | ----------------------------- | ------------------------------- |
| Compte client       | e-mail, nom, téléphone                 | contrat                       | durée du compte + anonymisation |
| Réservation         | dates, véhicule, montant affiché       | contrat                       | obligations comptables          |
| Vérification loueur | Kbis, assurance, identité du dirigeant | obligation / intérêt légitime | décision + délai court          |
