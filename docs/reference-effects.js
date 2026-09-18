/* Reference-inspired interaction layer. Additive, guarded, and idempotent. */
(function () {
  'use strict';
  if (window.__BB_REFERENCE_EFFECTS__) return;
  window.__BB_REFERENCE_EFFECTS__ = true;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var body = document.body;

  function addLayer(cls) {
    var el = document.createElement('div');
    el.className = cls;
    el.setAttribute('aria-hidden', 'true');
    body.insertBefore(el, body.firstChild);
    return el;
  }
  var aurora = addLayer('bb-fx-aurora');
  addLayer('bb-fx-grid-shimmer');
  addLayer('bb-fx-noise');
  var cursor = addLayer('bb-fx-cursor');
  if (!reduced && window.innerWidth > 640) addLayer('bb-fx-scanline');

  var pointerFrame = 0;
  function pointer(e) {
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(function () {
      pointerFrame = 0;
      var x = e.clientX;
      var y = e.clientY;
      root.style.setProperty('--bb-pointer-x', x + 'px');
      root.style.setProperty('--bb-pointer-y', y + 'px');
      body.classList.add('bb-fx-pointer');
      if (cursor) cursor.style.backgroundPosition = x + 'px ' + y + 'px';
    });
  }
  if (!reduced && window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', pointer, { passive: true });
  }

  function reveal() {
    var candidates = document.querySelectorAll('section, main > *, #console > div, footer, [class*="rounded-2xl"], [class*="rounded-3xl"]');
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (el.closest && el.closest('.bb-fx-aurora, .bb-fx-grid-shimmer, .bb-fx-noise, .bb-fx-cursor')) continue;
      if (el.children.length < 1 && el.textContent.trim().length < 12) continue;
      el.classList.add('bb-fx-reveal');
    }
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.bb-fx-reveal').forEach(function (el) { el.classList.add('bb-fx-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('bb-fx-visible'); io.unobserve(entry.target); }
      });
    }, { threshold: .08, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.bb-fx-reveal').forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i * 35, 280) + 'ms';
      io.observe(el);
    });
  }

  function cards() {
    var els = document.querySelectorAll('section > div, article, [class*="rounded-2xl"], [class*="rounded-3xl"]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.classList.contains('bb-fx-tilt') || el.closest('.bb-fx-aurora')) continue;
      var rect = el.getBoundingClientRect();
      if (rect.width < 180 || rect.height < 70 || rect.height > 900) continue;
      el.classList.add('bb-fx-tilt');
      el.addEventListener('pointermove', function (event) {
        if (reduced || window.innerWidth < 641) return;
        var r = this.getBoundingClientRect();
        var px = (event.clientX - r.left) / r.width;
        var py = (event.clientY - r.top) / r.height;
        this.style.setProperty('--bb-tilt-y', ((px - .5) * 4.5).toFixed(2) + 'deg');
        this.style.setProperty('--bb-tilt-x', ((.5 - py) * 4.5).toFixed(2) + 'deg');
        this.style.setProperty('--bb-card-x', (px * 100).toFixed(1) + '%');
        this.style.setProperty('--bb-card-y', (py * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', function () {
        this.style.removeProperty('--bb-tilt-x');
        this.style.removeProperty('--bb-tilt-y');
      });
    }
  }

  function controls() {
    var els = document.querySelectorAll('a[href], button');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.classList.contains('bb-fx-ripple')) continue;
      el.classList.add('bb-fx-ripple');
      if (/open editor|try the lock|embed|copy|unseal|create|generate|continue|start/i.test(el.textContent || '')) el.classList.add('bb-fx-magnetic');
      el.addEventListener('pointerdown', function (event) {
        if (reduced) return;
        var r = this.getBoundingClientRect();
        var wave = document.createElement('span');
        wave.className = 'bb-fx-ripple-wave';
        wave.style.left = (event.clientX - r.left) + 'px';
        wave.style.top = (event.clientY - r.top) + 'px';
        this.appendChild(wave);
        setTimeout(function () { if (wave.parentNode) wave.parentNode.removeChild(wave); }, 700);
      }, { passive: true });
    }
  }

  function run() { try { reveal(); cards(); controls(); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  setTimeout(run, 900);
  setTimeout(run, 2600);
})();
