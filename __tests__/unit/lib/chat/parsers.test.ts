/**
 * Unit tests for SSE and Quote parsers
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseSSELine,
  extractSSEError,
  extractQuotesFromSSEData,
  extractDeepLinkData,
  determineWorkflowStatus,
} from '@/lib/chat/parsers/sse-parser';
import {
  parseQuotesFromText,
  hasQuoteIndicators,
  convertParsedQuotesToQuotes,
} from '@/lib/chat/parsers/quote-text-parser';
import { WorkflowStatus } from '@/lib/chat/constants';
import type { SSEStreamData } from '@/lib/chat/types';

describe('parseSSELine', () => {
  it('should parse valid SSE data line', () => {
    const line = 'data: {"content":"Hello","done":false}';
    const result = parseSSELine(line);

    expect(result).not.toBeNull();
    expect(result!.content).toBe('Hello');
    expect(result!.done).toBe(false);
  });

  it('should return null for non-data lines', () => {
    expect(parseSSELine('event: message')).toBeNull();
    expect(parseSSELine(': comment')).toBeNull();
    expect(parseSSELine('')).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    const line = 'data: {invalid json}';
    expect(parseSSELine(line)).toBeNull();
  });
});

describe('extractSSEError', () => {
  it('should extract structured error', () => {
    const data: SSEStreamData = {
      error: { code: 'ERR001', message: 'Something went wrong', recoverable: true },
    };
    const error = extractSSEError(data);

    expect(error).not.toBeNull();
    expect(error!.message).toContain('ERR001');
    expect(error!.message).toContain('Something went wrong');
  });

  it('should extract string error', () => {
    const data: SSEStreamData = {
      error: 'Simple error message' as any,
      message: 'Detailed message',
    };
    const error = extractSSEError(data);

    expect(error).not.toBeNull();
    expect(error!.message).toBe('Detailed message');
  });

  it('should return null when no error', () => {
    const data: SSEStreamData = { content: 'Hello' };
    expect(extractSSEError(data)).toBeNull();
  });
});

describe('extractQuotesFromSSEData', () => {
  it('should extract quotes from direct quotes array', () => {
    const data: SSEStreamData = {
      quotes: [{ quote_id: 'q1', price: 50000 }],
    };

    const result = extractQuotesFromSSEData(data);
    expect(result).toHaveLength(1);
    expect(result[0].quote_id).toBe('q1');
  });

  it('should extract quotes from rfq_data', () => {
    const data: SSEStreamData = {
      rfq_data: {
        quotes: [{ quote_id: 'q2', price: 60000 }],
      },
    };

    const result = extractQuotesFromSSEData(data);
    expect(result).toHaveLength(1);
    expect(result[0].quote_id).toBe('q2');
  });

  it('should extract quotes from tool_calls', () => {
    const data: SSEStreamData = {
      tool_calls: [
        {
          name: 'get_rfq',
          result: {
            quotes: [{ quote_id: 'q3', price: 70000 }],
          },
        },
      ],
    };

    const result = extractQuotesFromSSEData(data);
    expect(result).toHaveLength(1);
    expect(result[0].quote_id).toBe('q3');
  });

  it('should return empty array when no quotes', () => {
    const data: SSEStreamData = { content: 'Hello' };
    expect(extractQuotesFromSSEData(data)).toHaveLength(0);
  });
});

describe('extractDeepLinkData', () => {
  it('should extract trip_data', () => {
    const data: SSEStreamData = {
      trip_data: {
        trip_id: 'trip123',
        deep_link: 'https://avinode.com/trip/123',
        departure_airport: { icao: 'KTEB' },
        arrival_airport: { icao: 'KVNY' },
        departure_date: '2024-01-15',
        passengers: 4,
      },
    };

    const result = extractDeepLinkData(data);

    expect(result.showDeepLink).toBe(true);
    expect(result.tripData).not.toBeUndefined();
    expect(result.tripData!.trip_id).toBe('trip123');
  });

  it('should extract rfp_data', () => {
    const data: SSEStreamData = {
      rfp_data: {
        trip_id: 'trip456',
        rfp_id: 'rfp789',
        deep_link: 'https://avinode.com/rfp/789',
      },
    };

    const result = extractDeepLinkData(data);

    expect(result.showDeepLink).toBe(true);
    expect(result.rfpData).not.toBeUndefined();
    expect(result.rfpData!.rfp_id).toBe('rfp789');
  });

  it('should extract from tool_calls', () => {
    const data: SSEStreamData = {
      tool_calls: [
        {
          name: 'create_trip',
          result: {
            trip_id: 'trip789',
            deep_link: 'https://avinode.com/trip/789',
          },
        },
      ],
    };

    const result = extractDeepLinkData(data);

    expect(result.showDeepLink).toBe(true);
    expect(result.tripData).not.toBeUndefined();
    expect(result.tripData!.trip_id).toBe('trip789');
  });

  it('should return showDeepLink false when no data', () => {
    const data: SSEStreamData = { content: 'Hello' };
    const result = extractDeepLinkData(data);

    expect(result.showDeepLink).toBe(false);
    expect(result.tripData).toBeUndefined();
    expect(result.rfpData).toBeUndefined();
  });
});

describe('determineWorkflowStatus', () => {
  it('should return gathering_info phase', () => {
    const data: SSEStreamData = {
      agent: { conversationState: { phase: 'gathering_info' } },
    };
    const result = determineWorkflowStatus(data);

    expect(result.status).toBe(WorkflowStatus.UNDERSTANDING_REQUEST);
    expect(result.step).toBe(1);
  });

  it('should return confirming phase', () => {
    const data: SSEStreamData = {
      agent: { conversationState: { phase: 'confirming' } },
    };
    const result = determineWorkflowStatus(data);

    expect(result.status).toBe(WorkflowStatus.SEARCHING_AIRCRAFT);
    expect(result.step).toBe(2);
  });

  it('should return complete phase', () => {
    const data: SSEStreamData = {
      agent: { conversationState: { phase: 'complete' } },
    };
    const result = determineWorkflowStatus(data);

    expect(result.status).toBe(WorkflowStatus.PROPOSAL_READY);
    expect(result.step).toBe(5);
  });

  it('should update based on tool calls', () => {
    const data: SSEStreamData = {
      tool_calls: [{ name: 'get_quotes' }],
    };
    const result = determineWorkflowStatus(data);

    expect(result.status).toBe(WorkflowStatus.ANALYZING_OPTIONS);
    expect(result.step).toBe(4);
  });

  it('should update based on trip_data', () => {
    const data: SSEStreamData = {
      trip_data: { trip_id: 'trip123' },
    };
    const result = determineWorkflowStatus(data);

    expect(result.status).toBe(WorkflowStatus.REQUESTING_QUOTES);
    expect(result.step).toBe(3);
  });
});

describe('hasQuoteIndicators', () => {
  it('should detect quote indicators', () => {
    expect(hasQuoteIndicators('Here are the quotes for your trip')).toBe(true);
    expect(hasQuoteIndicators('I found 3 available options for you')).toBe(true);
    expect(hasQuoteIndicators('Based on the quote details we received')).toBe(true);
    expect(hasQuoteIndicators('Here are the flight options')).toBe(true);
    expect(hasQuoteIndicators('Available quotes from operators')).toBe(true);
  });

  it('should return false for non-quote content', () => {
    expect(hasQuoteIndicators('Hello, how can I help you?')).toBe(false);
    expect(hasQuoteIndicators('The weather is nice today')).toBe(false);
    expect(hasQuoteIndicators('Operator: XYZ Jets')).toBe(false); // Not a quote indicator by itself
  });
});

describe('parseQuotesFromText', () => {
  it('should parse numbered quote list', () => {
    const text = `Here are the quotes for your trip:

1. Jet Aviation
   Aircraft: Gulfstream G650
   Tail Number: N123AB
   Max Passengers: 14
   Price: $75,000

2. NetJets
   Aircraft: Citation X
   Max Passengers: 8
   Price: $45,000`;

    const result = parseQuotesFromText(text);

    expect(result).toHaveLength(2);
    expect(result[0].operatorName).toBe('Jet Aviation');
    expect(result[0].aircraftType).toBe('Gulfstream G650');
    expect(result[0].tailNumber).toBe('N123AB');
    expect(result[0].passengerCapacity).toBe(14);
    expect(result[0].price).toBe(75000);
    expect(result[1].operatorName).toBe('NetJets');
    expect(result[1].price).toBe(45000);
  });

  it('should parse markdown formatted quotes', () => {
    const text = `Here are the available options:

#### 1. Executive Jets
- **Aircraft**: Bombardier Global 7500
- **Max Passengers**: 19
- **Price**: $120,000

#### 2. Private Wings
- **Aircraft**: Falcon 8X
- **Passengers**: 12`;

    const result = parseQuotesFromText(text);

    expect(result).toHaveLength(2);
    expect(result[0].operatorName).toBe('Executive Jets');
    expect(result[0].aircraftType).toBe('Bombardier Global 7500');
    expect(result[0].passengerCapacity).toBe(19);
    expect(result[0].price).toBe(120000);
    expect(result[1].operatorName).toBe('Private Wings');
    expect(result[1].aircraftType).toBe('Falcon 8X');
  });

  it('should return empty array for non-quote content', () => {
    const text = 'Hello, how can I help you with your travel plans?';
    const result = parseQuotesFromText(text);

    expect(result).toHaveLength(0);
  });
});

describe('convertParsedQuotesToQuotes', () => {
  it('should convert parsed quotes to Quote format', () => {
    const parsed = [
      {
        id: 'q1',
        operatorName: 'Test Operator',
        aircraftType: 'Gulfstream',
        tailNumber: 'N123',
        passengerCapacity: 12,
        price: 50000,
        currency: 'USD',
      },
    ];

    const result = convertParsedQuotesToQuotes(parsed);

    expect(result).toHaveLength(1);
    expect(result[0].operatorName).toBe('Test Operator');
    expect(result[0].aircraftType).toBe('Gulfstream');
    expect(result[0].price).toBe(50000);
    expect(result[0].ranking).toBe(1);
    expect(result[0].isRecommended).toBe(true);
  });

  it('should mark first quote as recommended', () => {
    const parsed = [
      { id: 'q1', operatorName: 'First', aircraftType: 'Type1' },
      { id: 'q2', operatorName: 'Second', aircraftType: 'Type2' },
    ];

    const result = convertParsedQuotesToQuotes(parsed);

    expect(result[0].isRecommended).toBe(true);
    expect(result[1].isRecommended).toBe(false);
    expect(result[0].ranking).toBe(1);
    expect(result[1].ranking).toBe(2);
  });
});
