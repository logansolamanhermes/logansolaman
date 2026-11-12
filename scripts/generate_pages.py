#!/usr/bin/env python3
"""Generate static case-study and service pages from existing site data.

Sources of truth:
  - assets/js/site.js  -> CASES array (k, cat, status, url, city, stack)
  - locales/en.json    -> caseN.name / caseN.copy, mN.name / mN.body
  - assets/cases/*.webp -> real storefront screenshots

Every generated page is plain static HTML for GitHub Pages. No build step is
required at deploy time; run this script locally after editing the sources.

Never invent client quotes, outcome metrics, pricing or years. Case pages
contain only the name, copy, metadata and screenshots that already exist.
"""
import json, re, os, html
from case_scope import note

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_cases():
    src = open(os.path.join(ROOT, "assets/js/site.js"), encoding="utf-8").read()
    block = src[src.index("const CASES = ["):src.index("const FILTERS =")]
    out = []
    for line in block.splitlines():
        m = re.search(r'\{\s*k:\s*(\d+),\s*cat:\s*"([^"]+)",\s*status:\s*"([^"]+)",\s*url:\s*"([^"]*)",\s*city:\s*"([^"]*)",\s*stack:\s*\[([^\]]*)\]\s*\}', line)
        if m:
            k, cat, status, url, city, stack_raw = m.groups()
            stack = re.findall(r'"([^"]+)"', stack_raw)
            out.append(dict(k=int(k), cat=cat, status=status, url=url, city=city, stack=stack))
    assert len(out) == 17, f"expected 17 cases, parsed {len(out)}"
    return out


def head(title, desc, canonical, extra_head="", title_key="", title_vars="", desc_key="", desc_vars=""):
    return f'''<!DOCTYPE html>
<html lang="en" data-theme="matrix">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title data-meta-i18n="{title_key}" data-meta-vars="{title_vars}">{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}" data-meta-i18n="{desc_key}" data-meta-vars="{desc_vars}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta name="theme-color" content="#050705" />
<meta name="author" content="Logan Solaman" />
<link rel="canonical" href="{canonical}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="LOGAN SOLAMAN" />
<meta property="og:url" content="{canonical}" />
<meta property="og:title" content="{html.escape(title)}" />
<meta property="og:description" content="{html.escape(desc)}" />
<meta property="og:image" content="https://logansolaman.com/og-image.jpg" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
{extra_head}<link rel="stylesheet" href="/assets/css/fonts.css" />
<link rel="stylesheet" href="/assets/css/main.css" />
<link rel="stylesheet" href="/assets/css/detail.css" />
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23050705'/><text x='50' y='70' font-size='58' text-anchor='middle' fill='%23b6ff3c' font-family='monospace'>L_</text></svg>" />
</head>
<body class="detail">'''


def nav(crumb):
    return f'''<header class="detail__hud">
  <a class="detail__brand" href="/">L<span>_</span> <b>LOGAN SOLAMAN</b></a>
  <nav class="detail__crumbs" aria-label="Breadcrumb"><a href="/" data-i18n="detail.home">HOME</a> <span>/</span> <a href="/#cases" data-i18n="detail.archive">ARCHIVE</a> <span>/</span> <strong>{html.escape(crumb)}</strong></nav>
  <button class="detail__lang" id="detailLang" type="button" data-i18n-attr="aria-label:chrome.switch_lang" aria-label="Switch language"><span data-i18n="chrome.lang">LANG:</span> <b id="detailLangName">EN</b></button>
  <a class="detail__cta" href="/#contact" data-i18n="chrome.start_consult">START A CONSULT ▸</a>
  <div class="langmodal" id="detailLangModal" hidden><div class="langmodal__grid" id="detailLangGrid" role="listbox" aria-label="Languages"></div></div>
</header>'''


WEB_SITE_ID = "https://logansolaman.com/#website"
PERSON_ID = "https://logansolaman.com/#person"


def site_stub():
    """Compact WebSite node so every page's graph is self-contained."""
    return {
        "@type": "WebSite",
        "@id": WEB_SITE_ID,
        "url": "https://logansolaman.com/",
        "name": "LOGAN SOLAMAN — The Store Architect",
        "alternateName": "The Store Architect",
        "inLanguage": "en",
    }


def person_stub():
    """Minimal Person identity. Only name + url are visible on every page
    (brand wordmark and footer). Richer claims live on the home page only."""
    return {
        "@type": "Person",
        "@id": PERSON_ID,
        "name": "Logan Solaman",
        "url": "https://logansolaman.com/",
    }


def webpage_ld(canonical, title, desc, about_id, main_id, page_id=None):
    """WebPage connects the site, the person/work, and the breadcrumb."""
    node = {
        "@type": "WebPage",
        "@id": canonical + "#webpage",
        "url": canonical,
        "name": title,
        "description": desc,
        "inLanguage": "en",
        "isPartOf": {"@id": WEB_SITE_ID},
        "about": {"@id": about_id},
        "mainEntity": {"@id": main_id},
        "breadcrumb": {"@id": canonical + "#breadcrumb"},
    }
    return node


def graph_ld(nodes):
    return json.dumps({"@context": "https://schema.org", "@graph": nodes},
                      ensure_ascii=False, indent=2)


def breadcrumb_ld(crumbs, canonical):
    """BreadcrumbList JSON-LD that mirrors the visible .detail__crumbs nav."""
    return {
        "@type": "BreadcrumbList",
        "@id": canonical + "#breadcrumb",
        "itemListElement": [
            {"@type": "ListItem", "position": i, "name": name, "item": url}
            for i, (name, url) in enumerate(crumbs, 1)
        ],
    }


def footer():
    return '''<footer class="detail__footer">
  <p data-i18n="detail.footer">// LOGAN SOLAMAN — THE STORE ARCHITECT · HONG KONG · EST. 2016</p>
  <nav><a href="/" data-i18n="detail.home">HOME</a> · <a href="/#services" data-i18n="detail.services">SERVICES</a> · <a href="/#cases" data-i18n="detail.archive">ARCHIVE</a> · <a href="/#faq" data-i18n="detail.faq">FAQ</a> · <a href="/#contact" data-i18n="detail.contact">CONTACT</a> · <a href="/privacy/" data-i18n="detail.privacy">PRIVACY</a></nav>
</footer>'''


def case_page(c, cases, loc):
    k = c["k"]
    slug = f"case{k:02d}"
    name = loc[f"case{k}.name"]
    copy = loc[f"case{k}.copy"]
    plain = re.sub(r"<[^>]+>", "", copy)
    title = f"{name} — Case Study | Logan Solaman"
    desc = plain[:155].rsplit(" ", 1)[0] + "…"
    canonical = f"https://logansolaman.com/cases/{slug}/"

    if c["url"]:
        shot_label = "REAL STOREFRONT"; shot_key = "real"
    elif k == 15:
        shot_label = "INTERNAL SYSTEM — NO PUBLIC SCREENSHOT"; shot_key = "internal"
    else:
        shot_label = "NOT YET LAUNCHED — PLACEHOLDER, NOT A REAL SCREENSHOT"; shot_key = "placeholder"

    if c["url"] and os.path.exists(os.path.join(ROOT, f"assets/cases/{slug}.webp")):
        imgs = f'''<figure class="shot shot--desktop">
        <img src="/assets/cases/{slug}.webp" srcset="/assets/cases/{slug}-400.webp 400w, /assets/cases/{slug}.webp 800w"
             sizes="(max-width: 800px) 92vw, 800px" width="800" height="600" loading="eager" decoding="async"
             alt="Desktop screenshot of the {html.escape(name)} storefront homepage" />
        <figcaption data-i18n="detail.desktop">DESKTOP · HOMEPAGE</figcaption>
      </figure>'''
    else:
        # Internal system or not-yet-launched build: no screenshot exists, say so.
        imgs = f'''<div class="shot shot--none">
        <span>// NO PUBLIC SCREENSHOT</span>
        <p>{html.escape(name)} is {"an internal system, not a public storefront" if k == 15 else "still under construction"} — there is no live site to capture.</p>
      </div>'''
        if os.path.exists(os.path.join(ROOT, f"assets/cases/{slug}.webp")):
            imgs = f'''<figure class="shot shot--desktop">
        <img src="/assets/cases/{slug}.webp" srcset="/assets/cases/{slug}-400.webp 400w, /assets/cases/{slug}.webp 800w"
             sizes="(max-width: 800px) 92vw, 800px" width="800" height="600" loading="eager" decoding="async"
             alt="Placeholder graphic for {html.escape(name)}, {"an internal system" if k == 15 else "a system still under construction"}" />
        <figcaption data-i18n="detail.figcaption_{shot_key}" data-i18n-vars="label:{shot_label}">{shot_label}</figcaption>
      </figure>'''

    if os.path.exists(os.path.join(ROOT, f"assets/cases/{slug}-mobile.webp")):
        imgs += f'''
      <figure class="shot shot--mobile">
        <img src="/assets/cases/{slug}-mobile.webp" width="260" height="520" loading="lazy" decoding="async"
             alt="Mobile screenshot of the {html.escape(name)} storefront homepage" />
        <figcaption data-i18n="detail.mobile">MOBILE · 390PX</figcaption>
      </figure>'''

    live = (f'<a class="detail__btn" href="{html.escape(c["url"])}" target="_blank" rel="noopener" data-i18n="detail.visit_live">VISIT LIVE SITE ↗</a>'
            if c["url"] else '<span class="detail__status" data-i18n="detail.under_construction">SYSTEM UNDER CONSTRUCTION</span>')

    tags = "".join(f'<span class="tag">{html.escape(t)}</span>' for t in [c["cat"], c["city"]] + c["stack"])
    constraint, _built, evidence = note(k)
    evidence_key = ("detail.ev_internal" if k == 15 else
                    "detail.ev_none" if not c["url"] else "detail.ev_live")
    prev_k = ((k - 2) % 17) + 1
    next_k = (k % 17) + 1

    work_id = canonical + "#work"
    creative = {
        "@type": "CreativeWork",
        "@id": work_id,
        "name": name,
        "description": plain,
        "url": canonical,
        "author": {"@id": PERSON_ID},
        "creator": {"@id": PERSON_ID},
        "keywords": ", ".join([c["cat"], c["city"]] + c["stack"]),
        "image": f"https://logansolaman.com/assets/cases/{slug}.webp",
        "isPartOf": {"@id": WEB_SITE_ID},
    }
    if c["url"]:
        creative["sameAs"] = c["url"]
    bc = breadcrumb_ld([
        ("Home", "https://logansolaman.com/"),
        ("Project archive", "https://logansolaman.com/#cases"),
        (name, canonical),
    ], canonical)
    ld_json = graph_ld([
        site_stub(), person_stub(), creative,
        webpage_ld(canonical, title, desc, PERSON_ID, work_id), bc,
    ])

    return head(title, desc, canonical,
                extra_head=f'<script type="application/ld+json">\n{ld_json}\n</script>\n',
                title_key="meta.case_title", title_vars=f"name:{html.escape(name)}",
                desc_key="meta.case_desc", desc_vars=f"name:{html.escape(name)};city:{html.escape(c['city'])}") + nav(name) + f'''
<main class="detail__main">
  <p class="eyebrow" data-i18n="detail.eyebrow_case" data-i18n-vars="n:{k:02d};cat:{html.escape(c["cat"])}">// ARCHIVE / TAPE {k:02d} / {html.escape(c["cat"])}</p>
  <h1 class="detail__title" data-i18n="case{k}.name">{html.escape(name)}</h1>
  <p class="detail__sub">{html.escape(c["city"])} · <span data-i18n="detail.{'live' if c["status"] == "live" else 'in_progress'}">{"LIVE" if c["status"] == "live" else "IN PROGRESS"}</span></p>

  <div class="detail__tags">{tags}</div>

  <section class="detail__shots detail__shots--lead" aria-label="Storefront screenshots">
    <p class="eyebrow" data-i18n="detail.shot_eyebrow_{shot_key}">// SCREEN CAPTURE — {shot_label}</p>
    <div class="shots">{imgs}</div>
  </section>

  <div class="detail__body">
    <div class="detail__lead">
      <h2 data-i18n="detail.brief">THE BRIEF</h2>
      <p class="prose" data-i18n="case{k}.brief">{html.escape(constraint)}.</p>
      <h2 data-i18n="detail.built">WHAT I BUILT</h2>
      <p class="prose" data-i18n="case{k}.copy" data-i18n-html="case{k}.copy">{copy}</p>
      <h2 data-i18n="detail.verify">WHAT YOU CAN VERIFY</h2>
      <p class="prose" data-i18n="{evidence_key}">{html.escape(evidence)}.</p>
      <p class="prose detail__stackline"><span data-i18n="detail.stack_declared">Stack, as shown in the tags above:</span> {html.escape(" · ".join(c["stack"]))}</p>
      <p class="prose detail__caveat" data-i18n="detail.caveat">No performance or revenue figures are published for this project. If outcome numbers matter to your decision, ask for them in the consult and I will tell you what I can and cannot share.</p>
      <div class="detail__actions">{live}<a class="detail__btn detail__btn--ghost" href="/#contact" data-i18n="detail.discuss">DISCUSS A BUILD ▸</a></div>
    </div>
    <div class="detail__facts">
      <dl>
        <dt data-i18n="detail.client">CLIENT</dt><dd>{html.escape(name)}</dd>
        <dt data-i18n="detail.market">MARKET</dt><dd>{html.escape(c["city"])}</dd>
        <dt data-i18n="detail.status">STATUS</dt><dd data-i18n="detail.{'live' if c["status"] == "live" else 'in_progress'}">{"LIVE" if c["status"] == "live" else "IN PROGRESS"}</dd>
        <dt data-i18n="detail.stack">STACK</dt><dd>{html.escape(" · ".join(c["stack"]))}</dd>
      </dl>
    </div>
  </div>

  <nav class="detail__pager" aria-label="Case navigation">
    <a href="/cases/case{prev_k:02d}/" data-i18n="detail.pager_prev" data-i18n-vars="n:{prev_k:02d};name:{html.escape(loc[f"case{prev_k}.name"])}">← TAPE {prev_k:02d} · {html.escape(loc[f"case{prev_k}.name"])}</a>
    <a href="/#cases" data-i18n="detail.all_systems">ALL 17 SYSTEMS</a>
    <a href="/cases/case{next_k:02d}/" data-i18n="detail.pager_next" data-i18n-vars="n:{next_k:02d};name:{html.escape(loc[f"case{next_k}.name"])}">TAPE {next_k:02d} · {html.escape(loc[f"case{next_k}.name"])} →</a>
  </nav>
</main>
''' + footer() + '<script src="/assets/js/i18n.js" defer></script>\n' + "</body></html>\n"


SERVICE_CASES = {1: [1, 10, 6], 2: [2, 3, 9], 3: [15, 10, 13], 4: [11, 6, 14], 5: [10, 12, 17]}
SERVICE_SLUG = {1: "storefront-engineering", 2: "theme-customization", 3: "app-development", 4: "seo-velocity", 5: "growth-operations"}


def service_page(n, cases, loc):
    name = loc[f"m{n}.name"]
    body = loc[f"m{n}.body"]
    slug = SERVICE_SLUG[n]
    canonical = f"https://logansolaman.com/services/{slug}/"
    plain = re.sub(r"<[^>]+>", "", body)
    title = f"{name} — Service | Logan Solaman"
    desc = plain[:155].rsplit(" ", 1)[0] + "…"
    rel = [c for c in cases if c["k"] in SERVICE_CASES[n]]
    cards = ""
    for c in rel:
        ck = c["k"]
        cards += f'''<a class="relcard" href="/cases/case{ck:02d}/">
          <img src="/assets/cases/case{ck:02d}-400.webp" width="400" height="300" loading="lazy" decoding="async"
               alt="Screenshot of {html.escape(loc[f"case{ck}.name"])}" />
          <span><b>{html.escape(loc[f"case{ck}.name"])}</b><i>{html.escape(c["city"])} · {html.escape(" · ".join(c["stack"][:2]))}</i></span>
        </a>'''
    service_id = canonical + "#service"
    service = {
        "@type": "Service",
        "@id": service_id,
        "name": name,
        "description": plain,
        "provider": {"@id": PERSON_ID},
        "areaServed": "Worldwide",
        "url": canonical,
        "isRelatedTo": [{"@type": "CreativeWork",
                          "@id": f"https://logansolaman.com/cases/case{c['k']:02d}/#work",
                          "name": loc[f"case{c['k']}.name"]} for c in rel],
    }
    bc = breadcrumb_ld([
        ("Home", "https://logansolaman.com/"),
        ("Services", "https://logansolaman.com/#services"),
        (name, canonical),
    ], canonical)
    ld_json = graph_ld([
        site_stub(), person_stub(), service,
        webpage_ld(canonical, title, desc, PERSON_ID, service_id), bc,
    ])
    others = "".join(f'<a href="/services/{SERVICE_SLUG[m]}/" class="detail__svc{" is-current" if m == n else ""}">M{m} · {html.escape(loc[f"m{m}.name"])}</a>' for m in range(1, 6))
    return head(title, desc, canonical,
                extra_head=f'<script type="application/ld+json">\n{ld_json}\n</script>\n',
                title_key="meta.service_title", title_vars=f"name:@m{n}.name",
                desc_key="meta.service_desc", desc_vars=f"name:@m{n}.name") + nav(name) + f'''
<main class="detail__main">
  <p class="eyebrow" data-i18n="detail.service_eyebrow" data-i18n-vars="n:{n}">// SERVICE / MODULE M{n}</p>
  <h1 class="detail__title" data-i18n="m{n}.name">{html.escape(name)}</h1>
  <p class="detail__sub" data-i18n="detail.service_sub">ONE OF FIVE SYSTEMS · HONG KONG · WORKING GLOBALLY</p>

  <div class="detail__body">
    <div class="detail__lead">
      <h2 data-i18n="detail.what_it_is">WHAT IT IS</h2>
      <p class="prose" data-i18n="m{n}.body">{html.escape(body)}</p>
      <h2 data-i18n="detail.how_starts">HOW IT STARTS</h2>
      <p class="prose" data-i18n="service.how_body" data-i18n-html>A free first consult to find the real constraint. Then a written blueprint — scope, stack and numbers — before any code is written. <a href="/#faq">Read the FAQ</a> for what happens after launch.</p>
      <div class="detail__actions"><a class="detail__btn" href="/#contact" data-i18n="chrome.start_consult">START A CONSULT ▸</a><a class="detail__btn detail__btn--ghost" href="/#process" data-i18n="detail.see_process">SEE THE PROCESS</a></div>
    </div>
    <div class="detail__facts">
      <dl>
        <dt data-i18n="detail.module">MODULE</dt><dd>M{n} / 5</dd>
        <dt data-i18n="service.fact_first">FIRST STEP</dt><dd data-i18n="service.fact_first_val">FREE CONSULT</dd>
        <dt data-i18n="service.fact_before">BEFORE BUILD</dt><dd data-i18n="service.fact_before_val">WRITTEN BLUEPRINT</dd>
        <dt data-i18n="service.fact_reply">REPLY TIME</dt><dd data-i18n="service.fact_reply_val">USUALLY WITHIN ONE DAY</dd>
      </dl>
    </div>
  </div>

  <section class="detail__shots" aria-label="Related systems">
    <p class="eyebrow" data-i18n="detail.related">// RELATED SYSTEMS IN THE ARCHIVE</p>
    <div class="relcards">{cards}</div>
  </section>

  <nav class="detail__svcnav" aria-label="All services">{others}</nav>
</main>
''' + footer() + '<script src="/assets/js/i18n.js" defer></script>\n' + "</body></html>\n"


def main():
    cases = load_cases()
    loc = json.load(open(os.path.join(ROOT, "locales/en.json"), encoding="utf-8"))
    made = []
    for c in cases:
        d = os.path.join(ROOT, "cases", f"case{c['k']:02d}")
        os.makedirs(d, exist_ok=True)
        p = os.path.join(d, "index.html")
        open(p, "w", encoding="utf-8").write(case_page(c, cases, loc))
        made.append(p)
    for n in range(1, 6):
        d = os.path.join(ROOT, "services", SERVICE_SLUG[n])
        os.makedirs(d, exist_ok=True)
        p = os.path.join(d, "index.html")
        open(p, "w", encoding="utf-8").write(service_page(n, cases, loc))
        made.append(p)
    print(f"generated {len(made)} pages (17 cases + 5 services)")
    for p in made:
        print(" ", os.path.relpath(p, ROOT))


if __name__ == "__main__":
    main()
