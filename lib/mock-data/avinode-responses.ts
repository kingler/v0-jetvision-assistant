/**
 * Mock Avinode API Responses
 * Generates realistic mock data for Avinode MCP server testing
 * ONEK-76: Avinode API Response Mocks
 */

import type {
  FlightSearchParams,
  FlightResult,
  RFPResponse,
  Quote,
} from '../../mcp-servers/avinode-mcp-server/src/types';
import { MOCK_AIRCRAFT, MOCK_OPERATORS, type Aircraft, type Operator } from './aircraft-database';

/**
 * Route distance database (in nautical miles)
 */
const ROUTE_DISTANCES: Record<string, number> = {
  'KTEB-KPBI': 1100, // Teterboro to West Palm Beach
  'KVNY-KLAS': 185,  // Van Nuys to Las Vegas
  'KSNA-KSLC': 570,  // Santa Ana to Salt Lake City
  'KMIA-KASE': 1650, // Miami to Aspen
  'KTEB-KVNY': 2445, // Teterboro to Van Nuys
  'KSFO-KJFK': 2586, // San Francisco to JFK
  'KDAL-KMIA': 1089, // Dallas Love Field to Miami
  'KBOS-KSFO': 2704, // Boston to San Francisco
  'KPDK-KLAS': 1734, // Atlanta to Las Vegas
  'KOAK-KSEA': 696,  // Oakland to Seattle
};

/**
 * Get route distance in nautical miles
 */
function getRouteDistance(departure: string, arrival: string): number {
  const key = `${departure}-${arrival}`;
  const reverseKey = `${arrival}-${departure}`;

  return ROUTE_DISTANCES[key] || ROUTE_DISTANCES[reverseKey] || 500; // Default 500 NM
}

/**
 * Calculate flight time in minutes including taxi time
 */
function calculateFlightTime(distance: number, cruiseSpeed: number): number {
  const flightHours = distance / cruiseSpeed;
  const flightMinutes = flightHours * 60;
  const taxiTime = 15; // 15 minutes taxi/takeoff/landing

  return Math.round(flightMinutes + taxiTime);
}

/**
 * Calculate total flight cost
 */
function calculateFlightCost(
  flightTimeMinutes: number,
  hourlyRate: number,
  distance: number
): number {
  const flightHours = flightTimeMinutes / 60;
  const baseCost = flightHours * hourlyRate;

  // Add positioning fee (10% for distances under 300 NM)
  const positioningFee = distance < 300 ? baseCost * 0.1 : 0;

  // Add fuel surcharge (8%)
  const fuelSurcharge = baseCost * 0.08;

  // Add taxes and fees (5%)
  const taxesAndFees = baseCost * 0.05;

  return Math.round(baseCost + positioningFee + fuelSurcharge + taxesAndFees);
}

/**
 * Generate flight schedule
 */
function generateFlightSchedule(
  departureDate: string,
  departureTime: string | undefined,
  durationMinutes: number
): { departure_time: string; arrival_time: string } {
  const time = departureTime || '15:00:00';
  const departureDateTime = new Date(`${departureDate}T${time}Z`);
  const arrivalDateTime = new Date(departureDateTime.getTime() + durationMinutes * 60000);

  return {
    departure_time: departureDateTime.toISOString(),
    arrival_time: arrivalDateTime.toISOString(),
  };
}

/**
 * Filter aircraft by search parameters
 */
function filterAircraftByParams(params: FlightSearchParams): Aircraft[] {
  let filtered = MOCK_AIRCRAFT;

  // Filter by passenger capacity
  filtered = filtered.filter((aircraft) => aircraft.capacity >= params.passengers);

  // Filter by aircraft types
  if (params.aircraft_types && params.aircraft_types.length > 0) {
    const normalizedTypes = params.aircraft_types.map((type) => type.toLowerCase());
    filtered = filtered.filter((aircraft) => normalizedTypes.includes(aircraft.category));
  }

  // Filter by max budget
  if (params.max_budget && params.max_budget > 0) {
    filtered = filtered.filter(
      (aircraft) => aircraft.pricing && aircraft.pricing.hourlyRateMin <= params.max_budget!
    );
  }

  // Filter by minimum operator rating
  if (params.min_operator_rating) {
    filtered = filtered.filter((aircraft) => {
      const operator = MOCK_OPERATORS.find((op) => op.id === aircraft.operatorId);
      return operator && operator.rating >= params.min_operator_rating!;
    });
  }

  // Filter by range capability (20% buffer for safety)
  const routeDistance = getRouteDistance(params.departure_airport, params.arrival_airport);
  filtered = filtered.filter(
    (aircraft) => aircraft.specifications.maxRange >= routeDistance * 1.2
  );

  return filtered;
}

/**
 * Generate mock flight search results
 * Returns 3-8 realistic flight options based on search parameters
 */
export function generateMockFlightResults(
  params: FlightSearchParams
): FlightResult[] {
  const filteredAircraft = filterAircraftByParams(params);

  // Return 3-8 results (or all if fewer than 8 match)
  const resultCount = Math.min(Math.max(3, filteredAircraft.length), 8);
  const selectedAircraft = filteredAircraft.slice(0, resultCount);

  return selectedAircraft.map((aircraft, index) => {
    const operator = MOCK_OPERATORS.find((op) => op.id === aircraft.operatorId)!;
    const routeDistance = getRouteDistance(params.departure_airport, params.arrival_airport);
    const flightTimeMinutes = calculateFlightTime(routeDistance, aircraft.specifications.cruiseSpeed);

    // Vary pricing tier: competitive, market, premium
    const pricingTier = index % 3;
    let hourlyRate: number;

    if (pricingTier === 0) {
      // Competitive pricing (10% above minimum)
      hourlyRate = aircraft.pricing.hourlyRateMin * 1.1;
    } else if (pricingTier === 1) {
      // Market pricing (30% above minimum)
      hourlyRate = aircraft.pricing.hourlyRateMin * 1.3;
    } else {
      // Premium pricing (80% of range above minimum)
      hourlyRate =
        aircraft.pricing.hourlyRateMin +
        (aircraft.pricing.hourlyRateMax - aircraft.pricing.hourlyRateMin) * 0.8;
    }

    const totalCost = calculateFlightCost(flightTimeMinutes, hourlyRate, routeDistance);
    const schedule = generateFlightSchedule(
      params.departure_date,
      params.departure_time,
      flightTimeMinutes
    );

    // Rotate availability status
    const availabilityStatuses: Array<'available' | 'pending' | 'unavailable'> = [
      'available',
      'available',
      'available',
      'pending',
    ];
    const status = availabilityStatuses[index % availabilityStatuses.length];

    return {
      id: `flight-${aircraft.id}-${Date.now()}-${index}`,
      operator: {
        id: operator.id,
        name: operator.name,
        rating: operator.rating,
      },
      aircraft: {
        type: aircraft.category,
        model: aircraft.model,
        registration: aircraft.registration,
        capacity: aircraft.capacity,
        yearBuilt: aircraft.yearBuilt,
        amenities: aircraft.amenities,
      },
      schedule: {
        departure_time: schedule.departure_time,
        arrival_time: schedule.arrival_time,
        duration_minutes: flightTimeMinutes,
      },
      pricing: {
        estimated_total: totalCost,
        currency: 'USD',
        price_per_hour: Math.round(hourlyRate),
      },
      availability: {
        status,
        valid_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      },
    };
  });
}

/**
 * Generate unique RFP ID
 */
function generateRFPId(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 900) + 100;

  return `RFP-${dateStr}-${randomNum}`;
}

/**
 * Generate mock RFP creation response
 */
export function generateMockRFPResponse(
  params: FlightSearchParams,
  clientName: string,
  deadline?: string
): RFPResponse {
  const rfpId = generateRFPId();
  const operatorsContacted = Math.floor(Math.random() * 4) + 2; // 2-5 operators

  // Default deadline: 48 hours from now
  const quoteDeadline =
    deadline || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  return {
    rfp_id: rfpId,
    status: 'sent',
    created_at: new Date().toISOString(),
    operators_contacted: operatorsContacted,
    quote_deadline: quoteDeadline,
    watch_url: `https://avinode.com/watch/${rfpId}`,
  };
}

/**
 * Generate mock quotes for an RFP
 * Returns 2-5 realistic quotes with varied pricing
 */
export function generateMockQuotes(rfpId: string): Quote[] {
  const quoteCount = Math.floor(Math.random() * 4) + 2; // 2-5 quotes
  const randomAircraft = MOCK_AIRCRAFT.slice(0, quoteCount);

  return randomAircraft.map((aircraft, index) => {
    const operator = MOCK_OPERATORS.find((op) => op.id === aircraft.operatorId)!;

    // Vary pricing: 10%, 25%, 40%, 55%, 70% above minimum rate
    const pricingMultipliers = [1.1, 1.25, 1.4, 1.55, 1.7];
    const multiplier = pricingMultipliers[index % pricingMultipliers.length];
    const hourlyRate = aircraft.pricing.hourlyRateMin * multiplier;

    // Estimate 2.5 hours flight time for quote
    const estimatedHours = 2.5;
    const baseCost = hourlyRate * estimatedHours;
    const positioningFee = Math.round(baseCost * 0.15);
    const fuelSurcharge = Math.round(baseCost * 0.08);
    const taxesAndFees = Math.round(baseCost * 0.05);
    const totalCost = Math.round(baseCost + positioningFee + fuelSurcharge + taxesAndFees);

    // Quote received 1-12 hours ago
    const hoursAgo = Math.floor(Math.random() * 12) + 1;
    const receivedAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    // Valid for 48-96 hours from now
    const validHours = Math.floor(Math.random() * 48) + 48;
    const validUntil = new Date(Date.now() + validHours * 60 * 60 * 1000);

    return {
      quote_id: `Q-${rfpId}-${index + 1}`,
      operator: {
        id: operator.id,
        name: operator.name,
        rating: operator.rating,
      },
      aircraft: {
        type: aircraft.category,
        model: aircraft.model,
        registration: aircraft.registration,
      },
      pricing: {
        total: totalCost,
        currency: 'USD',
        breakdown: {
          base_price: Math.round(baseCost),
          fuel_surcharge: fuelSurcharge,
          taxes_fees: taxesAndFees + positioningFee,
        },
      },
      terms: {
        cancellation_policy: '24-hour cancellation policy',
        payment_terms: '50% deposit required, balance due 48 hours before departure',
      },
      valid_until: validUntil.toISOString(),
      notes:
        index === 0
          ? 'Early bird discount available if booked within 24 hours'
          : undefined,
      received_at: receivedAt.toISOString(),
    };
  });
}

/**
 * Simulate API delay (300-800ms)
 */
export async function simulateAPIDelay(): Promise<void> {
  const delay = Math.floor(Math.random() * 500) + 300; // 300-800ms
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * In-memory storage for RFPs (for testing)
 */
interface StoredRFP {
  rfpId: string;
  params: FlightSearchParams;
  clientName: string;
  quotes: Quote[];
  status: 'in_progress' | 'completed';
  createdAt: string;
}

const rfpStorage = new Map<string, StoredRFP>();

/**
 * Store RFP for later quote retrieval (testing helper)
 */
export function storeRFP(
  rfpId: string,
  params: FlightSearchParams,
  clientName: string
): void {
  rfpStorage.set(rfpId, {
    rfpId,
    params,
    clientName,
    quotes: generateMockQuotes(rfpId),
    status: 'in_progress',
    createdAt: new Date().toISOString(),
  });
}

/**
 * Get stored quotes for an RFP (testing helper)
 */
export function getStoredQuotes(rfpId: string): Quote[] | null {
  const storedRFP = rfpStorage.get(rfpId);

  if (!storedRFP) {
    return null;
  }

  // Mark as completed when quotes are retrieved
  storedRFP.status = 'completed';

  return storedRFP.quotes;
}

/**
 * Get all stored RFPs (testing helper)
 */
export function getAllStoredRFPs(): StoredRFP[] {
  return Array.from(rfpStorage.values());
}

/**
 * Clear all stored RFPs (testing helper)
 */
export function clearStoredRFPs(): void {
  rfpStorage.clear();
}

/**
 * Get example responses for documentation/testing
 */
export function getExampleResponses() {
  const exampleParams: FlightSearchParams = {
    departure_airport: 'KTEB',
    arrival_airport: 'KPBI',
    departure_date: '2025-12-15',
    passengers: 6,
  };

  return {
    flightSearch: generateMockFlightResults(exampleParams),
    rfpCreation: generateMockRFPResponse(exampleParams, 'Example Client'),
    quotes: generateMockQuotes('RFP-20251101-001'),
  };
}
