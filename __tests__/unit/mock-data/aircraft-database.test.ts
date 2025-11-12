/**
 * Unit tests for Aircraft Database
 * Testing existing implementation from ONEK-75
 */

import { describe, it, expect } from 'vitest';
import {
  MOCK_AIRCRAFT,
  AIRCRAFT_BY_CATEGORY,
  getAircraftByCategory,
  getRandomAircraft,
  getAircraftById,
  filterAircraft,
  filterAircraftByBudget,
  DATABASE_STATS,
  type Aircraft,
} from '@/lib/mock-data/aircraft-database';

describe('Aircraft Database', () => {
  describe('Database Structure', () => {
    it('should have at least 20 aircraft in total', () => {
      expect(MOCK_AIRCRAFT.length).toBeGreaterThanOrEqual(20);
      expect(DATABASE_STATS.totalAircraft).toBeGreaterThanOrEqual(20);
    });

    it('should have at least 5 light jets', () => {
      const lightJets = MOCK_AIRCRAFT.filter(a => a.category === 'light');
      expect(lightJets.length).toBeGreaterThanOrEqual(5);
      expect(DATABASE_STATS.byCategory.light).toBeGreaterThanOrEqual(5);
    });

    it('should have at least 4 midsize jets', () => {
      const midsizeJets = MOCK_AIRCRAFT.filter(a => a.category === 'midsize');
      expect(midsizeJets.length).toBeGreaterThanOrEqual(4);
      expect(DATABASE_STATS.byCategory.midsize).toBeGreaterThanOrEqual(4);
    });

    it('should have at least 4 heavy jets', () => {
      const heavyJets = MOCK_AIRCRAFT.filter(a => a.category === 'heavy');
      expect(heavyJets.length).toBeGreaterThanOrEqual(4);
      expect(DATABASE_STATS.byCategory.heavy).toBeGreaterThanOrEqual(4);
    });

    it('should have at least 3 ultra-long-range jets', () => {
      const ultraLongRangeJets = MOCK_AIRCRAFT.filter(a => a.category === 'ultra-long-range');
      expect(ultraLongRangeJets.length).toBeGreaterThanOrEqual(3);
      expect(DATABASE_STATS.byCategory['ultra-long-range']).toBeGreaterThanOrEqual(3);
    });

    it('should have super-midsize category', () => {
      const superMidsizeJets = MOCK_AIRCRAFT.filter(a => a.category === 'super-midsize');
      expect(superMidsizeJets.length).toBeGreaterThan(0);
      expect(DATABASE_STATS.byCategory['super-midsize']).toBeGreaterThan(0);
    });
  });

  describe('Aircraft Properties Validation', () => {
    it('should have all required fields for each aircraft', () => {
      MOCK_AIRCRAFT.forEach((aircraft) => {
        expect(aircraft).toHaveProperty('id');
        expect(aircraft).toHaveProperty('type');
        expect(aircraft).toHaveProperty('model');
        expect(aircraft).toHaveProperty('registration');
        expect(aircraft).toHaveProperty('category');
        expect(aircraft).toHaveProperty('capacity');
        expect(aircraft).toHaveProperty('yearBuilt');
        expect(aircraft).toHaveProperty('specifications');
        expect(aircraft).toHaveProperty('pricing');
        expect(aircraft).toHaveProperty('amenities');
        expect(aircraft).toHaveProperty('operatorId');
      });
    });

    it('should have valid category values', () => {
      const validCategories = ['light', 'midsize', 'super-midsize', 'heavy', 'ultra-long-range'];
      MOCK_AIRCRAFT.forEach((aircraft) => {
        expect(validCategories).toContain(aircraft.category);
      });
    });

    it('should have non-empty strings for type, model, and registration', () => {
      MOCK_AIRCRAFT.forEach((aircraft) => {
        expect(aircraft.type).toBeTruthy();
        expect(aircraft.model).toBeTruthy();
        expect(aircraft.registration).toBeTruthy();
        expect(typeof aircraft.type).toBe('string');
        expect(typeof aircraft.model).toBe('string');
        expect(typeof aircraft.registration).toBe('string');
      });
    });

    it('should have realistic capacity values', () => {
      MOCK_AIRCRAFT.forEach((aircraft) => {
        expect(aircraft.capacity).toBeGreaterThan(0);
        expect(aircraft.capacity).toBeLessThanOrEqual(19);
      });
    });

    it('should have realistic range values in nautical miles', () => {
      MOCK_AIRCRAFT.forEach((aircraft) => {
        expect(aircraft.specifications.maxRange).toBeGreaterThan(500);
        expect(aircraft.specifications.maxRange).toBeLessThanOrEqual(8000);
      });
    });

    it('should have realistic speed values in knots', () => {
      MOCK_AIRCRAFT.forEach((aircraft) => {
        expect(aircraft.specifications.cruiseSpeed).toBeGreaterThan(300);
        expect(aircraft.specifications.cruiseSpeed).toBeLessThanOrEqual(700);
      });
    });

    it('should have realistic year built values', () => {
      const currentYear = new Date().getFullYear();
      MOCK_AIRCRAFT.forEach((aircraft) => {
        expect(aircraft.yearBuilt).toBeGreaterThanOrEqual(2015);
        expect(aircraft.yearBuilt).toBeLessThanOrEqual(currentYear + 1);
      });
    });

    it('should have amenities array for each aircraft', () => {
      MOCK_AIRCRAFT.forEach((aircraft) => {
        expect(Array.isArray(aircraft.amenities)).toBe(true);
        expect(aircraft.amenities.length).toBeGreaterThan(0);
      });
    });

    it('should have valid specifications structure', () => {
      MOCK_AIRCRAFT.forEach((aircraft) => {
        expect(aircraft.specifications).toHaveProperty('maxRange');
        expect(aircraft.specifications).toHaveProperty('cruiseSpeed');
        expect(aircraft.specifications).toHaveProperty('maxAltitude');
        expect(aircraft.specifications).toHaveProperty('baggage');
      });
    });

    it('should have valid pricing structure', () => {
      MOCK_AIRCRAFT.forEach((aircraft) => {
        expect(aircraft.pricing).toHaveProperty('hourlyRateMin');
        expect(aircraft.pricing).toHaveProperty('hourlyRateMax');
        expect(aircraft.pricing).toHaveProperty('dailyMinimumHours');
        expect(aircraft.pricing.hourlyRateMin).toBeLessThanOrEqual(aircraft.pricing.hourlyRateMax);
      });
    });
  });

  describe('Category-Specific Specifications', () => {
    describe('Light Jets', () => {
      it('should have capacity between 4-8 passengers', () => {
        const lightJets = AIRCRAFT_BY_CATEGORY.light;
        lightJets.forEach((aircraft) => {
          expect(aircraft.capacity).toBeGreaterThanOrEqual(4);
          expect(aircraft.capacity).toBeLessThanOrEqual(8);
        });
      });

      it('should have range between 1100-2500nm', () => {
        const lightJets = AIRCRAFT_BY_CATEGORY.light;
        lightJets.forEach((aircraft) => {
          expect(aircraft.specifications.maxRange).toBeGreaterThanOrEqual(1100);
          expect(aircraft.specifications.maxRange).toBeLessThanOrEqual(2500);
        });
      });
    });

    describe('Midsize Jets', () => {
      it('should have capacity between 7-9 passengers', () => {
        const midsizeJets = AIRCRAFT_BY_CATEGORY.midsize;
        midsizeJets.forEach((aircraft) => {
          expect(aircraft.capacity).toBeGreaterThanOrEqual(7);
          expect(aircraft.capacity).toBeLessThanOrEqual(9);
        });
      });

      it('should have range between 2100-3200nm', () => {
        const midsizeJets = AIRCRAFT_BY_CATEGORY.midsize;
        midsizeJets.forEach((aircraft) => {
          expect(aircraft.specifications.maxRange).toBeGreaterThanOrEqual(2100);
          expect(aircraft.specifications.maxRange).toBeLessThanOrEqual(3200);
        });
      });
    });

    describe('Heavy Jets', () => {
      it('should have capacity between 12-14 passengers', () => {
        const heavyJets = AIRCRAFT_BY_CATEGORY.heavy;
        heavyJets.forEach((aircraft) => {
          expect(aircraft.capacity).toBeGreaterThanOrEqual(12);
          expect(aircraft.capacity).toBeLessThanOrEqual(14);
        });
      });

      it('should have range between 3400-4800nm', () => {
        const heavyJets = AIRCRAFT_BY_CATEGORY.heavy;
        heavyJets.forEach((aircraft) => {
          expect(aircraft.specifications.maxRange).toBeGreaterThanOrEqual(3400);
          expect(aircraft.specifications.maxRange).toBeLessThanOrEqual(4800);
        });
      });
    });

    describe('Ultra-Long-Range Jets', () => {
      it('should have capacity between 14-19 passengers', () => {
        const ultraLongRangeJets = AIRCRAFT_BY_CATEGORY['ultra-long-range'];
        ultraLongRangeJets.forEach((aircraft) => {
          expect(aircraft.capacity).toBeGreaterThanOrEqual(14);
          expect(aircraft.capacity).toBeLessThanOrEqual(19);
        });
      });

      it('should have range between 6400-7800nm', () => {
        const ultraLongRangeJets = AIRCRAFT_BY_CATEGORY['ultra-long-range'];
        ultraLongRangeJets.forEach((aircraft) => {
          expect(aircraft.specifications.maxRange).toBeGreaterThanOrEqual(6400);
          expect(aircraft.specifications.maxRange).toBeLessThanOrEqual(7800);
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

        const ultraLongRangeJets = getAircraftByCategory('ultra-long-range');
        expect(ultraLongRangeJets.every(a => a.category === 'ultra-long-range')).toBe(true);
      });

      it('should return at least 3 aircraft for each category', () => {
        expect(getAircraftByCategory('light').length).toBeGreaterThanOrEqual(3);
        expect(getAircraftByCategory('midsize').length).toBeGreaterThanOrEqual(3);
        expect(getAircraftByCategory('heavy').length).toBeGreaterThanOrEqual(3);
        expect(getAircraftByCategory('ultra-long-range').length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('getRandomAircraft()', () => {
      it('should return multiple random aircraft matching criteria', () => {
        const aircraft = getRandomAircraft(6, 1500, 3);
        expect(aircraft.length).toBeLessThanOrEqual(3);
        aircraft.forEach((ac) => {
          expect(ac.capacity).toBeGreaterThanOrEqual(6);
          expect(ac.specifications.maxRange).toBeGreaterThanOrEqual(1500);
        });
      });

      it('should filter by minimum capacity', () => {
        const largeAircraft = getRandomAircraft(12, 0, 5);
        largeAircraft.forEach((ac) => {
          expect(ac.capacity).toBeGreaterThanOrEqual(12);
        });
      });

      it('should filter by minimum range', () => {
        const longRangeAircraft = getRandomAircraft(0, 5000, 5);
        longRangeAircraft.forEach((ac) => {
          expect(ac.specifications.maxRange).toBeGreaterThanOrEqual(5000);
        });
      });
    });

    describe('getAircraftById()', () => {
      it('should return aircraft by ID', () => {
        const aircraft = getAircraftById('AC-001');
        expect(aircraft).toBeDefined();
        expect(aircraft?.id).toBe('AC-001');
      });

      it('should return undefined for invalid ID', () => {
        const aircraft = getAircraftById('INVALID');
        expect(aircraft).toBeUndefined();
      });
    });

    describe('filterAircraft()', () => {
      it('should filter by capacity and range', () => {
        const filtered = filterAircraft(8, 2500);
        filtered.forEach((ac) => {
          expect(ac.capacity).toBeGreaterThanOrEqual(8);
          expect(ac.specifications.maxRange).toBeGreaterThanOrEqual(2500);
        });
      });
    });

    describe('filterAircraftByBudget()', () => {
      it('should return aircraft within hourly rate budget', () => {
        const affordable = filterAircraftByBudget(4000);
        affordable.forEach((ac) => {
          expect(ac.pricing.hourlyRateMin).toBeLessThanOrEqual(4000);
        });
      });

      it('should return empty array for unrealistically low budget', () => {
        const tooLow = filterAircraftByBudget(1000);
        expect(tooLow.length).toBe(0);
      });
    });
  });

  describe('Data Quality', () => {
    it('should have unique IDs', () => {
      const ids = MOCK_AIRCRAFT.map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique registration numbers', () => {
      const registrations = MOCK_AIRCRAFT.map(a => a.registration);
      const uniqueRegistrations = new Set(registrations);
      expect(uniqueRegistrations.size).toBe(registrations.length);
    });

    it('should have realistic type/model combinations', () => {
      const validTypes = [
        'Citation', 'Learjet', 'Phenom', 'Hawker', 'Challenger', 'Honda',
        'Gulfstream', 'Falcon', 'Global', 'Legacy', 'Praetor', 'PC-', 'G150', 'G450'
      ];

      MOCK_AIRCRAFT.forEach((aircraft) => {
        const hasValidType = validTypes.some(type =>
          aircraft.type.includes(type) || aircraft.model.includes(type)
        );
        expect(hasValidType).toBe(true);
      });
    });

    it('should have common amenities for private jets', () => {
      MOCK_AIRCRAFT.forEach((aircraft) => {
        // All aircraft should have at least WiFi or Entertainment System
        const hasBasicAmenity = aircraft.amenities.some(amenity =>
          amenity.includes('WiFi') || amenity.includes('Entertainment')
        );
        expect(hasBasicAmenity).toBe(true);
      });
    });

    it('should have valid operator IDs', () => {
      MOCK_AIRCRAFT.forEach((aircraft) => {
        expect(aircraft.operatorId).toMatch(/^OP-\d{3}$/);
      });
    });
  });

  describe('Database Statistics', () => {
    it('should have accurate statistics', () => {
      expect(DATABASE_STATS.totalAircraft).toBe(MOCK_AIRCRAFT.length);
      expect(DATABASE_STATS.totalOperators).toBeGreaterThan(0);
      expect(parseFloat(DATABASE_STATS.avgOperatorRating)).toBeGreaterThan(4);
    });
  });
});
