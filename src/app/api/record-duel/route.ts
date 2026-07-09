import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computePayload } from "@/lib/engine/advance";
import { loadOrInitTaste } from "@/lib/engine/db";
import { bradleyTerryUpdate } from "@/lib/engine/update";
import { currentDaypart } from "@/lib/engine/time-context";
import type { DishAttributes, DuelWinner } from "@/lib/types";

const WINNERS: DuelWinner[] = ["a", "b", "neither"];

// POST /api/record-duel — append the duel, apply the Bradley–Terry update to
// user_taste, then return the next duel or the committed result.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    sessionId?: string;
    dishA?: string;
    dishB?: string;
    winner?: DuelWinner;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { sessionId, dishA, dishB, winner } = body;
  if (!sessionId || !dishA || !dishB || !winner || !WINNERS.includes(winner)) {
    return NextResponse.json(
      { error: "sessionId, dishA, dishB, winner required" },
      { status: 400 }
    );
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, mood, committed_dish_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  // Already decided — don't record more; just return the result.
  if (session.committed_dish_id) {
    const payload = await computePayload(supabase, user.id, sessionId);
    return NextResponse.json(payload);
  }

  // round_index = number of duels already recorded.
  const { count } = await supabase
    .from("duels")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  const roundIndex = count ?? 0;

  const now = new Date();
  const { error: insertError } = await supabase.from("duels").insert({
    session_id: sessionId,
    user_id: user.id,
    dish_a: dishA,
    dish_b: dishB,
    winner,
    context: {
      daypart: currentDaypart(now),
      weekday: now.getUTCDay(),
      mood: session.mood ?? null,
    },
    round_index: roundIndex,
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Bradley–Terry update toward the winner (skip on "neither").
  if (winner !== "neither") {
    const { data: pair } = await supabase
      .from("dishes")
      .select("id, attributes")
      .in("id", [dishA, dishB]);
    const attrsById = new Map(
      (pair ?? []).map((d) => [d.id as string, d.attributes as DishAttributes])
    );
    const winnerAttrs = attrsById.get(winner === "a" ? dishA : dishB);
    const loserAttrs = attrsById.get(winner === "a" ? dishB : dishA);
    if (winnerAttrs && loserAttrs) {
      const weights = await loadOrInitTaste(supabase, user.id);
      const updated = bradleyTerryUpdate(weights, winnerAttrs, loserAttrs);
      await supabase
        .from("user_taste")
        .update({ weights: updated, updated_at: now.toISOString() })
        .eq("user_id", user.id);
    }
  }

  try {
    const payload = await computePayload(supabase, user.id, sessionId);
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
