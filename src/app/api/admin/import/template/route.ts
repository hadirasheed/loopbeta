import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { buildTemplate } from "@/lib/xlsx";

export const runtime = "nodejs";

// GET /api/admin/import/template — download the .xlsx import template.
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
  }

  const buffer = await buildTemplate();
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="dishes-import-template.xlsx"',
    },
  });
}
