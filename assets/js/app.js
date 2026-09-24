import { config, sheetEditUrl } from "./config.js";
import {
  loadBankTransactions,
  sumBankTransactions,
} from "./bank-csv.js";
import { fetchFinanceSummary } from "./sheet.js";
import { initPhotosGallery } from "./photos.js";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const count = new Intl.NumberFormat("en-IN");

/** @param {number | null | undefined} value */
function formatCurrency(value) {
  if (value === null || value === undefined) return "—";
  return currency.format(value);
}

/** @param {number | null | undefined} value */
function formatCount(value) {
  if (value === null || value === undefined) return "—";
  return count.format(value);
}

/** @param {string} iso */
function formatRelativeTime(iso) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Date(iso).toLocaleString();
}

/** @param {string} text */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {string} value */
function normalizeUpiQuery(value) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

/** @type {import('./bank-csv.js').BankTransaction[]} */
let allTransactions = [];
/** @type {import('./sheet.js').FinanceSummary | null} */
let finance = null;
let refreshTimer = null;

const els = {
  lastSync: document.getElementById("last-sync"),
  refreshBtn: document.getElementById("refresh-btn"),
  errorBanner: document.getElementById("error-banner"),
  volunteerNote: document.getElementById("volunteer-note"),
  billsLink: /** @type {HTMLAnchorElement} */ (document.getElementById("bills-link")),
  metricBank: document.getElementById("metric-bank"),
  metricBankHint: document.getElementById("metric-bank-hint"),
  metricSponsorship: document.getElementById("metric-sponsorship"),
  metricCollection: document.getElementById("metric-collection"),
  metricExpense: document.getElementById("metric-expense"),
  metricExpenseHint: document.getElementById("metric-expense-hint"),
  metricBalance: document.getElementById("metric-balance"),
  metricBalanceHint: document.getElementById("metric-balance-hint"),
  upiSearch: /** @type {HTMLInputElement} */ (document.getElementById("upi-search")),
  transactionsTable: document.getElementById("transactions-table"),
  contribSummary: document.getElementById("contrib-summary"),
  contribEmpty: document.getElementById("contrib-empty"),
  sponsorshipTable: document.getElementById("sponsorship-table"),
  verifyLinks: document.getElementById("verify-links"),
  metricBalanceCard: document.getElementById("metric-balance-card"),
  thanksPanel: document.getElementById("thanks-panel"),
  thanksTitle: document.getElementById("thanks-title"),
  thanksResidents: document.getElementById("thanks-residents"),
  thanksVolunteers: document.getElementById("thanks-volunteers"),
  thanksVolunteerList: document.getElementById("thanks-volunteer-list"),
};

els.billsLink.href = config.billsDriveUrl;

function setupVerifyLinks() {
  const base =
    config.publicSiteUrl?.replace(/\/$/, "") ||
    window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "/");

  const links = [
    {
      label: "Google Sheet (Sponsorship & Expense tabs)",
      href: config.verify.googleSheet,
    },
    {
      label: "Bank statement CSV — Aug 2026",
      href: resolveAssetUrl(config.verify.bankCsvAug, base),
    },
    {
      label: "Bank statement CSV — Sep 2026",
      href: resolveAssetUrl(config.verify.bankCsvSep, base),
    },
  ];

  if (config.billsDriveUrl && !config.billsDriveUrl.includes("REPLACE")) {
    links.push({ label: "Bill screenshots (Google Drive)", href: config.billsDriveUrl });
  }

  els.verifyLinks.innerHTML = links
    .map(
      (item) =>
        `<li><a href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a></li>`,
    )
    .join("");
}

/** @param {string} path @param {string} base */
function resolveAssetUrl(path, base) {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.replace(/^\//, "");
  if (window.location.protocol !== "file:") {
    return `${window.location.origin}/${clean}`;
  }
  return `${base}${clean}`;
}

setupVerifyLinks();
initPhotosGallery();
renderThanks();

function renderThanks() {
  const thanks = config.thanks;
  if (
    !thanks ||
    !els.thanksPanel ||
    !els.thanksTitle ||
    !els.thanksResidents ||
    !els.thanksVolunteers ||
    !els.thanksVolunteerList
  ) {
    return;
  }

  els.thanksTitle.textContent = thanks.title || "Thank you";
  els.thanksResidents.textContent = thanks.toResidents || "";
  els.thanksVolunteers.textContent = thanks.toVolunteers || "";

  const names = (thanks.volunteerNames || []).filter(Boolean);
  els.thanksVolunteerList.innerHTML = names
    .map((name) => `<li><strong>${escapeHtml(name)}</strong></li>`)
    .join("");
  els.thanksVolunteerList.classList.toggle("hidden", names.length === 0);

  const hasContent =
    thanks.toResidents || thanks.toVolunteers || names.length > 0;
  els.thanksPanel.hidden = !hasContent;
}

function renderVolunteerNote() {
  if (!finance || finance.balance >= 0) {
    els.volunteerNote.classList.add("hidden");
    return;
  }

  const names = config.volunteerNames.filter(Boolean);
  const namesPart =
    names.length > 0
      ? ` Volunteers: ${names.map((name) => `<strong>${escapeHtml(name)}</strong>`).join(", ")}.`
      : " Volunteer names will be listed here once confirmed.";
  els.volunteerNote.innerHTML = `${escapeHtml(config.volunteerNote)}${namesPart}`;
  els.volunteerNote.classList.remove("hidden");
}

function renderFinance() {
  if (!finance) return;

  els.metricBank.textContent = formatCurrency(finance.bankTotal);
  els.metricBankHint.textContent = `${formatCount(allTransactions.length)} UPI payments`;
  els.metricSponsorship.textContent = formatCurrency(finance.sponsorshipTotal);
  els.metricCollection.textContent = formatCurrency(finance.totalCollection);
  els.metricExpense.textContent = formatCurrency(finance.totalExpense);
  els.metricExpenseHint.textContent = `${formatCount(finance.expenseItemCount)} expense items`;
  els.metricBalance.textContent = formatCurrency(finance.balance);
  els.metricBalance.className = "metric-value";
  if (finance.balance < 0) {
    els.metricBalance.classList.add("negative");
    els.metricBalanceHint.textContent = "Deficit (expenses exceed collection)";
  } else {
    els.metricBalance.classList.add("positive");
    els.metricBalanceHint.textContent = "Surplus";
  }

  els.metricBalanceCard?.classList.toggle("metric-card--deficit", finance.balance < 0);
  els.metricBalanceCard?.classList.toggle("metric-card--surplus", finance.balance >= 0);

  els.sponsorshipTable.innerHTML = finance.sponsorshipRows
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.name)}</td>
        <td class="num">${formatCurrency(row.amount)}</td>
      </tr>`,
    )
    .join("");

  els.lastSync.textContent = formatRelativeTime(finance.fetchedAt);
  renderVolunteerNote();
}

function renderTransactions() {
  const query = normalizeUpiQuery(els.upiSearch.value);
  const filtered = query
    ? allTransactions.filter((row) => row.upi.includes(query))
    : allTransactions;

  const total = filtered.reduce((sum, row) => sum + row.amount, 0);
  els.contribSummary.textContent =
    filtered.length === 0
      ? "No payments"
      : `${formatCount(filtered.length)} payment(s) · ${formatCurrency(total)}`;

  els.contribEmpty.classList.toggle("hidden", filtered.length > 0);
  els.transactionsTable.innerHTML = filtered
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.date)}</td>
        <td><code class="upi-cell">${escapeHtml(row.upi)}</code></td>
        <td class="num">${formatCurrency(row.amount)}</td>
        <td>${escapeHtml(row.type)}</td>
      </tr>`,
    )
    .join("");
}

function showError(message) {
  els.errorBanner.textContent = message;
  els.errorBanner.classList.remove("hidden");
}

function clearError() {
  els.errorBanner.classList.add("hidden");
}

async function refresh() {
  els.refreshBtn.disabled = true;
  try {
    allTransactions = await loadBankTransactions();
    const bankTotal = sumBankTransactions(allTransactions);
    finance = await fetchFinanceSummary(bankTotal);
    renderFinance();
    renderTransactions();
    clearError();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refresh failed";
    showError(message);
    renderTransactions();
    if (finance) renderFinance();
  } finally {
    els.refreshBtn.disabled = false;
  }
}

function scheduleRefresh() {
  if (refreshTimer) window.clearInterval(refreshTimer);
  refreshTimer = window.setInterval(() => {
    if (document.hidden) return;
    void refresh();
  }, config.refreshMs);
}

els.refreshBtn.addEventListener("click", () => void refresh());
els.upiSearch.addEventListener("input", () => renderTransactions());
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) void refresh();
});

window.setInterval(() => {
  if (finance) {
    els.lastSync.textContent = formatRelativeTime(finance.fetchedAt);
  }
}, 1000);

void refresh();
scheduleRefresh();
