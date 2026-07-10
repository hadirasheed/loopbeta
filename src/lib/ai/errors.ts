import { providerName } from "./types";

/**
 * Map an HTTP status from a provider API into a clear, actionable message so
 * the admin knows exactly what to fix. `detail` is the provider's own error
 * text when we can parse it.
 */
export function mapProviderError(
  provider: string,
  status: number,
  detail?: string
): string {
  const who = providerName(provider);
  if (status === 401 || status === 403) {
    return `${who} rejected the API key (${status}). Check the key is correct and active.`;
  }
  if (status === 404) {
    return `${who} couldn't find that model (404). Check the model id is spelled exactly right.`;
  }
  if (status === 429) {
    return `${who} rate limit or quota hit (429). You may be out of credits or sending too fast — check your plan/billing.`;
  }
  if (status === 400 || status === 422) {
    return detail
      ? `${who} rejected the request (${status}): ${detail}`
      : `${who} rejected the request (${status}) — usually a wrong model id or unsupported parameter.`;
  }
  if (status >= 500) {
    return `${who} is having server trouble (${status}). Try again in a moment.`;
  }
  return detail
    ? `${who} error ${status}: ${detail}`
    : `${who} returned an unexpected error (${status}).`;
}

/** Wrap a network/other thrown error into a friendly message. */
export function networkError(provider: string, err: unknown): Error {
  const who = providerName(provider);
  const msg = err instanceof Error ? err.message : "network error";
  return new Error(`Couldn't reach ${who}. Check connectivity. (${msg})`);
}
