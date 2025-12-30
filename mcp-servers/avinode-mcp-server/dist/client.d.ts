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
export declare class AvinodeClient {
    private client;
    private readonly baseURL;
    private readonly apiToken;
    private readonly authToken;
    constructor();
    get<T = any>(endpoint: string, config?: any): Promise<T>;
    post<T = any>(endpoint: string, data: any): Promise<T>;
    delete<T = any>(endpoint: string): Promise<T>;
    put<T = any>(endpoint: string, data: any): Promise<T>;
}
export declare function getAvinodeClient(): AvinodeClient;
//# sourceMappingURL=client.d.ts.map