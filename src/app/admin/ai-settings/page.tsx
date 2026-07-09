import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { listProviders, SUPPORTED_PROVIDERS } from "@/lib/ai/providers";
import AiSettingsClient from "./AiSettingsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AiSettingsPage() {
  // The admin layout already gates access; safe to read with the service role.
  const providers = await listProviders(adminClient());

  return (
    <main className="flex flex-1 flex-col gap-6 p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">AI tagging settings</h1>
        <Link
          href="/admin"
          className="text-sm text-black/50 underline underline-offset-4 dark:text-white/50"
        >
          Back to catalog
        </Link>
      </div>
      <p className="max-w-prose text-sm text-black/60 dark:text-white/60">
        Add a model, then mark exactly one as active for tagging. The active
        model is used by the &quot;Pre-tag batch&quot; button on the review
        screen. API keys are encrypted at rest and never shown again.
      </p>
      <AiSettingsClient
        initial={providers}
        supported={SUPPORTED_PROVIDERS}
      />
    </main>
  );
}
