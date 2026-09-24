# Bank statement CSV files

These are **merchant UPI settlement exports** (TID, RRN, TRANSACTION DATE, TRANSACTION AMOUNT, CARD NUMBER = payer UPI, etc.).

Current files:

- `Transaction_Details_Aug_2026.csv`
- `Transaction_Details_Sep_2026.csv`

When you get new months, add the CSV here and append the path in `assets/js/config.js` → `contributions.csvFiles`.

Only rows with `TRANSACTION STATUS = SUCCESS` are counted.
