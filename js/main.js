/*
  Qahwat Al-Balad · قهوة البلد — main.js
  One classic script (loaded with "defer"), no dependencies, works from file:// too.
  No copy text lives here: every visible string is in index.html as an Arabic/English pair.

  1. Language toggle        4. Opening hours badge (Asia/Riyadh)
  2. Mobile navigation      5. Gallery lightbox
  3. Header on scroll       6. Footer year, reveal-on-scroll
*/
(function () {
  'use strict';

  var html = document.documentElement;
  var STORAGE_KEY = 'qab-lang';
  /* Attributes translated through data-i18n + data-ar-ATTR / data-en-ATTR */
  var I18N_ATTRS = ['alt', 'aria-label', 'title', 'content', 'placeholder'];
  var onLanguageChange = [];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function lang() { return html.lang === 'en' ? 'en' : 'ar'; }

  /* ---------------------------------------------------------------- 1. Language */
  function applyLanguage(l) {
    html.lang = l;
    html.dir = l === 'ar' ? 'rtl' : 'ltr';

    var title = html.getAttribute('data-' + l + '-title');
    if (title) document.title = title;

    $$('[data-i18n]').forEach(function (el) {
      I18N_ATTRS.forEach(function (attr) {
        var value = el.getAttribute('data-' + l + '-' + attr);
        if (value !== null) el.setAttribute(attr, value);
      });
    });

    /* WhatsApp links keep their number; only the pre-filled ?text= changes */
    $$('[data-wa]').forEach(function (link) {
      var message = link.getAttribute('data-' + l + '-text');
      if (message) link.href = link.href.split('?')[0] + '?text=' + encodeURIComponent(message);
    });

    onLanguageChange.forEach(function (fn) { fn(l); });
  }

  function initLanguage() {
    applyLanguage(lang());   // the <head> script already chose the language; sync attributes
    $$('[data-lang-toggle]').forEach(function (button) {
      button.addEventListener('click', function () {
        var next = lang() === 'ar' ? 'en' : 'ar';
        applyLanguage(next);
        try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* storage blocked */ }
        try {
          var url = new URL(location.href);
          if (url.searchParams.has('lang')) {
            url.searchParams.set('lang', next);
            history.replaceState(history.state, '', url.href);
          }
        } catch (e) { /* e.g. file:// restrictions */ }
        button.focus();
      });
    });
  }

  /* ---------------------------------------------------------------- 2. Mobile navigation */
  function initNav() {
    var toggle = $('[data-nav-toggle]');
    var nav = toggle && document.getElementById(toggle.getAttribute('aria-controls'));
    if (!nav) return;
    var outside = $$('main, footer, .wa-fab');
    var desktop = window.matchMedia('(min-width: 900px)');

    function isOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }

    function setOpen(open, returnFocus) {
      toggle.setAttribute('aria-expanded', String(open));
      html.classList.toggle('nav-open', open);
      html.classList.toggle('is-locked', open);
      outside.forEach(function (el) { el.toggleAttribute('inert', open); });
      if (open) {
        var first = $('a', nav);
        if (first) first.focus();
      } else if (returnFocus) {
        toggle.focus();
      }
    }

    toggle.addEventListener('click', function () { setOpen(!isOpen(), true); });
    nav.addEventListener('click', function (e) {
      if (isOpen() && e.target.closest('a')) setOpen(false, false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) setOpen(false, true);
    });
    var onBreakpoint = function (e) { if (e.matches && isOpen()) setOpen(false, false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onBreakpoint);
    else if (desktop.addListener) desktop.addListener(onBreakpoint);
  }

  /* ---------------------------------------------------------------- 3. Header on scroll */
  function initHeader() {
    var header = $('.site-header');
    if (!header) return;
    var queued = false;
    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      queued = false;
    }
    window.addEventListener('scroll', function () {
      if (!queued) { queued = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------------------------------------------------------------- 4. Opening hours */
  var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function toMinutes(hhmm) {
    var p = String(hhmm).split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1] || '0', 10);
  }

  /* Current weekday (0 = Sunday) and minutes since midnight in Jeddah.
     For testing, ?now=5-00:30 pretends it is Friday 00:30. */
  function riyadhNow() {
    var test = /[?&]now=(\d)-(\d{1,2}:\d{2})/.exec(decodeURIComponent(location.search));
    if (test) return { day: +test[1] % 7, min: toMinutes(test[2]) };
    var parts = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Riyadh', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return {
      day: WEEKDAYS.indexOf(parts.weekday),
      min: (parseInt(parts.hour, 10) % 24) * 60 + parseInt(parts.minute, 10)
    };
  }

  /* rows: [{ days: [..], open: minutes, close: minutes (> 1440 when it closes after midnight) }] */
  function hoursStatus(rows, now) {
    var yesterday = (now.day + 6) % 7;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.days.indexOf(now.day) > -1 && now.min >= r.open && now.min < r.close) {
        return { open: true, at: r.close % 1440 };
      }
      if (r.days.indexOf(yesterday) > -1 && r.close > 1440 && now.min < r.close - 1440) {
        return { open: true, at: r.close - 1440 };   // still open from the previous evening
      }
    }
    for (var d = 0; d < 7; d++) {                     // next opening time, today or later
      var day = (now.day + d) % 7, best = null;
      rows.forEach(function (row) {
        if (row.days.indexOf(day) > -1 && (d > 0 || row.open > now.min) && (best === null || row.open < best)) best = row.open;
      });
      if (best !== null) return { open: false, at: best };
    }
    return { open: false, at: null };
  }

  function formatTime(minutes, l) {
    // Midnight reads better as words; the text lives on the badge in index.html.
    var midnight = minutes % 1440 === 0 && $("[data-hours-status]");
    if (midnight && midnight.getAttribute("data-" + l + "-midnight")) return midnight.getAttribute("data-" + l + "-midnight");
    var date = new Date(Date.UTC(2000, 0, 1, Math.floor(minutes / 60), minutes % 60));
    var options = { hour: 'numeric', timeZone: 'UTC' };
    if (minutes % 60) options.minute = '2-digit';
    return new Intl.DateTimeFormat(l === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', options).format(date);
  }

  function initHours() {
    var status = $('[data-hours-status]');
    var rows = $$('[data-days]').map(function (el) {
      var open = toMinutes(el.getAttribute('data-open'));
      var close = toMinutes(el.getAttribute('data-close'));
      return {
        el: el,
        days: el.getAttribute('data-days').split(',').map(Number),
        open: open,
        close: close <= open ? close + 1440 : close
      };
    });
    if (!rows.length) return;

    function render() {
      var now = riyadhNow();
      rows.forEach(function (r) {
        var today = r.days.indexOf(now.day) > -1;
        r.el.classList.toggle('is-today', today);
        if (today) r.el.setAttribute('aria-current', 'date'); else r.el.removeAttribute('aria-current');
      });
      if (!status) return;
      var s = hoursStatus(rows, now);
      status.setAttribute('data-state', s.open ? 'open' : 'closed');
      status.toggleAttribute('data-has-time', s.at !== null);
      $('[data-hours-time]', status).textContent = s.at === null ? '' : formatTime(s.at, lang());
      status.hidden = false;
    }

    render();
    onLanguageChange.push(render);
    window.setInterval(render, 60000);
  }

  /* ---------------------------------------------------------------- 5. Gallery lightbox */
  function initLightbox() {
    var dialog = $('#lightbox');
    var thumbs = $$('[data-gallery-item]');
    if (!dialog || !thumbs.length || typeof dialog.showModal !== 'function') return;
    var img = $('.lb-img', dialog);
    var caption = $('.lb-caption', dialog);
    var count = $('[data-lb-count]', dialog);
    var figure = $('.lb-figure', dialog);
    var index = 0;

    function render() {
      var thumb = thumbs[index];
      var thumbImg = $('img', thumb);
      var source = thumb.closest('figure') && $('figcaption', thumb.closest('figure'));
      img.src = thumb.getAttribute('data-full') || thumbImg.getAttribute('src');
      img.alt = thumbImg.getAttribute('alt') || '';
      caption.textContent = '';
      if (source) {   // copy both language spans; CSS shows the active one
        Array.prototype.forEach.call(source.childNodes, function (n) { caption.appendChild(n.cloneNode(true)); });
      }
      count.textContent = (index + 1) + ' / ' + thumbs.length;
    }
    function go(step) {
      index = (index + step + thumbs.length) % thumbs.length;
      render();
    }

    thumbs.forEach(function (thumb, i) {
      thumb.addEventListener('click', function () {
        index = i;
        render();
        dialog.showModal();
        html.classList.add('is-locked');
      });
    });
    $('[data-lb-prev]', dialog).addEventListener('click', function () { go(-1); });
    $('[data-lb-next]', dialog).addEventListener('click', function () { go(1); });
    $('[data-lb-close]', dialog).addEventListener('click', function () { dialog.close(); });

    dialog.addEventListener('close', function () {   // Esc, close button or backdrop
      html.classList.remove('is-locked');
      thumbs[index].focus();
    });
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog || e.target.classList.contains('lb-stage')) dialog.close();
    });

    /* Arrow keys follow the reading direction: in Arabic (RTL) the next image is to the left */
    dialog.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var forward = (e.key === 'ArrowRight') !== (html.dir === 'rtl');
      go(forward ? 1 : -1);
      e.preventDefault();
    });

    /* Swipe */
    var startX = null, startY = 0;
    figure.addEventListener('pointerdown', function (e) { startX = e.clientX; startY = e.clientY; });
    figure.addEventListener('pointercancel', function () { startX = null; });
    figure.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      startX = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      var forward = html.dir === 'rtl' ? dx > 0 : dx < 0;
      go(forward ? 1 : -1);
    });

    onLanguageChange.push(function () { if (dialog.open) render(); });
  }

  /* ---------------------------------------------------------------- 6. Year & reveal */
  function initYear() {
    var year = String(new Date().getFullYear());
    $$('[data-year]').forEach(function (el) { el.textContent = year; });
  }

  function initReveal() {
    var items = $$('[data-reveal]');
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!items.length || calm || !('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    items.forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-visible');   // already on screen
      observer.observe(el);
    });
    html.classList.add('motion-ok');
  }

  /* Floating WhatsApp button: hidden while the hero is on screen, fades in once you scroll past it */
  function initWaFab() {
    var fab = $('.wa-fab'), hero = $('#home');
    if (!fab) return;
    if (!hero || !('IntersectionObserver' in window)) { fab.classList.add('is-shown'); return; }
    new IntersectionObserver(function (entries) {
      fab.classList.toggle('is-shown', !entries[0].isIntersecting);
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);
  }

  initLanguage();
  initWaFab();
  initNav();
  initHeader();
  initHours();
  initLightbox();
  initYear();
  initReveal();
})();
