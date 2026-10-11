# Générateur de QR codes — Mission numérique 76

Petite application web pour créer des QR codes (lien, Wi-Fi, contact, texte, e-mail, téléphone),
les personnaliser (couleur unie ou **dégradé**, style des modules, **forme et couleur des marqueurs** (sélecteurs visuels), **logo** (galerie d'icônes ou image), légende, modèles rapides) et les exporter en **PNG**, **SVG** ou en **lot (ZIP)**.

Interface conforme à la charte UI de la Mission numérique 76 (style Apps1D76) : palette `ocean`,
police Marianne, mode clair/sombre, panneau « Affichage » (taille du texte, animations, contraste).

**Tout se calcule dans le navigateur — aucune donnée n'est envoyée en ligne.**

## Utiliser en local

Aucune dépendance ni build. Servez le dossier avec un serveur statique :

```bash
python3 -m http.server 8080
```

Puis ouvrez `http://localhost:8080`.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Page de l'outil |
| `style.css` | Styles (charte Apps1D76 + outil) |
| `app.js` | Logique QR : génération, personnalisation, export, lot ZIP |
| `ui.js` | Préférences d'affichage, thème, titre animé |
| `prefs.js` | Application des préférences avant le premier rendu (anti-flash) |
| `qr-code-styling.js` | Bibliothèque qr-code-styling 1.9.2 (MIT) — rendu avec dégradés et formes de marqueurs |
| `icon.svg` | Favicon |

## Déployer

Projet 100 % statique : déployable tel quel sur GitHub Pages, Netlify, Vercel ou tout hébergeur de fichiers statiques.
