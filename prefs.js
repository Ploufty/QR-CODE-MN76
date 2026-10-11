/* Apps1D76 — préférences d'affichage (thème, taille du texte, animations, contraste).
   Chargé dans le <head> pour s'appliquer avant le premier affichage (pas de flash), puis réutilisé par script.js. */
window.APPS1D_PREFS = (() => {
  const d = document.documentElement, CLE = 'apps1d-prefs';
  const DEF = { theme: 'auto', text: '100', motion: 'auto', contrast: false };
  const VALEURS = { theme: ['auto', 'light', 'dark'], text: ['100', '115', '130'], motion: ['auto', 'on', 'reduce'] };
  const systeme = q => matchMedia(q).matches;
  // On ne garde que des valeurs connues : le stockage du navigateur est modifiable par l'utilisateur
  const nettoyer = (p = {}) => ({
    theme: VALEURS.theme.includes(p?.theme) ? p.theme : DEF.theme,
    text: VALEURS.text.includes(String(p?.text)) ? String(p.text) : DEF.text,
    motion: VALEURS.motion.includes(p?.motion) ? p.motion : DEF.motion,
    contrast: p?.contrast === true
  });
  const lire = () => { try { return nettoyer(JSON.parse(localStorage.getItem(CLE))); } catch { return nettoyer(); } };
  const enregistrer = p => { try { localStorage.setItem(CLE, JSON.stringify(p)); } catch { /* navigation privée */ } };
  // Applique les préférences sur <html> ; renvoie true si le thème sombre est actif
  const appliquer = p => {
    const sombre = p.theme === 'dark' || (p.theme === 'auto' && systeme('(prefers-color-scheme: dark)'));
    d.dataset.theme = sombre ? 'dark' : 'light';
    d.dataset.motion = p.motion === 'reduce' || (p.motion === 'auto' && systeme('(prefers-reduced-motion: reduce)')) ? 'reduce' : 'full';
    d.dataset.contrast = p.contrast ? 'high' : 'normal';
    d.style.setProperty('--text-scale', p.text / 100);
    return sombre;
  };
  appliquer(lire());
  return { DEF, nettoyer, lire, enregistrer, appliquer };
})();
