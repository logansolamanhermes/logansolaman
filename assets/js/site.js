/* ============================================================
   site.js — interaction engine. Vanilla JS, no dependencies.
   Boot · clock · theme/CRT/rain keyboard protocol · command line
   · i18n picker · reveals/counters · service modules · cases rail
   + filters + detail modal · contact form (mailto, no backend).
   ============================================================ */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const T = (k, fb) => (window.I18N ? I18N.t(k) : k) === k ? fb : (window.I18N ? I18N.t(k) : fb);

  /* Change this to the inbox you actually monitor. No backend, no data collection:
     the form builds a mailto: link and lets the visitor's mail client send it. */
  const CONTACT_EMAIL = "hello@logansolaman.com";

  /* ---------- 17-case archive. Keys map to caseN.name / caseN.copy
     in locales/*.json, so all ten languages come from the dictionaries. ---------- */
  const CASES = [
    { k: 1,  cat: "OUTDOOR", status: "live",     url: "https://alpakagear.hk" },
    { k: 2,  cat: "OUTDOOR", status: "live",     url: "https://suunto.com.hk" },
    { k: 3,  cat: "OUTDOOR", status: "live",     url: "https://kavu.hk" },
    { k: 4,  cat: "OUTDOOR", status: "building", url: "" },
    { k: 5,  cat: "OUTDOOR", status: "building", url: "" },
    { k: 6,  cat: "LUXURY", status: "live",     url: "https://www.heliumwatches.com" },
    { k: 7,  cat: "LUXURY", status: "live",     url: "https://www.natachavan.com" },
    { k: 8,  cat: "ART",    status: "live",     url: "https://kbfineart.com" },
    { k: 9,  cat: "WINE",   status: "live",     url: "https://www.twomoreglasses.com" },
    { k: 10, cat: "RETAIL", status: "live",     url: "https://inherehk.com" },
    { k: 11, cat: "RETAIL", status: "live",     url: "https://www.productpro.com.hk" },
    { k: 12, cat: "RETAIL", status: "live",     url: "https://topickstorehk.com" },
    { k: 13, cat: "SERVICE",status: "live",     url: "https://infinitylearning.au" },
    { k: 14, cat: "AUDIO",  status: "live",     url: "https://fonocoaudio.com" },
    { k: 15, cat: "INFRA",  status: "live",     url: "" },
    { k: 16, cat: "ART",    status: "live",     url: "https://chiwaistudio.com/" },
    { k: 17, cat: "SERVICE",status: "live",     url: "https://masterpesthk.com/" },
  ];
  const FILTERS = ["ALL", "OUTDOOR", "LUXURY", "ART", "RETAIL", "SERVICE", "WINE", "AUDIO", "INFRA", "BUILDING"];

  const SECTIONS = ["about", "services", "cases", "tools", "process", "faq", "contact"];

  /* ---------- state ---------- */
  let themeIdx = 0, rainOn = true, activeFilter = "ALL", currentCard = 0;
  const themeNames = ["MATRIX", "SYNTH", "VAPOR"];
  const themeAccents = ["#b6ff3c", "#ff5cf0", "#5cf0ff"];

  function setTheme(i) {
    themeIdx = ((i % 3) + 3) % 3;
    document.documentElement.dataset.theme = ["matrix", "synth", "vapor"][themeIdx];
    document.documentElement.style.setProperty("--accent", themeAccents[themeIdx]);
    const el = $("#themeName"); if (el) el.textContent = themeNames[themeIdx];
    if (window.MatrixGL) window.MatrixGL.setTheme(themeIdx);
  }
  function setRain(on) {
    rainOn = on;
    if (window.MatrixGL) window.MatrixGL.setDensity(on ? 1 : 0);
    document.body.classList.toggle("rain-off", !on);
  }
  function toggleGrid() { document.body.classList.toggle("grid-on"); }

  /* ---------- boot ---------- */
  function boot() {
    const el = $("#boot"), log = $("#bootLog");
    if (!el) return;
    if (reduced || sessionStorage.getItem("ls_booted")) { el.classList.add("is-done"); return; }
    const lines = [
      "SOLAMAN-CLASS PERSONAL SITE v4.0 — BIOS OK",
      "MEM CHECK ............ 64K OK",
      "LOADING MATRIX.SHADER ... OK [WEBGL2]",
      "MOUNTING /ARCHIVE ......... 17 SYSTEMS",
      "LOCALE .................... READY",
      "SYSTEM ONLINE_",
    ];
    let i = 0;
    const done = () => {
      el.classList.add("is-done");
      try { sessionStorage.setItem("ls_booted", "1"); } catch (e) {}
      // Hard hide: in a background tab CSS transitions can be throttled forever.
      setTimeout(() => { el.style.display = "none"; }, 600);
    };
    setTimeout(done, 4000); // never let boot strand the page
    const step = () => {
      if (i < lines.length) { log.textContent += lines[i++] + "\n"; setTimeout(step, reduced ? 0 : 90 + Math.random() * 90); }
      else setTimeout(done, reduced ? 0 : 320);
    };
    addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); done(); } }, { once: true });
    el.addEventListener("click", done, { once: true });
    step();
  }

  /* ---------- clock ---------- */
  function clock() {
    const el = $("#clock");
    const tick = () => { if (el) el.textContent = new Date().toTimeString().slice(0, 8); };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- nav ---------- */
  function nav() {
    const menu = $("#menuBtn"), list = $("#nav");
    if (menu && list) {
      menu.addEventListener("click", () => {
        const open = list.classList.toggle("is-open");
        menu.setAttribute("aria-expanded", String(open));
      });
      $$("#nav a").forEach(a => a.addEventListener("click", () => { list.classList.remove("is-open"); menu.setAttribute("aria-expanded", "false"); }));
    }
    const links = $$("#nav a");
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(a => a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    SECTIONS.forEach(id => { const s = document.getElementById(id); if (s) obs.observe(s); });
  }

  /* ---------- reveals + counters ---------- */
  function reveals() {
    const els = $$(".reveal, [data-reveal]");
    if (reduced) { els.forEach(el => el.classList.add("is-in")); return; }
    // Scroll-based fallback: IntersectionObserver callbacks are throttled in
    // background/hidden tabs, which would otherwise leave content at opacity 0.
    const showInView = () => els.forEach(el => {
      if (el.classList.contains("is-in")) return;
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.94 && r.bottom > 0) el.classList.add("is-in");
    });
    addEventListener("scroll", showInView, { passive: true });
    addEventListener("resize", showInView, { passive: true });
    showInView();
    setTimeout(() => els.forEach(el => el.classList.add("is-in")), 2200);
    const obs = new IntersectionObserver((entries, o) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-in"); o.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
  }
  function counters() {
    $$("[data-count]").forEach(el => {
      const target = parseInt(el.dataset.count, 10);
      if (reduced) { el.textContent = target; return; }
      let done = false;
      const finish = () => { if (!done) { done = true; el.textContent = target; } };
      setTimeout(finish, 1800); // rAF can be throttled in a hidden tab
      const obs = new IntersectionObserver((entries, o) => {
        if (!entries[0].isIntersecting) return;
        o.disconnect();
        const t0 = performance.now();
        const run = now => {
          const p = Math.min((now - t0) / 1600, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(run); else finish();
        };
        requestAnimationFrame(run);
      }, { threshold: 0.5 });
      obs.observe(el);
    });
  }

  /* ---------- cases: render, filter, rail, modal ---------- */
  function cases() {
    const rail = $("#rail"), countEl = $("#caseCount"), filtersEl = $("#filters");
    if (!rail || !filtersEl) return;
    const esc = s => String(s).replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));

    function cardHTML(c, i) {
      const name = T("case" + c.k + ".name", "PROJECT " + c.k);
      const copy = T("case" + c.k + ".copy", "");
      const tape = String(i + 1).padStart(2, "0");
      return `<article class="card glass" role="listitem" tabindex="0" data-i="${i}" data-cat="${c.cat}" data-status="${c.status}">
        <div class="card__top"><span class="card__tape">TAPE ${tape}</span>
          <span class="card__status ${c.status === "building" ? "is-building" : ""}"><i></i>${c.status === "building" ? "BUILDING" : "LIVE"}</span></div>
        <span class="card__big" aria-hidden="true">${tape}</span>
        <span class="card__cat">${c.cat}</span>
        <h3 class="card__name">${esc(name)}</h3>
        <p class="card__copy">${copy}</p>
        <span class="card__view">VIEW ▸</span>
      </article>`;
    }
    function render() { rail.innerHTML = CASES.map(cardHTML).join(""); bindCards(); applyFilter(); }

    function bindCards() {
      $$(".card", rail).forEach(card => {
        card.addEventListener("click", () => openCase(parseInt(card.dataset.i, 10)));
        card.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); openCase(parseInt(card.dataset.i, 10)); } });
      });
    }

    function applyFilter() {
      const cards = $$(".card", rail);
      let visible = 0;
      cards.forEach(card => {
        const cat = card.dataset.cat, st = card.dataset.status;
        const match = activeFilter === "ALL" || cat === activeFilter || (activeFilter === "BUILDING" && st === "building");
        card.classList.toggle("is-hidden", !match);
        if (match) visible++;
      });
      if (countEl) countEl.textContent = `${String(visible).padStart(2, "0")} / 17 SYSTEMS SHOWN · FILTER: ${activeFilter}`;
      $$(".filter", filtersEl).forEach(b => b.classList.toggle("is-active", b.dataset.f === activeFilter));
      rail.scrollLeft = 0; currentCard = 0; updateRail();
    }

    function visibleCards() { return $$(".card:not(.is-hidden)", rail); }

    function move(dir) {
      const cards = visibleCards(); if (!cards.length) return;
      currentCard = Math.max(0, Math.min(cards.length - 1, currentCard + dir));
      cards[currentCard].scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest", inline: "start" });
      updateRail();
    }
    function updateRail() {
      const cards = visibleCards();
      const prog = $("#railProgress"), idx = $("#railIndex");
      $$(".card", rail).forEach(c => c.classList.remove("is-current"));
      if (cards[currentCard]) cards[currentCard].classList.add("is-current");
      if (idx) idx.textContent = `${String(currentCard + 1).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
      if (prog && cards.length) {
        const pct = Math.max(6, 100 / cards.length);
        prog.style.width = pct + "%";
        prog.style.transform = `translateX(${currentCard * 100}%)`;
      }
    }

    filtersEl.innerHTML = FILTERS.map(f => `<button class="filter${f === "ALL" ? " is-active" : ""}" type="button" data-f="${f}">${f}</button>`).join("");
    $$(".filter", filtersEl).forEach(b => b.addEventListener("click", () => { activeFilter = b.dataset.f; applyFilter(); }));

    $("#railPrev")?.addEventListener("click", () => move(-1));
    $("#railNext")?.addEventListener("click", () => move(1));
    rail.addEventListener("scroll", () => {
      const cards = visibleCards(); if (!cards.length) return;
      let best = 0, dist = Infinity;
      cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft - rail.scrollLeft - rail.getBoundingClientRect().left); if (d < dist) { dist = d; best = i; } });
      currentCard = best; updateRail();
    }, { passive: true });

    const modal = $("#caseModal");
    function openCase(i) {
      const c = CASES[i]; if (!c || !modal) return;
      $("#caseMeta").textContent = `TAPE ${String(i + 1).padStart(2, "0")} · ${c.cat} · ${c.status === "building" ? "BUILDING" : "LIVE"}`;
      $("#caseTitle").textContent = T("case" + c.k + ".name", "PROJECT " + c.k);
      $("#caseCopy").innerHTML = T("case" + c.k + ".copy", "");
      const link = $("#caseLink");
      if (c.url) { link.href = c.url; link.hidden = false; }
      else { link.hidden = true; }
      modal.hidden = false;
      $("#caseClose")?.focus();
    }
    function closeCase() { if (modal) modal.hidden = true; }
    $("#caseClose")?.addEventListener("click", closeCase);
    modal?.addEventListener("click", e => { if (e.target === modal) closeCase(); });

    window.__siteCases = { render, move, openCase, closeCase, get filter() { return activeFilter; }, setFilter(f) { activeFilter = f; applyFilter(); } };
    render();
  }

  /* ---------- language modal ---------- */
  function language() {
    const modal = $("#langModal"), grid = $("#langGrid");
    const open = () => { if (!modal) return; if (window.I18N) I18N.renderMenu(grid, close); modal.hidden = false; };
    const close = () => { if (modal) modal.hidden = true; };
    $("#langSwitch")?.addEventListener("click", open);
    $("#langClose")?.addEventListener("click", close);
    modal?.addEventListener("click", e => { if (e.target === modal) close(); });
    if (window.I18N) I18N.onChange(() => { if (grid && window.I18N) I18N.refreshMenu(grid); if (window.__siteCases) window.__siteCases.render(); });
    window.__siteLang = { open, close };
  }

  /* ---------- help overlay ---------- */
  function help() {
    const modal = $("#helpOverlay");
    const open = () => { if (modal) { modal.hidden = false; $("#helpClose")?.focus(); } };
    const close = () => { if (modal) modal.hidden = true; };
    $("#helpClose")?.addEventListener("click", close);
    modal?.addEventListener("click", e => { if (e.target === modal) close(); });
    window.__siteHelp = { open, close };
  }

  /* ---------- command line ---------- */
  function commandLine() {
    const bar = $("#cmdBar"), input = $("#cmd"), out = $("#cmdOut");
    const open = () => { if (!bar) return; bar.hidden = false; input.value = ""; out.textContent = ""; input.focus(); };
    const close = () => { if (bar) bar.hidden = true; };
    const goto = id => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }); };

    const CMDS = {
      help: () => "commands: about · services · cases · tools · process · faq · contact · theme · grid · rain · glitch · langs · lang <code> · clear",
      about: () => { goto("about"); return "opening FILE 02 / MANIFESTO …"; },
      services: () => { goto("services"); return "opening FILE 03 / SYSTEM MODULES …"; },
      service: () => CMDS.services(),
      cases: () => { goto("cases"); return "opening FILE 04 / MISSION ARCHIVE …"; },
      case: () => CMDS.cases(),
      tools: () => { goto("tools"); return "opening FILE 05 / OPEN ARMORY …"; },
      process: () => { goto("process"); return "opening FILE 06 / PROTOCOL …"; },
      faq: () => { goto("faq"); return "opening FILE 07 / FIELD NOTES …"; },
      contact: () => { goto("contact"); return "opening FILE 08 / OPEN CHANNEL …"; },
      theme: () => { setTheme(themeIdx + 1); return `theme → ${themeNames[themeIdx]}`; },
      grid: () => { toggleGrid(); return "CRT grid toggled"; },
      rain: () => { setRain(!rainOn); return `matrix rain → ${rainOn ? "ON" : "OFF"}`; },
      glitch: () => { glitch(); return "signal corrupted (temporarily)"; },
      langs: () => (window.I18N ? I18N.SUPPORTED.join(" · ") : "i18n unavailable"),
      lang: arg => {
        if (!window.I18N) return "i18n unavailable";
        if (!arg) return `lang → ${I18N.lang} · try: lang ja`;
        const hit = I18N.SUPPORTED.find(l => l.toLowerCase() === arg || l.split("-")[0].toLowerCase() === arg);
        if (!hit) return "unsupported language — type: langs";
        I18N.set(hit); return `language → ${hit}`;
      },
      filter: arg => {
        if (!window.__siteCases) return "archive unavailable";
        const f = (arg || "ALL").toUpperCase();
        if (!FILTERS.includes(f)) return `filters: ${FILTERS.join(" · ")}`;
        window.__siteCases.setFilter(f); goto("cases"); return `archive filter → ${f}`;
      },
      "sudo hire-me": () => { goto("contact"); return "permission GRANTED · opening transmission channel …"; },
      clear: () => { out.textContent = ""; return ""; },
      ls: () => "about  services  cases  tools  process  faq  contact",
    };

    function run(raw) {
      const q = raw.trim().toLowerCase(); if (!q) return;
      let fn = CMDS[q], arg = "";
      if (!fn) {
        const parts = q.split(/\s+/);
        fn = CMDS[parts[0]]; arg = parts.slice(1).join(" ");
      }
      out.textContent = fn ? (fn(arg) || "ok") : `command not found: ${q} — type "help"`;
    }

    input?.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); run(input.value); }
      if (e.key === "Escape") { e.preventDefault(); close(); }
      if (e.key === "Tab") {
        const p = input.value.trim().toLowerCase();
        const hit = Object.keys(CMDS).find(k => k.startsWith(p) && p);
        if (hit) { e.preventDefault(); input.value = hit; }
      }
    });
    window.__siteCmd = { open, close, run, get open_() { return !bar.hidden; } };
  }

  /* ---------- glitch ---------- */
  function glitch() {
    const el = $("#heroTitle");
    if (!el || reduced) return;
    el.classList.add("is-glitching");
    setTimeout(() => el.classList.remove("is-glitching"), 600);
  }

  /* ---------- contact form: static mailto, no backend ---------- */
  function contact() {
    const form = $("#contactForm");
    if (!form) return;
    form.addEventListener("submit", e => {
      e.preventDefault();
      const name = $("#f-name").value.trim() || "—";
      const email = $("#f-mail").value.trim();
      const msg = $("#f-msg").value.trim();
      const subject = `Store architecture consult — ${name}`;
      const body = `NAME: ${name}\nEMAIL: ${email}\n\n${msg}\n\n— sent from logansolaman.com`;
      const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const btn = $("#submitBtn"), note = $("#formNote");
      btn.textContent = T("v2.contact.opened", "✓ MAIL CLIENT OPENED");
      btn.disabled = true;
      if (note) note.textContent = "YOUR MAIL CLIENT HAS THE DRAFT — SEND IT TO COMPLETE. NOTHING WAS STORED ON THIS SITE.";
      window.location.href = href;
      setTimeout(() => { btn.textContent = T("contact.submit", "TRANSMIT ▸"); btn.disabled = false; }, 6000);
    });
  }

  /* ---------- global keyboard protocol ---------- */
  function keyboard() {
    const konami = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
    let kp = 0;
    addEventListener("keydown", e => {
      const inField = e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
      const cmdOpen = $("#cmdBar") && !$("#cmdBar").hidden;

      if (e.key === konami[kp]) kp++; else kp = e.key === konami[0] ? 1 : 0;
      if (kp === konami.length) { kp = 0; setTheme(themeIdx + 1); setRain(true); glitch(); }

      if (e.key === "Escape") {
        window.__siteHelp?.close(); window.__siteLang?.close(); window.__siteCmd?.close();
        if ($("#caseModal")) $("#caseModal").hidden = true;
        if (inField) e.target.blur();
        return;
      }
      if (inField || cmdOpen) return;
      if (e.key === "?") { e.preventDefault(); window.__siteHelp?.open(); return; }
      if (e.key === "/") { e.preventDefault(); window.__siteCmd?.open(); return; }
      if (/^[1-7]$/.test(e.key)) { document.getElementById(SECTIONS[parseInt(e.key, 10) - 1])?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }); return; }
      const k = e.key.toLowerCase();
      if (k === "[") setTheme(themeIdx - 1);
      if (k === "]") setTheme(themeIdx + 1);
      if (k === "g") toggleGrid();
      if (k === "m") setRain(!rainOn);
      if (k === "t") glitch();
      if (k === "l") window.__siteLang?.open();
      const casesInView = (() => { const r = document.getElementById("cases")?.getBoundingClientRect(); return r && r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.4; })();
      if (casesInView && e.key === "ArrowRight") { e.preventDefault(); window.__siteCases?.move(1); }
      if (casesInView && e.key === "ArrowLeft") { e.preventDefault(); window.__siteCases?.move(-1); }
      if (casesInView && e.key === "Enter") { e.preventDefault(); window.__siteCases?.openCase(0); }
    });
  }

  /* ---------- start ---------- */
  function start() {
    document.documentElement.classList.add("js-reveal");
    boot(); clock(); nav(); reveals(); counters();
    setTheme(0); setRain(true);
    cases(); language(); help(); commandLine(); contact(); keyboard();
    if (window.I18N && window.__siteCases) window.__siteCases.render();
    document.documentElement.dataset.ready = "1";
  }

  if (window.I18N && I18N.ready) I18N.ready().then(start).catch(start);
  else start();
})();
