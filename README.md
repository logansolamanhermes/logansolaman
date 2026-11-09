# LOGAN SOLAMAN — ZEN × MATRIX

A static, dependency-free portfolio site: ZEN-template design language (big editorial type, one acid-lime accent, an inverted ivory panel, glass surfaces, a liquid-glass project rail) over a WebGL2 matrix-rain backdrop.

**No build step.** Everything is authored HTML/CSS/JS and served verbatim by GitHub Pages. No npm, no bundler, no framework, no server.

## Live

`https://logansolamanhermes.github.io/logansolaman/`

Repository: `https://github.com/logansolamanhermes/logansolaman` (public).

## Layout

- `index.html` — one page, seven sections: Hero, About, **Service**, **Cases**, Tools, Process, Contact
- `assets/css/main.css` — design tokens, layout, responsive, RTL, reduced-motion
- `assets/js/matrix-gl.js` — matrix rain as one WebGL2 draw call (inline GLSL), with a 2D canvas fallback
- `assets/js/site.js` — keyboard protocol, command line, i18n picker, reveals, cases rail + filters + detail modal, contact form
- `assets/js/i18n.js` — 10-language engine, flat JSON dictionaries in `locales/`
- `locales/*.json` — 10 languages, ~489 keys each
- `tools/` — the 50-tool browser armory (client-side only)
- `tools/iching/` — I Ching decision tool, 64 hexagrams × 10 languages
- `robots.txt`, `sitemap.xml`, `404.html`

## Design decisions

- **Primary surface: Decide/Learn** — one idea per section, hero-led. **Secondary: Explore** inside Cases (filters + horizontal rail + peek detail). The five service modules are an editorial numbered list inside an inverted panel, not a feature-tile grid.
- **Matrix backdrop stays.** The ZEN template's bright ivory is used only for the Service panel; the rest sits on the dark WebGL2 glyph field. A focus mask in the shader dims rain behind headlines so large type stays readable.
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

GitHub Pages → `main` branch, `/ (root)`. Push to `main` and Pages rebuilds. `.nojekyll` keeps all files served as-is.

## Local preview

```bash
cd logansolaman
python3 -m http.server 8000
# http://localhost:8000/
```
