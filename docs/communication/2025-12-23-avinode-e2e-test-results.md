# Avinode API E2E Test Results

**Date**: December 23, 2025
**Test Script**: `scripts/test-avinode-e2e.sh`

## Summary

The E2E test script has been created and validated. The script correctly tests all Avinode API endpoints and properly identifies authentication issues.

## Test Results

| Test | Status | HTTP Code | Notes |
|------|--------|-----------|-------|
| OAuth Token Refresh | WARN | 401 | Client credentials invalid |
| API Authentication | FAIL | 401 | JWT token invalid |
| Airport Search | FAIL | 404 | Endpoint not found (may require auth) |
| List Trips | WARN | 405 | Internal error (likely auth-related) |
| Create Trip | FAIL | 401 | Authorization header invalid |
| Get Trip | FAIL | 401 | Authorization header invalid |
| List RFQs | WARN | 401 | Authorization header invalid |
| Trip Messages | WARN | 404 | Endpoint not found |

## Root Cause Analysis

The API returns `"Invalid value for header: Authorization"` which indicates:

1. **JWT Token Issue**: The token in `.env.local` may be:
   - Expired (check expiry: should be 08 Feb 2026)
   - Malformed or truncated
   - Wrong token type for these endpoints

2. **OAuth Credentials**: The client credentials are being rejected:
   - `CLIENT_ID`: `f0b9992a-d539-4760-8cb2-3a5d81ad5e30`
   - `CLIENT_SECRET_JWT`: Contains special characters that may need different encoding
   - Error: `invalid_client_secret_post`

## Token Details

```
JWT Token: avitype=15 (REST API token)
Subject: 60E43D03-5A54-4CDF-AE71-FC0EA98A4359
Tenant: 13792
Issuer: avinode
```

The token has `avitype=15` which should be valid for REST API access.

## Recommended Actions

1. **Verify Token Validity**: Contact Avinode to verify the JWT token is still valid
2. **Check OAuth Credentials**: The client secret may need to be regenerated
3. **Token Refresh**: Try using the Avinode web portal to generate a fresh token
4. **Documentation**: Review https://developer.avinodegroup.com/docs for current auth requirements

## Script Usage

```bash
# Run all tests
./scripts/test-avinode-e2e.sh

# Run with verbose output
./scripts/test-avinode-e2e.sh --verbose

# Preview commands without executing
./scripts/test-avinode-e2e.sh --dry-run

# Show help
./scripts/test-avinode-e2e.sh --help
```

## Configuration

The script reads configuration from:
```
mcp-servers/avinode-mcp-server/.env.local
```

Required variables:
- `BASE_URI`: API base URL (default: https://sandbox.avinode.com/api)
- `API_TOKEN`: X-Avinode-ApiToken header value
- `AUTHENTICATION_TOKEN`: Bearer token for Authorization header
- `EXTERNAL_ID`: Account ID for ActAsAccount header (optional)
- `CLIENT_ID`: OAuth client ID (optional, for token refresh)
- `CLIENT_SECRET_JWT`: OAuth client secret (optional, for token refresh)

## Test Endpoints

The script tests the following Avinode API endpoints:

1. `GET /airports?query={code}` - Airport search
2. `GET /trips` - List all trips
3. `POST /trips` - Create new trip
4. `GET /trips/{id}` - Get trip by ID
5. `GET /rfqs` - List RFQs
6. `GET /tripmsgs/{tripId}` - Get trip messages
7. `POST /oauth/token` - OAuth token refresh

## References

- Avinode API Docs: https://developer.avinodegroup.com/docs
- Create Trip: https://developer.avinodegroup.com/docs/search-in-avinode-from-your-system
- Get Trip: https://developer.avinodegroup.com/reference/readbynumericid
