(function () {
  'use strict';
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/([\;,":])/g, '\\$1'); };       // WiFi escaping
  var vc = function (s) { return String(s).replace(/([\;,])/g, '\\$1').replace(/\n/g, '\\n'); };

  // Each type: fields [id, label, input type, placeholder] and build() -> string ('' = incomplete)
  var TYPES = {
    url: { label: 'Lien', fields: [['u', 'Adresse du site', 'url', 'https://exemple.fr']],
      build: function (v) { var u = v.u.trim(); return u && !/^[a-z][a-z0-9+.-]*:/i.test(u) ? 'https://' + u : u; } },
    text: { label: 'Texte', fields: [['t', 'Message', 'textarea', '']],
      build: function (v) { return v.t; } },
    wifi: { label: 'Wi-Fi', fields: [['s', 'Nom du réseau (SSID)', 'text', ''], ['p', 'Mot de passe', 'text', ''], ['k', 'Sécurité', 'select', ['WPA', 'WEP', 'nopass']]],
      build: function (v) { return v.s ? 'WIFI:T:' + v.k + ';S:' + esc(v.s) + ';' + (v.k === 'nopass' ? '' : 'P:' + esc(v.p) + ';') + ';' : ''; } },
    contact: { label: 'Contact', fields: [['n', 'Nom complet', 'text', ''], ['o', 'Société', 'text', ''], ['f', 'Téléphone', 'tel', ''], ['m', 'E-mail', 'email', '']],
      build: function (v) {
        return v.n ? ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + vc(v.n), v.o && 'ORG:' + vc(v.o), v.f && 'TEL:' + vc(v.f), v.m && 'EMAIL:' + vc(v.m), 'END:VCARD'].filter(Boolean).join('\n') : '';
      } },
    mail: { label: 'E-mail', fields: [['a', 'Destinataire', 'email', ''], ['j', 'Objet', 'text', ''], ['b', 'Message', 'textarea', '']],
      build: function (v) { return v.a ? 'mailto:' + v.a + '?subject=' + encodeURIComponent(v.j) + '&body=' + encodeURIComponent(v.b) : ''; } },
    tel: { label: 'Téléphone', fields: [['n', 'Numéro', 'tel', '+33 6 00 00 00 00']],
      build: function (v) { return v.n ? 'tel:' + v.n.replace(/[^\d+]/g, '') : ''; } }
  };

  var type = 'url', svg = '', logoURL = '', timer;

  // ---- UI
  function renderTabs() {
    $('tabs').innerHTML = '';
    Object.keys(TYPES).forEach(function (k) {
      var b = document.createElement('button');
      b.textContent = TYPES[k].label; b.type = 'button';
      b.className = k === type ? 'on' : '';
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
      else if (f[2] === 'select') {
        i = document.createElement('select');
        f[3].forEach(function (o) { i.add(new Option(o === 'nopass' ? 'Aucune' : o, o)); });
      } else { i = document.createElement('input'); i.type = f[2]; i.placeholder = f[3]; }
      i.dataset.f = f[0];
      l.appendChild(i); $('fields').appendChild(l);
    });
  }
  function values() {
    var v = {};
    $('fields').querySelectorAll('[data-f]').forEach(function (i) { v[i.dataset.f] = i.value; });
    return v;
  }

  // ---- QR rendering (SVG string is the single source; PNG is rasterized from it)
  function makeSVG(data) {
    var ec = logoURL ? 'H' : $('ec').value;
    var q = qrcode(0, ec); q.addData(data); q.make();
    var n = q.getModuleCount(), m = 4, size = n + 2 * m, fg = $('fg').value, bg = $('bgcol').value;
    var round = $('shape').value === 'round', cap = $('caption').value.trim();
    var capH = cap ? 3 : 0, h = size + capH;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + h + '" shape-rendering="' + (round ? 'auto' : 'crispEdges') + '">' +
      '<rect width="' + size + '" height="' + h + '" fill="' + bg + '"/><g fill="' + fg + '">';
    var logoN = logoURL ? Math.floor(n * 0.22) : 0, lo = Math.floor((n - logoN) / 2) - 1;
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (!q.isDark(r, c)) continue;
      if (logoN && r >= lo && r < lo + logoN + 2 && c >= lo && c < lo + logoN + 2) continue; // clear zone for logo
      s += round ? '<circle cx="' + (c + m + .5) + '" cy="' + (r + m + .5) + '" r=".5"/>' : '<rect x="' + (c + m) + '" y="' + (r + m) + '" width="1.02" height="1.02"/>';
    }
    s += '</g>';
    if (logoN) s += '<image href="' + logoURL + '" x="' + (lo + m + 1) + '" y="' + (lo + m + 1) + '" width="' + logoN + '" height="' + logoN + '" preserveAspectRatio="xMidYMid meet"/>';
    if (cap) s += '<text x="' + size / 2 + '" y="' + (size + 1.4) + '" font-family="sans-serif" font-size="1.8" text-anchor="middle" fill="' + fg + '">' + cap.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</text>';
    return s + '</svg>';
  }

  function update() {
    var data = TYPES[type].build(values());
    var ok = !!data;
    ['dlPng', 'dlSvg', 'copy', 'print'].forEach(function (id) { $(id).disabled = !ok; });
    if (!ok) { svg = ''; $('out').innerHTML = '<p class="empty">Remplissez le formulaire</p>'; return; }
    try { svg = makeSVG(data); $('out').innerHTML = svg; $('msg').textContent = ''; }
    catch (e) { svg = ''; $('out').innerHTML = '<p class="empty">Contenu trop long pour un QR code</p>'; ['dlPng', 'dlSvg', 'copy', 'print'].forEach(function (id) { $(id).disabled = true; }); }
  }

  function toPNG(cb, px, src) {
    src = src || svg;
    var img = new Image(), vb = src.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/), w = px || 1024, h = Math.round(w * vb[2] / vb[1]);
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
  function clean(s) { return (s || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '').trim().slice(0, 60); }
  function fileName() { return clean($('fname').value) || 'qrcode'; }
  var say = function (t) { $('msg').textContent = t; };

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
    var r = new FileReader();
    r.onload = function () { logoURL = r.result; update(); };
    r.readAsDataURL(f);
  };

  // ---- batch: minimal store-only ZIP writer
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
    var rows = parseLines($('lines').value), used = {}, files = [], i = 0;
    if (!rows.length) return say('Ajoutez au moins une ligne.');
    say('Génération…');
    (function next() {
      if (i === rows.length) return save(zip(files), fileName() + '.zip'), say(rows.length + ' QR codes générés.');
      var row = rows[i], base = row[1] || ('qr-' + (i + 1)), s, n = used[base] = (used[base] || 0) + 1;
      if (n > 1) base += '-' + n;
      try { s = makeSVG(row[0]); } catch (e) { return say('Ligne ' + (i + 1) + ' trop longue pour un QR code.'); }
      files.push({ name: base + '.svg', data: new TextEncoder().encode(s) });
      toPNG(function (b) { b.arrayBuffer().then(function (buf) { files.push({ name: base + '.png', data: new Uint8Array(buf) }); i++; next(); }); }, 1024, s);
    })();
  };

  ['tabs', 'fields', 'fg', 'bgcol', 'ec', 'shape', 'caption'].forEach(function (id) {
    $(id).addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(update, 120); });
  });
  renderTabs(); renderFields(); update();
})();
