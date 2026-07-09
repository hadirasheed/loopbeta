import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ATTRIBUTE_KEYS } from "@/lib/types";
import { normalizeTagResult, type ProviderAdapter, type TagResult } from "./types";

const ATTRIBUTE_GUIDE: Record<string, string> = {
  heaviness: "0 = light/refreshing, 1 = very heavy/rich/filling",
  spiciness: "0 = not spicy, 1 = very spicy/hot",
  price_tier: "0 = cheap, 1 = premium/expensive",
  healthiness: "0 = indulgent, 1 = very healthy/nutritious",
  adventurousness: "0 = familiar/safe, 1 = adventurous/unusual",
  warmth: "0 = cold dish, 1 = hot/comforting/warm",
};

/** Extract the first JSON object from a model reply, tolerating code fences. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in reply");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export const anthropicAdapter: ProviderAdapter = {
  provider: "anthropic",
  async tag(name, description, ctx): Promise<TagResult> {
    const client = new Anthropic({ apiKey: ctx.apiKey });

    const attrLines = ATTRIBUTE_KEYS.map(
      (k) => `- ${k}: ${ATTRIBUTE_GUIDE[k]}`
    ).join("\n");

    const system =
      "You tag restaurant dishes for a recommendation engine. " +
      "Respond with ONLY a single JSON object, no prose, no code fences. " +
      "Shape: {\"attributes\": {" +
      ATTRIBUTE_KEYS.map((k) => `\"${k}\": <0..1>`).join(", ") +
      "}, \"tags\": [<short lowercase keywords>]}. " +
      "Every attribute is a number from 0 to 1. Tags are 3-8 short descriptive " +
      "keywords (e.g. comfort-food, street-food, sharing, brunch).";

    const user =
      `Dish: ${name}\n` +
      `Description: ${description ?? "(none)"}\n\n` +
      `Score each attribute 0..1:\n${attrLines}\n\n` +
      "Return the JSON object now.";

    const response = await client.messages.create({
      model: ctx.model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!text) throw new Error("Empty reply from model");

    return normalizeTagResult(extractJson(text));
  },
};
