/* ============================================================
   Cloudflare Worker — serves https://logansolaman.com from the public
   GitHub Pages site published at
   https://logansolamanhermes.github.io/logansolaman/

   Why: logansolaman.com is claimed by the older
   logansolaman/logansolaman.github.io Pages site and GitHub will not
   release it to another account without profile-level domain
   verification. Cloudflare terminates TLS with the zone's active
   Universal SSL certificate (logansolaman.com + *.logansolaman.com)
   and proxies to the new repo's Pages URL.

   Behaviour:
   - http -> https (301), www -> apex (301)
   - all other paths get the /logansolaman prefix
   - origin redirects are rewritten back to the public hostname
   - HTML is marked no-cache so a stale build never lingers in a browser
   ============================================================ */
const ORIGIN_HOST = "logansolamanhermes.github.io";
const BASE = "/logansolaman";
const CANON = "https://logansolaman.com";
const CACHE_BUST = "v2"; // bump after a deploy to invalidate any intermediary cache

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.protocol === "http:" || url.hostname === "www.logansolaman.com") {
      return Response.redirect(CANON + url.pathname + url.search, 301);
    }

    let path = url.pathname;
    if (path !== BASE && !path.startsWith(BASE + "/")) {
      path = BASE + path;
    }
    const target = "https://" + ORIGIN_HOST + path + url.search;

    const headers = new Headers(request.headers);
    headers.delete("host"); // let fetch set Host from the target URL

    const init = { method: request.method, headers, redirect: "manual" };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }
    const upstream = await fetch(new Request(target, init));

    const out = new Headers(upstream.headers);
    const ct = (out.get("content-type") || "").toLowerCase();
    if (ct.includes("text/html")) {
      // GitHub Pages sends max-age=600; overriding prevents an old build
      // from sitting in browser/edge caches after a cutover.
      out.set("Cache-Control", "no-cache, no-store, must-revalidate");
      out.delete("etag");
      out.delete("last-modified");
      out.delete("expires");
    }
    out.set("x-site-build", CACHE_BUST);

    const location = upstream.headers.get("Location");
    if (location && upstream.status >= 300 && upstream.status < 400) {
      try {
        const dest = new URL(location, target);
        if (dest.hostname === ORIGIN_HOST) {
          let p = dest.pathname;
          if (p === BASE || p.startsWith(BASE + "/")) p = p.slice(BASE.length) || "/";
          out.set("Location", CANON + p + dest.search);
          return new Response(upstream.body, { status: upstream.status, headers: out });
        }
      } catch (_) { /* keep original Location */ }
    }
    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};
