/* =========================================================
   Welcome — the signature writes itself, light gathers at the
   pen tip, and the aura it forms opens into the page.
   Playback comes from the InkFlow runtime embedded in the
   exported SVG; this file only conducts it.
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const root = document.documentElement;
  const site = window.site || {};
  const welcome = $('#welcome'), scrim = $('#welcomeScrim');
  if (!welcome || !scrim) return;

  const hasGsap = typeof gsap !== 'undefined';
  const pending = root.classList.contains('welcome-pending');

  const pageParts = () => Array.from(document.querySelectorAll('main, .hud, .rail, .footer, .skip'));
  const setInert = (on) => pageParts().forEach((el) => { el.inert = on; });
  const auraCanvasEl = $('#aura');
  const onKey = (e) => { if (e.key === 'Escape') skip(); };
  const bail = () => {
    root.classList.remove('welcome-pending');
    document.body.classList.remove('is-welcome');
    setInert(false);
    document.removeEventListener('keydown', onKey);
    if (auraCanvasEl) auraCanvasEl.classList.remove('is-front');
    if (site.aura) site.aura.set({ focus: 0, light: 0.55, intensity: site.auraBase ? site.auraBase() : 0.5, center: [0.5, 0.5], colors: site.sectionPalette ? site.sectionPalette() : ['#F2B544', '#6FB9A8', '#6C7CE0'] });
    welcome.remove(); scrim.remove();
    if (site.hudSig) site.hudSig.classList.add('is-on');
    if (site.lenis) site.lenis.start();
    if (site.startHeroIntro) site.startHeroIntro();
  };
  if (!pending || !hasGsap || site.reduced) { bail(); return; }

  document.body.classList.add('is-welcome');
  if (site.lenis) site.lenis.stop();
  window.scrollTo(0, 0);

  const stage = $('#welcomeStage'), sigHost = $('#welcomeSig'), ink = $('#welcomeInk');
  const caption = $('#welcomeCaption'), skipBtn = $('#welcomeSkip'), meta = $('#welcomeMeta');
  const auraCanvas = $('#aura');
  const aura = site.aura;
  const accent = getComputedStyle(root).getPropertyValue('--accent').trim();
  const accentRgb = (() => { const h = accent.replace('#', ''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; })();
  let repeat = false;
  try { repeat = sessionStorage.getItem('introSeen') === '1'; } catch (e) { /* ignore */ }

  // split caption words into letters for the reveal
  caption.querySelectorAll('.welcome__word').forEach((w) => {
    const text = w.textContent; w.textContent = '';
    for (const ch of text) { const s = document.createElement('span'); s.textContent = ch; w.appendChild(s); }
  });

  /* ---------- particles at the pen tip ---------- */
  const ctx = ink.getContext('2d');
  const particles = [];
  let dpr = 1;
  function resizeInk() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    ink.width = window.innerWidth * dpr; ink.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeInk();
  window.addEventListener('resize', resizeInk);
  function spawn(x, y, dirX, dirY, n, spread = 1, speed = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (18 + Math.random() * 70) * speed;
      particles.push({
        x: x + (Math.random() - 0.5) * 4 * spread, y: y + (Math.random() - 0.5) * 4 * spread,
        vx: Math.cos(a) * v - dirX * 12, vy: Math.sin(a) * v - 26 - dirY * 12,
        life: 0.5 + Math.random() * 0.9, age: 0, size: 0.8 + Math.random() * 2.2, white: Math.random() < 0.25,
      });
    }
  }
  let lastFrame = performance.now();
  let tipNow = null;
  function drawInk(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000); lastFrame = now;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.globalCompositeOperation = 'lighter';
    if (tipNow) {
      const g = ctx.createRadialGradient(tipNow.x, tipNow.y, 0, tipNow.x, tipNow.y, 54);
      g.addColorStop(0, `rgba(${accentRgb},0.42)`); g.addColorStop(0.4, `rgba(${accentRgb},0.14)`); g.addColorStop(1, `rgba(${accentRgb},0)`);
      ctx.fillStyle = g; ctx.fillRect(tipNow.x - 54, tipNow.y - 54, 108, 108);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt; if (p.age >= p.life) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 12 * dt; p.vx *= 0.985; p.vy *= 0.985;
      const k = 1 - p.age / p.life;
      ctx.fillStyle = p.white ? `rgba(255,248,230,${0.9 * k})` : `rgba(${accentRgb},${0.85 * k})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + 0.4 * k), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- pen-tip tracking from the timing file ---------- */
  let timing = null, svg = null, api = null;
  // the SVG's screen rect is read at most every 8 frames (the stage settles within the first second)
  let rectCache = null, rectAge = 99, vbCache = null;
  function sigRect() {
    if (!rectCache || ++rectAge >= 8) { rectCache = svg.getBoundingClientRect(); rectAge = 0; }
    return rectCache;
  }
  function tipAt(T) {
    if (!timing || !svg) return null;
    for (const s of timing.strokes) {
      if (T < s.startMs || T > s.startMs + s.durationMs) continue;
      const f = (T - s.startMs) / Math.max(1, s.durationMs);
      const pts = s.points; const lastT = pts[pts.length - 1].t || 1;
      const target = f * lastT;
      let lo = 0, hi = pts.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (pts[mid].t < target) lo = mid + 1; else hi = mid; }
      const p = pts[lo], q = pts[Math.max(0, lo - 1)];
      const r = sigRect();
      if (!vbCache) vbCache = (svg.getAttribute('viewBox') || '0 0 1000 420').split(/\s+/).map(Number);
      const vb = vbCache;
      const scale = r.width / vb[2];
      const x = r.left + (p.x - vb[0]) * scale, y = r.top + (p.y - vb[1]) * scale;
      const dx = p.x - q.x, dy = p.y - q.y, len = Math.hypot(dx, dy) || 1;
      return { x, y, dirX: dx / len, dirY: dy / len, pressure: p.pressure };
    }
    return null;
  }

  /* ---------- conducting ---------- */
  let done = false, exiting = false, raf = 0;
  const sigCenterNorm = () => { const r = sigHost.getBoundingClientRect(); return [(r.left + r.width / 2) / window.innerWidth, 1 - (r.top + r.height / 2) / window.innerHeight]; };

  function loop(now) {
    if (exiting) return;
    if (api) {
      const T = api.getTime();
      const tip = tipAt(T);
      tipNow = tip;
      if (tip) {
        spawn(tip.x, tip.y, tip.dirX, tip.dirY, 2 + Math.round(tip.pressure * 3));
        if (aura) aura.set({ center: [tip.x / window.innerWidth, 1 - tip.y / window.innerHeight] });
      }
      if (!done && T >= api.getDuration() - 1) complete();
    }
    drawInk(now);
    raf = requestAnimationFrame(loop);
  }

  function complete() {
    done = true;
    tipNow = null;
    sigHost.classList.add('is-done');
    // the aura settles into a halo around the whole signature, then a burst of light
    const r = sigHost.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < 140; i++) {
      const a = (i / 140) * Math.PI * 2;
      const rad = r.width * (0.18 + Math.random() * 0.34);
      spawn(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.42, -Math.cos(a), -Math.sin(a), 1, 6, 1.6);
    }
    if (aura) aura.set({ center: sigCenterNorm(), intensity: 1.25 * boost, focus: 0.85 });
    gsap.to(caption, { opacity: 1, duration: 0.5 });
    gsap.from(caption.querySelectorAll('span'), { y: 8, opacity: 0, duration: 0.6, stagger: 0.04, ease: 'power3.out' });
    gsap.delayedCall(repeat ? 0.45 : 1.15, () => exit(false));
  }

  function exit(fast) {
    if (exiting) return;
    exiting = true;
    try { sessionStorage.setItem('introSeen', '1'); } catch (e) { /* ignore */ }
    const brand = site.hudSig;
    // land the signature on the header mark
    const b = brand ? brand.getBoundingClientRect() : { left: 24, top: 12, width: 118, height: 50 };
    const s = sigHost.getBoundingClientRect();
    const scale = b.width / s.width;
    const dx = b.left - s.left, dy = b.top + (b.height - s.height * scale) / 2 - s.top;
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    scrim.style.clipPath = `circle(150% at ${cx}px ${cy}px)`;
    if (aura) aura.set({ focus: 0, light: 0.55, intensity: site.auraBase ? site.auraBase() : 0.55, center: [0.5, 0.5], colors: site.sectionPalette ? site.sectionPalette() : ['#F2B544', '#6FB9A8', '#6C7CE0'] });
    const d = fast ? 0.7 : 1.35;
    const tl = gsap.timeline({
      onComplete: () => {
        cancelAnimationFrame(raf);
        root.classList.remove('welcome-pending');
        welcome.remove(); scrim.remove();
        document.body.classList.remove('is-welcome');
        setInert(false);
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', resizeInk);
        if (auraCanvas) auraCanvas.classList.remove('is-front');
        if (brand) brand.classList.add('is-on');
        if (site.lenis) site.lenis.start();
        // hand focus to the page without painting a ring: main takes focus silently, Tab then moves on from there
        const mainEl = $('main');
        if (mainEl && (document.activeElement === document.body || document.activeElement === null)) {
          if (!mainEl.hasAttribute('tabindex')) mainEl.setAttribute('tabindex', '-1');
          mainEl.focus({ preventScroll: true });
        }
      },
    });
    tl.to([caption, meta, skipBtn], { opacity: 0, duration: 0.35 }, 0)
      .to(ink, { opacity: 0, duration: 0.9 }, 0.1)
      .to(sigHost, { x: dx, y: dy, scale, duration: d, ease: 'power3.inOut' }, 0.05)
      .to(scrim, { clipPath: `circle(0% at ${cx}px ${cy}px)`, duration: d + 0.15, ease: 'power3.inOut' }, 0.1)
      .add(() => { if (site.startHeroIntro) site.startHeroIntro(); }, fast ? 0.35 : 0.65)
      .to(sigHost, { opacity: 0, duration: 0.3 }, d - 0.05);
    if (brand) gsap.to(brand, { opacity: 1, duration: 0.3, delay: d - 0.05, onComplete: () => brand.classList.add('is-on') });
  }

  function skip() {
    if (exiting) return;
    if (api && !done) { api.pause(); api.seek(api.getDuration()); done = true; sigHost.classList.add('is-done'); }
    exit(true);
  }
  skipBtn.addEventListener('click', skip);
  document.addEventListener('keydown', onKey);
  // the light theme gets a quieter halo: gold on cream stains instead of glowing
  const lightTheme = (root.dataset.theme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')) === 'light';
  const boost = lightTheme ? 0.4 : 1;

  async function start() {
    setInert(true);
    if (auraCanvas) auraCanvas.classList.add('is-front');
    // gold light with a cream core and teal at the edges: the aura should look lit, not smoky
    if (aura) aura.set({ focus: 1, intensity: 0.15 * boost, light: 0, center: [0.5, 0.5], colors: lightTheme ? ['#E2A93A', '#F3D08A', '#5FAA93'] : ['#F2B544', '#F6DDA6', '#6FB9A8'] });
    gsap.set(stage, { opacity: 0, scale: 0.97 });
    gsap.set([meta, skipBtn], { opacity: 0 });
    try {
      const [loadedSvg, timingRes] = await Promise.all([
        site.loadInkflowSvg ? site.loadInkflowSvg(sigHost) : Promise.reject(new Error('no loader')),
        (async () => { const inline = $('#sigTiming'); if (inline) return JSON.parse(inline.textContent); const r = await fetch(sigHost.dataset.timing); return r.ok ? r.json() : null; })(),
      ]);
      svg = loadedSvg; api = svg && svg.inkflow; timing = timingRes;
      if (!api) throw new Error('InkFlow runtime not available');
    } catch (err) {
      bail(); return;
    }
    if (exiting) return; // the visitor skipped before the signature arrived
    api.pause(); api.seek(0);
    api.setSpeed(repeat ? 2.4 : 1);
    if (aura) aura.set({ intensity: 0.9 * boost, center: sigCenterNorm() });
    gsap.to(stage, { opacity: 1, scale: 1, duration: 1.1, ease: 'power3.out' });
    // focus the dialog itself (no ring); one Tab reaches Skip
    welcome.setAttribute('tabindex', '-1');
    welcome.focus({ preventScroll: true });
    gsap.to([meta, skipBtn], { opacity: 1, duration: 0.8, delay: 0.6 });
    raf = requestAnimationFrame(loop);
    gsap.delayedCall(repeat ? 0.25 : 0.65, () => { if (!exiting) api.play(); });
  }
  start();
})();
