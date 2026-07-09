import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminClient } from "@/lib/supabase/admin";
import { parseDishInput } from "@/lib/dish-input";

// PUT /api/admin/dishes/[id] — update a dish (admin only).
export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/dishes/[id]">
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
  }
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseDishInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Preserve the lifecycle/tagging fields when a caller (e.g. the current
  // edit form) doesn't send them, so an edit can't silently unpublish a dish
  // or wipe its tags/dayparts/seasons.
  const b = body as Record<string, unknown>;
  const update: Record<string, unknown> = { ...parsed.value };
  for (const key of ["status", "tags", "available_dayparts", "seasons"]) {
    if (!(key in b)) delete update[key];
  }

  const db = adminClient();
  const { error } = await db.from("dishes").update(update).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id });
}

// DELETE /api/admin/dishes/[id] — delete a dish (admin only).
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/admin/dishes/[id]">
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
  }
  const { id } = await ctx.params;

  const db = adminClient();
  const { error } = await db.from("dishes").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
