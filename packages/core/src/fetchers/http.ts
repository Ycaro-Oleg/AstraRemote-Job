const USER_AGENT = "AstraRemote-Job/0.1 (personal; localhost)";
const TIMEOUT_MS = 20_000;

export async function timedFetch(
  fetchFn: typeof fetch,
  url: string,
  accept = "application/json, text/xml, application/rss+xml, */*",
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetchFn(url, {
      headers: { "user-agent": USER_AGENT, accept },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export function parseJsonLoose(text: string): unknown {
  const cleaned = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");
  return JSON.parse(cleaned);
}
