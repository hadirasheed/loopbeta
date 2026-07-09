import type { Dish, UserConstraints } from "@/lib/types";

/**
 * Applies the user's permanent hard filters to the catalog:
 *   - vegetarian → only is_veg dishes
 *   - halal-only → only is_halal dishes
 *   - allergens  → drop any dish containing a flagged allergen
 */
export function filterEligible(
  dishes: Dish[],
  constraints: UserConstraints | null
): Dish[] {
  if (!constraints) return dishes;
  const blocked = new Set(constraints.allergens ?? []);
  return dishes.filter((d) => {
    if (constraints.is_veg && !d.is_veg) return false;
    if (constraints.is_halal && !d.is_halal) return false;
    for (const a of d.allergens ?? []) {
      if (blocked.has(a)) return false;
    }
    return true;
  });
}
