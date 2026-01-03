import { config } from 'dotenv';
import { AvinodeClient } from '../../lib/mcp/clients/avinode-client';

config({ path: '.env.local' });

const tripId = process.argv[2] || 'B22E7Z';

const apiKey = process.env.AVINODE_API_KEY || '';
const baseUrl = process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';

if (!apiKey) {
  console.error('Missing AVINODE_API_KEY in .env.local');
  process.exit(1);
}

const client = new AvinodeClient({
  apiKey,
  baseUrl,
});

const requiredNested = {
  departureAirport: ['icao'],
  arrivalAirport: ['icao'],
  amenities: ['wifi', 'pets', 'smoking', 'galley', 'lavatory', 'medical'],
};

const requiredFields = [
  'id',
  'quoteId',
  'departureAirport',
  'arrivalAirport',
  'departureDate',
  'flightDuration',
  'aircraftType',
  'aircraftModel',
  'passengerCapacity',
  'operatorName',
  'totalPrice',
  'currency',
  'amenities',
  'rfqStatus',
  'lastUpdated',
];

const optionalFields = [
  'departureTime',
  'tailNumber',
  'yearOfManufacture',
  'tailPhotoUrl',
  'operatorRating',
  'operatorEmail',
  'priceBreakdown',
  'validUntil',
  'responseTimeMinutes',
  'isSelected',
  'aircraftCategory',
  'hasMedical',
  'hasPackage',
  'avinodeDeepLink',
];

function listMissingFields(flight: Record<string, any>) {
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (flight[field] === undefined || flight[field] === null) {
      missing.push(field);
    }
  }

  Object.entries(requiredNested).forEach(([field, keys]) => {
    const obj = flight[field];
    if (!obj) {
      missing.push(field);
      return;
    }
    keys.forEach((key) => {
      if (obj[key] === undefined || obj[key] === null) {
        missing.push(`${field}.${key}`);
      }
    });
  });

  return missing;
}

async function run() {
  const rfqData = await client.getRFQFlights(tripId);
  const flights = rfqData.flights || [];

  console.log(`Trip ID: ${tripId}`);
  console.log(`Flights returned: ${flights.length}`);

  flights.forEach((flight, index) => {
    const missing = listMissingFields(flight);
    console.log(`\nFlight ${index + 1}: ${flight.id}`);
    console.log('Details:', {
      id: flight.id,
      quoteId: flight.quoteId,
      departureAirport: flight.departureAirport,
      arrivalAirport: flight.arrivalAirport,
      departureDate: flight.departureDate,
      departureTime: flight.departureTime,
      flightDuration: flight.flightDuration,
      aircraftType: flight.aircraftType,
      aircraftModel: flight.aircraftModel,
      tailNumber: flight.tailNumber,
      yearOfManufacture: flight.yearOfManufacture,
      passengerCapacity: flight.passengerCapacity,
      tailPhotoUrl: flight.tailPhotoUrl,
      operatorName: flight.operatorName,
      operatorRating: flight.operatorRating,
      operatorEmail: flight.operatorEmail,
      totalPrice: flight.totalPrice,
      currency: flight.currency,
      priceBreakdown: flight.priceBreakdown,
      validUntil: flight.validUntil,
      amenities: flight.amenities,
      rfqStatus: flight.rfqStatus,
      lastUpdated: flight.lastUpdated,
      responseTimeMinutes: flight.responseTimeMinutes,
      isSelected: flight.isSelected,
      aircraftCategory: flight.aircraftCategory,
      hasMedical: flight.hasMedical,
      hasPackage: flight.hasPackage,
      avinodeDeepLink: flight.avinodeDeepLink,
    });

    if (missing.length === 0) {
      console.log('Missing required fields: none');
    } else {
      console.log('Missing required fields:', missing);
    }

    const missingOptional = optionalFields.filter(
      (field) => flight[field] === undefined || flight[field] === null
    );
    console.log('Optional fields missing:', missingOptional);
  });
}

run().catch((error) => {
  console.error('Failed to fetch RFQ flights:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
