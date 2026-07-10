import { adminClient } from "@/lib/supabase/admin";
import { listProviders, SUPPORTED_PROVIDERS } from "@/lib/ai/providers";
import { PageHeader } from "@/components/admin/ui";
import AiSettingsClient from "./AiSettingsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AiSettingsPage() {
  // The admin layout already gates access; safe to read with the service role.
  const providers = await listProviders(adminClient());

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <PageHeader
        title="AI tagging"
        description="Connect Claude, OpenAI, or OpenRouter to auto-tag draft dishes. Add a key, test it, and switch one model on for tagging. Keys are encrypted at rest and never shown again."
      />
      <AiSettingsClient initial={providers} supported={SUPPORTED_PROVIDERS} />
    </div>
  );
}
