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

**Fully native GitHub Pages.** This repo (`main` branch, `/ (root)`) is the single source of truth and serves `https://logansolaman.com/` directly. The root `CNAME` file contains `logansolaman.com`; Pages reports `cname: logansolaman.com`, `https_enforced: true`. Push to `main` and Pages rebuilds. `.nojekyll` keeps every file served as-is. The project Pages URL `https://logansolamanhermes.github.io/logansolaman/` also still works.

DNS (Cloudflare, DNS-only / grey cloud): four apex `A` records → GitHub Pages IPs `185.199.108–111.153`, and `www` `CNAME` → `logansolamanhermes.github.io`. GitHub issues and renews the Let's Encrypt certificate for the apex; `http → https` and `www → apex` are handled by GitHub Pages.

`logansolaman/logansolaman.github.io` (the older site's repo) released the custom domain; its Pages `cname` is now `null`. It is otherwise untouched.

A Cloudflare Worker was used temporarily to route the domain before the old repo released it. It has been fully retired — routes deleted, script deleted. No proxy layer remains.

`.well-known/` (Apple Pay / certificate validation), `BingSiteAuth.xml`, the legacy `.htaccess`/`403.shtml`/`404.shtml`, `project/`, `news-archive/` and the data JSONs are kept so those URLs continue to resolve.

## Local preview

```bash
cd logansolaman
python3 -m http.server 8000
# http://localhost:8000/
```
