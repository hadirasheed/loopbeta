import type { Daypart, Dish } from "@/lib/types";

/** Map an hour (0–23) to a daypart bucket. */
export function currentDaypart(now: Date = new Date()): Daypart {
  const h = now.getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 22) return "evening";
  return "night";
}

/**
 * Keep a dish if it's available at the current daypart: an empty (or null)
 * dayparts list means "no restriction". (Seasons were removed from the model.)
 */
export function filterByAvailability(dishes: Dish[], daypart: Daypart): Dish[] {
  return dishes.filter((d) => {
    const dp = d.available_dayparts ?? [];
    return dp.length === 0 || dp.includes(daypart);
  });
}
