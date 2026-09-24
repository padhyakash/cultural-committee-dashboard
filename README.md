# Cultural Committee Finance Dashboard

Static site (HTML + JS) for **Cloudflare Pages** (`*.pages.dev`).

## What it shows

| Metric | Source |
|--------|--------|
| Bank collections | Sum of successful UPI/CCUPI in bank CSV files |
| Sponsorship | **Sponsorship** tab in Google Sheet |
| Total collection | Bank + sponsorship |
| Total expense | **Expense** tab (sum of line-item amounts) |
| Balance | Total collection − total expense |

Residents search **UPI ID** in the bank payments table to verify their contribution.

**Bills** opens a Google Drive folder (set `billsDriveUrl` in config).

When balance is negative, a **volunteer note** appears (add names in `volunteerNames`).

## Setup

```bash
npm install
npm run dev
```

Edit `assets/js/config.js`:

- `billsDriveUrl` — public Drive folder link for bill screenshots
- `volunteerNames` — e.g. `["Akash", "Biswa"]`
- `contributions.csvFiles` — paths to bank CSV exports

Sheet must be shared: **Anyone with the link can view**.

## Deploy (Cloudflare Pages)

- Build command: *(empty)*
- Output directory: `/`
