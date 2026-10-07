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
