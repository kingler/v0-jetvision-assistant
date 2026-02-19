import { describe, it, expect } from 'vitest';
import {
  GALLERY_AIRCRAFT,
  type GalleryAircraft,
  getAircraftByCategory,
} from '@/lib/aircraft/gallery-data';

describe('GALLERY_AIRCRAFT', () => {
  it('should contain aircraft entries', () => {
    expect(GALLERY_AIRCRAFT.length).toBeGreaterThan(0);
  });

  it('should have required fields on each entry', () => {
    for (const aircraft of GALLERY_AIRCRAFT) {
      expect(aircraft.model).toBeTruthy();
      expect(aircraft.category).toBeTruthy();
      expect(aircraft.imageUrl).toBeTruthy();
      expect(aircraft.passengerCapacity).toBeGreaterThan(0);
      expect(aircraft.range).toBeTruthy();
    }
  });

  it('should have web-relative image paths', () => {
    for (const aircraft of GALLERY_AIRCRAFT) {
      expect(aircraft.imageUrl).toMatch(/^\/images\/aircraft\//);
      expect(aircraft.imageUrl).toMatch(/\.(png|jpg|webp)$/);
    }
  });

  it('should have non-empty descriptions', () => {
    for (const aircraft of GALLERY_AIRCRAFT) {
      expect(aircraft.description).toBeTruthy();
      expect(aircraft.description.length).toBeGreaterThan(10);
    }
  });
});

describe('getAircraftByCategory', () => {
  it('should filter by category', () => {
    const heavyJets = getAircraftByCategory('Heavy Jet');
    expect(heavyJets.length).toBeGreaterThan(0);
    for (const jet of heavyJets) {
      expect(jet.category).toBe('Heavy Jet');
    }
  });

  it('should return empty array for unknown category', () => {
    const result = getAircraftByCategory('Spaceship');
    expect(result).toEqual([]);
  });

  it('should return all when no category specified', () => {
    const all = getAircraftByCategory();
    expect(all).toEqual(GALLERY_AIRCRAFT);
  });

  it('should return subset for each known category', () => {
    const categories = ['Heavy Jet', 'Large Jet', 'Midsize Jet', 'Light Jet', 'Turboprop'];
    for (const category of categories) {
      const filtered = getAircraftByCategory(category);
      expect(filtered.length).toBeGreaterThanOrEqual(0);
      for (const aircraft of filtered) {
        expect(aircraft.category).toBe(category);
      }
    }
  });
});
