/**
 * Environment Configuration Integration Tests
 * Tests that environment variables are properly configured
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('Environment Configuration', () => {
  describe('Required Environment Variables', () => {
    it('should have Clerk authentication keys configured', () => {
      expect(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBeDefined();
      expect(process.env.CLERK_SECRET_KEY).toBeDefined();
    });

    it('should have Supabase configuration', () => {
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
      expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
      expect(process.env.SUPABASE_SERVICE_KEY).toBeDefined();
    });

    it('should have OpenAI API key', () => {
      expect(process.env.OPENAI_API_KEY).toBeDefined();
      expect(process.env.OPENAI_API_KEY).toMatch(/^sk-/);
    });

    it('should have Redis configuration', () => {
      const hasRedis =
        process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
      expect(hasRedis).toBeDefined();
    });
  });

  describe('Environment Variable Format', () => {
    it('should have valid Supabase URL format', () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (url) {
        expect(url).toMatch(/^https:\/\/.+\.supabase\.co$/);
      }
    });

    it('should have valid Clerk publishable key format', () => {
      const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
      if (key) {
        expect(key).toMatch(/^pk_(test|live)_/);
      }
    });

    it('should have valid Clerk secret key format', () => {
      const key = process.env.CLERK_SECRET_KEY;
      if (key) {
        expect(key).toMatch(/^sk_(test|live)_/);
      }
    });
  });

  describe('Optional Environment Variables', () => {
    it('should optionally have Google API credentials', () => {
      const hasGoogleCreds =
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_REFRESH_TOKEN;

      if (hasGoogleCreds) {
        expect(process.env.GOOGLE_CLIENT_ID).toMatch(/\.apps\.googleusercontent\.com$/);
      }
    });

    it('should optionally have Sentry configuration', () => {
      const sentryDsn = process.env.SENTRY_DSN;
      if (sentryDsn) {
        expect(sentryDsn).toMatch(/^https:\/\/.+@.+\.ingest\.sentry\.io\/.+$/);
      }
    });
  });
});
