import {
  DAYPARTS,
  SEASONS,
  type DeliveryApp,
} from "@/lib/types";

/** Columns in the import template, in order. No attribute columns by design —
 *  attributes are set later (AI pre-tag / the review sliders). */
export const IMPORT_COLUMNS = [
  "name",
  "price",
  "description",
  "image_url",
  "cuisine",
  "main_protein",
  "prep_style",
  "dayparts",
  "seasons",
  "delivery_apps",
] as const;

export interface ParsedDish {
  name: string;
  price: number | null;
  description: string | null;
  image_url: string | null;
  cuisine: string | null;
  main_protein: string | null;
  prep_style: string | null;
  dayparts: string[];
  seasons: string[];
  delivery_apps: DeliveryApp[];
}

export interface RowResult {
  data: ParsedDish;
  errors: string[]; // fatal — row cannot be imported
  warnings: string[]; // non-fatal — row imported with the noted values dropped
}

function cell(raw: Record<string, unknown>, key: string): string {
  const v = raw[key];
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function splitList(s: string): string[] {
  return s
    .split(/[,;]/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * delivery_apps cell format: "app url" pairs separated by ";".
 *   e.g. "talabat https://... ; deliveroo https://..."
 * The first whitespace splits the app name from the URL.
 */
function parseDeliveryApps(s: string): { apps: DeliveryApp[]; bad: string[] } {
  const apps: DeliveryApp[] = [];
  const bad: string[] = [];
  if (!s) return { apps, bad };
  for (const part of s.split(";")) {
    const t = part.trim();
    if (!t) continue;
    const m = t.match(/^(\S+)\s+(\S.*)$/);
    if (!m) {
      bad.push(t);
      continue;
    }
    apps.push({ app: m[1].toLowerCase(), url: m[2].trim() });
  }
  return { apps, bad };
}

/** Validate + normalize a single raw import row (from xlsx or JSON). */
export function validateImportRow(raw: Record<string, unknown>): RowResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const name = cell(raw, "name");
  if (!name) errors.push("Missing name");

  let price: number | null = null;
  const priceStr = cell(raw, "price");
  if (priceStr) {
    const p = Number(priceStr);
    if (!Number.isFinite(p) || p < 0) {
      errors.push(`Invalid price "${priceStr}"`);
    } else {
      price = p;
    }
  }

  const dpAll = splitList(cell(raw, "dayparts"));
  const dayparts = dpAll.filter((x) => (DAYPARTS as readonly string[]).includes(x));
  const badDp = dpAll.filter((x) => !dayparts.includes(x));
  if (badDp.length) warnings.push(`Ignored dayparts: ${badDp.join(", ")}`);

  const seAll = splitList(cell(raw, "seasons"));
  const seasons = seAll.filter((x) => (SEASONS as readonly string[]).includes(x));
  const badSe = seAll.filter((x) => !seasons.includes(x));
  if (badSe.length) warnings.push(`Ignored seasons: ${badSe.join(", ")}`);

  const { apps, bad } = parseDeliveryApps(cell(raw, "delivery_apps"));
  if (bad.length) warnings.push(`Skipped delivery entries: ${bad.join(" | ")}`);

  const str = (k: string) => cell(raw, k) || null;

  return {
    data: {
      name,
      price,
      description: str("description"),
      image_url: str("image_url"),
      cuisine: str("cuisine"),
      main_protein: str("main_protein"),
      prep_style: str("prep_style"),
      dayparts,
      seasons,
      delivery_apps: apps,
    },
    errors,
    warnings,
  };
}
