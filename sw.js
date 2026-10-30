/* SKRIPSPACE: service worker. Versi 90/174: halaman diambil dari jaringan (maks. 3 detik), salinan di perangkat dipakai bila sinyal lambat; versi terbaru diambil
   di belakang layar (berlaku saat dibuka berikutnya; halaman memberi tahu "Versi baru siap"). Berkas bertanda versi (?v=) diambil
   dari salinan dulu karena isinya tidak pernah berubah. Tanpa sinyal, salinan tetap dipakai. */
var NAMA = 'skripspace-v187';
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
    /* v174: jaringan dulu (maks. 3 detik) supaya pengguna selalu mendapat versi terbaru setelah rilis; salinan di perangkat
       hanya dipakai bila sinyal lambat atau putus. Dulu salinan selalu didahulukan sehingga versi baru baru tampil di kunjungan kedua. */
    var segar = fetch(r.url, { cache: 'no-store', credentials: 'same-origin' }).then(function (j) { if (!j || !j.ok) throw new Error('gagal'); return simpan('./', j); });
    ev.waitUntil(segar.catch(function () {}));
    ev.respondWith(new Promise(function (selesai) {
      var sudah = false, pakai = function (x) { if (!sudah && x) { sudah = true; selesai(x); } };
      var cadang = function () { return caches.open(NAMA).then(function (c) { return c.match('./'); }).then(function (x) { if (x) pakai(x); return x; }); };
      var jam = setTimeout(cadang, 3000);
      segar.then(function (j) { clearTimeout(jam); pakai(j); }).catch(function () { clearTimeout(jam); cadang().then(function (x) { if (!x) segar.catch(function () { pakai(Response.error()); }); }); });
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
