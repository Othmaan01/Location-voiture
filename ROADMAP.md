# Roadmap

Détail et critères de sortie : [docs/phase-0/05-roadmap-risques-decisions.md](docs/phase-0/05-roadmap-risques-decisions.md).

- [x] **Phase 0 — Fondations** : monorepo, schéma v1, API (auth JWT, authz, organisations, audit), squelette mobile, CI. _Reste : premier `supabase start` réel sur la machine (Docker), déploiement staging Fly._
- [ ] **Phase 1 — Authentification et profils** : inscription, connexion, récupération, suppression de compte, invitations et rôles, push.
- [ ] **Phase 2 — Espace professionnel et véhicules** : agences, véhicules, photos, tarifs, documents, vérification, admin minimal, back-office web.
- [ ] **Phase 3 — Recherche client et fiches** : recherche par ville/position/dates, carte, fiche véhicule, favoris, onglet Loueurs.
- [ ] **Phase 4 — Disponibilités et réservation** : calendrier, blocages, state machine, idempotence, notifications. **→ MVP**
- [ ] **Phase 5 — Abonnement loueur** : Stripe Billing par organisation, quotas, portail, factures.
- [ ] **Phase 6 — Communication** : messagerie par réservation, avis.
- [ ] **Phase 7 — Administration et sécurité avancée**.
- [ ] **Phase 8 — Optimisation, analytics, scale**.
