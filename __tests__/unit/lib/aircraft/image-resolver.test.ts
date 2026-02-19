import { describe, it, expect } from 'vitest';
import {
  resolveAircraftImageUrl,
  AIRCRAFT_CATEGORY_IMAGES,
  FALLBACK_SILHOUETTE,
} from '@/lib/aircraft/image-resolver';

describe('resolveAircraftImageUrl', () => {
  it('should return tailPhotoUrl when provided', () => {
    const url = resolveAircraftImageUrl({
      tailPhotoUrl: 'https://cdn.example.com/n650ej.jpg',
      aircraftType: 'Heavy Jet',
      aircraftModel: 'Gulfstream G650',
    });
    expect(url).toBe('https://cdn.example.com/n650ej.jpg');
  });

  it('should fallback to category image when no tailPhotoUrl', () => {
    const url = resolveAircraftImageUrl({
      aircraftType: 'Heavy Jet',
      aircraftModel: 'Gulfstream G650',
    });
    expect(url).toBe(AIRCRAFT_CATEGORY_IMAGES['heavy']);
  });

  it('should normalize category names case-insensitively', () => {
    const url = resolveAircraftImageUrl({
      aircraftType: 'MIDSIZE JET',
      aircraftModel: 'Citation XLS+',
    });
    expect(url).toBe(AIRCRAFT_CATEGORY_IMAGES['midsize']);
  });

  it('should match Super Midsize to midsize category', () => {
    const url = resolveAircraftImageUrl({
      aircraftType: 'Super Midsize Jet',
      aircraftModel: 'Citation Longitude',
    });
    expect(url).toBe(AIRCRAFT_CATEGORY_IMAGES['midsize']);
  });

  it('should match Super Light Jet to light category', () => {
    const url = resolveAircraftImageUrl({
      aircraftType: 'Super Light Jet',
      aircraftModel: 'Phenom 300',
    });
    expect(url).toBe(AIRCRAFT_CATEGORY_IMAGES['light']);
  });

  it('should match Large Jet to large category', () => {
    const url = resolveAircraftImageUrl({
      aircraftType: 'Large Jet',
      aircraftModel: 'Challenger 604',
    });
    expect(url).toBe(AIRCRAFT_CATEGORY_IMAGES['large']);
  });

  it('should match Light Jet to light category', () => {
    const url = resolveAircraftImageUrl({
      aircraftType: 'Light Jet',
      aircraftModel: 'Citation CJ3',
    });
    expect(url).toBe(AIRCRAFT_CATEGORY_IMAGES['light']);
  });

  it('should match turboprop category', () => {
    const url = resolveAircraftImageUrl({
      aircraftType: 'Turboprop',
      aircraftModel: 'King Air 350',
    });
    expect(url).toBe(AIRCRAFT_CATEGORY_IMAGES['turboprop']);
  });

  it('should match helicopter category', () => {
    const url = resolveAircraftImageUrl({
      aircraftType: 'Helicopter',
      aircraftModel: 'Bell 407',
    });
    expect(url).toBe(AIRCRAFT_CATEGORY_IMAGES['helicopter']);
  });

  it('should fallback to silhouette for unknown category', () => {
    const url = resolveAircraftImageUrl({
      aircraftType: 'Unknown Type',
      aircraftModel: 'Mystery Plane',
    });
    expect(url).toBe(FALLBACK_SILHOUETTE);
  });

  it('should fallback to silhouette when no type provided', () => {
    const url = resolveAircraftImageUrl({});
    expect(url).toBe(FALLBACK_SILHOUETTE);
  });

  it('should ignore empty tailPhotoUrl string', () => {
    const url = resolveAircraftImageUrl({
      tailPhotoUrl: '',
      aircraftType: 'Light Jet',
    });
    expect(url).toBe(AIRCRAFT_CATEGORY_IMAGES['light']);
  });

  it('should ignore whitespace-only tailPhotoUrl', () => {
    const url = resolveAircraftImageUrl({
      tailPhotoUrl: '   ',
      aircraftType: 'Heavy Jet',
    });
    expect(url).toBe(AIRCRAFT_CATEGORY_IMAGES['heavy']);
  });

  it('should fallback to silhouette when aircraftType is empty string', () => {
    const url = resolveAircraftImageUrl({
      aircraftType: '',
    });
    expect(url).toBe(FALLBACK_SILHOUETTE);
  });
});

describe('AIRCRAFT_CATEGORY_IMAGES', () => {
  it('should have entries for all standard categories', () => {
    const requiredCategories = ['heavy', 'large', 'midsize', 'light', 'turboprop', 'helicopter'];
    for (const cat of requiredCategories) {
      expect(AIRCRAFT_CATEGORY_IMAGES[cat]).toBeDefined();
      expect(AIRCRAFT_CATEGORY_IMAGES[cat]).toMatch(/\.(png|jpg|webp)$/);
    }
  });
});

describe('FALLBACK_SILHOUETTE', () => {
  it('should be a valid image path', () => {
    expect(FALLBACK_SILHOUETTE).toMatch(/\.(png|jpg|webp)$/);
    expect(FALLBACK_SILHOUETTE).toContain('aircraft-silhouette');
  });
});
