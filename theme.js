/* theme.js : Day / Dark mode toggle. <head> e dao, jate page flash na kore.
   Button ta header e profile icon (👤) er pashe boshe. Header na pele niche-bame float kore. */
(function () {
  var KEY = "inaya-theme";
  var root = document.documentElement;
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function systemDark() { return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches; }
  function apply(t) { root.setAttribute("data-theme", t); }

  // Age choose kora thakle seta, nahole device er setting
  apply(saved() || (systemDark() ? "dark" : "light"));

  var toggleBtn = null;
  function notify() { try { window.dispatchEvent(new Event("inaya-themechange")); } catch (e) {} }
  window.inayaTheme = {
    get: function () { return root.getAttribute("data-theme"); },
    set: function (t) {
      apply(t);
      try { localStorage.setItem(KEY, t); } catch (e) {}
      if (toggleBtn) paint(toggleBtn);
      notify();
    }
  };

  function paint(b) {
    var dark = root.getAttribute("data-theme") === "dark";
    b.textContent = dark ? "☀️" : "🌙";
    b.setAttribute("aria-label", dark ? "Switch to day mode" : "Switch to dark mode");
    b.title = dark ? "Day mode" : "Dark mode";
  }

  function build() {
    var b = document.createElement("button");
    b.id = "themeToggle";
    b.type = "button";
    b.addEventListener("click", function () {
      window.inayaTheme.set(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
    toggleBtn = b;
    paint(b);
    return b;
  }

  function place(b) {
    var tools = document.querySelector(".tools, .pg-tools");
    if (!tools) return false;
    var account = tools.querySelector('[aria-label="Account"]');
    b.classList.add("in-header");
    tools.insertBefore(b, account || tools.querySelector("button, a"));
    return true;
  }

  function init() {
    if (document.getElementById("themeToggle")) return;
    var b = build();
    if (place(b)) return;
    // Header ekhono toiri hoy nai hole ektu opekkha kore abar chesta
    document.body.appendChild(b);          // temporary floating
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (place(b)) { clearInterval(t); }
      else if (tries > 10) { clearInterval(t); }
    }, 150);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
