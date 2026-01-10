# ONEK-142: E2E Workflow Testing - Full Flight Booking Flow

**Linear Issue:** ONEK-142
**Priority:** High
**Status:** Todo
**Type:** Testing
**Depends On:** ONEK-140, ONEK-141

---

## Overview

Implement comprehensive end-to-end tests for the complete flight booking workflow:

```
Flight Request → Trip Creation → RFQ Submission → Quote Updates →
PDF Proposal → Email to Customer → Booking → Confirmation
```

---

## Test Environment Setup

### Prerequisites

1. **Avinode Sandbox Access**
   - Valid API_TOKEN and AUTHENTICATION_TOKEN
   - Sandbox environment: `https://sandbox.avinode.com/api`
   - Note: Sandbox resets every Monday 6-8 AM UTC

2. **Gmail Test Account**
   - OAuth2 credentials configured
   - Test mailbox for receiving proposals

3. **Local Services**
   - Redis running for task queue
   - Supabase local or staging database
   - All MCP servers running

### Environment Configuration

```env
# Testing Environment
NODE_ENV=test
TEST_MODE=e2e

# Avinode Sandbox
AVINODE_BASE_URL=https://sandbox.avinode.com/api
API_TOKEN=<sandbox-api-token>
AUTHENTICATION_TOKEN=<sandbox-auth-token>

# Gmail Test Account
GMAIL_CLIENT_ID=<test-client-id>
GMAIL_CLIENT_SECRET=<test-client-secret>
GMAIL_REFRESH_TOKEN=<test-refresh-token>
GMAIL_TEST_RECIPIENT=test@example.com

# Supabase Test Database
NEXT_PUBLIC_SUPABASE_URL=<test-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<test-service-key>
```

---

## Test Scenarios

### Scenario 1: Complete Booking Flow (Happy Path)

```typescript
// __tests__/e2e/booking-flow.test.ts

describe('E2E: Complete Booking Flow', () => {
  let tripId: string;
  let rfqId: string;
  let quoteId: string;
  let bookingId: string;

  beforeAll(async () => {
    // Setup: Clear test data
    await cleanupTestData();
  });

  test('Step 1: Create flight request from chat', async () => {
    const request = await createFlightRequest({
      departure_airport: 'KTEB',
      arrival_airport: 'KPBI',
      departure_date: getFutureDate(7),
      passengers: 4,
      customer_email: process.env.GMAIL_TEST_RECIPIENT
    });

    expect(request.id).toBeDefined();
    expect(request.status).toBe('pending');
  });

  test('Step 2: Create trip via Avinode MCP', async () => {
    const mcpClient = getMCPClient('avinode-mcp-server');

    const result = await mcpClient.callTool('create_trip', {
      departure_airport: 'KTEB',
      arrival_airport: 'KPBI',
      departure_date: getFutureDate(7),
      departure_time: '10:00',
      passengers: 4
    });

    tripId = result.trip_id;

    expect(tripId).toBeDefined();
    expect(result.deep_link).toContain('avinode.com');
    expect(result.status).toBe('created');
  });

  test('Step 3: Simulate RFQ submission (manual step)', async () => {
    // In production: User opens deep_link and selects operators
    // For E2E: Simulate webhook event

    const webhookPayload = createMockWebhook('TripRequestSellerResponse', {
      tripId: tripId,
      rfqId: `arfq-${Date.now()}`,
      quotes: [{
        id: `aquo-${Date.now()}`,
        price: 25000,
        currency: 'USD',
        aircraft: 'Citation XLS',
        operator: 'Test Operator',
        validUntil: getFutureDate(3)
      }]
    });

    rfqId = webhookPayload.rfqId;
    quoteId = webhookPayload.quotes[0].id;

    const response = await sendTestWebhook(webhookPayload);
    expect(response.status).toBe(200);
  });

  test('Step 4: Retrieve RFQ with quotes', async () => {
    const mcpClient = getMCPClient('avinode-mcp-server');

    const result = await mcpClient.callTool('get_rfq', {
      rfq_id: rfqId
    });

    expect(result.quotes).toHaveLength(1);
    expect(result.quotes[0].price).toBe(25000);
    expect(result.status).toBe('quoted');
  });

  test('Step 5: Generate PDF proposal', async () => {
    const mcpClient = getMCPClient('avinode-mcp-server');

    const result = await mcpClient.callTool('generate_quote_pdf', {
      quote_id: quoteId
    });

    expect(result.pdf_base64).toBeDefined();
    expect(result.mime_type).toBe('application/pdf');

    // Validate PDF is not empty
    const pdfBuffer = Buffer.from(result.pdf_base64, 'base64');
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Check PDF header magic bytes
    expect(pdfBuffer.slice(0, 4).toString()).toBe('%PDF');
  });

  test('Step 6: Send proposal email to customer', async () => {
    const mcpClient = getMCPClient('gmail-mcp-server');

    const pdfResult = await getMCPClient('avinode-mcp-server')
      .callTool('generate_quote_pdf', { quote_id: quoteId });

    const emailResult = await mcpClient.callTool('send_email', {
      to: process.env.GMAIL_TEST_RECIPIENT,
      subject: 'Your Flight Proposal: KTEB → KPBI',
      body: generateProposalEmailHTML(),
      attachments: [{
        filename: 'Proposal.pdf',
        content: pdfResult.pdf_base64,
        mimeType: 'application/pdf'
      }]
    });

    expect(emailResult.messageId).toBeDefined();
    expect(emailResult.status).toBe('sent');
  });

  test('Step 7: Customer confirms - create booking', async () => {
    const mcpClient = getMCPClient('avinode-mcp-server');

    const result = await mcpClient.callTool('book_flight', {
      quote_id: quoteId,
      trip_id: tripId,
      customer: {
        name: 'Test Customer',
        email: process.env.GMAIL_TEST_RECIPIENT,
        phone: '+1-555-0123'
      },
      passengers: [
        { first_name: 'Test', last_name: 'Passenger' }
      ],
      payment_method: 'wire_transfer'
    });

    bookingId = result.booking_id;

    expect(bookingId).toBeDefined();
    expect(result.status).toBe('pending');
  });

  test('Step 8: Verify booking in database', async () => {
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('avinode_booking_id', bookingId)
      .single();

    expect(booking).toBeDefined();
    expect(booking.status).toBe('pending');
    expect(booking.customer_email).toBe(process.env.GMAIL_TEST_RECIPIENT);
  });

  test('Step 9: Simulate booking confirmation webhook', async () => {
    const webhookPayload = createMockWebhook('BookingConfirmed', {
      bookingId: bookingId,
      confirmationNumber: 'CONF-12345',
      status: 'confirmed'
    });

    const response = await sendTestWebhook(webhookPayload);
    expect(response.status).toBe(200);

    // Verify database updated
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('avinode_booking_id', bookingId)
      .single();

    expect(booking.status).toBe('confirmed');
    expect(booking.confirmation_number).toBe('CONF-12345');
  });

  afterAll(async () => {
    // Cleanup: Cancel test booking if still pending
    if (bookingId) {
      await cancelTestBooking(bookingId);
    }
  });
});
```

### Scenario 2: Quote Decline Flow

```typescript
describe('E2E: Quote Decline Flow', () => {
  test('Should decline quote with reason', async () => {
    // Setup: Create trip and receive quote
    const { tripId, quoteId } = await setupTestQuote();

    // Decline the quote
    const mcpClient = getMCPClient('avinode-mcp-server');
    const result = await mcpClient.callTool('decline_quote', {
      request_id: quoteId,
      reason: 'price_too_high',
      message: 'Customer found a better price elsewhere'
    });

    expect(result.status).toBe('declined');
    expect(result.reason).toBe('price_too_high');
  });
});
```

### Scenario 3: Error Handling

```typescript
describe('E2E: Error Handling', () => {
  test('Should handle Avinode API timeout', async () => {
    const mcpClient = getMCPClient('avinode-mcp-server');

    // Mock timeout scenario
    await expect(
      mcpClient.callTool('create_trip', {
        departure_airport: 'INVALID',
        arrival_airport: 'INVALID',
        departure_date: '2020-01-01', // Past date
        passengers: 4
      })
    ).rejects.toThrow(/validation|invalid/i);
  });

  test('Should handle email sending failure', async () => {
    const mcpClient = getMCPClient('gmail-mcp-server');

    await expect(
      mcpClient.callTool('send_email', {
        to: 'invalid-email',
        subject: 'Test',
        body: 'Test'
      })
    ).rejects.toThrow(/invalid.*email/i);
  });

  test('Should handle booking for expired quote', async () => {
    // Setup: Create expired quote
    const expiredQuoteId = 'aquo-expired-123';

    const mcpClient = getMCPClient('avinode-mcp-server');

    await expect(
      mcpClient.callTool('book_flight', {
        quote_id: expiredQuoteId,
        trip_id: 'atrip-123',
        customer: { name: 'Test', email: 'test@test.com' }
      })
    ).rejects.toThrow(/expired|unavailable/i);
  });
});
```

### Scenario 4: Concurrent Bookings

```typescript
describe('E2E: Concurrent Operations', () => {
  test('Should handle multiple simultaneous trip creations', async () => {
    const mcpClient = getMCPClient('avinode-mcp-server');

    const promises = Array(5).fill(null).map((_, i) =>
      mcpClient.callTool('create_trip', {
        departure_airport: 'KTEB',
        arrival_airport: `KPBI`,
        departure_date: getFutureDate(7 + i),
        passengers: 4
      })
    );

    const results = await Promise.all(promises);

    results.forEach(result => {
      expect(result.trip_id).toBeDefined();
    });

    // All should have unique IDs
    const tripIds = results.map(r => r.trip_id);
    expect(new Set(tripIds).size).toBe(5);
  });
});
```

### Scenario 5: ISO-Operator Chat Flow

Tests the chat messaging between Jetvision agent and operators.

```typescript
describe('E2E: Chat Messaging Flow', () => {
  let tripId: string;
  let requestId: string;

  beforeAll(async () => {
    // Setup: Create trip and get RFQ
    const { trip_id, rfq_id } = await setupTestTripWithQuote();
    tripId = trip_id;
    requestId = rfq_id;
  });

  test('Step 1: Send message to operator', async () => {
    const mcpClient = getMCPClient('avinode-mcp-server');

    const result = await mcpClient.callTool('send_trip_message', {
      request_id: requestId,
      message: 'Hello, can you confirm catering options for this flight?',
      recipient_type: 'all_operators'
    });

    expect(result.message_id).toBeDefined();
    expect(result.status).toBe('sent');
  });

  test('Step 2: Simulate operator response via webhook', async () => {
    const webhookPayload = {
      event: 'TripChatFromSeller',
      eventId: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      data: {
        id: `asellermsg-${Date.now()}`,
        href: `https://sandbox.avinode.com/api/tripmsgs/asellermsg-${Date.now()}`,
        type: 'tripmsgs'
      }
    };

    const response = await sendTestWebhook(webhookPayload);
    expect(response.status).toBe(200);

    // Verify message stored in database
    const { data: events } = await supabase
      .from('avinode_webhook_events')
      .select('*')
      .eq('event_type', 'message_received')
      .order('received_at', { ascending: false })
      .limit(1);

    expect(events).toHaveLength(1);
  });

  test('Step 3: Retrieve message history', async () => {
    const mcpClient = getMCPClient('avinode-mcp-server');

    const result = await mcpClient.callTool('get_trip_messages', {
      request_id: requestId,
      limit: 10
    });

    expect(result.messages).toBeDefined();
    expect(Array.isArray(result.messages)).toBe(true);
  });

  test('Step 4: Get specific message by ID', async () => {
    const mcpClient = getMCPClient('avinode-mcp-server');

    // Get messages first
    const history = await mcpClient.callTool('get_trip_messages', {
      request_id: requestId
    });

    if (history.messages?.length > 0) {
      const messageId = history.messages[0].id;

      const result = await mcpClient.callTool('get_message', {
        message_id: messageId
      });

      expect(result.content).toBeDefined();
      expect(result.sender).toBeDefined();
    }
  });
});
```

### Scenario 6: Pre-Booking Communication Flow

Tests the agent-assisted negotiation flow before booking.

```typescript
describe('E2E: Pre-Booking Communication', () => {
  test('Should complete negotiation before booking', async () => {
    const avinodeMcp = getMCPClient('avinode-mcp-server');

    // 1. Create trip and receive quote
    const { tripId, requestId, quoteId } = await setupTestQuote();

    // 2. Agent asks clarification question
    await avinodeMcp.callTool('send_trip_message', {
      request_id: requestId,
      message: 'Can you include catering for 4 passengers? Also, is WiFi available?'
    });

    // 3. Simulate operator response with updated quote
    await simulateOperatorResponse(requestId, {
      type: 'chat',
      message: 'Yes, catering is $500 extra. WiFi is included at no charge.'
    });

    // 4. Retrieve conversation
    const messages = await avinodeMcp.callTool('get_trip_messages', {
      request_id: requestId
    });

    expect(messages.messages.length).toBeGreaterThanOrEqual(2);

    // 5. Now book the flight
    const booking = await avinodeMcp.callTool('book_flight', {
      quote_id: quoteId,
      trip_id: tripId,
      customer: TEST_CUSTOMER,
      special_requests: 'Catering for 4, as discussed in chat'
    });

    expect(booking.booking_id).toBeDefined();
  });
});
```

---

## Test Utilities

### Helper Functions

```typescript
// __tests__/e2e/utils/test-helpers.ts

export function getFutureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

export async function cleanupTestData(): Promise<void> {
  // Delete test bookings
  await supabase.from('bookings')
    .delete()
    .like('customer_email', '%test%');

  // Delete test requests
  await supabase.from('requests')
    .delete()
    .like('metadata->>source', 'e2e-test');
}

export function createMockWebhook(
  eventType: string,
  payload: Record<string, unknown>
): WebhookPayload {
  return {
    eventType,
    timestamp: new Date().toISOString(),
    ...payload
  };
}

export async function sendTestWebhook(
  payload: WebhookPayload
): Promise<Response> {
  return fetch(`${process.env.TEST_BASE_URL}/api/webhooks/avinode`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': process.env.AVINODE_WEBHOOK_SECRET
    },
    body: JSON.stringify(payload)
  });
}

export function generateProposalEmailHTML(): string {
  return `
    <h2>Your Flight Proposal</h2>
    <p>Please find attached your personalized flight proposal.</p>
    <p>This is an automated test email.</p>
  `;
}
```

### Mock Webhook Generator

```typescript
// __tests__/e2e/utils/mock-webhooks.ts

export class MockWebhookGenerator {
  generateQuoteWebhook(tripId: string, options?: Partial<Quote>): WebhookPayload {
    return {
      eventType: 'TripRequestSellerResponse',
      tripId,
      rfqId: `arfq-${Date.now()}`,
      quotes: [{
        id: `aquo-${Date.now()}`,
        price: options?.price || 25000,
        currency: options?.currency || 'USD',
        aircraft: options?.aircraft || 'Citation XLS',
        operator: options?.operator || 'Test Operator',
        validUntil: getFutureDate(3)
      }]
    };
  }

  generateBookingConfirmation(bookingId: string): WebhookPayload {
    return {
      eventType: 'BookingConfirmed',
      bookingId,
      confirmationNumber: `CONF-${Date.now()}`,
      status: 'confirmed',
      confirmedAt: new Date().toISOString()
    };
  }
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e-tests.yml

name: E2E Tests

on:
  schedule:
    # Run daily at 9 AM UTC (after Avinode sandbox reset)
    - cron: '0 9 * * *'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Test environment'
        required: true
        default: 'sandbox'
        type: choice
        options:
          - sandbox
          - staging

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Start MCP servers
        run: npm run dev:mcp &
        env:
          API_TOKEN: ${{ secrets.AVINODE_API_TOKEN }}
          AUTHENTICATION_TOKEN: ${{ secrets.AVINODE_AUTH_TOKEN }}
          GMAIL_CLIENT_ID: ${{ secrets.GMAIL_CLIENT_ID }}
          GMAIL_CLIENT_SECRET: ${{ secrets.GMAIL_CLIENT_SECRET }}
          GMAIL_REFRESH_TOKEN: ${{ secrets.GMAIL_REFRESH_TOKEN }}

      - name: Wait for MCP servers
        run: sleep 10

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          NODE_ENV: test
          TEST_MODE: e2e
          AVINODE_BASE_URL: https://sandbox.avinode.com/api
          GMAIL_TEST_RECIPIENT: ${{ secrets.GMAIL_TEST_RECIPIENT }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-test-results
          path: |
            coverage/
            test-results/
```

### NPM Script

```json
{
  "scripts": {
    "test:e2e": "vitest run --config vitest.e2e.config.ts",
    "test:e2e:watch": "vitest --config vitest.e2e.config.ts"
  }
}
```

---

## Test Data Management

### Seed Data

```typescript
// __tests__/e2e/fixtures/seed-data.ts

export const TEST_CUSTOMER = {
  name: 'E2E Test Customer',
  email: process.env.GMAIL_TEST_RECIPIENT || 'test@jetvision.test',
  phone: '+1-555-0123',
  company: 'E2E Test Company'
};

export const TEST_ROUTES = [
  {
    departure: 'KTEB',
    arrival: 'KPBI',
    description: 'Teterboro to Palm Beach'
  },
  {
    departure: 'KJFK',
    arrival: 'KLAX',
    description: 'JFK to Los Angeles'
  },
  {
    departure: 'KORD',
    arrival: 'KMIA',
    description: 'Chicago to Miami'
  }
];

export const TEST_PASSENGERS = [
  { first_name: 'John', last_name: 'Doe' },
  { first_name: 'Jane', last_name: 'Doe' },
  { first_name: 'Test', last_name: 'Passenger' }
];
```

---

## Acceptance Criteria

- [ ] E2E test suite created in `__tests__/e2e/`
- [ ] Complete booking flow test passing
- [ ] Quote decline flow test passing
- [ ] Error handling tests passing
- [ ] Concurrent operations test passing
- [ ] Test utilities and helpers created
- [ ] Mock webhook generator implemented
- [ ] GitHub Actions workflow configured
- [ ] Test runs successfully against Avinode sandbox
- [ ] Email delivery verified in test mailbox
- [ ] Database state correctly updated throughout flow
- [ ] Test cleanup removes all test data
- [ ] Documentation updated with test run instructions

---

## Related Files

- `__tests__/e2e/booking-flow.test.ts` - Main E2E test suite
- `__tests__/e2e/utils/test-helpers.ts` - Test utilities
- `__tests__/e2e/utils/mock-webhooks.ts` - Webhook mocking
- `__tests__/e2e/fixtures/seed-data.ts` - Test data
- `vitest.e2e.config.ts` - E2E test configuration
- `.github/workflows/e2e-tests.yml` - CI/CD workflow

---

## Dependencies

Requires completion of:
- **ONEK-140**: Gmail MCP Email Integration
- **ONEK-141**: Flight Booking Backend Flow
