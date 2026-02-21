/**
 * @vitest-environment jsdom
 */

/**
 * AircraftImageGallery Component Tests
 *
 * Tests for the aircraft image gallery component that displays
 * model-specific images from the image search API.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AircraftImageGallery } from '@/components/avinode/aircraft-image-gallery';

// =============================================================================
// MOCKS
// =============================================================================

const mockGalleryResponse = {
  aircraftModel: 'Gulfstream G650',
  exteriorImages: [
    {
      url: 'https://example.com/g650-ext-1.jpg',
      thumbnailUrl: 'https://example.com/g650-ext-1-thumb.jpg',
      title: 'G650 Exterior',
      source: 'example.com',
      width: 800,
      height: 600,
    },
    {
      url: 'https://example.com/g650-ext-2.jpg',
      thumbnailUrl: 'https://example.com/g650-ext-2-thumb.jpg',
      title: 'G650 Exterior 2',
      source: 'example.com',
      width: 800,
      height: 600,
    },
  ],
  interiorImages: [
    {
      url: 'https://example.com/g650-int-1.jpg',
      thumbnailUrl: 'https://example.com/g650-int-1-thumb.jpg',
      title: 'G650 Interior',
      source: 'example.com',
      width: 800,
      height: 600,
    },
  ],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// TESTS
// =============================================================================

describe('AircraftImageGallery', () => {
  it('should show loading skeleton initially', () => {
    // Never-resolving fetch to keep loading state
    global.fetch = vi.fn(() => new Promise(() => {})) as typeof global.fetch;

    render(
      <AircraftImageGallery
        aircraftModel="Gulfstream G650"
        fallbackImageUrl="/images/aircraft/heavy-jet.png"
      />
    );

    expect(screen.getByTestId('aircraft-gallery-skeleton')).toBeInTheDocument();
  });

  it('should display fetched gallery image after load', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGalleryResponse),
    });

    render(
      <AircraftImageGallery
        aircraftModel="Gulfstream G650"
        fallbackImageUrl="/images/aircraft/heavy-jet.png"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('aircraft-gallery-image')).toBeInTheDocument();
    });

    const img = screen.getByTestId('aircraft-gallery-image') as HTMLImageElement;
    expect(img.src).toContain('g650-ext-1.jpg');
  });

  it('should show interior/exterior toggle when interior images exist', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGalleryResponse),
    });

    render(
      <AircraftImageGallery
        aircraftModel="Gulfstream G650"
        fallbackImageUrl="/images/aircraft/heavy-jet.png"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('gallery-view-toggle')).toBeInTheDocument();
    });

    expect(screen.getByText('Exterior')).toBeInTheDocument();
    expect(screen.getByText('Interior')).toBeInTheDocument();
  });

  it('should fallback to fallbackImageUrl on fetch error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(
      <AircraftImageGallery
        aircraftModel="Unknown"
        fallbackImageUrl="/images/aircraft/aircraft-silhouette.png"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('aircraft-gallery-image')).toBeInTheDocument();
    });

    const img = screen.getByTestId('aircraft-gallery-image') as HTMLImageElement;
    expect(img.src).toContain('aircraft-silhouette.png');
  });

  it('should fallback when gallery has no images', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        aircraftModel: 'Unknown',
        exteriorImages: [],
        interiorImages: [],
      }),
    });

    render(
      <AircraftImageGallery
        aircraftModel="Unknown"
        fallbackImageUrl="/images/aircraft/aircraft-silhouette.png"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('aircraft-gallery-image')).toBeInTheDocument();
    });

    const img = screen.getByTestId('aircraft-gallery-image') as HTMLImageElement;
    expect(img.src).toContain('aircraft-silhouette.png');
  });

  it('should show gallery count badge in compact mode', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGalleryResponse),
    });

    render(
      <AircraftImageGallery
        aircraftModel="Gulfstream G650"
        fallbackImageUrl="/images/aircraft/heavy-jet.png"
        compact
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('gallery-count-badge')).toBeInTheDocument();
    });

    // 2 exterior + 1 interior = 3 total
    expect(screen.getByTestId('gallery-count-badge')).toHaveTextContent('3');
  });

  it('should pass correct query params to fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGalleryResponse),
    });

    render(
      <AircraftImageGallery
        aircraftModel="Gulfstream G650"
        aircraftCategory="heavy_jet"
        yearOfManufacture={2023}
        fallbackImageUrl="/images/aircraft/heavy-jet.png"
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const fetchUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(fetchUrl).toContain('model=Gulfstream+G650');
    expect(fetchUrl).toContain('category=heavy_jet');
    expect(fetchUrl).toContain('year=2023');
  });
});
