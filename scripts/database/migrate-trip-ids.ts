#!/usr/bin/env npx tsx
/**
 * Migration Script: Populate avinode_trip_id from Messages
 *
 * This script scans existing messages for Trip ID patterns and updates
 * the corresponding requests with the detected Trip IDs.
 *
 * Features:
 * - Scans all messages for Trip ID patterns (atrip-*, alphanumeric, numeric)
 * - Groups findings by request_id
 * - Updates requests table with detected avinode_trip_id
 * - Optionally fetches trip details from Avinode API
 * - Creates a detailed migration report
 *
 * Usage:
 *   npx tsx scripts/database/migrate-trip-ids.ts [--dry-run] [--fetch-details]
 *
 * Options:
 *   --dry-run        Preview changes without applying them
 *   --fetch-details  Fetch additional trip details from Avinode API
 *   --verbose        Show detailed logging
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from project root
config({ path: resolve(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { detectTripId, normalizeTripId, type TripIdDetection } from '../../lib/avinode/trip-id';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FETCH_DETAILS = args.includes('--fetch-details');
const VERBOSE = args.includes('--verbose');

interface MessageWithRequest {
  id: string;
  request_id: string;
  content: string;
  sender_type: string;
  created_at: string;
}

interface TripIdMatch {
  requestId: string;
  tripId: string;
  normalized: string;
  kind: string;
  messageId: string;
  messageContent: string;
  createdAt: string;
}

interface MigrationReport {
  timestamp: string;
  dryRun: boolean;
  totalMessagesScanned: number;
  totalRequestsFound: number;
  tripIdsDetected: number;
  requestsUpdated: number;
  requestsSkipped: number;
  errors: string[];
  details: Array<{
    requestId: string;
    tripId: string;
    normalized: string;
    kind: string;
    source: string;
    updated: boolean;
    error?: string;
  }>;
}

async function fetchAllMessages(): Promise<MessageWithRequest[]> {
  console.log('Fetching all messages from database...');

  const { data, error, count } = await supabase
    .from('messages')
    .select('id, request_id, content, sender_type, created_at', { count: 'exact' })
    .not('request_id', 'is', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  console.log(`Found ${count} messages with request_id`);
  return data || [];
}

async function fetchRequestsWithTripIds(): Promise<Set<string>> {
  console.log('Fetching requests that already have Trip IDs...');

  const { data, error } = await supabase
    .from('requests')
    .select('id')
    .not('avinode_trip_id', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch requests: ${error.message}`);
  }

  const existingIds = new Set((data || []).map(r => r.id));
  console.log(`Found ${existingIds.size} requests with existing Trip IDs`);
  return existingIds;
}

// Common words that might match the alphanumeric pattern but aren't Trip IDs
const FALSE_POSITIVE_WORDS = new Set([
  'PEOPLE', 'FLIGHT', 'PLEASE', 'THANKS', 'TRAVEL',
  'AIRPORT', 'BOOKING', 'CANCEL', 'STATUS', 'QUOTES',
  'HELLO', 'SEARCH', 'CREATE', 'UPDATE', 'DELETE',
]);

function scanMessagesForTripIds(messages: MessageWithRequest[]): TripIdMatch[] {
  console.log('Scanning messages for Trip ID patterns...');

  const matches: TripIdMatch[] = [];
  const requestTripIds = new Map<string, TripIdMatch>();

  for (const msg of messages) {
    if (!msg.content || !msg.request_id) continue;

    // Try to detect Trip ID in the message
    // Use allowStandalone: false to require context keywords like "trip id", "get_rfq", etc.
    const detection = detectTripId(msg.content, { allowStandalone: false });

    // Skip false positives
    if (detection && FALSE_POSITIVE_WORDS.has(detection.normalized.toUpperCase())) {
      continue;
    }

    if (detection) {
      const match: TripIdMatch = {
        requestId: msg.request_id,
        tripId: detection.raw,
        normalized: detection.normalized,
        kind: detection.kind,
        messageId: msg.id,
        messageContent: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
        createdAt: msg.created_at,
      };

      // Keep the first Trip ID found per request (chronologically)
      if (!requestTripIds.has(msg.request_id)) {
        requestTripIds.set(msg.request_id, match);
        matches.push(match);

        if (VERBOSE) {
          console.log(`  Found Trip ID: ${detection.normalized} (${detection.kind}) in request ${msg.request_id}`);
        }
      }
    }
  }

  console.log(`Detected ${matches.length} unique Trip IDs across requests`);
  return matches;
}

async function updateRequestWithTripId(
  requestId: string,
  tripId: string,
  dryRun: boolean
): Promise<{ success: boolean; error?: string }> {
  if (dryRun) {
    return { success: true };
  }

  const { error } = await supabase
    .from('requests')
    .update({
      avinode_trip_id: tripId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function fetchTripDetailsFromAvinode(tripId: string): Promise<Record<string, unknown> | null> {
  // This would call the Avinode API to get trip details
  // For now, we'll just return null as the API integration is separate
  console.log(`  Would fetch details for trip: ${tripId}`);
  return null;
}

async function runMigration(): Promise<MigrationReport> {
  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    totalMessagesScanned: 0,
    totalRequestsFound: 0,
    tripIdsDetected: 0,
    requestsUpdated: 0,
    requestsSkipped: 0,
    errors: [],
    details: [],
  };

  try {
    // Step 1: Fetch all messages
    const messages = await fetchAllMessages();
    report.totalMessagesScanned = messages.length;

    // Step 2: Get requests that already have Trip IDs
    const existingTripIds = await fetchRequestsWithTripIds();

    // Step 3: Scan messages for Trip ID patterns
    const matches = scanMessagesForTripIds(messages);
    report.tripIdsDetected = matches.length;

    // Get unique request IDs
    const uniqueRequestIds = new Set(matches.map(m => m.requestId));
    report.totalRequestsFound = uniqueRequestIds.size;

    // Step 4: Process each match
    console.log('\nProcessing Trip ID updates...');

    for (const match of matches) {
      const detail = {
        requestId: match.requestId,
        tripId: match.tripId,
        normalized: match.normalized,
        kind: match.kind,
        source: `Message: "${match.messageContent}"`,
        updated: false,
        error: undefined as string | undefined,
      };

      // Skip if request already has a Trip ID
      if (existingTripIds.has(match.requestId)) {
        if (VERBOSE) {
          console.log(`  Skipping request ${match.requestId} - already has Trip ID`);
        }
        report.requestsSkipped++;
        detail.error = 'Already has Trip ID';
        report.details.push(detail);
        continue;
      }

      // Update the request
      const result = await updateRequestWithTripId(match.requestId, match.normalized, DRY_RUN);

      if (result.success) {
        report.requestsUpdated++;
        detail.updated = true;
        console.log(`  ${DRY_RUN ? '[DRY RUN] Would update' : 'Updated'} request ${match.requestId} with Trip ID: ${match.normalized}`);
      } else {
        report.errors.push(`Failed to update request ${match.requestId}: ${result.error}`);
        detail.error = result.error;
        console.error(`  Error updating request ${match.requestId}: ${result.error}`);
      }

      report.details.push(detail);

      // Optionally fetch trip details from Avinode
      if (FETCH_DETAILS && result.success && !DRY_RUN) {
        const tripDetails = await fetchTripDetailsFromAvinode(match.normalized);
        if (tripDetails) {
          // Would update request with additional details
          console.log(`  Fetched details for trip ${match.normalized}`);
        }
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    report.errors.push(`Migration failed: ${errorMessage}`);
    console.error('Migration error:', errorMessage);
  }

  return report;
}

function printReport(report: MigrationReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION REPORT');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Mode: ${report.dryRun ? 'DRY RUN (no changes made)' : 'LIVE'}`);
  console.log('-'.repeat(60));
  console.log(`Messages Scanned: ${report.totalMessagesScanned}`);
  console.log(`Requests Found: ${report.totalRequestsFound}`);
  console.log(`Trip IDs Detected: ${report.tripIdsDetected}`);
  console.log(`Requests Updated: ${report.requestsUpdated}`);
  console.log(`Requests Skipped: ${report.requestsSkipped}`);
  console.log(`Errors: ${report.errors.length}`);

  if (report.errors.length > 0) {
    console.log('\nErrors:');
    report.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  }

  if (VERBOSE && report.details.length > 0) {
    console.log('\nDetails:');
    report.details.forEach((d, i) => {
      console.log(`  ${i + 1}. Request: ${d.requestId}`);
      console.log(`     Trip ID: ${d.normalized} (${d.kind})`);
      console.log(`     Updated: ${d.updated ? 'Yes' : 'No'}`);
      if (d.error) console.log(`     Error: ${d.error}`);
    });
  }

  console.log('='.repeat(60));

  if (report.dryRun) {
    console.log('\nThis was a dry run. To apply changes, run without --dry-run flag.');
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Trip ID Migration Script');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Fetch Details: ${FETCH_DETAILS ? 'Yes' : 'No'}`);
  console.log(`Verbose: ${VERBOSE ? 'Yes' : 'No'}`);
  console.log('');

  const report = await runMigration();
  printReport(report);

  // Save report to file
  const reportPath = resolve(__dirname, `../../logs/migration-trip-ids-${Date.now()}.json`);
  try {
    const { writeFileSync, mkdirSync } = await import('fs');
    mkdirSync(resolve(__dirname, '../../logs'), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: ${reportPath}`);
  } catch (err) {
    console.warn('Could not save report file:', err);
  }

  // Exit with error code if there were errors
  if (report.errors.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
