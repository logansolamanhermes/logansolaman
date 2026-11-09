/* ============================================================
   matrix-gl.js — matrix rain as ONE WebGL2 draw call.
   No Three.js, no build step, no CDN. GLSL is an inline template
   string so GitHub Pages serves this file verbatim.
   Uniforms: time, pointer, scroll velocity, palette, density.
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

  let gl = null;
  try { gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "low-power" }); } catch (e) {}

  /* ---------- 2D fallback for browsers without WebGL2 ---------- */
  if (!gl) {
    const ctx = canvas.getContext("2d");
    if (!ctx) { canvas.style.display = "none"; return; }
    let cols = [], active = true, tint = "#b6ff3c";
    const resize2d = () => {
      canvas.width = innerWidth; canvas.height = innerHeight;
      cols = Array.from({ length: Math.floor(innerWidth / 18) }, () => Math.random() * -60);
    };
    resize2d(); addEventListener("resize", resize2d);
    const draw = () => {
      ctx.fillStyle = "rgba(5,7,5,.09)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = tint; ctx.font = "14px monospace";
      cols.forEach((y, i) => { ctx.fillText(String.fromCharCode(0x30a0 + Math.random() * 96), i * 18, y * 18); cols[i] = y > canvas.height / 18 + Math.random() * 40 ? 0 : y + 1; });
      if (active && !reduced && !document.hidden) requestAnimationFrame(draw);
    };
    draw();
    window.MatrixGL = { mode: "2d-fallback", themes: PALETTES.map(p => p.name), setTheme(i) { tint = ["#b6ff3c", "#ff5cf0", "#5cf0ff"][i]; }, setDensity(v) { active = v > 0; if (active) draw(); }, get on() { return active; } };
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
  uniform vec3  u_color;
  out vec4 outColor;

  float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
  float hash21(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }

  // pseudo-glyph: a 5x7 bit cell, hashed so every glyph differs
  float glyph(vec2 uv, float seed){
    vec2 g = floor(uv * vec2(5.0, 7.0));
    if (g.x < 0.0 || g.x > 4.0 || g.y < 0.0 || g.y > 6.0) return 0.0;
    float bit = hash21(g + seed * 31.7);
    float on = step(0.52, bit);
    float gap = step(0.12, fract(uv.x * 5.0)) * step(0.14, fract(uv.y * 7.0));
    return on * gap;
  }

  void main(){
    vec2 frag = gl_FragCoord.xy;
    vec2 uv = frag / u_res;
    float cell = mix(15.0, 11.0, u_density);

    // pointer ripple bends the columns near the cursor
    vec2 d = (uv - u_pointer) * vec2(u_res.x / u_res.y, 1.0);
    float ripple = exp(-dot(d, d) * 9.0);
    frag.x += sin(d.y * 24.0 - u_time * 2.0) * ripple * 7.0;

    float col = floor(frag.x / cell);
    float row = floor(frag.y / cell);
    float seed = hash11(col * 7.13);
    float speed = mix(4.0, 15.0, seed) + u_scroll * 9.0;
    float head = u_time * speed + seed * 900.0;
    float pos = mod(head - row, 46.0 + seed * 30.0);
    float tail = exp(-pos * 0.085);
    float bright = step(0.62, hash21(vec2(col, floor(head - row))));
    float g = glyph(vec2(fract(frag.x / cell), fract(frag.y / cell)), col + floor(head * 0.35));
    float rain = g * tail * bright * u_density;
    rain += step(0.995, hash21(vec2(col, row))) * tail * 0.6;

    // calm the middle of the viewport so big headlines stay readable
    float focus = 1.0 - 0.72 * exp(-pow((uv.x - 0.5) * 2.1, 2.0) - pow((uv.y - 0.48) * 2.6, 2.0));
    float vignette = smoothstep(1.15, 0.25, length((uv - 0.5) * vec2(1.25, 1.0)));
    float value = rain * focus * vignette * (0.55 + ripple * 0.9);

    vec3 c = u_color * value;
    c += u_color * 0.035 * vignette;                  // ambient wash
    c += u_color * pow(max(value, 0.0), 3.0) * 0.7;  // hot glyph bloom
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
  ["u_res", "u_time", "u_pointer", "u_scroll", "u_density", "u_color"].forEach(n => U[n] = gl.getUniformLocation(prog, n));
  gl.bindVertexArray(gl.createVertexArray());

  let themeIdx = 0, density = 0.85, scrollVel = 0, pointer = [0.5, 0.5];
  let color = PALETTES[0].color;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5); // cap DPR — GPU cost on retina
    const w = Math.floor(innerWidth * dpr), h = Math.floor(innerHeight * dpr);
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
    gl.uniform3fv(U.u_color, color);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduced && !document.hidden) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !reduced) requestAnimationFrame(frame); });

  window.MatrixGL = {
    mode: "webgl2",
    version: gl.getParameter(gl.VERSION),
    themes: PALETTES.map(p => p.name),
    setTheme(i) { themeIdx = ((i % PALETTES.length) + PALETTES.length) % PALETTES.length; color = PALETTES[themeIdx].color; return PALETTES[themeIdx].name; },
    get themeIndex() { return themeIdx; },
    setDensity(v) { density = Math.max(0, Math.min(1, v)); },
    get on() { return density > 0; },
  };
})();
