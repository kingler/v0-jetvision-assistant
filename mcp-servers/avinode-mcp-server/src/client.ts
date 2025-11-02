/**
 * Avinode API Client
 * Handles HTTP communication with Avinode API
 * Supports mock mode via USE_MOCK_AVINODE environment variable
 * ONEK-77: Mock/Real API Toggle
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  FlightSearchParams,
  FlightResult,
  CreateRFPParams,
  RFPResponse,
  Quote,
} from './types.js';

// Import mock data generators
import {
  generateMockFlightResults,
  generateMockRFPResponse,
  generateMockQuotes,
  simulateAPIDelay,
} from '../../../lib/mock-data/avinode-responses.js';

export class AvinodeClient {
  private client: AxiosInstance | null = null;
  private readonly baseURL = 'https://api.avinode.com';
  private readonly useMock: boolean;
  private readonly mockDelay: number;

  constructor() {
    // Check if mock mode is enabled
    this.useMock = process.env.USE_MOCK_AVINODE === 'true';
    this.mockDelay = parseInt(process.env.MOCK_API_DELAY_MS || '500', 10);

    if (this.useMock) {
      console.log('[AvinodeClient] 🎭 Running in MOCK mode');
      console.log(`[AvinodeClient] Mock API delay: ${this.mockDelay}ms`);
      // No need to initialize axios client in mock mode
      return;
    }

    // Real API mode - validate API key
    const apiKey = process.env.AVINODE_API_KEY;

    if (!apiKey) {
      throw new Error(
        'AVINODE_API_KEY environment variable is required when USE_MOCK_AVINODE=false'
      );
    }

    console.log('[AvinodeClient] 🌐 Running in REAL API mode');

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

  /**
   * Search for available flights
   */
  async searchFlights(params: FlightSearchParams): Promise<FlightResult[]> {
    if (this.useMock) {
      console.log('[AvinodeClient] 🎭 Using mock data for search_flights');
      await this.simulateDelay();
      return generateMockFlightResults(params);
    }

    console.log('[AvinodeClient] 🌐 Calling real Avinode API for search_flights');
    return this.post<FlightResult[]>('/v1/flights/search', params);
  }

  /**
   * Create RFP and send to operators
   */
  async createRFP(params: CreateRFPParams): Promise<RFPResponse> {
    if (this.useMock) {
      console.log('[AvinodeClient] 🎭 Using mock data for create_rfp');
      await this.simulateDelay();
      return generateMockRFPResponse(
        params.flight_details,
        params.client_reference || 'Mock Client',
        params.quote_deadline
      );
    }

    console.log('[AvinodeClient] 🌐 Calling real Avinode API for create_rfp');
    return this.post<RFPResponse>('/v1/rfp/create', params);
  }

  /**
   * Get quotes for an RFP
   */
  async getRFPQuotes(rfpId: string): Promise<Quote[]> {
    if (this.useMock) {
      console.log('[AvinodeClient] 🎭 Using mock data for get_rfp_quotes');
      await this.simulateDelay();
      return generateMockQuotes(rfpId);
    }

    console.log('[AvinodeClient] 🌐 Calling real Avinode API for get_rfp_quotes');
    return this.get<Quote[]>(`/v1/rfp/${rfpId}/quotes`);
  }

  /**
   * Generic GET request (only for real API mode)
   */
  private async get<T = any>(endpoint: string, config?: any): Promise<T> {
    if (this.useMock) {
      throw new Error(
        'Generic GET not supported in mock mode. Use specific methods instead.'
      );
    }

    if (!this.client) {
      throw new Error('Axios client not initialized');
    }

    const response = await this.client.get<T>(endpoint, config);
    return response.data;
  }

  /**
   * Generic POST request (only for real API mode)
   */
  private async post<T = any>(endpoint: string, data: any): Promise<T> {
    if (this.useMock) {
      throw new Error(
        'Generic POST not supported in mock mode. Use specific methods instead.'
      );
    }

    if (!this.client) {
      throw new Error('Axios client not initialized');
    }

    const response = await this.client.post<T>(endpoint, data);
    return response.data;
  }

  /**
   * Generic DELETE request (only for real API mode)
   */
  private async delete<T = any>(endpoint: string): Promise<T> {
    if (this.useMock) {
      throw new Error(
        'Generic DELETE not supported in mock mode. Use specific methods instead.'
      );
    }

    if (!this.client) {
      throw new Error('Axios client not initialized');
    }

    const response = await this.client.delete<T>(endpoint);
    return response.data;
  }

  /**
   * Generic PUT request (only for real API mode)
   */
  private async put<T = any>(endpoint: string, data: any): Promise<T> {
    if (this.useMock) {
      throw new Error(
        'Generic PUT not supported in mock mode. Use specific methods instead.'
      );
    }

    if (!this.client) {
      throw new Error('Axios client not initialized');
    }

    const response = await this.client.put<T>(endpoint, data);
    return response.data;
  }

  /**
   * Simulate API delay for mock mode
   */
  private async simulateDelay(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.mockDelay));
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
