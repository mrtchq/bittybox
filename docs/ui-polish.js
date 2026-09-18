/* ==========================================================================
   Bitty Box — UI polish runtime (ADDITIVE, no build step)
   --------------------------------------------------------------------------
   Pairs with ui-polish.css. Its only job is to attach the hook attributes and
   classes the stylesheet needs, because the built React bundle cannot be
   rebuilt safely (a fresh `vite build` regresses the hand-patched lock set).

   HARD RULES:
   - never removes, restyles or re-parents an existing node
   - never attaches a handler that changes app behaviour
   - never touches the composer textarea value or selection
   - every entry point is wrapped in try/catch: a failure here can only fail
     to add polish, never break the page
   - idempotent: safe to run repeatedly, and it observes only childList
     mutations so its own attribute writes cannot re-trigger it

   ROLLBACK: delete this file and its <script> tag in docs/editor.html.
   ========================================================================== */
(function () {
  'use strict';

  var MIN_TARGET = 40; // px — dense desktop minimum per the hit-area rule
  var FIELD_LABELS = [
    { match: /^Box Title/i, label: 'Box title' },
    { match: /^Optional description/i, label: 'Optional description for social cards and search' },
    { match: /^Type or paste/i, label: 'Box content: HTML, JavaScript, CSS, Markdown, JSON, SVG, or a single self-contained link' }
  ];

  function each(list, fn) {
    for (var i = 0; i < list.length; i++) {
      try { fn(list[i], i); } catch (e) { /* keep going */ }
    }
  }

  /* ---- 7. hit areas: flag controls whose painted box is under 40px tall ---- */
  function tagHitAreas() {
    var controls = document.querySelectorAll(
      'button:not([data-ui-hit]), [role="button"]:not([data-ui-hit])'
    );
    each(controls, function (el) {
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;            // not rendered
      if (r.height >= MIN_TARGET) return;           // already large enough
      el.setAttribute('data-ui-hit', String(Math.round(r.height)));
      // Only static controls need a positioning context injected. Forcing
      // `position: relative` onto a `fixed`/`absolute` control would unhook it
      // from its own containing block (the Live Chat pill stretched to the
      // full viewport width when this was written unconditionally).
      if (getComputedStyle(el).position === 'static') {
        el.setAttribute('data-ui-hit-static', '');
      }
    });
  }

  /* ---- accessible names for the three placeholder-only composer fields ---- */
  function labelFields() {
    var fields = document.querySelectorAll('input[type="text"], textarea');
    each(fields, function (el) {
      if (el.getAttribute('aria-label')) return;
      var ph = el.getAttribute('placeholder') || '';
      for (var i = 0; i < FIELD_LABELS.length; i++) {
        if (FIELD_LABELS[i].match.test(ph)) {
          el.setAttribute('aria-label', FIELD_LABELS[i].label);
          if (!el.getAttribute('title')) el.setAttribute('title', FIELD_LABELS[i].label);
          return;
        }
      }
    });
  }

  /* ---- 8. horizontal rails: overflow state classes ---- */
  function updateRail(el) {
    // Tolerance > 2px: the rail rests at scrollLeft 4 from scroll-snap
    // alignment, which would otherwise paint a permanent left-edge fade.
    var maxScroll = el.scrollWidth - el.clientWidth;
    var moreRight = maxScroll - el.scrollLeft > 8;
    var moreLeft = el.scrollLeft > 8;
    el.classList.toggle('ui-overflow-right', moreRight);
    el.classList.toggle('ui-overflow-left', moreLeft);
  }

  function tagRails() {
    var rails = document.querySelectorAll(
      'div[class*="snap-x"][class*="overflow-x-auto"]:not(.ui-scroll-x)'
    );
    each(rails, function (el) {
      el.classList.add('ui-scroll-x');
      var schedule = function () {
        window.requestAnimationFrame(function () {
          try { updateRail(el); } catch (e) {}
        });
      };
      el.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      if (window.ResizeObserver) {
        try { new ResizeObserver(schedule).observe(el); } catch (e) {}
      }
      schedule();
    });
  }

  function run() {
    tagHitAreas();
    labelFields();
    tagRails();
  }

  function boot() {
    try { document.documentElement.classList.add('ui-polish'); } catch (e) {}
    run();
    // React mounts late and re-renders on every keystroke: re-scan on mutation
    // (childList only — our own attribute writes must not re-trigger this).
    if (window.MutationObserver) {
      var queued = false;
      var observer = new MutationObserver(function () {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(function () {
          queued = false;
          try { run(); } catch (e) {}
        });
      });
      try {
        observer.observe(document.body, { childList: true, subtree: true });
      } catch (e) {}
    }
    // hydration settling passes, then stop
    window.setTimeout(run, 800);
    window.setTimeout(run, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
