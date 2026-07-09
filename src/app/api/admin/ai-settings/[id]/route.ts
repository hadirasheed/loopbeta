import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminClient } from "@/lib/supabase/admin";
import { setEnabled, setActive, deleteProvider } from "@/lib/ai/providers";

export const runtime = "nodejs";

// PATCH /api/admin/ai-settings/[id] — toggle enabled, or mark active-for-tagging.
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/ai-settings/[id]">
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
  }
  const { id } = await ctx.params;

  let body: { is_enabled?: unknown; activate?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = adminClient();
  try {
    if (typeof body.is_enabled === "boolean") {
      await setEnabled(db, id, body.is_enabled);
    }
    if (body.activate === true) {
      await setActive(db, id);
    }
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 400 }
    );
  }
}

// DELETE /api/admin/ai-settings/[id] — remove a model.
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/admin/ai-settings/[id]">
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
  }
  const { id } = await ctx.params;
  try {
    await deleteProvider(adminClient(), id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 }
    );
  }
}
