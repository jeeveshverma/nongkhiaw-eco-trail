# Bookings database (Google Sheet + Apps Script)

The booking and question forms send each submission to a Google Sheet, which also holds the dashboard.
Passport numbers are never sent; they stay in the WhatsApp message.

## Install (once, about 5 minutes)
1. In the Google Sheet: **Share > General access > Restricted** (customer data must not be public).
2. **Extensions > Apps Script**. Delete what is there, paste all of `Code.gs`, press **Save**.
3. Pick `setup` in the function list, press **Run**. Allow access (Advanced > Go to project > Allow).
   This creates the tabs Bookings, Travellers, Inquiries, Settings and Dashboard.
4. **Deploy > New deployment > Select type: Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy.
5. Copy the Web app URL (ends in `/exec`) into `js/main.js`: `var SHEET_URL = '...';`

## Daily use
- **Bookings**: one row per booking request. Staff set **Status** (Requested, Confirmed, Paid, Cancelled, No-show)
  and **Amount paid USD**. Add WhatsApp bookings that did not come through the form by hand.
- **Travellers**: one row per person (country, gender, food). Status follows the booking.
- **Inquiries**: one row per question. Set Status to Replied / Booked / Closed.
- **Settings**: tour prices and the transfer price. New bookings use them.
- **Dashboard**: updates by itself.

## Changing Code.gs later (clasp, signed in as the sheet owner)
Script ID `1upOpEpN2-5CgcaIbcE7RPDpj_J96eq51JTkbO_dn9nY4lgh9GFKux0LZ`, deployment
`AKfycbxq9ET0sZ-Vbdy5VMLahGd_qS71e-mVIeDFgBc-wJCVUYRUNQDGth4ddnQ6j24rYpPf` (the URL in js/main.js).
```
npx @google/clasp clone <script id>            # once, in an empty folder
cp apps-script/Code.gs apps-script/appsscript.json <that folder>
npx @google/clasp push --force
npx @google/clasp update-deployment <deployment id>   # same URL, new version
```
Then POST `{"type":"rebuild"}` to the URL if the tabs or dashboard changed (never touches data rows), and
POST `{"type":"selftest"}` to write, read back and delete a sample booking and inquiry.

Failed saves show under **Apps Script > Executions**. The customer's WhatsApp message is sent either way.

## Editing the website from the sheet (Content, Settings, Reviews)
- **Content tab**: every piece of text on the site, in 8 languages, in page order. Staff edit the English cell; the
  other languages are translated by Google Translate on the next refresh (`LanguageApp`, no extra permission). A cell
  that differs from the shipped text (tab "Content base", hidden) is an edit and is served by `?config=1`; the site
  merges it over its built-in text (`applyConfig` in `js/main.js`) and keeps a copy in localStorage (`nke-config`).
  Putting the English back restores the original in every language. Typing over a translation keeps it until the
  English is changed again.
- **Prices**: Settings tab (tour prices A2:C5, one way F2, round trip F3, train station F4). Strings carry placeholders
  `{p101} {p102} {p103} {p001} {pmin} {kip1} {kip2} {kipTrain}` that `fill()` in `js/main.js` replaces; card prices
  (`.price-num[data-price]`) and the WhatsApp tour line use the same numbers.
- **Menu "Website > Update the website now"** clears the cache and translates everything pending at once.
- The page only shows `<br>` and `<em>` from sheet text (`safeHtml`); anything else is plain text.

### When the built-in text in `js/i18n*.js` or the order in `index.html` changes
1. `node apps-script/build-seed.js` (rewrites `ContentSeed.gs`)
2. copy `Code.gs`, `ContentSeed.gs`, `appsscript.json` to the clasp folder, `clasp push --force`,
   `clasp update-deployment <deployment id>`
3. POST `{"type":"rebuild"}`: new text reaches every cell staff have not edited; their edits are kept.
Do not put text with prices directly in a string: use the placeholders above.
