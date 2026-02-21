import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  AircraftImageSearchParams,
  AircraftImageResult,
  IAircraftImageSearchProvider,
} from '@/lib/aircraft/image-search-types';

// Mock supabase admin before importing the service
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockUpsert = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      mockFrom(table);
      return {
        select: (cols: string) => {
          mockSelect(cols);
          return {
            eq: (col: string, val: string) => {
              mockEq(col, val);
              return {
                order: (col: string, opts: Record<string, unknown>) => {
                  mockOrder(col, opts);
                  return { data: null, error: null };
                },
              };
            },
          };
        },
        upsert: (rows: unknown[], opts: Record<string, unknown>) => {
          mockUpsert(rows, opts);
          return { error: null };
        },
      };
    },
  },
}));

import { getAircraftImages, SerpAPIImageSearchProvider } from '@/lib/aircraft/image-search-service';

// =============================================================================
// MOCK PROVIDER
// =============================================================================

class MockImageSearchProvider implements IAircraftImageSearchProvider {
  private results: Map<string, AircraftImageResult[]> = new Map();

  setResults(imageType: string, results: AircraftImageResult[]): void {
    this.results.set(imageType, results);
  }

  async search(params: AircraftImageSearchParams): Promise<AircraftImageResult[]> {
    return this.results.get(params.imageType) || [];
  }
}

function mockExteriorImage(index = 0): AircraftImageResult {
  return {
    url: `https://example.com/exterior-${index}.jpg`,
    thumbnailUrl: `https://example.com/exterior-${index}-thumb.jpg`,
    title: `Aircraft Exterior ${index}`,
    source: 'example.com',
    width: 800,
    height: 600,
  };
}

function mockInteriorImage(index = 0): AircraftImageResult {
  return {
    url: `https://example.com/interior-${index}.jpg`,
    thumbnailUrl: `https://example.com/interior-${index}-thumb.jpg`,
    title: `Aircraft Interior ${index}`,
    source: 'example.com',
    width: 800,
    height: 600,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('getAircraftImages', () => {
  let provider: MockImageSearchProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new MockImageSearchProvider();
  });

  it('should return empty gallery when DB has no results and provider returns nothing', async () => {
    const result = await getAircraftImages('Unknown Aircraft', undefined, undefined, provider);

    expect(result.aircraftModel).toBe('Unknown Aircraft');
    expect(result.exteriorImages).toEqual([]);
    expect(result.interiorImages).toEqual([]);
  });

  it('should search and return images from provider when DB is empty', async () => {
    provider.setResults('exterior', [mockExteriorImage(0), mockExteriorImage(1)]);
    provider.setResults('interior', [mockInteriorImage(0)]);

    const result = await getAircraftImages('Gulfstream G650', 'heavy', 2023, provider);

    expect(result.aircraftModel).toBe('Gulfstream G650');
    expect(result.exteriorImages).toHaveLength(2);
    expect(result.interiorImages).toHaveLength(1);
    expect(result.exteriorImages[0].url).toBe('https://example.com/exterior-0.jpg');
  });

  it('should store results in DB after web search', async () => {
    provider.setResults('exterior', [mockExteriorImage()]);
    provider.setResults('interior', [mockInteriorImage()]);

    await getAircraftImages('Challenger 350', 'midsize', 2022, provider);

    // Verify upsert was called with both exterior and interior images
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const upsertedRows = mockUpsert.mock.calls[0][0];
    expect(upsertedRows).toHaveLength(2); // 1 exterior + 1 interior
    expect(upsertedRows[0].aircraft_model).toBe('Challenger 350');
    expect(upsertedRows[0].image_type).toBe('exterior');
    expect(upsertedRows[1].image_type).toBe('interior');
  });

  it('should pass category and year to DB rows', async () => {
    provider.setResults('exterior', [mockExteriorImage()]);

    await getAircraftImages('Phenom 300E', 'light', 2021, provider);

    const upsertedRows = mockUpsert.mock.calls[0][0];
    expect(upsertedRows[0].aircraft_category).toBe('light');
    expect(upsertedRows[0].year_of_manufacture).toBe(2021);
  });

  it('should not call upsert when no images found', async () => {
    await getAircraftImages('Nothing Here', undefined, undefined, provider);

    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe('SerpAPIImageSearchProvider', () => {
  it('should return empty results when no API key is configured', async () => {
    const provider = new SerpAPIImageSearchProvider('');

    const results = await provider.search({
      aircraftModel: 'Gulfstream G650',
      imageType: 'exterior',
    });

    expect(results).toEqual([]);
  });
});
