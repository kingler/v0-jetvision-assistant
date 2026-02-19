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
