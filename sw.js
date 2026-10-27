/* SKRIPSPACE: service worker. Versi 90: halaman tampil seketika dari salinan di perangkat, sementara versi terbaru diambil
   di belakang layar (berlaku saat dibuka berikutnya; halaman memberi tahu "Versi baru siap"). Berkas bertanda versi (?v=) diambil
   dari salinan dulu karena isinya tidak pernah berubah. Tanpa sinyal, salinan tetap dipakai. */
var NAMA = 'skripspace-v159';
var BERKAS = ['./', 'manifest.webmanifest', 'skripspace-192.png', 'skripspace-512.png', 'skripspace-maskable-512.png', 'skripspace-touch-180.png', 'skripspace-64.png', 'favicon.ico'];
function simpan(r, j) { if (j && j.status === 200 && j.type === 'basic') { var s = j.clone(); caches.open(NAMA).then(function (c) { c.put(r, s); }); } return j; }
self.addEventListener('install', function (ev) {
  self.skipWaiting();
  ev.waitUntil(caches.open(NAMA).then(function (c) { return c.addAll(BERKAS.map(function (u) { return new Request(u, { cache: 'reload' }); })); }).catch(function () {}));
});
self.addEventListener('activate', function (ev) {
  ev.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (n) { return n !== NAMA; }).map(function (n) { return caches.delete(n); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (ev) {
  var r = ev.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    var akar = new URL('./', self.location).pathname;
    if (u.pathname !== akar && u.pathname !== akar + 'index.html') return;   // halaman lain (PDF pedoman, dsb.) langsung dari jaringan
    var segar = fetch(r.url, { cache: 'no-store', credentials: 'same-origin' }).then(function (j) { return simpan('./', j); });
    ev.respondWith(caches.open(NAMA).then(function (c) { return c.match('./'); }).then(function (x) {
      if (x) { ev.waitUntil(segar.catch(function () {})); return x; }
      return segar.catch(function () { return caches.match('./'); });
    }));
    return;
  }
  if (/[?&]v=/.test(u.search)) {
    /* v133: bila jaringan gagal, pakai salinan berkas yang sama dari versi sebelumnya (nama berkas sama, hanya ?v= berbeda) */
    ev.respondWith(caches.match(r).then(function (x) { return x || fetch(r).then(function (j) { return simpan(r, j); }).catch(function () { return caches.match(r, { ignoreSearch: true }).then(function (y) { return y || Response.error(); }); }); }));
    return;
  }
  ev.respondWith(fetch(r).then(function (j) { return simpan(r, j); }).catch(function () { return caches.match(r).then(function (x) { return x || Response.error(); }); }));
});
