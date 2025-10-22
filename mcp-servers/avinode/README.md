# Avinode MCP Server

MCP (Model Context Protocol) server for integrating with the Avinode charter flight platform.

## Overview

Provides 4 tools for searching flights, creating RFPs, and managing quotes:

1. **search_flights** - Search for available charter flights and aircraft
2. **create_rfp** - Create and distribute RFP to operators
3. **get_quote_status** - Check RFP status and response count
4. **get_quotes** - Retrieve all quotes for an RFP

## Features

- ✅ **Dual Mode Operation**: Automatically detects mock vs real mode
- ✅ **Mock Mode**: No API credentials needed, realistic test data
- ✅ **Real Mode**: Full Avinode API integration
- ✅ **Type Safety**: Full TypeScript support with validation
- ✅ **Error Handling**: Comprehensive error handling with API key sanitization
- ✅ **Schema Validation**: JSON Schema validation for all parameters
- ✅ **Test Coverage**: 28 comprehensive unit tests (100% pass rate)

## Quick Start

```bash
# Set environment variable
export AVINODE_API_KEY=mock_key_for_testing

# Run the server
npm run mcp:avinode
```

## Configuration

### Environment Variables

```env
# Mock Mode (for development/testing)
AVINODE_API_KEY=mock_key_for_testing

# Real Mode (for production)
AVINODE_API_KEY=your_real_api_key_here
AVINODE_BASE_URL=https://api.avinode.com  # Optional
```

**Mode Detection**:
- Mock mode: `AVINODE_API_KEY` is empty or starts with `mock_`
- Real mode: `AVINODE_API_KEY` contains a valid API key

## Tool Examples

### search_flights

Search for available charter flights:

```json
{
  "departure_airport": "KTEB",
  "arrival_airport": "KVNY",
  "passengers": 6,
  "departure_date": "2025-11-15",
  "aircraft_category": "midsize"
}
```

**Response**:
```json
{
  "aircraft": [
    {
      "id": "AC-001",
      "type": "Citation X",
      "category": "midsize",
      "capacity": 8,
      "range": 3242,
      "speed": 604,
      "operator": {
        "id": "OP-001",
        "name": "Executive Jet Management",
        "rating": 4.8
      }
    }
  ],
  "total": 5
}
```

### create_rfp

Create an RFP and distribute to operators:

```json
{
  "flight_details": {
    "departure_airport": "KTEB",
    "arrival_airport": "KVNY",
    "passengers": 6,
    "departure_date": "2025-11-15"
  },
  "operator_ids": ["OP-001", "OP-002", "OP-003"],
  "special_requirements": "Pet-friendly aircraft required"
}
```

**Response**:
```json
{
  "rfp_id": "RFP-1234567890",
  "status": "created",
  "operators_notified": 3,
  "created_at": "2025-10-22T00:00:00.000Z"
}
```

### get_quote_status

Check RFP status:

```json
{
  "rfp_id": "RFP-1234567890"
}
```

**Response**:
```json
{
  "rfp_id": "RFP-1234567890",
  "total_operators": 5,
  "responded": 3,
  "pending": 2,
  "created_at": "2025-10-22T00:00:00.000Z",
  "deadline": "2025-10-23T00:00:00.000Z"
}
```

### get_quotes

Retrieve all quotes:

```json
{
  "rfp_id": "RFP-1234567890"
}
```

**Response**:
```json
{
  "rfp_id": "RFP-1234567890",
  "quotes": [
    {
      "quote_id": "QT-1234567890-0",
      "operator_id": "OP-001",
      "operator_name": "Executive Jet Management",
      "aircraft_type": "Citation X",
      "base_price": 45000,
      "response_time": 45,
      "created_at": "2025-10-22T00:30:00.000Z"
    }
  ],
  "total": 3
}
```

## Validation Rules

### Airport Codes (ICAO)
- **Format**: Exactly 4 uppercase letters
- **Pattern**: `^[A-Z]{4}$`
- **Examples**: `KTEB`, `KVNY`, `KJFK`

### Passenger Count
- **Minimum**: 1
- **Maximum**: 19

### Aircraft Categories
- `light` - Light jets (6-8 passengers)
- `midsize` - Midsize jets (8-10 passengers)
- `heavy` - Heavy jets (10-16 passengers)
- `ultra-long-range` - Ultra-long-range jets (16+ passengers)

## Mock Mode

Mock mode provides realistic test data without requiring API credentials:

- **7 Aircraft Types**: Citation X, Gulfstream G550, Challenger 350, etc.
- **Realistic Operators**: NetJets, VistaJet, Flexjet, etc.
- **Simulated Delays**: 500-2000ms API response times
- **Random Variations**: 3-5 aircraft per search, 2-4 quotes per RFP
- **Smart Filtering**: Automatically filters by passenger capacity and category

### Activating Mock Mode

```bash
# Option 1: Empty API key
unset AVINODE_API_KEY

# Option 2: Mock prefix
export AVINODE_API_KEY=mock_key_for_testing
```

## Testing

```bash
# Run unit tests
npm run test:unit -- __tests__/unit/mcp/avinode-server.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Test Coverage**: 28 comprehensive tests covering:
- ✅ Tool registration (2 tests)
- ✅ search_flights validation (7 tests)
- ✅ create_rfp validation (4 tests)
- ✅ get_quote_status (3 tests)
- ✅ get_quotes (3 tests)
- ✅ Mock mode detection (4 tests)
- ✅ Error handling (2 tests)
- ✅ Lifecycle management (3 tests)

## Integration with Claude Code

Add to your Claude Code MCP settings (`.claude/mcp_settings.json`):

```json
{
  "mcpServers": {
    "avinode": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/v0-jetvision-assistant/mcp-servers/avinode/index.ts"
      ],
      "env": {
        "AVINODE_API_KEY": "mock_key_for_testing"
      }
    }
  }
}
```

## Architecture

```
mcp-servers/avinode/
├── index.ts                    # Entry point
└── README.md                   # This file

lib/mcp/
├── avinode-server.ts          # Main server class
└── clients/
    ├── avinode-client.ts      # Real API client
    └── mock-avinode-client.ts # Mock implementation

__tests__/unit/mcp/
└── avinode-server.test.ts     # Unit tests (28 tests)
```

## Error Handling

### Validation Errors
- Invalid ICAO format
- Passenger count out of range
- Missing required parameters

### API Errors (Real Mode)
- **404**: Resource not found
- **401/403**: Authentication failed
- **429**: Rate limit exceeded
- **Timeout**: No response (30s timeout)

### Security
All errors automatically sanitize API keys to prevent exposure.

## Development

Built following TDD (Test-Driven Development):
1. **Red Phase**: Tests written first (31 tests)
2. **Green Phase**: Implementation to pass tests
3. **Blue Phase**: Documentation and refactoring

## Dependencies

- `@/lib/mcp` - MCP base infrastructure
- `axios` - HTTP client (real mode)
- `ajv` - JSON schema validation

## License

Part of the JetVision AI Assistant project.
