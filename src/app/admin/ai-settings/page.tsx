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
        description="Add a model and mark one active. It powers the “Pre-tag with AI” button on the review screen. Keys are encrypted at rest and never shown again."
      />
      <AiSettingsClient initial={providers} supported={SUPPORTED_PROVIDERS} />
    </div>
  );
}
