# ADR-0016 — Stories : bulles « du neuf chez les loueurs » en tête du feed

Statut : accepté · Date : 2026-09-07

## Contexte

Le fondateur veut des bulles en haut de la page « Loueurs », juste sous les catégories, pour faire vivre le feed. Un loueur n'a pas le temps d'alimenter un flux chaque jour : le contenu doit exister même s'il ne fait rien.

## Décisions

1. **Le moteur compose les stories, le loueur peut en ajouter.** Pour chaque organisation vérifiée, `GET /v1/stories` assemble : ses offres en cours (ADR-0015), ses véhicules publiés depuis moins de 7 jours, et ses stories manuelles (photo + légende de 120 caractères, 48 h). Une bulle n'apparaît que s'il y a du neuf ; 6 éléments max par loueur, 20 loueurs max, les plus récents d'abord. Zéro travail imposé au loueur.
2. **Une story manuelle se fait en direct : photo ou vidéo filmée depuis l'app, jamais un lien.** La caméra coupe toute seule à 15 s (`STORY_VIDEO_MAX_SECONDS`), la vidéo est enregistrée en 720p sur l'appareil, sans transcodage serveur ; 60 Mo max. Une photo de la galerie reste possible. Le fichier vit dans le bucket public `story-media` sous `<org>/story-…` (envoi signé), réservé aux organisations vérifiées, supprimable par un manager ; il est effacé avec la ligne. Les stories expirées restent en base 48 h de plus puis ne sont plus servies (RLS `expires_at > now()` côté public).
3. **« Vu » est un confort local, jamais une donnée serveur.** L'app mémorise « organisation + date du dernier contenu » en mémoire de session : une bulle redevient non vue dès que le loueur publie du neuf. Pas de suivi de lecture individuel, pas de table de vues.
4. **Visionneuse plein écran** : barres de progression, 5 s par photo et la durée réelle pour une vidéo (son actif, fin de lecture = suivant), toucher à droite = suivant, à gauche = précédent, appui long = pause, fin d'un loueur = loueur suivant, appel à l'action vers le profil du loueur (réservation en un écran de plus).

## Conséquences

- Migrations `20260907000005_v1_stories.sql` et `20260907000006_v1_stories_video.sql`, routes `GET /v1/stories`, `GET/POST /v1/organizations/:id/stories`, `POST …/stories/upload-url`, `DELETE /v1/stories/:id`.
- Écrans : `StoriesRow` sous les onglets du feed, `app/stories/[organizationId].tsx`, `app/(pro)/organizations/[organizationId]/story.tsx`, raccourci « Story » sur le tableau de bord loueur.
- TECH DEBT : purge programmée des fichiers des stories expirées (aujourd'hui effacés seulement à la suppression manuelle), statistiques de vues agrégées si les loueurs le demandent.
