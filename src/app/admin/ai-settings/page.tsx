import { adminClient } from "@/lib/supabase/admin";
import { listProviders, SUPPORTED_PROVIDERS } from "@/lib/ai/providers";
import { PageHeader } from "@/components/admin/ui";
import AiSettingsClient from "./AiSettingsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AiSettingsPage() {
  // The admin layout already gates access; safe to read with the service role.
  let providers: Awaited<ReturnType<typeof listProviders>> = [];
  let loadError: string | null = null;
  try {
    providers = await listProviders(adminClient());
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load AI settings.";
  }

  const needsMigration =
    loadError != null &&
    /column .* does not exist|token_budget|usage_requests|last_ok_at/i.test(
      loadError
    );

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <PageHeader
        title="AI tagging"
        description="Connect Claude, OpenAI, or OpenRouter to auto-tag draft dishes. Add a key, test it, and switch one model on for tagging. Keys are encrypted at rest and never shown again."
      />
      {loadError ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-ink">
          {needsMigration ? (
            <>
              <p className="font-semibold">Database migration needed</p>
              <p className="mt-1 text-ink/70">
                Run the latest migration in Supabase, then reload:
              </p>
              <code className="mt-2 block rounded bg-white/70 px-3 py-2 text-xs">
                supabase/migrations/20260711000000_ai_provider_usage.sql
              </code>
            </>
          ) : (
            <>
              <p className="font-semibold">Couldn’t load AI settings</p>
              <p className="mt-1 text-ink/70">{loadError}</p>
            </>
          )}
        </div>
      ) : (
        <AiSettingsClient initial={providers} supported={SUPPORTED_PROVIDERS} />
      )}
    </div>
  );
}
