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

/** @typedef {{ bankTotal: number, sponsorshipTotal: number, totalCollection: number, totalExpense: number, balance: number, sponsorshipRows: { name: string, amount: number }[], expenseItemCount: number, fetchedAt: string }} FinanceSummary */

/** @param {number} bankTotal @returns {Promise<FinanceSummary>} */
export async function fetchFinanceSummary(bankTotal) {
  const [sponsorship, expense] = await Promise.all([
    fetchSponsorshipTotal(),
    fetchExpenseTotal(),
  ]);

  const totalCollection = bankTotal + sponsorship.total;
  const balance = totalCollection - expense.total;

  return {
    bankTotal,
    sponsorshipTotal: sponsorship.total,
    totalCollection,
    totalExpense: expense.total,
    balance,
    sponsorshipRows: sponsorship.rows,
    expenseItemCount: expense.itemCount,
    fetchedAt: new Date().toISOString(),
  };
}
