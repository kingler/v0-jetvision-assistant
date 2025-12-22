/**
 * Avinode API Client
 *
 * Real API client for Avinode integration.
 * Requires valid API credentials.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

interface AvinodeConfig {
  apiKey: string;
  baseUrl: string;
}

/**
 * Avinode API Client
 * Handles HTTP communication with Avinode API
 */
export class AvinodeClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: AvinodeConfig) {
    this.apiKey = config.apiKey;

    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add request interceptor for logging (without exposing API key)
    this.client.interceptors.request.use(
      (config) => {
        // Log request (sanitized)
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Avinode API] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return this.handleError(error);
      }
    );
  }

  /**
   * Search for available flights/aircraft
   */
  async searchFlights(params: any) {
    try {
      const response = await this.client.post('/flights/search', params);
      return response.data;
    } catch (error) {
      throw this.sanitizeError(error);
    }
  }

  /**
   * Create RFP and distribute to operators
   */
  async createRFP(params: any) {
    try {
      const response = await this.client.post('/rfps', params);
      return response.data;
    } catch (error) {
      throw this.sanitizeError(error);
    }
  }

  /**
   * Get RFP status
   */
  async getQuoteStatus(rfpId: string) {
    try {
      const response = await this.client.get(`/rfps/${rfpId}/status`);
      return response.data;
    } catch (error) {
      throw this.sanitizeError(error);
    }
  }

  /**
   * Get all quotes for an RFP
   */
  async getQuotes(rfpId: string) {
    try {
      const response = await this.client.get(`/rfps/${rfpId}/quotes`);
      return response.data;
    } catch (error) {
      throw this.sanitizeError(error);
    }
  }

  /**
   * Get RFQ details by ID including all received quotes
   * Uses the /rfqs/{id} endpoint per Avinode API spec
   * @see https://developer.avinodegroup.com/reference/readbynumericid
   */
  async getRFQ(rfqId: string) {
    try {
      // Handle different ID formats - extract numeric ID if prefixed
      let numericId = rfqId;
      if (rfqId.startsWith('atrip-') || rfqId.startsWith('arfq-')) {
        numericId = rfqId.split('-')[1];
      }

      const response = await this.client.get(`/rfqs/${numericId}`);
      return response.data;
    } catch (error) {
      throw this.sanitizeError(error);
    }
  }

  /**
   * Create a trip container and return deep link for manual operator selection
   * This is the primary tool for the deep link workflow
   */
  async createTrip(params: {
    departure_airport: string;
    arrival_airport: string;
    departure_date: string;
    passengers: number;
    departure_time?: string;
    return_date?: string;
    return_time?: string;
    aircraft_category?: string;
    special_requirements?: string;
    client_reference?: string;
  }) {
    try {
      const response = await this.client.post('/v1/trips', {
        route: {
          departure: {
            airport: params.departure_airport,
            date: params.departure_date,
            time: params.departure_time,
          },
          arrival: {
            airport: params.arrival_airport,
          },
          return: params.return_date
            ? {
                date: params.return_date,
                time: params.return_time,
              }
            : undefined,
        },
        passengers: params.passengers,
        aircraft_category: params.aircraft_category,
        special_requirements: params.special_requirements,
        client_reference: params.client_reference,
      });
      return response.data;
    } catch (error) {
      throw this.sanitizeError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data: any = error.response.data;

      if (status === 404) {
        return Promise.reject(new Error('Resource not found'));
      } else if (status === 401 || status === 403) {
        return Promise.reject(new Error('Authentication failed'));
      } else if (status === 429) {
        return Promise.reject(new Error('Rate limit exceeded'));
      } else {
        return Promise.reject(
          new Error(data?.message || `API error: ${status}`)
        );
      }
    } else if (error.request) {
      // Request made but no response
      return Promise.reject(new Error('No response from Avinode API'));
    } else {
      // Request configuration error
      return Promise.reject(new Error('Request configuration error'));
    }
  }

  /**
   * Sanitize error to prevent API key exposure
   */
  private sanitizeError(error: any): Error {
    if (error instanceof Error) {
      // Remove API key from error message if present
      const sanitized = error.message.replace(this.apiKey, '[REDACTED]');
      return new Error(sanitized);
    }
    return new Error('Unknown error occurred');
  }
}
