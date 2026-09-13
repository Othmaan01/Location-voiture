# Marque Karson

Sources validées par le fondateur le 13 septembre 2026. Toutes les déclinaisons de l'application et du site se
régénèrent depuis ce dossier :

```bash
python3 brand/generate.py
```

Nécessite Python 3 avec `numpy`, `scipy` et `Pillow`. Le script écrit directement dans `apps/mobile/assets/` et
`apps/web/public/`.

## Sources

| Fichier                             | Rôle                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `sources/karson-k-jour.jpg`         | K sur fond blanc (rendu 4096 px) : icône iPhone en mode jour, favicon clair                                        |
| `sources/karson-k-nuit.jpg`         | K sur fond noir (rendu 4096 px) : icône nuit, Android, site                                                        |
| `masters/karson-logo-nuit-4096.png` | Logo complet (K + mot) corrigé : fond noir pur, mot à la largeur exacte du K, espacement régularisé, groupe centré |
| `masters/karson-logo-jour-4096.png` | Logo complet version jour, dérivé du précédent (généré)                                                            |

## Règles

- **Fonds exacts** : noir `#000000` et blanc `#FFFFFF` purs sur les icônes, sans aucun voile.
- **Icône iPhone** : la forme du K occupe 56 % de la largeur ; centre optique entre la forme et sa lueur.
  Jour, nuit et teintée (niveaux de gris) sont déclarées dans `apps/mobile/app.json` (`ios.icon`).
- **Android** : premier plan avec le K à 44 % (zone sûre des formes adaptatives), fond `#000000`.
- **Écran de lancement** : logo complet, `imageWidth` 220 pt ; fond identique au premier écran de l'application
  (`#f4f4f6` le jour, `#0e0e11` la nuit, tokens `light.ground.1` et `black.1`) pour éviter tout saut de teinte.
- **Site** : favicon clair ou sombre selon le thème du navigateur, raccourci iOS `apple-icon.png`,
  icônes PWA, `favicon.ico` de secours. `brand/karson-mark.png` est une image transparente prévue pour les
  **fonds sombres** du site uniquement (les cases noires du damier y sont transparentes).
- **Couleurs** : rouge `#E3243B`, encre jour `#141418`.
