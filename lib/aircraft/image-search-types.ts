/**
 * Aircraft Image Search Types
 *
 * Type definitions for the pre-production aircraft image search fallback.
 * Used by the image search service, API route, and gallery component.
 *
 * @see lib/aircraft/image-search-service.ts
 * @see app/api/aircraft/images/route.ts
 * @see components/avinode/aircraft-image-gallery.tsx
 */

export type AircraftImageType = 'exterior' | 'interior';

export interface AircraftImageSearchParams {
  aircraftModel: string;
  aircraftCategory?: string;
  yearOfManufacture?: number;
  imageType: AircraftImageType;
  maxResults?: number;
}

export interface AircraftImageResult {
  url: string;
  thumbnailUrl: string;
  title: string;
  source: string;
  width: number;
  height: number;
}

export interface AircraftImageGallery {
  aircraftModel: string;
  exteriorImages: AircraftImageResult[];
  interiorImages: AircraftImageResult[];
}

/**
 * Row shape for the aircraft_images Supabase table.
 */
export interface AircraftImageRow {
  id: string;
  aircraft_model: string;
  aircraft_category: string | null;
  year_of_manufacture: number | null;
  image_type: AircraftImageType;
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  source: string | null;
  width: number | null;
  height: number | null;
  display_order: number;
  created_at: string;
}

/**
 * Provider interface for swappable image search backends.
 */
export interface IAircraftImageSearchProvider {
  search(params: AircraftImageSearchParams): Promise<AircraftImageResult[]>;
}
