# ADR-0010 — SIREN par organisation, SIRET par agence ; politique de suppression ; verrouillage local

Statut : accepté · Date : 2026-09-06

## Contexte

Retours du fondateur après les premiers tests sur iPhone : impossible de supprimer ce que l'on crée, le SIRET n'était pas redemandé à l'ajout d'une seconde agence, les blocages (« SIRET à renseigner ») ne menaient nulle part, pas de Face ID, et les utilitaires ne font pas partie du lancement.

## Décisions

1. **Identifiants légaux.** L'organisation porte le **SIREN** (entreprise, 9 chiffres, clé de Luhn). Chaque agence porte le **SIRET** de son établissement (14 chiffres, clé de Luhn) qui **doit commencer par le SIREN** de l'organisation : vérifié dans l'API et par un trigger en base. Une agence n'est « complète » (visible, vérifiable, publiable) qu'avec SIRET, adresse et position. L'annuaire officiel (`recherche-entreprises.api.gouv.fr`, données publiques, sans clé) pré-remplit raison sociale et adresses via `GET /v1/companies/lookup` ; c'est une aide à la saisie, la vérification reste humaine.
2. **Suppressions.** Le serveur décide, jamais le client :
   - véhicule : **supprimé** s'il n'a aucune réservation, **archivé** sinon (la réponse le dit) ;
   - agence : supprimable seulement sans véhicule rattaché (même archivé) ;
   - organisation : propriétaire uniquement, confirmation explicite, refusée dès qu'un historique de réservations existe (conservation, litiges) ; sinon cascade complète et nettoyage du stockage ;
   - documents : supprimables tant qu'ils ne sont pas acceptés (déjà en place).
3. **Aucun blocage sans issue.** Chaque élément manquant (vérification) et chaque bloqueur de publication est cliquable et mène à l'écran qui le corrige.
4. **Verrouillage local.** Face ID / Touch ID avec le code de l'appareil en secours (`expo-local-authentication`), activable dans le profil, demandé à l'ouverture et après 30 s en arrière-plan. Pas de code maison : rien à stocker, rien à faire fuiter. La session serveur n'est pas concernée.
5. **Catégories masquées.** `utilitaire` et `minibus` sont retirés de l'interface (onglet, formulaire, filtres) mais restent connus du moteur : les rouvrir est un interrupteur côté app.

## Conséquences

- Migration `20260907000000_v1_siren_siret.sql` : `organizations.siren`, `agencies.siret`, trigger de cohérence ; l'ancien SIRET d'organisation devient le SIREN et est reporté sur la première agence.
- Les agences existantes sans SIRET redeviennent « à compléter » : c'est voulu, le loueur renseigne le SIRET de chaque établissement.
- TECH DEBT : la cohérence SIREN/SIRET ne prouve pas que l'établissement appartient bien au loueur ; l'admin garde le dernier mot (Kbis). Un contrôle automatique de l'état administratif (actif/fermé) est possible ensuite.
