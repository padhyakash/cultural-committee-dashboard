import { config, sheetGvizUrl } from "./config.js";

/** @param {string} raw */
function parseGvizPayload(raw) {
  const jsonText = raw.replace(/^[^{]*/, "").replace(/\);?\s*$/, "");
  return JSON.parse(jsonText);
}

/** @param {import('./config.js').AppConfig['sheetId']} [_sheetId] @param {string} sheetName */
async function fetchSheetTable(sheetName) {
  const response = await fetch(sheetGvizUrl(sheetName), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Sheet "${sheetName}" failed (${response.status})`);
  }
  const parsed = parseGvizPayload(await response.text());
  return parsed.table;
}

/** @param {unknown} cell */
function cellValue(cell) {
  if (!cell || typeof cell !== "object" || !("v" in cell)) return null;
  return /** @type {{ v: unknown }} */ (cell).v;
}

/** @returns {Promise<{ total: number, rows: { name: string, amount: number }[] }>} */
export async function fetchSponsorshipTotal() {
  const table = await fetchSheetTable(config.sheets.sponsorship);
  /** @type {{ name: string, amount: number }[]} */
  const rows = [];
  let total = 0;

  for (const row of table.rows) {
    const cells = row.c ?? [];
    const name = cellValue(cells[0]);
    const amount = cellValue(cells[1]);
    if (typeof name !== "string" || !name.trim()) continue;
    if (typeof amount !== "number") continue;
    rows.push({ name: name.trim(), amount });
    total += amount;
  }

  return { total, rows };
}

/** @returns {Promise<{ total: number, itemCount: number }>} */
export async function fetchExpenseTotal() {
  const table = await fetchSheetTable(config.sheets.expense);
  let total = 0;
  let itemCount = 0;

  for (const row of table.rows) {
    const cells = row.c ?? [];
    const item = cellValue(cells[0]);
    const amount = cellValue(cells[1]);
    if (typeof item !== "string" || !item.trim()) continue;
    const label = item.trim();
    if (/^total/i.test(label)) continue;
    if (typeof amount !== "number" || amount <= 0) continue;
    total += amount;
    itemCount += 1;
  }

  return { total, itemCount };
}

/** @typedef {{ name: string, amount: number, excludedFromTotal?: boolean, note?: string }} SponsorshipRow */

/** @typedef {{ bankTotal: number, sponsorshipTotal: number, totalCollection: number, totalExpense: number, balance: number, sponsorshipRows: SponsorshipRow[], expenseItemCount: number, fetchedAt: string }} FinanceSummary */

/**
 * @param {{ name: string, amount: number }[]} rows
 * @param {import('./bank-csv.js').BankTransaction[]} bankTransactions
 */
function applySponsorshipBankDedup(rows, bankTransactions) {
  const rules = config.sponsorshipDedupeFromBank ?? [];
  /** @type {SponsorshipRow[]} */
  const processed = [];
  let total = 0;

  for (const row of rows) {
    let excluded = false;
    const nameLower = row.name.toLowerCase();

    for (const rule of rules) {
      if (!nameLower.includes(rule.name.toLowerCase())) continue;
      const inBank = bankTransactions.some((tx) =>
        tx.upi.toLowerCase().includes(rule.upiContains.toLowerCase()),
      );
      if (inBank) {
        excluded = true;
        break;
      }
    }

    processed.push({
      ...row,
      excludedFromTotal: excluded,
      ...(excluded ? { note: "Already counted in bank UPI" } : {}),
    });
    if (!excluded) total += row.amount;
  }

  return { rows: processed, total };
}

/** @param {number} bankTotal @param {import('./bank-csv.js').BankTransaction[]} [bankTransactions] @returns {Promise<FinanceSummary>} */
export async function fetchFinanceSummary(bankTotal, bankTransactions = []) {
  const [sponsorship, expense] = await Promise.all([
    fetchSponsorshipTotal(),
    fetchExpenseTotal(),
  ]);

  const sponsorshipAdjusted = applySponsorshipBankDedup(
    sponsorship.rows,
    bankTransactions,
  );

  const totalCollection = bankTotal + sponsorshipAdjusted.total;
  const balance = totalCollection - expense.total;

  return {
    bankTotal,
    sponsorshipTotal: sponsorshipAdjusted.total,
    totalCollection,
    totalExpense: expense.total,
    balance,
    sponsorshipRows: sponsorshipAdjusted.rows,
    expenseItemCount: expense.itemCount,
    fetchedAt: new Date().toISOString(),
  };
}
