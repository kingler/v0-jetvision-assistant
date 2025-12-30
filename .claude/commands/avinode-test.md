# Avinode API Test

Test Avinode API connectivity and endpoint functionality using the standardized test hook.

## Parameters:

- **Test Type** (optional): Specify which test to run
  - `env` - Environment variable validation only
  - `health` - GET /airports health check only
  - `trip` - POST /trips creation test only
  - `webhook` - Webhook endpoint test only
  - `full` - All tests (default)
- Usage: `/avinode-test [test-type]`

## Actions to Execute:

1. **Run Avinode API Test Hook**:
   ```bash
   python3 .claude/hooks/avinode-api-test.py --test-type {test-type}
   ```

2. **Interpret Results**:
   - Green checkmarks indicate passing tests
   - Red X marks indicate failures with detailed error messages
   - Yellow warnings indicate potential issues

## Test Coverage:

### Environment Validation (`env`)
- Validates `API_TOKEN` is set
- Validates `AUTHENTICATION_TOKEN` is set (JWT format)
- Validates `EXTERNAL_ID` is set
- Validates `BASE_URI` defaults to sandbox

### Health Check (`health`)
- GET `/airports?query=KTEB`
- Verifies API connectivity
- Confirms authentication is working

### Trip Creation (`trip`)
- POST `/trips` with verified correct format
- Uses `segments` array (NOT `criteria.legs`)
- Includes `X-Avinode-ActAsAccount` header
- Returns trip ID and deep link on success

### Webhook Test (`webhook`)
- POST to Jetvision webhook endpoint
- Tests webhook processing pipeline

## Required Environment Variables:

Located in `mcp-servers/avinode-mcp-server/.env.local`:
```env
BASE_URI=https://sandbox.avinode.com/api
API_TOKEN=your-api-token
AUTHENTICATION_TOKEN=your-jwt-bearer-token
EXTERNAL_ID=your-avinode-account-uuid
```

## Success Indicators:

- Environment validated
- Health check passed (airport data returned)
- Trip created successfully with deep link
- Webhook processed successfully

## Troubleshooting:

### 401 Unauthorized
- Check `AUTHENTICATION_TOKEN` is valid JWT
- Ensure token hasn't expired
- Verify `API_TOKEN` is correct

### 403 Forbidden
- Check `EXTERNAL_ID` is valid
- Ensure `X-Avinode-ActAsAccount` header is included for buyer operations

### 400 Bad Request
- Verify date is in the future (30+ days recommended)
- Check request format matches `segments` structure

### Network Errors
- Verify `BASE_URI` is correct
- Check internet connectivity
- Confirm sandbox.avinode.com is accessible

## Related Documentation:

- [Avinode API Integration](docs/api/AVINODE_API_INTEGRATION.md)
- [Deep Link Workflow](docs/subagents/agents/flight-search/DEEP_LINK_WORKFLOW.md)
- [Deep Link Prefill Issue](docs/communication/2025-12-29-avinode-deep-link-prefill-issue.md)

## Example Output:

```
============================================================
  Avinode API Connection Test
============================================================

Environment Configuration
-----------------------
Base URL: https://sandbox.avinode.com/api
API Token: d221161f... (36 chars)
Auth Token: eyJhbGci... (JWT, 856 chars)
External ID: 200E3FA0... (36 chars)
Environment: sandbox

Environment validated successfully

============================================================
  Health Check: GET /airports
============================================================

Testing airport search for: KTEB

Health check passed
Found 1 airport(s)
KTEB - Teterboro Airport (Teterboro, United States)

============================================================
  Trip Creation: POST /trips
============================================================

Request payload:
{
  "externalTripId": "JETVISION-TEST-20251229120000",
  "sourcing": true,
  "segments": [...],
  ...
}

Trip created successfully!
Trip ID: atrip-65262300
Trip Short ID: ABC123
Deep Link: https://sandbox.avinode.com/marketplace/mvc/search/load/atrip-65262300

============================================================
  Test Summary
============================================================

All tests passed!
```
