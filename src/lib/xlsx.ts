import "server-only";
import ExcelJS from "exceljs";
import { IMPORT_COLUMNS } from "@/lib/import-validate";

/** Build the import template workbook: header row + one example row. */
export async function buildTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("dishes");
  ws.addRow([...IMPORT_COLUMNS]);
  ws.getRow(1).font = { bold: true };
  // Example row so the expected formats are obvious. The 6 trailing weight
  // columns (heaviness…warmth) are optional 0–1 numbers; leave blank for 0.5.
  ws.addRow([
    "Chicken Shawarma",
    32,
    "Garlicky shawarma with fries and pickles.",
    "https://example.com/shawarma.jpg",
    "lebanese",
    "chicken",
    "roasted",
    "afternoon, evening, night",
    "talabat https://talabat.com/... ; deliveroo https://deliveroo.ae/...",
    0.65, // heaviness
    0.3, // spiciness
    0.3, // price_tier
    0.35, // healthiness
    0.2, // adventurousness
    0.8, // warmth
  ]);
  ws.columns.forEach((c) => {
    c.width = 22;
  });
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Parse an uploaded .xlsx into raw row objects keyed by the template columns.
 * Uses the first worksheet; maps by header name so column order is forgiving.
 * Returns only rows that have at least one non-empty cell.
 */
export async function parseWorkbook(
  buffer: Buffer
): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  // exceljs's Buffer type lags @types/node's generic Buffer; runtime is fine.
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  // Header row → column index map.
  const headerRow = ws.getRow(1);
  const colByIndex = new Map<number, string>();
  headerRow.eachCell((cellObj, colNumber) => {
    const header = String(cellObj.value ?? "").trim().toLowerCase();
    if ((IMPORT_COLUMNS as readonly string[]).includes(header)) {
      colByIndex.set(colNumber, header);
    }
  });

  const rows: Record<string, string>[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const obj: Record<string, string> = {};
    let hasValue = false;
    colByIndex.forEach((key, colNumber) => {
      const raw = row.getCell(colNumber).value;
      const val = cellToString(raw);
      if (val) hasValue = true;
      obj[key] = val;
    });
    if (hasValue) rows.push(obj);
  });

  return rows;
}

function cellToString(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    // Rich text / hyperlink / formula result objects.
    const o = v as { text?: string; result?: unknown; hyperlink?: string };
    if (typeof o.text === "string") return o.text.trim();
    if (o.result !== undefined) return String(o.result).trim();
    if (typeof o.hyperlink === "string") return o.hyperlink.trim();
    return "";
  }
  return String(v).trim();
}
