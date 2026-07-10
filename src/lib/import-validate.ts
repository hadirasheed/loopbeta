import {
  ATTRIBUTE_KEYS,
  DAYPARTS,
  type DeliveryApp,
  type DishAttributes,
} from "@/lib/types";

/**
 * Columns in the import template, in order. The 6 attribute weight columns are
 * OPTIONAL — leave them blank to default to 0.5 and set them later (AI pre-tag
 * or the review screen).
 */
export const IMPORT_COLUMNS = [
  "name",
  "price",
  "description",
  "image_url",
  "cuisine",
  "main_protein",
  "prep_style",
  "dayparts",
  "delivery_apps",
  ...ATTRIBUTE_KEYS,
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
  delivery_apps: DeliveryApp[];
  attributes: DishAttributes;
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

  const { apps, bad } = parseDeliveryApps(cell(raw, "delivery_apps"));
  if (bad.length) warnings.push(`Skipped delivery entries: ${bad.join(" | ")}`);

  // Attribute weights: optional, clamp to 0..1, default 0.5 when blank.
  const attributes = {} as DishAttributes;
  const badAttrs: string[] = [];
  for (const k of ATTRIBUTE_KEYS) {
    const s = cell(raw, k);
    if (!s) {
      attributes[k] = 0.5;
      continue;
    }
    const n = Number(s);
    if (!Number.isFinite(n)) {
      badAttrs.push(`${k}="${s}"`);
      attributes[k] = 0.5;
    } else {
      attributes[k] = Math.min(1, Math.max(0, n));
    }
  }
  if (badAttrs.length) warnings.push(`Ignored weights: ${badAttrs.join(", ")}`);

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
      delivery_apps: apps,
      attributes,
    },
    errors,
    warnings,
  };
}
