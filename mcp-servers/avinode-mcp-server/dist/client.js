/**
 * Avinode API Client
 * Handles HTTP communication with Avinode API
 */
import axios from 'axios';
export class AvinodeClient {
    client;
    baseURL = 'https://api.avinode.com';
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
        this.client.interceptors.response.use((response) => response, (error) => {
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || 'Unknown error';
                throw new Error(`Avinode API error (${status}): ${message}`);
            }
            else if (error.request) {
                throw new Error('No response from Avinode API - network error');
            }
            else {
                throw error;
            }
        });
    }
    async get(endpoint, config) {
        const response = await this.client.get(endpoint, config);
        return response.data;
    }
    async post(endpoint, data) {
        const response = await this.client.post(endpoint, data);
        return response.data;
    }
    async delete(endpoint) {
        const response = await this.client.delete(endpoint);
        return response.data;
    }
    async put(endpoint, data) {
        const response = await this.client.put(endpoint, data);
        return response.data;
    }
}
// Singleton instance
let avinodeClientInstance = null;
export function getAvinodeClient() {
    if (!avinodeClientInstance) {
        avinodeClientInstance = new AvinodeClient();
    }
    return avinodeClientInstance;
}
//# sourceMappingURL=client.js.map