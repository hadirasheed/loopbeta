import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminClient } from "@/lib/supabase/admin";
import { resolveTagger } from "@/lib/ai/providers";
import type { DishAttributes } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BATCH = 25;

interface ItemResult {
  id: string;
  name: string;
  ok: boolean;
  error?: string;
  attributes?: DishAttributes;
  tags?: string[];
}

// POST /api/admin/tag-batch — AI-tag the given draft dishes. Writes attributes
// + tags but NEVER changes status (never auto-publishes). Malformed replies
// flag that dish instead of failing the whole batch. Admin only.
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
  }

  let body: { ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is string => typeof x === "string")
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "No dishes selected" }, { status: 400 });
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Too many at once (max ${MAX_BATCH}).` },
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

  const { data: dishes, error } = await db
    .from("dishes")
    .select("id, name, description")
    .in("id", ids);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: ItemResult[] = [];
  for (const dish of dishes ?? []) {
    try {
      const { attributes, tags } = await tagger.adapter.tag(
        dish.name,
        dish.description ?? null,
        tagger.ctx
      );
      const { error: upErr } = await db
        .from("dishes")
        .update({ attributes, tags })
        .eq("id", dish.id);
      if (upErr) throw new Error(upErr.message);
      results.push({
        id: dish.id,
        name: dish.name,
        ok: true,
        attributes,
        tags,
      });
    } catch (e) {
      // Flag for manual tagging; keep going through the batch.
      results.push({
        id: dish.id,
        name: dish.name,
        ok: false,
        error: e instanceof Error ? e.message : "Tagging failed",
      });
    }
  }

  const tagged = results.filter((r) => r.ok).length;
  return NextResponse.json({
    results,
    tagged,
    failed: results.length - tagged,
  });
}
