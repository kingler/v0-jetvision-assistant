'use client';

/**
 * AircraftImageGallery Component
 *
 * Displays model-specific aircraft images fetched from the image search API.
 * Falls back to the provided fallbackImageUrl if no searched images are available.
 *
 * Features:
 * - Fetches exterior + interior images on mount
 * - Loading skeleton while fetching
 * - Interior toggle to switch between exterior/interior views
 * - Compact mode: single image with gallery count badge
 * - Graceful fallback on error or no results
 *
 * @see app/api/aircraft/images/route.ts
 * @see lib/aircraft/image-search-service.ts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AircraftImageGallery as AircraftImageGalleryType } from '@/lib/aircraft/image-search-types';

export interface AircraftImageGalleryProps {
  aircraftModel: string;
  aircraftCategory?: string;
  yearOfManufacture?: number;
  fallbackImageUrl: string;
  compact?: boolean;
  className?: string;
  /** Image alt text override */
  alt?: string;
  /** Callback when image fails to load */
  onImageError?: () => void;
}

type ViewMode = 'exterior' | 'interior';

export function AircraftImageGallery({
  aircraftModel,
  aircraftCategory,
  yearOfManufacture,
  fallbackImageUrl,
  compact = false,
  className,
  alt,
  onImageError,
}: AircraftImageGalleryProps) {
  const [gallery, setGallery] = useState<AircraftImageGalleryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('exterior');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  const fetchImages = useCallback(async () => {
    if (!aircraftModel) {
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ model: aircraftModel });
      if (aircraftCategory) params.set('category', aircraftCategory);
      if (yearOfManufacture) params.set('year', String(yearOfManufacture));

      const res = await fetch(`/api/aircraft/images?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: AircraftImageGalleryType = await res.json();
      setGallery(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [aircraftModel, aircraftCategory, yearOfManufacture]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Reset index when switching view mode
  useEffect(() => {
    setCurrentIndex(0);
    setImgError(false);
  }, [viewMode]);

  const currentImages = gallery
    ? viewMode === 'exterior'
      ? gallery.exteriorImages
      : gallery.interiorImages
    : [];

  const totalImages =
    (gallery?.exteriorImages.length || 0) + (gallery?.interiorImages.length || 0);

  const hasInterior = (gallery?.interiorImages.length || 0) > 0;
  const hasGalleryImages = totalImages > 0;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : currentImages.length - 1));
    setImgError(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < currentImages.length - 1 ? prev + 1 : 0));
    setImgError(false);
  };

  const handleImageError = () => {
    setImgError(true);
    onImageError?.();
  };

  // Use fallback if: loading failed, no gallery images, or current image errored
  const useFallback = error || !hasGalleryImages || imgError;
  const currentImage = !useFallback && currentImages[currentIndex]
    ? currentImages[currentIndex]
    : null;
  const displayUrl = currentImage ? currentImage.url : fallbackImageUrl;

  // Loading skeleton
  if (loading) {
    return (
      <div
        className={cn(
          'bg-muted animate-pulse rounded-lg',
          compact ? 'w-full h-full' : 'w-full aspect-video',
          className
        )}
        data-testid="aircraft-gallery-skeleton"
      />
    );
  }

  // Compact mode: single image with gallery badge
  if (compact) {
    return (
      <div className={cn('relative w-full h-full', className)}>
        <img
          src={displayUrl}
          alt={alt || aircraftModel || 'Aircraft'}
          className="w-full h-full object-cover"
          onError={handleImageError}
          data-testid="aircraft-gallery-image"
        />
        {hasGalleryImages && totalImages > 1 && (
          <span
            className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5"
            data-testid="gallery-count-badge"
          >
            <Camera className="w-3 h-3" />
            {totalImages}
          </span>
        )}
      </div>
    );
  }

  // Full gallery mode
  return (
    <div className={cn('relative w-full', className)} data-testid="aircraft-image-gallery">
      {/* Main image */}
      <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
        <img
          src={displayUrl}
          alt={alt || `${aircraftModel} ${viewMode}` || 'Aircraft'}
          className="w-full h-full object-cover"
          onError={handleImageError}
          data-testid="aircraft-gallery-image"
        />

        {/* Navigation arrows (only when multiple images in current view) */}
        {currentImages.length > 1 && !useFallback && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Image counter */}
        {currentImages.length > 1 && !useFallback && (
          <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
            {currentIndex + 1}/{currentImages.length}
          </span>
        )}
      </div>

      {/* Exterior/Interior toggle */}
      {hasInterior && !useFallback && (
        <div className="flex gap-1 mt-1.5" data-testid="gallery-view-toggle">
          <button
            onClick={() => setViewMode('exterior')}
            className={cn(
              'text-[11px] px-2 py-0.5 rounded transition-colors',
              viewMode === 'exterior'
                ? 'bg-foreground text-background font-medium'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            Exterior
          </button>
          <button
            onClick={() => setViewMode('interior')}
            className={cn(
              'text-[11px] px-2 py-0.5 rounded transition-colors',
              viewMode === 'interior'
                ? 'bg-foreground text-background font-medium'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            Interior
          </button>
        </div>
      )}
    </div>
  );
}

export default AircraftImageGallery;
