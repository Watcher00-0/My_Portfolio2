/* ==========================================================================
   Kishan Kannaujiya — portfolio interactions
   ========================================================================== */

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
const toTop = document.querySelector('.to-top');
const sectionLinks = [...document.querySelectorAll('.nav nav a[href^="#"]')];

/* --- sticky nav state + back-to-top visibility --- */
function onScroll() {
  const y = window.scrollY || window.pageYOffset || 0;
  nav.classList.toggle('is-scrolled', y > 12);
  if (toTop) toTop.classList.toggle('show', y > 620);
}
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* --- mobile menu --- */
if (menuButton) {
  menuButton.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });
}

sectionLinks.forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  if (menuButton) menuButton.setAttribute('aria-expanded', 'false');
}));

/* --- scroll reveal --- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((item) => revealObserver.observe(item));

/* --- active nav link --- */
const navigationTargets = sectionLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);
const navigationObserver = new IntersectionObserver((entries) => {
  const visible = entries
    .filter((entry) => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visible) return;
  sectionLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`));
}, { rootMargin: '-25% 0px -62% 0px', threshold: [0.05, 0.25] });
navigationTargets.forEach((target) => navigationObserver.observe(target));

/* ==========================================================================
   Interactive magnetic dot-grid background
   ========================================================================== */
(() => {
  const canvas = document.getElementById('dot-grid-bg');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  if (reduceMotionQuery.matches) return; // CSS also hides the canvas in this case

  const SPACING = 20;
  const INFLUENCE_RADIUS = isTouch ? 0 : 170;
  const MAX_DISPLACE = 20;
  const EASE = 0.16;
  const DOT_RADIUS = 1.3;

  let width = 0, height = 0, dpr = 1;
  let dots = [];
  let rafId = null;
  let running = false;
  const pointer = { x: -9999, y: -9999, active: false };

  function buildDots() {
    dots = [];
    const cols = Math.ceil(width / SPACING) + 2;
    const rows = Math.ceil(height / SPACING) + 2;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const ox = i * SPACING;
        const oy = j * SPACING;
        dots.push({ ox, oy, x: ox, y: oy });
      }
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildDots();
  }

  /* Scroll makes the whole grid drift (parallax), wrapped every SPACING px so it tiles seamlessly */
  const SCROLL_PARALLAX = 0.35;
  function getScrollOffset() {
    const raw = (window.scrollY || window.pageYOffset || 0) * SCROLL_PARALLAX;
    return ((raw % SPACING) + SPACING) % SPACING;
  }

  /* Dot colour drifts from violet toward the ember accent as you scroll down the page */
  const COLOR_A = [198, 185, 255]; // violet
  const COLOR_B = [194, 63, 99];   // ember
  function getScrollProgress() {
    const doc = document.documentElement;
    const max = Math.max(doc.scrollHeight - window.innerHeight, 1);
    const y = window.scrollY || window.pageYOffset || 0;
    return Math.min(Math.max(y / max, 0), 1);
  }
  function currentDotColor(progress) {
    const r = COLOR_A[0] + (COLOR_B[0] - COLOR_A[0]) * progress;
    const g = COLOR_A[1] + (COLOR_B[1] - COLOR_A[1]) * progress;
    const b = COLOR_A[2] + (COLOR_B[2] - COLOR_A[2]) * progress;
    return `rgba(${r | 0}, ${g | 0}, ${b | 0}, 0.32)`;
  }

  function step() {
    ctx.clearRect(0, 0, width, height);

    const scrollOffset = getScrollOffset();
    ctx.fillStyle = currentDotColor(getScrollProgress());
    const hasPointer = pointer.active && INFLUENCE_RADIUS > 0;

    for (const d of dots) {
      const baseX = d.ox;
      const baseY = d.oy + scrollOffset;
      let tx = baseX, ty = baseY;
      if (hasPointer) {
        const dx = baseX - pointer.x;
        const dy = baseY - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < INFLUENCE_RADIUS) {
          const strength = (1 - dist / INFLUENCE_RADIUS) * MAX_DISPLACE;
          const angle = Math.atan2(dy, dx);
          tx = baseX + Math.cos(angle) * strength;
          ty = baseY + Math.sin(angle) * strength;
        }
      }
      d.x += (tx - d.x) * EASE;
      d.y += (ty - d.y) * EASE;
      ctx.beginPath();
      ctx.arc(d.x, d.y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = requestAnimationFrame(step);
  }

  function start() {
    if (running) return;
    running = true;
    resize();
    rafId = requestAnimationFrame(step);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  window.addEventListener('mousemove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  }, { passive: true });

  window.addEventListener('mouseleave', () => { pointer.active = false; });
  document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) pointer.active = false; });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  reduceMotionQuery.addEventListener('change', (e) => { if (e.matches) stop(); });

  start();
})();
