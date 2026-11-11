#!/usr/bin/env python3
"""Headless-Chromium screenshot capture via raw CDP (no browser daemon).

Usage: python3 capture_stores.py <url> <out-desktop.png> <out-mobile.png>

Why: Shopify storefronts lazy-load their hero imagery. A plain --screenshot
after load captures an incomplete page. This script:
  - waits for network idle + fonts.ready
  - resolves data-src / data-srcset only for images near the first viewport
  - scrolls briefly to fire IntersectionObservers, then returns to top
  - re-checks that hero <img> elements have naturalWidth > 0
  - captures desktop, then reloads with a real mobile UA at 390x780
"""
import asyncio, base64, json, os, subprocess, sys, tempfile, time
import websockets

CHROME = "/home/ubuntu/.hermes/tools/chromium-1208/chrome-linux/chrome"
# Some Shopify hero videos ship a solid-black frame-0 poster. Substitute a
# real frame extracted from the same video (scripts/make_video_posters.py).
POSTER_FRAMES = {
    "www.heliumwatches.com": "assets/cases/hero-posters/helium.jpg",
    "127.0.0.1:8891": "assets/cases/hero-posters/masterpest.jpg",
}
POSTER_OVERRIDES = {}
for host, path in POSTER_FRAMES.items():
    full = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), path)
    if os.path.exists(full):
        POSTER_OVERRIDES[host] = "data:image/jpeg;base64," + base64.b64encode(open(full, "rb").read()).decode()
DESKTOP_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

WAKE_TMPL = r"""(() => {
  const override = __OVERRIDE__;
  // Dismiss promotional popups / newsletter interstitials so the storefront
  // itself is visible, not a modal. Common Shopify selectors + generic fallbacks.
  const closeSel = [
    '.popup-modal__close','.newsletter-modal__close','.modal__close','.popup-close',
    '.close-popup','.popup__close','[data-popup-close]','[data-modal-close]',
    '[aria-label="Close"]','[aria-label="close"]','.fancybox-close','.featherlight-close',
    'button.close','.modal-close','#popupClose','.klaviyo-close-form'
  ];
  closeSel.forEach(sel => document.querySelectorAll(sel).forEach(b => {
    try { b.click(); } catch (e) {}
  }));
  document.querySelectorAll('[class*="popup"],[class*="newsletter-modal"],[id*="popup"],[class*="promo-modal"]').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' || cs.position === 'absolute') {
      const r = el.getBoundingClientRect();
      if (r.width > innerWidth * 0.3 && r.height > innerHeight * 0.3) el.style.display = 'none';
    }
  });
  document.querySelectorAll('[class*="overlay"],[class*="backdrop"],[id*="overlay"]').forEach(el => {
    const cs = getComputedStyle(el);
    if ((cs.position === 'fixed' || cs.position === 'absolute') && parseFloat(cs.zIndex || 0) > 10) {
      const r = el.getBoundingClientRect();
      if (r.width > innerWidth * 0.5 && r.height > innerHeight * 0.5) el.style.display = 'none';
    }
  });
  try { document.body.style.overflow = 'auto'; } catch (e) {}
  const lim = innerHeight * 1.7;
  document.querySelectorAll('img,source').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top > lim || r.bottom < -250) return;
    try { el.loading = 'eager'; } catch (e) {}
    for (const a of ['data-src','data-lazy-src','data-original','data-url','data-image','data-srcset','data-lazy-srcset','data-original-set']) {
      const v = el.getAttribute(a);
      if (v && v.length > 3 && !v.startsWith('data:image/svg')) {
        if (a.includes('set')) { if (!el.getAttribute('srcset')) el.setAttribute('srcset', v); }
        else if (!el.getAttribute('src') || el.getAttribute('src').startsWith('data:')) el.setAttribute('src', v);
      }
    }
  });
  document.querySelectorAll('[data-bg],[data-background-image],[data-bgset]').forEach(el => {
    const v = el.getAttribute('data-bg') || el.getAttribute('data-background-image') || el.getAttribute('data-bgset');
    if (v) el.style.backgroundImage = 'url("' + v.split(',')[0].trim().split(' ')[0] + '")';
  });
  // Shopify hero videos: paint the poster as a background on the video's own
  // container so a paused <video> cannot render as a black rectangle.
  if (!document.querySelector('[data-cap-poster]')) document.querySelectorAll('video').forEach(v => {
    let p = v.getAttribute('poster');
    if (p && p.startsWith('//')) p = location.protocol + p;
    // Apply even when the site ships <video> with no poster at all.
    p = override || p;
    if (!p) return;
    try { v.pause(); } catch (e) {}
    const r = v.getBoundingClientRect();
    if (r.width < 100 || r.height < 100) return;
    const host = v.parentElement || v;
    host.style.backgroundImage = 'url("' + p + '")';
    host.style.backgroundSize = 'cover';
    host.style.backgroundPosition = 'center';
    host.style.backgroundRepeat = 'no-repeat';
    v.style.opacity = '0';
    const flag = document.createElement('span');
    flag.setAttribute('data-cap-poster', '1');
    flag.style.display = 'none';
    document.documentElement.appendChild(flag);
  });
})()"""

HERO_STAT = r"""(() => {
  const v = [...document.images].filter(i => {
    const r = i.getBoundingClientRect();
    return r.top < innerHeight * 1.7 && r.width > 60;
  });
  return { hero: v.length, loaded: v.filter(i => i.complete && i.naturalWidth > 0).length,
           fonts: document.fonts.status, ready: document.readyState };
})()"""


class CDP:
    def __init__(self, ws):
        self.ws = ws
        self.i = 0

    async def call(self, method, **params):
        self.i += 1
        mid = self.i
        await self.ws.send(json.dumps({"id": mid, "method": method, "params": params}))
        while True:
            msg = json.loads(await asyncio.wait_for(self.ws.recv(), timeout=60))
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})

    async def eval(self, expr):
        r = await self.call("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
        return r.get("result", {}).get("value")


async def capture(url, out_d, out_m):
    port = 9222 + (os.getpid() % 1000)
    profile = tempfile.mkdtemp(prefix="lscap_")
    proc = subprocess.Popen([
        CHROME, "--headless=new", "--no-sandbox", "--disable-gpu",
        "--hide-scrollbars", "--disable-dev-shm-usage",
        f"--remote-debugging-port={port}", f"--user-data-dir={profile}",
        "--window-size=1200,900", f"--user-agent={DESKTOP_UA}",
        "--no-first-run", "--no-default-browser-check", "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        # wait for CDP endpoint
        import urllib.request
        for _ in range(60):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=2))
                ws_url = next(t["webSocketDebuggerUrl"] for t in tabs if t["type"] == "page")
                break
            except Exception:
                await asyncio.sleep(0.5)
        else:
            raise RuntimeError("CDP endpoint never came up")

        async with websockets.connect(ws_url, max_size=40 * 1024 * 1024, open_timeout=30) as ws:
            c = CDP(ws)
            host = url.split("//", 1)[-1].split("/", 1)[0]
            override = POSTER_OVERRIDES.get(host)
            wake = WAKE_TMPL.replace("__OVERRIDE__", json.dumps(override) if override else "null")
            await c.call("Page.enable")
            await c.call("Runtime.enable")
            await c.call("Network.enable")
            await c.call("Emulation.setDeviceMetricsOverride", width=1200, height=900,
                         deviceScaleFactor=1, mobile=False)

            async def settle(label):
                # Retry transient Chrome error pages (ERR_HTTP2_PROTOCOL_ERROR etc.)
                st = {}
                for attempt in range(3):
                    await c.call("Page.navigate", url=url)
                    for _ in range(40):
                        await asyncio.sleep(0.5)
                        st = await c.eval("({r:document.readyState,f:document.fonts.status,t:document.title})")
                        if st and st.get("r") == "complete" and st.get("f") == "loaded":
                            break
                    err = await c.eval("({u:location.href,b:(document.body?.innerText||'').slice(0,160)})")
                    eu = (err or {}).get("u", "")
                    eb = (err or {}).get("b", "")
                    if not eu.startswith("chrome-error://") and "ERR_" not in eb and "can't be reached" not in eb.lower():
                        break
                    await asyncio.sleep(2)
                await asyncio.sleep(1.5)
                await c.eval(wake)
                await c.eval("window.scrollTo(0, 500)")
                await asyncio.sleep(1.2)
                await c.eval("window.scrollTo(0, 0)")
                await c.eval(wake)
                await asyncio.sleep(2.5)
                stat = await c.eval(HERO_STAT)
                return stat

            st = await settle("desktop")
            shot = await c.call("Page.captureScreenshot", format="png", captureBeyondViewport=False)
            open(out_d, "wb").write(base64.b64decode(shot["data"]))

            # mobile: reload with real mobile UA
            await c.call("Emulation.setUserAgentOverride", userAgent=MOBILE_UA)
            await c.call("Emulation.setDeviceMetricsOverride", width=390, height=780,
                         deviceScaleFactor=1, mobile=True)
            stm = await settle("mobile")
            shot2 = await c.call("Page.captureScreenshot", format="png", captureBeyondViewport=False)
            open(out_m, "wb").write(base64.b64decode(shot2["data"]))
            return st, stm
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=8)
        except Exception:
            proc.kill()


if __name__ == "__main__":
    url, od, om = sys.argv[1], sys.argv[2], sys.argv[3]
    sd, sm = asyncio.run(capture(url, od, om))
    print(json.dumps({"url": url, "desktop": sd, "mobile": sm,
                      "bytes": [os.path.getsize(od), os.path.getsize(om)]}))
