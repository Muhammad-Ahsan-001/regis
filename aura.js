/* =========================================================
   Aura — a slow, breathing field of ink-light behind the page.
   Raw WebGL (no library): one full-screen quad, domain-warped
   value noise, premultiplied alpha so it composites over the
   page background and stays behind any opaque element.
   ========================================================= */
(() => {
  'use strict';

  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;
  const FRAG = `
    precision highp float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec2 uPointer;     /* 0..1, y up */
    uniform float uIntensity;  /* overall strength */
    uniform float uLight;      /* pointer light strength */
    uniform float uFocus;      /* 0 = whole field, 1 = concentrated halo at uCenter */
    uniform vec2 uCenter;      /* 0..1, y up */
    uniform vec3 uA;           /* dominant */
    uniform vec3 uB;           /* secondary */
    uniform vec3 uC;           /* tertiary */

    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p + 3.7; a *= 0.5; }
      return v;
    }
    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      float aspect = uRes.x / uRes.y;
      vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
      float t = uTime * 0.045;

      vec2 q = vec2(fbm(p * 1.4 + t), fbm(p * 1.4 - t * 0.6 + 3.1));
      vec2 r = vec2(fbm(p * 1.4 + 2.3 * q + vec2(1.7, 9.2) + t * 0.3), fbm(p * 1.4 + 2.3 * q + vec2(8.3, 2.8) - t * 0.2));
      float f = fbm(p * 1.4 + 2.0 * r);

      /* dominant colour carries the field; the second lights the bright filaments; the third only tints the folds */
      float t1 = smoothstep(0.42, 0.9, f);
      vec3 col = mix(uA, uB, t1);
      float t2 = smoothstep(0.62, 1.05, length(q));
      col = mix(col, uC, t2 * 0.55);

      /* the field breathes: brighter filaments where the warp folds */
      float fil = smoothstep(0.3, 0.85, f) * 0.95 + 0.05;
      /* lift saturation so the light reads as colour, not smoke */
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(lum), col, 1.3) * 1.3;

      /* focus: a soft halo around uCenter (welcome screen), else a broad wash biased to the top-right */
      vec2 c = (uCenter - 0.5) * vec2(aspect, 1.0);
      float dc = length(p - c);
      float halo = exp(-dc * dc * 2.6) * 1.25;
      float wash = 0.55 + 0.45 * smoothstep(-0.9, 0.9, p.x + p.y * 0.4);
      float shape = mix(wash, halo, uFocus);

      /* pointer light */
      vec2 pt = (uPointer - 0.5) * vec2(aspect, 1.0);
      float dp = length(p - pt);
      float light = exp(-dp * dp * 7.0) * uLight;

      float a = clamp((fil * shape * 0.85 + light * 0.6) * uIntensity, 0.0, 1.0);
      /* colour above alpha on purpose: premultiplied output that exceeds alpha adds light instead of muddying */
      vec3 outc = col * a * 1.55 + uA * light * 0.3 * uIntensity;
      gl_FragColor = vec4(outc, a * 0.8);
    }
  `;

  function hexToVec(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const lerp = (a, b, t) => a + (b - a) * t;

  function createAura(canvas, opts = {}) {
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) return null;

    const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
    const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return null; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    ['uRes', 'uTime', 'uPointer', 'uIntensity', 'uLight', 'uFocus', 'uCenter', 'uA', 'uB', 'uC'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

    const state = {
      intensity: opts.intensity ?? 0.5, targetIntensity: opts.intensity ?? 0.5,
      light: 0, targetLight: opts.light ?? 0.6,
      focus: opts.focus ?? 0, targetFocus: opts.focus ?? 0,
      center: [0.5, 0.5], targetCenter: [0.5, 0.5],
      pointer: [0.5, 0.5], targetPointer: [0.5, 0.5],
      A: hexToVec(opts.colors?.[0] || '#F2B544'), B: hexToVec(opts.colors?.[1] || '#7FB7A3'), C: hexToVec(opts.colors?.[2] || '#D2664C'),
      tA: null, tB: null, tC: null,
      scale: opts.scale ?? 0.45, running: false, raf: 0, start: performance.now(), timeOffset: 0, paused: false, lastFrame: 0,
    };

    // size is read on resize only, never inside the frame (a layout read per frame would fight the scroll animations)
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr * state.scale));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr * state.scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    }
    resize();
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });

    function frame(now) {
      if (!state.running) return;
      // hold the field to ~45 fps: it is atmosphere, and the saving goes to the page's own animation
      if (now - state.lastFrame < 21) { state.raf = requestAnimationFrame(frame); return; }
      state.lastFrame = now;
      const k = 0.06;
      state.intensity = lerp(state.intensity, state.targetIntensity, k);
      state.light = lerp(state.light, state.targetLight, k);
      state.focus = lerp(state.focus, state.targetFocus, k);
      state.center[0] = lerp(state.center[0], state.targetCenter[0], k);
      state.center[1] = lerp(state.center[1], state.targetCenter[1], k);
      state.pointer[0] = lerp(state.pointer[0], state.targetPointer[0], 0.08);
      state.pointer[1] = lerp(state.pointer[1], state.targetPointer[1], 0.08);
      if (state.tA) { for (let i = 0; i < 3; i++) { state.A[i] = lerp(state.A[i], state.tA[i], 0.03); state.B[i] = lerp(state.B[i], state.tB[i], 0.03); state.C[i] = lerp(state.C[i], state.tC[i], 0.03); } }

      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, (now - state.start) / 1000 + state.timeOffset);
      gl.uniform2f(U.uPointer, state.pointer[0], state.pointer[1]);
      gl.uniform1f(U.uIntensity, state.intensity);
      gl.uniform1f(U.uLight, state.light);
      gl.uniform1f(U.uFocus, state.focus);
      gl.uniform2f(U.uCenter, state.center[0], state.center[1]);
      gl.uniform3fv(U.uA, state.A); gl.uniform3fv(U.uB, state.B); gl.uniform3fv(U.uC, state.C);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      state.raf = requestAnimationFrame(frame);
    }

    const api = {
      start() { if (state.running) return; state.running = true; state.start = performance.now(); state.raf = requestAnimationFrame(frame); },
      stop() { state.running = false; cancelAnimationFrame(state.raf); },
      renderOnce(t = 12) { state.timeOffset = t; resize(); state.lastFrame = 0; state.intensity = state.targetIntensity; state.focus = state.targetFocus; state.light = state.targetLight; state.center = [...state.targetCenter]; if (state.tA) { state.A = [...state.tA]; state.B = [...state.tB]; state.C = [...state.tC]; } const r = state.running; state.running = true; frame(performance.now()); state.running = r; if (!r) cancelAnimationFrame(state.raf); },
      set(partial) {
        if (partial.intensity !== undefined) state.targetIntensity = partial.intensity;
        if (partial.light !== undefined) state.targetLight = partial.light;
        if (partial.focus !== undefined) state.targetFocus = partial.focus;
        if (partial.center) state.targetCenter = partial.center;
        if (partial.colors) { state.tA = hexToVec(partial.colors[0]); state.tB = hexToVec(partial.colors[1]); state.tC = hexToVec(partial.colors[2]); }
        if (partial.scale !== undefined) state.scale = partial.scale;
      },
      pointer(x, y) { state.targetPointer = [x, 1 - y]; },
      get intensity() { return state.intensity; },
      snapColors() { if (state.tA) { state.A = [...state.tA]; state.B = [...state.tB]; state.C = [...state.tC]; } },
    };
    return api;
  }

  window.createAura = createAura;
})();
