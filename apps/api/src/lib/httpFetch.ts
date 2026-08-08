const DEFAULT_TIMEOUT_MS = 10_000;

/** fetch() with a timeout and a descriptive User-Agent, for calling third-party version/metadata APIs. */
export async function httpFetchJson<T>(url: string, userAgent: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`Request to ${url} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}
