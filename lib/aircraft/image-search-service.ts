/**
 * Aircraft Image Search Service
 *
 * Pre-production fallback that searches for model-specific aircraft images
 * via SerpAPI and caches results in Supabase. This avoids repeated web searches
 * for the same aircraft model.
 *
 * Flow: DB check → web search → store in DB → return
 *
 * Lifecycle: Disabled/removed when real Avinode tailPhotoUrl images are
 * consistently available in production.
 *
 * @see lib/aircraft/image-search-types.ts
 * @see supabase/migrations/038_create_aircraft_images.sql
 */

import type {
  AircraftImageType,
  AircraftImageSearchParams,
  AircraftImageResult,
  AircraftImageGallery,
  AircraftImageRow,
  IAircraftImageSearchProvider,
} from './image-search-types';

// =============================================================================
// SERPAPI PROVIDER
// =============================================================================

const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;
const DEFAULT_MAX_RESULTS = 3;

export class SerpAPIImageSearchProvider implements IAircraftImageSearchProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SERPAPI_API_KEY || '';
  }

  async search(params: AircraftImageSearchParams): Promise<AircraftImageResult[]> {
    if (!this.apiKey) {
      console.warn('[AircraftImageSearch] No SERPAPI_API_KEY configured, skipping web search');
      return [];
    }

    const { getJson } = await import('google-search-results-nodejs');
    const client = new getJson(this.apiKey);

    const query = this.buildQuery(params);
    const maxResults = params.maxResults ?? DEFAULT_MAX_RESULTS;

    return new Promise<AircraftImageResult[]>((resolve) => {
      client.json(
        {
          engine: 'google_images',
          q: query,
          num: maxResults + 5, // fetch extra to filter by size
        },
        (data: Record<string, unknown>) => {
          const results = this.parseResults(data, maxResults);
          resolve(results);
        }
      );
    });
  }

  private buildQuery(params: AircraftImageSearchParams): string {
    const parts: string[] = [params.aircraftModel];

    if (params.yearOfManufacture) {
      parts.push(String(params.yearOfManufacture));
    }

    parts.push('private jet');

    if (params.imageType === 'exterior') {
      parts.push('exterior');
    } else {
      parts.push('interior cabin');
    }

    return parts.join(' ');
  }

  private parseResults(
    data: Record<string, unknown>,
    maxResults: number
  ): AircraftImageResult[] {
    const imagesResults = data.images_results;
    if (!Array.isArray(imagesResults)) {
      return [];
    }

    const results: AircraftImageResult[] = [];

    for (const item of imagesResults) {
      if (results.length >= maxResults) break;

      const width = typeof item.original_width === 'number' ? item.original_width : 0;
      const height = typeof item.original_height === 'number' ? item.original_height : 0;

      if (width < MIN_WIDTH || height < MIN_HEIGHT) continue;

      results.push({
        url: String(item.original || ''),
        thumbnailUrl: String(item.thumbnail || ''),
        title: String(item.title || ''),
        source: String(item.source || ''),
        width,
        height,
      });
    }

    return results;
  }
}

// =============================================================================
// IN-FLIGHT DEDUPLICATION
// =============================================================================

const inFlightSearches = new Map<string, Promise<AircraftImageGallery>>();

function getCacheKey(model: string): string {
  return model.toLowerCase().trim();
}

// =============================================================================
// MAIN SERVICE
// =============================================================================

/**
 * Get aircraft images for a model, checking DB cache first,
 * then falling back to web search if needed.
 */
export async function getAircraftImages(
  aircraftModel: string,
  aircraftCategory?: string,
  yearOfManufacture?: number,
  provider?: IAircraftImageSearchProvider
): Promise<AircraftImageGallery> {
  const key = getCacheKey(aircraftModel);

  // Deduplicate in-flight requests for the same model
  const existing = inFlightSearches.get(key);
  if (existing) {
    return existing;
  }

  const promise = fetchOrSearchImages(
    aircraftModel,
    aircraftCategory,
    yearOfManufacture,
    provider
  );

  inFlightSearches.set(key, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    inFlightSearches.delete(key);
  }
}

async function fetchOrSearchImages(
  aircraftModel: string,
  aircraftCategory?: string,
  yearOfManufacture?: number,
  provider?: IAircraftImageSearchProvider
): Promise<AircraftImageGallery> {
  // Step 1: Check DB cache
  const cached = await queryDBImages(aircraftModel);
  if (cached.exteriorImages.length > 0 || cached.interiorImages.length > 0) {
    return cached;
  }

  // Step 2: Web search
  const searchProvider = provider || new SerpAPIImageSearchProvider();
  const [exteriorResults, interiorResults] = await Promise.all([
    searchProvider.search({
      aircraftModel,
      aircraftCategory,
      yearOfManufacture,
      imageType: 'exterior',
    }),
    searchProvider.search({
      aircraftModel,
      aircraftCategory,
      yearOfManufacture,
      imageType: 'interior',
    }),
  ]);

  // Step 3: Store results in DB
  if (exteriorResults.length > 0 || interiorResults.length > 0) {
    await storeDBImages(
      aircraftModel,
      aircraftCategory,
      yearOfManufacture,
      exteriorResults,
      interiorResults
    );
  }

  return {
    aircraftModel,
    exteriorImages: exteriorResults,
    interiorImages: interiorResults,
  };
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import('@/lib/supabase/admin');
  // Cast for the aircraft_images table which is not yet in generated types.
  // After running `supabase gen types` with the 038 migration applied, remove this cast.
  // eslint-disable-next-line
  return supabaseAdmin as any;
}

async function queryDBImages(aircraftModel: string): Promise<AircraftImageGallery> {
  try {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from('aircraft_images')
      .select('*')
      .eq('aircraft_model', aircraftModel)
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return { aircraftModel, exteriorImages: [], interiorImages: [] };
    }

    const exteriorImages: AircraftImageResult[] = [];
    const interiorImages: AircraftImageResult[] = [];

    for (const row of data as AircraftImageRow[]) {
      const result: AircraftImageResult = {
        url: row.url,
        thumbnailUrl: row.thumbnail_url || row.url,
        title: row.title || '',
        source: row.source || '',
        width: row.width || 0,
        height: row.height || 0,
      };

      if (row.image_type === 'exterior') {
        exteriorImages.push(result);
      } else {
        interiorImages.push(result);
      }
    }

    return { aircraftModel, exteriorImages, interiorImages };
  } catch (err) {
    console.error('[AircraftImageSearch] DB query failed:', err);
    return { aircraftModel, exteriorImages: [], interiorImages: [] };
  }
}

async function storeDBImages(
  aircraftModel: string,
  aircraftCategory: string | undefined,
  yearOfManufacture: number | undefined,
  exteriorResults: AircraftImageResult[],
  interiorResults: AircraftImageResult[]
): Promise<void> {
  try {
    const supabase = await getSupabaseAdmin();

    const rows: Omit<AircraftImageRow, 'id' | 'created_at'>[] = [];

    for (let i = 0; i < exteriorResults.length; i++) {
      const img = exteriorResults[i];
      rows.push({
        aircraft_model: aircraftModel,
        aircraft_category: aircraftCategory || null,
        year_of_manufacture: yearOfManufacture || null,
        image_type: 'exterior',
        url: img.url,
        thumbnail_url: img.thumbnailUrl,
        title: img.title,
        source: img.source,
        width: img.width,
        height: img.height,
        display_order: i,
      });
    }

    for (let i = 0; i < interiorResults.length; i++) {
      const img = interiorResults[i];
      rows.push({
        aircraft_model: aircraftModel,
        aircraft_category: aircraftCategory || null,
        year_of_manufacture: yearOfManufacture || null,
        image_type: 'interior',
        url: img.url,
        thumbnail_url: img.thumbnailUrl,
        title: img.title,
        source: img.source,
        width: img.width,
        height: img.height,
        display_order: i,
      });
    }

    if (rows.length > 0) {
      const { error } = await supabase
        .from('aircraft_images')
        .upsert(rows, { onConflict: 'aircraft_model,image_type,url' });

      if (error) {
        console.error('[AircraftImageSearch] DB insert failed:', error);
      }
    }
  } catch (err) {
    console.error('[AircraftImageSearch] DB store failed:', err);
  }
}
