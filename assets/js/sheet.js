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

/** @typedef {{ name: string, amount: number }} SponsorshipOverlapRow */

/** @typedef {{ bankTotal: number, priorYearBalance: number, sponsorshipTotal: number, sponsorshipBankOverlapTotal: number, sponsorshipBankOverlapRows: SponsorshipOverlapRow[], totalCollection: number, totalExpense: number, balance: number, sponsorshipRows: SponsorshipRow[], expenseItemCount: number, fetchedAt: string }} FinanceSummary */

/** @param {{ name: string, amount: number }[]} rows */
function splitPreviousBalance(rows) {
  const pattern = (config.sponsorshipPreviousBalancePattern || "previous balance")
    .trim()
    .toLowerCase();
  let priorYearBalance = 0;
  /** @type {{ name: string, amount: number, excludedFromTotal?: boolean, note?: string }[]} */
  const processed = [];

  for (const row of rows) {
    if (pattern && row.name.toLowerCase().includes(pattern)) {
      priorYearBalance += row.amount;
      processed.push({
        ...row,
        excludedFromTotal: true,
        note: "Shown as last year balance (not in sponsorship total)",
      });
      continue;
    }
    processed.push(row);
  }

  return { priorYearBalance, rows: processed };
}

/**
 * @param {{ name: string, amount: number, excludedFromTotal?: boolean, note?: string }[]} rows
 * @param {import('./bank-csv.js').BankTransaction[]} bankTransactions
 */
function applySponsorshipBankDedup(rows, bankTransactions) {
  const rules = config.sponsorshipDedupeFromBank ?? [];
  /** @type {SponsorshipRow[]} */
  const processed = [];
  let total = 0;

  for (const row of rows) {
    let excluded = Boolean(row.excludedFromTotal);
    let note = row.note;

    if (!excluded) {
      const nameLower = row.name.toLowerCase();
      for (const rule of rules) {
        if (!nameLower.includes(rule.name.toLowerCase())) continue;
        const inBank = bankTransactions.some((tx) =>
          tx.upi.toLowerCase().includes(rule.upiContains.toLowerCase()),
        );
        if (inBank) {
          excluded = true;
          note = "Already counted in bank UPI";
          break;
        }
      }
    }

    processed.push({
      ...row,
      excludedFromTotal: excluded,
      ...(note ? { note } : {}),
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

  const { priorYearBalance, rows: sponsorshipWithoutPrior } = splitPreviousBalance(
    sponsorship.rows,
  );

  const sponsorshipAdjusted = applySponsorshipBankDedup(
    sponsorshipWithoutPrior,
    bankTransactions,
  );

  const totalCollection =
    bankTotal + priorYearBalance + sponsorshipAdjusted.total;
  const balance = totalCollection - expense.total;

  const priorPattern = (config.sponsorshipPreviousBalancePattern || "previous balance")
    .trim()
    .toLowerCase();

  /** @type {SponsorshipOverlapRow[]} */
  const sponsorshipBankOverlapRows = [];
  let sponsorshipBankOverlapTotal = 0;

  for (const row of sponsorshipAdjusted.rows) {
    if (priorPattern && row.name.toLowerCase().includes(priorPattern)) continue;
    if (row.excludedFromTotal && row.note === "Already counted in bank UPI") {
      sponsorshipBankOverlapRows.push({ name: row.name, amount: row.amount });
      sponsorshipBankOverlapTotal += row.amount;
    }
  }

  const sponsorshipRows = sponsorshipAdjusted.rows.filter(
    (row) =>
      !row.excludedFromTotal &&
      (!priorPattern || !row.name.toLowerCase().includes(priorPattern)),
  );

  return {
    bankTotal,
    priorYearBalance,
    sponsorshipTotal: sponsorshipAdjusted.total,
    sponsorshipBankOverlapTotal,
    sponsorshipBankOverlapRows,
    totalCollection,
    totalExpense: expense.total,
    balance,
    sponsorshipRows,
    expenseItemCount: expense.itemCount,
    fetchedAt: new Date().toISOString(),
  };
}
