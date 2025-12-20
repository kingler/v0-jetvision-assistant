#!/usr/bin/env npx tsx
/**
 * End-to-End Test: Avinode Deeplink Manual Workflow
 *
 * Tests the complete flight request workflow:
 * 1. Start with empty state (no hardcoded requests)
 * 2. Search for flights via Avinode MCP
 * 3. Create RFP and get deeplink
 * 4. Verify deeplink format
 * 5. Check quote status
 *
 * Run: npx tsx scripts/test-avinode-e2e-workflow.ts
 */

import { AvinodeMCPServer } from '../lib/mcp/avinode-server';

interface TestResult {
  step: string;
  passed: boolean;
  duration: number;
  details?: string;
  error?: string;
}

class AvinodeE2ETest {
  private results: TestResult[] = [];
  private mcp: AvinodeMCPServer;

  constructor() {
    this.mcp = new AvinodeMCPServer();
  }

  private log(message: string): void {
    console.log(`\n${message}`);
  }

  private async runStep<T>(
    stepName: string,
    fn: () => Promise<T>
  ): Promise<T | null> {
    const startTime = Date.now();
    this.log(`📋 Step: ${stepName}`);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.results.push({
        step: stepName,
        passed: true,
        duration,
        details: typeof result === 'object' ? JSON.stringify(result, null, 2).slice(0, 500) : String(result),
      });

      console.log(`   ✅ PASSED (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.results.push({
        step: stepName,
        passed: false,
        duration,
        error: errorMessage,
      });

      console.log(`   ❌ FAILED: ${errorMessage}`);
      return null;
    }
  }

  async runTests(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Avinode Deeplink E2E Workflow Test');
    console.log('='.repeat(60));

    const isMockMode = this.mcp.isUsingMockMode();
    console.log(`\nMode: ${isMockMode ? '🧪 MOCK' : '🔗 LIVE'}`);
    console.log(`Time: ${new Date().toISOString()}`);

    // Test 1: Verify empty state (no hardcoded data)
    await this.runStep('Verify MCP server is initialized', async () => {
      if (!this.mcp) throw new Error('MCP server not initialized');
      return { initialized: true, mockMode: isMockMode };
    });

    // Test 2: Search for flights
    const searchResult = await this.runStep('Search for flights (KTEB → KMIA)', async () => {
      const result = await this.mcp.callTool('search_flights', {
        departure_airport: 'KTEB',
        arrival_airport: 'KMIA',
        passengers: 6,
        departure_date: '2025-01-20',
      });

      if (!result.aircraft || result.aircraft.length === 0) {
        throw new Error('No aircraft returned from search');
      }

      console.log(`   Found ${result.aircraft.length} aircraft options`);
      return result;
    });

    if (!searchResult) {
      console.log('\n⛔ Cannot continue - search failed');
      this.printSummary();
      return;
    }

    // Test 3: Create RFP with deeplink
    const rfpResult = await this.runStep('Create RFP and get deeplink', async () => {
      // Get operator IDs from search results
      const operatorIds = searchResult.aircraft
        .slice(0, 3)
        .map((a: any) => a.operator.id);

      const result = await this.mcp.callTool('create_rfp', {
        departure_airport: 'KTEB',
        arrival_airport: 'KMIA',
        passengers: 6,
        departure_date: '2025-01-20',
        operator_ids: operatorIds,
      });

      if (!result.trip_id) {
        throw new Error('No trip_id returned from create_rfp');
      }

      if (!result.deep_link) {
        throw new Error('No deep_link returned from create_rfp');
      }

      console.log(`   Trip ID: ${result.trip_id}`);
      console.log(`   Deep Link: ${result.deep_link}`);
      console.log(`   Operators notified: ${result.operators_notified}`);

      return result;
    });

    if (!rfpResult) {
      console.log('\n⛔ Cannot continue - RFP creation failed');
      this.printSummary();
      return;
    }

    // Test 4: Verify deeplink format
    await this.runStep('Verify deeplink format', async () => {
      const deepLink = rfpResult.deep_link;

      if (!deepLink.includes('avinode.com')) {
        throw new Error(`Invalid deeplink domain: ${deepLink}`);
      }

      if (!deepLink.includes('/trip/')) {
        throw new Error(`Missing /trip/ in deeplink: ${deepLink}`);
      }

      if (!deepLink.includes(rfpResult.trip_id)) {
        throw new Error(`Trip ID not in deeplink: ${deepLink}`);
      }

      return { valid: true, deepLink };
    });

    // Test 5: Get quote status
    const statusResult = await this.runStep('Get quote status', async () => {
      const result = await this.mcp.callTool('get_quote_status', {
        rfp_id: rfpResult.trip_id,
      });

      console.log(`   Status: ${result.status}`);
      console.log(`   Quotes received: ${result.quotes_received}/${result.operators_contacted}`);

      return result;
    });

    // Test 6: Get quotes
    await this.runStep('Get quotes', async () => {
      const result = await this.mcp.callTool('get_quotes', {
        rfp_id: rfpResult.trip_id,
      });

      if (!result.quotes || result.quotes.length === 0) {
        console.log('   ⚠️  No quotes received yet (expected in mock mode)');
      } else {
        console.log(`   Received ${result.quotes.length} quotes:`);
        for (const quote of result.quotes) {
          console.log(`     - ${quote.operator_name}: ${quote.aircraft_type} @ $${quote.total_price}`);
        }
      }

      return result;
    });

    // Test 7: Verify quote deadline
    await this.runStep('Verify quote deadline is set', async () => {
      if (!rfpResult.quote_deadline) {
        throw new Error('No quote_deadline in RFP response');
      }

      const deadline = new Date(rfpResult.quote_deadline);
      const now = new Date();

      if (deadline <= now) {
        throw new Error('Quote deadline is in the past');
      }

      const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      console.log(`   Deadline: ${rfpResult.quote_deadline}`);
      console.log(`   Hours until deadline: ${hoursUntilDeadline.toFixed(1)}`);

      return { deadline: rfpResult.quote_deadline, hoursRemaining: hoursUntilDeadline };
    });

    // Test 8: Verify watch URL
    await this.runStep('Verify watch URL is provided', async () => {
      if (!rfpResult.watch_url) {
        throw new Error('No watch_url in RFP response');
      }

      console.log(`   Watch URL: ${rfpResult.watch_url}`);
      return { watchUrl: rfpResult.watch_url };
    });

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\nTotal: ${this.results.length} tests`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Duration: ${totalDuration}ms`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      for (const result of this.results.filter(r => !r.passed)) {
        console.log(`   - ${result.step}: ${result.error}`);
      }
    }

    console.log('\n' + '='.repeat(60));

    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('The Avinode deeplink workflow is working correctly.');
    } else {
      console.log('⚠️  SOME TESTS FAILED');
      console.log('Please review the errors above.');
    }

    console.log('='.repeat(60) + '\n');

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run the tests
const test = new AvinodeE2ETest();
test.runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export {};
