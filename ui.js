/* QR codes MN76 — interface charte Apps1D76 : préférences d'affichage, thème, hero animé.
   S'appuie sur prefs.js (lecture, validation, application des préférences). */
(() => {
  'use strict';
  const d = document, root = d.documentElement, $ = s => d.querySelector(s);

  /* ===== 1. Préférences (thème, taille, animations, contraste) ===== */
  const P = window.APPS1D_PREFS;
  let prefs = P.lire();
  const save = () => P.enregistrer(prefs);
  const darkMq = matchMedia('(prefers-color-scheme: dark)'), motionMq = matchMedia('(prefers-reduced-motion: reduce)');
  const themeBtn = $('#theme-toggle'), metaTheme = $('meta[name="theme-color"]');

  function apply() {
    const dark = P.appliquer(prefs);
    themeBtn.setAttribute('aria-label', dark ? 'Activer le mode clair' : 'Activer le mode sombre');
    const cs = getComputedStyle(root);
    metaTheme.content = cs.getPropertyValue(dark ? '--bg' : '--primaire').trim();
  }
  darkMq.addEventListener?.('change', () => prefs.theme === 'auto' && apply());
  motionMq.addEventListener?.('change', () => prefs.motion === 'auto' && apply());
  themeBtn.addEventListener('click', () => { prefs.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; save(); apply(); syncForm(); });

  /* Panneau Affichage */
  const dlg = $('#settings'), form = dlg.querySelector('form');
  const syncForm = () => {
    ['theme', 'text', 'motion'].forEach(n => { const r = form.querySelector(`[name="${n}"][value="${prefs[n]}"]`); if (r) r.checked = true; });
    form.contrast.checked = prefs.contrast;
  };
  $('#settings-open').addEventListener('click', () => { syncForm(); dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', ''); });
  form.addEventListener('change', e => {
    const t = e.target;
    prefs = P.nettoyer({ ...prefs, [t.name]: t.type === 'checkbox' ? t.checked : t.value });
    save(); apply();
  });
  $('#reset').addEventListener('click', () => { prefs = { ...P.DEF }; save(); apply(); syncForm(); });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  apply();

  /* ===== 2. Titre animé mot par mot + trait sous le mot accent ===== */
  const h1 = $('h1[data-split]');
  if (h1) {
    let w = 0;
    const wrap = node => node.textContent.split(/(\s+)/).map(part => {
      if (!part.trim()) return part;                 // on garde les espaces tels quels
      const s = document.createElement('span');
      s.textContent = part; s.style.setProperty('--w', w++);
      return s;
    });
    [...h1.childNodes].forEach(node => {
      if (node.nodeType === 3) { node.replaceWith(...wrap(node)); return; }
      if (node.classList?.contains('accent')) {       // mot accent : index + trait dessiné en SVG
        node.style.setProperty('--w', w++);
        node.insertAdjacentHTML('beforeend',
          '<svg viewBox="0 0 300 20" aria-hidden="true"><path d="M5 13 Q150 3 295 11"/></svg>');
      }
    });
  }

  /* ===== 3. Application installable & hors ligne ===== */
  const install = $('#install'), installBtn = $('#install-btn');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  let deferred;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; install.hidden = installBtn.hidden = false; });
  installBtn?.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt(); await deferred.userChoice; deferred = null; install.hidden = true;
  });
  addEventListener('appinstalled', () => { install.hidden = true; });
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
  if (ios && !standalone) { install.hidden = false; $('#ios-hint').hidden = false; }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
