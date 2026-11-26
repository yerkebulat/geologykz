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
  var io = null;

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
    }
    var top = $("about-btn");
    if (top) {
      if (ROUTES[path]) top.setAttribute("aria-current", "page");
      else top.removeAttribute("aria-current");
    }
    var mapBtn = $("map-return");
    if (mapBtn) mapBtn.hidden = !ROUTES[path];
  }
  function observe() {
    if (io) return;
    var scroller = document.querySelector(".about-wrap");
    var blocks = document.querySelectorAll(".about-block");
    if (reduce) {
      for (var i = 0; i < blocks.length; i++) blocks[i].classList.add("in");
      return;
    }
    io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) entries[i].target.classList.add("in");
      }
    }, { root: scroller || null, threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    for (var j = 0; j < blocks.length; j++) io.observe(blocks[j]);
  }
  function scrollToId(id, instant) {
    var scroller = document.querySelector(".about-wrap");
    var el = $(id);
    if (!scroller || !el) return;
    var nav = $("about-nav");
    var offset = 8;
    var top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - offset;
    scroller.scrollTo({ top: Math.max(0, top), behavior: instant || reduce ? "auto" : "smooth" });
  }
  function showPages() {
    var pages = $("site-pages");
    if (!pages) return;
    pages.hidden = false;
    document.body.classList.add("about-on");
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    setMapLive(false);
    observe();
  }
  function hidePages() {
    var pages = $("site-pages");
    if (pages) pages.hidden = true;
    var scroller = document.querySelector(".about-wrap");
    if (scroller) scroller.scrollTop = 0;
    document.body.classList.remove("about-on");
    open = false;
    markNav("/");
    setTitle("/");
    setMapLive(true);
  }
  function goTo(path, push, instant) {
    if (!ROUTES[path]) {
      hidePages();
      if (push && pathOf() !== "/") history.pushState({ about: false }, "", "/");
      return;
    }
    showPages();
    open = true;
    setTitle(path);
    markNav(path);
    if (push && pathOf() !== path) history.pushState({ about: true, path: path }, "", path);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { scrollToId(ROUTES[path], instant); });
    });
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
      goTo(path, true, false);
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
    if (mapBtn) mapBtn.addEventListener("click", function () { goTo("/", true, true); });
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
      if (ROUTES[p]) goTo(p, false, true);
      else hidePages();
    });
    var start = pathOf();
    if (ROUTES[start]) goTo(start, false, true);
    else hidePages();
  });
})();
