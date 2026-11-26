(function () {
  var MAX = 95 * 1024 * 1024;
  var EXTS = "pdf,jpg,jpeg,png,tif,tiff,kmz,kml,geojson,zip".split(",");
  var widgetId = null;
  var open = false;

  function $(id) { return document.getElementById(id); }
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
        '<h2 id="donate-title">Donate maps</h2>' +
        '<p class="donate-lead">Share a map you have the right to contribute. We review every submission before anything is published.</p>' +
        '<form id="donate-form" novalidate>' +
          '<label>Name <input type="text" name="name" required maxlength="120" autocomplete="name"></label>' +
          '<label>Email <input type="email" name="email" required maxlength="200" autocomplete="email"></label>' +
          '<label>Map title <input type="text" name="title" required maxlength="200"></label>' +
          '<label>Source or year <span class="donate-opt">optional</span> <input type="text" name="source" maxlength="200"></label>' +
          '<label>Note <span class="donate-opt">optional</span> <textarea name="note" rows="3" maxlength="2000"></textarea></label>' +
          '<label class="donate-file">File' +
            '<input type="file" name="file" required accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.kmz,.kml,.geojson,.zip,application/pdf,image/jpeg,image/png,image/tiff,application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml,application/geo+json,application/zip">' +
          '</label>' +
          '<p class="donate-hint">PDF, JPG, PNG, TIFF, KMZ, KML, GeoJSON, or ZIP. Up to 95 MB.</p>' +
          '<label class="donate-check"><input type="checkbox" name="rights" value="1" required> I have the right to share this map</label>' +
          '<div id="donate-turnstile" class="donate-turnstile"></div>' +
          '<p class="donate-msg" id="donate-msg" hidden></p>' +
          '<div class="donate-actions">' +
            '<button type="button" class="donate-cancel" id="donate-cancel">Cancel</button>' +
            '<button type="submit" class="donate-send" id="donate-send">Send</button>' +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(wrap);
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
      setMsg("Donations are temporarily unavailable.", "err");
      return;
    }
    if (window.turnstile && typeof window.turnstile.render === "function") {
      try {
        widgetId = window.turnstile.render(box, { sitekey: key, theme: "light" });
      } catch (e) {
        setMsg("Could not load the verification check. Refresh and try again.", "err");
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
      setMsg("Please fill in your name, email, and the map title.", "err");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMsg("Please enter a valid email address.", "err");
      return;
    }
    if (!rights) {
      setMsg("Please confirm that you have the right to share this map.", "err");
      return;
    }
    if (!file || !file.name) {
      setMsg("Please choose a file.", "err");
      return;
    }
    var ext = extOf(file.name);
    if (EXTS.indexOf(ext) < 0) {
      setMsg("That file type is not accepted.", "err");
      return;
    }
    if (file.size > MAX) {
      setMsg("The file is larger than 95 MB.", "err");
      return;
    }
    var tok = token();
    if (!tok) {
      setMsg("Please complete the verification check.", "err");
      return;
    }
    fd.set("cf-turnstile-response", tok);
    fd.set("rights", "1");
    send.disabled = true;
    setMsg("Sending…", "");
    fetch("/__donate", { method: "POST", body: fd, credentials: "same-origin" })
      .then(function (r) {
        return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }, function () {
          return { ok: r.ok, status: r.status, j: null };
        });
      })
      .then(function (res) {
        if (res.ok && res.j && res.j.ok) {
          setMsg("Thank you. Your map was received.", "ok");
          form.reset();
          resetWidget();
          setTimeout(closeModal, 1600);
          return;
        }
        var err = (res.j && res.j.error) || "";
        if (res.status === 413 || /too large|95/i.test(err)) setMsg("The file is larger than 95 MB.", "err");
        else if (res.status === 415 || /type|accepted/i.test(err)) setMsg("That file type is not accepted.", "err");
        else if (res.status === 429) setMsg("Too many submissions. Please try again later.", "err");
        else if (res.status === 400 && /verif|turnstile|check/i.test(err)) setMsg("Please complete the verification check.", "err");
        else if (res.status === 400 && /right/i.test(err)) setMsg("Please confirm that you have the right to share this map.", "err");
        else setMsg(err || "Could not send the file. Please try again.", "err");
        resetWidget();
        send.disabled = false;
      })
      .catch(function () {
        setMsg("Could not send the file. Please try again.", "err");
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
