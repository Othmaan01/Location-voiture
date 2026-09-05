# ADR-0007 — Deux familles de rôles : plateforme et organisation ; matrice de permissions serveur

Statut : accepté · Date : 2026-09-05

## Contexte
RentMap utilise un enum `client / pro / admin` sur le profil et un propriétaire unique par agence. Le brief demande client, professionnel, employé, manager, propriétaire, support, administrateur, super administrateur, avec moindre privilège et isolation multi-tenant.

## Décision
- **Rôles plateforme** (`platform_roles` : `support`, `admin`, `superadmin`), attribués par un superadmin uniquement, MFA obligatoire.
- **Rôles d'organisation** (`organization_members` : `owner`, `manager`, `agent`), un utilisateur pouvant appartenir à plusieurs organisations.
- Le **client** n'est pas un rôle stocké : c'est l'absence de privilège.
- **Matrice de permissions** en code (`packages/contracts/permissions.ts`), évaluée par `authz.can(actor, action, resource)` dans l'API ; RLS reflète l'appartenance en seconde ligne.
- Tout `organization_id` transmis par un client est une intention, jamais une preuve : l'appartenance est revérifiée.

## Conséquences
- Un test d'intégration par ligne de la matrice, plus des tests IDOR (`404` sur ressource étrangère).
- Ajout d'un rôle = une ligne dans la matrice et ses tests, pas de refonte.
