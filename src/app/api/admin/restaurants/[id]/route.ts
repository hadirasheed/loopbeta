import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminClient } from "@/lib/supabase/admin";

// PATCH /api/admin/restaurants/[id] — edit a restaurant (admin only).
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/restaurants/[id]">
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

  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const area = typeof b.area === "string" ? b.area.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "Restaurant name is required." },
      { status: 400 }
    );
  }

  const db = adminClient();
  const { error } = await db
    .from("restaurants")
    .update({ name, area: area || null })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id });
}
