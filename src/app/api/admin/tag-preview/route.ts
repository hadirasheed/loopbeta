import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminClient } from "@/lib/supabase/admin";
import { resolveTagger, recordUsage } from "@/lib/ai/providers";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/admin/tag-preview — AI-fill attributes + tags for a single dish
// name/description, without requiring the dish to exist yet. Used by the add
// / edit dish form to fill weights before the admin saves or publishes; it
// never writes to the dishes table itself. Admin only.
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
  }

  let body: { name?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "Enter a dish name first." },
      { status: 400 }
    );
  }

  const db = adminClient();
  const tagger = await resolveTagger(db);
  if (!tagger) {
    return NextResponse.json(
      { error: "No active tagging model. Configure one in AI settings." },
      { status: 400 }
    );
  }

  try {
    const { attributes, tags, usage } = await tagger.adapter.tag(
      name,
      description || null,
      tagger.ctx
    );
    await recordUsage(db, tagger.id, { usage, ok: true }).catch(() => {});
    return NextResponse.json({ attributes, tags });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Tagging failed.";
    await recordUsage(db, tagger.id, { ok: false, error }).catch(() => {});
    return NextResponse.json({ error }, { status: 502 });
  }
}
