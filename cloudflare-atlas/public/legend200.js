(function () {
  'use strict';
  var DOC_URL = '/data/legend/master_legend.json?v=1';
  var DICT_URL = '/data/legend/dictionary.json?v=1';
  var I18N = window.atlasI18n;
  var doc = null;
  var decoder = null;
  var loading = null;
  var root = null;
  var timer = 0;

  function t(key) { return I18N ? I18N.t(key) : key; }
  function lang() { var l = I18N && I18N.lang ? I18N.lang() : 'en'; return l === 'ru' || l === 'kk' ? l : 'en'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function bar(stops) {
    var g = stops.length > 1 ? stops.join(',') : stops[0] + ',' + stops[0];
    return '<span class="l2-grad" style="background:linear-gradient(90deg,' + esc(g) + ')"></span>';
  }

  function load() {
    if (loading) return loading;
    function get(url) {
      return fetch(url, { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      });
    }
    loading = Promise.all([get(DOC_URL), get(DICT_URL)]).then(function (res) {
      doc = res[0];
      if (window.VsegeiDecoder) {
        try { decoder = window.VsegeiDecoder.createDecoder(res[1]); } catch (e) { decoder = null; }
      }
    }).catch(function (e) { loading = null; throw e; });
    return loading;
  }

  function build() {
    if (root) return;
    root = document.createElement('div');
    root.id = 'legend200';
    root.className = 'legend200';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML =
      '<div class="l2-card">' +
        '<div class="l2-head">' +
          '<strong class="l2-title"></strong>' +
          '<input class="l2-q" type="search" placeholder="D\u2083fr, \u03b3P\u2081" autocomplete="off" autocapitalize="off" spellcheck="false">' +
          '<button type="button" class="l2-close">\u00d7</button>' +
        '</div>' +
        '<div class="l2-dec" aria-live="polite"></div>' +
        '<div class="l2-body"></div>' +
      '</div>';
    document.body.appendChild(root);
    root.addEventListener('mousedown', function (e) { if (e.target === root) close(); });
    root.querySelector('.l2-close').addEventListener('click', close);
    root.querySelector('.l2-q').addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(search, 120);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root && !root.hidden) close();
    });
    label();
  }

  function label() {
    if (!root) return;
    var title = t('legend200.title');
    root.querySelector('.l2-title').textContent = title;
    root.setAttribute('aria-label', title);
    var c = root.querySelector('.l2-close');
    c.title = t('legend200.close');
    c.setAttribute('aria-label', t('legend200.close'));
    root.querySelector('.l2-q').setAttribute('aria-label', t('legend200.search'));
  }

  function rowHtml(r, kind) {
    var L = lang();
    var name = r[L] || r.en;
    var star = r.uncertain ? '<sup class="l2-unc" title="?">*</sup>' : '';
    var cls = 'l2-row' + (r.rank === 'stage' ? ' stage' : '');
    return '<div class="' + cls + '" data-kind="' + kind + '" data-id="' + esc(r.id) + '">' +
      '<span class="l2-idx">' + esc(r.index) + star + '</span>' +
      '<span class="l2-name">' + esc(name) + '</span>' +
      bar(r.gradient || []) + '</div>';
  }

  function render() {
    if (!root || !doc) return;
    var L = lang();
    var h = '<div class="l2-col"><h3 class="l2-h">' + esc(t('legend200.strat')) + '</h3>';
    var last = null;
    doc.stratigraphy.forEach(function (r) {
      if (r.group !== last) {
        last = r.group;
        var g = doc.groups && doc.groups[r.group];
        h += '<div class="l2-sub">' + esc(g ? (g[L] || g.en) : r.group) + '</div>';
      }
      h += rowHtml(r, 'strat');
    });
    h += '</div><div class="l2-col"><h3 class="l2-h">' + esc(t('legend200.intr')) + '</h3>';
    doc.intrusives.forEach(function (r) { h += rowHtml(r, 'intr'); });
    h += '<h3 class="l2-h l2-h2">' + esc(t('legend200.signs')) + '</h3>';
    doc.signs.forEach(function (s) {
      h += '<div class="l2-row sign" data-kind="sign" data-id="' + esc(s.id) + '">' +
        '<img class="l2-svg" src="legend-signs/' + esc(s.svg) + '" alt="" loading="lazy" width="80" height="28">' +
        '<span class="l2-name">' + esc(s[L] || s.en) + '</span></div>';
    });
    h += '</div>';
    root.querySelector('.l2-body').innerHTML = h;
    search();
  }

  function matchIds(res) {
    var hits = { strat: {}, intr: {} };
    if (!res || !doc) return hits;
    (res.ages || []).forEach(function (a) {
      var ser = a.series || [];
      var set = {};
      if (ser.length === 2 && a.series_rel !== 'and') {
        for (var n = Math.min(ser[0], ser[1]); n <= Math.max(ser[0], ser[1]); n++) set[n] = true;
      } else {
        ser.forEach(function (n) { set[n] = true; });
      }
      doc.stratigraphy.forEach(function (row) {
        if (row.system !== a.system) return;
        if (!row.series || !row.series.length) { hits.strat[row.id] = true; return; }
        var inSeries = !ser.length || set[row.series[0]];
        if (!inSeries) return;
        if (row.stage) {
          if ((a.stages || []).some(function (s) { return s.abbr === row.stage; })) hits.strat[row.id] = true;
        } else {
          hits.strat[row.id] = true;
        }
      });
    });
    var byIndex = {};
    doc.intrusives.forEach(function (r) { byIndex[r.index] = r.id; });
    (res.rock_groups || []).forEach(function (g) {
      if (g.symbols && byIndex[g.symbols]) { hits.intr[byIndex[g.symbols]] = true; return; }
      (g.units || []).forEach(function (u) { if (byIndex[u]) hits.intr[byIndex[u]] = true; });
    });
    return hits;
  }

  function search() {
    if (!root) return;
    var q = root.querySelector('.l2-q').value.trim();
    var out = root.querySelector('.l2-dec');
    var rows = root.querySelectorAll('.l2-row');
    var i;
    for (i = 0; i < rows.length; i++) rows[i].classList.remove('hit');
    if (!q || !decoder || !doc) { out.textContent = ''; return; }
    var res;
    try { res = decoder.decode(q); } catch (e) { res = null; }
    if (!res) { out.textContent = ''; return; }
    var L = lang();
    var line = res[L] || res.en || '';
    out.textContent = line;
    var hits = matchIds(res);
    var first = null;
    for (i = 0; i < rows.length; i++) {
      var k = rows[i].getAttribute('data-kind');
      if ((k === 'strat' || k === 'intr') && hits[k][rows[i].getAttribute('data-id')]) {
        rows[i].classList.add('hit');
        if (!first) first = rows[i];
      }
    }
    if (first && first.scrollIntoView) first.scrollIntoView({ block: 'nearest' });
  }

  function open() {
    build();
    label();
    root.hidden = false;
    document.documentElement.classList.add('l2-open');
    var q = root.querySelector('.l2-q');
    if (doc) { render(); } else {
      load().then(render).catch(function () {
        root.querySelector('.l2-dec').textContent = '';
      });
    }
    if (!window.matchMedia || !window.matchMedia('(max-width:700px)').matches) q.focus();
  }

  function close() {
    if (!root) return;
    root.hidden = true;
    document.documentElement.classList.remove('l2-open');
  }

  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-legend200]') : null;
    if (b) { e.preventDefault(); open(); }
  });

  if (I18N && I18N.onChange) I18N.onChange(function () { label(); render(); });

  window.atlasLegend200 = { open: open, close: close };
})();
