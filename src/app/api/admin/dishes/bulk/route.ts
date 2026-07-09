import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminClient } from "@/lib/supabase/admin";
import { parseDishPatch } from "@/lib/dish-input";

/**
 * POST /api/admin/dishes/bulk — apply one normalized patch to many dishes.
 * Body: { ids: string[], patch: { status?, tags?, available_dayparts?, seasons? } }
 * Used by the review screen's bulk-set / bulk-publish actions. Admin only.
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
  }

  let body: { ids?: unknown; patch?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is string => typeof x === "string")
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "No dishes selected." }, { status: 400 });
  }

  const parsed = parseDishPatch(body.patch);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (Object.keys(parsed.patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const db = adminClient();
  const { error } = await db.from("dishes").update(parsed.patch).in("id", ids);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: ids.length });
}
