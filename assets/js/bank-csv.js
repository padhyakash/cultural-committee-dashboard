import { config } from "./config.js";

/**
 * @typedef {{ date: string, dateSort: number, upi: string, amount: number, type: string, status: string, rrn: string }} BankTransaction
 */

/** @param {string} line */
function parseCsvLine(line) {
  /** @type {string[]} */
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** @param {string} text */
function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    /** @type {Record<string, string>} */
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? "";
    });
    return row;
  });
  return { headers, rows };
}

/** @param {string} raw */
function parseAmount(raw) {
  if (!raw?.trim()) return null;
  const n = Number(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** @param {string} raw */
function formatDisplayDate(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return "—";
  const d = new Date(trimmed.replace(" ", "T"));
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return trimmed;
}

/** @param {string} raw */
function parseSortableDate(raw) {
  const d = new Date(raw.trim().replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/** @param {string} upi */
function normalizeUpi(upi) {
  return upi.trim().toLowerCase();
}

/** @param {Record<string, string>} row */
function rowToTransaction(row) {
  const status = (row["TRANSACTION STATUS"] ?? "").trim().toUpperCase();
  if (status && status !== "SUCCESS") return null;

  const amount = parseAmount(row["TRANSACTION AMOUNT"]);
  if (amount === null || amount <= 0) return null;

  const upiRaw = (row["CARD NUMBER"] ?? row["UPI ID"] ?? "").trim();
  if (!upiRaw || !upiRaw.includes("@")) return null;

  const dateRaw = row["TRANSACTION DATE"] ?? "";
  if (!dateRaw) return null;

  return {
    date: formatDisplayDate(dateRaw),
    dateSort: parseSortableDate(dateRaw),
    upi: normalizeUpi(upiRaw),
    amount,
    type: (row["TRANSACTION TYPE"] ?? "").trim() || "—",
    status: status || "SUCCESS",
    rrn: (row["RRN"] ?? "").trim(),
  };
}

/** @param {string} path */
async function loadOneCsv(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} (${res.status})`);
  const { rows } = parseCsv(await res.text());
  /** @type {BankTransaction[]} */
  const items = [];
  for (const row of rows) {
    const tx = rowToTransaction(row);
    if (tx) items.push(tx);
  }
  return items;
}

/** @returns {Promise<BankTransaction[]>} */
export async function loadBankTransactions() {
  const files = config.contributions?.csvFiles ?? [];
  if (!files.length) return [];

  /** @type {BankTransaction[]} */
  const all = [];
  const errors = [];

  for (const file of files) {
    try {
      all.push(...(await loadOneCsv(file)));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `Failed ${file}`);
    }
  }

  if (!all.length && errors.length) {
    throw new Error(errors.join("; "));
  }

  all.sort((a, b) => b.dateSort - a.dateSort);
  return all;
}

/** @param {BankTransaction[]} transactions */
export function sumBankTransactions(transactions) {
  return transactions.reduce((sum, row) => sum + row.amount, 0);
}
