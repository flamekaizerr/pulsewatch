// Simple in-memory cache fallback
const localCache = new Map<string, { value: string; expiresAt: number }>();

export const cache = {
  async get(key: string): Promise<string | null> {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      try {
        const response = await fetch(`${upstashUrl}/get/${key}`, {
          headers: { Authorization: `Bearer ${upstashToken}` },
        });
        if (response.ok) {
          const data = await response.json() as { result: string | null };
          return data.result;
        }
      } catch (err) {
        console.error('Error reading from Upstash Redis cache:', err);
      }
    }

    // Local in-memory cache lookup
    const cached = localCache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      localCache.delete(key);
      return null;
    }
    return cached.value;
  },

  async set(key: string, value: string, expireSeconds = 300): Promise<void> {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      try {
        const response = await fetch(`${upstashUrl}/set/${key}/${encodeURIComponent(value)}?ex=${expireSeconds}`, {
          headers: { Authorization: `Bearer ${upstashToken}` },
        });
        if (response.ok) return;
      } catch (err) {
        console.error('Error writing to Upstash Redis cache:', err);
      }
    }

    // Local in-memory cache set
    localCache.set(key, {
      value,
      expiresAt: Date.now() + expireSeconds * 1000,
    });
  },

  async del(key: string): Promise<void> {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      try {
        await fetch(`${upstashUrl}/del/${key}`, {
          headers: { Authorization: `Bearer ${upstashToken}` },
        });
      } catch (err) {
        console.error('Error deleting from Upstash Redis cache:', err);
      }
    }

    localCache.delete(key);
  }
};
