/**
 * Avinode API Connection Test
 *
 * Tests the Avinode API connection and retrieves a deep link
 * by creating a trip with flight search criteria.
 *
 * Usage: npx tsx scripts/test-avinode-connection.ts
 */

export {};

const BASE_URI = 'https://sandbox.avinode.com/api';
const API_TOKEN = '2fb95826-bcde-4caf-94ed-f74049b86bb8';
const AUTHENTICATION_TOKEN = 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6ImUxMjNmMTE4LTM1NjgtNGE3MC05YTE3LWNjZTgyYzJmN2Q1ZCJ9.eyJzdWIiOiI1QUU2RTFERC0wNzZCLTQxNzMtQTFERS0xNUI2NTZFQzVCOTgiLCJpc3MiOiJhdmlub2RlIiwiYXZpdHlwZSI6MTYsImF2aWRvbWFpbiI6Ii5hdmlub2RlLmNvbSIsImF2aW5vbmNlIjoiZTQ5MzEyYjktOGEyNi00MzRiLThkMGEtOWJhMjI5MGJhNTFiIiwiYXZpdGVuYW50IjoxMzc5Mn0.iCsdrWp6fuqSeu8xHtQJlaY4iCktwVKwjrV93Z9qQWr8oh-3fAeOxjLqsN80RnxadE0C7WcRem9IbyRw31dR8IbA6usfxdHr5imVd0sTd4gEY9I8OOcGrY2roKFt_XZUHK0pY7szDxYUM3MLrCGrCPVOgilsFMBCP84v9BVN8cTsxYuU_0sQT46Qcc3qk9iiSsZD5dd6LvTw2t1kdi3EJqCyt_z3T4TYNmqs8oG9Xt0yZFjYxfftsyxGIhpk5tct74Azf0ZPaLipXC-Z1zUjURkek3D3t3tNLazniWUCelmp-YNq68iDgstjPjFZUEQSs2qoqlid6F4EKK-wZtSChQ';

interface TripResponse {
  data: {
    id: string;
    href: string;
    type: string;
    actions: {
      searchInAvinode: {
        description: string;
        href: string;
      };
      viewInAvinode: {
        description: string;
        href: string;
      };
      cancel: {
        description: string;
        href: string;
      };
    };
  };
}

async function testAvinodeConnection(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Avinode API Connection Test');
  console.log('='.repeat(60));
  console.log(`\nBase URL: ${BASE_URI}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // Prepare headers per Avinode API requirements
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${AUTHENTICATION_TOKEN}`,
    'X-Avinode-ApiToken': API_TOKEN,
    'X-Avinode-SentTimestamp': new Date().toISOString(),
    'X-Avinode-Product': 'JetVision/1.0',
    'X-Avinode-ApiVersion': 'v1.0',
    'Content-Type': 'application/json',
  };

  // Trip creation payload
  // Using a future date for the flight
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
  const dateStr = futureDate.toISOString().split('T')[0]; // YYYY-MM-DD

  const payload = {
    sourcing: true,
    criteria: {
      startAirport: { icao: 'KTEB' },  // Teterboro, NJ
      endAirport: { icao: 'KVNY' },    // Van Nuys, CA
      date: dateStr,
      passengers: 6
    }
  };

  console.log('\n--- Request Details ---');
  console.log(`Endpoint: POST ${BASE_URI}/trips`);
  console.log(`Departure: KTEB (Teterboro)`);
  console.log(`Arrival: KVNY (Van Nuys)`);
  console.log(`Date: ${dateStr}`);
  console.log(`Passengers: 6`);

  try {
    console.log('\n--- Sending Request ---');

    const response = await fetch(`${BASE_URI}/trips`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    console.log(`\nHTTP Status: ${response.status} ${response.statusText}`);

    // Log rate limit headers
    const rateLimitLimit = response.headers.get('X-Rate-Limit-Limit');
    const rateLimitRemaining = response.headers.get('X-Rate-Limit-Remaining');
    const rateLimitReset = response.headers.get('X-Rate-Limit-Reset');

    if (rateLimitLimit) {
      console.log(`\n--- Rate Limit Info ---`);
      console.log(`Limit: ${rateLimitLimit}`);
      console.log(`Remaining: ${rateLimitRemaining}`);
      console.log(`Reset: ${rateLimitReset}s`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\nError Response: ${errorText}`);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data: TripResponse = await response.json();

    console.log('\n' + '='.repeat(60));
    console.log('SUCCESS - Trip Created!');
    console.log('='.repeat(60));

    console.log(`\n--- Trip Details ---`);
    console.log(`Trip ID: ${data.data.id}`);
    console.log(`API URL: ${data.data.href}`);

    console.log(`\n--- Deep Links ---`);
    console.log(`\nSearch in Avinode (open this to browse flights):`);
    console.log(`  ${data.data.actions.searchInAvinode.href}`);

    console.log(`\nView Trip in Avinode:`);
    console.log(`  ${data.data.actions.viewInAvinode.href}`);

    console.log(`\nCancel Trip Endpoint:`);
    console.log(`  ${data.data.actions.cancel.href}`);

    console.log('\n' + '='.repeat(60));
    console.log('TEST PASSED - Avinode API connection is working!');
    console.log('='.repeat(60));

    // Return the key information
    return;

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('TEST FAILED');
    console.error('='.repeat(60));

    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      if (error.cause) {
        console.error(`Cause: ${error.cause}`);
      }
    } else {
      console.error('Unknown error:', error);
    }

    process.exit(1);
  }
}

// Run the test
testAvinodeConnection();
