/**
 * Middleware Auth Bypass Logic Tests
 *
 * Tests for authentication bypass logic in middleware.ts
 * Validates security requirements: explicit opt-in only, development-only bypass
 *
 * Coverage:
 * - BYPASS_AUTH requires explicit opt-in via environment variable
 * - BYPASS_AUTH_VERCEL requires explicit opt-in for Vercel deployments
 * - Bypass is never allowed in production (NODE_ENV !== 'development')
 * - Implicit bypass (via VERCEL !== '1') is no longer allowed (security fix)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Helper function to calculate BYPASS_AUTH value based on environment variables
 * This mirrors the logic in middleware.ts but makes it testable
 *
 * @param env - Environment variables object
 * @returns Whether authentication should be bypassed
 */
function calculateBypassAuth(env: {
  NODE_ENV?: string;
  BYPASS_AUTH?: string;
  BYPASS_AUTH_VERCEL?: string;
  VERCEL?: string;
}): boolean {
  const isDevelopment = env.NODE_ENV === 'development';
  const bypassAuthEnv = env.BYPASS_AUTH === 'true';
  const bypassAuthVercelEnv = env.BYPASS_AUTH_VERCEL === 'true';

  // Require explicit opt-in: Only allow bypass in development with explicit BYPASS_AUTH flag
  // Optional convenience flag BYPASS_AUTH_VERCEL for Vercel preview deployments (also requires explicit opt-in)
  return isDevelopment && Boolean(
    bypassAuthEnv || (bypassAuthVercelEnv && env.VERCEL === '1')
  );
}

describe('Middleware Auth Bypass Logic', () => {
  describe('Security: Explicit Opt-in Required', () => {
    it('should NOT bypass auth in development without explicit BYPASS_AUTH flag', () => {
      const env = {
        NODE_ENV: 'development',
        BYPASS_AUTH: undefined,
        VERCEL: undefined,
      };

      const result = calculateBypassAuth(env);
      expect(result).toBe(false);
    });

    it('should NOT bypass auth in development when BYPASS_AUTH is not "true"', () => {
      const env = {
        NODE_ENV: 'development',
        BYPASS_AUTH: 'false',
        VERCEL: undefined,
      };

      const result = calculateBypassAuth(env);
      expect(result).toBe(false);
    });

    it('should bypass auth in development when BYPASS_AUTH is explicitly set to "true"', () => {
      const env = {
        NODE_ENV: 'development',
        BYPASS_AUTH: 'true',
        VERCEL: undefined,
      };

      const result = calculateBypassAuth(env);
      expect(result).toBe(true);
    });

    it('should NOT bypass auth in development on non-Vercel without explicit flag (security fix)', () => {
      // This test validates the security fix: implicit bypass via VERCEL !== '1' is removed
      const env = {
        NODE_ENV: 'development',
        BYPASS_AUTH: undefined,
        VERCEL: undefined, // Non-Vercel environment
      };

      const result = calculateBypassAuth(env);
      expect(result).toBe(false);
    });
  });

  describe('Vercel Deployment Support', () => {
    it('should NOT bypass auth on Vercel in development without explicit BYPASS_AUTH_VERCEL flag', () => {
      const env = {
        NODE_ENV: 'development',
        BYPASS_AUTH: undefined,
        BYPASS_AUTH_VERCEL: undefined,
        VERCEL: '1',
      };

      const result = calculateBypassAuth(env);
      expect(result).toBe(false);
    });

    it('should bypass auth on Vercel in development when BYPASS_AUTH_VERCEL is explicitly set to "true"', () => {
      const env = {
        NODE_ENV: 'development',
        BYPASS_AUTH: undefined,
        BYPASS_AUTH_VERCEL: 'true',
        VERCEL: '1',
      };

      const result = calculateBypassAuth(env);
      expect(result).toBe(true);
    });

    it('should NOT bypass auth on Vercel when BYPASS_AUTH_VERCEL is not "true"', () => {
      const env = {
        NODE_ENV: 'development',
        BYPASS_AUTH: undefined,
        BYPASS_AUTH_VERCEL: 'false',
        VERCEL: '1',
      };

      const result = calculateBypassAuth(env);
      expect(result).toBe(false);
    });

    it('should NOT bypass auth with BYPASS_AUTH_VERCEL on non-Vercel (requires VERCEL="1")', () => {
      const env = {
        NODE_ENV: 'development',
        BYPASS_AUTH: undefined,
        BYPASS_AUTH_VERCEL: 'true',
        VERCEL: undefined,
      };

      const result = calculateBypassAuth(env);
      expect(result).toBe(false);
    });

    it('should prioritize BYPASS_AUTH over BYPASS_AUTH_VERCEL when both are set', () => {
      const env = {
        NODE_ENV: 'development',
        BYPASS_AUTH: 'true',
        BYPASS_AUTH_VERCEL: 'true',
        VERCEL: '1',
      };

      const result = calculateBypassAuth(env);
      expect(result).toBe(true);
    });
  });

  describe('Production Security: Never Allow Bypass', () => {
    it('should NOT bypass auth in production even with BYPASS_AUTH="true"', () => {
      const env = {
        NODE_ENV: 'production',
        BYPASS_AUTH: 'true',
        VERCEL: undefined,
      };

      const result = calculateBypassAuth(env);
      expect(result).toBe(false);
    });

    it('should NOT bypass auth in production even with BYPASS_AUTH_VERCEL="true"', () => {
      const env = {
        NODE_ENV: 'production',
        BYPASS_AUTH: undefined,
        BYPASS_AUTH_VERCEL: 'true',
        VERCEL: '1',
      };

      const result = calculateBypassAuth(env);
      expect(result).toBe(false);
    });

    it('should NOT bypass auth in production when both flags are set', () => {
      const env = {
        NODE_ENV: 'production',
        BYPASS_AUTH: 'true',
        BYPASS_AUTH_VERCEL: 'true',
        VERCEL: '1',
      };

      const result = calculateBypassAuth(env);
      expect(result).toBe(false);
    });

    it('should NOT bypass auth in test environment', () => {
      const env = {
        NODE_ENV: 'test',
        BYPASS_AUTH: 'true',
        VERCEL: undefined,
      };

      const result = calculateBypassAuth(env);
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values as falsy', () => {
      const env = {
        NODE_ENV: 'development',
        BYPASS_AUTH: '',
        VERCEL: '',
      };

      const result = calculateBypassAuth(env);
      expect(result).toBe(false);
    });

    it('should handle case-sensitive "true" check', () => {
      const env = {
        NODE_ENV: 'development',
        BYPASS_AUTH: 'True', // Wrong case
        VERCEL: undefined,
      };

      const result = calculateBypassAuth(env);
      expect(result).toBe(false);
    });

    it('should handle VERCEL="0" as non-Vercel', () => {
      const env = {
        NODE_ENV: 'development',
        BYPASS_AUTH: undefined,
        BYPASS_AUTH_VERCEL: 'true',
        VERCEL: '0',
      };

      const result = calculateBypassAuth(env);
      expect(result).toBe(false);
    });
  });
});

