# LOGAN SOLAMAN — ZEN × MATRIX

A static, dependency-free portfolio site: ZEN-template design language (big editorial type, one acid-lime accent, an inverted ivory panel, glass surfaces, a liquid-glass project rail) over a WebGL2 matrix-rain backdrop.

**No build step.** Everything is authored HTML/CSS/JS and served verbatim by GitHub Pages. No npm, no bundler, no framework, no server.

## Live

`https://logansolaman.com/`

Repository: `https://github.com/logansolamanhermes/logansolaman` (public).

## Layout

- `index.html` — one page, seven sections: Hero, About, **Service**, **Cases**, Tools, Process, Contact
- `assets/css/main.css` — design tokens, layout, responsive, RTL, reduced-motion
- `assets/js/matrix-gl.js` — matrix rain as one WebGL2 draw call sampling a real katakana glyph atlas, with a 2D canvas fallback
- `assets/fonts/matrix-kana.ttf` — self-hosted 85-character katakana subset for the atlas
- `assets/js/site.js` — keyboard protocol, command line, i18n picker, reveals, cases rail + filters + detail modal, contact form
- `assets/js/i18n.js` — 10-language engine, flat JSON dictionaries in `locales/`
- `locales/*.json` — 10 languages, ~487 keys each
- `tools/` — the 50-tool browser armory (client-side only), sharing `assets/css/main.css` and the same matrix backdrop
- `robots.txt`, `sitemap.xml`, `404.html`

## Design decisions

- **Primary surface: Decide/Learn** — one idea per section, hero-led. **Secondary: Explore** inside Cases (filters + horizontal rail + peek detail). The five service modules are an editorial numbered list inside an inverted panel, not a feature-tile grid.
- **Matrix backdrop stays.** The ZEN template's bright ivory is used only for the Service panel; the rest sits on the dark WebGL2 glyph field. Rain uses real katakana characters baked into a 64-cell atlas from a self-hosted font — no procedural pixel glyphs, no wave distortion. A focus mask dims rain behind headlines so large type stays readable.
- **Type**: Outfit for display, JetBrains Mono for data/labels, VT323 for CRT accents. HUD/nav/filter labels are intentionally English — they are terminal chrome, not prose.
- **Color themes** (`[` / `]`): matrix lime, synth magenta, vapor cyan. A uniform swap in the shader, plus a CSS variable swap.
- **Contact form has no backend.** It builds a `mailto:` link and opens the visitor's mail client — nothing is stored or transmitted by the site. **Change `CONTACT_EMAIL` in `assets/js/site.js`** to the inbox you actually monitor before publishing (currently `hello@logansolaman.com`).

## Keyboard

| Key | Action |
|---|---|
| `1`–`6` | jump to section |
| `/` | command line (`help`, `about`, `cases`, `filter outdoor`, `lang ja`, `theme`, …) |
| `[` `]` | cycle color theme |
| `G` | CRT grid · `M` | matrix rain · `T` | glitch title |
| `L` | language picker · `?` | help · `ESC` | close |
| `←` `→` `ENTER` | browse / open cases while the archive is in view |

## Hosting

**Source:** GitHub Pages on this repo, `main` branch, `/ (root)`. Push to `main` and Pages rebuilds. `.nojekyll` keeps every file served as-is. Pages URL: `https://logansolamanhermes.github.io/logansolaman/`.

**Public domain:** `https://logansolaman.com/` is proxied through Cloudflare to that Pages URL. A Cloudflare Worker (`deploy/worker.js`, script `ls-site-proxy`) owns two routes — `logansolaman.com/*` and `www.logansolaman.com/*` — and prefixes every path with `/logansolaman`, redirects `http → https` and `www → apex`, and rewrites origin redirects back to the public hostname. The four apex A records and the `www` CNAME are proxied (orange cloud); Cloudflare's Universal SSL certificate covers `logansolaman.com` and `*.logansolaman.com`, so TLS is terminated at Cloudflare and `ssl` mode is `strict`.

This route exists because `logansolaman.com` was already claimed as the custom domain of the older `logansolaman/logansolaman.github.io` Pages site, and GitHub will not attach the same domain to a repo owned by another account. The repo stays the single source of truth; the Worker is pure routing. That older repo is untouched.

`.well-known/` (Apple Pay / certificate validation), `BingSiteAuth.xml`, the legacy `.htaccess`/`403.shtml`/`404.shtml`, `project/`, `news-archive/` and the data JSONs are kept so those URLs continue to resolve through the proxy.

## Local preview

```bash
cd logansolaman
python3 -m http.server 8000
# http://localhost:8000/
```
