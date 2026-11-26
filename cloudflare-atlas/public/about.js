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
  function resizeMap() {
    try {
      if (window.atlasMap && typeof window.atlasMap.resize === "function") window.atlasMap.resize();
    } catch (e) {}
  }
  function markNav(path) {
    var nav = $("about-nav");
    if (!nav) return;
    var links = nav.querySelectorAll("a[data-about]");
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href");
      if (href === path) links[i].setAttribute("aria-current", "page");
      else links[i].removeAttribute("aria-current");
    }
    var top = $("about-btn");
    if (top) {
      if (ROUTES[path]) top.setAttribute("aria-current", "page");
      else top.removeAttribute("aria-current");
    }
  }
  function observe() {
    if (io) return;
    if (reduce) {
      var all = document.querySelectorAll(".about-block");
      for (var i = 0; i < all.length; i++) all[i].classList.add("in");
      return;
    }
    io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) entries[i].target.classList.add("in");
      }
    }, { root: null, threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    var blocks = document.querySelectorAll(".about-block");
    for (var j = 0; j < blocks.length; j++) io.observe(blocks[j]);
  }
  function scrollToId(id, instant) {
    var el = $(id);
    if (!el) return;
    var nav = $("about-nav");
    var offset = nav ? nav.getBoundingClientRect().height : 0;
    var top = el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset) - offset - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: instant || reduce ? "auto" : "smooth" });
  }
  function showPages() {
    var pages = $("site-pages");
    if (!pages) return;
    pages.hidden = false;
    document.body.classList.add("about-on");
    observe();
    resizeMap();
  }
  function hidePages() {
    var pages = $("site-pages");
    if (pages) pages.hidden = true;
    document.body.classList.remove("about-on");
    open = false;
    markNav("/");
    setTitle("/");
    resizeMap();
  }
  function goTo(path, push, instant) {
    if (!ROUTES[path]) {
      if (open) {
        window.scrollTo({ top: 0, behavior: instant || reduce ? "auto" : "smooth" });
        window.setTimeout(hidePages, reduce || instant ? 0 : 420);
      }
      if (push && pathOf() !== "/") history.pushState({ about: false }, "", "/");
      setTitle("/");
      markNav("/");
      return;
    }
    showPages();
    open = true;
    setTitle(path);
    markNav(path);
    if (push && pathOf() !== path) history.pushState({ about: true, path: path }, "", path);
    var id = ROUTES[path];
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { scrollToId(id, instant); });
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
  function backToMap() {
    goTo("/", true, false);
  }

  document.addEventListener("DOMContentLoaded", function () {
    try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    var back = $("about-back");
    if (back) back.addEventListener("click", backToMap);
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
      else {
        window.scrollTo(0, 0);
        hidePages();
      }
    });
    var start = pathOf();
    if (ROUTES[start]) goTo(start, false, true);
  });
})();
