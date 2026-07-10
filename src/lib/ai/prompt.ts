import { ATTRIBUTE_KEYS, ATTRIBUTE_GUIDE } from "@/lib/types";
import { normalizeTagResult, type TagResult } from "./types";

/** Build the shared tagging system + user prompt (provider-agnostic). */
export function buildTagPrompt(
  name: string,
  description: string | null
): { system: string; user: string } {
  const attrLines = ATTRIBUTE_KEYS.map(
    (k) => `- ${k}: 0 = ${ATTRIBUTE_GUIDE[k].low}, 1 = ${ATTRIBUTE_GUIDE[k].high}`
  ).join("\n");

  const shape =
    '{"attributes": {' +
    ATTRIBUTE_KEYS.map((k) => `"${k}": <0..1>`).join(", ") +
    '}, "tags": [<short lowercase keywords>]}';

  const system =
    "You tag restaurant dishes for a recommendation engine. " +
    "Respond with ONLY a single JSON object, no prose, no code fences. " +
    `Shape: ${shape}. ` +
    "Every attribute is a number from 0 to 1. Tags are 3-8 short descriptive " +
    "keywords (e.g. comfort-food, street-food, sharing, brunch).";

  const user =
    `Dish: ${name}\n` +
    `Description: ${description ?? "(none)"}\n\n` +
    `Score each attribute 0..1:\n${attrLines}\n\n` +
    "Return the JSON object now.";

  return { system, user };
}

/** Extract the first JSON object from a model reply, tolerating code fences. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in reply");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/** Parse + normalize a raw model reply into a TagResult. */
export function parseTagReply(text: string): TagResult {
  return normalizeTagResult(extractJson(text));
}
