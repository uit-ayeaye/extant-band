/* ==========================================================================
   EXTANT — site behaviour

   Release data is transcribed from the band's public YouTube channel
   (@extantband3863). View counts are a snapshot taken at build time.

   Both the card previews (assets/preview, 8s silent loops) and the full
   videos (assets/full, VP9/WebM) are served from this host. Each full video
   is the best resolution YouTube holds for it: the four modern music videos
   are 1080p, the 2020-21 uploads are 360p at source. YouTube is a deliberate
   second click, not the default destination.
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- release data ---------------------------------------------- */

  var RELEASES = window.EXTANT_RELEASES || [];

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function fmtDate(iso) {
    var p = iso.split('-');
    return MONTHS[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }
  function fmtViews(n) {
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return String(n);
  }
  function comma(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Observers are parked here on purpose. An IntersectionObserver with no
     reachable JS reference can be garbage-collected while it still has live
     observations, which silently kills every callback after the first — the
     page then renders blank below the fold on a deep link or refresh. */
  /* e.target is not always an Element (document, text nodes), and .closest
     only exists on Elements — guard it rather than throwing inside a
     high-frequency pointer handler. */
  function closestFrom(target, sel) {
    return (target && typeof target.closest === 'function') ? target.closest(sel) : null;
  }

  var KEEP = [];

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine    = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);

  /* ---------- render the vault ------------------------------------------ */

  var grid = $('#vaultGrid');

  if (grid) {
    grid.innerHTML = RELEASES.map(function (r) {
      return '' +
        '<button class="vcard" data-res="' + r.res + '" data-kind="' + r.kind + '" data-yt="' + r.id + '" data-at="' + r.at + '" ' +
                'data-title="EXTANT — ' + esc(r.title) + '" ' +
                'aria-label="Play ' + esc(r.title) + '">' +
          '<span class="vcard-shot">' +
            '<img src="' + esc(r.poster || ('https://i.ytimg.com/vi/' + r.id + '/hqdefault.jpg')) + '" alt="" loading="lazy" width="1280" height="720">' +
            '<video class="vcard-vid" muted loop playsinline preload="none" '+
              'tabindex="-1" aria-hidden="true" data-src="' + esc(r.preview) + '"></video>' +
            '<span class="vcard-play"><span aria-hidden="true">▶</span></span>' +
            '<span class="vcard-live">Preview</span>' +
            '<span class="vcard-len">' + esc(r.len) + '</span>' +
            '<span class="vcard-res">' + r.res + '</span>' +
          '</span>' +
          '<span class="vcard-body">' +
            '<span class="vcard-kind">' + esc(r.kindLabel) + '</span>' +
            '<span class="vcard-title">' + esc(r.title) + '</span>' +
            '<span class="vcard-my">' + esc(r.sub) + '</span>' +
            '<span class="vcard-cred">' + esc(r.credits) + '</span>' +
            '<span class="vcard-foot">' +
              '<span>' + fmtDate(r.date) + '</span>' +
              '<span><b>' + fmtViews(r.views) + '</b> plays</span>' +
            '</span>' +
          '</span>' +
        '</button>';
    }).join('');
  }

  /* ---------- auto-preview ----------------------------------------------
     One preview at a time. Muted, no controls, looping, starting at a point
     in the track worth hearing. Desktop previews on hover; touch devices
     preview whatever card is nearest the middle of the screen. ----------- */

  var toggle = $('#autoPreview');
  var current = null;

  function previewOn() {
    return !!(toggle && toggle.checked) && !reduced && !saveData;
  }

  function stopPreview() {
    if (!current) return;
    var v = $('.vcard-vid', current);
    if (v) { try { v.pause(); v.currentTime = 0; } catch (err) {} }
    current.classList.remove('is-previewing');
    current = null;
  }

  function startPreview(card) {
    if (card === current || !previewOn() || card.hidden) return;
    stopPreview();
    var v = $('.vcard-vid', card);
    if (!v || !v.dataset.src) return;
    /* Source is attached on first use so nothing downloads until wanted. */
    if (!v.getAttribute('src')) v.setAttribute('src', v.dataset.src);
    card.classList.add('is-previewing');
    current = card;
    var play = v.play();
    if (play && play.catch) {
      play.catch(function () {
        /* Autoplay refused (rare when muted) — drop back to the poster. */
        if (current === card) { card.classList.remove('is-previewing'); current = null; }
      });
    }
  }

  if (grid) {
    if (fine) {
      grid.addEventListener('mouseover', function (e) {
        var card = closestFrom(e.target, '.vcard');
        if (card && grid.contains(card)) startPreview(card);
      });
      grid.addEventListener('mouseleave', stopPreview);
      grid.addEventListener('focusin', function (e) {
        var card = closestFrom(e.target, '.vcard');
        if (card) startPreview(card);
      });
    } else if ('IntersectionObserver' in window) {
      /* Touch: whichever card sits in the middle band of the screen wins. */
      var mid = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) startPreview(entry.target);
          else if (entry.target === current) stopPreview();
        });
      }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });
      KEEP.push(mid);
      $$('.vcard', grid).forEach(function (c) { mid.observe(c); });
    }
  }

  if (toggle) {
    toggle.addEventListener('change', function () {
      if (!toggle.checked) stopPreview();
    });
    if (reduced || saveData) toggle.checked = false;
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopPreview();
  });

  /* ---------- filters ---------------------------------------------------- */

  var empty = $('#vaultEmpty');

  $$('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var want = chip.dataset.filter;

      $$('.chip').forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-selected', on ? 'true' : 'false');
      });

      stopPreview();

      var shown = 0;
      $$('.vcard', grid).forEach(function (card) {
        var ok = want === 'all' || card.dataset.kind === want;
        card.hidden = !ok;
        if (ok) shown++;
      });

      if (empty) empty.hidden = shown !== 0;
    });
  });

  /* ---------- full video modal ------------------------------------------ */

  var modal = $('#modal');
  var modalFrame = $('#modalFrame');
  var modalTitle = $('#modalTitle');
  var modalInfo  = $('#modalInfo');
  var modalOut = $('#modalOut');
  var lastFocus = null;

  function openVideo(id, title, rec) {
    if (!modal) return;
    lastFocus = document.activeElement;
    stopPreview();
    modalTitle.textContent = title || '';
    if (modalOut) modalOut.href = 'https://www.youtube.com/watch?v=' + id;

    /* Full video is served from this host. YouTube is a deliberate second
       click, not the default destination. */
    modalFrame.innerHTML =
      '<video id="modalVid" class="modal-vid" controls autoplay playsinline ' +
             'preload="metadata" poster="' + esc(rec && rec.poster || ('https://i.ytimg.com/vi/' + id + '/hqdefault.jpg')) + '">' +
        '<source src="' + esc(rec && rec.video || '') + '">' +
      '</video>' +
      '<p class="modal-fallback" hidden>This clip will not play in your browser. ' +
        '<a href="https://www.youtube.com/watch?v=' + id + '" target="_blank" rel="noopener noreferrer">' +
        'Watch it on YouTube \u2197</a></p>';

    /* The panel is a sibling of the frame, not a child: the frame is flex:none
       so anything inside it is unshrinkable, and on a short viewport (landscape
       phone) the box would grow past the screen instead of the credits
       scrolling within it. */
    if (modalInfo) modalInfo.innerHTML = infoPanel(rec);

    if (rec && !rec.video) showFallback();
    var vid = $('#modalVid', modal);
    if (vid) {
      /* A codec the browser cannot decode fires error on <source>, not on
         <video>, so listen on the element in the capture phase. */
      vid.addEventListener('error', showFallback, true);
      var play = vid.play();
      if (play && play.catch) play.catch(function () { /* user can hit play */ });
    }

    modal.hidden = false;
    document.body.classList.add('no-scroll');
    var x = $('.modal-x', modal);
    if (x) x.focus();
  }


  /* Credits as published on each video, so the people who made it are named
     here and not only on YouTube. */
  function infoPanel(r) {
    if (!r) return '';
    var facts =
      '<li><span>Released</span><b>' + fmtDate(r.date) + '</b></li>' +
      '<li><span>Running time</span><b>' + esc(r.len) + '</b></li>' +
      '<li><span>Source</span><b>' + r.res + '</b></li>' +
      '<li><span>Plays</span><b>' + comma(r.views) + '</b></li>';

    var crew = (r.crew || []).map(function (c) {
      return '<li><span>' + esc(c[0]) + '</span><b>' + esc(c[1]) + '</b></li>';
    }).join('');

    return '' +
      '<div class="modal-info">' +
        '<div class="modal-info-head">' +
          '<p class="modal-info-kind">' + esc(r.kindLabel) + '</p>' +
          '<h3 class="modal-info-title">' + esc(r.title) + '</h3>' +
          '<p class="modal-info-sub">' + esc(r.sub) + '</p>' +
        '</div>' +
        '<ul class="modal-facts">' + facts + '</ul>' +
        (crew ? '<p class="modal-crew-h">Credits</p><ul class="modal-crew">' + crew + '</ul>' : '') +
      '</div>';
  }

  function showFallback() {
    var fb = $('.modal-fallback', modal);
    var v  = $('#modalVid', modal);
    if (fb) fb.hidden = false;
    if (v) v.style.display = 'none';
  }

  function closeVideo() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    var v = $('#modalVid', modal);
    if (v) { try { v.pause(); } catch (err) {} }
    modalFrame.innerHTML = '';
    if (modalInfo) modalInfo.innerHTML = '';
    document.body.classList.remove('no-scroll');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var trigger = closestFrom(e.target, '[data-yt]');
    if (trigger) {
      e.preventDefault();
      var rec = null;
      for (var i = 0; i < RELEASES.length; i++) {
        if (RELEASES[i].id === trigger.dataset.yt) { rec = RELEASES[i]; break; }
      }
      openVideo(trigger.dataset.yt, trigger.dataset.title, rec);
      return;
    }
    if (closestFrom(e.target, '[data-close]')) closeVideo();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeVideo(); closeNav(); }
  });

  /* ---------- mobile nav ------------------------------------------------- */

  var burger = $('#burger');
  var nav = $('#nav');

  function closeNav() {
    if (!nav || !burger) return;
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', closeNav); });
  }

  /* ---------- sticky header --------------------------------------------- */

  var hdr = $('#hdr');
  function onScroll() { if (hdr) hdr.classList.toggle('is-stuck', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- reveal on scroll ------------------------------------------ */

  var reveals = $$('[data-reveal]');

  function reveal(el) { el.classList.add('is-in'); }

  function sweep() {
    var h = window.innerHeight || document.documentElement.clientHeight;
    /* A zero/unknown viewport (background tab, some embedded webviews) must
       never leave the page blank — fail open and show everything. */
    if (!h) { reveals.forEach(reveal); return; }
    reveals.forEach(function (el) {
      if (el.classList.contains('is-in')) return;
      var r = el.getBoundingClientRect();
      if (r.top < h * 0.94 && r.bottom > 0) reveal(el);
    });
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { reveal(entry.target); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    KEEP.push(io);
    reveals.forEach(function (el) { io.observe(el); });

    /* Belt and braces: the observer can miss elements when the browser jumps
       straight to a hash on load, and lazy images shift layout under it. */
    window.addEventListener('scroll', sweep, { passive: true });
    window.addEventListener('resize', sweep);
    window.addEventListener('load', sweep);
    setTimeout(sweep, 400);
  } else {
    reveals.forEach(reveal);
  }

  sweep();

  /* ---------- count-up stats -------------------------------------------- */

  var counters = $$('.count');

  function runCount(el) {
    var to = parseInt(el.dataset.to, 10) || 0;
    var useComma = el.dataset.format === 'comma';

    if (reduced) { el.textContent = useComma ? comma(to) : String(to); return; }

    var start = null;
    var dur = 1500;

    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(to * eased);
      el.textContent = useComma ? comma(val) : String(val);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ('IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { runCount(entry.target); co.unobserve(entry.target); }
      });
    }, { threshold: 0.4 });
    KEEP.push(co);
    counters.forEach(function (el) { co.observe(el); });
  } else {
    counters.forEach(runCount);
  }

  /* ---------- active nav link ------------------------------------------- */

  var sections = ['return', 'drop', 'records', 'vault', 'unit', 'history', 'merch', 'contact']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var navLinks = $$('.nav a');
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    KEEP.push(so);
    sections.forEach(function (s) { so.observe(s); });
  }


  /* ---------- 3D tilt ----------------------------------------------------
     Cursor-tracked tilt on cards. Fine pointers only — there is no cursor to
     follow on touch, and the CSS gives those an idle float instead. Writes
     two custom properties and lets CSS own the transform, so the work stays
     on the compositor. ----------------------------------------------------- */

  var TILT_SEL = '.vcard,.rec,.product,.file,.ret-card,.member,.link-card';
  var MAX_TILT = 7;   /* degrees */

  if (fine && !reduced) {
    var tiltables = $$(TILT_SEL);
    tiltables.forEach(function (el) { el.setAttribute('data-tilt', ''); });

    var queued = false;
    var pending = null;

    function applyTilt() {
      queued = false;
      if (!pending) return;
      var el = pending.el, r = pending.rect, x = pending.x, y = pending.y;
      var px = (x - r.left) / r.width - 0.5;
      var py = (y - r.top) / r.height - 0.5;
      el.style.setProperty('--ry', (px * MAX_TILT).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (-py * MAX_TILT).toFixed(2) + 'deg');
    }

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var el = closestFrom(e.target, TILT_SEL);
      if (!el || !el.hasAttribute('data-tilt')) return;
      el.classList.add('is-tilting');
      pending = { el: el, rect: el.getBoundingClientRect(), x: e.clientX, y: e.clientY };
      if (!queued) { queued = true; requestAnimationFrame(applyTilt); }
    }, { passive: true });

    document.addEventListener('pointerout', function (e) {
      var el = closestFrom(e.target, TILT_SEL);
      if (!el) return;
      /* ignore moves between children of the same card */
      if (e.relatedTarget && el.contains(e.relatedTarget)) return;
      el.classList.remove('is-tilting');
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
      if (pending && pending.el === el) pending = null;
    }, { passive: true });
  }

  /* ---------- thumbnail fallback ---------------------------------------- */

  document.addEventListener('error', function (e) {
    var img = e.target;
    if (img.tagName !== 'IMG' || img.dataset.fellBack) return;
    var m = (img.getAttribute('src') || '').match(/assets\/poster\/([\w-]{11})\.jpg$/);
    if (m) {
      img.dataset.fellBack = '1';
      img.src = 'https://i.ytimg.com/vi/' + m[1] + '/hqdefault.jpg';
    }
  }, true);

})();
