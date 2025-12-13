/**
 * Avinode Trip/RFQ Fetch Test
 *
 * Tests fetching trip and RFQ details from Avinode API
 * using a trip ID from the Avinode UI.
 *
 * Usage: npx tsx scripts/test-avinode-trip-fetch.ts [tripId]
 */

export {};

const BASE_URI = 'https://sandbox.avinode.com/api';
const API_TOKEN = '2fb95826-bcde-4caf-94ed-f74049b86bb8';
const AUTHENTICATION_TOKEN = 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6ImUxMjNmMTE4LTM1NjgtNGE3MC05YTE3LWNjZTgyYzJmN2Q1ZCJ9.eyJzdWIiOiI1QUU2RTFERC0wNzZCLTQxNzMtQTFERS0xNUI2NTZFQzVCOTgiLCJpc3MiOiJhdmlub2RlIiwiYXZpdHlwZSI6MTYsImF2aWRvbWFpbiI6Ii5hdmlub2RlLmNvbSIsImF2aW5vbmNlIjoiZTQ5MzEyYjktOGEyNi00MzRiLThkMGEtOWJhMjI5MGJhNTFiIiwiYXZpdGVuYW50IjoxMzc5Mn0.iCsdrWp6fuqSeu8xHtQJlaY4iCktwVKwjrV93Z9qQWr8oh-3fAeOxjLqsN80RnxadE0C7WcRem9IbyRw31dR8IbA6usfxdHr5imVd0sTd4gEY9I8OOcGrY2roKFt_XZUHK0pY7szDxYUM3MLrCGrCPVOgilsFMBCP84v9BVN8cTsxYuU_0sQT46Qcc3qk9iiSsZD5dd6LvTw2t1kdi3EJqCyt_z3T4TYNmqs8oG9Xt0yZFjYxfftsyxGIhpk5tct74Azf0ZPaLipXC-Z1zUjURkek3D3t3tNLazniWUCelmp-YNq68iDgstjPjFZUEQSs2qoqlid6F4EKK-wZtSChQ';

function getHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${AUTHENTICATION_TOKEN}`,
    'X-Avinode-ApiToken': API_TOKEN,
    'X-Avinode-SentTimestamp': new Date().toISOString(),
    'X-Avinode-Product': 'JetVision/1.0',
    'X-Avinode-ApiVersion': 'v1.0',
    'Content-Type': 'application/json',
  };
}

async function fetchTrip(tripId: string): Promise<void> {
  console.log(`\n--- Fetching Trip: ${tripId} ---`);

  // Try different ID formats
  const idFormats = [
    tripId,                           // As provided (e.g., N9J9VV)
    `atrip-${tripId}`,               // With atrip- prefix
    tripId.toLowerCase(),            // Lowercase
  ];

  for (const id of idFormats) {
    console.log(`\nTrying ID format: ${id}`);

    try {
      const response = await fetch(`${BASE_URI}/trips/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      });

      console.log(`  Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log('\n=== TRIP FOUND ===');
        console.log(JSON.stringify(data, null, 2));
        return;
      } else if (response.status !== 404) {
        const errorText = await response.text();
        console.log(`  Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`  Error: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log('\nTrip not found with any ID format.');
}

async function fetchRFQ(rfqId: string): Promise<void> {
  console.log(`\n--- Fetching RFQ: ${rfqId} ---`);

  // Try different ID formats
  const idFormats = [
    rfqId,
    `arfq-${rfqId}`,
    rfqId.toLowerCase(),
  ];

  for (const id of idFormats) {
    console.log(`\nTrying ID format: ${id}`);

    try {
      const response = await fetch(`${BASE_URI}/rfqs/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      });

      console.log(`  Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log('\n=== RFQ FOUND ===');
        console.log(JSON.stringify(data, null, 2));
        return;
      } else if (response.status !== 404) {
        const errorText = await response.text();
        console.log(`  Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`  Error: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log('\nRFQ not found with any ID format.');
}

async function listMyTrips(): Promise<void> {
  console.log('\n--- Listing My Recent Trips ---');

  try {
    const response = await fetch(`${BASE_URI}/trips?limit=10&sort=-createdAt`, {
      method: 'GET',
      headers: getHeaders(),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('\n=== MY TRIPS ===');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log(`Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`Error: ${error instanceof Error ? error.message : error}`);
  }
}

async function listMyRFQs(): Promise<void> {
  console.log('\n--- Listing My Recent RFQs ---');

  try {
    const response = await fetch(`${BASE_URI}/rfqs?limit=10&sort=-createdAt`, {
      method: 'GET',
      headers: getHeaders(),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('\n=== MY RFQs ===');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log(`Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`Error: ${error instanceof Error ? error.message : error}`);
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Avinode Trip/RFQ Fetch Test');
  console.log('='.repeat(60));
  console.log(`\nBase URL: ${BASE_URI}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const tripId = process.argv[2] || 'N9J9VV';

  // First try to fetch the specific trip/RFQ
  await fetchTrip(tripId);
  await fetchRFQ(tripId);

  // Also list recent trips and RFQs to see what's available
  await listMyTrips();
  await listMyRFQs();

  console.log('\n' + '='.repeat(60));
  console.log('Test Complete');
  console.log('='.repeat(60));
}

main();
