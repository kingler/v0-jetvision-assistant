#!/usr/bin/env tsx

/**
 * Cleanup Duplicate Trip Records
 *
 * Removes duplicate records from the requests table, keeping the most recent one.
 *
 * Usage:
 *   pnpm tsx scripts/cleanup-duplicate-trip-records.ts
 *   pnpm tsx scripts/cleanup-duplicate-trip-records.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const isDryRun = process.argv.includes('--dry-run');

interface DuplicateGroup {
  avinode_trip_id: string;
  records: Array<{
    id: string;
    created_at: string;
    updated_at: string;
    departure_airport: string;
    arrival_airport: string;
    departure_date: string;
  }>;
  keepId: string;
  deleteIds: string[];
}

async function findDuplicates(): Promise<DuplicateGroup[]> {
  // Get all records with avinode_trip_id
  const { data: allRecords, error } = await supabase
    .from('requests')
    .select('id, avinode_trip_id, created_at, updated_at, departure_airport, arrival_airport, departure_date')
    .not('avinode_trip_id', 'is', null)
    .order('avinode_trip_id')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching records:', error);
    return [];
  }

  // Group by avinode_trip_id
  const groups: Map<string, typeof allRecords> = new Map();

  for (const record of allRecords || []) {
    if (!record.avinode_trip_id) continue;

    const existing = groups.get(record.avinode_trip_id) || [];
    existing.push(record);
    groups.set(record.avinode_trip_id, existing);
  }

  // Find groups with duplicates
  const duplicates: DuplicateGroup[] = [];

  for (const [tripId, records] of groups) {
    if (records.length > 1) {
      // Sort by updated_at descending (most recent first)
      records.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateB - dateA;
      });

      const keepRecord = records[0];
      const deleteRecords = records.slice(1);

      duplicates.push({
        avinode_trip_id: tripId,
        records,
        keepId: keepRecord.id,
        deleteIds: deleteRecords.map(r => r.id),
      });
    }
  }

  return duplicates;
}

async function cleanupDuplicates(): Promise<void> {
  console.log('🧹 Cleaning Up Duplicate Trip Records\n');
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes will be made)' : '🗑️  LIVE (duplicates will be deleted)'}`);
  console.log();

  const duplicates = await findDuplicates();

  if (duplicates.length === 0) {
    console.log('✅ No duplicate records found');
    return;
  }

  console.log(`Found ${duplicates.length} TripIDs with duplicate records:\n`);
  console.log('='.repeat(100));

  let totalDeleted = 0;

  for (const group of duplicates) {
    console.log(`\n📋 ${group.avinode_trip_id} - ${group.records.length} records`);
    console.log(`   ✅ Keep: ${group.keepId.slice(0, 8)}... (updated: ${group.records[0].updated_at?.slice(0, 19)})`);
    console.log(`      Route: ${group.records[0].departure_airport} → ${group.records[0].arrival_airport}`);

    for (let i = 0; i < group.deleteIds.length; i++) {
      const deleteId = group.deleteIds[i];
      const record = group.records[i + 1];
      console.log(`   🗑️  Delete: ${deleteId.slice(0, 8)}... (updated: ${record.updated_at?.slice(0, 19)})`);
    }

    if (!isDryRun) {
      // Delete the duplicate records
      const { error } = await supabase
        .from('requests')
        .delete()
        .in('id', group.deleteIds);

      if (error) {
        console.log(`   ❌ Error deleting: ${error.message}`);
      } else {
        console.log(`   ✅ Deleted ${group.deleteIds.length} duplicate(s)`);
        totalDeleted += group.deleteIds.length;
      }
    } else {
      totalDeleted += group.deleteIds.length;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(100));
  console.log('\n📊 CLEANUP SUMMARY\n');

  console.log('| TripID  | Total | Keep | Delete |');
  console.log('|---------|-------|------|--------|');

  for (const group of duplicates) {
    console.log(`| ${group.avinode_trip_id.padEnd(7)} | ${String(group.records.length).padEnd(5)} | 1    | ${String(group.deleteIds.length).padEnd(6)} |`);
  }

  console.log(`\n📈 Results:`);
  console.log(`   📋 TripIDs with duplicates: ${duplicates.length}`);
  console.log(`   🗑️  Records ${isDryRun ? 'to delete' : 'deleted'}: ${totalDeleted}`);
  console.log(`   ✅ Records kept: ${duplicates.length}`);

  if (isDryRun) {
    console.log(`\n💡 Run without --dry-run to apply these changes:`);
    console.log(`   pnpm tsx scripts/cleanup-duplicate-trip-records.ts`);
  }
}

cleanupDuplicates()
  .then(() => {
    console.log('\n✅ Cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
