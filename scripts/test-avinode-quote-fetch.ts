/**
 * Avinode Quote Fetch Test
 *
 * Fetches quote details from Avinode API
 *
 * Usage: npx tsx scripts/test-avinode-quote-fetch.ts [quoteId]
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

async function fetchQuote(quoteId: string): Promise<void> {
  console.log('='.repeat(60));
  console.log('Avinode Quote Fetch Test');
  console.log('='.repeat(60));
  console.log(`\nQuote ID: ${quoteId}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    const response = await fetch(`${BASE_URI}/quotes/${quoteId}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    console.log(`\nStatus: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('\n=== QUOTE DETAILS ===');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log(`\nError: ${errorText}`);
    }
  } catch (error) {
    console.log(`\nError: ${error instanceof Error ? error.message : error}`);
  }
}

async function fetchTripMessages(tripMsgId: string): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Trip Messages');
  console.log('='.repeat(60));
  console.log(`\nMessage ID: ${tripMsgId}`);

  try {
    const response = await fetch(`${BASE_URI}/tripmsgs/${tripMsgId}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    console.log(`\nStatus: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('\n=== MESSAGE DETAILS ===');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log(`\nError: ${errorText}`);
    }
  } catch (error) {
    console.log(`\nError: ${error instanceof Error ? error.message : error}`);
  }
}

async function main(): Promise<void> {
  // Quote ID from the trip fetch
  const quoteId = process.argv[2] || 'aquote-386512791';
  const tripMsgId = 'abuyermsg-120487158';

  await fetchQuote(quoteId);
  await fetchTripMessages(tripMsgId);

  console.log('\n' + '='.repeat(60));
  console.log('Test Complete');
  console.log('='.repeat(60));
}

main();
