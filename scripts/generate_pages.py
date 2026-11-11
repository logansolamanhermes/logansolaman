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


def head(title, desc, canonical, extra_head=""):
    return f'''<!DOCTYPE html>
<html lang="en" data-theme="matrix">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}" />
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
  <nav class="detail__crumbs" aria-label="Breadcrumb"><a href="/">HOME</a> <span>/</span> <a href="/#cases">ARCHIVE</a> <span>/</span> <strong>{html.escape(crumb)}</strong></nav>
  <a class="detail__cta" href="/#contact">START A CONSULT ▸</a>
</header>'''


def footer():
    return '''<footer class="detail__footer">
  <p>// LOGAN SOLAMAN — THE STORE ARCHITECT · HONG KONG · EST. 2016</p>
  <nav><a href="/">HOME</a> · <a href="/#services">SERVICES</a> · <a href="/#cases">ARCHIVE</a> · <a href="/#faq">FAQ</a> · <a href="/#contact">CONTACT</a></nav>
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
        shot_label = "REAL STOREFRONT"
    elif k == 15:
        shot_label = "INTERNAL SYSTEM — NO PUBLIC SCREENSHOT"
    else:
        shot_label = "NOT YET LAUNCHED — PLACEHOLDER, NOT A REAL SCREENSHOT"

    if c["url"] and os.path.exists(os.path.join(ROOT, f"assets/cases/{slug}.webp")):
        imgs = f'''<figure class="shot shot--desktop">
        <img src="/assets/cases/{slug}.webp" srcset="/assets/cases/{slug}-400.webp 400w, /assets/cases/{slug}.webp 800w"
             sizes="(max-width: 800px) 92vw, 800px" width="800" height="600" loading="eager" decoding="async"
             alt="Desktop screenshot of the {html.escape(name)} storefront homepage" />
        <figcaption>DESKTOP · HOMEPAGE</figcaption>
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
        <figcaption>{shot_label}</figcaption>
      </figure>'''

    if os.path.exists(os.path.join(ROOT, f"assets/cases/{slug}-mobile.webp")):
        imgs += f'''
      <figure class="shot shot--mobile">
        <img src="/assets/cases/{slug}-mobile.webp" width="260" height="520" loading="lazy" decoding="async"
             alt="Mobile screenshot of the {html.escape(name)} storefront homepage" />
        <figcaption>MOBILE · 390PX</figcaption>
      </figure>'''

    live = (f'<a class="detail__btn" href="{html.escape(c["url"])}" target="_blank" rel="noopener">VISIT LIVE SITE ↗</a>'
            if c["url"] else '<span class="detail__status">SYSTEM UNDER CONSTRUCTION</span>')

    tags = "".join(f'<span class="tag">{html.escape(t)}</span>' for t in [c["cat"], c["city"]] + c["stack"])
    prev_k = ((k - 2) % 17) + 1
    next_k = (k % 17) + 1

    ld = {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": name,
        "description": plain,
        "author": {"@type": "Person", "name": "Logan Solaman"},
        "about": c["stack"],
        "url": canonical,
        "image": f"https://logansolaman.com/assets/cases/{slug}.webp",
    }
    ld_json = json.dumps(ld, ensure_ascii=False, indent=2)

    return head(title, desc, canonical, f'<script type="application/ld+json">\n{ld_json}\n</script>\n') + nav(name) + f'''
<main class="detail__main">
  <p class="eyebrow">// ARCHIVE / TAPE {k:02d} / {html.escape(c["cat"])}</p>
  <h1 class="detail__title">{html.escape(name)}</h1>
  <p class="detail__sub">{html.escape(c["city"])} · {"LIVE" if c["status"] == "live" else "IN PROGRESS"}</p>

  <div class="detail__tags">{tags}</div>

  <div class="detail__body">
    <div class="detail__lead">
      <h2>THE BUILD</h2>
      <p class="prose">{copy}</p>
      <div class="detail__actions">{live}<a class="detail__btn detail__btn--ghost" href="/#contact">DISCUSS A BUILD ▸</a></div>
    </div>
    <div class="detail__facts">
      <dl>
        <dt>CLIENT</dt><dd>{html.escape(name)}</dd>
        <dt>MARKET</dt><dd>{html.escape(c["city"])}</dd>
        <dt>STATUS</dt><dd>{"LIVE" if c["status"] == "live" else "IN PROGRESS"}</dd>
        <dt>STACK</dt><dd>{html.escape(" · ".join(c["stack"]))}</dd>
      </dl>
    </div>
  </div>

  <section class="detail__shots" aria-label="Storefront screenshots">
    <p class="eyebrow">// SCREEN CAPTURE — {shot_label}</p>
    <div class="shots">{imgs}</div>
  </section>

  <nav class="detail__pager" aria-label="Case navigation">
    <a href="/cases/case{prev_k:02d}/">← TAPE {prev_k:02d} · {html.escape(loc[f"case{prev_k}.name"])}</a>
    <a href="/#cases">ALL 17 SYSTEMS</a>
    <a href="/cases/case{next_k:02d}/">TAPE {next_k:02d} · {html.escape(loc[f"case{next_k}.name"])} →</a>
  </nav>
</main>
''' + footer() + "</body></html>\n"


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
    ld = {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": name,
        "description": plain,
        "provider": {"@type": "Person", "name": "Logan Solaman", "url": "https://logansolaman.com/"},
        "areaServed": "Worldwide",
        "url": canonical,
    }
    ld_json = json.dumps(ld, ensure_ascii=False, indent=2)
    others = "".join(f'<a href="/services/{SERVICE_SLUG[m]}/" class="detail__svc{" is-current" if m == n else ""}">M{m} · {html.escape(loc[f"m{m}.name"])}</a>' for m in range(1, 6))
    return head(title, desc, canonical, f'<script type="application/ld+json">\n{ld_json}\n</script>\n') + nav(name) + f'''
<main class="detail__main">
  <p class="eyebrow">// SERVICE / MODULE M{n}</p>
  <h1 class="detail__title">{html.escape(name)}</h1>
  <p class="detail__sub">ONE OF FIVE SYSTEMS · HONG KONG · WORKING GLOBALLY</p>

  <div class="detail__body">
    <div class="detail__lead">
      <h2>WHAT IT IS</h2>
      <p class="prose">{html.escape(body)}</p>
      <h2>HOW IT STARTS</h2>
      <p class="prose">A free first consult to find the real constraint. Then a written blueprint — scope, stack and numbers — before any code is written. <a href="/#faq">Read the FAQ</a> for what happens after launch.</p>
      <div class="detail__actions"><a class="detail__btn" href="/#contact">START A CONSULT ▸</a><a class="detail__btn detail__btn--ghost" href="/#process">SEE THE PROCESS</a></div>
    </div>
    <div class="detail__facts">
      <dl>
        <dt>MODULE</dt><dd>M{n} / 5</dd>
        <dt>FIRST STEP</dt><dd>FREE CONSULT</dd>
        <dt>BEFORE BUILD</dt><dd>WRITTEN BLUEPRINT</dd>
        <dt>REPLY TIME</dt><dd>USUALLY WITHIN ONE DAY</dd>
      </dl>
    </div>
  </div>

  <section class="detail__shots" aria-label="Related systems">
    <p class="eyebrow">// RELATED SYSTEMS IN THE ARCHIVE</p>
    <div class="relcards">{cards}</div>
  </section>

  <nav class="detail__svcnav" aria-label="All services">{others}</nav>
</main>
''' + footer() + "</body></html>\n"


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
