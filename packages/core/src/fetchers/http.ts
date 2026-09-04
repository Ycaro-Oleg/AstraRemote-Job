const USER_AGENT = "AstraRemote-Job/0.1 (personal; localhost)";
const TIMEOUT_MS = 20_000;

export async function timedFetch(fetchFn: typeof fetch, url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetchFn(url, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
