import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminClient } from "@/lib/supabase/admin";
import {
  listProviders,
  createProvider,
  SUPPORTED_PROVIDERS,
} from "@/lib/ai/providers";

export const runtime = "nodejs";

// GET /api/admin/ai-settings — list configured models (keys are never returned).
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
  }
  const providers = await listProviders(adminClient());
  return NextResponse.json({ providers, supported: SUPPORTED_PROVIDERS });
}

// POST /api/admin/ai-settings — add a model (provider + model id + API key).
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
  }

  let body: {
    provider?: unknown;
    model?: unknown;
    label?: unknown;
    apiKey?: unknown;
    tokenBudget?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const provider = typeof body.provider === "string" ? body.provider : "";
  const model = typeof body.model === "string" ? body.model.trim() : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const tokenBudget =
    typeof body.tokenBudget === "number" && Number.isFinite(body.tokenBudget)
      ? Math.max(0, Math.round(body.tokenBudget))
      : null;

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }
  if (!model) {
    return NextResponse.json({ error: "Model id is required" }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }

  try {
    const { id } = await createProvider(adminClient(), {
      provider,
      model,
      label,
      apiKey,
      tokenBudget,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save model" },
      { status: 500 }
    );
  }
}
