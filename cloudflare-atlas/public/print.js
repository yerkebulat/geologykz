// Print the current map view as a one-page PDF sheet.
// The sheet is composed on a canvas (map capture plus furniture), then written
// with jsPDF, which is loaded from unpkg only when the user exports.
(function () {
  'use strict';

  var JS_PDF_URL = 'https://unpkg.com/jspdf@3.0.1/dist/jspdf.umd.min.js';
  var DPI = 300;
  var MAX_PX = 16.5e6; // keep A3 below common mobile canvas limits
  var MARGIN_MM = 10;
  var PAGES = { a4: [210, 297], a3: [297, 420], letter: [215.9, 279.4] };
  var GRID_STEPS = [1 / 60, 2 / 60, 5 / 60, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 15, 30];
  var INK = '#1c1917', MUTED = '#78716c';

  var $ = function (id) { return document.getElementById(id); };
  var state = { page: 'a4', orient: 'landscape', title: '', north: true, grid: true, scale: true, date: true, attr: true };
  var modal = null;
  var busy = false;
  var cap = null; // snapshot of the on-screen view: { img, cssW, cssH }

  // ---- map helpers -------------------------------------------------------

  function snapshot() {
    // Copy the WebGL canvas right after a repaint, while its buffer is readable.
    return new Promise(function (resolve, reject) {
      var m = window.atlasMap;
      if (!m) return reject(new Error('no map'));
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        m.off('render', grab);
        reject(new Error('timeout'));
      }, 10000);
      function grab() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try {
          var src = m.getCanvas();
          var el = m.getContainer();
          var c = document.createElement('canvas');
          c.width = src.width;
          c.height = src.height;
          c.getContext('2d').drawImage(src, 0, 0);
          resolve({ img: c, cssW: el.clientWidth, cssH: el.clientHeight });
        } catch (e) { reject(e); }
      }
      m.once('render', grab);
      m.triggerRepaint();
    });
  }

  function waitIdle(m, ms) {
    return new Promise(function (resolve) {
      var fired = false;
      function fire() { if (fired) return; fired = true; clearTimeout(t); resolve(); }
      var t = setTimeout(fire, ms || 15000);
      m.once('idle', fire);
    });
  }

  function metersPerCssPx(m, pt) {
    var a = m.unproject(pt);
    var b = m.unproject({ x: pt.x + 64, y: pt.y });
    var d = a.distanceTo(b) / 64;
    return isFinite(d) && d > 0 ? d : 0;
  }

  function basemapAttribution(m) {
    try {
      if (m.getLayer('sat') && m.getLayoutProperty('sat', 'visibility') === 'visible') {
        var s = ((m.getStyle() || {}).sources || {}).sat;
        return (s && s.attribution) || 'Satellite imagery';
      }
    } catch (e) {}
    return 'Basemap \u00A9 OpenStreetMap contributors, OpenFreeMap';
  }

  // ---- sheet layout and drawing ------------------------------------------

  function pageDims() {
    var p = PAGES[state.page] || PAGES.a4;
    return state.orient === 'landscape' ? [p[1], p[0]] : [p[0], p[1]];
  }

  function layout(W, H, pageMm, opts) {
    var pxPerMm = W / pageMm[0];
    var margin = MARGIN_MM * pxPerMm;
    var titleH = opts.title ? 13 * pxPerMm : 0;
    var hasFooter = opts.scale || opts.date || opts.attr;
    var footerH = hasFooter ? 13 * pxPerMm : 0;
    return {
      pxPerMm: pxPerMm,
      margin: margin,
      hasFooter: hasFooter,
      map: { x: margin, y: margin + titleH, w: W - 2 * margin, h: H - 2 * margin - titleH - footerH }
    };
  }

  function affFor(L, c) {
    // Map css px to sheet px. Cover, not contain: the capture fills the map rect
    // and any axis that does not match the page aspect is cropped, so the sheet
    // shows the central crop of the on-screen view, never extra area.
    var k = Math.max(L.map.w / c.cssW, L.map.h / c.cssH);
    return { kx: k, ky: k, ox: (L.map.w - c.cssW * k) / 2, oy: (L.map.h - c.cssH * k) / 2 };
  }

  function halo(ctx, text, x, y, align, fill, pxPerMm) {
    ctx.textAlign = align;
    ctx.lineWidth = Math.max(2, 0.8 * pxPerMm);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(250,250,249,.92)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  }

  function fmtDeg(v, isLat, step) {
    var a = Math.abs(v);
    var d = Math.floor(a + 1e-9);
    var min = Math.round((a - d) * 60);
    if (min >= 60) { d += 1; min = 0; }
    var s = d + '\u00B0';
    if (step < 1) s += (min < 10 ? '0' : '') + min + '\u2032';
    return s + (isLat ? (v >= 0 ? 'N' : 'S') : (v >= 0 ? 'E' : 'W'));
  }

  function fmtMetres(v) {
    return v >= 1000 ? +(v / 1000).toFixed(2) + ' km' : Math.round(v) + ' m';
  }

  function grouped(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
  }

  function drawGrid(ctx, L, m, c, aff, sheet) {
    var b = m.getBounds();
    if (!b) return;
    var west = b.getWest(), east = b.getEast(), south = b.getSouth(), north = b.getNorth();
    if (!isFinite(west + east + south + north)) return;
    var degX = (east - west) / c.cssW || 1;
    var step = GRID_STEPS[GRID_STEPS.length - 1];
    for (var i = 0; i < GRID_STEPS.length; i++) {
      if (GRID_STEPS[i] / degX * aff.kx >= 24 * L.pxPerMm) { step = GRID_STEPS[i]; break; }
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.map.x + 1, L.map.y + 1, L.map.w - 2, L.map.h - 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(28,25,23,.45)';
    ctx.lineWidth = Math.max(1, 0.14 * L.pxPerMm);
    var marks = [];

    var lon = Math.ceil((west - 1e-9) / step) * step;
    for (; lon <= east + 1e-9; lon += step) {
      var top = null;
      ctx.beginPath();
      for (var j = 0; j <= 32; j++) {
        var p = sheet(m.project([lon, south + (north - south) * j / 32]));
        if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        if (!top || p.y < top.y) top = p;
      }
      ctx.stroke();
      if (top) marks.push({ t: fmtDeg(lon, false, step), x: top.x, y: L.map.y, lat: false });
    }

    var la = Math.ceil((south - 1e-9) / step) * step;
    for (; la <= north + 1e-9; la += step) {
      var left = null;
      ctx.beginPath();
      for (var k = 0; k <= 32; k++) {
        var q = sheet(m.project([west + (east - west) * k / 32, la]));
        if (k === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
        if (!left || q.x < left.x) left = q;
      }
      ctx.stroke();
      if (left) marks.push({ t: fmtDeg(la, true, step), x: L.map.x, y: left.y, lat: true });
    }
    ctx.restore();

    ctx.font = '500 ' + Math.round(3.1 * L.pxPerMm) + 'px "JetBrains Mono", ui-monospace, Menlo, monospace';
    ctx.textBaseline = 'middle';
    var inset = 4.5 * L.pxPerMm;
    marks.forEach(function (mk) {
      if (mk.lat) halo(ctx, mk.t, mk.x + inset, mk.y, 'left', INK, L.pxPerMm);
      else halo(ctx, mk.t, mk.x, mk.y + inset, 'center', INK, L.pxPerMm);
    });
  }

  function drawNorth(ctx, L, m) {
    var bearing = (m.getBearing && m.getBearing()) || 0;
    var cx = L.map.x + L.map.w - 15 * L.pxPerMm;
    var cy = L.map.y + 17 * L.pxPerMm;
    var MM = function (v) { return v * L.pxPerMm; };
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-bearing * Math.PI / 180);
    ctx.beginPath();
    ctx.arc(0, 0, MM(12), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(250,250,249,.85)';
    ctx.fill();
    ctx.lineWidth = Math.max(1, MM(0.5));
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -MM(6.8));
    ctx.lineTo(MM(3), MM(0.6));
    ctx.lineTo(0, MM(2.2));
    ctx.closePath();
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, MM(6.8));
    ctx.lineTo(-MM(3), MM(0.6));
    ctx.lineTo(0, MM(2.2));
    ctx.closePath();
    ctx.fillStyle = '#a8a29e';
    ctx.fill();
    ctx.font = '700 ' + Math.round(MM(4)) + 'px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    halo(ctx, 'N', 0, -MM(9), 'center', INK, L.pxPerMm);
    ctx.restore();
  }

  function drawScaleBar(ctx, L, m, c, aff) {
    var mPerPx = metersPerCssPx(m, { x: c.cssW / 2, y: c.cssH / 2 }) / aff.kx;
    if (!(mPerPx > 0)) return;
    var maxM = mPerPx * 44 * L.pxPerMm;
    var exp = Math.pow(10, Math.floor(Math.log(maxM) / Math.LN10));
    var f = maxM / exp;
    var nice = (f >= 5 ? 5 : f >= 2 ? 2 : 1) * exp;
    var barPx = nice / mPerPx;
    var seg = barPx / 4;
    var bh = 1.8 * L.pxPerMm;
    var yMid = L.map.y + L.map.h + 6.5 * L.pxPerMm;
    var by = yMid - bh / 2;
    var bx = L.margin;
    ctx.lineWidth = Math.max(1, 0.25 * L.pxPerMm);
    for (var i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.rect(bx + i * seg, by, seg, bh);
      ctx.fillStyle = i % 2 ? '#fff' : INK;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
    ctx.font = '500 ' + Math.round(3 * L.pxPerMm) + 'px "JetBrains Mono", ui-monospace, Menlo, monospace';
    ctx.textBaseline = 'alphabetic';
    halo(ctx, '0', bx, by - 1.2 * L.pxPerMm, 'center', INK, L.pxPerMm);
    halo(ctx, fmtMetres(nice), bx + barPx, by - 1.2 * L.pxPerMm, 'center', INK, L.pxPerMm);
    ctx.textBaseline = 'middle';
    halo(ctx, '1:' + grouped(Math.round(mPerPx * L.pxPerMm * 1000)), bx + barPx + 4 * L.pxPerMm, yMid, 'left', INK, L.pxPerMm);
  }

  function drawFooter(ctx, W, L, m, c, aff, opts) {
    if (opts.scale) drawScaleBar(ctx, L, m, c, aff);
    var yMid = L.map.y + L.map.h + 6.5 * L.pxPerMm;
    if (opts.date) {
      ctx.font = '400 ' + Math.round(3.2 * L.pxPerMm) + 'px Inter, system-ui, sans-serif';
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), W / 2, yMid);
    }
    if (opts.attr) {
      ctx.font = '400 ' + Math.round(2.9 * L.pxPerMm) + 'px Inter, system-ui, sans-serif';
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      var txt = basemapAttribution(m) + ' \u00B7 kzgeology.com';
      var right = W - L.margin;
      var leftEdge = opts.date ? W / 2 + 18 * L.pxPerMm : L.margin + (opts.scale ? 75 * L.pxPerMm : 10 * L.pxPerMm);
      if (ctx.measureText(txt).width > right - leftEdge) {
        while (txt.length > 8 && ctx.measureText(txt + '\u2026').width > right - leftEdge) txt = txt.slice(0, -1);
        txt = txt.replace(/[\s\u00B7,;:]+$/, '') + '\u2026';
      }
      ctx.fillText(txt, right, yMid);
    }
  }

  function drawSheet(ctx, W, H, pageMm, m, c, opts) {
    var L = layout(W, H, pageMm, opts);
    var aff = affFor(L, c);
    function sheet(pt) {
      return { x: L.map.x + aff.ox + pt.x * aff.kx, y: L.map.y + aff.oy + pt.y * aff.ky };
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.map.x, L.map.y, L.map.w, L.map.h);
    ctx.clip();
    ctx.drawImage(c.img, L.map.x + aff.ox, L.map.y + aff.oy, c.cssW * aff.kx, c.cssH * aff.ky);

    if (opts.grid) drawGrid(ctx, L, m, c, aff, sheet);
    if (opts.north) drawNorth(ctx, L, m);
    ctx.restore();

    ctx.lineWidth = Math.max(1, 0.3 * L.pxPerMm);
    ctx.strokeStyle = INK;
    ctx.strokeRect(L.map.x, L.map.y, L.map.w, L.map.h);
    if (opts.title) {
      ctx.font = '600 ' + Math.round(5.4 * L.pxPerMm) + 'px "Source Serif Pro", Georgia, serif';
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(opts.title, W / 2, L.margin + 8.6 * L.pxPerMm);
    }
    if (L.hasFooter) drawFooter(ctx, W, L, m, c, aff, opts);
  }

  // ---- preview -----------------------------------------------------------

  function recompose() {
    if (busy) return;
    var cv = $('print-preview');
    if (!cv || !cap) return;
    var m = window.atlasMap;
    if (!m) return;
    var pageMm = pageDims();
    var scale = Math.min(window.devicePixelRatio || 1, 2);
    var W = Math.round(560 * scale);
    var H = Math.round(W * pageMm[1] / pageMm[0]);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    drawSheet(cv.getContext('2d'), W, H, pageMm, m, cap, state);
  }

  // ---- export ------------------------------------------------------------

  function loadJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = JS_PDF_URL;
      s.onload = function () { (window.jspdf && window.jspdf.jsPDF) ? resolve() : reject(new Error('no jspdf')); };
      s.onerror = function () { reject(new Error('load failed')); };
      document.head.appendChild(s);
    });
  }

  function filename() {
    var t = (state.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    var base = t ? 'kzgeology-' + t : 'kzgeology-map-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
    return base.slice(0, 60) + '.pdf';
  }

  function setStatus(text, err) {
    var el = $('print-status');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'print-status' + (err ? ' err' : '');
    el.hidden = !text;
  }

  function exportPdf() {
    if (busy) return;
    var m = window.atlasMap;
    if (!m) return;
    busy = true;
    modal.classList.add('busy');
    var send = $('print-send');
    send.disabled = true;

    var pageMm = pageDims();
    var opts = Object.assign({}, state);
    var px = DPI / 25.4;
    var W = Math.round(pageMm[0] * px), H = Math.round(pageMm[1] * px);
    if (W * H > MAX_PX) px = px * Math.sqrt(MAX_PX / (W * H));
    W = Math.round(pageMm[0] * px);
    H = Math.round(pageMm[1] * px);
    var L = layout(W, H, pageMm, opts);
    var el = m.getContainer();
    var dpr = m.getCanvas().width / Math.max(1, el.clientWidth);
    var cssW = Math.max(1, Math.round(L.map.w / dpr)), cssH = Math.max(1, Math.round(L.map.h / dpr));
    var bounds = m.getBounds();
    var saved = { center: m.getCenter(), zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch() };
    var prevW = el.style.width, prevH = el.style.height;

    var restored = false;
    function restore() {
      if (restored) return;
      restored = true;
      el.style.width = prevW;
      el.style.height = prevH;
      try { m.resize(); } catch (e) {}
      try { m.jumpTo(saved); } catch (e) {}
    }

    setStatus('Rendering map\u2026');
    (async function () {
      try {
        // Grow the live map to the sheet, then zoom so the current view covers
        // it: same center, and any axis that does not match the page aspect is
        // cropped, never padded with area that was not on screen.
        el.style.width = cssW + 'px';
        el.style.height = cssH + 'px';
        m.resize();
        var pSW = m.project(bounds.getSouthWest());
        var pNE = m.project(bounds.getNorthEast());
        var bw = Math.abs(pNE.x - pSW.x), bh = Math.abs(pNE.y - pSW.y);
        var dzW = isFinite(bw) && bw > 0 ? Math.log2(cssW / bw) : 0;
        var dzH = isFinite(bh) && bh > 0 ? Math.log2(cssH / bh) : 0;
        m.jumpTo({ center: saved.center, zoom: m.getZoom() + Math.max(dzW, dzH) });
        await waitIdle(m, 15000);
        var shot = await snapshot();
        setStatus('Building PDF\u2026');

        var sheet = document.createElement('canvas');
        sheet.width = W;
        sheet.height = H;
        drawSheet(sheet.getContext('2d'), W, H, pageMm, m, shot, opts);
        var dataUrl = sheet.toDataURL('image/jpeg', 0.92);
        sheet.width = 0;
        sheet.height = 0;

        await loadJsPdf();
        var jsPDF = window.jspdf && window.jspdf.jsPDF;
        if (!jsPDF) throw new Error('no jspdf');
        var doc = new jsPDF({
          orientation: pageMm[0] >= pageMm[1] ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [pageMm[0], pageMm[1]]
        });
        doc.addImage(dataUrl, 'JPEG', 0, 0, pageMm[0], pageMm[1]);
        doc.save(filename());
        setStatus('');
      } catch (e) {
        setStatus('Could not create the PDF. Try again.', true);
      } finally {
        restore();
        busy = false;
        modal.classList.remove('busy');
        send.disabled = false;
      }
    })();
  }

  // ---- dialog ------------------------------------------------------------

  function build() {
    if ($('print-modal')) return;
    var wrap = document.createElement('div');
    wrap.id = 'print-modal';
    wrap.className = 'print-modal';
    wrap.hidden = true;
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'print-title');
    wrap.innerHTML =
      '<div class="print-card">' +
        '<h2 id="print-title">Print map</h2>' +
        '<div class="print-preview"><canvas id="print-preview"></canvas><div class="print-status" id="print-status" hidden></div></div>' +
        '<div class="print-controls">' +
          '<label>Title <input type="text" id="print-name" maxlength="80" autocomplete="off"></label>' +
          '<div class="print-row2">' +
            '<label>Paper <select id="print-page"><option value="a4">A4</option><option value="a3">A3</option><option value="letter">Letter</option></select></label>' +
            '<label>Orientation <select id="print-orient"><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></label>' +
          '</div>' +
          '<div class="print-checks">' +
            '<label class="pc"><input type="checkbox" id="print-north" checked> North arrow</label>' +
            '<label class="pc"><input type="checkbox" id="print-grid" checked> Grid</label>' +
            '<label class="pc"><input type="checkbox" id="print-scale" checked> Scale bar</label>' +
            '<label class="pc"><input type="checkbox" id="print-date" checked> Date</label>' +
            '<label class="pc"><input type="checkbox" id="print-attr" checked> Attribution</label>' +
          '</div>' +
        '</div>' +
        '<div class="donate-actions print-actions">' +
          '<button type="button" class="donate-cancel" id="print-cancel">Cancel</button>' +
          '<button type="button" class="donate-send" id="print-send">Download PDF</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    modal = wrap;

    wrap.addEventListener('click', function (e) { if (e.target === wrap && !busy) closeModal(); });
    $('print-cancel').addEventListener('click', function () { if (!busy) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !modal || modal.hidden || busy) return;
      closeModal();
    });
    $('print-send').addEventListener('click', exportPdf);
    $('print-name').addEventListener('input', function (e) { state.title = e.target.value; recompose(); });
    $('print-page').addEventListener('change', function (e) { state.page = e.target.value; recompose(); });
    $('print-orient').addEventListener('change', function (e) { state.orient = e.target.value; recompose(); });
    ['north', 'grid', 'scale', 'date', 'attr'].forEach(function (k) {
      var el = $('print-' + k);
      el.addEventListener('change', function () { state[k] = el.checked; recompose(); });
    });
  }

  function openModal() {
    if (!window.atlasMap) return;
    build();
    modal.hidden = false;
    setStatus('Loading view\u2026');
    snapshot().then(function (shot) {
      cap = shot;
      setStatus('');
      recompose();
    }, function () {
      setStatus('The map is not ready yet. Try again.', true);
    });
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    setStatus('');
  }

  // ---- button ------------------------------------------------------------

  var tries = 0;
  function mountButton() {
    var box = $('measure-box');
    if (!box) {
      if (tries++ < 100) setTimeout(mountButton, 150);
      return;
    }
    if ($('print-btn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'print-btn';
    btn.className = 'measure-btn';
    btn.title = 'Print';
    btn.setAttribute('aria-label', 'Print');
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 8.4V4.4h9.6v4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><rect x="4" y="8.4" width="16" height="7.4" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7.6 13.2h8.8v6.4H7.6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
    btn.addEventListener('click', openModal);
    var row = box.querySelector('.tools-row');
    (row || box).appendChild(btn);
  }
  mountButton();
})();
