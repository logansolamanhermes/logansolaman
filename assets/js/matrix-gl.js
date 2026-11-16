/* ============================================================
   matrix-gl.js — matrix rain as ONE WebGL2 draw call with REAL TEXT.
   Glyphs come from a 64-cell atlas baked at runtime from an embedded
   katakana font (assets/fonts/matrix-kana.ttf), so characters are
   crisp and readable instead of procedural pixel blocks.

   No Three.js, no build step, no CDN. No geometric wave distortion —
   pointer proximity changes brightness only; columns fall straight.
   Exposes window.MatrixGL for the site's keyboard protocol.
   ============================================================ */
(() => {
  "use strict";
  const canvas = document.getElementById("matrix-gl");
  if (!canvas) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const PALETTES = [
    { name: "MATRIX", color: [0.20, 1.00, 0.24] },
    { name: "SYNTH",  color: [1.00, 0.36, 0.94] },
    { name: "VAPOR",  color: [0.36, 0.94, 1.00] },
  ];

  // exact glyph set from the original site's canvas rain
  const KANA = "ｱｧｶｻﾀﾅﾊﾏﾔｬﾗﾜｶﾞｻﾞﾀﾞﾊﾞﾊﾟｲｨｷｼﾁﾆﾋﾐﾘｳｩｸｽﾂﾇﾌﾑﾕｭﾙｴｪｹｾﾃﾈﾍﾒﾚｵｫｺｿﾄﾉﾎﾓﾖｮﾛｦ0123456789LOGANSHOPIFY";
  const ASCII = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz+-*/=<>:.;#%&@!?";
  const ATLAS_N = 8;                    // 8 x 8 = 64 cells
  const ATLAS_CELL = 64;               // px per glyph cell

  /* ---------- bake a glyph atlas into an offscreen 2D canvas ---------- */
  function buildAtlas(chars, font) {
    const size = ATLAS_N * ATLAS_CELL;
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    const c = cv.getContext("2d");
    c.fillStyle = "#000"; c.fillRect(0, 0, size, size);
    c.fillStyle = "#fff";
    c.font = font;
    c.textAlign = "center";
    c.textBaseline = "middle";
    for (let i = 0; i < ATLAS_N * ATLAS_N; i++) {
      const ch = chars[i % chars.length];
      const x = (i % ATLAS_N) * ATLAS_CELL + ATLAS_CELL / 2;
      const y = Math.floor(i / ATLAS_N) * ATLAS_CELL + ATLAS_CELL / 2 + 2;
      c.fillText(ch, x, y);
    }
    return cv;
  }

  let gl = null;
  try { gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "low-power" }); } catch (e) {}

  /* ---------- 2D fallback for browsers without WebGL2 ---------- */
  if (!gl) {
    const ctx = canvas.getContext("2d");
    if (!ctx) { canvas.style.display = "none"; return; }
    let cols = [], active = true, tint = "#b6ff3c";
    const resize2d = () => {
      canvas.width = innerWidth; canvas.height = innerHeight;
      cols = Array.from({ length: Math.floor(innerWidth / 16) }, () => Math.random() * -60);
    };
    resize2d(); addEventListener("resize", resize2d);
    const draw = () => {
      ctx.fillStyle = "rgba(5,7,5,.09)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = tint; ctx.font = '16px "MatrixKana", monospace';
      cols.forEach((y, i) => {
        ctx.fillText(KANA.charAt(Math.floor(Math.random() * KANA.length)), i * 16, y * 16);
        cols[i] = y > canvas.height / 16 + Math.random() * 40 ? 0 : y + 1;
      });
      if (active && !reduced && !document.hidden) requestAnimationFrame(draw);
    };
    draw();
    window.MatrixGL = { mode: "2d-fallback", atlas: "kana", themes: PALETTES.map(p => p.name), setTheme(i) { tint = ["#b6ff3c", "#ff5cf0", "#5cf0ff"][i]; }, setDensity(v) { active = v > 0; if (active) draw(); }, get on() { return active; } };
    return;
  }

  const VERT = `#version 300 es
  void main(){
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }`;

  const FRAG = `#version 300 es
  precision highp float;
  uniform vec2  u_res;
  uniform float u_time;
  uniform vec2  u_pointer;
  uniform float u_scroll;
  uniform float u_density;
  uniform float u_cell;
  uniform vec3  u_color;
  uniform sampler2D u_atlas;
  out vec4 outColor;

  float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
  float hash21(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }

  void main(){
    vec2 frag = gl_FragCoord.xy;
    vec2 uv = frag / u_res;
    float cell = u_cell;

    // top-down coordinate keeps glyphs upright after UNPACK_FLIP_Y
    float topY = u_res.y - frag.y;
    float col = floor(frag.x / cell);
    float row = floor(topY / cell);
    vec2 cellUV = vec2(fract(frag.x / cell), fract(topY / cell));

    float seed  = hash11(col * 7.13);
    float speed = mix(5.0, 16.0, seed) + u_scroll * 10.0;
    float head  = u_time * speed + seed * 900.0;
    float pos   = mod(head - row, 46.0 + seed * 30.0);
    float tail  = exp(-pos * 0.075);
    float lit   = step(0.45, hash21(vec2(col, floor(head - row))));

    // sample a REAL glyph from the atlas; glyphs change as the stream advances
    float gi = floor(hash21(vec2(col * 3.17 + floor(head * 0.22), row * 7.71 + 1.0)) * 64.0);
    vec2 acell = vec2(mod(gi, 8.0), floor(gi / 8.0));
    vec2 guv = (acell + mix(vec2(0.06), vec2(0.94), cellUV)) / 8.0;
    float ch = texture(u_atlas, guv).r;

    float lead = 1.0 - smoothstep(0.0, 1.6, pos);  // bright leading character
    float rain = ch * tail * lit * u_density;

    // pointer proximity brightens only — no geometric wave
    vec2 d = (uv - u_pointer) * vec2(u_res.x / u_res.y, 1.0);
    float ripple = exp(-dot(d, d) * 9.0);

    // calm the middle so big headlines stay readable
    float focus = 1.0 - 0.50 * exp(-pow((uv.x - 0.5) * 2.1, 2.0) - pow((uv.y - 0.48) * 2.6, 2.0));
    float vignette = smoothstep(1.15, 0.25, length((uv - 0.5) * vec2(1.25, 1.0)));
    float value = rain * focus * vignette * (0.95 + ripple * 0.8);

    vec3 c = u_color * value;
    c += u_color * 0.03 * vignette;
    c += u_color * pow(max(value, 0.0), 3.0) * 0.55;
    // near-white head glyph, the classic Matrix signature
    c += mix(u_color, vec3(1.0), 0.82) * ch * lead * focus * vignette * u_density * 0.95;
    outColor = vec4(c, 1.0);
  }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const U = {};
  ["u_res", "u_time", "u_pointer", "u_scroll", "u_density", "u_cell", "u_color", "u_atlas"].forEach(n => U[n] = gl.getUniformLocation(prog, n));
  gl.bindVertexArray(gl.createVertexArray());

  /* ---------- atlas texture ---------- */
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.u_atlas, 0);
  // No flip: canvas TOP row maps to texture v=0, so a screen cell's visual
  // top (topY fraction 0) samples the top of the glyph. Verified empirically.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  let atlasMode = "ascii";
  function upload(cv, mode) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    atlasMode = mode;
    if (window.MatrixGL) window.MatrixGL.atlas = mode;
  }
  // immediate ASCII atlas so the backdrop is never blank; upgrade to katakana
  // once the embedded font has loaded.
  upload(buildAtlas(ASCII, 'bold 44px monospace'), "ascii");
  if (document.fonts && document.fonts.load) {
    document.fonts.load('700 44px "MatrixKana"').then(() => {
      if (document.fonts.check('700 44px "MatrixKana"')) {
        upload(buildAtlas(KANA, '700 44px "MatrixKana", monospace'), "kana");
      }
    }).catch(() => {});
  }

  let themeIdx = 0, density = 1, scrollVel = 0, pointer = [0.5, 0.5];
  let color = PALETTES[0].color, cellPx = 16;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.floor(innerWidth * dpr), h = Math.floor(innerHeight * dpr);
    cellPx = 16 * dpr;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  addEventListener("resize", resize, { passive: true }); resize();
  addEventListener("pointermove", e => { pointer = [e.clientX / innerWidth, 1 - e.clientY / innerHeight]; }, { passive: true });

  let lastY = scrollY, lastT = performance.now();
  addEventListener("scroll", () => {
    const now = performance.now(), dy = scrollY - lastY;
    scrollVel = Math.min(Math.abs(dy) / Math.max(now - lastT, 16) * 0.06, 1.4);
    lastY = scrollY; lastT = now;
  }, { passive: true });

  const t0 = performance.now();
  function frame(now) {
    scrollVel *= 0.92;
    gl.uniform2f(U.u_res, canvas.width, canvas.height);
    gl.uniform1f(U.u_time, reduced ? 0 : (now - t0) / 1000);
    gl.uniform2f(U.u_pointer, pointer[0], pointer[1]);
    gl.uniform1f(U.u_scroll, scrollVel);
    gl.uniform1f(U.u_density, density);
    gl.uniform1f(U.u_cell, cellPx);
    gl.uniform3fv(U.u_color, color);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduced && !document.hidden) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !reduced) requestAnimationFrame(frame); });

  window.MatrixGL = {
    mode: "webgl2",
    version: gl.getParameter(gl.VERSION),
    atlas: atlasMode,
    glyphs: KANA.length,
    themes: PALETTES.map(p => p.name),
    setTheme(i) { themeIdx = ((i % PALETTES.length) + PALETTES.length) % PALETTES.length; color = PALETTES[themeIdx].color; return PALETTES[themeIdx].name; },
    get themeIndex() { return themeIdx; },
    setDensity(v) { density = Math.max(0, Math.min(1, v)); },
    get on() { return density > 0; },
  };
})();
