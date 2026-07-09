import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computePayload } from "@/lib/engine/advance";
import type { Mood } from "@/lib/types";

const MOODS: Mood[] = ["starving", "peckish", "browsing"];

// POST /api/session — start a new session (optional mood), return first pair.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let mood: Mood | null = null;
  try {
    const body = await request.json();
    if (MOODS.includes(body?.mood)) mood = body.mood;
  } catch {
    // no body / bad JSON — mood stays null
  }

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({ user_id: user.id, mood })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const payload = await computePayload(supabase, user.id, session.id);
    return NextResponse.json(payload, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to start session" },
      { status: 500 }
    );
  }
}
