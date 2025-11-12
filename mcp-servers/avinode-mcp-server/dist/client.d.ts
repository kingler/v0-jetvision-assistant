/**
 * Avinode API Client
 * Handles HTTP communication with Avinode API
 */
export declare class AvinodeClient {
    private client;
    private readonly baseURL;
    constructor();
    get<T = any>(endpoint: string, config?: any): Promise<T>;
    post<T = any>(endpoint: string, data: any): Promise<T>;
    delete<T = any>(endpoint: string): Promise<T>;
    put<T = any>(endpoint: string, data: any): Promise<T>;
}
export declare function getAvinodeClient(): AvinodeClient;
//# sourceMappingURL=client.d.ts.map