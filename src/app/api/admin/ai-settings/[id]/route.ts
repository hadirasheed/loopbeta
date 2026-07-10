import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminClient } from "@/lib/supabase/admin";
import {
  setEnabled,
  setActive,
  updateProvider,
  resetUsage,
  deleteProvider,
} from "@/lib/ai/providers";

export const runtime = "nodejs";

// PATCH /api/admin/ai-settings/[id] — toggle enabled/active, edit fields, or
// reset usage counters.
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/ai-settings/[id]">
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
  }
  const { id } = await ctx.params;

  let body: {
    is_enabled?: unknown;
    activate?: unknown;
    model?: unknown;
    label?: unknown;
    apiKey?: unknown;
    tokenBudget?: unknown;
    resetUsage?: unknown;
  };
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
    if (typeof body.activate === "boolean") {
      await setActive(db, id, body.activate);
    }
    if (body.resetUsage === true) {
      await resetUsage(db, id);
    }

    // Field edits (model / label / key / budget).
    const edit: {
      model?: string;
      label?: string;
      apiKey?: string;
      tokenBudget?: number | null;
    } = {};
    if (typeof body.model === "string") edit.model = body.model;
    if (typeof body.label === "string") edit.label = body.label;
    if (typeof body.apiKey === "string" && body.apiKey.trim()) {
      edit.apiKey = body.apiKey;
    }
    if (body.tokenBudget !== undefined) {
      edit.tokenBudget =
        typeof body.tokenBudget === "number" && Number.isFinite(body.tokenBudget)
          ? Math.max(0, Math.round(body.tokenBudget))
          : null;
    }
    if (Object.keys(edit).length > 0) {
      await updateProvider(db, id, edit);
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
