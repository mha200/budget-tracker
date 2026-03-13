import Papa from "papaparse";

export type ParsedRow = {
  rowIndex: number;
  date: string; // yyyy-mm-dd
  description: string;
  amount: number; // always positive
  isCredit: boolean;
  included: boolean;
};

export type ParseResult =
  | { success: true; rows: ParsedRow[]; detectedFormat: string }
  | { success: false; error: string };

const DATE_PATTERNS = [
  "date",
  "transaction date",
  "post date",
  "posting date",
  "trans date",
];
const DESC_PATTERNS = [
  "description",
  "memo",
  "payee",
  "merchant",
  "transaction description",
  "merchant name",
  "name",
];
const AMOUNT_PATTERNS = ["amount", "transaction amount"];
const DEBIT_PATTERNS = ["debit", "debit amount", "withdrawals"];
const CREDIT_PATTERNS = ["credit", "credit amount", "deposits"];

function matchHeader(header: string, patterns: string[]): boolean {
  const h = header.toLowerCase().trim();
  return patterns.some((p) => h === p || h.includes(p));
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Try yyyy-mm-dd
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const d = new Date(trimmed + "T12:00:00");
    if (!isNaN(d.getTime())) return formatISO(d);
  }

  // Try mm/dd/yyyy or m/d/yyyy
  const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    let [, m, d, y] = slashMatch;
    if (y.length === 2) y = (Number(y) > 50 ? "19" : "20") + y;
    const date = new Date(Number(y), Number(m) - 1, Number(d), 12);
    if (!isNaN(date.getTime())) return formatISO(date);
  }

  return null;
}

function formatISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseAmount(raw: string): number | null {
  if (!raw || !raw.trim()) return null;
  const cleaned = raw.replace(/[$,\s"]/g, "").trim();
  if (!cleaned) return null;
  // Handle parentheses for negative: (123.45) → -123.45
  const parenMatch = cleaned.match(/^\((.+)\)$/);
  const num = parseFloat(parenMatch ? `-${parenMatch[1]}` : cleaned);
  return isNaN(num) ? null : num;
}

function detectColumns(
  headers: string[]
): {
  dateCol: number;
  descCol: number;
  amountCol: number | null;
  debitCol: number | null;
  creditCol: number | null;
} | null {
  let dateCol = -1;
  let descCol = -1;
  let amountCol: number | null = null;
  let debitCol: number | null = null;
  let creditCol: number | null = null;

  headers.forEach((h, i) => {
    if (dateCol === -1 && matchHeader(h, DATE_PATTERNS)) dateCol = i;
    if (descCol === -1 && matchHeader(h, DESC_PATTERNS)) descCol = i;
    if (amountCol === null && matchHeader(h, AMOUNT_PATTERNS)) amountCol = i;
    if (debitCol === null && matchHeader(h, DEBIT_PATTERNS)) debitCol = i;
    if (creditCol === null && matchHeader(h, CREDIT_PATTERNS)) creditCol = i;
  });

  if (dateCol === -1 || descCol === -1) return null;
  if (amountCol === null && debitCol === null) return null;

  return { dateCol, descCol, amountCol, debitCol, creditCol };
}

export function parseCSV(csvText: string): ParseResult {
  const result = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    return { success: false, error: "Could not parse CSV file." };
  }

  if (result.data.length < 2) {
    return {
      success: false,
      error: "CSV file must have a header row and at least one data row.",
    };
  }

  // Try first row as headers
  let headers = result.data[0];
  let cols = detectColumns(headers);
  let startRow = 1;

  // If detection fails, try second row (some CSVs have metadata on row 1)
  if (!cols && result.data.length > 2) {
    headers = result.data[1];
    cols = detectColumns(headers);
    startRow = 2;
  }

  if (!cols) {
    return {
      success: false,
      error:
        'Could not detect columns. Your CSV should have columns for Date, Description, and Amount (or Debit/Credit). Common headers like "Date", "Description", and "Amount" are recognized automatically.',
    };
  }

  const rows: ParsedRow[] = [];
  let format = "Bank Statement";

  for (let i = startRow; i < result.data.length; i++) {
    const row = result.data[i];
    if (!row || row.length < 2) continue;

    const dateStr = parseDate(row[cols.dateCol] || "");
    if (!dateStr) continue; // skip rows without valid dates

    const description = (row[cols.descCol] || "").trim();
    if (!description) continue;

    let amount = 0;
    let isCredit = false;

    if (cols.amountCol !== null) {
      const raw = parseAmount(row[cols.amountCol] || "");
      if (raw === null) continue;
      // Negative amounts in a single "Amount" column typically mean credits/payments
      isCredit = raw < 0;
      amount = Math.abs(raw);
    } else {
      // Debit/Credit columns
      const debit = parseAmount(row[cols.debitCol!] || "");
      const credit = cols.creditCol !== null ? parseAmount(row[cols.creditCol] || "") : null;

      if (debit && debit > 0) {
        amount = debit;
        isCredit = false;
      } else if (credit && credit > 0) {
        amount = credit;
        isCredit = true;
      } else {
        continue; // no valid amount
      }
    }

    rows.push({
      rowIndex: i,
      date: dateStr,
      description,
      amount,
      isCredit,
      included: amount > 0, // exclude zero-amount rows
    });
  }

  if (rows.length === 0) {
    return {
      success: false,
      error: "No valid transactions found in the CSV file.",
    };
  }

  // Try to identify format from headers
  const headerJoined = headers.join(",").toLowerCase();
  if (headerJoined.includes("post date") && headerJoined.includes("category")) {
    format = "Chase Credit Card";
  } else if (headerJoined.includes("posted date") && headerJoined.includes("payee")) {
    format = "Bank of America";
  }

  return { success: true, rows, detectedFormat: format };
}
