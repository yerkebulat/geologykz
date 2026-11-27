(function () {
  var MAX = 95 * 1024 * 1024;
  var EXTS = "pdf,jpg,jpeg,png,tif,tiff,kmz,kml,geojson,zip".split(",");
  var widgetId = null;
  var open = false;

  function $(id) { return document.getElementById(id); }
  function t(key, vars) { return (window.atlasI18n && window.atlasI18n.t) ? window.atlasI18n.t(key, vars) : key; }
  function siteKey() {
    return (window.ATLAS_SITE && window.ATLAS_SITE.turnstileSiteKey) || "";
  }
  function extOf(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || "");
    return m ? m[1].toLowerCase() : "";
  }

  function build() {
    if ($("donate-modal")) return;
    var wrap = document.createElement("div");
    wrap.id = "donate-modal";
    wrap.className = "donate-modal";
    wrap.hidden = true;
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "donate-title");
    wrap.innerHTML =
      '<div class="donate-card">' +
        '<h2 id="donate-title" data-i18n="donate.title">Donate maps</h2>' +
        '<p class="donate-lead" data-i18n="donate.lead">Share a map you have the right to contribute. We review every submission before anything is published.</p>' +
        '<form id="donate-form" novalidate>' +
          '<label><span data-i18n="donate.name">Name</span> <input type="text" name="name" required maxlength="120" autocomplete="name"></label>' +
          '<label><span data-i18n="donate.email">Email</span> <input type="email" name="email" required maxlength="200" autocomplete="email"></label>' +
          '<label><span data-i18n="donate.mapTitle">Map title</span> <input type="text" name="title" required maxlength="200"></label>' +
          '<label><span data-i18n="donate.source">Source or year</span> <span class="donate-opt" data-i18n="donate.optional">optional</span> <input type="text" name="source" maxlength="200"></label>' +
          '<label><span data-i18n="donate.note">Note</span> <span class="donate-opt" data-i18n="donate.optional">optional</span> <textarea name="note" rows="3" maxlength="2000"></textarea></label>' +
          '<label class="donate-file"><span data-i18n="donate.file">File</span>' +
            '<input type="file" name="file" required accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.kmz,.kml,.geojson,.zip,application/pdf,image/jpeg,image/png,image/tiff,application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml,application/geo+json,application/zip">' +
          '</label>' +
          '<p class="donate-hint" data-i18n="donate.hint">PDF, JPG, PNG, TIFF, KMZ, KML, GeoJSON, or ZIP. Up to 95 MB.</p>' +
          '<label class="donate-check"><input type="checkbox" name="rights" value="1" required> <span data-i18n="donate.rights">I have the right to share this map</span></label>' +
          '<div id="donate-turnstile" class="donate-turnstile"></div>' +
          '<p class="donate-msg" id="donate-msg" hidden></p>' +
          '<div class="donate-actions">' +
            '<button type="button" class="donate-cancel" id="donate-cancel" data-i18n="donate.cancel">Cancel</button>' +
            '<button type="submit" class="donate-send" id="donate-send" data-i18n="donate.send">Send</button>' +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(wrap);
    if (window.atlasI18n && window.atlasI18n.apply) window.atlasI18n.apply(wrap);
    wrap.addEventListener("click", function (e) {
      if (e.target === wrap) closeModal();
    });
    $("donate-cancel").addEventListener("click", closeModal);
    $("donate-form").addEventListener("submit", onSubmit);
  }

  function setMsg(text, kind) {
    var el = $("donate-msg");
    if (!el) return;
    if (!text) { el.hidden = true; el.textContent = ""; el.className = "donate-msg"; return; }
    el.hidden = false;
    el.textContent = text;
    el.className = "donate-msg" + (kind ? " " + kind : "");
  }

  function renderWidget() {
    var box = $("donate-turnstile");
    if (!box) return;
    box.innerHTML = "";
    widgetId = null;
    var key = siteKey();
    if (!key) {
      setMsg(t("donate.errUnavailable"), "err");
      return;
    }
    if (window.turnstile && typeof window.turnstile.render === "function") {
      try {
        widgetId = window.turnstile.render(box, { sitekey: key, theme: "light" });
      } catch (e) {
        setMsg(t("donate.errTurnstile"), "err");
      }
      return;
    }
    var d = document.createElement("div");
    d.className = "cf-turnstile";
    d.setAttribute("data-sitekey", key);
    box.appendChild(d);
  }

  function resetWidget() {
    if (window.turnstile && widgetId != null && typeof window.turnstile.reset === "function") {
      try { window.turnstile.reset(widgetId); } catch (e) {}
    }
  }

  function token() {
    if (window.turnstile && typeof window.turnstile.getResponse === "function") {
      try {
        return window.turnstile.getResponse(widgetId != null ? widgetId : undefined) || "";
      } catch (e) { return ""; }
    }
    var input = document.querySelector("#donate-turnstile [name='cf-turnstile-response']");
    return input && input.value ? input.value : "";
  }

  function openModal() {
    build();
    var modal = $("donate-modal");
    modal.hidden = false;
    open = true;
    setMsg("", "");
    $("donate-form").reset();
    $("donate-send").disabled = false;
    renderWidget();
    var first = modal.querySelector("input[name='name']");
    if (first) first.focus();
    document.body.classList.add("donate-open");
  }

  function closeModal() {
    var modal = $("donate-modal");
    if (!modal) return;
    modal.hidden = true;
    open = false;
    document.body.classList.remove("donate-open");
    resetWidget();
    var btn = $("donate-btn");
    if (btn) btn.focus();
  }

  function onSubmit(e) {
    e.preventDefault();
    var form = $("donate-form");
    var send = $("donate-send");
    var fd = new FormData(form);
    var file = fd.get("file");
    var name = String(fd.get("name") || "").trim();
    var email = String(fd.get("email") || "").trim();
    var title = String(fd.get("title") || "").trim();
    var rights = form.elements.rights && form.elements.rights.checked;
    setMsg("", "");
    if (!name || !email || !title) {
      setMsg(t("donate.errFields"), "err");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMsg(t("donate.errEmail"), "err");
      return;
    }
    if (!rights) {
      setMsg(t("donate.errRights"), "err");
      return;
    }
    if (!file || !file.name) {
      setMsg(t("donate.errFile"), "err");
      return;
    }
    var ext = extOf(file.name);
    if (EXTS.indexOf(ext) < 0) {
      setMsg(t("donate.errType"), "err");
      return;
    }
    if (file.size > MAX) {
      setMsg(t("donate.errSize"), "err");
      return;
    }
    var tok = token();
    if (!tok) {
      setMsg(t("donate.errCheck"), "err");
      return;
    }
    fd.set("cf-turnstile-response", tok);
    fd.set("rights", "1");
    send.disabled = true;
    setMsg(t("donate.sending"), "");
    fetch("/__donate", { method: "POST", body: fd, credentials: "same-origin" })
      .then(function (r) {
        return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }, function () {
          return { ok: r.ok, status: r.status, j: null };
        });
      })
      .then(function (res) {
        if (res.ok && res.j && res.j.ok) {
          setMsg(t("donate.thanks"), "ok");
          form.reset();
          resetWidget();
          setTimeout(closeModal, 1600);
          return;
        }
        var err = (res.j && res.j.error) || "";
        if (res.status === 413 || /too large|95/i.test(err)) setMsg(t("donate.errSize"), "err");
        else if (res.status === 415 || /type|accepted/i.test(err)) setMsg(t("donate.errType"), "err");
        else if (res.status === 429) setMsg(t("donate.errRate"), "err");
        else if (res.status === 400 && /verif|turnstile|check/i.test(err)) setMsg(t("donate.errCheck"), "err");
        else if (res.status === 400 && /right/i.test(err)) setMsg(t("donate.errRights"), "err");
        else setMsg(err || t("donate.errSend"), "err");
        resetWidget();
        send.disabled = false;
      })
      .catch(function () {
        setMsg(t("donate.errSend"), "err");
        resetWidget();
        send.disabled = false;
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = $("donate-btn");
    if (!btn) return;
    build();
    btn.addEventListener("click", openModal);
    document.addEventListener("keydown", function (e) {
      if (open && e.key === "Escape") closeModal();
    });
  });
})();
