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
  // Google Apps Script web app that saves submissions to the bookings sheet (apps-script/Code.gs); '' = off
  var SHEET_URL = '';
  function saveToSheet(data) {
    if (!SHEET_URL) return;
    data.lang = current;
    data.referrer = referrer();
    fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) })
      .catch(function (err) { console.error('Saving to the bookings sheet failed', err); });
  }
  function referrer() {
    var q = new URLSearchParams(location.search);
    if (q.get('utm_source')) return q.get('utm_source') + (q.get('utm_campaign') ? ' / ' + q.get('utm_campaign') : '');
    try { return document.referrer ? new URL(document.referrer).hostname : 'direct'; } catch (e) { return 'direct'; }
  }
  function bookingRef() {
    var d = new Date(), p = function (n) { return ('0' + n).slice(-2); };
    return 'NK' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '-' +
      Math.random().toString(36).slice(2, 6).toUpperCase();
  }
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
      showTab('book');
      setTimeout(function () { dateInput.focus({ preventScroll: true }); }, 700);
    });
  });
  /* one block of passport fields per guest; typed values survive count changes */
  var travBox = $('#travellers');
  function field(key, html) {
    return '<label><span data-i18n="' + key + '">' + t(key) + '</span>' + html + '</label>';
  }
  function travBlock(n) {
    var f = document.createElement('fieldset');
    f.className = 'trav';
    f.innerHTML =
      '<legend><span data-i18n="trav">' + t('trav') + '</span> ' + n + '</legend>' +
      field('lbl_fullname', '<input type="text" data-k="name" autocomplete="off" required>') +
      '<div class="row2">' +
        field('lbl_gender', '<select data-k="gender" required><option value="" data-i18n="g_sel">' + t('g_sel') + '</option>' +
          '<option value="Female" data-i18n="g_f">' + t('g_f') + '</option><option value="Male" data-i18n="g_m">' + t('g_m') + '</option>' +
          '<option value="X" data-i18n="g_x">' + t('g_x') + '</option></select>') +
        field('lbl_nat', '<input type="text" data-k="nat" data-i18n-ph="ph_nat" placeholder="' + t('ph_nat') + '" required>') +
      '</div>' +
      field('lbl_pass', '<input type="text" data-k="pass" autocomplete="off" autocapitalize="characters" spellcheck="false" required>') +
      '<div class="row2">' +
        field('lbl_issue', '<input type="date" data-k="issued" required>') +
        field('lbl_expiry', '<input type="date" data-k="expires" required>') +
      '</div>' +
      field('lbl_food', '<select data-k="food"><option value="Regular" data-i18n="food_reg">' + t('food_reg') +
        '</option><option value="Vegetarian" data-i18n="food_veg">' + t('food_veg') + '</option></select>');
    return f;
  }
  function syncTravellers() {
    var want = Math.min(Math.max(parseInt($('#fGuests').value, 10) || 1, 1), 30);
    var have = $$('.trav', travBox);
    for (var i = have.length; i < want; i++) travBox.appendChild(travBlock(i + 1));
    for (var j = have.length - 1; j >= want; j--) travBox.removeChild(have[j]);
  }
  $('#fGuests').addEventListener('input', syncTravellers);
  syncTravellers();

  /* first Google Maps URL in the pasted text (Share often adds the place name), or '' */
  function mapsLink(text) {
    var m = text.match(/https?:\/\/\S+/);
    var ok = m && /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)/i.test(m[0]);
    return ok ? m[0] : '';
  }
  /* pickup map: search Google Maps for the typed name, paste the shared link, preview the pin */
  var mapInput = $('#fMap'), mapOk = $('#mapOk'), pasteBtn = $('#pasteMap');
  function syncFindMap() {
    var q = ($('#fHotel').value.trim() + ' Luang Prabang').trim();
    $('#findMap').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  }
  function syncMapOk() {
    var link = mapsLink(mapInput.value);
    mapOk.hidden = !link;
    if (link) mapOk.href = link;
  }
  $('#fHotel').addEventListener('input', syncFindMap);
  mapInput.addEventListener('input', syncMapOk);
  if (navigator.clipboard && navigator.clipboard.readText) {
    pasteBtn.hidden = false;
    pasteBtn.addEventListener('click', function () {
      navigator.clipboard.readText().then(function (txt) {
        mapInput.value = mapsLink(txt) || txt.trim();
        syncMapOk();
        if (!mapsLink(txt)) $('#formHint').textContent = t('hint_map');
      }, function () { mapInput.focus(); $('#formHint').textContent = t('paste_fail'); });
    });
  }
  var transferSel = $('#fTransfer');
  transferSel.addEventListener('change', function () { $('#hotelRow').hidden = transferSel.value === 'No'; });

  $('#bookForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var date = dateInput.value;
    var note = $('#fNote').value.trim();
    var tour = $('#fTour').value;
    var transfer = transferSel.value;
    var hotel = $('#fHotel').value.trim();
    var mapLink = mapsLink($('#fMap').value);
    var hint = $('#formHint');
    var missing = (date ? [] : [dateInput]).concat($$('.trav [required]', travBox).filter(function (el) { return !el.value.trim(); }));
    if (missing.length) { hint.textContent = t('hint'); missing[0].focus(); return; }
    if (transfer !== 'No' && !hotel) { hint.textContent = t('hint_hotel'); $('#fHotel').focus(); return; }
    if (transfer !== 'No' && !mapLink) { hint.textContent = t('hint_map'); $('#fMap').focus(); return; }
    hint.textContent = '';
    var ref = bookingRef();
    var source = $('#fSource').value;
    saveToSheet({
      type: 'booking', id: ref, website: $('#bookForm [name=website]').value, tour: tour, date: date,
      transfer: transfer, hotel: hotel, map: mapLink, source: source, note: note,
      travellers: $$('.trav', travBox).map(function (f) {
        var v = function (k) { return $('[data-k="' + k + '"]', f).value.trim(); };
        return { name: v('name'), gender: v('gender'), nat: v('nat'), food: v('food') };
      })
    });
    var people = $$('.trav', travBox).map(function (f, i) {
      var v = function (k) { return $('[data-k="' + k + '"]', f).value.trim(); };
      return '\nTraveller ' + (i + 1) + ': ' + v('name') +
        '\n- Gender: ' + v('gender') + '\n- Nationality: ' + v('nat') +
        '\n- Passport: ' + v('pass').toUpperCase() + ' (issued ' + v('issued') + ', expires ' + v('expires') + ')' +
        '\n- Food: ' + v('food');
    });
    var msg = 'Hello! I would like to book:\n' + (TOURS[tour] || tour) + '\nBooking ref: ' + ref + '\n' +
      'Date: ' + date + '\nPeople: ' + people.length +
      '\nTransfer from Luang Prabang: ' + transfer + (transfer !== 'No' ? '\nAccommodation: ' + hotel + '\nGoogle Maps: ' + mapLink : '') + '\n' +
      people.join('\n') +
      (note ? '\n\nNote: ' + note : '');
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  });

  /* ---------- book / ask tabs ---------- */
  function showTab(which) {
    var ask = which === 'ask';
    $('#bookForm').hidden = ask;
    $('#askForm').hidden = !ask;
    $('#tabBook').setAttribute('aria-selected', String(!ask));
    $('#tabAsk').setAttribute('aria-selected', String(ask));
  }
  $('#tabBook').addEventListener('click', function () { showTab('book'); });
  $('#tabAsk').addEventListener('click', function () { showTab('ask'); });

  $('#askForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#qName').value.trim(), contact = $('#qContact').value.trim();
    var question = $('#qText').value.trim(), tour = $('#qTour').value;
    var missing = [$('#qName'), $('#qContact'), $('#qText')].filter(function (el) { return !el.value.trim(); });
    if (missing.length) { $('#askHint').textContent = t('ask_hint'); missing[0].focus(); return; }
    $('#askHint').textContent = '';
    saveToSheet({ type: 'inquiry', website: $('#askForm [name=website]').value, name: name, contact: contact,
      tour: tour, question: question, source: $('#qSource').value });
    var msg = 'Hello! I have a question' + (tour ? ' about ' + (TOURS[tour] || tour) : '') + ':\n' + question +
      '\n\nName: ' + name + '\nContact: ' + contact;
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
