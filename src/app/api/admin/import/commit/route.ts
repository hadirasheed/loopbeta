import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminClient } from "@/lib/supabase/admin";
import { validateImportRow } from "@/lib/import-validate";
import { ATTRIBUTE_KEYS, type DishAttributes } from "@/lib/types";

export const runtime = "nodejs";

// Neutral starting point; refined via AI pre-tag or the review sliders.
function defaultAttributes(): DishAttributes {
  return Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 0.5])) as DishAttributes;
}

// POST /api/admin/import/commit — insert validated rows as draft dishes under a
// restaurant. Re-validates server-side; never trusts the client's rows.
// Body: { restaurant_id: string, rows: Record<string,string>[] }
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
  }

  let body: { restaurant_id?: unknown; rows?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const restaurantId =
    typeof body.restaurant_id === "string" ? body.restaurant_id : "";
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurant_id required" }, { status: 400 });
  }
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const db = adminClient();

  // Confirm the restaurant exists (service-role bypasses RLS).
  const { data: restaurant } = await db
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .maybeSingle();
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const inserts: Record<string, unknown>[] = [];
  let skipped = 0;
  for (const raw of rows) {
    const result = validateImportRow(raw as Record<string, unknown>);
    if (result.errors.length > 0) {
      skipped++;
      continue;
    }
    const d = result.data;
    inserts.push({
      restaurant_id: restaurantId,
      name: d.name,
      price: d.price,
      description: d.description,
      image_url: d.image_url,
      cuisine: d.cuisine,
      main_protein: d.main_protein,
      prep_style: d.prep_style,
      attributes: defaultAttributes(),
      available_dayparts: d.dayparts,
      seasons: d.seasons,
      delivery_apps: d.delivery_apps,
      tags: [],
      is_veg: false,
      is_halal: true,
      allergens: [],
      status: "draft",
    });
  }

  if (inserts.length === 0) {
    return NextResponse.json(
      { error: "No valid rows to import", skipped },
      { status: 400 }
    );
  }

  const { error } = await db.from("dishes").insert(inserts);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: inserts.length, skipped });
}
