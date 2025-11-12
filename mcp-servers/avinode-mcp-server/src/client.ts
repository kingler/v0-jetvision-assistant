/**
 * Avinode API Client
 * Handles HTTP communication with Avinode API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

export class AvinodeClient {
  private client: AxiosInstance;
  private readonly baseURL = 'https://api.avinode.com';

  constructor() {
    const apiKey = process.env.AVINODE_API_KEY;

    if (!apiKey) {
      throw new Error('AVINODE_API_KEY environment variable is required');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;
          const message = (error.response.data as any)?.message || 'Unknown error';

          throw new Error(`Avinode API error (${status}): ${message}`);
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
