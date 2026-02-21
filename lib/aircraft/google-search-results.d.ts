declare module 'google-search-results-nodejs' {
  class getJson {
    constructor(apiKey: string);
    json(params: Record<string, unknown>, callback: (data: Record<string, unknown>) => void): void;
  }
  export { getJson };
}
