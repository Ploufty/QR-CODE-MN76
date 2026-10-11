(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/([\\;,":])/g, '\\$1'); };            // Wi-Fi
  var vc = function (s) { return String(s).replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n'); };
  var xml = function (s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); };

  // ---- Types : champs [id, libellé, type, placeholder|options] et build() -> chaîne ('' = incomplet)
  var TYPES = {
    url: { label: 'Lien', fields: [['u', 'Adresse du site', 'url', 'https://exemple.fr']],
      build: function (v) { var u = v.u.trim(); return u && !/^[a-z][a-z0-9+.-]*:/i.test(u) ? 'https://' + u : u; } },
    text: { label: 'Texte', fields: [['t', 'Message', 'textarea', '']],
      build: function (v) { return v.t; } },
    wifi: { label: 'Wi-Fi', fields: [['s', 'Nom du réseau (SSID)', 'text', ''], ['p', 'Mot de passe', 'text', ''], ['k', 'Sécurité', 'select', ['WPA', 'WEP', 'nopass']]],
      build: function (v) { return v.s ? 'WIFI:T:' + v.k + ';S:' + esc(v.s) + ';' + (v.k === 'nopass' ? '' : 'P:' + esc(v.p) + ';') + ';' : ''; } },
    contact: { label: 'Contact', fields: [['n', 'Nom complet', 'text', ''], ['o', 'Société', 'text', ''], ['f', 'Téléphone', 'tel', ''], ['m', 'E-mail', 'email', '']],
      build: function (v) { return v.n ? ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + vc(v.n), v.o && 'ORG:' + vc(v.o), v.f && 'TEL:' + vc(v.f), v.m && 'EMAIL:' + vc(v.m), 'END:VCARD'].filter(Boolean).join('\n') : ''; } },
    mail: { label: 'E-mail', fields: [['a', 'Destinataire', 'email', ''], ['j', 'Objet', 'text', ''], ['b', 'Message', 'textarea', '']],
      build: function (v) { return v.a ? 'mailto:' + v.a + '?subject=' + encodeURIComponent(v.j) + '&body=' + encodeURIComponent(v.b) : ''; } },
    tel: { label: 'Téléphone', fields: [['n', 'Numéro', 'tel', '+33 6 00 00 00 00']],
      build: function (v) { return v.n ? 'tel:' + v.n.replace(/[^\d+]/g, '') : ''; } }
  };

  // ---- Modèles rapides (apparence prête à cliquer)
  var PRESETS = [
    { name: 'Océan', fg: '#0b5394', dots: 'square', cs: 'square', cd: 'square', eye: '#0b5394', bg: '#ffffff' },
    { name: 'Turquoise arrondi', fg: '#00727a', dots: 'rounded', cs: 'extra-rounded', cd: 'dot', eye: '#00727a', bg: '#ffffff' },
    { name: 'Dégradé océan', grad: ['#0b5394', '#00727a', 'linear'], dots: 'rounded', cs: 'extra-rounded', cd: 'dot', eye: '#0b5394', bg: '#ffffff' },
    { name: 'Framboise', fg: '#c2185b', dots: 'dots', cs: 'dot', cd: 'dot', eye: '#c2185b', bg: '#ffffff' },
    { name: 'Noir élégant', fg: '#1e1e2f', dots: 'classy-rounded', cs: 'extra-rounded', cd: 'square', eye: '#1e1e2f', bg: '#ffffff' },
    { name: 'Nuit inversée', fg: '#eeeef6', dots: 'classy', cs: 'square', cd: 'square', eye: '#7fb3ff', bg: '#11111b' }
  ];

  var type = 'url', svg = '', logoURL = '', timer, token = 0;
  var LOGO_SIZE = 0.4;

  // ======================= UI =======================
  function renderTabs() {
    $('tabs').innerHTML = '';
    Object.keys(TYPES).forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = TYPES[k].label; b.className = k === type ? 'on' : '';
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
  function syncFgMode() {
    var grad = fgMode() === 'gradient';
    $('fg-single-1').hidden = grad;
    ['fg-grad-1', 'fg-grad-2', 'fg-grad-type'].forEach(function (id) { $(id).hidden = !grad; });
  }

  function renderPresets() {
    PRESETS.forEach(function (p, idx) {
      var b = document.createElement('button');
      b.type = 'button'; b.title = p.name; b.setAttribute('aria-label', 'Modèle ' + p.name);
      var fg = p.grad ? 'url(#g' + idx + ')' : p.fg;
      var def = p.grad ? '<defs><linearGradient id="g' + idx + '"><stop offset="0" stop-color="' + p.grad[0] + '"/><stop offset="1" stop-color="' + p.grad[1] + '"/></linearGradient></defs>' : '';
      b.innerHTML = '<svg viewBox="0 0 40 40">' + def + '<rect width="40" height="40" fill="' + p.bg + '"/>' +
        '<rect x="5" y="5" width="11" height="11" rx="2" fill="none" stroke="' + p.eye + '" stroke-width="3"/>' +
        '<rect x="24" y="5" width="11" height="11" rx="2" fill="none" stroke="' + p.eye + '" stroke-width="3"/>' +
        '<rect x="5" y="24" width="11" height="11" rx="2" fill="none" stroke="' + p.eye + '" stroke-width="3"/>' +
        '<g fill="' + fg + '"><rect x="24" y="24" width="4" height="4"/><rect x="31" y="24" width="4" height="4"/><rect x="24" y="31" width="4" height="4"/><rect x="31" y="31" width="4" height="4"/></g></svg>';
      b.onclick = function () { applyPreset(p); };
      $('presets').appendChild(b);
    });
  }
  function applyPreset(p) {
    if (p.grad) { document.querySelector('input[name=fgmode][value=gradient]').checked = true; $('g1').value = p.grad[0]; $('g2').value = p.grad[1]; $('gradType').value = p.grad[2]; }
    else { document.querySelector('input[name=fgmode][value=single]').checked = true; $('fg').value = p.fg; }
    $('dotsType').value = p.dots; $('csType').value = p.cs; $('cdType').value = p.cd;
    $('csColor').value = p.eye; $('cdColor').value = p.eye; $('bgcol').value = p.bg;
    syncFgMode(); update();
  }

  // ======================= Rendu QR =======================
  function qrOptions(data) {
    var dots = { type: $('dotsType').value };
    if (fgMode() === 'gradient') dots.gradient = { type: $('gradType').value, rotation: 0, colorStops: [{ offset: 0, color: $('g1').value }, { offset: 1, color: $('g2').value }] };
    else dots.color = $('fg').value;
    var o = {
      width: 300, height: 300, type: 'svg', data: data, margin: 8,
      qrOptions: { errorCorrectionLevel: logoURL ? 'H' : $('ec').value },
      dotsOptions: dots,
      cornersSquareOptions: { type: $('csType').value, color: $('csColor').value },
      cornersDotOptions: { type: $('cdType').value, color: $('cdColor').value },
      backgroundOptions: { color: $('bgcol').value }
    };
    if (logoURL) { o.image = logoURL; o.imageOptions = { margin: 3, imageSize: LOGO_SIZE, hideBackgroundDots: true }; }
    return o;
  }
  // Construit le SVG (source unique). La légende éventuelle est ajoutée sous le QR.
  function buildSVG(data, withCaption) {
    var q = new QRCodeStyling(qrOptions(data));
    return q.getRawData('svg').then(function (blob) { return blob.text(); }).then(function (s) {
      var cap = withCaption ? $('caption').value.trim() : '';
      if (cap) {
        var col = fgMode() === 'gradient' ? $('g1').value : $('fg').value, bg = $('bgcol').value;
        s = s.replace(/viewBox="0 0 300 300"/, 'viewBox="0 0 300 334"').replace(/height="300"/, 'height="334"'); // 1re occurrence = balise <svg>
        s = s.replace('</svg>', '<rect x="0" y="300" width="300" height="34" fill="' + bg + '"/>' +
          '<text x="150" y="323" font-family="Marianne, system-ui, sans-serif" font-size="17" font-weight="700" text-anchor="middle" fill="' + col + '">' + xml(cap) + '</text></svg>');
      }
      return s;
    });
  }

  function setButtons(ok) { ['dlPng', 'dlSvg', 'copy', 'print'].forEach(function (id) { $(id).disabled = !ok; }); }

  function update() {
    var data = TYPES[type].build(values());
    if (!data) { svg = ''; setButtons(false); $('out').innerHTML = '<p class="out-empty">Remplissez le formulaire pour voir le QR code.</p>'; return; }
    var my = ++token;
    buildSVG(data, true).then(function (s) {
      if (my !== token) return;
      svg = s; $('out').innerHTML = s; $('msg').textContent = ''; setButtons(true);
    }).catch(function () {
      if (my !== token) return;
      svg = ''; setButtons(false); $('out').innerHTML = '<p class="out-empty">Contenu trop long pour un QR code.</p>';
    });
  }

  // ======================= Export =======================
  function toPNG(cb, px, src) {
    src = src || svg;
    var img = new Image(), vb = src.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/), w = px || +$('size').value, h = Math.round(w * vb[2] / vb[1]);
    img.onload = function () {
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h); cv.toBlob(cb, 'image/png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
  }
  function save(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  var say = function (t) { $('msg').textContent = t; };
  function clean(s) { return (s || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '').trim().slice(0, 60); }
  function fileName() { return clean($('fname').value) || 'qrcode'; }

  $('dlPng').onclick = function () { toPNG(function (b) { save(b, fileName() + '.png'); }); };
  $('dlSvg').onclick = function () { save(new Blob([svg], { type: 'image/svg+xml' }), fileName() + '.svg'); };
  $('copy').onclick = function () {
    toPNG(function (b) {
      navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(function () { say('Copié !'); }, function () { say('Copie impossible, utilisez PNG.'); });
    }, 512);
  };
  $('print').onclick = function () {
    var w = window.open('', '_blank');
    if (!w) return say('Autorisez les pop-ups pour imprimer.');
    w.document.write('<title>QR code</title><body style="margin:0;display:grid;place-items:center;height:100vh">' + svg.replace('<svg ', '<svg style="width:80vmin" ') + '</body>');
    w.document.close(); w.focus(); w.print();
  };

  $('logo').onchange = function () {
    var f = this.files[0];
    if (!f) { logoURL = ''; return update(); }
    var r = new FileReader(); r.onload = function () { logoURL = r.result; update(); }; r.readAsDataURL(f);
  };

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
  $('csv').onchange = function () {
    var f = this.files[0], r = new FileReader();
    if (f) { r.onload = function () { $('lines').value = r.result; }; r.readAsText(f); }
  };
  $('zip').onclick = function () {
    var rows = parseLines($('lines').value), used = {}, files = [], i = 0, px = +$('size').value;
    if (!rows.length) return say('Ajoutez au moins une ligne.');
    say('Génération…');
    (function next() {
      if (i === rows.length) return save(zip(files), fileName() + '.zip'), say(rows.length + ' QR codes générés.');
      var row = rows[i], base = row[1] || ('qr-' + (i + 1)), n = used[base] = (used[base] || 0) + 1;
      if (n > 1) base += '-' + n;
      buildSVG(row[0], false).then(function (s) {
        files.push({ name: base + '.svg', data: new TextEncoder().encode(s) });
        toPNG(function (b) { b.arrayBuffer().then(function (buf) { files.push({ name: base + '.png', data: new Uint8Array(buf) }); i++; next(); }); }, px, s);
      }).catch(function () { say('Ligne ' + (i + 1) + ' trop longue pour un QR code.'); });
    })();
  };

  // ======================= Écouteurs =======================
  $('size').addEventListener('input', function () { $('sizeVal').textContent = this.value; });
  $('fg-mode').addEventListener('change', syncFgMode);
  $('tabs').closest('.panel').addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(update, 120); });

  renderTabs(); renderFields(); renderPresets(); update();
})();
