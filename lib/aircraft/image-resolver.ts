import path from 'path';

/**
 * Constructs an absolute path to a stock aircraft image in the public directory.
 * React PDF requires absolute file paths when rendering on the server.
 */
function stockImagePath(filename: string): string {
  return path.join(process.cwd(), 'public', 'images', 'aircraft', filename);
}

/**
 * Maps aircraft category keys to their stock image file paths.
 */
export const AIRCRAFT_CATEGORY_IMAGES: Record<string, string> = {
  heavy: stockImagePath('heavy-jet.png'),
  large: stockImagePath('large-jet.png'),
  midsize: stockImagePath('midsize-jet.png'),
  light: stockImagePath('light-jet.png'),
  turboprop: stockImagePath('turboprop.png'),
  helicopter: stockImagePath('helicopter.png'),
};

/**
 * Generic silhouette fallback when no category match is found.
 */
export const FALLBACK_SILHOUETTE: string = stockImagePath('aircraft-silhouette.png');

/**
 * Ordered list of regex patterns to match aircraft type strings to category keys.
 *
 * Order matters:
 * - `super\s*mid` must come before `mid` so "Super Midsize" matches midsize
 * - `very\s*light` must come before `light` so "Very Light Jet" matches light
 * - `light` comes after `mid` entries, so "Super Light Jet" correctly skips
 *   mid patterns and matches light
 */
const CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/heavy/i, 'heavy'],
  [/large/i, 'large'],
  [/super\s*mid/i, 'midsize'],
  [/mid/i, 'midsize'],
  [/very\s*light/i, 'light'],
  [/light/i, 'light'],
  [/turbo\s*prop/i, 'turboprop'],
  [/heli/i, 'helicopter'],
];

interface ResolveInput {
  tailPhotoUrl?: string;
  aircraftType?: string;
  aircraftModel?: string;
}

/**
 * Resolves the best available aircraft image URL using a 3-tier strategy:
 *
 * 1. If `tailPhotoUrl` is provided and non-empty, return it directly
 * 2. If `aircraftType` matches a known category keyword, return the stock image path
 * 3. Otherwise, return the generic silhouette fallback
 *
 * Returns **absolute filesystem paths** suitable for server-side React PDF rendering.
 * For client-side (browser) rendering, use {@link resolveAircraftImageUrlWeb} instead.
 *
 * @param input - Object containing optional tailPhotoUrl, aircraftType, and aircraftModel
 * @returns The resolved image URL or absolute file path
 */
export function resolveAircraftImageUrl(input: ResolveInput): string {
  // Tier 1: Direct tail photo URL
  if (input.tailPhotoUrl && input.tailPhotoUrl.trim().length > 0) {
    return input.tailPhotoUrl;
  }

  // Tier 2: Category-based stock image
  if (input.aircraftType) {
    for (const [pattern, category] of CATEGORY_KEYWORDS) {
      if (pattern.test(input.aircraftType)) {
        return AIRCRAFT_CATEGORY_IMAGES[category];
      }
    }
  }

  // Tier 3: Generic silhouette fallback
  return FALLBACK_SILHOUETTE;
}

/**
 * Web-relative category image paths for browser rendering.
 * Maps category keys to `/images/aircraft/*.png` paths served by Next.js.
 */
const WEB_CATEGORY_IMAGES: Record<string, string> = {
  heavy: '/images/aircraft/heavy-jet.png',
  large: '/images/aircraft/large-jet.png',
  midsize: '/images/aircraft/midsize-jet.png',
  light: '/images/aircraft/light-jet.png',
  turboprop: '/images/aircraft/turboprop.png',
  helicopter: '/images/aircraft/helicopter.png',
};

const WEB_FALLBACK = '/images/aircraft/aircraft-silhouette.png';

/**
 * Resolves the best aircraft image URL for **client-side** rendering.
 *
 * Same 3-tier strategy as {@link resolveAircraftImageUrl} but returns
 * web-relative paths (`/images/aircraft/...`) instead of absolute filesystem paths.
 *
 * @param input - Object containing optional tailPhotoUrl, aircraftType, and aircraftModel
 * @returns Web-relative image path or external URL
 */
export function resolveAircraftImageUrlWeb(input: ResolveInput): string {
  // Tier 1: Direct tail photo URL
  if (input.tailPhotoUrl && input.tailPhotoUrl.trim().length > 0) {
    return input.tailPhotoUrl;
  }

  // Tier 2: Category-based stock image (web path)
  if (input.aircraftType) {
    for (const [pattern, category] of CATEGORY_KEYWORDS) {
      if (pattern.test(input.aircraftType)) {
        return WEB_CATEGORY_IMAGES[category];
      }
    }
  }

  // Tier 3: Generic silhouette fallback
  return WEB_FALLBACK;
}

// =============================================================================
// ASYNC SEARCH FALLBACK (Pre-production)
// =============================================================================

interface ResolveWithSearchInput extends ResolveInput {
  yearOfManufacture?: number;
}

/**
 * Async image resolver that adds a web search tier between tailPhotoUrl and stock images.
 *
 * 4-tier strategy:
 * 1. If `tailPhotoUrl` exists → return null (real image available, no search needed)
 * 2. Check DB for previously searched images
 * 3. Web search via SerpAPI → store results in DB
 * 4. On error → return null (caller uses existing stock fallback)
 *
 * @returns AircraftImageGallery if search images found, null otherwise
 */
export async function resolveAircraftImageWithSearch(
  input: ResolveWithSearchInput
): Promise<import('./image-search-types').AircraftImageGallery | null> {
  // Tier 1: If real tail photo exists, no search needed
  if (input.tailPhotoUrl && input.tailPhotoUrl.trim().length > 0) {
    return null;
  }

  // Tier 2+3: DB lookup + web search
  const model = input.aircraftModel || input.aircraftType;
  if (!model) {
    return null;
  }

  try {
    const { getAircraftImages } = await import('./image-search-service');

    // Derive category from aircraftType
    let category: string | undefined;
    if (input.aircraftType) {
      for (const [pattern, cat] of CATEGORY_KEYWORDS) {
        if (pattern.test(input.aircraftType)) {
          category = cat;
          break;
        }
      }
    }

    const gallery = await getAircraftImages(model, category, input.yearOfManufacture);

    if (gallery.exteriorImages.length === 0 && gallery.interiorImages.length === 0) {
      return null;
    }

    return gallery;
  } catch (err) {
    console.error('[ImageResolver] Search fallback failed:', err);
    return null;
  }
}
