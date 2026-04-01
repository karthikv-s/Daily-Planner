import { Redis } from '@upstash/redis';

export const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_URL !== 'mock-redis-url'
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    })
  : {
      get: async (_key: string) => null,
      set: async (_key: string, _value: unknown) => 'OK',
    }; // Mock fallback for UI development
