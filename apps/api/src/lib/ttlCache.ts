/**
 * Wraps an async fetcher with a TTL cache that also de-duplicates
 * concurrent calls (a burst of requests while the cache is cold triggers
 * exactly one fetch, not one per request).
 */
export function createTtlCache<T>(ttlMs: number, fetcher: () => Promise<T>) {
  let cached: { value: T; expiresAt: number } | null = null;
  let pending: Promise<T> | null = null;

  return async function get(): Promise<T> {
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (pending) return pending;

    pending = fetcher()
      .then((value) => {
        cached = { value, expiresAt: Date.now() + ttlMs };
        return value;
      })
      .finally(() => {
        pending = null;
      });

    return pending;
  };
}
