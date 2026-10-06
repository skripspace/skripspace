/* SKRIPSPACE: service worker kecil. Halaman selalu diambil dari jaringan lebih dulu supaya pembaruan langsung terlihat; salinan tersimpan hanya dipakai saat tanpa sinyal. */
var NAMA = 'skripspace-v20';
var BERKAS = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', function (ev) {
  self.skipWaiting();
  ev.waitUntil(caches.open(NAMA).then(function (c) { return c.addAll(BERKAS); }).catch(function () {}));
});
self.addEventListener('activate', function (ev) {
  ev.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (n) { return n !== NAMA; }).map(function (n) { return caches.delete(n); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (ev) {
  var r = ev.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  ev.respondWith(fetch(r).then(function (jawab) {
    if (jawab && jawab.ok) { var salin = jawab.clone(); caches.open(NAMA).then(function (c) { c.put(r, salin); }); }
    return jawab;
  }).catch(function () { return caches.match(r).then(function (x) { return x || caches.match('./'); }); }));
});
