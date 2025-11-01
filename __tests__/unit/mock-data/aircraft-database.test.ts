/**
 * Unit tests for Aircraft Database
 * Following TDD approach - these tests define the expected behavior
 */

import { describe, it, expect } from 'vitest';
import { aircraftDatabase, getAircraftByCategory, getRandomAircraft, type AircraftCategory } from '@/lib/mock-data/aircraft-database';

describe('Aircraft Database', () => {
  describe('Database Structure', () => {
    it('should have at least 20 aircraft in total', () => {
      expect(aircraftDatabase.length).toBeGreaterThanOrEqual(20);
    });

    it('should have at least 5 light jets', () => {
      const lightJets = aircraftDatabase.filter(a => a.category === 'light');
      expect(lightJets.length).toBeGreaterThanOrEqual(5);
    });

    it('should have at least 7 midsize jets', () => {
      const midsizeJets = aircraftDatabase.filter(a => a.category === 'midsize');
      expect(midsizeJets.length).toBeGreaterThanOrEqual(7);
    });

    it('should have at least 5 heavy jets', () => {
      const heavyJets = aircraftDatabase.filter(a => a.category === 'heavy');
      expect(heavyJets.length).toBeGreaterThanOrEqual(5);
    });

    it('should have at least 3 ultra-long-range jets', () => {
      const ultraLongRangeJets = aircraftDatabase.filter(a => a.category === 'ultra_long_range');
      expect(ultraLongRangeJets.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Aircraft Properties Validation', () => {
    it('should have all required fields for each aircraft', () => {
      aircraftDatabase.forEach((aircraft) => {
        expect(aircraft).toHaveProperty('type');
        expect(aircraft).toHaveProperty('model');
        expect(aircraft).toHaveProperty('registration');
        expect(aircraft).toHaveProperty('category');
        expect(aircraft).toHaveProperty('capacity');
        expect(aircraft).toHaveProperty('range');
        expect(aircraft).toHaveProperty('speed');
        expect(aircraft).toHaveProperty('yearBuilt');
        expect(aircraft).toHaveProperty('amenities');
      });
    });

    it('should have valid category values', () => {
      const validCategories: AircraftCategory[] = ['light', 'midsize', 'heavy', 'ultra_long_range'];
      aircraftDatabase.forEach((aircraft) => {
        expect(validCategories).toContain(aircraft.category);
      });
    });

    it('should have non-empty strings for type, model, and registration', () => {
      aircraftDatabase.forEach((aircraft) => {
        expect(aircraft.type).toBeTruthy();
        expect(aircraft.model).toBeTruthy();
        expect(aircraft.registration).toBeTruthy();
        expect(typeof aircraft.type).toBe('string');
        expect(typeof aircraft.model).toBe('string');
        expect(typeof aircraft.registration).toBe('string');
      });
    });

    it('should have realistic capacity values', () => {
      aircraftDatabase.forEach((aircraft) => {
        expect(aircraft.capacity).toBeGreaterThan(0);
        expect(aircraft.capacity).toBeLessThanOrEqual(19);
      });
    });

    it('should have realistic range values in nautical miles', () => {
      aircraftDatabase.forEach((aircraft) => {
        expect(aircraft.range).toBeGreaterThan(500);
        expect(aircraft.range).toBeLessThanOrEqual(8000);
      });
    });

    it('should have realistic speed values in knots', () => {
      aircraftDatabase.forEach((aircraft) => {
        expect(aircraft.speed).toBeGreaterThan(300);
        expect(aircraft.speed).toBeLessThanOrEqual(700);
      });
    });

    it('should have realistic year built values', () => {
      const currentYear = new Date().getFullYear();
      aircraftDatabase.forEach((aircraft) => {
        if (aircraft.yearBuilt) {
          expect(aircraft.yearBuilt).toBeGreaterThanOrEqual(1990);
          expect(aircraft.yearBuilt).toBeLessThanOrEqual(currentYear);
        }
      });
    });

    it('should have amenities array for each aircraft', () => {
      aircraftDatabase.forEach((aircraft) => {
        expect(Array.isArray(aircraft.amenities)).toBe(true);
        expect(aircraft.amenities.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Category-Specific Specifications', () => {
    describe('Light Jets', () => {
      it('should have capacity between 4-7 passengers', () => {
        const lightJets = aircraftDatabase.filter(a => a.category === 'light');
        lightJets.forEach((aircraft) => {
          expect(aircraft.capacity).toBeGreaterThanOrEqual(4);
          expect(aircraft.capacity).toBeLessThanOrEqual(7);
        });
      });

      it('should have range between 1500-2500nm', () => {
        const lightJets = aircraftDatabase.filter(a => a.category === 'light');
        lightJets.forEach((aircraft) => {
          expect(aircraft.range).toBeGreaterThanOrEqual(1500);
          expect(aircraft.range).toBeLessThanOrEqual(2500);
        });
      });
    });

    describe('Midsize Jets', () => {
      it('should have capacity between 7-9 passengers', () => {
        const midsizeJets = aircraftDatabase.filter(a => a.category === 'midsize');
        midsizeJets.forEach((aircraft) => {
          expect(aircraft.capacity).toBeGreaterThanOrEqual(7);
          expect(aircraft.capacity).toBeLessThanOrEqual(9);
        });
      });

      it('should have range between 2500-3500nm', () => {
        const midsizeJets = aircraftDatabase.filter(a => a.category === 'midsize');
        midsizeJets.forEach((aircraft) => {
          expect(aircraft.range).toBeGreaterThanOrEqual(2500);
          expect(aircraft.range).toBeLessThanOrEqual(3500);
        });
      });
    });

    describe('Heavy Jets', () => {
      it('should have capacity between 10-14 passengers', () => {
        const heavyJets = aircraftDatabase.filter(a => a.category === 'heavy');
        heavyJets.forEach((aircraft) => {
          expect(aircraft.capacity).toBeGreaterThanOrEqual(10);
          expect(aircraft.capacity).toBeLessThanOrEqual(14);
        });
      });

      it('should have range between 3500-5000nm', () => {
        const heavyJets = aircraftDatabase.filter(a => a.category === 'heavy');
        heavyJets.forEach((aircraft) => {
          expect(aircraft.range).toBeGreaterThanOrEqual(3500);
          expect(aircraft.range).toBeLessThanOrEqual(5000);
        });
      });
    });

    describe('Ultra-Long-Range Jets', () => {
      it('should have capacity between 12-19 passengers', () => {
        const ultraLongRangeJets = aircraftDatabase.filter(a => a.category === 'ultra_long_range');
        ultraLongRangeJets.forEach((aircraft) => {
          expect(aircraft.capacity).toBeGreaterThanOrEqual(12);
          expect(aircraft.capacity).toBeLessThanOrEqual(19);
        });
      });

      it('should have range between 5000-7500nm', () => {
        const ultraLongRangeJets = aircraftDatabase.filter(a => a.category === 'ultra_long_range');
        ultraLongRangeJets.forEach((aircraft) => {
          expect(aircraft.range).toBeGreaterThanOrEqual(5000);
          expect(aircraft.range).toBeLessThanOrEqual(7500);
        });
      });
    });
  });

  describe('Helper Functions', () => {
    describe('getAircraftByCategory()', () => {
      it('should return only aircraft of the specified category', () => {
        const lightJets = getAircraftByCategory('light');
        expect(lightJets.every(a => a.category === 'light')).toBe(true);

        const midsizeJets = getAircraftByCategory('midsize');
        expect(midsizeJets.every(a => a.category === 'midsize')).toBe(true);

        const heavyJets = getAircraftByCategory('heavy');
        expect(heavyJets.every(a => a.category === 'heavy')).toBe(true);

        const ultraLongRangeJets = getAircraftByCategory('ultra_long_range');
        expect(ultraLongRangeJets.every(a => a.category === 'ultra_long_range')).toBe(true);
      });

      it('should return at least 3 aircraft for each category', () => {
        expect(getAircraftByCategory('light').length).toBeGreaterThanOrEqual(3);
        expect(getAircraftByCategory('midsize').length).toBeGreaterThanOrEqual(3);
        expect(getAircraftByCategory('heavy').length).toBeGreaterThanOrEqual(3);
        expect(getAircraftByCategory('ultra_long_range').length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('getRandomAircraft()', () => {
      it('should return a random aircraft from the database', () => {
        const aircraft = getRandomAircraft();
        expect(aircraftDatabase).toContainEqual(aircraft);
      });

      it('should return an aircraft with all required properties', () => {
        const aircraft = getRandomAircraft();
        expect(aircraft).toHaveProperty('type');
        expect(aircraft).toHaveProperty('model');
        expect(aircraft).toHaveProperty('registration');
        expect(aircraft).toHaveProperty('category');
        expect(aircraft).toHaveProperty('capacity');
        expect(aircraft).toHaveProperty('range');
        expect(aircraft).toHaveProperty('speed');
      });

      it('should return different aircraft on multiple calls (probabilistic)', () => {
        const aircraft1 = getRandomAircraft();
        const aircraft2 = getRandomAircraft();
        const aircraft3 = getRandomAircraft();

        // At least one should be different (with high probability)
        const allSame =
          aircraft1.registration === aircraft2.registration &&
          aircraft2.registration === aircraft3.registration;

        expect(allSame).toBe(false);
      });

      it('should filter by category when specified', () => {
        const lightJet = getRandomAircraft('light');
        expect(lightJet.category).toBe('light');

        const midsizeJet = getRandomAircraft('midsize');
        expect(midsizeJet.category).toBe('midsize');

        const heavyJet = getRandomAircraft('heavy');
        expect(heavyJet.category).toBe('heavy');

        const ultraLongRangeJet = getRandomAircraft('ultra_long_range');
        expect(ultraLongRangeJet.category).toBe('ultra_long_range');
      });
    });
  });

  describe('Data Quality', () => {
    it('should have unique registration numbers', () => {
      const registrations = aircraftDatabase.map(a => a.registration);
      const uniqueRegistrations = new Set(registrations);
      expect(uniqueRegistrations.size).toBe(registrations.length);
    });

    it('should have realistic type/model combinations', () => {
      aircraftDatabase.forEach((aircraft) => {
        // Type should be a known manufacturer or category descriptor
        const validTypes = [
          'Citation', 'Learjet', 'Phenom', 'Hawker', 'Challenger',
          'Gulfstream', 'Falcon', 'Global', 'Legacy', 'Praetor'
        ];
        const hasValidType = validTypes.some(type =>
          aircraft.type.includes(type) || aircraft.model.includes(type)
        );
        expect(hasValidType).toBe(true);
      });
    });

    it('should have common amenities for private jets', () => {
      const commonAmenities = [
        'WiFi', 'Satellite Phone', 'Entertainment System',
        'Full Galley', 'Lavatory', 'Reclining Seats'
      ];

      aircraftDatabase.forEach((aircraft) => {
        const hasCommonAmenity = aircraft.amenities.some(amenity =>
          commonAmenities.includes(amenity)
        );
        expect(hasCommonAmenity).toBe(true);
      });
    });
  });
});
