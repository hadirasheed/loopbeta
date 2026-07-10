import { adminClient } from "@/lib/supabase/admin";
import {
  ATTRIBUTE_KEYS,
  type TasteWeights,
  type AttributeKey,
} from "@/lib/types";
import { kuwaitTime } from "@/lib/format";
import { PageHeader } from "@/components/admin/ui";
import UsersTable, { type UserRow } from "./UsersTable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const db = adminClient();

  const [{ data: authData }, profiles, constraints, tastes, sessions] =
    await Promise.all([
      db.auth.admin.listUsers({ perPage: 1000 }),
      db.from("profiles").select("user_id, name"),
      db.from("user_constraints").select("user_id, is_veg, is_halal, allergens"),
      db.from("user_taste").select("user_id, weights, updated_at"),
      db
        .from("sessions")
        .select("user_id, started_at, committed_dish_id, mood")
        .order("started_at", { ascending: false }),
    ]);

  const nameBy = new Map(
    (profiles.data ?? []).map((p) => [p.user_id as string, p.name as string])
  );
  const constrBy = new Map(
    (constraints.data ?? []).map((c) => [c.user_id as string, c])
  );
  const tasteBy = new Map(
    (tastes.data ?? []).map((t) => [
      t.user_id as string,
      t.weights as TasteWeights,
    ])
  );

  // Sessions (already newest-first) → per-user log.
  const logsBy = new Map<
    string,
    { started_at: string; decided: boolean; mood: string | null }[]
  >();
  for (const s of sessions.data ?? []) {
    const id = s.user_id as string;
    const arr = logsBy.get(id) ?? [];
    arr.push({
      started_at: s.started_at as string,
      decided: Boolean(s.committed_dish_id),
      mood: (s.mood as string | null) ?? null,
    });
    logsBy.set(id, arr);
  }

  const rows: UserRow[] = (authData?.users ?? []).map((u) => {
    const weights = tasteBy.get(u.id);
    const c = constrBy.get(u.id);
    const sessionLog = logsBy.get(u.id) ?? [];
    const use = { count: sessionLog.length, last: sessionLog[0]?.started_at ?? null };

    // Learned taste: variance starts at 1 (0% learned) and shrinks with use.
    let avgVar = 1;
    const means: { key: AttributeKey; mean: number }[] = ATTRIBUTE_KEYS.map(
      (k) => ({ key: k, mean: weights?.[k]?.mean ?? 0 })
    );
    if (weights) {
      const vars = ATTRIBUTE_KEYS.map((k) => weights[k]?.var ?? 1);
      avgVar = vars.reduce((a, b) => a + b, 0) / vars.length;
    }
    const learnedPct = Math.round(Math.min(1, Math.max(0, 1 - avgVar)) * 100);

    return {
      id: u.id,
      name: nameBy.get(u.id) ?? "",
      email: u.email ?? "",
      joined: kuwaitTime(u.created_at),
      lastUsed: use.last ? kuwaitTime(use.last) : "—",
      lastUsedIso: use.last,
      sessions: use.count,
      isVeg: Boolean(c?.is_veg),
      isHalal: c?.is_halal !== false && c != null,
      hasPrefs: c != null,
      allergens: (c?.allergens as string[] | undefined) ?? [],
      learnedPct,
      means,
      log: sessionLog.slice(0, 50).map((s) => ({
        at: kuwaitTime(s.started_at),
        decided: s.decided,
        mood: s.mood,
      })),
    };
  });

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <PageHeader
        title="Users"
        description={`${rows.length} registered · times shown in Kuwait time`}
      />
      <UsersTable rows={rows} />
    </div>
  );
}
