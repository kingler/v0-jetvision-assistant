#!/usr/bin/env tsx
/**
 * Test quote fetching via axios client like the actual code does
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.AVINODE_API_KEY || '';
const apiToken = process.env.AVINODE_API_TOKEN || '';
const baseUrl = process.env.AVINODE_BASE_URL || 'https://sandbox.avinode.com/api';

const client = axios.create({
  baseURL: baseUrl,
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'X-Avinode-ApiToken': apiToken,
    'X-Avinode-ApiVersion': 'v1.0',
    'X-Avinode-Product': 'Jetvision/1.0.0',
  },
});

client.interceptors.request.use((config) => {
  config.headers['X-Avinode-SentTimestamp'] = new Date().toISOString();
  return config;
});

async function test() {
  // Test fetching a quote with the full ID (as returned by API)
  const quoteId = 'aquote-390825418';
  console.log('\n🔍 Testing quote fetch with full ID:', quoteId);

  try {
    const response = await client.get(`/quotes/${quoteId}`, {
      params: { quotebreakdown: true, taildetails: true }
    });
    console.log('✅ SUCCESS! Status:', response.status);
    console.log('   Price:', response.data?.data?.sellerPrice);
    console.log('   Aircraft:', response.data?.data?.lift?.aircraftType);
  } catch (error: any) {
    console.log('❌ FAILED! Status:', error.response?.status);
    console.log('   Error:', JSON.stringify(error.response?.data));
  }

  // Test fetching with stripped prefix (what the bug might be doing)
  const strippedId = '390825418';
  console.log('\n🔍 Testing quote fetch with stripped ID:', strippedId);

  try {
    const response = await client.get(`/quotes/${strippedId}`, {
      params: { quotebreakdown: true, taildetails: true }
    });
    console.log('✅ SUCCESS! Status:', response.status);
    console.log('   Price:', response.data?.data?.sellerPrice);
  } catch (error: any) {
    console.log('❌ FAILED! Status:', error.response?.status);
    console.log('   Error:', JSON.stringify(error.response?.data));
  }
}

test().catch(console.error);
