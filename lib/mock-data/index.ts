/**
 * Mock Data Barrel Exports
 * Central export point for all mock data utilities
 * ONEK-71: Mock Data Infrastructure
 */

// Aircraft Database (ONEK-75)
export type { Aircraft, Operator } from './aircraft-database';
export {
  MOCK_AIRCRAFT,
  MOCK_OPERATORS,
  AIRCRAFT_BY_CATEGORY,
  DATABASE_STATS,
  getAircraftById,
  getAircraftByOperator,
  getOperatorById,
  filterAircraft,
  filterAircraftByBudget,
  getAircraftByCategory,
  getRandomAircraft,
} from './aircraft-database';

// Avinode API Responses (ONEK-76)
export {
  generateMockFlightResults,
  generateMockRFPResponse,
  generateMockQuotes,
  simulateAPIDelay,
  storeRFP,
  getStoredQuotes,
  getAllStoredRFPs,
  clearStoredRFPs,
  getExampleResponses,
} from './avinode-responses';
