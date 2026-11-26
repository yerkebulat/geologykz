(function () {
  var ROUTES = {
    "/about": "about",
    "/about/made": "about-made",
    "/sources": "about-sources",
    "/contribute": "about-contribute",
    "/open-source": "about-code"
  };
  var TITLES = {
    "/about": "About",
    "/about/made": "How it's made",
    "/sources": "Sources",
    "/contribute": "Contribute",
    "/open-source": "Open source"
  };
  var HANDLERS = [
    "scrollZoom", "boxZoom", "dragRotate", "dragPan",
    "keyboard", "doubleClickZoom", "touchZoomRotate", "touchPitch"
  ];
  var reduce = false;
  try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var open = false;

  function $(id) { return document.getElementById(id); }
  function pathOf() {
    var p = location.pathname || "/";
    if (p.length > 1 && p.charAt(p.length - 1) === "/") p = p.slice(0, -1);
    return p;
  }
  function brandName() {
    return (window.ATLAS_SITE && window.ATLAS_SITE.mode === "atlas") ? "Atlas" : "kzgeology";
  }
  function setTitle(path) {
    var t = TITLES[path];
    document.title = t ? (t + " · " + brandName()) : brandName();
  }
  function setMapLive(on) {
    var wrap = document.querySelector(".wrap");
    if (wrap) {
      if (on) {
        wrap.removeAttribute("inert");
        wrap.removeAttribute("aria-hidden");
      } else {
        wrap.setAttribute("inert", "");
        wrap.setAttribute("aria-hidden", "true");
      }
    }
    var map = window.atlasMap;
    if (!map) return;
    for (var i = 0; i < HANDLERS.length; i++) {
      var h = map[HANDLERS[i]];
      if (!h) continue;
      try { if (on) h.enable(); else h.disable(); } catch (e) {}
    }
    if (!on && typeof map.stop === "function") {
      try { map.stop(); } catch (e) {}
    }
    if (on && typeof map.resize === "function") {
      try { map.resize(); } catch (e) {}
    }
  }
  function markNav(path) {
    var nav = $("about-nav");
    if (nav) {
      var links = nav.querySelectorAll("a[data-about]");
      for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute("href");
        if (href === path) links[i].setAttribute("aria-current", "page");
        else links[i].removeAttribute("aria-current");
      }
      var current = nav.querySelector("a[aria-current='page']");
      if (current && current.scrollIntoView) {
        try { current.scrollIntoView({ inline: "center", block: "nearest" }); } catch (e) {}
      }
    }
    var top = $("about-btn");
    if (top) {
      if (ROUTES[path]) top.setAttribute("aria-current", "page");
      else top.removeAttribute("aria-current");
    }
    var mapBtn = $("map-return");
    if (mapBtn) mapBtn.hidden = !ROUTES[path];
  }
  function runCounts(root) {
    var nodes = root.querySelectorAll("[data-count]");
    for (var i = 0; i < nodes.length; i++) {
      (function (el) {
        if (el.getAttribute("data-counted")) return;
        el.setAttribute("data-counted", "1");
        var end = parseInt(el.getAttribute("data-count"), 10);
        if (!end && end !== 0) return;
        if (reduce) { el.textContent = String(end); return; }
        var start = performance.now();
        var dur = 900;
        function tick(now) {
          var t = Math.min(1, (now - start) / dur);
          var eased = 1 - Math.pow(1 - t, 3);
          el.textContent = String(Math.round(end * eased));
          if (t < 1) requestAnimationFrame(tick);
        }
        el.textContent = "0";
        requestAnimationFrame(tick);
      })(nodes[i]);
    }
  }
  function showSection(path) {
    var id = ROUTES[path];
    var blocks = document.querySelectorAll(".about-block");
    var target = id ? $(id) : null;
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i] === target) {
        blocks[i].classList.add("on");
      } else {
        blocks[i].classList.remove("on", "in");
      }
    }
    var scroller = document.querySelector(".about-wrap");
    if (scroller) scroller.scrollTop = 0;
    if (!target) return;
    function enter() {
      if (!target.classList.contains("on")) return;
      if (reduce) {
        target.classList.add("in");
        runCounts(target);
        return;
      }
      void target.offsetWidth;
      target.classList.add("in");
      runCounts(target);
    }
    requestAnimationFrame(function () { requestAnimationFrame(enter); });
  }
  function showPages() {
    var pages = $("site-pages");
    if (!pages) return;
    pages.hidden = false;
    document.body.classList.add("about-on");
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    setMapLive(false);
  }
  function hidePages() {
    var pages = $("site-pages");
    if (pages) pages.hidden = true;
    var scroller = document.querySelector(".about-wrap");
    if (scroller) scroller.scrollTop = 0;
    var blocks = document.querySelectorAll(".about-block");
    for (var i = 0; i < blocks.length; i++) blocks[i].classList.remove("on", "in");
    document.body.classList.remove("about-on");
    open = false;
    markNav("/");
    setTitle("/");
    setMapLive(true);
  }
  function goTo(path, push) {
    if (!ROUTES[path]) {
      hidePages();
      if (push && pathOf() !== "/") history.pushState({ about: false }, "", "/");
      return;
    }
    showPages();
    open = true;
    setTitle(path);
    markNav(path);
    showSection(path);
    if (push && pathOf() !== path) history.pushState({ about: true, path: path }, "", path);
  }
  function onLinkClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest("a") : null;
    if (!a) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) !== "/") return;
    if (a.getAttribute("target") === "_blank") return;
    var path = href.split("?")[0].split("#")[0];
    if (path.length > 1 && path.charAt(path.length - 1) === "/") path = path.slice(0, -1);
    if (path === "/" || ROUTES[path]) {
      e.preventDefault();
      goTo(path, true);
    }
  }

  function lockBrowserPageZoom() {
    ["gesturestart", "gesturechange", "gestureend"].forEach(function (type) {
      document.addEventListener(type, function (e) { e.preventDefault(); }, { passive: false, capture: true });
    });
    var lastTap = 0;
    document.addEventListener("touchend", function (e) {
      if (document.body.classList.contains("about-on")) return;
      if (e.touches && e.touches.length) return;
      var now = Date.now();
      if (now - lastTap < 350) e.preventDefault();
      lastTap = now;
    }, { passive: false });
  }

  document.addEventListener("DOMContentLoaded", function () {
    try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    lockBrowserPageZoom();
    var mapBtn = $("map-return");
    if (mapBtn) mapBtn.addEventListener("click", function () { goTo("/", true); });
    var donate = $("about-donate");
    if (donate) {
      donate.addEventListener("click", function () {
        var btn = $("donate-btn");
        if (btn) btn.click();
      });
    }
    document.addEventListener("click", onLinkClick);
    window.addEventListener("popstate", function () {
      var p = pathOf();
      if (ROUTES[p]) goTo(p, false);
      else hidePages();
    });
    var start = pathOf();
    if (ROUTES[start]) goTo(start, false);
    else hidePages();
  });
})();
