/**
 * Nong Khiaw Eco-Trail: booking and inquiry database + dashboard.
 *
 * Install (in the Google Sheet): Extensions > Apps Script, replace everything with this file, Save.
 * Run setup() once. Then Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
 * Put the /exec URL in js/main.js (SHEET_URL). See apps-script/README.md.
 *
 * The website sends JSON here; passport numbers are never sent or stored.
 */

var TABS = { bookings: 'Bookings', travellers: 'Travellers', inquiries: 'Inquiries', settings: 'Settings', dashboard: 'Dashboard' };

var BOOKING_COLS = ['Booking ID', 'Submitted at', 'Tour date', 'Tour month', 'Tour', 'Tour name', 'People', 'Lead name',
  'Countries', 'Vegetarians', 'Transfer', 'Accommodation', 'Maps link', 'Source', 'Referrer', 'Site language', 'Note',
  'Est. tour USD', 'Est. transfer kip', 'Status', 'Amount paid USD', 'Staff notes'];
var TRAVELLER_COLS = ['Booking ID', 'Tour date', 'Tour', 'Traveller #', 'Country', 'Gender', 'Food', 'Status'];
var INQUIRY_COLS = ['Submitted at', 'Month', 'Name', 'Contact', 'Tour', 'Question', 'Source', 'Referrer', 'Site language',
  'Status', 'Staff notes'];

var FORMATS = {
  Bookings: { 'Submitted at': 'yyyy-mm-dd hh:mm', 'Tour date': 'yyyy-mm-dd', 'Tour month': '@', 'Tour': '@',
    'Est. tour USD': '#,##0', 'Est. transfer kip': '#,##0', 'Amount paid USD': '#,##0.00' },
  Travellers: { 'Tour date': 'yyyy-mm-dd', 'Tour': '@' },
  Inquiries: { 'Submitted at': 'yyyy-mm-dd hh:mm', 'Month': '@', 'Tour': '@' }
};

var STATUSES = ['Requested', 'Confirmed', 'Paid', 'Cancelled', 'No-show'];
var INQUIRY_STATUSES = ['New', 'Replied', 'Booked', 'Closed'];
var SOURCES = ['Google', 'Google Maps', 'Facebook', 'Instagram', 'TripAdvisor', 'Hostel / hotel', 'Friend', 'Walk-in', 'Other'];
var TOURS = [['101', 'Overnight camping above the clouds', 30], ['102', '2 days 1 night', 60],
  ['103', '3 days 2 nights', 90], ['001', '1-day boat trip', 30]];
var TRANSFER_KIP = 200000;
var TIME_ZONE = 'Asia/Vientiane';

/* ---------- setup: safe to run again; it never deletes data rows ---------- */

function setup() {
  var ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TIME_ZONE);
  setupSettings_(ss);
  setupTable_(ss, TABS.bookings, BOOKING_COLS, { 'Status': STATUSES, 'Source': SOURCES }, FORMATS.Bookings);
  setupTable_(ss, TABS.travellers, TRAVELLER_COLS, {}, FORMATS.Travellers);
  setupTable_(ss, TABS.inquiries, INQUIRY_COLS, { 'Status': INQUIRY_STATUSES, 'Source': SOURCES }, FORMATS.Inquiries);

  // Travellers.Status follows the booking's status, so cancelled trips drop out of the reports.
  var trav = ss.getSheetByName(TABS.travellers);
  var bStatus = colLetter_(BOOKING_COLS.indexOf('Status') + 1);
  trav.getRange(1, TRAVELLER_COLS.indexOf('Status') + 1).setFormula(
    '={"Status";ARRAYFORMULA(IF(A2:A="",,IFERROR(VLOOKUP(A2:A,{Bookings!A2:A,Bookings!' + bStatus + '2:' + bStatus +
    '},2,FALSE),"")))}');

  setupDashboard_(ss);
  var blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
  ss.setActiveSheet(ss.getSheetByName(TABS.dashboard));
}

function setupSettings_(ss) {
  var sh = sheet_(ss, TABS.settings);
  if (sh.getLastRow() > 0) return;
  sh.getRange('A:A').setNumberFormat('@');
  sh.getRange(1, 1, 1, 3).setValues([['Tour', 'Name', 'Price USD (per person)']]);
  sh.getRange(2, 1, TOURS.length, 3).setValues(TOURS);
  sh.getRange('E1:F2').setValues([['Setting', 'Value'], ['Transfer kip per person, each way', TRANSFER_KIP]]);
  sh.getRange('E4').setValue('Edit prices here; new bookings use them. Old rows keep the price they were booked at.');
  sh.getRange('A1:F1').setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, 6);
}

function setupTable_(ss, name, cols, dropdowns, formats) {
  var sh = sheet_(ss, name);
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, cols.length).setValues([cols]);
  sh.getRange(1, 1, 1, cols.length).setFontWeight('bold').setBackground('#e8f0ea');
  sh.setFrozenRows(1);
  Object.keys(formats).forEach(function (c) {
    sh.getRange(2, cols.indexOf(c) + 1, sh.getMaxRows() - 1, 1).setNumberFormat(formats[c]);
  });
  Object.keys(dropdowns).forEach(function (c) {
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(dropdowns[c], true).setAllowInvalid(true).build();
    sh.getRange(2, cols.indexOf(c) + 1, sh.getMaxRows() - 1, 1).setDataValidation(rule);
  });
}

function setupDashboard_(ss) {
  var sh = sheet_(ss, TABS.dashboard);
  sh.getCharts().forEach(function (c) { sh.removeChart(c); });
  sh.clear();

  var B = function (c) { return colLetter_(BOOKING_COLS.indexOf(c) + 1); };
  var T = function (c) { return colLetter_(TRAVELLER_COLS.indexOf(c) + 1); };
  var I = function (c) { return colLetter_(INQUIRY_COLS.indexOf(c) + 1); };
  var bRange = 'Bookings!A2:' + colLetter_(BOOKING_COLS.length);
  var notCancelled = B('Status') + " <> 'Cancelled'";

  sh.getRange('A1').setValue('Nong Khiaw Eco-Trail: bookings dashboard').setFontSize(16).setFontWeight('bold');
  sh.getRange('A2').setValue('Updates live from the website. Staff fill in Status and Amount paid on the Bookings tab. ' +
    'Cancelled bookings are left out of tours, travellers, months and countries.').setFontColor('#5a665f');

  var kpis = [
    ['Booking requests', '=COUNTA(Bookings!A2:A)'],
    ['Confirmed or paid', '=COUNTIF(Bookings!' + B('Status') + '2:' + B('Status') + ',"Confirmed")+COUNTIF(Bookings!' +
      B('Status') + '2:' + B('Status') + ',"Paid")'],
    ['Travellers', '=SUMIFS(Bookings!' + B('People') + '2:' + B('People') + ',Bookings!' + B('Status') + '2:' + B('Status') +
      ',"<>Cancelled",Bookings!A2:A,"<>")'],
    ['Revenue received (USD)', '=SUM(Bookings!' + B('Amount paid USD') + '2:' + B('Amount paid USD') + ')'],
    ['Expected, confirmed not paid (USD)', '=SUMIFS(Bookings!' + B('Est. tour USD') + '2:' + B('Est. tour USD') + ',Bookings!' +
      B('Status') + '2:' + B('Status') + ',"Confirmed")'],
    ['Inquiries', '=COUNTA(Inquiries!A2:A)']
  ];
  kpis.forEach(function (k, i) {
    sh.getRange(4, 1 + i).setValue(k[0]).setFontColor('#5a665f').setWrap(true);
    sh.getRange(5, 1 + i).setFormula(k[1]).setFontSize(20).setFontWeight('bold');
  });

  // Each table: static header row 9, QUERY output from row 10 (labels blanked so QUERY adds no header).
  var tables = [
    { col: 'A', head: ['Month (tour date)', 'Bookings', 'Travellers', 'Est. tour USD', 'Paid USD'],
      q: '=IFERROR(QUERY(' + bRange + ',"select ' + B('Tour month') + ', count(A), sum(' + B('People') + '), sum(' +
        B('Est. tour USD') + ') where A is not null and ' + notCancelled + ' group by ' + B('Tour month') + ' order by ' +
        B('Tour month') + ' label count(A) \'\', sum(' + B('People') + ') \'\', sum(' + B('Est. tour USD') + ') \'\'",0),"")',
      paid: { col: 'E', key: 'Tour month', from: 'A' } },
    { col: 'G', head: ['Tour', 'Bookings', 'Travellers', 'Paid USD'],
      q: '=IFERROR(QUERY(' + bRange + ',"select ' + B('Tour name') + ', count(A), sum(' + B('People') + ') where A is not null and ' +
        notCancelled + ' group by ' + B('Tour name') + ' order by sum(' + B('People') + ') desc label count(A) \'\', sum(' +
        B('People') + ') \'\'",0),"")',
      paid: { col: 'J', key: 'Tour name', from: 'G' } },
    { col: 'L', head: ['Country', 'Travellers'],
      q: '=IFERROR(QUERY(Travellers!A2:H,"select ' + T('Country') + ', count(A) where A is not null and ' + T('Status') +
        " <> 'Cancelled' group by " + T('Country') + ' order by count(A) desc label count(A) \'\'",0),"")' },
    { col: 'O', head: ['Booking source', 'Bookings'],
      q: '=IFERROR(QUERY(' + bRange + ',"select ' + B('Source') + ', count(A) where A is not null group by ' + B('Source') +
        ' order by count(A) desc label count(A) \'\'",0),"")' },
    { col: 'R', head: ['Status', 'Bookings'],
      q: '=IFERROR(QUERY(' + bRange + ',"select ' + B('Status') + ', count(A) where A is not null group by ' + B('Status') +
        ' order by count(A) desc label count(A) \'\'",0),"")' },
    // "Booked" is filled beside this by a COUNTIFS (W10), since Status is text
    { col: 'U', head: ['Inquiry month', 'Inquiries', 'Booked'],
      q: '=IFERROR(QUERY(Inquiries!A2:K,"select ' + I('Month') + ', count(A) where A is not null group by ' +
        I('Month') + ' order by ' + I('Month') + ' label count(A) \'\'",0),"")' }
  ];

  tables.forEach(function (t) {
    var c = sh.getRange(t.col + '9').getColumn();
    sh.getRange(9, c, 1, t.head.length).setValues([t.head]).setFontWeight('bold').setBackground('#e8f0ea');
    sh.getRange(10, c).setFormula(t.q);
    // QUERY cannot sum a column that is still empty, so "Paid USD" is a SUMIFS beside the grouped rows
    if (t.paid) {
      var k = B(t.paid.key), paid = B('Amount paid USD'), st = B('Status');
      sh.getRange(t.paid.col + '10').setFormula('=ARRAYFORMULA(IF(' + t.paid.from + '10:' + t.paid.from + '="",,SUMIFS(Bookings!' +
        paid + '2:' + paid + ',Bookings!' + k + '2:' + k + ',' + t.paid.from + '10:' + t.paid.from + ',Bookings!' + st + '2:' + st +
        ',"<>Cancelled")))');
    }
  });
  sh.getRange('W10').setFormula('=ARRAYFORMULA(IF(U10:U="",,COUNTIFS(Inquiries!' + I('Month') + '2:' + I('Month') +
    ',U10:U,Inquiries!' + I('Status') + '2:' + I('Status') + ',"Booked")))');

  var chart = function (range, type, title, row, col, stacked) {
    var b = sh.newChart().setChartType(type).addRange(sh.getRange(range)).setNumHeaders(1)
      .setOption('title', title).setOption('legend', { position: 'bottom' })
      .setPosition(row, col, 0, 0).setOption('width', 520).setOption('height', 300);
    if (stacked) b.setOption('isStacked', true);
    sh.insertChart(b.build());
  };
  chart('A9:C60', Charts.ChartType.COLUMN, 'Bookings and travellers per month', 32, 1);
  chart('G9:H20', Charts.ChartType.BAR, 'Best-selling tours (bookings)', 32, 7);
  chart('L9:M40', Charts.ChartType.PIE, 'Travellers by country', 49, 1);
  chart('O9:P20', Charts.ChartType.PIE, 'Booking sources', 49, 7);
  chart('U9:V60', Charts.ChartType.COLUMN, 'Inquiries per month', 66, 1);

  sh.setFrozenRows(5);
  sh.setColumnWidths(1, 23, 110);
}

/* ---------- web endpoint ---------- */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.website) return reply_('ok');  // honeypot field: only bots fill it
    var ss = SpreadsheetApp.getActive();
    if (ss.getSpreadsheetTimeZone() !== TIME_ZONE) ss.setSpreadsheetTimeZone(TIME_ZONE);
    if (d.type === 'booking') saveBooking_(ss, d);
    else if (d.type === 'inquiry') saveInquiry_(ss, d);
    else if (d.type === 'selftest') return reply_(selfTest_(ss));
    else if (d.type === 'rebuild') { setup(); return reply_('rebuilt'); }  // idempotent; never touches data rows
    else return reply_('unknown type');
    return reply_('ok');
  } catch (err) {
    console.error('doPost failed: ' + err + '\n' + (e && e.postData ? e.postData.contents : ''));
    throw err;  // shows as a failed run under Apps Script > Executions
  } finally {
    lock.releaseLock();
  }
}

// The owner opening <web app URL>?setup=1 grants access once and builds the tabs; anyone else just sees a status line.
function doGet(e) {
  var owner = Session.getEffectiveUser().getEmail();
  if (e && e.parameter.setup === '1' && owner && Session.getActiveUser().getEmail() === owner) {
    setup();
    return reply_('Setup done. Open the sheet to see the Dashboard.');
  }
  return reply_('Nong Khiaw Eco-Trail booking endpoint is running.');
}

function saveBooking_(ss, d) {
  var people = (Array.isArray(d.travellers) ? d.travellers : []).slice(0, 30);
  if (!people.length) throw new Error('booking without travellers');
  var tour = clean_(d.tour, 5);
  var info = tourInfo_(ss, tour);
  var date = parseDate_(d.date);
  var transfer = clean_(d.transfer, 40) || 'No';
  var legs = /round/i.test(transfer) ? 2 : (/one way/i.test(transfer) ? 1 : 0);
  var countries = people.map(function (p) { return country_(p.nat); });
  var veg = people.filter(function (p) { return /veg/i.test(p.food || ''); }).length;
  var id = clean_(d.id, 20) || ('NK' + Utilities.formatDate(new Date(), TIME_ZONE, 'yyMMddHHmmss'));

  addRow_(ss, TABS.bookings, BOOKING_COLS, [
    id, new Date(), date, date ? text_(Utilities.formatDate(date, TIME_ZONE, 'yyyy-MM')) : '', text_(tour), info.name,
    people.length, clean_(people[0].name, 80), unique_(countries).join(', '), veg, transfer,
    legs ? clean_(d.hotel, 120) : '', legs ? clean_(d.map, 300) : '', clean_(d.source, 40) || 'Not given',
    clean_(d.referrer, 120), clean_(d.lang, 5), clean_(d.note, 1000), info.price * people.length,
    legs * kipPerWay_(ss) * people.length, 'Requested', '', ''
  ]);
  people.forEach(function (p, i) {
    addRow_(ss, TABS.travellers, TRAVELLER_COLS, [id, date, text_(tour), i + 1, countries[i], clean_(p.gender, 10), clean_(p.food, 20)]);
  });
}

// Writes one sample booking and inquiry, reads them back, then deletes them. Returns what was written.
function selfTest_(ss) {
  var id = 'SELFTEST-' + new Date().getTime().toString(36);  // must fit the 20-char ID limit
  saveBooking_(ss, { id: id, tour: '101', date: '2030-01-15', transfer: 'One way to Nong Khiaw', hotel: 'Test hostel',
    map: 'https://maps.app.goo.gl/test', source: 'Other', travellers: [{ name: 'Test', gender: 'X', nat: 'deutsch', food: 'Vegetarian' }] });
  saveInquiry_(ss, { name: id, contact: 'test', question: 'test' });
  SpreadsheetApp.flush();
  var dash = ss.getSheetByName(TABS.dashboard);
  var out = { kpis: dash.getRange('A5:F5').getDisplayValues()[0], firstTableRow: dash.getRange('A10:W10').getDisplayValues()[0] };
  [TABS.bookings, TABS.travellers, TABS.inquiries].forEach(function (name) {
    var sh = ss.getSheetByName(name), values = sh.getDataRange().getDisplayValues();
    for (var r = values.length - 1; r >= 1; r--) {
      var row = values[r].join('|');
      if (row.indexOf(id) !== -1) out[name] = values[r];
      if (row.indexOf('SELFTEST-') !== -1) sh.deleteRow(r + 1);  // also clears leftovers of earlier runs
    }
  });
  out.dashboardTabs = ss.getSheets().map(function (sh) { return sh.getName(); });
  return JSON.stringify(out);
}

function saveInquiry_(ss, d) {
  var now = new Date();
  addRow_(ss, TABS.inquiries, INQUIRY_COLS, [
    now, text_(Utilities.formatDate(now, TIME_ZONE, 'yyyy-MM')), clean_(d.name, 80), clean_(d.contact, 120),
    text_(clean_(d.tour, 20)), clean_(d.question, 2000), clean_(d.source, 40) || 'Not given', clean_(d.referrer, 120),
    clean_(d.lang, 5), 'New', ''
  ]);
}

/* ---------- helpers ---------- */

// Appends a row and sets its number formats (column formats from setup do not always carry to new rows).
function addRow_(ss, name, cols, values) {
  var sh = ss.getSheetByName(name), r = sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, values.length).setValues([values]);
  var f = FORMATS[name] || {};
  Object.keys(f).forEach(function (c) { sh.getRange(r, cols.indexOf(c) + 1).setNumberFormat(f[c]); });
}

function sheet_(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }

function reply_(msg) { return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.TEXT); }

// Trim, cap length, and stop typed text from being read as a formula.
function clean_(v, max) {
  var s = String(v == null ? '' : v).trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// Leading ' keeps codes like 001 and months like 2026-10 as text.
function text_(s) { return s && s.charAt(0) !== "'" ? "'" + s : s; }

function parseDate_(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : '';  // noon, so no timezone shifts the day
}

function unique_(a) { return a.filter(function (v, i) { return v && a.indexOf(v) === i; }); }

function colLetter_(n) {
  var s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s;
  return s;
}

function tourInfo_(ss, code) {
  var rows = ss.getSheetByName(TABS.settings).getRange('A2:C20').getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === code) return { name: rows[i][1], price: Number(rows[i][2]) || 0 };
  }
  return { name: code, price: 0 };
}

function kipPerWay_(ss) { return Number(ss.getSheetByName(TABS.settings).getRange('F2').getValue()) || TRANSFER_KIP; }

// Nationality is typed freely, in any of the site's 8 languages: map common spellings to one country name.
var COUNTRY_WORDS = {
  'Germany': ['german', 'germany', 'deutsch', 'deutschland', 'allemand', 'allemande', 'allemagne', 'เยอรมัน', 'เยอรมนี',
    'ドイツ', '德国', '德國', '독일', 'ເຢຍລະມັນ'],
  'France': ['french', 'france', 'français', 'francais', 'française', 'francaise', 'ฝรั่งเศส', 'フランス', '法国', '프랑스', 'ຝຣັ່ງ'],
  'United Kingdom': ['british', 'uk', 'u.k.', 'united kingdom', 'great britain', 'england', 'english', 'scottish', 'scotland',
    'welsh', 'wales', 'britannique', 'anglais', 'britisch', 'อังกฤษ', 'イギリス', '英国', '영국'],
  'United States': ['american', 'usa', 'us', 'u.s.', 'u.s.a.', 'united states', 'america', 'américain', 'americain',
    'amerikanisch', 'อเมริกัน', 'アメリカ', '美国', '미국'],
  'Netherlands': ['dutch', 'netherlands', 'holland', 'néerlandais', 'niederländisch', 'niederlande', 'オランダ', '荷兰', '네덜란드'],
  'Belgium': ['belgian', 'belgium', 'belge', 'belgique', 'belgisch', 'belgien'],
  'Switzerland': ['swiss', 'switzerland', 'suisse', 'schweizer', 'schweiz', 'スイス', '瑞士', '스위스'],
  'Austria': ['austrian', 'austria', 'autrichien', 'autriche', 'österreichisch', 'österreich', 'osterreich'],
  'Italy': ['italian', 'italy', 'italien', 'italienne', 'italie', 'italienisch', 'イタリア', '意大利', '이탈리아'],
  'Spain': ['spanish', 'spain', 'espagnol', 'espagnole', 'espagne', 'spanisch', 'spanien', 'スペイン', '西班牙', '스페인'],
  'Portugal': ['portuguese', 'portugal', 'portugais', 'portugiesisch'],
  'Ireland': ['irish', 'ireland', 'irlandais', 'irland'],
  'Sweden': ['swedish', 'sweden', 'suédois', 'schwedisch', 'schweden'],
  'Norway': ['norwegian', 'norway', 'norvégien', 'norwegisch', 'norwegen'],
  'Denmark': ['danish', 'denmark', 'danois', 'dänisch', 'dänemark'],
  'Finland': ['finnish', 'finland', 'finlandais', 'finnisch', 'finnland'],
  'Poland': ['polish', 'poland', 'polonais', 'polnisch', 'polen'],
  'Czechia': ['czech', 'czechia', 'czech republic', 'tchèque', 'tschechisch', 'tschechien'],
  'Israel': ['israeli', 'israel', 'israélien'],
  'Canada': ['canadian', 'canada', 'canadien', 'canadienne', 'kanadisch', 'kanada', 'カナダ', '加拿大', '캐나다'],
  'Australia': ['australian', 'australia', 'australien', 'australienne', 'australisch', 'オーストラリア', '澳大利亚', '호주'],
  'New Zealand': ['new zealander', 'kiwi', 'new zealand', 'néo-zélandais'],
  'Laos': ['lao', 'laos', 'laotian', 'laotien', 'ລາວ', 'ลาว', 'ラオス', '老挝', '라오스'],
  'Thailand': ['thai', 'thailand', 'thaïlandais', 'thailandais', 'thaïlande', 'thailändisch', 'ไทย', 'タイ', '泰国', '태국'],
  'Vietnam': ['vietnamese', 'vietnam', 'viet nam', 'vietnamien', 'ベトナム', '越南', '베트남', 'ຫວຽດນາມ', 'เวียดนาม'],
  'China': ['chinese', 'china', 'chinois', 'chinoise', 'chine', 'chinesisch', '中国', '中國', '中国人', '중국', 'ຈີນ', 'จีน', '中国の'],
  'Taiwan': ['taiwanese', 'taiwan', '台湾', '台灣', '대만'],
  'Hong Kong': ['hong kong', 'hongkong', 'hong konger', '香港'],
  'South Korea': ['korean', 'south korea', 'korea', 'coréen', 'coréenne', 'koreanisch', '한국', '대한민국', '韩国', '韓国', 'เกาหลี', 'ເກົາຫຼີ'],
  'Japan': ['japanese', 'japan', 'japonais', 'japonaise', 'japon', 'japanisch', '日本', '日本人', '일본', 'ญี่ปุ่น', 'ຍີ່ປຸ່ນ'],
  'India': ['indian', 'india', 'indien', 'indienne', 'indisch'],
  'Singapore': ['singaporean', 'singapore', 'singapour'],
  'Malaysia': ['malaysian', 'malaysia', 'malaisie'],
  'Philippines': ['filipino', 'filipina', 'philippines'],
  'Indonesia': ['indonesian', 'indonesia', 'indonésie'],
  'Russia': ['russian', 'russia', 'russe', 'russie', 'russisch', 'russland'],
  'Brazil': ['brazilian', 'brazil', 'brésilien', 'brésil', 'brasilien'],
  'Argentina': ['argentinian', 'argentine', 'argentina', 'argentinien'],
  'Mexico': ['mexican', 'mexico', 'mexicain', 'mexique', 'mexikanisch', 'mexiko'],
  'Chile': ['chilean', 'chile', 'chilien', 'chili'],
  'South Africa': ['south african', 'south africa', 'sud-africain', 'afrique du sud'],
  'Turkey': ['turkish', 'turkey', 'türkiye', 'turc', 'turquie', 'türkisch', 'türkei']
};
var COUNTRY_INDEX = (function () {
  var idx = {};
  Object.keys(COUNTRY_WORDS).forEach(function (c) { COUNTRY_WORDS[c].forEach(function (w) { idx[w] = c; }); });
  return idx;
})();

function country_(raw) {
  var s = clean_(raw, 60);
  var key = s.toLowerCase().replace(/\s+/g, ' ').replace(/^(the|from)\s+/, '');
  if (COUNTRY_INDEX[key]) return COUNTRY_INDEX[key];
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Not given';
}
