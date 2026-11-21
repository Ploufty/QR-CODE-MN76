# Générateur de QR codes — Mission numérique 76

Application web pour créer des QR codes (lien, Wi-Fi, contact, texte, e-mail, téléphone),
les personnaliser et les exporter. **Tout se calcule dans le navigateur : aucune donnée
saisie n'est envoyée en ligne.**

## Deux modes

- **Pas à pas** — un assistant en 6 étapes (Contenu → Apparence → Récupérer) avec des
  explications à chaque écran. Les réglages sont les mêmes qu'en mode complet : l'assistant
  déplace les vrais contrôles, il ne les duplique pas.
- **Page complète** — tous les réglages visibles d'un coup, pour aller vite.

Le choix est mémorisé d'une visite à l'autre.

## Ce qu'on peut faire

**Personnaliser** : couleur unie ou dégradé, style des modules, forme et couleur des
marqueurs (sélecteurs visuels), logo au centre (galerie d'icônes libres ou image
personnelle), légende sous le code, cadre avec texte (7 exemples, dont un cadre rond),
modèles rapides, fond blanc ou transparent.

**Exporter** : **PNG** (taille réglable), **SVG**, copie dans le presse-papiers, impression.

**Plusieurs codes à la fois** : une liste de contenus (un par ligne, `contenu⇥nom de
fichier`), alimentée à la main, par import CSV ou par le bouton « Ajouter le code en cours ».
De là : une **archive ZIP** (`codes-qr.zip`) ou une **planche A4** prête à imprimer et à
découper, en portrait ou paysage. *Idée de la planche empruntée à
[QRPrint](https://qrprint.forge.apps.education.fr/app/) ; code écrit indépendamment.*

**Aide** : un wiki intégré derrière le `?` en haut de page.

## Interface

Charte UI de la Mission numérique 76 (style Apps1D76) : palette `amphibien`
(indigo `#3e54d3` / turquoise `#0e7c7b`, contrastes AA vérifiés en clair et en sombre),
police Marianne, mode clair/sombre, panneau « Affichage » (taille du texte, animations,
contraste renforcé). Responsive, navigable au clavier, testée au lecteur d'écran.

## Application installable (PWA)

Installable depuis le navigateur (bouton proposé automatiquement) et **utilisable hors
ligne** une fois chargée : `sw.js` met les fichiers en cache (réseau d'abord pour la page,
cache d'abord pour les ressources).

## Sécurité

- Aucun appel réseau avec les données saisies : la génération est locale.
- `Content-Security-Policy` déclarée dans la page : `script-src 'self'`, `style-src 'self'`
  (pas de style ni de script injecté), images limitées à `self`, `data:` et `blob:`.
- Les textes insérés dans le SVG sont échappés ; les couleurs libres sont validées
  (`#RRGGBB`) avant usage.
- Les logos importés sont limités aux images **matricielles** (PNG, JPEG, WebP) : un SVG
  peut porter du script et repartirait tel quel dans le fichier remis à un collègue.
- Les textes du SVG utilisent des polices système universelles plutôt qu'une police
  embarquée : fichier léger, rendu identique partout, pas de question de licence.

## Utiliser en local

Aucune dépendance, aucun build. Servez le dossier avec un serveur statique :

```bash
python3 -m http.server 8080
```

Puis ouvrez `http://localhost:8080`. (Le service worker et l'installation demandent
`http(s)://`, pas `file://`.)

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Page de l'outil (les deux modes, l'aide, le panneau Affichage) |
| `style.css` | Styles (charte Apps1D76 + outil + feuilles d'impression A4) |
| `app.js` | Logique QR : génération, personnalisation, export, lot ZIP, planche, assistant |
| `ui.js` | Préférences d'affichage, thème, titre animé, installation PWA, fond animé |
| `prefs.js` | Application des préférences avant le premier rendu (anti-flash) |
| `qr-code-styling.js` | Bibliothèque qr-code-styling 1.9.2 (MIT) |
| `sw.js` | Service worker (fonctionnement hors ligne) |
| `manifest.webmanifest` | Manifeste PWA |
| `icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` | Icônes |

## Déployer

Projet 100 % statique : déployable tel quel sur GitHub Pages, Netlify, Vercel ou tout
hébergeur de fichiers statiques.
