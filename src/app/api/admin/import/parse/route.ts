import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { parseWorkbook } from "@/lib/xlsx";
import { validateImportRow } from "@/lib/import-validate";

export const runtime = "nodejs";

// POST /api/admin/import/parse — multipart upload of an .xlsx; returns parsed +
// validated rows for preview. Does NOT write anything.
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Expected a file upload" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  let rawRows: Record<string, string>[];
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    rawRows = await parseWorkbook(buffer);
  } catch {
    return NextResponse.json(
      { error: "Could not read the file — is it a valid .xlsx?" },
      { status: 400 }
    );
  }

  const items = rawRows.map((raw, i) => {
    const result = validateImportRow(raw);
    return {
      index: i + 2, // 1-based, +1 for the header row → matches the spreadsheet
      raw,
      data: result.data,
      errors: result.errors,
      warnings: result.warnings,
    };
  });

  const validCount = items.filter((it) => it.errors.length === 0).length;
  return NextResponse.json({
    items,
    total: items.length,
    validCount,
    invalidCount: items.length - validCount,
  });
}
