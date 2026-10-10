/**
 * 康辉个人作品集 - 全站公共脚本
 * 功能：Tab切换/hash路由、汉堡菜单、图片灯箱、回到顶部、折叠展开、悬浮导航
 */

(function () {
  "use strict";

  // ========== Tab 切换 & Hash 路由 ==========

  var VALID_TABS = ["main", "plan", "gov", "design"];
  var DEFAULT_TAB = "main";

  function getTabFromHash() {
    var h = (location.hash || "").replace("#", "");
    return VALID_TABS.indexOf(h) !== -1 ? h : DEFAULT_TAB;
  }

  function switchTab(tabId) {
    var buttons = document.querySelectorAll(".tab-bar button");
    buttons.forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
    });

    var panels = document.querySelectorAll(".version-content");
    panels.forEach(function (panel) {
      var isTarget = panel.getAttribute("data-version") === tabId;
      panel.style.display = isTarget ? "" : "none";
      panel.classList.toggle("active", isTarget);
    });

    if (location.hash !== "#" + tabId) {
      history.replaceState(null, "", "#" + tabId);
    }
  }

  function initTabs() {
    var bar = document.querySelector(".tab-bar");
    if (!bar) return;

    bar.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-tab]");
      if (!btn) return;
      switchTab(btn.getAttribute("data-tab"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("hashchange", function () {
      switchTab(getTabFromHash());
    });

    switchTab(getTabFromHash());
  }

  // ========== 汉堡菜单 ==========

  function initHamburger() {
    var btn = document.querySelector(".hamburger");
    var links = document.querySelector(".nav-links");
    if (!btn || !links) return;

    btn.addEventListener("click", function () {
      links.classList.toggle("open");
      btn.classList.toggle("active");
    });

    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        links.classList.remove("open");
        btn.classList.remove("active");
      }
    });
  }

  // ========== 图片灯箱 ==========

  function initLightbox() {
    var overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    overlay.innerHTML = '<img src="" alt="放大查看">';
    document.body.appendChild(overlay);

    var img = overlay.querySelector("img");

    overlay.addEventListener("click", function () {
      overlay.classList.remove("show");
    });

    document.addEventListener("click", function (e) {
      var target = e.target.closest("img[data-full]");
      if (!target) return;
      img.src = target.getAttribute("data-full");
      overlay.classList.add("show");
    });
  }

  // ========== 回到顶部 ==========

  function initBackToTop() {
    var btn = document.getElementById("backToTop");
    if (!btn) return;

    window.addEventListener("scroll", function () {
      btn.classList.toggle("show", window.pageYOffset > 300);
    });

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ========== 导航高亮 ==========

  function initNavActive() {
    var current = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a").forEach(function (a) {
      var href = a.getAttribute("href");
      var clean = href.replace(/^\.\.\//, "").replace(/^\.\//, "");
      if (clean === current) {
        a.classList.add("active");
      }
    });
  }

  // ========== 折叠展开（#main 综合总览） ==========

  function initCollapsible() {
    document.addEventListener("click", function (e) {
      var toggle = e.target.closest(".collapse-toggle");
      if (!toggle) return;

      var targetId = toggle.getAttribute("data-target");
      var content = document.getElementById(targetId);
      if (!content) return;

      var isExpanded = content.classList.toggle("expanded");
      toggle.classList.toggle("expanded", isExpanded);

      var label = toggle.querySelector(".label");
      if (label) {
        label.textContent = isExpanded ? "收起" : "展开更多";
      }
    });
  }

  // ========== 悬浮子导航（设计作品集） ==========

  function initSubNav() {
    var nav = document.querySelector(".sub-nav");
    if (!nav) return;

    var links = nav.querySelectorAll("a");
    var sections = [];

    links.forEach(function (link) {
      var href = link.getAttribute("href");
      if (href && href.startsWith("#")) {
        var section = document.getElementById(href.slice(1));
        if (section) {
          sections.push({ el: section, link: link });
        }
      }
    });

    if (sections.length === 0) return;

    function onScroll() {
      var scrollY = window.pageYOffset + 120;

      var current = sections[0];
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].el.offsetTop <= scrollY) {
          current = sections[i];
        }
      }

      links.forEach(function (l) { l.classList.remove("active"); });
      current.link.classList.add("active");
    }

    window.addEventListener("scroll", onScroll);
    onScroll();
  }

  // ========== 初始化 ==========

  document.addEventListener("DOMContentLoaded", function () {
    initTabs();
    initHamburger();
    initLightbox();
    initBackToTop();
    initNavActive();
    initCollapsible();
    initSubNav();
  });
})();
