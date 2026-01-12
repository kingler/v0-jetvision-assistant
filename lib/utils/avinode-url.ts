/**
 * Avinode URL Utilities
 * 
 * Provides utilities for validating and transforming Avinode deep link URLs
 * to ensure they point to the web UI (marketplace) rather than API endpoints
 */

/**
 * Validates if a URL is a valid Avinode web UI (marketplace) URL
 * Valid formats:
 * - https://sandbox.avinode.com/marketplace/mvc/search/load/atrip-XXXXX
 * - https://marketplace.avinode.com/trip/XXXXX
 * - https://app.avinode.com/trips/XXXXX
 * 
 * @param url - The URL to validate
 * @returns true if the URL is a valid web UI URL, false otherwise
 */
export function isValidAvinodeWebUIUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    
    // Must be https
    if (urlObj.protocol !== 'https:') return false;
    
    // Must be an Avinode domain
    const validDomains = [
      'sandbox.avinode.com',
      'marketplace.avinode.com',
      'app.avinode.com',
      'avinode.com', // Production domain
    ];
    
    if (!validDomains.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`))) {
      return false;
    }
    
    // Must point to web UI, not API
    // Valid paths:
    // - /marketplace/mvc/search/load/...
    // - /marketplace/mvc/trips/...
    // - /trip/...
    // - /trips/...
    const pathname = urlObj.pathname;
    
    // Reject API endpoints
    if (pathname.startsWith('/api/')) {
      return false;
    }
    
    // Accept marketplace paths
    if (pathname.startsWith('/marketplace/mvc/')) {
      return true;
    }
    
    // Accept app paths
    if (pathname.startsWith('/trip/') || pathname.startsWith('/trips/')) {
      return true;
    }
    
    return false;
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Transforms an Avinode API URL to a web UI URL
 * 
 * Converts URLs like:
 * - https://sandbox.avinode.com/api/trips/atrip-XXXXX
 * To:
 * - https://sandbox.avinode.com/marketplace/mvc/search/load/atrip-XXXXX?source=api&origin=api_action
 * 
 * @param url - The API URL to transform
 * @returns The transformed web UI URL, or null if transformation is not possible
 */
export function transformApiUrlToWebUI(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Check if this is an API endpoint
    if (!urlObj.pathname.startsWith('/api/trips/')) {
      return null; // Not an API URL, no transformation needed
    }
    
    // Extract trip ID from API path
    // /api/trips/atrip-XXXXX -> atrip-XXXXX
    const tripIdMatch = urlObj.pathname.match(/\/api\/trips\/([^\/]+)/);
    if (!tripIdMatch || !tripIdMatch[1]) {
      return null; // Cannot extract trip ID
    }
    
    const tripId = tripIdMatch[1];
    
    // Determine the base domain (sandbox or production)
    const isSandbox = urlObj.hostname.includes('sandbox') || urlObj.hostname.includes('sandbox.avinode.com');
    const baseDomain = isSandbox ? 'sandbox.avinode.com' : 'marketplace.avinode.com';
    
    // Construct the web UI URL
    // For sandbox: https://sandbox.avinode.com/marketplace/mvc/search/load/atrip-XXXXX?source=api&origin=api_action
    // For production: https://marketplace.avinode.com/trip/XXXXX (strip 'atrip-' prefix)
    if (isSandbox) {
      return `https://${baseDomain}/marketplace/mvc/search/load/${tripId}?source=api&origin=api_action`;
    } else {
      // Production: remove 'atrip-' prefix if present
      const shortTripId = tripId.replace(/^atrip-/, '');
      return `https://${baseDomain}/trip/${shortTripId}`;
    }
  } catch {
    // Invalid URL format
    return null;
  }
}

/**
 * Validates and fixes an Avinode deep link URL
 * 
 * Checks if the URL is valid for web UI, and if it's an API URL, transforms it to a web UI URL.
 * 
 * @param url - The URL to validate and fix
 * @returns The fixed URL if transformation was needed, or the original URL if already valid
 */
export function validateAndFixAvinodeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // If it's already a valid web UI URL, return as-is
  if (isValidAvinodeWebUIUrl(url)) {
    return url;
  }
  
  // Try to transform API URL to web UI URL
  const transformed = transformApiUrlToWebUI(url);
  if (transformed) {
    console.warn('[Avinode URL] Transformed API URL to web UI URL:', {
      original: url,
      transformed,
    });
    return transformed;
  }
  
  // If we can't validate or transform, return null to indicate invalid URL
  console.error('[Avinode URL] Invalid URL format that cannot be fixed:', url);
  return null;
}
