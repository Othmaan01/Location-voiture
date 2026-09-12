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

## Compte administrateur (fait le 9 septembre 2026)

- Le rôle plateforme (`platform_roles`, valeurs `support`, `admin`, `superadmin`) n'est **jamais** écrit par l'application ni par l'API : seule une requête SQL avec la clé de service peut l'attribuer. La table est protégée par RLS (lecture de sa propre ligne uniquement, aucune écriture).
- Le mode Admin de l'application n'apparaît que si le serveur renvoie un rôle plateforme ; il ne se choisit pas à l'inscription (`PreferredModeSchema` ne connaît que `client` et `pro`).
- Un seul compte porte `superadmin` : `sav@karson.fr`, dédié à l'administration, distinct du compte quotidien du fondateur. Ses identifiants sont dans `docs/compte-admin.md`, fichier local ignoré par git.
- En production, les routes admin exigent la double authentification (`API_ADMIN_REQUIRE_MFA`, actif par défaut) : activer TOTP sur ce compte depuis Profil > Sécurité avant le lancement.
- Pour donner ou retirer le rôle : `insert into public.platform_roles (user_id, role) values ('<uuid>', 'admin');` / `delete from public.platform_roles where user_id = '<uuid>';` via l'éditeur SQL Supabase, jamais depuis l'application.

## À faire avant l'ouverture au public (décidé le 11 septembre 2026, reporté par le fondateur)

État des lieux du 11 septembre : serveur maître des prix et des réservations, jetons signés, droits vérifiés à chaque route, RLS, journal d'audit, limites de requêtes (300/min par compte ou IP ; inscription 10/h, organisation 5/h, messages 30/min, réservations 20/h, suppression de compte 3/h), HTTPS, en-têtes de sécurité, documents privés à liens temporaires. Manquent :

1. **Vérification d'e-mail à l'inscription** (dès que le domaine d'envoi Resend est vérifié) — aujourd'hui les comptes sont confirmés d'office (ADR-0019).
2. **Apple App Attest** sur l'inscription, les devis, les réservations et les messages : prouver que l'appel vient de la vraie application.
3. **Plafonds par compte** (demandes de réservation et conversations par jour) en plus des plafonds par IP.
4. **Alerte e-mail sur activité anormale** (journal Fly → e-mail).
5. **Cloudflare devant l'API** (pare-feu, détection de robots, anti-DDoS) — ½ journée + DNS.
6. **Production** : `API_ADMIN_REQUIRE_MFA=true`, une machine Fly allumée en permanence (`min_machines_running = 1`), projet Supabase de production séparé.
7. **Côté fondateur** : dépôt GitHub privé (à vérifier), double authentification sur GitHub, Apple, Expo, Fly et Supabase ; dépôt de la marque à l'INPI une fois le nom choisi ; CGU interdisant l'aspiration des données.

## Signaler une vulnérabilité

Écrire à l'adresse de contact du dépôt (à définir avant le lancement public). Ne pas ouvrir d'issue publique.

## Registre des traitements (RGPD) — à compléter avant lancement

| Traitement          | Données                                | Base légale (à valider)       | Conservation                    |
| ------------------- | -------------------------------------- | ----------------------------- | ------------------------------- |
| Compte client       | e-mail, nom, téléphone                 | contrat                       | durée du compte + anonymisation |
| Réservation         | dates, véhicule, montant affiché       | contrat                       | obligations comptables          |
| Vérification loueur | Kbis, assurance, identité du dirigeant | obligation / intérêt légitime | décision + délai court          |
