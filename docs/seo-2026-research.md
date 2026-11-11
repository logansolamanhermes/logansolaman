# SEO 2026 — research + applied changes

Audit date: 2026-11-11. Site: https://logansolaman.com/ (static GitHub Pages).
Research question: what are current best practices, and what can this site apply?

## What the official guidance says

The central finding is that there is no separate "AI SEO" playbook. Google states
there are no additional requirements or special optimisations needed to appear
in AI Overviews or AI Mode; a page just has to be indexed and eligible for a
snippet under ordinary Search technical requirements.[1][2] Its May 2026
generative-AI guide says the same and explicitly debunks common "AEO/GEO"
tactics: llms.txt files, chunking content, rewriting for AI, and special
schema.org markup are not needed for Google Search.[2][3] Think with Google
puts it bluntly: "good SEO is good GEO", and llms.txt is not needed for Google
Search.[6]

That guide does not say llms.txt is harmful — Google's June 2026 changelog
clarifies the file neither helps nor hurts visibility and is fine to maintain
for other services.[4] So this site keeps `llms.txt`, but its role is now
documented accurately instead of being described as a ranking mechanism.

The practices that do matter are ordinary ones: crawlable links, important
content in textual form, good page experience, high-quality supporting images,
and structured data that matches visible text.[1][2] Google's own JavaScript
SEO guidance confirms it renders and executes JS with a headless Chromium, but
also recommends server-side/static rendering where possible because it is
faster for users and crawlers alike.[13][14] Google's Search Essentials
adds descriptive titles/headings and placing the words people search for in
prominent locations including alt text and link text.[18] Its helpful-content
guide asks whether the title and main heading give a descriptive summary.[26]

Core Web Vitals still have the same three thresholds — LCP ≤ 2.5 s,
INP ≤ 200 ms, CLS ≤ 0.1 — measured at the 75th percentile, all three stable.[8][9]
No 2026 tightening happened.

Two structured-data findings changed what this site ships. First, Google
retired FAQ rich results entirely: the 2023 change limited them to authoritative
government and health sites, and the May 2026 changelog removed the feature,
with documentation removed in June 2026.[10][4][11] Google's 2023 post says
unused structured data causes no problems but has no visible effect.[10]
Second, Google's general structured-data guidelines require markup to describe
content that is actually visible on that page — not hidden or off-page
content.[15] BreadcrumbList is still a supported, documented type.[23]

Sitemap behaviour: Google ignores `<priority>` and `<changefreq>`, and uses
`<lastmod>` only when consistently verifiable against real page changes.[12]
Sitemaps can also carry image entries.[25]

robots.txt is a crawl-access mechanism, not an indexing control, and its rules
are not enforced on all crawlers.[22] Content-Signal is a preference declaration
for search / ai-input / ai-train, not an access control; not all automated
systems honour it.[19][20] Google-Extended is a standalone product token with
no separate HTTP crawler, controlling Gemini training and grounding only —
it does not affect Search inclusion or ranking.[21]

International guidance: hreflang is for pages that exist as separate,
fully-qualified URLs, with every variant listing itself and all others.[17]
This site's ten languages are switched client-side on one URL via `?lang=` and
`history.replaceState`, with a single canonical pointing at the English URL.
There are no separate localised URLs, so hreflang does not apply. The practical
consequence: the translations are not independently indexable. Fixing that
would require real per-language URLs and server-rendered translated content —
a build change, not a metadata tweak.

## Audit findings on this site

- 26 pages, all with unique titles/descriptions; `/tools/` and the legacy
  itinerary page lacked canonicals; `404.html` lacked `noindex`.
- Home page shipped only 2,993 characters of static visible text. 26 i18n
  elements were empty until JavaScript ran, and the 17 case cards were
  `<article>` elements with click handlers — zero crawlable links to the 22
  static detail pages.
- `FAQPage` JSON-LD was emitted even though the rich result no longer exists.
- A `WebApplication` node describing `/tools/` sat on the home page, where
  that content is not visible.[15]
- `sitemap.xml` used a single `2026-11-11` `<lastmod>` for every URL plus
  ignored `priority`/`changefreq`; the itinerary page actually changed on
  2026-11-09.
- `robots.txt` listed 14 decorative user-agent groups under one policy;
  RFC 9309 makes a crawler obey exactly one group, so this added no meaning.
- All 17 case screenshots had descriptive alt text; none were missing.[16]

## What was applied

1. **Static, crawlable content.** Filled all 26 empty i18n elements with their
   English values in the raw HTML (i18n.js still overwrites on locale change).
   Static visible text went from 2,993 → 6,563 characters.
2. **Real links.** Case cards now contain `<a href="/cases/caseNN/">` elements
   instead of JS click handlers; keyboard and click behaviour preserved.
   Added a `<noscript>` index of all 17 cases + 5 services, and a `<noscript>`
   list of all 50 tool names on `/tools/`.
3. **Structured data hygiene.** Removed `FAQPage` (the 12 visible FAQ answers
   remain). Moved `WebApplication` from home to `/tools/` where it belongs.
   Added `BreadcrumbList` JSON-LD to all 22 generated detail pages, matching
   their visible breadcrumb nav. All JSON-LD parses cleanly.
4. **Canonicals and indexing directives.** Added canonical + OG/Twitter to
   `/tools/`, `noindex, nofollow` + description to `404.html`, and a canonical
   to the itinerary page.
5. **Sitemap.** Removed `priority`/`changefreq`, derived `<lastmod>` per URL
   from git history (2026-11-09 for the itinerary, 2026-11-11 for the rest),
   and added 33 `<image:image>` entries for the real case screenshots.[12][25]
6. **robots.txt.** Reduced to `User-agent: *` plus a dedicated
   `Google-Extended` group, documented the Content-Signal semantics, and kept
   all assets crawlable (blocking `/assets/js/` would hide the rendered
   page).[1][21][22]
7. **Performance hygiene.** Added `defer` to the three scripts (order and DOM
   readiness preserved), keeping the WebGL2 boot and i18n intact. Payload is
   ~168 KB of HTML+CSS+JS+two fonts, TTFB ~69 ms.
8. **Docs corrected.** README and `llms.txt` no longer claim FAQ schema is
   published or that llms.txt helps Google ranking.

## Not applied, and why

- **Response headers (cache semantics, CSP, X-Frame-Options, nosniff).**
  GitHub Pages cannot set them; DNS is `proxied=false` so Cloudflare never sees
  the response. Live headers confirm `server: GitHub.com` with only HSTS.
  Fixing this requires a hosting migration.
- **hreflang.** No separate localised URLs exist (see above).
- **FAQ rich results.** The feature no longer exists.
- **Testimonials / AggregateRating.** Would require real client quotes; not
  invented.

## Sources

[1] https://developers.google.com/search/docs/appearance/ai-features
[2] https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
[3] https://developers.google.com/search/blog/2026/05/a-new-resource-for-optimizing
[4] https://developers.google.com/search/updates
[6] https://business.google.com/us/think/search-and-video/ai-search-era-brand-authority-strategy
[8] https://web.dev/articles/vitals
[9] https://developers.google.com/search/docs/appearance/core-web-vitals
[10] https://developers.google.com/search/blog/2023/08/howto-faq-changes
[11] https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429
[12] https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
[13] https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
[14] https://developers.google.com/search/docs/crawling-indexing/javascript/fix-search-javascript
[15] https://developers.google.com/search/docs/appearance/structured-data/sd-policies
[16] https://developers.google.com/search/docs/appearance/google-images
[17] https://developers.google.com/search/docs/specialty/international/localized-versions
[18] https://developers.google.com/search/docs/essentials
[19] https://contentsignals.org
[20] https://seohandbook.co.uk/ai-search/agent-readiness
[21] https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers
[22] https://developers.google.com/search/docs/crawling-indexing/robots/intro
[23] https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
[25] https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
[26] https://developers.google.com/search/docs/fundamentals/creating-helpful-content
