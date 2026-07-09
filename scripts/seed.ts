/**
 * Seed script: inserts the demo catalog over the Supabase REST API so the app
 * is runnable without manual data entry. The admin dashboard is the real way
 * to manage the catalog; this is demo data only.
 *
 * Usage:
 *   npm run seed            # aborts if dishes already exist
 *   npm run seed -- --force # wipes dishes + restaurants, then re-seeds
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * (loaded from .env.local via the npm script). If your network can't reach
 * Supabase directly, use `npm run seed:sql` to emit supabase/seed.sql and
 * paste it into the Supabase SQL Editor instead.
 */
import { createClient } from "@supabase/supabase-js";
import { IMAGES, restaurants, dishes } from "./seed-data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Copy .env.example to .env.local and fill it in first."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  const force = process.argv.includes("--force");

  const { count, error: countError } = await supabase
    .from("dishes")
    .select("id", { count: "exact", head: true });
  if (countError) throw countError;

  if ((count ?? 0) > 0) {
    if (!force) {
      console.error(
        `dishes already has ${count} rows. Re-run with --force to wipe and re-seed.`
      );
      process.exit(1);
    }
    console.log(`--force: deleting ${count} dishes and all restaurants...`);
    const { error: delDishes } = await supabase
      .from("dishes")
      .delete()
      .not("id", "is", null);
    if (delDishes) throw delDishes;
    const { error: delRestaurants } = await supabase
      .from("restaurants")
      .delete()
      .not("id", "is", null);
    if (delRestaurants) throw delRestaurants;
  }

  const { data: insertedRestaurants, error: rError } = await supabase
    .from("restaurants")
    .insert(restaurants)
    .select("id, name");
  if (rError) throw rError;

  const idByName = new Map(insertedRestaurants.map((r) => [r.name, r.id]));

  const dishRows = dishes.map((d, i) => ({
    restaurant_id: idByName.get(d.restaurant),
    name: d.name,
    image_url: IMAGES[i % IMAGES.length],
    price: d.price,
    description: d.description,
    attributes: d.attributes,
    cuisine: d.cuisine,
    main_protein: d.main_protein,
    prep_style: d.prep_style,
    is_veg: d.is_veg ?? false,
    is_halal: d.is_halal ?? true,
    allergens: d.allergens ?? [],
    delivery_apps: d.apps ?? [],
  }));

  const { error: dError } = await supabase.from("dishes").insert(dishRows);
  if (dError) throw dError;

  console.log(
    `Seeded ${insertedRestaurants.length} restaurants and ${dishRows.length} dishes.`
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
