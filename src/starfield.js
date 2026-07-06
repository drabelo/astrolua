// Living canvas starfield with subtle parallax.
//
// Draws a small, quiet field of stars into a <canvas id="sky"> that lives
// inside #stars (before #app). Once the canvas is up we flip a class on
// #stars so the old CSS radial-gradient starfield (styles.css) stops
// painting/animating — it stays in the markup untouched as the no-JS
// fallback for anyone whose script never runs.

const STAR_COUNT = 140;
const MAX_DPR = 2;
const PARALLAX_PX = 10; // max pointer-driven drift, scaled by depth
const SCROLL_FACTOR = 0.02; // scroll-driven drift, scaled by depth
const LERP = 0.05;

const TINTS = ['#ffffff', '#ffffff', '#ffffff', '#ffe9c9', '#fdd9ec'];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function initStarfield() {
  const host = document.getElementById('stars');
  if (!host) return;

  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.id = 'sky';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.zIndex = '0';
  canvas.style.pointerEvents = 'none';
  host.innerHTML = '';
  host.appendChild(canvas);
  host.classList.add('canvas-active');

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;

  // Preallocated star data — no per-frame allocation.
  const stars = new Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) {
    stars[i] = {
      x: 0, // set on resize, in CSS px
      y: 0,
      nx: Math.random(), // normalized position, stable across resizes
      ny: Math.random(),
      radius: rand(0.4, 1.4),
      tint: TINTS[Math.floor(Math.random() * TINTS.length)],
      baseAlpha: rand(0.45, 1),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.4, 1.1),
      depth: rand(0.2, 1),
    };
  }

  function layout() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    for (const s of stars) {
      s.x = s.nx * width;
      s.y = s.ny * height;
    }
  }

  // Pointer/scroll targets, eased toward with lerp — subtle drift, not a snap.
  let targetPX = 0, targetPY = 0;
  let px = 0, py = 0;
  let targetScroll = 0, scroll = 0;

  function onPointerMove(e) {
    // Drift opposite the pointer, normalized to viewport center.
    targetPX = (e.clientX / width - 0.5) * -2;
    targetPY = (e.clientY / height - 0.5) * -2;
  }

  function onScroll() {
    targetScroll = window.scrollY;
  }

  function drawStatic() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const s of stars) {
      ctx.globalAlpha = s.baseAlpha;
      ctx.fillStyle = s.tint;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (reduceMotion) {
    layout();
    drawStatic();
    window.addEventListener('resize', () => { layout(); drawStatic(); });
    return;
  }

  let running = true;
  let rafId = null;

  function frame(t) {
    if (!running) return;
    px += (targetPX - px) * LERP;
    py += (targetPY - py) * LERP;
    scroll += (targetScroll - scroll) * LERP;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    for (const s of stars) {
      const twinkle = Math.sin(t * 0.001 * s.speed + s.phase) * 0.18;
      const alpha = Math.min(1, Math.max(0, s.baseAlpha + twinkle));
      const dx = px * PARALLAX_PX * s.depth;
      const dy = py * PARALLAX_PX * s.depth + scroll * SCROLL_FACTOR * s.depth;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.tint;
      ctx.beginPath();
      ctx.arc(s.x + dx, s.y + dy, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (rafId === null) {
      running = true;
      rafId = requestAnimationFrame(frame);
    }
  }

  function stop() {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  layout();
  window.addEventListener('resize', layout);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  start();
}
