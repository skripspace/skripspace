(function(){var S={};  var pdfjsJanji = null;
  function versiAplDkn() { return ((document.querySelector('.versi') || {}).textContent || '').replace(/\D+/g, '') || '1'; }
  function muatPdfJs() {
    if (pdfjsJanji) return pdfjsJanji;
    var v = versiAplDkn();   // web 195: dulu terbaca "8" dari hash ikon, sehingga pdf.js lama tersimpan selamanya di HP
    pdfjsJanji = import('https://skripspace.com/pdfjs-dkn.min.mjs?v=x'+v).then(function (m) {
      m.GlobalWorkerOptions.workerSrc = 'https://skripspace.com/pdfjs-dkn-worker.min.mjs?v=x'+v; return m;
    }).catch(function (x) { pdfjsJanji = null; throw x; });
    return pdfjsJanji;
  }
  /* web 195: hasil scan/foto sering miring sedikit, sehingga garis tabel tidak lurus dan sel terpotong. Sudut kemiringan dicari
     (−3°..3°) dari proyeksi tinta mendatar pada gambar kecil, lalu halaman diputar balik. */
  function dknLurus(cv) {
    var w = 500, h = Math.round(cv.height * w / cv.width), k = document.createElement('canvas'); k.width = w; k.height = h;
    var kx = k.getContext('2d', { willReadFrequently: true }); kx.fillStyle = '#fff'; kx.fillRect(0, 0, w, h); kx.drawImage(cv, 0, 0, w, h);
    var dd = kx.getImageData(0, 0, w, h).data, px = [], i;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { i = (y * w + x) * 4; if (dd[i] + dd[i + 1] + dd[i + 2] < 450) px.push(x, y); }
    if (px.length < 2000) return cv;
    var skor = function (a) { var t = Math.tan(a * Math.PI / 180), hs = new Float64Array(h * 2 + 10), s = 0, j, yy; for (j = 0; j < px.length; j += 2) { yy = Math.round(px[j + 1] - px[j] * t) + h; if (yy >= 0 && yy < hs.length) hs[yy]++; } for (j = 0; j < hs.length; j++) s += hs[j] * hs[j]; return s; };
    var terbaik = 0, sTerbaik = skor(0);
    for (var a = -3; a <= 3.001; a += 0.15) { var sc = skor(a); if (sc > sTerbaik * 1.0001) { sTerbaik = sc; terbaik = a; } }
    for (var b = terbaik - 0.14; b <= terbaik + 0.141; b += 0.035) { var sb = skor(b); if (sb > sTerbaik) { sTerbaik = sb; terbaik = b; } }
    k.width = k.height = 1;
    if (Math.abs(terbaik) < 0.08) return cv;
    var o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height; var ox = o.getContext('2d', { willReadFrequently: true });
    ox.fillStyle = '#fff'; ox.fillRect(0, 0, o.width, o.height); ox.translate(o.width / 2, o.height / 2); ox.rotate(-terbaik * Math.PI / 180); ox.drawImage(cv, -cv.width / 2, -cv.height / 2);
    return o;
  }
  function dknPotongBaris(cv) {
    var W = cv.width, H = cv.height, cx = cv.getContext('2d', { willReadFrequently: true }), gbr = cx.getImageData(0, 0, W, H), d = gbr.data;
    /* web 195: hasil scan/foto HP berlatar abu-abu dan tulisannya pudar. Kontras halaman diregangkan: latar (persentil 90) menjadi
       putih bersih, tinta (persentil 2) hitam — sehingga ambang tinta dan garis berlaku sama untuk PDF bersih maupun hasil scan. */
    (function () {
      var hist = new Uint32Array(766), n = 0, i, v;
      for (i = 0; i < d.length; i += 16) { hist[d[i] + d[i + 1] + d[i + 2]]++; n++; }
      var pers = function (p) { var c = 0, k; for (k = 0; k < 766; k++) { c += hist[k]; if (c >= n * p) return k; } return 765; };
      var ink = pers(0.02), bg = pers(0.9);
      if (bg - ink < 120 || (bg > 740 && ink < 150)) return;   // sudah bersih
      var hi = ink + (bg - ink) * 0.82, sk = 255 / Math.max(1, hi - ink);
      for (i = 0; i < d.length; i += 4) { v = (d[i] + d[i + 1] + d[i + 2] - ink) * sk; v = v < 0 ? 0 : v > 255 ? 255 : v; d[i] = d[i + 1] = d[i + 2] = v; }
      cx.putImageData(gbr, 0, 0);
    })();
    var lum = function (x, y) { var i = (y * W + x) * 4; return d[i] + d[i + 1] + d[i + 2]; }, abu = function (x, y) { return lum(x, y) < 630; };
    var garis = function (n, ambang, hitung) { var out = [], awal = -1; for (var i = 0; i <= n; i++) { var ya = i < n && hitung(i) > ambang; if (ya && awal < 0) awal = i; if (!ya && awal >= 0) { out.push([awal, i - 1]); awal = -1; } } return out; };
    var hl = garis(H, W * 0.5, function (y) { var c = 0; for (var x = 0; x < W; x += 2) if (abu(x, y)) c += 2; return c; });
    /* web 195: garis lepas jauh dari tabel (mis. garis kaki halaman) membuat rentang tabel terlalu tinggi sehingga garis tegak
       tidak dikenali. Ambil kelompok garis mendatar terbanyak yang jaraknya berdekatan. */
    var grup = [], g0 = [];
    hl.forEach(function (l, i) { if (i && l[0] - hl[i - 1][1] > H * 0.2) { grup.push(g0); g0 = []; } g0.push(l); }); if (g0.length) grup.push(g0);
    hl = grup.sort(function (a, b) { return b.length - a.length; })[0] || [];
    if (hl.length < 4) return [];
    var y0 = hl[0][0], y1 = hl[hl.length - 1][1];
    var vl = garis(W, (y1 - y0) * 0.55, function (x) { var c = 0; for (var y = y0; y <= y1; y += 2) if (abu(x, y)) c += 2; return c; });
    if (vl.length !== 9) return [];   // tata letak DKN SIM: No, Kode, Mata Kuliah, Mata Kuliah (Inggris), Semester, SKS, Nilai, Bobot
    /* web 195: garis tabel diputihkan supaya potongan sel hanya berisi tulisan (sisa garis terbaca "|" atau memotong angka) */
    (function () {
      var xa0 = Math.max(0, vl[0][0] - 2), xb0 = Math.min(W - 1, vl[8][1] + 2), j, x, y, i;
      hl.forEach(function (l) { for (y = Math.max(0, l[0] - 1); y <= Math.min(H - 1, l[1] + 1); y++) for (x = xa0; x <= xb0; x++) { i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; } });
      for (j = 0; j < vl.length; j++) for (x = Math.max(0, vl[j][0] - 1); x <= Math.min(W - 1, vl[j][1] + 1); x++) for (y = y0; y <= y1; y++) { i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; }
      cx.putImageData(gbr, 0, 0);
    })();
    /* web 193: tinta dihitung dengan ambang terang (angka abu-abu tipis ikut), dan semua sel satu baris dipotong pada rentang tinggi
       yang sama — sebelumnya puncak angka SKS/Bobot yang tipis terpotong sehingga 3→ɜ, 9→ɑ dan nilainya hilang. */
    var kotak = function (xa, xb, ya, yb) {
      var minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
      for (var y = ya; y <= yb; y++) for (var x = xa; x <= xb; x++) if (lum(x, y) < 600) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    };
    var hasil = [], kol = [1, 2, 5, 6, 7];   // Kode, Mata Kuliah, SKS, Nilai, Bobot (semester tidak dipakai: bisa menempel dengan SKS)
    /* web 195: garis antarbaris kadang tidak tergambar (pita setinggi 2–6 baris). Pita dipecah menurut baris tulisan di kolom Kode
       (kode selalu satu baris), batasnya di tengah celah antartulisan. */
    var pita = [];
    for (var r0 = 0; r0 + 1 < hl.length; r0++) {
      var a0 = hl[r0][1] + 2, b0 = hl[r0 + 1][0] - 2;
      if (b0 - a0 < H * 0.006 || b0 - a0 > H * 0.4) continue;
      var xa = vl[1][1] + 2, xb = vl[2][0] - 2, isi = [], mulai = -1;
      for (var yy = a0; yy <= b0 + 1; yy++) {
        var ada = false; if (yy <= b0) for (var xx = xa; xx <= xb; xx++) if (lum(xx, yy) < 600) { ada = true; break; }
        if (ada && mulai < 0) mulai = yy; if (!ada && mulai >= 0) { isi.push([mulai, yy - 1]); mulai = -1; }
      }
      if (isi.length <= 1) { pita.push([a0, b0]); continue; }
      var batas = a0;
      for (var q = 0; q < isi.length; q++) { var akhir = q + 1 < isi.length ? ((isi[q][1] + isi[q + 1][0]) >> 1) : b0; pita.push([batas, akhir]); batas = akhir + 1; }
    }
    for (var r = 0; r < pita.length; r++) {
      var ya = pita[r][0], yb = pita[r][1];
      if (yb - ya < H * 0.006) continue;
      if (!abu(vl[1][0], (ya + yb) >> 1) && !abu(vl[1][1], (ya + yb) >> 1)) continue;   // bukan pita baris tabel
      var sel = kol.map(function (k) { return kotak(vl[k][1] + 2, vl[k + 1][0] - 2, ya, yb); });
      if (!sel[0]) continue;
      var atas = 1e9, bawah = -1; sel.forEach(function (c) { if (c) { atas = Math.min(atas, c.y); bawah = Math.max(bawah, c.y + c.h - 1); } });
      atas = Math.max(ya, atas - 2); bawah = Math.min(yb, bawah + 2);
      var tinggi = bawah - atas + 1, gap = Math.max(6, Math.round(tinggi * 0.45)), lebar = 0; sel.forEach(function (c) { if (c) lebar += c.w + 4 + gap; });
      var rc = document.createElement('canvas'); rc.width = lebar + 10; rc.height = tinggi + 10;
      var rx = rc.getContext('2d'); rx.fillStyle = '#fff'; rx.fillRect(0, 0, rc.width, rc.height);
      var dx = 5; sel.forEach(function (c) { if (!c) return; rx.drawImage(cv, Math.max(0, c.x - 2), atas, c.w + 4, tinggi, dx, 5, c.w + 4, tinggi); dx += c.w + 4 + gap; });
      hasil.push(rc);
    }
    return hasil;
  }
  /* web 193: lapisan teks PDF disusun per baris menurut posisi y (PDF hasil "cetak ke PDF" halaman SIM punya teks utuh,
     tetapi pembaca server memecah kolomnya). Server menerimanya hanya bila kaki DKN dan NIM sama dengan bacaannya sendiri. */
  function dknBarisTeks(items) {
    var it = items.filter(function (x) { return x.str && x.str.trim(); }).map(function (x) { return { s: x.str.trim(), x: x.transform[4], y: x.transform[5], h: Math.abs(x.transform[3]) || x.height || 8 }; });
    it.sort(function (a, b) { return b.y - a.y || a.x - b.x; });
    var rows = [];
    it.forEach(function (x) { var r = null; for (var j = 0; j < rows.length; j++) if (Math.abs(rows[j].y - x.y) <= Math.max(2, x.h * 0.4)) { r = rows[j]; break; } if (r) r.it.push(x); else rows.push({ y: x.y, it: [x] }); });
    rows.sort(function (a, b) { return b.y - a.y; });
    return rows.map(function (r) { return r.it.sort(function (a, b) { return a.x - b.x; }).map(function (x) { return x.s; }).join(' '); }).join('\n');
  }
  var dknSusunInfo = '';
  function dknSusun(u8) {
    /* paling lama 45 detik; bila gagal/lewat, verifikasi tetap jalan dengan PDF asli saja (alasannya ikut dikirim untuk diagnosa) */
    var t0 = Date.now(); dknSusunInfo = 'mulai';
    return Promise.race([dknSusunJalan(u8), new Promise(function (ok) { setTimeout(function () { dknSusunInfo += ' waktu-habis'; ok(null); }, 45000); })])
      .then(function (h) { dknSusunInfo = 'web ' + versiAplDkn() + ' ' + (/iPhone|iPad|Android/.exec(navigator.userAgent) || ['pc'])[0] + ' ' + dknSusunInfo + ' ' + Math.round((Date.now() - t0) / 100) / 10 + 's'; return h; });
  }
  function dknSusunJalan(u8) {
    var P, doc, lapisan = '', nTeks = 0;
    return muatPdfJs().then(function (m) { dknSusunInfo = 'pdfjs'; P = m; return P.getDocument({ data: u8.slice(0), isEvalSupported: false }).promise; }).then(function (d0) {
      doc = d0; dknSusunInfo = 'hal' + doc.numPages;
      var semua = [], jalanT = Promise.resolve();
      for (var i = 1; i <= Math.min(doc.numPages, 8); i++) (function (no) {
        jalanT = jalanT.then(function () { return doc.getPage(no); }).then(function (pg) { return pg.getTextContent(); }).then(function (tc) { if (no === 1) nTeks = tc.items.filter(function (x) { return x.str && x.str.trim(); }).length; semua.push(dknBarisTeks(tc.items)); });
      })(i);
      return jalanT.then(function () { lapisan = semua.join('\n'); });
    }).then(function () {
      /* PDF berlapis teks: kirim susunan teksnya saja (cepat, tepat) */
      if (nTeks > 40) { dknSusunInfo += ' lapisan' + lapisan.length; return { lapisan: lapisan.slice(0, 50000) }; }
      var baris = [], jalan = Promise.resolve();
      for (var i = 1; i <= Math.min(doc.numPages, 8); i++) (function (no) {
        jalan = jalan.then(function () { return doc.getPage(no); }).then(function (pg) {
          var vp = pg.getViewport({ scale: 2.6 }), cv = document.createElement('canvas'); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
          var cx = cv.getContext('2d', { willReadFrequently: true }); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
          return pg.render({ canvasContext: cx, viewport: vp, intent: 'print' }).promise.then(function () { var lurus = dknLurus(cv); baris = baris.concat(dknPotongBaris(lurus)); lurus.width = lurus.height = 1; cv.width = cv.height = 1; });   // intent print: tanpa requestAnimationFrame, tetap jalan walau tab di latar
        });
      })(i);
      return jalan.then(function () {
        dknSusunInfo += ' baris' + baris.length;
        if (baris.length < 10) return null;
        /* huruf diperbesar sampai ±36 px (OCR Google jauh lebih tepat pada huruf besar), luas kanvas dibatasi 12 juta piksel (batas iPhone) */
        var tt = baris.map(function (b) { return b.height - 10; }).sort(function (a, b) { return a - b; }), f = Math.max(1, Math.min(2.5, 36 / Math.max(1, tt[tt.length >> 1])));
        var W = 0, H = 0; baris.forEach(function (b) { W = Math.max(W, b.width); H += b.height * 3; });
        while (f > 1 && (W * f + 40) * (H * f + 30) > 12e6) f = Math.max(1, f - 0.25);
        var out = document.createElement('canvas'); out.width = Math.ceil(W * f + 40); out.height = Math.ceil(H * f + 30); var ox = out.getContext('2d');
        ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = 'high'; ox.fillStyle = '#fff'; ox.fillRect(0, 0, out.width, out.height);
        var y = 15; baris.forEach(function (b) { ox.drawImage(b, 0, 0, b.width, b.height, 20, y, b.width * f, b.height * f); y += b.height * 3 * f; });
        var url = out.toDataURL('image/png'), b64 = url.split(',')[1];
        if (b64.length > 1800000) { url = out.toDataURL('image/jpeg', 0.85); b64 = url.split(',')[1]; }
        if (b64.length > 1800000) { url = out.toDataURL('image/jpeg', 0.7); b64 = url.split(',')[1]; }
        out.width = out.height = 1;
        dknSusunInfo += ' gambar' + Math.round(b64.length / 1024) + 'k f' + f.toFixed(2);
        return b64.length > 1850000 ? null : { nama: 'DKN-susunan-baris.' + (/jpeg/.test(url.slice(0, 30)) ? 'jpg' : 'png'), mime: /jpeg/.test(url.slice(0, 30)) ? 'image/jpeg' : 'image/png', b64: b64, baris: baris.length };
      });
    }).catch(function (x) { dknSusunInfo += ' galat:' + String((x && x.message) || x).slice(0, 80); return lapisan && nTeks > 40 ? { lapisan: lapisan.slice(0, 50000) } : null; });
  }

window.dknSusunX=function(u8){return dknSusun(u8).then(function(r){return {r:r,info:dknSusunInfo};});};})();