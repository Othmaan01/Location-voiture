# Phase 0 — Dossier d'architecture et de cadrage

Ce dossier est la sortie de la « première mission CTO » : avant d'écrire du code produit, poser la vision, le périmètre MVP, l'architecture, la sécurité, le modèle de données et la roadmap.

Il est écrit **à partir de l'existant** (le projet RentMap déjà présent dans ce dépôt) et non à partir d'une page blanche. Voir [06-audit-existant.md](./06-audit-existant.md) en premier si vous voulez comprendre d'où l'on part.

| Fichier | Contenu | Sections du brief |
|---|---|---|
| [01-vision-et-mvp.md](./01-vision-et-mvp.md) | Vision produit, deux parcours, périmètre MVP, ce qu'on repousse, user journeys, écrans | A, B, F |
| [02-architecture-et-stack.md](./02-architecture-et-stack.md) | Architecture cible, stack, organisation du monorepo, environnements, tests, CI/CD, design system, standards de code | C, D |
| [03-securite.md](./03-securite.md) | Rôles et permissions, multi-tenant, authentification, données sensibles, threat model | E |
| [04-modele-de-donnees.md](./04-modele-de-donnees.md) | Modèle de données v1 (marketplace), état de réservation, moteur de prix, migration depuis le schéma existant | G |
| [05-roadmap-risques-decisions.md](./05-roadmap-risques-decisions.md) | Roadmap par phases, risques, décisions à prendre | H, I, J |
| [06-audit-existant.md](./06-audit-existant.md) | Ce que vaut le code RentMap existant, ce qu'on garde, ce qu'on change | — |
| [../adr/](../adr/) | Architecture Decision Records, une décision structurante par fichier | — |

## Statut

**Proposition, non validée.** Rien dans ce dossier n'a encore été implémenté. Les décisions listées dans [05-roadmap-risques-decisions.md](./05-roadmap-risques-decisions.md) § « Décisions à prendre » conditionnent le démarrage de la Phase 0 technique.

Les ADR sont au statut `proposé` ; ils passent à `accepté` une fois les décisions tranchées, et c'est à ce moment-là que `ARCHITECTURE.md`, `ROADMAP.md` et `README.md` à la racine seront réécrits pour refléter la cible.
