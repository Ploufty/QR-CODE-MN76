(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/([\\;,":])/g, '\\$1'); };            // Wi-Fi
  var vc = function (s) { return String(s).replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n'); };
  var xml = function (s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); };

  // ---- Types : champs [id, libellé, type, placeholder|options] et build() -> chaîne ('' = incomplet)
  var TYPES = {
    url: { label: 'Lien', tip: "Collez l'adresse du site. Inutile d'écrire « https:// », il est ajouté tout seul.", fields: [['u', 'Adresse du site', 'url', 'https://exemple.fr']],
      build: function (v) { var u = v.u.trim(); return u && !/^[a-z][a-z0-9+.-]*:/i.test(u) ? 'https://' + u : u; } },
    text: { label: 'Texte', tip: "Tapez le message qui s'affichera sur le téléphone. Plus il est court, plus le code se scanne de loin.", fields: [['t', 'Message', 'textarea', '']],
      build: function (v) { return v.t; } },
    wifi: { label: 'Wi-Fi', tip: "Le nom du réseau doit être saisi exactement comme il apparaît. La sécurité est WPA dans la quasi-totalité des cas.", fields: [['s', 'Nom du réseau (SSID)', 'text', ''], ['p', 'Mot de passe', 'text', ''], ['k', 'Sécurité', 'select', ['WPA', 'WEP', 'nopass']]],
      build: function (v) { return v.s ? 'WIFI:T:' + v.k + ';S:' + esc(v.s) + ';' + (v.k === 'nopass' ? '' : 'P:' + esc(v.p) + ';') + ';' : ''; } },
    contact: { label: 'Contact', tip: "Le nom suffit, le reste est facultatif. Le téléphone proposera d'enregistrer la fiche dans le répertoire.", fields: [['n', 'Nom complet', 'text', ''], ['o', 'Société', 'text', ''], ['f', 'Téléphone', 'tel', ''], ['m', 'E-mail', 'email', '']],
      build: function (v) { return v.n ? ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + vc(v.n), v.o && 'ORG:' + vc(v.o), v.f && 'TEL:' + vc(v.f), v.m && 'EMAIL:' + vc(v.m), 'END:VCARD'].filter(Boolean).join('\n') : ''; } },
    mail: { label: 'E-mail', tip: "Seul le destinataire est obligatoire. L'objet et le message arrivent pré-remplis dans la messagerie.", fields: [['a', 'Destinataire', 'email', ''], ['j', 'Objet', 'text', ''], ['b', 'Message', 'textarea', '']],
      build: function (v) { return v.a ? 'mailto:' + v.a + '?subject=' + encodeURIComponent(v.j) + '&body=' + encodeURIComponent(v.b) : ''; } },
    tel: { label: 'Téléphone', tip: "Le numéro, avec l'indicatif si vous diffusez hors de France. Le téléphone proposera d'appeler.", fields: [['n', 'Numéro', 'tel', '+33 6 00 00 00 00']],
      build: function (v) { return v.n ? 'tel:' + v.n.replace(/[^\d+]/g, '') : ''; } }
  };

  // ---- Couleurs prédéfinies (swatches communs)
  var COLORS = ['#000000', '#ffffff', '#166534', '#6d28d9', '#c2185b', '#0b5394', '#00727a', '#e1000f', '#f59e0b', '#1e1e2f'];
  var BRUSH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4l5 5-9 9H6v-5z"/><path d="M4 20h4"/></svg>';

  // ---- Modèles rapides (variés : montrent formes et marqueurs disponibles)
  var PRESETS = [
    { name: 'Classique', fg: '#000000', dots: 'square', cs: 'square', cd: 'square', eye: '#000000', bg: '#ffffff' },
    { name: 'Points verts', fg: '#166534', dots: 'dots', cs: 'extra-rounded', cd: 'dot', eye: '#166534', bg: '#ffffff' },
    { name: 'Arrondi violet', fg: '#6d28d9', dots: 'rounded', cs: 'extra-rounded', cd: 'extra-rounded', eye: '#6d28d9', bg: '#ffffff' },
    { name: 'Dégradé élégant', grad: ['#166534', '#6d28d9', 'linear'], dots: 'classy-rounded', cs: 'extra-rounded', cd: 'classy', eye: '#166534', bg: '#ffffff' },
    { name: 'Framboise', fg: '#c2185b', dots: 'classy', cs: 'dot', cd: 'dot', eye: '#c2185b', bg: '#ffffff' },
    { name: 'Nuit inversée', fg: '#eeeef6', dots: 'extra-rounded', cs: 'square', cd: 'dot', eye: '#7fb3ff', bg: '#11111b' }
  ];

  var type = 'url', svg = '', logoURL = '', logoIcon = -1, timer, token = 0;
  var LOGO_SIZE = 0.4;
  var shape = { dotsType: 'square', csType: 'square', cdType: 'square' };
  var frameStyle = 'classic';

  // ---- Exemples de cadre (clic = active le cadre + applique style et couleurs ; noir par défaut)
  var FRAMES = [
    { name: 'Noir', style: 'classic', fcol: '#000000', tcol: '#ffffff' },
    { name: 'Vert', style: 'classic', fcol: '#166534', tcol: '#ffffff' },
    { name: 'Texte en haut', style: 'top', fcol: '#6d28d9', tcol: '#ffffff' },
    { name: 'Ruban', style: 'ribbon', fcol: '#1e1e2f', tcol: '#ffffff' },
    { name: 'Pilule', style: 'pill', fcol: '#166534', tcol: '#ffffff' },
    { name: 'Framboise', style: 'classic', fcol: '#c2185b', tcol: '#ffffff' },
    { name: 'Rond', style: 'circle', fcol: '#000000', tcol: '#ffffff' }
  ];
  function frameGlyphBox(ex) {
    if (ex.style === 'circle') {
      return '<svg viewBox="0 0 24 24">' +
        '<circle cx="12" cy="12" r="11" fill="' + ex.fcol + '"/>' +
        '<circle cx="12" cy="10.5" r="7.5" fill="#fff"/>' +
        '<rect x="7" y="18" width="10" height="2.6" rx="1" fill="' + ex.tcol + '"/></svg>';
    }
    var r = { classic: 4, top: 4, ribbon: 1, pill: 8 }[ex.style], top = ex.style === 'top';
    return '<svg viewBox="0 0 24 24">' +
      '<rect x="2" y="2" width="20" height="20" rx="' + r + '" fill="' + ex.fcol + '"/>' +
      '<rect x="6" y="' + (top ? 11 : 5) + '" width="12" height="8" rx="1" fill="#fff"/>' +
      '<rect x="7" y="' + (top ? 5 : 16) + '" width="10" height="3" rx="1" fill="' + ex.tcol + '"/></svg>';
  }

  // ---- Glyphes de formes (une cellule par type, réutilisée pour modules et centre)
  function rect(x, y, s, r) { return '<rect x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '"' + (r ? ' rx="' + r + '"' : '') + '/>'; }
  function cell(t, x, y, s) {
    var r2 = s / 4, r4 = s / 2;
    if (t === 'dots') return '<circle cx="' + (x + r4) + '" cy="' + (y + r4) + '" r="' + r4 + '"/>';
    if (t === 'rounded') return rect(x, y, s, r2);
    if (t === 'extra-rounded') return rect(x, y, s, r4);
    if (t === 'classy') return '<path d="M' + (x + r4) + ' ' + y + ' H' + (x + s) + ' V' + (y + s) + ' H' + x + ' V' + (y + r4) + ' A' + r4 + ' ' + r4 + ' 0 0 1 ' + (x + r4) + ' ' + y + ' Z"/>';
    if (t === 'classy-rounded') return '<path d="M' + (x + r4) + ' ' + y + ' H' + (x + s) + ' V' + (y + r4) + ' A' + r4 + ' ' + r4 + ' 0 0 1 ' + (x + r4) + ' ' + (y + s) + ' H' + x + ' V' + (y + r4) + ' A' + r4 + ' ' + r4 + ' 0 0 1 ' + (x + r4) + ' ' + y + ' Z"/>';
    return rect(x, y, s, 0);
  }
  function dotGlyph(t) {
    var p = [[3, 3], [13, 3], [3, 13], [13, 13]].map(function (o) { return cell(t, o[0], o[1], 8); }).join('');
    return '<svg viewBox="0 0 24 24" fill="currentColor">' + p + '</svg>';
  }
  function ballGlyph(t) { return '<svg viewBox="0 0 24 24" fill="currentColor">' + cell(t, 7, 7, 10) + '</svg>'; }
  function frameGlyph(t) {
    var inner = t === 'dot' ? '<circle cx="12" cy="12" r="8"/>' : '<rect x="4" y="4" width="16" height="16" rx="' + (t === 'extra-rounded' ? 5 : 0) + '"/>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">' + inner + '</svg>';
  }
  var DOT_TYPES = [['square', 'Carrés'], ['dots', 'Points'], ['rounded', 'Arrondis'], ['extra-rounded', 'Très arrondis'], ['classy', 'Élégant'], ['classy-rounded', 'Élégant arrondi']];
  var SHAPES = {
    dotsType: DOT_TYPES.map(function (o) { return [o[0], o[1], dotGlyph(o[0])]; }),
    csType: [['square', 'Carré'], ['dot', 'Cercle'], ['extra-rounded', 'Arrondi']].map(function (o) { return [o[0], o[1], frameGlyph(o[0])]; }),
    cdType: DOT_TYPES.map(function (o) { return [o[0], o[1], ballGlyph(o[0])]; })
  };

  // ---- Galerie d'icônes de logo (SVG au trait, sans dépendance ni réseau)
  var ICONS = [
    ['Lien', '<path d="M10 14a4 4 0 0 1 0-6l2-2a4 4 0 0 1 6 6l-1 1"/><path d="M14 10a4 4 0 0 1 0 6l-2 2a4 4 0 0 1-6-6l1-1"/>'],
    ['Wi-Fi', '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8 15.5a6 6 0 0 1 8 0"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>'],
    ['E-mail', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'],
    ['Téléphone', '<path d="M5 4h3l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>'],
    ['Maison', '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/>'],
    ['Cœur', '<path d="M12 20s-7-4.5-7-9a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 4.5-7 9-7 9Z"/>'],
    ['Étoile', '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19l1-5.8L3.5 9.2l5.9-.9Z"/>'],
    ['Lieu', '<path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10Z"/><circle cx="12" cy="11" r="2.3"/>'],
    ['Appareil photo', '<path d="M4 8h3l2-2h6l2 2h3v11H4Z"/><circle cx="12" cy="13" r="3.2"/>'],
    ['Musique', '<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>'],
    ['École', '<path d="M12 4 2 9l10 5 10-5Z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>'],
    ['Calendrier', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>'],
    ['Info', '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/>'],
    ['Globe', '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'],
    ['Vidéo', '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M10 9.5l5 2.5-5 2.5Z"/>'],
    ['Document', '<path d="M7 3h7l4 4v14H7Z"/><path d="M14 3v4h4M9 13h6M9 16h6"/>'],
    ['Téléchargement', '<path d="M12 4v10"/><path d="M8 11l4 4 4-4"/><path d="M5 19h14"/>'],
    ['Panier', '<path d="M4 5h2l2 10h9l2-7H7.5"/><circle cx="10" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/>'],
    ['Message', '<path d="M4 5h16v11H9l-4 3Z"/><path d="M8 9h8M8 12h5"/>'],
    ['Partage', '<circle cx="6" cy="12" r="2.4"/><circle cx="17" cy="6" r="2.4"/><circle cx="17" cy="18" r="2.4"/><path d="M8.2 11l6.6-4M8.2 13l6.6 4"/>'],
    ['Paiement', '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>'],
    ['Billet', '<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z"/><path d="M14 6v12"/>'],
    ['Cadeau', '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M4 13h16M12 9v11M8.5 9a2.5 2.5 0 1 1 3.5-2.3A2.5 2.5 0 1 1 15.5 9"/>'],
    ['Horloge', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>']
  ];
  function iconURL(inner, color) {
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>');
  }

  // ======================= UI =======================
  function renderTabs() {
    $('tabs').innerHTML = '';
    Object.keys(TYPES).forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = TYPES[k].label; b.className = k === type ? 'on' : '';
      b.setAttribute('aria-pressed', k === type);
      b.onclick = function () { type = k; renderTabs(); renderFields(); update(); };
      $('tabs').appendChild(b);
    });
  }
  function renderFields() {
    $('fields').innerHTML = '';
    TYPES[type].fields.forEach(function (f) {
      var l = document.createElement('label'), i;
      l.textContent = f[1];
      if (f[2] === 'textarea') i = document.createElement('textarea');
      else if (f[2] === 'select') { i = document.createElement('select'); f[3].forEach(function (o) { i.add(new Option(o === 'nopass' ? 'Aucune' : o, o)); }); }
      else { i = document.createElement('input'); i.type = f[2]; i.placeholder = f[3]; }
      i.dataset.f = f[0];
      l.appendChild(i); $('fields').appendChild(l);
    });
  }
  function values() {
    var v = {};
    $('fields').querySelectorAll('[data-f]').forEach(function (i) { v[i.dataset.f] = i.value; });
    return v;
  }
  function fgMode() { return document.querySelector('input[name=fgmode]:checked').value; }
  function transparentOn() { return document.querySelector('input[name=bgmode]:checked').value === 'transparent'; }
  function syncFgMode() {
    var grad = fgMode() === 'gradient';
    $('fg-single-1').hidden = grad;
    ['fg-grad-1', 'fg-grad-2', 'fg-grad-type'].forEach(function (id) { $(id).hidden = !grad; });
  }

  // ---- Champs couleur : rangée de swatches + pinceau (choix personnalisé)
  // Menu de couleur : une pastille ronde par champ ouvre une palette (pastilles rondes) + couleur libre
  var cmenu = null, cmenuInput = null;
  function closeColorMenu() {
    if (!cmenu) return;
    var chip = cmenuInput && cmenuInput._chip, inside = cmenu.contains(document.activeElement);
    cmenu.hidden = true;
    if (chip) { chip.setAttribute('aria-expanded', 'false'); if (inside) chip.focus(); }   // clavier : on rend le focus au bouton
    cmenuInput = null;
  }
  function buildColorMenu() {
    cmenu = document.createElement('div');
    cmenu.className = 'colormenu'; cmenu.hidden = true;
    cmenu.setAttribute('role', 'dialog'); cmenu.setAttribute('aria-modal', 'true'); cmenu.setAttribute('aria-label', 'Choisir une couleur');
    // le menu est en fin de page : sans ce piège, Tab sortirait du menu tout en le laissant ouvert
    cmenu.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = [].slice.call(cmenu.querySelectorAll('button, input'));
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    var grid = document.createElement('div'); grid.className = 'colormenu-grid';
    COLORS.forEach(function (c) {
      var s = document.createElement('button');
      s.type = 'button'; s.className = 'swatch'; s.style.background = c; s.title = c; s.setAttribute('aria-label', 'Couleur ' + c);
      s.onclick = function () {
        if (!cmenuInput) return;
        cmenuInput.value = c; cmenuInput.dispatchEvent(new Event('input', { bubbles: true }));
        closeColorMenu();
      };
      grid.appendChild(s);
    });
    var hexWrap = document.createElement('label'); hexWrap.className = 'colormenu-hex';
    hexWrap.innerHTML = '<span class="sr-only">Code hexadécimal</span>';
    var hex = document.createElement('input');
    hex.type = 'text'; hex.maxLength = 7; hex.placeholder = '#RRGGBB'; hex.spellcheck = false;
    hex.addEventListener('input', function () {
      var v = this.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v) && cmenuInput) { cmenuInput.value = v; cmenuInput.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    hexWrap.appendChild(hex); cmenu.hexInput = hex;

    var custom = document.createElement('button');
    custom.type = 'button'; custom.className = 'btn btn-ghost colormenu-custom'; custom.innerHTML = BRUSH + '<span>Couleur libre…</span>';
    custom.onclick = function () { var i = cmenuInput; closeColorMenu(); if (i) i.click(); };
    cmenu.appendChild(grid); cmenu.appendChild(hexWrap); cmenu.appendChild(custom);
    document.body.appendChild(cmenu);
    document.addEventListener('click', function (e) { if (cmenu.hidden) return; if (!cmenu.contains(e.target) && !e.target.closest('.colorchip')) closeColorMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeColorMenu(); });
    addEventListener('resize', closeColorMenu);
    addEventListener('scroll', closeColorMenu, true);
  }
  function openColorMenu(inp, chip) {
    if (!cmenu) buildColorMenu();
    if (cmenuInput === inp && !cmenu.hidden) return closeColorMenu();
    closeColorMenu();
    cmenuInput = inp; chip.setAttribute('aria-expanded', 'true');
    cmenu.hidden = false;
    var r = chip.getBoundingClientRect(), w = cmenu.offsetWidth, hgt = cmenu.offsetHeight;
    var left = Math.min(Math.max(8, r.left + scrollX), scrollX + innerWidth - w - 8);
    // si le menu dépasserait le bas de l'écran, on l'ouvre au-dessus du bouton
    var below = r.bottom + 6 + hgt <= innerHeight;
    cmenu.style.left = left + 'px';
    cmenu.style.top = (below ? r.bottom + scrollY + 6 : r.top + scrollY - hgt - 6) + 'px';
    if (cmenu.hexInput) cmenu.hexInput.value = inp.value;
    cmenu.querySelector('.swatch').focus({ preventScroll: true });   // sinon le défilement induit referme le menu
  }
  function enhanceColors() {
    ['fg', 'g1', 'g2', 'bgcol', 'csColor', 'cdColor', 'logoColor', 'frameColor', 'frameTextColor'].forEach(function (id) {
      var inp = $(id); if (!inp || inp.dataset.enh) return; inp.dataset.enh = 1;
      var wrap = document.createElement('span'); wrap.className = 'colorfield';
      inp.parentNode.insertBefore(wrap, inp);
      var chip = document.createElement('button');
      chip.type = 'button'; chip.className = 'colorchip'; chip.title = 'Changer la couleur';
      chip.setAttribute('aria-label', 'Changer la couleur'); chip.setAttribute('aria-expanded', 'false'); chip.setAttribute('aria-haspopup', 'dialog');
      chip.innerHTML = '<span class="colorchip-dot"></span><svg class="colorchip-caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      chip.style.setProperty('--c', inp.value);
      chip.onclick = function (e) { e.stopPropagation(); openColorMenu(inp, chip); };
      inp._chip = chip;
      inp.classList.add('sr-only');
      inp.addEventListener('input', function () { chip.style.setProperty('--c', inp.value); });
      wrap.appendChild(chip); wrap.appendChild(inp);
    });
  }

  function renderPresets() {
    PRESETS.forEach(function (p, idx) {
      var b = document.createElement('button');
      b.type = 'button'; b.title = p.name; b.setAttribute('aria-label', 'Modèle ' + p.name);
      var fg = p.grad ? 'url(#g' + idx + ')' : p.fg;
      var def = p.grad ? '<defs><linearGradient id="g' + idx + '"><stop offset="0" stop-color="' + p.grad[0] + '"/><stop offset="1" stop-color="' + p.grad[1] + '"/></linearGradient></defs>' : '';
      var fr = p.cs === 'dot' ? '<circle cx="{cx}" cy="{cy}" r="5.5" fill="none" stroke="' + p.eye + '" stroke-width="3"/>'
        : '<rect x="{x}" y="{y}" width="11" height="11" rx="' + (p.cs === 'extra-rounded' ? 4 : 1) + '" fill="none" stroke="' + p.eye + '" stroke-width="3"/>';
      function frame(x, y) { return fr.replace('{x}', x).replace('{y}', y).replace('{cx}', x + 5.5).replace('{cy}', y + 5.5); }
      var dots = '<g fill="' + fg + '">' + [[24, 24], [31, 24], [24, 31], [31, 31]].map(function (o) { return cell(p.dots, o[0], o[1], 4); }).join('') + '</g>';
      b.innerHTML = '<svg viewBox="0 0 40 40">' + def + '<rect width="40" height="40" fill="' + p.bg + '"/>' +
        frame(5, 5) + frame(24, 5) + frame(5, 24) + dots + '</svg>';
      b.onclick = function () { applyPreset(p); };
      $('presets').appendChild(b);
    });
  }
  function applyPreset(p) {
    if (p.grad) { document.querySelector('input[name=fgmode][value=gradient]').checked = true; setVal('g1', p.grad[0]); setVal('g2', p.grad[1]); $('gradType').value = p.grad[2]; }
    else { document.querySelector('input[name=fgmode][value=single]').checked = true; setVal('fg', p.fg); }
    shape.dotsType = p.dots; shape.csType = p.cs; shape.cdType = p.cd; markShapes();
    setVal('csColor', p.eye); setVal('cdColor', p.eye); setVal('bgcol', p.bg);
    syncFgMode(); update();
  }

  // ---- Sélecteurs visuels de formes
  function renderShapes() {
    Object.keys(SHAPES).forEach(function (id) {
      var box = $(id); box.innerHTML = '';
      SHAPES[id].forEach(function (o) {
        var b = document.createElement('button');
        b.type = 'button'; b.title = o[1]; b.setAttribute('aria-label', o[1]); b.dataset.val = o[0];
        b.innerHTML = o[2];
        b.onclick = function () { shape[id] = o[0]; markShapes(); update(); };
        box.appendChild(b);
      });
    });
    markShapes();
  }
  function markShapes() {
    Object.keys(SHAPES).forEach(function (id) {
      $(id).querySelectorAll('button').forEach(function (b) { var on = b.dataset.val === shape[id]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    });
  }

  // ---- Galerie d'icônes de logo
  function renderIcons() {
    var grid = $('icongrid'); grid.innerHTML = '';
    ICONS.forEach(function (ic, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.title = ic[0]; b.setAttribute('aria-label', 'Icône ' + ic[0]);
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ic[1] + '</svg>';
      b.onclick = function () { selectIcon(i); };
      grid.appendChild(b);
    });
    grid.style.color = $('logoColor').value;
  }
  function markIcons() {
    $('icongrid').querySelectorAll('button').forEach(function (b, i) { var on = i === logoIcon; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    $('logoClear').hidden = !logoURL;
  }
  function selectIcon(i) {
    logoIcon = i; logoURL = iconURL(ICONS[i][1], $('logoColor').value); $('logo').value = '';
    markIcons(); update();
  }

  // ---- Cadre : exemples + emballage du SVG
  function renderFrames() {
    var box = $('frameStyle'); box.innerHTML = '';
    FRAMES.forEach(function (ex, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.title = ex.name; b.setAttribute('aria-label', 'Cadre ' + ex.name); b.dataset.i = i;
      b.innerHTML = frameGlyphBox(ex);
      b.onclick = function () { applyFrame(ex); };
      box.appendChild(b);
    });
  }
  function markFrames() {
    $('frameStyle').querySelectorAll('button').forEach(function (b) {
      var ex = FRAMES[b.dataset.i], on = $('frameOn').checked && ex.style === frameStyle && ex.fcol === $('frameColor').value;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    });
  }
  function applyFrame(ex) {
    $('frameOn').checked = true; $('frameOpts').hidden = false;
    frameStyle = ex.style; setVal('frameColor', ex.fcol); setVal('frameTextColor', ex.tcol);
    markFrames(); update();
  }
  // Emballe le QR (svg 300x300) dans un cadre coloré avec un bandeau de texte
  function framed(qr, text) {
    var M = 22, B = 56, fcol = $('frameColor').value, tcol = $('frameTextColor').value;
    var inner0 = qr.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    if (frameStyle === 'circle') {
      // Disque de 440 : pastille blanche (r=170) centrée en y=190 qui contient tout juste le QR réduit à 240,
      // le texte occupe l'arc bas. Taille de police ajustée à la largeur disponible (252 px).
      var fs = text ? Math.max(12, Math.min(24, Math.floor(252 / (0.58 * text.length)))) : 24;
      return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 440 440" width="440" height="440">' +
        '<circle cx="220" cy="220" r="220" fill="' + fcol + '"/>' +
        '<circle cx="220" cy="190" r="170" fill="#ffffff"/>' +
        '<g transform="translate(100 70) scale(0.8)">' + inner0 + '</g>' +
        (text ? '<text x="220" y="402" font-family="Marianne, system-ui, sans-serif" font-size="' + fs + '" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="' + tcol + '">' + xml(text) + '</text>' : '') +
        '</svg>';
    }
    var r = { classic: 24, top: 24, ribbon: 6, pill: 42 }[frameStyle] || 24, top = frameStyle === 'top';
    var TW = 300 + 2 * M, TH = 300 + M + B, qy = top ? B : M, ty = top ? B / 2 : M + 300 + B / 2;
    var inner = inner0;
    return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + TW + ' ' + TH + '" width="' + TW + '" height="' + TH + '">' +
      '<rect width="' + TW + '" height="' + TH + '" rx="' + r + '" fill="' + fcol + '"/>' +
      '<rect x="' + (M - 8) + '" y="' + (qy - 8) + '" width="316" height="316" rx="10" fill="#ffffff"/>' +
      '<g transform="translate(' + M + ' ' + qy + ')">' + inner + '</g>' +
      (text ? '<text x="' + (TW / 2) + '" y="' + ty + '" font-family="Marianne, system-ui, sans-serif" font-size="26" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="' + tcol + '">' + xml(text) + '</text>' : '') +
      '</svg>';
  }

  // ======================= Rendu QR =======================
  function qrOptions(data) {
    var dots = { type: shape.dotsType };
    if (fgMode() === 'gradient') dots.gradient = { type: $('gradType').value, rotation: 0, colorStops: [{ offset: 0, color: $('g1').value }, { offset: 1, color: $('g2').value }] };
    else dots.color = $('fg').value;
    var o = {
      width: 300, height: 300, type: 'svg', data: data, margin: 8,
      qrOptions: { errorCorrectionLevel: logoURL ? 'H' : $('ec').value },
      dotsOptions: dots,
      cornersSquareOptions: { type: shape.csType, color: $('csColor').value },
      cornersDotOptions: { type: shape.cdType, color: $('cdColor').value },
      backgroundOptions: { color: transparentOn() ? 'transparent' : $('bgcol').value }
    };
    if (logoURL) { o.image = logoURL; o.imageOptions = { margin: 3, imageSize: LOGO_SIZE, hideBackgroundDots: true }; }
    return o;
  }
  // Construit le SVG (source unique). Légende ou cadre ajoutés ensuite.
  function buildSVG(data, withCaption) {
    var q;
    // la bibliothèque lève de façon synchrone (ex. « code length overflow ») :
    // sans ce try, l'exception échappe à la chaîne de promesses et l'état d'erreur ne s'affiche jamais
    try { q = new QRCodeStyling(qrOptions(data)); } catch (e) { return Promise.reject(e); }
    return q.getRawData('svg').then(function (blob) { return blob.text(); }).then(function (s) {
      var text = $('caption').value.trim();
      if ($('frameOn').checked) return framed(s, text || 'SCANNEZ-MOI');
      var cap = withCaption ? text : '';
      if (cap) {
        var col = fgMode() === 'gradient' ? $('g1').value : $('fg').value;
        var bg = transparentOn() ? 'transparent' : $('bgcol').value;
        s = s.replace(/<svg[^>]*>/, function (tag) {   // on ne touche que la balise racine, pas un élément interne
          return tag.replace('height="300"', 'height="334"').replace('viewBox="0 0 300 300"', 'viewBox="0 0 300 334"');
        });
        s = s.replace('</svg>', '<rect x="0" y="300" width="300" height="34" fill="' + bg + '"/>' +
          '<text x="150" y="323" font-family="Marianne, system-ui, sans-serif" font-size="17" font-weight="700" text-anchor="middle" fill="' + col + '">' + xml(cap) + '</text></svg>');
      }
      return s;
    });
  }

  var annTimer;
  function qrLabel(data) { return TYPES[type].label + ' : ' + data.replace(/\s+/g, ' ').slice(0, 60); }
  function announce(t) { clearTimeout(annTimer); annTimer = setTimeout(function () { $('announce').textContent = t; }, 600); }

  // Le cadre est un aplat de couleur : il remplit l'image, donc « Transparent » n'a plus d'effet
  function syncBgWarn() {
    var w = $('bgWarn'), on = $('frameOn').checked && transparentOn();
    w.hidden = !on;
    if (on) w.textContent = "Un cadre remplit toute l'image : l'export ne peut pas être transparent, et le QR reste sur fond clair pour rester lisible. Décochez « Encadrer le QR » pour un fond réellement transparent.";
  }

  function setButtons(ok) { ['dlPng', 'dlSvg', 'copy', 'print'].forEach(function (id) { $(id).disabled = !ok; }); }

  function update() {
    saveLook(); syncBgWarn();
    var data = TYPES[type].build(values());
    if (!data) { svg = ''; setButtons(false); $('out').innerHTML = '<p class="out-empty">Remplissez le formulaire pour voir le QR code.</p>'; sheetSchedule(); return; }
    var my = ++token;
    buildSVG(data, true).then(function (s) {
      if (my !== token) return;
      svg = s; $('out').innerHTML = s; $('msg').textContent = ''; setButtons(true); sheetSchedule();
      var sv = $('out').querySelector('svg');
      if (sv) { sv.setAttribute('role', 'img'); sv.setAttribute('aria-label', 'QR code — ' + qrLabel(data)); }
      announce('QR code prêt, ' + qrLabel(data));
    }).catch(function () {
      if (my !== token) return;
      svg = ''; setButtons(false); $('out').innerHTML = '<p class="out-empty">Contenu trop long pour un QR code.</p>';
      announce('Contenu trop long pour un QR code.');
    });
  }

  // ---- Réinitialiser l'apparence
  function setVal(id, v) { var e = $(id); if (e) { e.value = v; e.dispatchEvent(new Event('input')); } }   // non-bulle : met à jour le pinceau sans relancer update
  function reset() {
    document.querySelector('input[name=fgmode][value=single]').checked = true; syncFgMode();
    setVal('fg', '#000000'); setVal('bgcol', '#ffffff'); setVal('csColor', '#000000'); setVal('cdColor', '#000000');
    setVal('logoColor', '#000000'); setVal('g1', '#166534'); setVal('g2', '#6d28d9'); $('gradType').value = 'linear';
    shape = { dotsType: 'square', csType: 'square', cdType: 'square' }; markShapes();
    logoURL = ''; logoIcon = -1; $('logo').value = ''; markIcons();
    $('frameOn').checked = false; $('frameOpts').hidden = true; frameStyle = 'classic'; setVal('frameColor', '#000000'); setVal('frameTextColor', '#ffffff'); markFrames();
    $('caption').value = ''; document.querySelector('input[name=bgmode][value=opaque]').checked = true; $('ec').value = 'M';
    $('size').value = 1024; $('sizeVal').textContent = '1024';
    try { localStorage.removeItem(LOOK_KEY); } catch (e) { /* navigation privée */ }
    update();
  }

  // ======================= Export =======================
  function toPNG(cb, px, src) {
    src = src || svg;
    var vb = src.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/), w = px || +$('size').value, h = Math.round(w * vb[2] / vb[1]);
    var url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }));   // Blob URL : fiable même en grande taille
    var img = new Image();
    img.onload = function () {
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      try { cv.toBlob(function (bl) { bl ? cb(bl) : say('Export PNG impossible sur ce navigateur, essayez SVG.'); }, 'image/png'); }
      catch (e) { say('Export PNG impossible sur ce navigateur, essayez SVG.'); }
    };
    img.onerror = function () { URL.revokeObjectURL(url); say('Export PNG impossible, essayez SVG.'); };
    img.src = url;
  }
  function save(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  var say = function (t) { $('msg').textContent = t; };
  function clean(s) { return (s || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '').trim().slice(0, 60); }
  function fileName() { return clean($('fname').value) || 'qrcode'; }

  $('dlPng').onclick = function () { toPNG(function (b) { save(b, fileName() + '.png'); say('PNG téléchargé : ' + fileName() + '.png'); }); };
  $('dlSvg').onclick = function () { save(new Blob([svg], { type: 'image/svg+xml' }), fileName() + '.svg'); say('SVG téléchargé : ' + fileName() + '.svg'); };
  $('copy').onclick = function () {
    toPNG(function (b) {
      navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(function () { say('Copié !'); }, function () { say('Copie impossible, utilisez PNG.'); });
    }, 512);
  };
  $('print').onclick = function () {   // iframe caché : pas de pop-up à autoriser
    var f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    var d = f.contentWindow.document;
    d.write('<title>QR code</title><body style="margin:0;display:grid;place-items:center;height:100vh">' + svg.replace('<svg ', '<svg style="width:80vmin" ') + '</body>');
    d.close();
    setTimeout(function () { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(function () { f.remove(); }, 1000); }, 150);
  };

  $('logoUpload').onclick = function () { $('logo').click(); };
  $('logo').onchange = function () {
    var f = this.files[0];
    if (!f) return;
    var r = new FileReader(); r.onload = function () { logoIcon = -1; logoURL = r.result; markIcons(); update(); }; r.readAsDataURL(f);
  };
  $('logoColor').addEventListener('input', function () {
    $('icongrid').style.color = this.value;
    if (logoIcon >= 0) { logoURL = iconURL(ICONS[logoIcon][1], this.value); update(); }
  });
  $('logoClear').onclick = function () { logoURL = ''; logoIcon = -1; $('logo').value = ''; markIcons(); update(); };

  // ======================= Génération en lot (ZIP sans compression) =======================
  var CRC = (function () { var t = [], n, k, c; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(d) { var c = -1; for (var i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
  function zip(files) {
    var enc = new TextEncoder(), parts = [], cen = [], off = 0;
    files.forEach(function (f) {
      var n = enc.encode(f.name), len = f.data.length, crc = crc32(f.data), h = new DataView(new ArrayBuffer(30)), c = new DataView(new ArrayBuffer(46));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true); h.setUint16(12, 0x21, true);
      h.setUint32(14, crc, true); h.setUint32(18, len, true); h.setUint32(22, len, true); h.setUint16(26, n.length, true);
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true); c.setUint16(14, 0x21, true);
      c.setUint32(16, crc, true); c.setUint32(20, len, true); c.setUint32(24, len, true); c.setUint16(28, n.length, true); c.setUint32(42, off, true);
      parts.push(h, n, f.data); cen.push(c, n); off += 30 + n.length + len;
    });
    var size = 0, e = new DataView(new ArrayBuffer(22));
    cen.forEach(function (p) { size += p.byteLength; });
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(cen, [e]), { type: 'application/zip' });
  }
  function parseLines(txt) {
    return txt.split(/\r?\n/).map(function (l) { var p = l.split(l.indexOf('\t') >= 0 ? '\t' : ';'); return [p[0].trim(), clean(p[1])]; })
      .filter(function (p) { return p[0]; }).slice(0, 200);
  }
  function linesCount() {
    var n = parseLines($('lines').value).length, raw = $('lines').value.split(/\r?\n/).filter(function (l) { return l.trim(); }).length;
    $('linesCount').textContent = n + ' ligne' + (n > 1 ? 's' : '') + ' comprise' + (n > 1 ? 's' : '') +
      (raw > n ? ' sur ' + raw + ' (200 maximum)' : ' (200 maximum)');
  }
  $('csv').onchange = function () {
    var f = this.files[0], r = new FileReader();
    if (f) { r.onload = function () { $('lines').value = r.result; }; r.readAsText(f); }
  };
  $('zip').onclick = function () {
    var rows = parseLines($('lines').value), used = {}, files = [], i = 0, px = +$('size').value;
    if (!rows.length) return say('Ajoutez au moins une ligne.');
    say('Génération…');
    (function next() {
      if (i === rows.length) return save(zip(files), 'codes-qr.zip'), say(rows.length + ' QR codes générés : codes-qr.zip');
      var row = rows[i], base = row[1] || ('qr-' + (i + 1)), n = used[base] = (used[base] || 0) + 1;
      if (n > 1) base += '-' + n;
      buildSVG(row[0], false).then(function (s) {
        files.push({ name: base + '.svg', data: new TextEncoder().encode(s) });
        toPNG(function (b) { b.arrayBuffer().then(function (buf) { files.push({ name: base + '.png', data: new Uint8Array(buf) }); i++; next(); }); }, px, s);
      }).catch(function () { say('Ligne ' + (i + 1) + ' trop longue pour un QR code.'); });
    })();
  };

  // ======================= Planche à imprimer =======================
  // Idée inspirée de QRPrint ; implémentation propre : on raisonne en taille réelle (mm)
  // et on laisse le navigateur imprimer une vraie page A4, sans bibliothèque PDF.
  var A4 = { portrait: [210, 297], landscape: [297, 210] }, SHEET_MARGIN = 8, SHEET_GAP = 4;
  function svgURL(s) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); }
  function pick(name) { return document.querySelector('input[name=' + name + ']:checked').value; }

  function sheetOpts() {
    var size = +pick('sheetsize'), orient = pick('sheetorient'), page = A4[orient];
    var cols = Math.max(1, Math.floor((page[0] - 2 * SHEET_MARGIN + SHEET_GAP) / (size + SHEET_GAP)));
    var rows = Math.max(1, Math.floor((page[1] - 2 * SHEET_MARGIN + SHEET_GAP) / (size + SHEET_GAP)));
    return { size: size, orient: orient, page: page, cols: cols, rows: rows, perPage: cols * rows };
  }
  // Rassemble les SVG à poser sur la planche
  function sheetUsesList() { return parseLines($('lines').value).length > 0; }
  function sheetItems(limit) {
    if (sheetUsesList()) {
      var rows = parseLines($('lines').value);
      if (!rows.length) return Promise.reject(new Error('La liste du lot est vide.'));
      if (limit) rows = rows.slice(0, limit);
      return Promise.all(rows.map(function (r) { return buildSVG(r[0], false); }));
    }
    if (!svg) return Promise.reject(new Error('Créez d\'abord un QR code.'));
    var n = Math.max(1, Math.min(500, +$('sheetCount').value || 1));
    if (limit) n = Math.min(n, limit);
    return Promise.resolve(new Array(n).fill(svg));
  }

  function sheetRefresh() {
    var o = sheetOpts(), list = sheetUsesList();
    $('sheetSourceNote').textContent = list
      ? 'La planche reprend les ' + parseLines($('lines').value).length + ' codes de la liste ci-dessus.'
      : 'La liste est vide : la planche répète le QR code affiché. Ajoutez des lignes au-dessus pour imprimer des codes différents.';
    $('sheetCountRow').hidden = list;
    var n = list ? parseLines($('lines').value).length : Math.max(1, Math.min(500, +$('sheetCount').value || 1));
    var pages = Math.max(1, Math.ceil(n / o.perPage));
    $('sheetInfo').textContent = o.cols + ' × ' + o.rows + ' = ' + o.perPage + ' QR par page A4 ' +
      (o.orient === 'portrait' ? 'portrait' : 'paysage') + ' — ' + n + ' QR, ' + pages + ' page' + (pages > 1 ? 's' : '');
    var box = $('sheetPreview');
    box.className = 'sheet-preview' + ($('sheetCut').checked ? ' cut' : '');
    box.style.aspectRatio = o.page[0] + ' / ' + o.page[1];
    box.style.setProperty('--cols', o.cols);
    box.style.setProperty('--ppad', (SHEET_MARGIN / o.page[0] * 100) + '%');
    box.style.setProperty('--pgap', (SHEET_GAP / o.page[0] * 100) + '%');
    var my = ++sheetToken;
    sheetItems(o.perPage).then(function (items) {
      if (my !== sheetToken) return;   // une demande plus récente a pris la main
      box.innerHTML = items.map(function (s) { return '<span class="cell"><img src="' + svgURL(s) + '" alt=""></span>'; }).join('');
    }).catch(function (e) {
      if (my !== sheetToken) return;
      box.innerHTML = '<p class="out-empty">' + xml(e.message) + '</p>';
    });
  }
  var sheetTimer, sheetToken = 0;
  function sheetSchedule() { if ($('sheet').open) { clearTimeout(sheetTimer); sheetTimer = setTimeout(sheetRefresh, 150); } }

  function sheetDoPrint() {
    sheetItems().then(function (items) {
      var o = sheetOpts(), host = $('printSheet');
      // orientation via une page nommée déclarée dans style.css (pas de <style> injecté : CSP style-src 'self')
      host.className = 'print-sheet ' + o.orient + ($('sheetCut').checked ? ' cut' : '');
      host.style.setProperty('--qr', o.size + 'mm');
      host.style.setProperty('--cols', o.cols);   // grille figée : l'impression correspond à l'aperçu
      host.style.setProperty('--gap', SHEET_GAP + 'mm');
      host.innerHTML = items.map(function (s) { return '<span class="print-cell"><img src="' + svgURL(s) + '" alt=""></span>'; }).join('');
      var imgs = [].slice.call(host.querySelectorAll('img'));
      return Promise.all(imgs.map(function (i) { return i.decode ? i.decode().catch(function () {}) : null; })).then(function () {
        document.body.classList.add('printing');
        var done = function () {
          if (!document.body.classList.contains('printing')) return;
          document.body.classList.remove('printing'); host.innerHTML = '';
          removeEventListener('afterprint', done); removeEventListener('focus', done);
        };
        addEventListener('afterprint', done);
        addEventListener('focus', done);   // filet : la fenêtre reprend le focus à la fermeture du dialogue
        print();
      });
    }).catch(function (e) { say(e.message || 'Impression impossible.'); });
  }

  // ======================= Mémoire de l'apparence =======================
  var LOOK_KEY = 'qr-mn76-look', HEX = /^#[0-9a-f]{6}$/i;
  var COLOR_IDS = ['fg', 'g1', 'g2', 'csColor', 'cdColor', 'bgcol', 'logoColor', 'frameColor', 'frameTextColor'];
  var DOT_VALS = DOT_TYPES.map(function (o) { return o[0]; }), CS_VALS = ['square', 'dot', 'extra-rounded'];
  function saveLook() {
    try {
      localStorage.setItem(LOOK_KEY, JSON.stringify({
        fgmode: fgMode(), gradType: $('gradType').value, ec: $('ec').value,
        dots: shape.dotsType, cs: shape.csType, cd: shape.cdType,
        logoIcon: logoIcon, frameOn: $('frameOn').checked, frameStyle: frameStyle,
        bgmode: pick('bgmode'), size: $('size').value,
        colors: COLOR_IDS.reduce(function (o, id) { o[id] = $(id).value; return o; }, {})
      }));
    } catch (e) { /* navigation privée */ }
  }
  // Les valeurs relues sont validées : le stockage du navigateur est modifiable par l'utilisateur
  function loadLook() {
    var v; try { v = JSON.parse(localStorage.getItem(LOOK_KEY)); } catch (e) { return; }
    if (!v || typeof v !== 'object') return;
    if (v.colors) COLOR_IDS.forEach(function (id) { if (HEX.test(v.colors[id] || '')) setVal(id, v.colors[id]); });
    if (v.fgmode === 'single' || v.fgmode === 'gradient') { document.querySelector('input[name=fgmode][value=' + v.fgmode + ']').checked = true; }
    if (v.gradType === 'linear' || v.gradType === 'radial') $('gradType').value = v.gradType;
    if (['L', 'M', 'Q', 'H'].indexOf(v.ec) >= 0) $('ec').value = v.ec;
    if (DOT_VALS.indexOf(v.dots) >= 0) shape.dotsType = v.dots;
    if (CS_VALS.indexOf(v.cs) >= 0) shape.csType = v.cs;
    if (DOT_VALS.indexOf(v.cd) >= 0) shape.cdType = v.cd;
    if (typeof v.logoIcon === 'number' && v.logoIcon >= 0 && v.logoIcon < ICONS.length) {
      logoIcon = v.logoIcon; logoURL = iconURL(ICONS[logoIcon][1], $('logoColor').value);
    }
    if (v.frameOn === true) { $('frameOn').checked = true; $('frameOpts').hidden = false; }
    if (['circle', 'classic', 'top', 'ribbon', 'pill'].indexOf(v.frameStyle) >= 0) frameStyle = v.frameStyle;
    if (v.bgmode === 'opaque' || v.bgmode === 'transparent') document.querySelector('input[name=bgmode][value=' + v.bgmode + ']').checked = true;
    var s = +v.size; if (s >= 256 && s <= 2048) { $('size').value = s; $('sizeVal').textContent = s; }
    syncFgMode();
  }

  // ======================= Deux modes : assistant / complet =======================
  // L'assistant ne duplique rien : il déplace les vrais contrôles dans son emplacement,
  // chacun gardant ses écouteurs et son état. Un repère (commentaire) marque leur place d'origine.
  var MODE_KEY = 'qr-mn76-mode', wizStep = 0;
  var STEPS = [
    { phase: 'Contenu', title: 'Que doit faire votre QR code ?',
      help: 'Choisissez ce qui se passera quand quelqu\'un le scannera avec son téléphone.',
      more: "Un QR code contient du texte. Selon la façon dont ce texte est écrit, le téléphone comprend qu'il s'agit d'un site, d'un réseau Wi-Fi, d'un contact… et propose l'action correspondante. C'est tout ce que change ce choix.",
      nodes: ['#tabs'] },
    { phase: 'Contenu', title: 'Votre contenu',
      help: '', more: '', nodes: ['#fields'], needData: true },
    { phase: 'Apparence', title: 'L\'allure (facultatif)',
      help: 'Cliquez un modèle pour tout changer d\'un coup, ou réglez vous-même les couleurs juste en dessous.',
      more: "Gardez un fort contraste : code foncé sur fond clair. C'est ce qui garantit qu'il sera lu par tous les téléphones, même anciens, même mal imprimé. Le premier modèle est le style classique, le plus sûr. « Dégradé » fait passer les modules d'une couleur à l'autre ; pour régler aussi la forme des modules et des marqueurs, basculez en mode Complet.",
      nodes: ['#presets', '#fgModeRow', '#fg-single-1', '#fg-grad-1', '#fg-grad-2', '#fg-grad-type', '#bgColorRow'] },
    { phase: 'Apparence', title: 'Un logo au centre (facultatif)',
      help: 'Choisissez une icône, ou importez votre propre image (logo de l\'école, de la collectivité…).',
      more: "Dès qu'un logo est présent, la correction d'erreur passe au maximum pour compenser la zone masquée : le code reste lisible. Évitez les images très claires ou très détaillées, et testez toujours le scan après avoir ajouté un logo. « Retirer » revient à un code sans logo.",
      nodes: ['#subLogo'] },
    { phase: 'Apparence', title: 'Un cadre avec un message (facultatif)',
      help: 'Un cadre avec « Scannez-moi » augmente nettement le nombre de personnes qui scannent une affiche.',
      more: "Cochez « Encadrer le QR », ou cliquez directement un exemple. Le texte affiché est celui du champ ci-dessus (40 caractères maximum). Attention : un cadre remplit toute l'image, l'export ne pourra donc pas être transparent.",
      nodes: ['#subFrame'] },
    { phase: 'Récupérer', title: 'Récupérer votre QR code',
      help: 'Votre code est prêt, à droite (ou juste au-dessus sur téléphone). Choisissez le format et téléchargez-le.',
      more: "PNG pour un document ou un écran ; SVG pour l'imprimeur, car il s'agrandit sans perte. Le curseur règle la taille du PNG. Le bloc « Plusieurs codes à la fois » sert à en produire une série : « Ajouter le code affiché » verse le code en cours dans la liste, puis vous choisissez une archive ZIP ou une planche A4 à découper. L'apparence réglée aux étapes précédentes s'applique à tous. Testez toujours le code avec un téléphone avant de le diffuser.",
      nodes: ['#multi'] }
  ];
  function wizTake(sel) {
    var n = document.querySelector(sel); if (!n) return;
    if (!n.wizHome) { var ph = document.createComment('wiz'); n.parentNode.insertBefore(ph, n); n.wizHome = ph; }
    if (n.tagName === 'DETAILS') { n.wizWasOpen = n.open; n.open = true; }   // une étape ne doit rien cacher
    $('wizSlot').appendChild(n);
  }
  function wizReturn() {
    [].slice.call($('wizSlot').children).forEach(function (n) {
      if (n.tagName === 'DETAILS' && n.wizWasOpen !== undefined) n.open = n.wizWasOpen;
      if (n.wizHome && n.wizHome.parentNode) n.wizHome.parentNode.insertBefore(n, n.wizHome);
    });
  }
  function wizShow(i) {
    wizReturn();
    wizStep = Math.max(0, Math.min(STEPS.length - 1, i));
    var s = STEPS[wizStep];
    $('wizProgress').textContent = 'Étape ' + (wizStep + 1) + ' sur ' + STEPS.length + ' — ' + s.phase;
    $('wizFill').style.width = ((wizStep + 1) / STEPS.length * 100) + '%';
    $('wizTitle').textContent = s.title;
    var help = s.help, more = s.more;
    if (wizStep === 1) { help = TYPES[type].tip; more = "Le contenu peut être modifié à tout moment : l'aperçu se met à jour tout seul, il n'y a rien à valider."; }
    $('wizHelp').textContent = help;
    $('wizMoreText').textContent = more;
    $('wizMore').hidden = !more; $('wizMore').open = false;
    s.nodes.forEach(wizTake);
    $('wizPrev').disabled = wizStep === 0;
    $('wizNext').textContent = wizStep === STEPS.length - 1 ? 'Terminer' : 'Suivant →';
    $('wizNote').textContent = '';
    // Dernière étape : petit signal de réussite, coupé si les animations sont réduites
    var last = wizStep === STEPS.length - 1;
    $('wizDone').hidden = !last;
    if (last && document.documentElement.dataset.motion !== 'reduce') {
      var o = $('out');
      o.classList.remove('pop'); void o.offsetWidth; o.classList.add('pop');
      setTimeout(function () { o.classList.remove('pop'); }, 900);
      var dl = $('dlPng');   // on pointe l'action à faire : 3 clignotements, puis plus rien
      dl.classList.remove('attn'); void dl.offsetWidth; dl.classList.add('attn');
      setTimeout(function () { dl.classList.remove('attn'); }, 2000);
    }
  }
  function setMode(m) {
    var guided = m === 'guided';
    document.querySelector('input[name=mode][value=' + (guided ? 'guided' : 'full') + ']').checked = true;
    $('wizard').hidden = !guided;
    if (guided) { wizShow(wizStep); } else { wizReturn(); }
    $('content').hidden = guided; $('tools').hidden = guided;
    try { localStorage.setItem(MODE_KEY, m); } catch (e) { /* navigation privée */ }
  }

  // ======================= Écouteurs =======================
  $('size').addEventListener('input', function () { $('sizeVal').textContent = this.value; });
  $('fg-mode').addEventListener('change', syncFgMode);
  $('frameOn').addEventListener('change', function () { $('frameOpts').hidden = !this.checked; markFrames(); update(); });
  $('frameColor').addEventListener('input', markFrames);
  $('ecHintBtn').addEventListener('click', function () {
    var h = $('ecHint'); h.hidden = !h.hidden; this.setAttribute('aria-expanded', String(!h.hidden));
  });
  $('bgMode').addEventListener('change', update);   // dans le panneau Aperçu, hors de l'écouteur du formulaire
  $('resetBtn').addEventListener('click', reset);
  ['sheetSize', 'sheetOrient'].forEach(function (id) {
    $(id).addEventListener('change', function () {
      $('sheetCount').value = sheetOpts().perPage;   // nouvelle capacité de page
      sheetRefresh();
    });
  });
  // Pont entre le formulaire riche et la liste : on y verse le code en cours.
  // Séparateur tabulation, car un contenu Wi-Fi contient des « ; » que la liste découperait.
  $('addCurrent').addEventListener('click', function () {
    var data = TYPES[type].build(values());
    if (!data) return void ($('addNote').textContent = 'Saisissez d\'abord un contenu à ajouter.');
    if (data.indexOf('\n') >= 0) return void ($('addNote').textContent = 'Un contact tient sur plusieurs lignes : il ne peut pas entrer dans la liste. Exportez-le seul en PNG ou SVG.');
    var rows = parseLines($('lines').value);
    if (rows.length >= 200) return void ($('addNote').textContent = 'La liste est pleine (200 codes maximum).');
    var cur = $('lines').value.replace(/\s*$/, '');
    $('lines').value = (cur ? cur + '\n' : '') + data + '\t' + fileName();
    linesCount(); sheetSchedule();
    $('addNote').textContent = 'Ajouté : « ' + fileName() + ' ». La liste compte ' + parseLines($('lines').value).length + ' code(s).';
  });
  $('lines').addEventListener('input', function () { linesCount(); sheetSchedule(); });
  $('sheetCut').addEventListener('change', sheetRefresh);
  $('sheetCount').addEventListener('input', sheetSchedule);
  $('sheet').addEventListener('toggle', function () { if (this.open) sheetRefresh(); });
  $('sheetPrint').addEventListener('click', sheetDoPrint);
  $('wizPrev').addEventListener('click', function () { wizShow(wizStep - 1); });
  $('wizNext').addEventListener('click', function () {
    if (STEPS[wizStep].needData && !svg) { $('wizNote').textContent = 'Saisissez d\'abord un contenu pour continuer.'; return; }
    if (wizStep === STEPS.length - 1) { $('wizNote').textContent = 'Terminé. Pensez à tester le code avec un téléphone avant de le diffuser.'; return; }
    wizShow(wizStep + 1);
  });
  $('modeSwitch').addEventListener('change', function (e) { setMode(e.target.value); });
  $('goSheet').addEventListener('click', function () {
    if (!$('wizard').hidden) wizShow(STEPS.length - 1);   // l'assistant doit d'abord amener le bloc à l'écran
    var s = $('sheet'); $('multi').open = true; s.open = true; sheetRefresh();
    s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    s.querySelector('summary').focus({ preventScroll: true });
    s.classList.remove('flash'); void s.offsetWidth; s.classList.add('flash');   // on montre où on vient d'arriver
    setTimeout(function () { s.classList.remove('flash'); }, 2600);
  });
  $('main').addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(update, 120); });

  enhanceColors(); linesCount(); loadLook();
  renderTabs(); renderFields(); renderPresets(); renderShapes(); renderIcons(); markIcons(); renderFrames(); markFrames(); update();
  var savedMode; try { savedMode = localStorage.getItem(MODE_KEY); } catch (e) { /* navigation privée */ }
  setMode(savedMode === 'full' ? 'full' : 'guided');   // 1re visite : pas à pas
})();
