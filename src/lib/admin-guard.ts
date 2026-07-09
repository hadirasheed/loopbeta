import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";

export type AdminGuardResult =
  | { ok: true; email: string }
  | { ok: false; status: 401 | 403 };

/**
 * Server-side admin check for write endpoints. Verifies there is a signed-in
 * user AND that their email is in ADMIN_EMAILS. Never trust the client — every
 * catalog-write route must call this before touching the service-role client.
 */
export async function requireAdmin(): Promise<AdminGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, status: 401 };
  if (!isAdminEmail(user.email)) return { ok: false, status: 403 };
  return { ok: true, email: user.email! };
}
