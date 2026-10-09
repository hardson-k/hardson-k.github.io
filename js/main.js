/**
 * 康辉个人作品集 - 全站公共脚本
 * 功能：Tab切换/hash路由、汉堡菜单、图片灯箱、回到顶部
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
    // 更新 Tab 按钮高亮
    var buttons = document.querySelectorAll(".tab-bar button");
    buttons.forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
    });

    // 切换版本内容显示
    var panels = document.querySelectorAll(".version-content");
    panels.forEach(function (panel) {
      var isTarget = panel.getAttribute("data-version") === tabId;
      panel.style.display = isTarget ? "" : "none";
      panel.classList.toggle("active", isTarget);
    });

    // 同步 URL hash（避免重复触发 hashchange）
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
      var tab = btn.getAttribute("data-tab");
      switchTab(tab);
      // 滚动到页面顶部
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // 展开详情链接：点击后切换 Tab 并滚动到目标模块
    document.addEventListener("click", function (e) {
      var link = e.target.closest(".expand-link[data-goto-tab]");
      if (!link) return;
      e.preventDefault();
      var targetTab = link.getAttribute("data-goto-tab");
      var targetSection = link.getAttribute("data-scroll-to");
      switchTab(targetTab);
      if (targetSection) {
        // 等 DOM 更新后再滚动
        requestAnimationFrame(function () {
          var el = document.getElementById(targetSection);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    // 监听 hashchange
    window.addEventListener("hashchange", function () {
      switchTab(getTabFromHash());
    });

    // 首次加载
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

    // 点击链接后自动关闭菜单（移动端）
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        links.classList.remove("open");
        btn.classList.remove("active");
      }
    });
  }

  // ========== 图片灯箱 ==========

  function initLightbox() {
    // 创建灯箱 DOM
    var overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    overlay.innerHTML = '<img src="" alt="放大查看">';
    document.body.appendChild(overlay);

    var img = overlay.querySelector("img");

    overlay.addEventListener("click", function () {
      overlay.classList.remove("show");
    });

    // 给所有带 data-full 属性的图片绑定点击事件
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
      // 去掉 ../ 前缀
      var clean = href.replace(/^\.\.\//, "").replace(/^\.\//, "");
      if (clean === current) {
        a.classList.add("active");
      }
    });
  }

  // ========== 初始化 ==========

  document.addEventListener("DOMContentLoaded", function () {
    initTabs();
    initHamburger();
    initLightbox();
    initBackToTop();
    initNavActive();
  });
})();
