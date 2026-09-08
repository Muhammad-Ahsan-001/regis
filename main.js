/* =========================================================
   Muhammad Ahsan — portfolio
   Vanilla JS + GSAP/ScrollTrigger + Lenis (optional)
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  if (hasGsap && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  const hexToRgba = (hex, a) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };

  /* ---------- Theme ---------- */
  const themeMeta = $('meta[name="theme-color"]');
  const applyThemeMeta = () => { if (themeMeta) themeMeta.setAttribute('content', cssVar('--bg')); };
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  } catch (e) { /* storage unavailable */ }
  applyThemeMeta();

  const currentTheme = () => root.dataset.theme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const onThemeChange = [];
  $('#themeToggle').addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) { /* ignore */ }
    applyThemeMeta();
    onThemeChange.forEach((fn) => fn());
  });

  /* ---------- Clock (Islamabad) ---------- */
  const timeEl = $('#localTime');
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' });
  const tick = () => { timeEl.textContent = `ISB ${fmt.format(new Date())}`; };
  tick(); setInterval(tick, 20000);
  $('#footerYear').textContent = new Date().getFullYear();

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduced && hasGsap) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const hudH = () => parseFloat(cssVar('--hud-h')) || 64;
  const scrollToTarget = (target) => {
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { offset: -hudH() + 1, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id === '#') { e.preventDefault(); return; }
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      scrollToTarget(target);
      try { history.replaceState(null, '', id); } catch (err) { /* sandboxed hosts */ }
    });
  });

  /* ---------- Toast ---------- */
  const toastEl = $('#toast');
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  };
  $('#copyEmail').addEventListener('click', async () => {
    const email = $('.contact__email').textContent.trim();
    try { await navigator.clipboard.writeText(email); toast('Email copied'); }
    catch (e) { toast(email); }
  });

  /* ---------- Cursor + magnetic ---------- */
  if (finePointer && hasGsap && !reduced) {
    document.body.classList.add('has-cursor');
    const cur = $('.cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    const label = $('.cursor__label');
    const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.42, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.42, ease: 'power3' });
    let shown = false;
    window.addEventListener('mousemove', (e) => {
      if (!shown) { gsap.set([dot, ring], { x: e.clientX, y: e.clientY }); shown = true; }
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
      cur.classList.remove('cursor--hidden');
    }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.add('cursor--hidden'));

    const hoverSel = 'a, button, [data-magnetic], .room, .hud__theme';
    document.addEventListener('mouseover', (e) => {
      const lab = e.target.closest('[data-hover], .card__art');
      if (lab) {
        label.textContent = lab.getAttribute('data-hover') || 'Open';
        cur.classList.add('cursor--label'); cur.classList.remove('cursor--hover');
        return;
      }
      cur.classList.remove('cursor--label');
      if (e.target.closest(hoverSel)) cur.classList.add('cursor--hover');
      else cur.classList.remove('cursor--hover');
    });

    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('mousemove', (e) => {
        const b = el.getBoundingClientRect();
        xTo((e.clientX - (b.left + b.width / 2)) * 0.28);
        yTo((e.clientY - (b.top + b.height / 2)) * 0.28);
      });
      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' });
      });
    });
  }

  /* ---------- Hero: split text + intro ---------- */
  $$('.split').forEach((el) => {
    const text = el.textContent;
    el.textContent = '';
    for (const ch of text) {
      const s = document.createElement('span');
      s.className = 'char';
      s.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(s);
    }
  });

  const portrait = $('.hero__portrait');
  if (hasGsap && !reduced) {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hud', { y: -16, autoAlpha: 0, duration: 0.8 }, 0.1)
      .from('.split .char', { yPercent: 115, rotate: 4, duration: 1.1, stagger: 0.032 }, 0.15)
      .from('[data-intro]', { y: 22, autoAlpha: 0, duration: 0.9, stagger: 0.09 }, 0.55)
      .fromTo(portrait, { y: 48, rotation: 10, autoAlpha: 0 }, { y: 0, rotation: 3, autoAlpha: 1, duration: 1.3 }, 0.6)
      .to('.hero__canvas', { opacity: 1, duration: 1.6 }, 0.5)
      .from('.rail', { x: -18, autoAlpha: 0, duration: 0.8 }, 0.9)
      .from('.hero__scroll', { autoAlpha: 0, duration: 0.8 }, 1.3);

    // gentle parallax while the hero scrolls away
    gsap.to(portrait, { y: -70, rotation: 5, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__inner', { y: 60, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  } else {
    $('.hero__canvas').style.opacity = reduced ? 0.55 : 1;
  }

  /* ---------- Hero canvas: live pathfinding ---------- */
  function createPathfinder(canvas, host) {
    const ctx = canvas.getContext('2d');
    const S = { W: 0, H: 0, cols: 0, rows: 0, cell: 28, dpr: 1, blocked: null, rooms: [], bg: null, mouse: null, active: true, idleTimer: null, follow: false };
    const C = {};
    let ep = null;
    let lastFollow = 0;

    const readColors = () => {
      C.ink = cssVar('--ink'); C.accent = cssVar('--accent'); C.teal = cssVar('--teal'); C.muted = cssVar('--muted');
      buildBackground();
    };

    const idx = (x, y) => y * S.cols + x;
    const free = (x, y) => x >= 0 && y >= 0 && x < S.cols && y < S.rows && !S.blocked[idx(x, y)];

    function buildRooms() {
      const { cols, rows } = S;
      S.blocked = new Uint8Array(cols * rows);
      S.rooms = [];
      const target = clamp(Math.round((cols * rows) / 150), 5, 12);
      let tries = 0;
      while (S.rooms.length < target && tries < 400) {
        tries++;
        const w = 3 + Math.floor(Math.random() * 6);
        const h = 3 + Math.floor(Math.random() * 4);
        const x = 1 + Math.floor(Math.random() * (cols - w - 2));
        const y = 1 + Math.floor(Math.random() * (rows - h - 2));
        const clash = S.rooms.some((r) => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y);
        if (clash) continue;
        const room = { x, y, w, h, label: `R-${100 + Math.floor(Math.random() * 300)}` };
        S.rooms.push(room);
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) S.blocked[idx(xx, yy)] = 1;
      }
    }

    function buildBackground() {
      if (!S.W) return;
      const off = document.createElement('canvas');
      off.width = S.W * S.dpr; off.height = S.H * S.dpr;
      const o = off.getContext('2d');
      o.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
      const c = S.cell;
      // grid dots
      o.fillStyle = hexToRgba(C.ink, 0.22);
      for (let y = 0; y <= S.rows; y++) for (let x = 0; x <= S.cols; x++) {
        o.beginPath(); o.arc(x * c, y * c, 1, 0, Math.PI * 2); o.fill();
      }
      // rooms
      o.lineWidth = 1;
      o.strokeStyle = hexToRgba(C.ink, 0.3);
      o.font = '500 9px "IBM Plex Mono", monospace';
      o.fillStyle = hexToRgba(C.muted, 0.9);
      S.rooms.forEach((r) => {
        const x = r.x * c, y = r.y * c, w = r.w * c, h = r.h * c;
        o.strokeRect(x + 0.5, y + 0.5, w, h);
        // a door gap on the bottom wall
        o.clearRect(x + c * 0.6, y + h - 1, c * 0.9, 3);
        o.fillText(r.label, x + 6, y + 13);
      });
      S.bg = off;
    }

    function resize() {
      S.dpr = Math.min(window.devicePixelRatio || 1, 2);
      S.W = window.innerWidth;
      S.H = host.offsetHeight;
      canvas.width = S.W * S.dpr; canvas.height = S.H * S.dpr;
      canvas.style.width = `${S.W}px`; canvas.style.height = `${S.H}px`;
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
      S.cell = clamp(Math.round(S.W / 44), 24, 36);
      S.cols = Math.ceil(S.W / S.cell) + 1;
      S.rows = Math.ceil(S.H / S.cell) + 1;
      buildRooms();
      readColors();
      newEpisode();
    }

    // binary heap on f
    function astar(s, g) {
      const N = S.cols * S.rows;
      const gS = new Float32Array(N).fill(Infinity);
      const fS = new Float32Array(N).fill(Infinity);
      const from = new Int32Array(N).fill(-1);
      const closed = new Uint8Array(N);
      const heap = [];
      const push = (i) => { heap.push(i); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (fS[heap[p]] <= fS[heap[k]]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
      const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && fS[heap[l]] < fS[heap[m]]) m = l; if (r < heap.length && fS[heap[r]] < fS[heap[m]]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
      const h = (i) => { const dx = Math.abs((i % S.cols) - g.x), dy = Math.abs(Math.floor(i / S.cols) - g.y); return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy); };
      const si = idx(s.x, s.y), gi = idx(g.x, g.y);
      gS[si] = 0; fS[si] = h(si); push(si);
      const visited = [];
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      while (heap.length) {
        const cur = pop();
        if (closed[cur]) continue;
        closed[cur] = 1; visited.push(cur);
        if (cur === gi) break;
        const cx = cur % S.cols, cy = Math.floor(cur / S.cols);
        for (const [dx, dy] of dirs) {
          const nx = cx + dx, ny = cy + dy;
          if (!free(nx, ny)) continue;
          if (dx && dy && (!free(cx + dx, cy) || !free(cx, cy + dy))) continue; // no corner cutting
          const ni = idx(nx, ny);
          if (closed[ni]) continue;
          const ng = gS[cur] + (dx && dy ? Math.SQRT2 : 1);
          if (ng < gS[ni]) { gS[ni] = ng; fS[ni] = ng + h(ni); from[ni] = cur; push(ni); }
        }
      }
      const path = [];
      if (closed[gi]) { let c = gi; while (c !== -1) { path.push(c); c = from[c]; } path.reverse(); }
      return { visited, path };
    }

    const randomFree = () => {
      for (let t = 0; t < 200; t++) {
        const x = 1 + Math.floor(Math.random() * (S.cols - 2)), y = 1 + Math.floor(Math.random() * (S.rows - 2));
        if (free(x, y)) return { x, y };
      }
      return { x: 1, y: 1 };
    };
    const nearestFree = (x, y) => {
      if (free(x, y)) return { x, y };
      for (let r = 1; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        if (free(x + dx, y + dy)) return { x: x + dx, y: y + dy };
      }
      return null;
    };

    function newEpisode(opts = {}) {
      const s = opts.s || (ep && opts.keepStart ? ep.s : randomFree());
      let g = opts.g;
      if (!g) {
        for (let t = 0; t < 40; t++) { g = randomFree(); if (Math.hypot(g.x - s.x, g.y - s.y) > S.cols * 0.45) break; }
      }
      const res = astar(s, g);
      const follow = !!opts.follow;
      ep = {
        s, g, visited: res.visited, path: res.path, t0: performance.now(), follow,
        exploreDur: follow ? 0.35 : clamp(res.visited.length / 900, 0.7, 1.9),
        pathDur: follow ? 0.45 : clamp(res.path.length / 45, 0.7, 1.5),
        hold: follow ? Infinity : 2.6,
        fade: 0.8,
      };
    }

    function cellCenter(i) { return [(i % S.cols) * S.cell + S.cell / 2, Math.floor(i / S.cols) * S.cell + S.cell / 2]; }

    function drawPin(x, y, color) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x - 9, y - 9, x - 9, y - 22, x, y - 22);
      ctx.bezierCurveTo(x + 9, y - 22, x + 9, y - 9, x, y);
      ctx.fill();
      ctx.fillStyle = cssVar('--bg');
      ctx.beginPath(); ctx.arc(x, y - 14, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function frame(now) {
      if (!S.active) return;
      if (!ep) { requestAnimationFrame(frame); return; }
      const { W, H } = S;
      ctx.clearRect(0, 0, W, H);
      if (S.bg) ctx.drawImage(S.bg, 0, 0, W, H);

      // pointer halo
      if (S.mouse) {
        const gr = ctx.createRadialGradient(S.mouse.x, S.mouse.y, 0, S.mouse.x, S.mouse.y, 180);
        gr.addColorStop(0, hexToRgba(C.accent, 0.09)); gr.addColorStop(1, hexToRgba(C.accent, 0));
        ctx.fillStyle = gr; ctx.fillRect(S.mouse.x - 180, S.mouse.y - 180, 360, 360);
      }

      const t = (now - ep.t0) / 1000;
      const total = ep.exploreDur + ep.pathDur + ep.hold;
      let alpha = 1;
      if (t > total) alpha = clamp(1 - (t - total) / ep.fade, 0, 1);
      ctx.globalAlpha = alpha;

      // explored cells
      const n = Math.floor(clamp(t / ep.exploreDur, 0, 1) * ep.visited.length);
      ctx.fillStyle = hexToRgba(C.teal, 0.45);
      for (let i = 0; i < n; i++) {
        const [x, y] = cellCenter(ep.visited[i]);
        const fresh = n - i < 40 ? 1 : 0.55;
        ctx.globalAlpha = alpha * fresh;
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
      ctx.globalAlpha = alpha;

      // start ring
      const [sx, sy] = cellCenter(idx(ep.s.x, ep.s.y));
      ctx.strokeStyle = C.teal; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = C.teal; ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();

      // route
      if (t > ep.exploreDur && ep.path.length > 1) {
        const pf = clamp((t - ep.exploreDur) / ep.pathDur, 0, 1);
        const segs = (ep.path.length - 1) * pf;
        const whole = Math.floor(segs), part = segs - whole;
        ctx.save();
        ctx.strokeStyle = C.accent; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.shadowColor = hexToRgba(C.accent, 0.8); ctx.shadowBlur = 14;
        ctx.beginPath();
        let hx = sx, hy = sy;
        ctx.moveTo(sx, sy);
        for (let i = 1; i <= whole; i++) { const [x, y] = cellCenter(ep.path[i]); ctx.lineTo(x, y); hx = x; hy = y; }
        if (whole < ep.path.length - 1) {
          const [ax, ay] = cellCenter(ep.path[whole]); const [bx, by] = cellCenter(ep.path[whole + 1]);
          hx = ax + (bx - ax) * part; hy = ay + (by - ay) * part; ctx.lineTo(hx, hy);
        }
        ctx.stroke();
        ctx.restore();
        // head
        ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2); ctx.fill();
        if (pf >= 1) {
          const pulse = 6 + 4 * Math.abs(Math.sin(now / 500));
          ctx.strokeStyle = hexToRgba(C.accent, 0.6); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(hx, hy, pulse, 0, Math.PI * 2); ctx.stroke();
        }
      }

      // goal pin
      const [gx, gy] = cellCenter(idx(ep.g.x, ep.g.y));
      drawPin(gx, gy + 4, C.accent);

      ctx.globalAlpha = 1;
      if (t > total + ep.fade) newEpisode();
      requestAnimationFrame(frame);
    }

    // pointer follow
    host.addEventListener('mousemove', (e) => {
      if (!finePointer) return;
      const r = canvas.getBoundingClientRect();
      S.mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
      const now = performance.now();
      if (now - lastFollow < 140) return;
      const cx = Math.floor(S.mouse.x / S.cell), cy = Math.floor(S.mouse.y / S.cell);
      const g = nearestFree(cx, cy);
      if (!g || !ep) return;
      if (ep.g.x === g.x && ep.g.y === g.y && ep.follow) return;
      lastFollow = now;
      newEpisode({ g, keepStart: true, follow: true });
      clearTimeout(S.idleTimer);
      S.idleTimer = setTimeout(() => { S.mouse = null; newEpisode(); }, 5000);
      const hint = $('.hero__hint');
      if (hint && !hint.dataset.done) { hint.dataset.done = '1'; hint.style.transition = 'opacity 1s ease 2s'; hint.style.opacity = '0'; }
    }, { passive: true });
    host.addEventListener('mouseleave', () => {
      clearTimeout(S.idleTimer);
      S.idleTimer = setTimeout(() => { S.mouse = null; if (ep && ep.follow) newEpisode(); }, 1200);
    });

    // pause when out of view / hidden
    const io = new IntersectionObserver(([en]) => {
      const wasActive = S.active;
      S.active = en.isIntersecting && !document.hidden;
      if (S.active && !wasActive) requestAnimationFrame(frame);
    }, { threshold: 0.05 });
    io.observe(host);
    document.addEventListener('visibilitychange', () => {
      const wasActive = S.active;
      S.active = !document.hidden;
      if (S.active && !wasActive) requestAnimationFrame(frame);
    });

    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    resize();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildBackground);

    if (reduced) {
      // draw one finished route and stop
      ep.t0 = performance.now() - (ep.exploreDur + ep.pathDur) * 1000 - 10;
      S.active = true; frame(performance.now()); S.active = false;
      return { readColors: () => { readColors(); S.active = true; ep.t0 = performance.now() - (ep.exploreDur + ep.pathDur) * 1000 - 10; frame(performance.now()); S.active = false; } };
    }
    requestAnimationFrame(frame);
    return { readColors };
  }
  const pathfinder = createPathfinder($('#pathCanvas'), $('#hero'));
  onThemeChange.push(pathfinder.readColors);

  /* ---------- Rail + HUD progress ---------- */
  const stops = $$('[data-stop]');
  const stopTargets = stops.map((a) => $(a.getAttribute('href')));
  const railFill = $('#railFill');
  const railYou = $('#railYou');
  const hudSection = $('#hudSection');
  const hud = $('.hud');
  let stopFracs = [];
  const docHeight = () => document.documentElement.scrollHeight - window.innerHeight;

  function layoutRail() {
    const dh = Math.max(1, docHeight());
    stopFracs = stops.map((a, i) => {
      if (i === 0) return 0;
      const t = stopTargets[i];
      const top = t.getBoundingClientRect().top + window.scrollY - hudH() - 1;
      return clamp(top / dh, 0, 1);
    });
    // stops sit at even intervals; the marker interpolates within each segment
    stops.forEach((a, i) => { a.parentElement.style.top = `${(i / (stops.length - 1)) * 100}%`; });
  }
  const railPosition = (p) => {
    const n = stops.length;
    let seg = 0;
    for (let i = 0; i < n - 1; i++) if (p >= stopFracs[i]) seg = i;
    const a = stopFracs[seg], b = seg < n - 1 ? stopFracs[seg + 1] : 1;
    const local = b > a ? clamp((p - a) / (b - a), 0, 1) : 1;
    return clamp((seg + local) / (n - 1), 0, 1);
  };

  let lastY = window.scrollY;
  function onScroll() {
    const dh = Math.max(1, docHeight());
    const y = window.scrollY;
    const p = clamp(y / dh, 0, 1);
    root.style.setProperty('--progress', p.toFixed(4));
    const rp = railPosition(p);
    railFill.style.height = `${rp * 100}%`;
    railYou.style.top = `${rp * 100}%`;
    let active = 0;
    stopFracs.forEach((f, i) => { if (p + 0.015 >= f) active = i; });
    if (p > 0.985) active = stops.length - 1;
    stops.forEach((a, i) => {
      a.classList.toggle('is-active', i === active);
      a.classList.toggle('is-passed', i < active);
    });
    const label = stops[active].querySelector('span').textContent;
    if (hudSection.textContent !== label) hudSection.textContent = label;
    // hide HUD on scroll down, show on scroll up
    if (!reduced) {
      if (y > lastY + 4 && y > 240) hud.style.transform = 'translateY(-100%)';
      else if (y < lastY - 4 || y < 240) hud.style.transform = '';
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  if (lenis) lenis.on('scroll', onScroll);
  window.addEventListener('resize', () => { layoutRail(); onScroll(); });
  window.addEventListener('load', () => { layoutRail(); onScroll(); if (hasGsap) ScrollTrigger.refresh(); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { layoutRail(); onScroll(); }).observe(document.body);
  layoutRail(); onScroll();

  /* ---------- Reveals ---------- */
  if (hasGsap && !reduced) {
    $$('[data-reveal]').forEach((el) => {
      gsap.from(el, { y: 36, autoAlpha: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    $$('[data-reveal-group]').forEach((group) => {
      gsap.from(group.children, { y: 30, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: 0.09, scrollTrigger: { trigger: group, start: 'top 85%', once: true } });
    });
    $$('[data-reveal-photo]').forEach((fig) => {
      const img = fig.querySelector('img');
      gsap.fromTo(fig, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.4, ease: 'power4.out', scrollTrigger: { trigger: fig, start: 'top 80%', once: true } });
      gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: fig, start: 'top 80%', once: true } });
    });
  }

  /* ---------- Counters ---------- */
  $$('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix ? `<sup>${el.dataset.suffix}</sup>` : '';
    const render = (v) => { el.innerHTML = `${Math.round(v)}${suffix}`; };
    if (!hasGsap || reduced) { render(target); return; }
    const o = { v: 0 };
    gsap.to(o, { v: target, duration: 1.6, ease: 'power2.out', onUpdate: () => render(o.v), scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  /* ---------- Stacked project cards ---------- */
  const cards = $$('.card');
  cards.forEach((card, i) => {
    card.style.top = `calc(var(--hud-h) + 1.25rem + ${i * 10}px)`;
    if (!hasGsap || reduced) return;
    if (i < cards.length - 1) {
      gsap.to(card, {
        scale: 0.94, '--dim': 0.6, ease: 'none',
        scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: `top top+=${hudH() + 30}`, scrub: true },
      });
    }
    ScrollTrigger.create({ trigger: card, start: 'top 60%', end: 'bottom 40%', toggleClass: { targets: card, className: 'is-focus' } });
  });

  /* ---------- Generative card art ---------- */
  const ART = {
    route() {
      const rooms = [[40, 40, 150, 110], [230, 40, 120, 70], [390, 40, 170, 130], [40, 200, 100, 170], [190, 260, 180, 110], [420, 220, 140, 150]];
      const roomSvg = rooms.map(([x, y, w, h], i) => `<rect class="hair" x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="none"/><text class="mono" x="${x + 8}" y="${y + 16}">R-${101 + i * 2}</text>`).join('');
      const path = 'M 90 175 L 90 185 L 165 185 L 165 240 L 380 240 L 380 195 L 470 195';
      return `<svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice">
        <defs><pattern id="dots-r" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" class="ink-f" opacity="0.18"/></pattern></defs>
        <rect width="600" height="420" fill="url(#dots-r)"/>
        ${roomSvg}
        <path class="soft" d="${path}" fill="none" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" opacity="0.5"/>
        <path class="acc draw" d="${path}" fill="none" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" pathLength="1"/>
        <circle class="teal" cx="90" cy="175" r="6" fill="none" stroke-width="1.5"/><circle class="teal-f" cx="90" cy="175" r="2"/>
        <path class="acc-f head" d="M470 199c-7-7-9-11-9-16a9 9 0 0 1 18 0c0 5-2 9-9 16z"/><circle class="head" cx="470" cy="183" r="2.6" fill="var(--bg)"/>
        <text class="mono" x="40" y="400">A* · 4 FLOORS · 24 ROOMS</text>
      </svg>`;
    },
    ledger() {
      const cols = ['DATE', 'CASE', 'DEBIT', 'CREDIT', 'BALANCE'];
      const xs = [40, 130, 270, 380, 490];
      const head = cols.map((c, i) => `<text class="mono" x="${xs[i]}" y="46">${c}</text>`).join('');
      let rows = '';
      for (let i = 0; i < 8; i++) {
        const y = 76 + i * 36;
        const hi = i === 3;
        rows += hi ? `<rect x="28" y="${y - 18}" width="544" height="34" rx="6" fill="var(--accent)" opacity="0.10"/>` : '';
        rows += `<line class="soft" x1="28" y1="${y + 16}" x2="572" y2="${y + 16}"/>`;
        rows += `<rect class="ink-f" x="40" y="${y - 4}" width="52" height="6" rx="2" opacity="0.35"/>`;
        rows += `<rect class="ink-f" x="130" y="${y - 4}" width="${70 + ((i * 37) % 50)}" height="6" rx="2" opacity="0.25"/>`;
        rows += i % 3 === 1 ? `<rect class="ink-f" x="270" y="${y - 4}" width="${40 + ((i * 23) % 40)}" height="6" rx="2" opacity="0.35"/>` : `<rect class="${hi ? 'acc-f' : 'teal-f'}" x="380" y="${y - 4}" width="${36 + ((i * 29) % 44)}" height="6" rx="2" opacity="${hi ? 1 : 0.7}"/>`;
        rows += `<rect class="ink-f" x="490" y="${y - 4}" width="${50 + ((i * 17) % 30)}" height="6" rx="2" opacity="0.5"/>`;
      }
      return `<svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice">
        ${head}
        <line class="hair" x1="28" y1="58" x2="572" y2="58"/>
        ${rows}
        <line class="acc draw" x1="28" y1="372" x2="572" y2="372" stroke-width="2" pathLength="1"/>
        <text class="mono" x="40" y="398">TOTAL</text><text class="mono" x="490" y="398" style="fill:var(--accent)">PKR 1,284,500</text>
      </svg>`;
    },
    frame() {
      return `<svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice">
        <defs><pattern id="grid-f" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" class="soft" stroke-width="0.6"/></pattern></defs>
        <rect width="600" height="420" fill="url(#grid-f)"/>
        <rect class="hair" x="150" y="70" width="300" height="290" fill="var(--bg-2)" stroke-width="2.5"/>
        <rect class="hair" x="164" y="84" width="272" height="262" fill="none" stroke-width="1.2"/>
        <line class="hair" x1="300" y1="84" x2="300" y2="346" stroke-width="2.5"/>
        <line class="hair" x1="164" y1="200" x2="436" y2="200" stroke-width="2.5"/>
        <rect x="170" y="90" width="124" height="104" fill="var(--teal)" opacity="0.10"/>
        <rect x="306" y="90" width="124" height="104" fill="var(--teal)" opacity="0.10"/>
        <rect x="170" y="206" width="124" height="134" fill="var(--teal)" opacity="0.10"/>
        <rect x="306" y="206" width="124" height="134" fill="var(--teal)" opacity="0.10"/>
        <g class="acc" stroke-width="1.2" fill="none">
          <path class="draw" d="M150 46 L450 46 M150 40 L150 52 M450 40 L450 52" pathLength="1"/>
          <path class="draw" d="M120 70 L120 360 M114 70 L126 70 M114 360 L126 360" pathLength="1"/>
          <path class="draw" d="M300 386 L450 386 M300 380 L300 392 M450 380 L450 392" pathLength="1"/>
        </g>
        <text class="mono" x="272" y="36" style="fill:var(--accent)">1219</text>
        <text class="mono" x="70" y="220" style="fill:var(--accent)">1524</text>
        <text class="mono" x="360" y="408" style="fill:var(--accent)">610</text>
        <text class="mono" x="470" y="110">D-48 SEC</text>
        <text class="mono" x="470" y="128">4 PCS</text>
        <text class="mono" x="470" y="146">5 MM GLASS</text>
      </svg>`;
    },
    nodes() {
      const pts = [[80, 90], [180, 60], [300, 110], [420, 70], [520, 130], [120, 220], [240, 200], [360, 230], [480, 260], [90, 340], [210, 330], [330, 350], [450, 360], [560, 320]];
      const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [1, 6], [2, 6], [2, 7], [3, 7], [4, 8], [5, 6], [6, 7], [7, 8], [5, 9], [6, 10], [7, 11], [8, 12], [9, 10], [10, 11], [11, 12], [12, 13], [8, 13]];
      const route = [0, 5, 6, 7, 11, 12, 13];
      const e = edges.map(([a, b]) => `<line class="soft" x1="${pts[a][0]}" y1="${pts[a][1]}" x2="${pts[b][0]}" y2="${pts[b][1]}"/>`).join('');
      const d = route.map((i, k) => `${k ? 'L' : 'M'} ${pts[i][0]} ${pts[i][1]}`).join(' ');
      const n = pts.map(([x, y], i) => {
        const on = route.includes(i);
        return `<circle class="${on ? 'acc-f' : 'ink-f'}" cx="${x}" cy="${y}" r="${on ? 5 : 3.5}" opacity="${on ? 1 : 0.55}"/>`;
      }).join('');
      const labels = [[180, 60, 'events'], [420, 70, 'papers'], [240, 200, 'courses'], [450, 360, 'team']].map(([x, y, t]) => `<text class="mono" x="${x + 10}" y="${y - 10}">${t}</text>`).join('');
      return `<svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice">
        ${e}
        <path class="acc draw" d="${d}" fill="none" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" pathLength="1"/>
        ${n}
        <circle class="teal pulse-node" cx="300" cy="110" r="9" fill="none" stroke-width="1.5"/>
        <circle class="teal pulse-node" cx="480" cy="260" r="9" fill="none" stroke-width="1.5"/>
        ${labels}
      </svg>`;
    },
    timeline() {
      const tracks = ['opacity', 'x', 'scale', 'rotate', 'stroke'];
      let t = '';
      tracks.forEach((name, i) => {
        const y = 110 + i * 56;
        t += `<text class="mono" x="40" y="${y + 4}">${name}</text><line class="soft" x1="140" y1="${y}" x2="560" y2="${y}"/>`;
        const ks = [140 + ((i * 53) % 90), 260 + ((i * 71) % 120), 430 + ((i * 37) % 100)];
        ks.forEach((x, k) => { t += `<rect class="${k === 1 && i === 2 ? 'acc-f' : 'ink-f'}" x="${x - 5}" y="${y - 5}" width="10" height="10" transform="rotate(45 ${x} ${y})" opacity="${k === 1 && i === 2 ? 1 : 0.7}"/>`; });
        if (i === 2) t += `<line class="acc" x1="${ks[0]}" y1="${y}" x2="${ks[1]}" y2="${y}" stroke-width="2" opacity="0.8"/>`;
      });
      let ruler = '';
      for (let i = 0; i <= 8; i++) { const x = 140 + i * 52.5; ruler += `<line class="hair" x1="${x}" y1="60" x2="${x}" y2="${i % 2 ? 68 : 74}"/>`; if (i % 2 === 0) ruler += `<text class="mono" x="${x - 6}" y="52">${i / 2}s</text>`; }
      return `<svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice">
        <line class="hair" x1="140" y1="74" x2="560" y2="74"/>
        ${ruler}${t}
        <g class="playhead"><line class="acc" x1="140" y1="60" x2="140" y2="360" stroke-width="1.5"/><path class="acc-f" d="M134 60h12l-6 8z"/></g>
        <text class="mono" x="40" y="396">TIMELINE · 5 TRACKS · 15 KEYFRAMES</text>
      </svg>`;
    },
    kanban() {
      const cols = ['LEAD', 'APPLIED', 'OFFER', 'VISA'];
      const heights = [[54, 70, 48, 62], [66, 50, 58], [72, 54], [60, 48, 52]];
      let out = '';
      cols.forEach((c, i) => {
        const x = 34 + i * 138;
        out += `<text class="mono" x="${x}" y="46">${c}</text><line class="hair" x1="${x}" y1="58" x2="${x + 118}" y2="58"/>`;
        let y = 74;
        heights[i].forEach((h, k) => {
          const hot = i === 1 && k === 0;
          out += `<rect class="${hot ? 'acc' : 'hair'}" x="${x}" y="${y}" width="118" height="${h}" rx="8" fill="var(--bg-2)" stroke-width="${hot ? 1.5 : 1}"/>`;
          out += `<rect class="ink-f" x="${x + 12}" y="${y + 14}" width="${50 + ((k * 31 + i * 17) % 40)}" height="6" rx="2" opacity="0.5"/>`;
          out += `<rect class="ink-f" x="${x + 12}" y="${y + 28}" width="${30 + ((k * 19) % 30)}" height="5" rx="2" opacity="0.25"/>`;
          if (hot) out += `<circle class="acc-f pulse-node" cx="${x + 104}" cy="${y + 16}" r="4"/>`;
          if (i === 2 && k === 1) out += `<circle cx="${x + 104}" cy="${y + 16}" r="4" fill="var(--brick)"/>`;
          y += h + 12;
        });
      });
      return `<svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice">${out}
        <text class="mono" x="34" y="400">9 STAGES · SLA WATCH · 12 ROLES</text></svg>`;
    },
  };
  cards.forEach((card) => {
    const kind = card.dataset.art;
    const holder = card.querySelector('.card__art');
    if (holder && ART[kind]) holder.innerHTML = ART[kind]();
  });

  /* ---------- Toolkit: corridor route ---------- */
  const plan = $('#plan');
  const planSvg = $('#planRoute');
  let planTrigger = null;
  function drawPlanRoute() {
    if (!plan || !planSvg) return;
    const rooms = $$('[data-room]', plan);
    const pr = plan.getBoundingClientRect();
    if (!pr.width) return;
    planSvg.setAttribute('viewBox', `0 0 ${pr.width} ${pr.height}`);
    const pts = rooms.map((r) => { const b = r.getBoundingClientRect(); return { x: b.left - pr.left + b.width / 2, y: b.top - pr.top + b.height / 2 }; });
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      d += Math.abs(a.y - b.y) < 2 ? ` L ${b.x} ${b.y}` : ` L ${a.x} ${(a.y + b.y) / 2} L ${b.x} ${(a.y + b.y) / 2} L ${b.x} ${b.y}`;
    }
    planSvg.innerHTML = `<path d="${d}"/>` + pts.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="5"/>`).join('');
    const path = planSvg.querySelector('path');
    const dotsEls = $$('circle', planSvg);
    if (!hasGsap || reduced) return;
    if (planTrigger) { planTrigger.animation && planTrigger.animation.kill(); planTrigger.kill(); }
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    gsap.set(dotsEls, { scale: 0, transformOrigin: 'center' });
    const tl = gsap.timeline({ scrollTrigger: { trigger: plan, start: 'top 78%', end: 'bottom 60%', scrub: 0.6 } });
    tl.to(path, { strokeDashoffset: 0, ease: 'none', duration: 1 }, 0)
      .to(dotsEls, { scale: 1, ease: 'power2.out', duration: 0.15, stagger: 0.85 / dotsEls.length }, 0.02);
    planTrigger = tl.scrollTrigger;
  }
  let planRt;
  window.addEventListener('resize', () => { clearTimeout(planRt); planRt = setTimeout(drawPlanRoute, 200); });
  window.addEventListener('load', drawPlanRoute);
  drawPlanRoute();
})();
