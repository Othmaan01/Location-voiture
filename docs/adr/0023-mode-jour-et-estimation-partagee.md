# ADR-0023 — Mode jour selon l'appareil, estimation par le module de tarification partagé

- Statut : accepté
- Date : 2026-09-10
- Décideurs : fondateur, CTO (assistant)

## Contexte

Retour fondateur après la version 14 en TestFlight :

1. « Mettre un mode jour en fonction du mode de l'iPhone. » Le thème (ADR-0009) est un mode nuit
   unique : ~75 fichiers mobiles lisent `theme.colors.*` dans des `StyleSheet.create` évalués une
   fois au chargement. Un thème dynamique classique (contexte React + hook) imposerait de réécrire
   chaque feuille de style.
2. « Le prix payé et le prix affiché sur le bouton ne sont pas les mêmes. » La fiche véhicule
   estimait `jours × prix du jour` côté client, alors que le devis serveur applique le tarif
   week-end, les forfaits semaine/mois, l'offre du loueur et le fuseau de l'agence
   (`@lv/pricing`).
3. « Retirer le rechargement quand les dates changent. » L'écran de demande vidait le devis puis
   affichait une roue pendant le recalcul.

## Options

### Mode jour

- A. Contexte React + `useTheme()` partout : propre, mais réécriture de toutes les feuilles de
  style et re-rendu de l'arbre au changement de mode.
- B. **`DynamicColorIOS({ light, dark })` par couleur, dans le point d'accès unique `@/theme`** :
  iOS résout la paire lui-même, y compris dans les styles créés une seule fois ; aucun fichier
  d'écran ne change ; le passage jour/nuit est natif et instantané. Android n'a pas d'équivalent :
  il reste en mode nuit jusqu'à une décision spécifique.
- C. Mode jour choisi dans l'application : refusé, le fondateur veut suivre le réglage du
  téléphone.

### Estimation du prix

- A. Appeler `POST /v1/quotes` à chaque changement : exact, mais une ligne `quotes` par
  glissement de roulette et une latence visible.
- B. **Importer `@lv/pricing` dans l'application et calculer avec les mêmes entrées que le
  serveur** (grille complète, offre, fuseau de l'agence exposé par la fiche). Le serveur reste
  l'autorité : la réservation n'accepte qu'un identifiant de devis (ADR-0005) ; l'estimation
  n'est qu'un affichage, garanti identique parce que le code est le même.

## Décision

- Le thème mobile expose des couleurs dynamiques (`DynamicColorIOS`) construites à partir de deux
  palettes de `packages/tokens/tokens.json` : la nuit (référence) et `color.light`, sa
  contrepartie jour. `userInterfaceStyle` passe à `automatic`. Les rares API qui exigent une
  chaîne (flou, barre d'état) lisent `useColorScheme()`. Les voiles posés sur des photos restent
  sombres dans les deux modes.
- La fiche véhicule calcule l'estimation avec `@lv/pricing` (dates et heures choisies, fuseau de
  l'agence, offre en cours) ; le montant du bouton est celui du devis, à l'euro près. Le devis
  serveur reste la seule base d'une réservation.
- L'écran de demande garde le devis précédent pendant le recalcul, avec une pulsation et une
  mention « Actualisation du prix » ; il ne se vide qu'en cas d'erreur (indisponible, doublon).

## Conséquences

- Un ajout de couleur passe par les deux palettes de `tokens.json`, sinon la clé manque au type
  `ColorKey`.
- `theme.colors.*` est de type `ColorValue`, plus `string` : les concaténations de chaînes sont
  interdites (utiliser `palette.dark` / `palette.light` si une chaîne est indispensable).
- Android : nuit uniquement, documenté dans `@/theme`. Un mode jour Android demandera un thème
  dynamique classique ou une double compilation des styles.
- Toute évolution du calcul de prix se fait dans `@lv/pricing`, jamais dupliquée dans un écran.
