/* ============================================================
   theme.js — armory page chrome: same colour themes, rain and CRT
   grid toggles as the main site. Clock and language picker are
   handled by tools-app.js / i18n.js.
   ============================================================ */
(() => {
  "use strict";
  const THEMES = ["matrix", "synth", "vapor"];
  const NAMES = ["MATRIX", "SYNTH", "VAPOR"];
  const ACCENTS = ["#b6ff3c", "#ff5cf0", "#5cf0ff"];
  let i = 0, rainOn = true;

  function setTheme(n) {
    i = ((n % 3) + 3) % 3;
    document.documentElement.dataset.theme = THEMES[i];
    document.documentElement.style.setProperty("--accent", ACCENTS[i]);
    const label = document.getElementById("themeName");
    if (label) label.textContent = NAMES[i];
    if (window.MatrixGL) window.MatrixGL.setTheme(i);
  }
  function setRain(on) {
    rainOn = on;
    if (window.MatrixGL) window.MatrixGL.setDensity(on ? 1 : 0);
  }

  const menu = document.getElementById("menuBtn");
  const nav = document.getElementById("nav");
  if (menu && nav) {
    menu.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      menu.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      menu.setAttribute("aria-expanded", "false");
    }));
  }

  addEventListener("keydown", e => {
    const inField = e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT");
    if (inField) return;
    const k = e.key.toLowerCase();
    if (k === "[") setTheme(i - 1);
    if (k === "]") setTheme(i + 1);
    if (k === "g") document.body.classList.toggle("grid-on");
    if (k === "m") setRain(!rainOn);
  });

  setTheme(0);
  setRain(true);
})();
