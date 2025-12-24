/**
 * Avinode API Client
 * Handles HTTP communication with Avinode API
 *
 * Required environment variables:
 * - BASE_URI or AVINODE_BASE_URL: API base URL
 *   - Production: https://api.avinode.com/api
 *   - Sandbox: https://sandbox.avinode.com/api
 *   - In production, this is REQUIRED (will throw error if missing)
 *   - In development, defaults to sandbox with a warning if missing
 * - API_TOKEN: X-Avinode-ApiToken header value
 * - AUTHENTICATION_TOKEN: Bearer token for Authorization header
 *
 * @see docs/implementation/AVINODE-API-SETUP.md
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

export class AvinodeClient {
  private client: AxiosInstance;
  private readonly baseURL: string;
  private readonly apiToken: string;
  private readonly authToken: string;

  constructor() {
    // Load configuration from environment
    // Check if BASE_URI or AVINODE_BASE_URL is explicitly set
    const baseURI = process.env.BASE_URI || process.env.AVINODE_BASE_URL;
    const isProduction = process.env.NODE_ENV === 'production';
    
    // In production, require explicit URL configuration to prevent accidental sandbox usage
    if (!baseURI) {
      if (isProduction) {
        throw new Error(
          'BASE_URI or AVINODE_BASE_URL environment variable is required in production. ' +
          'Set BASE_URI=https://api.avinode.com/api for production or BASE_URI=https://sandbox.avinode.com/api for testing.'
        );
      } else {
        // In development, emit a clear warning but allow sandbox fallback
        console.warn(
          '⚠️  WARNING: BASE_URI and AVINODE_BASE_URL are not set. ' +
          'Falling back to sandbox URL (https://sandbox.avinode.com/api). ' +
          'Set BASE_URI or AVINODE_BASE_URL explicitly to avoid this warning.'
        );
        this.baseURL = 'https://sandbox.avinode.com/api';
      }
    } else {
      this.baseURL = baseURI;
    }
    
    // Get and trim tokens, removing any "Bearer " prefix if present
    let apiToken = (process.env.API_TOKEN || process.env.AVINODE_API_TOKEN || '').trim();
    let authToken = (process.env.AUTHENTICATION_TOKEN || process.env.AVINODE_BEARER_TOKEN || '').trim();
    
    // Remove "Bearer " prefix if present (client will add it)
    if (authToken.toLowerCase().startsWith('bearer ')) {
      authToken = authToken.substring(7).trim();
    }

    // Validate required credentials
    if (!apiToken) {
      throw new Error('API_TOKEN environment variable is required');
    }
    if (!authToken) {
      throw new Error('AUTHENTICATION_TOKEN environment variable is required');
    }

    this.apiToken = apiToken;
    this.authToken = authToken;

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-Avinode-ApiToken': this.apiToken,
        'Authorization': `Bearer ${this.authToken}`,
        'X-Avinode-ApiVersion': 'v1.0',
        'X-Avinode-Product': 'Jetvision/1.0.0',
        'Accept-Encoding': 'gzip',
      },
      timeout: 30000,
    });

    // Add request interceptor to set timestamp on each request
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        config.headers['X-Avinode-SentTimestamp'] = new Date().toISOString();
        return config;
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data as any;
          const errorCode = data?.meta?.errors?.[0]?.code || 'UNKNOWN';
          const errorTitle = data?.meta?.errors?.[0]?.title || data?.message || 'Unknown error';

          // Handle rate limiting
          if (status === 429) {
            const resetSeconds = error.response.headers['x-rate-limit-reset'] || '60';
            throw new Error(`Rate limited. Retry after ${resetSeconds} seconds.`);
          }

          throw new Error(`Avinode API error (${status}/${errorCode}): ${errorTitle}`);
        } else if (error.request) {
          throw new Error('No response from Avinode API - network error');
        } else {
          throw error;
        }
      }
    );
  }

  async get<T = any>(endpoint: string, config?: any): Promise<T> {
    const response = await this.client.get<T>(endpoint, config);
    return response.data;
  }

  async post<T = any>(endpoint: string, data: any): Promise<T> {
    const response = await this.client.post<T>(endpoint, data);
    return response.data;
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    const response = await this.client.delete<T>(endpoint);
    return response.data;
  }

  async put<T = any>(endpoint: string, data: any): Promise<T> {
    const response = await this.client.put<T>(endpoint, data);
    return response.data;
  }
}

// Singleton instance
let avinodeClientInstance: AvinodeClient | null = null;

export function getAvinodeClient(): AvinodeClient {
  if (!avinodeClientInstance) {
    avinodeClientInstance = new AvinodeClient();
  }
  return avinodeClientInstance;
}
