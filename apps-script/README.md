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

## Changing Code.gs later
Paste the new version, Save, then **Deploy > Manage deployments > Edit > Version: New version > Deploy**.
The URL stays the same. Run `setup` again only if the tabs or dashboard changed; it never deletes data rows.

Failed saves show under **Apps Script > Executions**. The customer's WhatsApp message is sent either way.
