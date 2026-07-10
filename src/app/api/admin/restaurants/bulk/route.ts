import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/restaurants/bulk — bulk restaurant operations. Admin only.
 * Body: { ids: string[], action: "delete" }
 * Deleting a restaurant cascades to its dishes (see the migration).
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
  }

  let body: { ids?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is string => typeof x === "string")
    : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "No restaurants selected." },
      { status: 400 }
    );
  }
  if (body.action !== "delete") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const db = adminClient();
  const { error } = await db.from("restaurants").delete().in("id", ids);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ deleted: ids.length });
}
