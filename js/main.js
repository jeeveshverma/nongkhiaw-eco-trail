(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var LANGS = window.LANGS || [];
  var DICT = window.I18N || {};
  var current = 'en';

  function t(key) {
    var d = DICT[current] || {};
    if (d[key] != null) return d[key];
    return (DICT.en && DICT.en[key]) || '';
  }

  /* ---------- language ---------- */
  function applyLang(code) {
    if (!DICT[code]) code = 'en';
    current = code;
    document.documentElement.lang = code;

    $$('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (v) el.textContent = v;
    });
    $$('[data-i18n-html]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n-html'));
      if (v) el.innerHTML = v;
    });
    $$('[data-i18n-ph]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n-ph'));
      if (v) el.setAttribute('placeholder', v);
    });

    document.title = t('meta_title');
    var md = $('meta[name="description"]');
    if (md) md.setAttribute('content', t('meta_desc'));

    var meta = LANGS.filter(function (l) { return l.code === code; })[0];
    $('#langLabel').textContent = meta ? meta.name : code;
    $$('#langMenu button').forEach(function (b) {
      b.setAttribute('aria-current', b.getAttribute('data-code') === code ? 'true' : 'false');
    });
    $('#formHint').textContent = '';
    var cb = $('#copyBtn');
    if (cb) cb.textContent = t('copy');
    try { localStorage.setItem('nke-lang', code); } catch (e) {}
  }

  function detectLang() {
    var fromUrl = null;
    try { fromUrl = new URLSearchParams(location.search).get('lang'); } catch (e) {}
    if (fromUrl && DICT[fromUrl]) return fromUrl;
    try {
      var saved = localStorage.getItem('nke-lang');
      if (saved && DICT[saved]) return saved;
    } catch (e) {}
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    var base = String(nav).toLowerCase().split('-')[0];
    return DICT[base] ? base : 'en';
  }

  function buildLangMenu() {
    var menu = $('#langMenu'), btn = $('#langBtn');
    LANGS.forEach(function (l) {
      var li = document.createElement('li');
      li.setAttribute('role', 'presentation');
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'option');
      b.setAttribute('data-code', l.code);
      b.setAttribute('lang', l.code);
      b.innerHTML = '<span></span><small></small>';
      b.firstChild.textContent = l.name;
      b.lastChild.textContent = l.hint;
      b.addEventListener('click', function () {
        applyLang(l.code);
        closeMenu();
      });
      li.appendChild(b);
      menu.appendChild(li);
    });
    function openMenu() { menu.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
    function closeMenu() { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    window.closeLangMenu = closeMenu;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.contains('open') ? closeMenu() : openMenu();
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('#lang')) closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---------- header, burger, back-to-top ---------- */
  var header = $('.site-header'), toTop = $('#toTop');
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    header.classList.toggle('solid', y > 40);
    toTop.classList.toggle('show', y > 700);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  var burger = $('#burger'), nav = $('#nav');
  function setNav(open) {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) header.classList.add('solid'); else onScroll();
  }
  burger.addEventListener('click', function () { setNav(!nav.classList.contains('open')); });
  $$('#nav a').forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });

  /* ---------- reveal on scroll ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- lightbox ---------- */
  var items = $$('.g'), lb = $('#lightbox'), lbImg = $('#lbImg'), idx = 0, lastFocus = null;
  function show(i) {
    idx = (i + items.length) % items.length;
    lbImg.src = items[idx].getAttribute('data-full');
    lbImg.alt = items[idx].querySelector('img').alt;
  }
  function openLb(i) { lastFocus = document.activeElement; show(i); lb.hidden = false; document.body.style.overflow = 'hidden'; $('#lbClose').focus(); }
  function closeLb() { lb.hidden = true; lbImg.src = ''; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
  items.forEach(function (b, i) { b.addEventListener('click', function () { openLb(i); }); });
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', function () { show(idx - 1); });
  $('#lbNext').addEventListener('click', function () { show(idx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
  var tx = null;
  lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (tx == null) return;
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    tx = null;
  });

  /* ---------- booking form -> WhatsApp ---------- */
  var WA = '8562058975057';
  var dateInput = $('#fDate');
  (function () {
    var d = new Date();
    var m = ('0' + (d.getMonth() + 1)).slice(-2), day = ('0' + d.getDate()).slice(-2);
    dateInput.min = d.getFullYear() + '-' + m + '-' + day;
  })();
  var TOURS = {
    '101': 'Package 101: Overnight Camping Above the Clouds 360° Viewpoint (USD 30)',
    '102': 'Package 102: 2 Days 1 Night Overnight Camping & Full Day Adventure (USD 60)',
    '103': 'Package 103: 3D2N Camping Above the Clouds, Homestay & Full-Day Adventure (USD 90)',
    '001': 'Tour 001: 1-day boat trip to Muang Ngoi (USD 30)'
  };
  $$('[data-tour]').forEach(function (a) {
    a.addEventListener('click', function () {
      var sel = $('#fTour');
      if (sel) sel.value = a.getAttribute('data-tour');
      setTimeout(function () { var n = $('#fName'); if (n) n.focus({ preventScroll: true }); }, 700);
    });
  });
  $('#bookForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#fName').value.trim();
    var date = dateInput.value;
    var guests = $('#fGuests').value || '1';
    var note = $('#fNote').value.trim();
    var tour = $('#fTour').value;
    var food = $('#fFood').value;
    var transfer = $('#fTransfer').value;
    var hint = $('#formHint');
    if (!name || !date) { hint.textContent = t('hint'); (name ? dateInput : $('#fName')).focus(); return; }
    hint.textContent = '';
    var langName = (LANGS.filter(function (l) { return l.code === current; })[0] || {}).hint || current;
    var msg = 'Hello! I would like to book:\n' + (TOURS[tour] || tour) + '\n' +
      'Name: ' + name + '\nDate: ' + date + '\nPeople: ' + guests +
      '\nFood: ' + food + '\nTransfer from Luang Prabang: ' + transfer +
      (note ? '\nNote: ' + note : '') + '\nMy language: ' + langName;
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  });

  /* ---------- copy phone number ---------- */
  var copyBtn = $('#copyBtn');
  copyBtn.addEventListener('click', function () {
    var num = '+856 20 5897 5057';
    function done() {
      copyBtn.textContent = t('copied');
      setTimeout(function () { copyBtn.textContent = t('copy'); }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(num).then(done, done);
    } else {
      var ta = document.createElement('textarea');
      ta.value = num; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (err) {}
      document.body.removeChild(ta); done();
    }
  });

  /* ---------- init ---------- */
  $('#year').textContent = new Date().getFullYear();
  buildLangMenu();
  applyLang(detectLang());
})();
