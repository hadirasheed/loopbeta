import type { Daypart, Season, Dish } from "@/lib/types";

/** Map an hour (0–23) to a daypart bucket. */
export function currentDaypart(now: Date = new Date()): Daypart {
  const h = now.getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 22) return "evening";
  return "night";
}

/** Map the calendar month to a season (Northern hemisphere). */
export function currentSeason(now: Date = new Date()): Season {
  const m = now.getMonth(); // 0 = Jan
  if (m <= 1 || m === 11) return "winter"; // Dec–Feb
  if (m <= 4) return "spring"; // Mar–May
  if (m <= 7) return "summer"; // Jun–Aug
  return "autumn"; // Sep–Nov
}

/**
 * Keep a dish if it's available now: an empty (or null) dayparts/seasons list
 * means "no restriction", otherwise the current daypart/season must be listed.
 */
export function filterByAvailability(
  dishes: Dish[],
  daypart: Daypart,
  season: Season
): Dish[] {
  return dishes.filter((d) => {
    const dp = d.available_dayparts ?? [];
    const se = d.seasons ?? [];
    if (dp.length > 0 && !dp.includes(daypart)) return false;
    if (se.length > 0 && !se.includes(season)) return false;
    return true;
  });
}
