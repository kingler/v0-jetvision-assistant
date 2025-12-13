/**
 * Avinode All Quotes Fetch
 *
 * Fetches all RFQs and quotes for a trip
 *
 * Usage: npx tsx scripts/test-avinode-all-quotes.ts [tripId]
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

interface Quote {
  id: string;
  aircraft: string;
  tail: string;
  category: string;
  price: number;
  currency: string;
  seller: string;
  flightTime: number;
  maxPax: number;
}

async function fetchQuoteDetails(quoteId: string): Promise<Quote | null> {
  try {
    const response = await fetch(`${BASE_URI}/quotes/${quoteId}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      const q = data.data;
      return {
        id: q.id,
        aircraft: q.lift?.aircraftType || 'Unknown',
        tail: q.lift?.aircraftTail || 'N/A',
        category: q.lift?.aircraftCategory || 'Unknown',
        price: q.sellerPrice?.price || 0,
        currency: q.sellerPrice?.currency || 'USD',
        seller: q.sellerCompany?.displayName || 'Unknown',
        flightTime: q.segments?.[0]?.flightMinutes || 0,
        maxPax: q.lift?.maxPax || 0,
      };
    }
  } catch (error) {
    console.error(`Error fetching quote ${quoteId}:`, error);
  }
  return null;
}

async function main(): Promise<void> {
  const tripId = process.argv[2] || 'N9J9VV';

  console.log('='.repeat(70));
  console.log(`Trip ${tripId} - All Flight Options`);
  console.log('='.repeat(70));
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Fetch trip details
  const response = await fetch(`${BASE_URI}/trips/${tripId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    console.error(`Failed to fetch trip: ${response.status}`);
    return;
  }

  const tripData = await response.json();
  const trip = tripData.data;

  console.log(`Trip ID: ${trip.tripId} (${trip.id})`);
  console.log(`View in Avinode: ${trip.actions?.viewInAvinode?.href}\n`);

  // Get all RFQs
  const rfqs = trip.rfqs || [];
  console.log(`Found ${rfqs.length} RFQ(s)\n`);

  // Collect all quotes from all RFQs
  const allQuotes: Quote[] = [];
  const quoteIds = new Set<string>();

  for (const rfq of rfqs) {
    console.log(`--- RFQ: ${rfq.id} ---`);
    console.log(`  Seller: ${rfq.sellerCompany?.displayName}`);
    console.log(`  Created: ${rfq.createdOn}`);

    // Get quotes from sellerLift
    for (const lift of rfq.sellerLift || []) {
      console.log(`  Aircraft: ${lift.aircraftType} (${lift.aircraftTail})`);
      console.log(`  Category: ${lift.aircraftCategory}`);
      console.log(`  Max Pax: ${lift.maxPax}`);
      console.log(`  Status: ${lift.sourcingDisplayStatus}`);

      for (const quote of lift.links?.quotes || []) {
        if (!quoteIds.has(quote.id)) {
          quoteIds.add(quote.id);
          const quoteDetails = await fetchQuoteDetails(quote.id);
          if (quoteDetails) {
            allQuotes.push(quoteDetails);
          }
        }
      }
    }
    console.log('');
  }

  // Display summary table
  console.log('='.repeat(70));
  console.log('FLIGHT OPTIONS SUMMARY');
  console.log('='.repeat(70));
  console.log('');

  if (allQuotes.length === 0) {
    console.log('No quotes found yet.');
  } else {
    // Sort by price
    allQuotes.sort((a, b) => a.price - b.price);

    console.log('| # | Aircraft          | Tail    | Category   | Price       | Flight | Seller           |');
    console.log('|---|-------------------|---------|------------|-------------|--------|------------------|');

    allQuotes.forEach((q, i) => {
      const aircraft = q.aircraft.substring(0, 17).padEnd(17);
      const tail = q.tail.substring(0, 7).padEnd(7);
      const category = q.category.substring(0, 10).padEnd(10);
      const price = `$${q.price.toLocaleString()}`.padStart(11);
      const flight = `${Math.floor(q.flightTime / 60)}h ${q.flightTime % 60}m`.padStart(6);
      const seller = q.seller.substring(0, 16).padEnd(16);

      console.log(`| ${(i + 1).toString().padStart(1)} | ${aircraft} | ${tail} | ${category} | ${price} | ${flight} | ${seller} |`);
    });

    console.log('');
    console.log(`Total Options: ${allQuotes.length}`);
    console.log(`Price Range: $${allQuotes[0].price.toLocaleString()} - $${allQuotes[allQuotes.length - 1].price.toLocaleString()}`);
  }

  console.log('\n' + '='.repeat(70));
}

main();
