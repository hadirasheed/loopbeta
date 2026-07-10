import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminClient } from "@/lib/supabase/admin";
import { pingProvider } from "@/lib/ai/providers";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/admin/ai-settings/[id]/ping — run a health check against the stored
// key + model. A failed check is a valid outcome (200 with ok:false + a mapped
// error), so the UI can show exactly what went wrong. Admin only.
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/admin/ai-settings/[id]/ping">
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
  }
  const { id } = await ctx.params;

  try {
    const outcome = await pingProvider(adminClient(), id);
    return NextResponse.json(outcome);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Test failed." },
      { status: 400 }
    );
  }
}
