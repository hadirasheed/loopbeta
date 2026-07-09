import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminClient } from "@/lib/supabase/admin";
import { parseDishInput } from "@/lib/dish-input";

// POST /api/admin/dishes — create a dish (admin only).
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
  }

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

  const db = adminClient();
  const { data, error } = await db
    .from("dishes")
    .insert(parsed.value)
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
