/* ============================================================
   LOGAN SOLAMAN — i18n engine (vanilla JS, no dependencies)
   One JSON per language in /locales/. Flat key -> string.
   Detection: ?lang= → localStorage → navigator.language → 'en'.
   Arabic (ar) flips the document to RTL.
   Exposes window.I18N = { lang, t(key), set(lang), onChange(fn) }.
   ============================================================ */
(() => {
  "use strict";

  const SUPPORTED = ["en", "zh-TW", "zh-CN", "es", "ar", "fr", "pt", "ja", "vi", "ko"];
  const RTL = new Set(["ar"]);
  const DEFAULT = "en";
  const LABELS = {
    en: "EN", "zh-TW": "繁中", "zh-CN": "简中", es: "ES", ar: "ع",
    fr: "FR", pt: "PT", ja: "日本語", vi: "VI", ko: "한국어",
  };
  // native + english names for the picker menu
  const NAMES = {
    en: ["English", "English"],
    "zh-TW": ["繁體中文", "Traditional Chinese"],
    "zh-CN": ["简体中文", "Simplified Chinese"],
    es: ["Español", "Spanish"],
    ar: ["العربية", "Arabic"],
    fr: ["Français", "French"],
    pt: ["Português", "Portuguese"],
    ja: ["日本語", "Japanese"],
    vi: ["Tiếng Việt", "Vietnamese"],
    ko: ["한국어", "Korean"],
  };

  let dict = {};          // active locale dictionary
  let fallback = {};      // english, always loaded
  let current = DEFAULT;
  const listeners = [];

  // Locale files live at site root. Compute the relative path from the current
  // page's depth so /cases/case01/, /services/x/, /privacy/, /tools/ and /
  // all resolve to the same /locales/<lang>.json.
  let segs = location.pathname.replace(/^\//, "").replace(/\/$/, "").split("/").filter(Boolean);
  if (segs.length && /\.[a-z0-9]+$/i.test(segs[segs.length - 1])) segs.pop();  // root-level /404.html
  const depth = segs.length;
  const BASE = depth > 0 ? "../".repeat(depth) : "";

  /* ---------- detect preferred language ----------
     Priority: ?lang= → manual choice (ls_lang + ls_lang_manual) → browser.
     Browser auto-detect only fires when the user has NEVER manually picked. */
  function detect() {
    const url = new URLSearchParams(window.location.search).get("lang");
    if (url && SUPPORTED.includes(url)) return url;
    let saved = null, manual = false;
    try {
      saved = localStorage.getItem("ls_lang");
      manual = localStorage.getItem("ls_lang_manual") === "1";
    } catch (e) {}
    if (manual && saved && SUPPORTED.includes(saved)) return saved;  // user-chosen wins
    // first visit (or never manually set): auto-detect from browser
    const nav = (navigator.language || (navigator.languages && navigator.languages[0]) || "").trim();
    if (SUPPORTED.includes(nav)) return nav;
    const base = nav.split("-")[0];
    if (base === "zh") return /TW|HK|MO/i.test(nav) ? "zh-TW" : "zh-CN";
    const match = SUPPORTED.find((l) => l.split("-")[0] === base);
    return match || DEFAULT;
  }

  async function load(lang) {
    try {
      const r = await fetch(BASE + `locales/${lang}.json`, { cache: "no-cache" });
      if (!r.ok) return {};
      return await r.json();
    } catch (e) {
      return {};
    }
  }

  /* ---------- apply dictionary to the DOM ---------- */
  function apply() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      let val = dict[key] ?? fallback[key];
      if (val == null) return;
      // data-i18n-vars='n:01;cat:OUTDOOR' -> substitute {n}/{cat} tokens
      const vars = el.getAttribute("data-i18n-vars");
      if (vars && typeof val === "string") {
        vars.split(";").forEach((pair) => {
          const i = pair.indexOf(":");
          if (i < 0) return;
          let v = pair.slice(i + 1);
          if (v.startsWith("@")) v = dict[v.slice(1)] ?? fallback[v.slice(1)] ?? v;
          val = val.replaceAll("{" + pair.slice(0, i) + "}", v);
        });
      }
      if (el.hasAttribute("data-i18n-html")) el.innerHTML = val;
      else el.textContent = val;
    });
    // placeholder / aria / value attributes
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      // format: "placeholder:hero.cmd_ph;aria-label:hero.cmd_aria"
      el.getAttribute("data-i18n-attr").split(";").forEach((pair) => {
        const [attr, key] = pair.split(":");
        const val = dict[key] ?? fallback[key];
        if (attr && val != null) el.setAttribute(attr, val);
      });
    });
    // <title> and <meta name=description> (data-meta-i18n + optional vars)
    document.querySelectorAll("[data-meta-i18n]").forEach((el) => {
      let val = dict[el.getAttribute("data-meta-i18n")] ?? fallback[el.getAttribute("data-meta-i18n")];
      if (val == null) return;
      const vars = el.getAttribute("data-meta-vars");
      if (vars && typeof val === "string") {
        vars.split(";").forEach((pair) => {
          const i = pair.indexOf(":");
          if (i < 0) return;
          let v = pair.slice(i + 1);
          if (v.startsWith("@")) v = dict[v.slice(1)] ?? fallback[v.slice(1)] ?? v;
          val = val.replaceAll("{" + pair.slice(0, i) + "}", v);
        });
      }
      if (el.tagName === "TITLE") document.title = val;
      else el.setAttribute("content", val);
    });
    // document direction + lang
    document.documentElement.lang = current;
    document.documentElement.dir = RTL.has(current) ? "rtl" : "ltr";
    document.documentElement.dataset.lang = current;
    const label = LABELS[current] || current.toUpperCase();
    ["langName", "detailLangName"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = label;
    });
  }

  async function set(lang, pushUrl = true, manual = true) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT;
    current = lang;
    dict = lang === DEFAULT ? {} : await load(lang);
    try {
      localStorage.setItem("ls_lang", lang);
      if (manual) localStorage.setItem("ls_lang_manual", "1");  // user explicitly chose
    } catch (e) {}
    if (pushUrl) {
      const u = new URL(window.location.href);
      if (lang === DEFAULT) u.searchParams.delete("lang"); else u.searchParams.set("lang", lang);
      window.history.replaceState({}, "", u);
    }
    apply();
    listeners.forEach((fn) => fn(current));
  }

  /* ---------- public API ---------- */
  window.I18N = {
    SUPPORTED, LABELS, NAMES,
    get lang() { return current; },
    isRTL: () => RTL.has(current),
    t: (key) => dict[key] ?? fallback[key] ?? key,
    arr: (key) => dict[key] ?? fallback[key] ?? [],   // for array-valued strings (typewriter, boot)
    set,
    next: () => set(SUPPORTED[(SUPPORTED.indexOf(current) + 1) % SUPPORTED.length]),
    onChange: (fn) => { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); },
    ready: () => bootPromise,                            // resolves when the active locale is loaded
    // Build the language picker options into a container element.
    renderMenu: (container, onPick) => {
      if (!container) return;
      container.innerHTML = "";
      SUPPORTED.forEach((code) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "langmodal__opt" + (code === current ? " is-active" : "");
        b.setAttribute("role", "option");
        b.setAttribute("aria-selected", code === current ? "true" : "false");
        b.dataset.lang = code;
        const [native, en] = NAMES[code] || [code, code];
        b.innerHTML = `<span class="langmodal__opt-native">${native}</span><span class="langmodal__opt-en">${en}</span>`;
        b.addEventListener("click", () => { set(code); if (onPick) onPick(code); });
        container.appendChild(b);
      });
    },
    refreshMenu: (container) => {
      if (!container) return;
      container.querySelectorAll(".langmodal__opt").forEach((b) => {
        const active = b.dataset.lang === current;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });
    },
  };

  /* ---------- self-contained switcher for static pages ----------
     Detail pages (cases, services, privacy) load i18n.js without site.js,
     so wire any #detailLang / #detailLangModal pair right here. */
  function initStaticSwitcher() {
    const btn = document.getElementById("detailLang");
    const modal = document.getElementById("detailLangModal");
    const grid = document.getElementById("detailLangGrid");
    if (!btn || !modal || !grid) return;
    const close = () => { modal.hidden = true; };
    const open = () => { window.I18N.renderMenu(grid, close); modal.hidden = false; };
    btn.addEventListener("click", () => modal.hidden ? open() : close());
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) close(); });
    listeners.push(() => { if (!modal.hidden) window.I18N.refreshMenu(grid); });
  }

  /* ---------- boot ---------- */
  // Always load en.json as the JS-string fallback, plus the active locale on top.
  const bootPromise = (async () => {
    fallback = await load(DEFAULT);
    const preferred = detect();
    if (preferred === DEFAULT) {
      apply();
    } else {
      await set(preferred, false, false);   // auto-detected, NOT a manual choice
    }
    initStaticSwitcher();
    return current;
  })();
})();
