/* QR codes MN76 — service worker : réseau d'abord pour les pages, cache pour le reste.
   Permet d'utiliser l'application hors ligne une fois visitée. */
const CACHE = 'qr-mn76-v1';
const ASSETS = [
  './', './index.html', './style.css', './app.js', './ui.js', './prefs.js',
  './qrcode.js', './icon.svg', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Pages (navigation) : réseau d'abord, repli sur le cache si hors ligne.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { caches.open(CACHE).then(c => c.put(req, r.clone())); return r; }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  // Reste (CSS, JS, images, police) : cache d'abord, complété par le réseau.
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    if (res.ok && (res.type === 'basic' || res.type === 'cors')) { const cl = res.clone(); caches.open(CACHE).then(c => c.put(req, cl)); }
    return res;
  }).catch(() => r)));
});
