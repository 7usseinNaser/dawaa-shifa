const cache = new Map<string, { data: unknown; expiry: number }>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

export function invalidateCache(key: string): void {
  cache.delete(key);
}

export function invalidatePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs: number): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== null) return cached;
  const data = await fetcher();
  setCached(key, data, ttlMs);
  return data;
}
