# Architecture et décisions

Ce document explique **pourquoi** les choses sont faites ainsi. Il évite de refaire les mêmes débats dans six mois.

---

## 1. Le modèle économique dicte l'architecture

Nous ne prenons **aucune commission** sur les locations. Trois conséquences directes :

1. **Pas de moteur de réservation, pas de paiement de location.** La plateforme s'arrête à la mise en relation (`leads`). Cela évite le statut d'intermédiaire commercial, la gestion des annulations, des litiges et des remboursements — et ça divise la complexité par cinq.
2. **La valeur livrée au pro est mesurable : le nombre de demandes.** C'est la métrique centrale du tableau de bord, parce que c'est elle qui justifie l'abonnement mois après mois.
3. **Le quota de véhicules est le levier de prix.** Il doit donc être appliqué côté serveur, de façon incontournable — d'où les triggers en base plutôt qu'une vérification dans le code.

---

## 2. Pourquoi Next.js et pas une SPA

Le trafic d'un annuaire vient de la recherche locale : « location voiture Bordeaux », « louer un utilitaire à Lille ». Une SPA classique (Vite + React) renvoie une page vide aux robots et perd cette bataille avant de la commencer.

Next.js App Router permet :

- des **pages ville pré-générées** (`generateStaticParams` sur `/location-voiture/[ville]`), servies en HTML complet et revalidées toutes les heures ;
- des **fiches agence et véhicule** rendues côté serveur avec balisage **JSON-LD** (`AutoRental`, `Product`, `BreadcrumbList`) ;
- un **sitemap dynamique** alimenté par la base.

### Conséquence 1 : la session est lue côté client dans l'en-tête

Appeler `cookies()` dans le layout racine rendrait **toutes** les pages dynamiques et annulerait la génération statique. L'en-tête utilise donc `useSession()` (client). La sécurité ne repose jamais là-dessus : elle repose sur le proxy et sur RLS.

### Conséquence 2 : deux clients Supabase côté serveur

Même remarque au niveau des données. `createClient()` lit les cookies de session — donc toute page qui l'appelle bascule en rendu dynamique. Les pages publiques (accueil, ville, agence, véhicule, sitemap) utilisent donc **`createPublicClient()`** : clé `anon`, aucun cookie, donc statique / ISR possible. Elles n'affichent que du contenu publié, que les policies RLS ouvrent déjà au rôle `anon`.

| Client | Où | Rendu |
|---|---|---|
| `createPublicClient()` | pages publiques, `src/lib/queries.ts`, sitemap | statique / ISR |
| `createClient()` | tableau de bord, compte, Server Actions, proxy | dynamique, sous RLS de l'utilisateur |
| `createAdminClient()` | webhook Stripe uniquement | contourne RLS |

---

## 3. Pourquoi Supabase

- **PostgreSQL + PostGIS** : les requêtes géographiques (« tous les véhicules dans un rayon de 30 km ») sont natives et indexées. Un service NoSQL aurait demandé une couche géo maison.
- **Row Level Security** : les règles d'accès vivent dans la base, pas dans le code. Une faille dans une route API ne peut pas exposer les données d'une autre agence.
- **Auth intégrée** avec métadonnées : le rôle (`client` / `pro`) est posé à l'inscription et repris par le trigger `handle_new_user`.
- **Coût nul au démarrage**, et migration possible vers un Postgres autogéré plus tard (le schéma est du SQL standard).

### Trois niveaux de protection, dans cet ordre

1. **RLS** (base) — la seule barrière qui compte réellement.
2. **Proxy** (`src/proxy.ts`, ex-middleware) — redirige avant le rendu, améliore l'expérience.
3. **`requirePro()` / `requireSession()`** (serveur) — garde les Server Components et Server Actions.

Le front n'est jamais considéré comme une protection.

---

## 4. Les règles métier vivent en base

| Règle | Où | Pourquoi là |
|---|---|---|
| Quota de véhicules par palier | Trigger `vehicles_enforce_quota` | Impossible à contourner, même via l'API REST de Supabase |
| Mise en avant réservée au palier Pro | Même trigger | Idem |
| Rétrogradation de palier | Trigger `agencies_demote_vehicles` | Cohérence garantie quel que soit le chemin de mise à jour |
| Plan de l'agence = plan de l'abonnement | Trigger `subscriptions_sync_agency_plan` | Une seule source de vérité, écrite par le webhook |
| Note moyenne d'une agence | Trigger `reviews_refresh_rating` | Évite un `AVG()` à chaque affichage |

`src/lib/plans.ts` reflète ces limites pour l'interface, mais n'en est jamais l'autorité.

---

## 5. Recherche : une seule fonction SQL

`public.search_vehicles(...)` prend tous les filtres (rayon, texte, catégorie, boîte, énergie, budget, places, équipements), applique le tri et renvoie `total_count` pour la pagination — en un aller-retour.

Avantages :
- pas de sur-récupération côté client ;
- le tri « pertinence » (mises en avant Pro d'abord, puis proximité, puis note) est défini à un seul endroit ;
- la carte et la liste consomment exactement les mêmes lignes, donc ne peuvent pas diverger.

La vue `vehicle_search_view` dénormalise véhicule + agence + ville et porte `security_invoker = true` : elle reste soumise aux policies RLS de l'appelant.

---

## 6. Cartographie

**MapLibre GL** (fork libre de Mapbox GL) avec les tuiles **OpenFreeMap** : aucune clé d'API, aucun quota, aucune facture surprise. Migration possible vers MapTiler ou Protomaps en changeant une seule variable d'environnement (`NEXT_PUBLIC_MAP_STYLE_URL`).

Les points ne sont pas des marqueurs HTML mais une **source GeoJSON avec clustering natif** (`clusters`, `point-pill`, `point-label`). Un millier de véhicules affichés reste fluide, ce qui ne serait pas le cas avec un millier de nœuds DOM.

Le composant `MapCanvas` est générique (`points`, `center`, `zoom`, `onSelect`) : il sert la recherche, la carte de couverture, la page ville et l'aperçu d'une agence.

---

## 7. Formulaires : Server Actions + Zod

Chaque écriture passe par une Server Action dans `src/server/actions/`, qui :

1. valide avec un schéma Zod partagé (`src/lib/validators.ts`) ;
2. re-vérifie l'autorisation côté serveur (`requirePro()`) ;
3. écrit via le client Supabase de l'utilisateur — donc **sous RLS** ;
4. invalide les caches concernés (`revalidatePath`).

Le formulaire de contact public embarque un champ piège (*honeypot*) contre les robots.

---

## 8. Ce qui n'a volontairement pas été fait

| Non fait | Raison | Quand le faire |
|---|---|---|
| Réservation et paiement en ligne | Change le modèle économique et le statut juridique | Seulement si les loueurs le réclament |
| Téléversement d'images | Les buckets et policies Storage existent déjà ; il manque l'interface | Itération suivante — c'est le premier manque visible |
| Envoi d'e-mails | Nécessite un fournisseur (Resend, Postmark) et un domaine vérifié | Dès qu'un vrai loueur est en ligne |
| Mode sombre | Cohérence visuelle avec le fond de carte clair | Quand un fond de carte sombre sera choisi |
| Tests automatisés | Le socle bougeait trop vite | Dès que le schéma se stabilise — commencer par les triggers de quota |
| Application mobile | Le site est déjà responsive | Expo + réutilisation de l'API Supabase, si le besoin apparaît |

---

## 9. Coût d'exploitation au démarrage

| Poste | Coût |
|---|---|
| Netlify (offre gratuite) | 0 € |
| Supabase (offre gratuite : 500 Mo, 50 000 utilisateurs actifs) | 0 € |
| Tuiles OpenFreeMap | 0 € |
| Stripe | 1,5 % + 0,25 € par transaction d'abonnement |
| Nom de domaine | ~12 €/an |

Le premier palier payant (Supabase Pro, 25 $/mois) devient nécessaire vers quelques milliers de véhicules ou lorsque les sauvegardes quotidiennes deviennent indispensables.
