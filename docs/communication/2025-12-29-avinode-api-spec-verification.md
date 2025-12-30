# Avinode API Specification Verification

**Date:** December 29, 2025
**Purpose:** Verify Jetvision implementation against official Avinode API documentation

---

## Summary

**Conclusion: Our implementation follows the Avinode API specification correctly.** The authentication failures are NOT caused by incorrect API usage in our code - they are account/permission issues on Avinode's side.

---

## Header Verification

### Required Headers (per Avinode docs)

| Header                    | Required    | Avinode Spec               | Our Implementation                         | Status      |
| ------------------------- | ----------- | -------------------------- | ------------------------------------------ | ----------- |
| `X-Avinode-ApiToken`      | Yes         | UUID identifying app       | `process.env.API_TOKEN`                    | ✅ Correct  |
| `Authorization`           | Yes         | `Bearer <JWT token>`       | `Bearer ${authToken}`                      | ✅ Correct  |
| `X-Avinode-SentTimestamp` | Yes         | ISO-8601 UTC, within 5 min | `new Date().toISOString()` via interceptor | ✅ Correct  |
| `Content-Type`            | Yes         | `application/json`         | `application/json`                         | ✅ Correct  |
| `X-Avinode-ApiVersion`    | Yes         | e.g., `v1.0`               | `v1.0`                                     | ✅ Correct  |
| `X-Avinode-Product`       | Yes         | App name + version         | `Jetvision/1.0.0`                          | ✅ Correct  |
| `Accept-Encoding`         | Optional    | `gzip`                     | `gzip`                                     | ✅ Included |
| `X-Avinode-ActAsAccount`  | Conditional | Username for interactive   | Not used (REST token)                      | ✅ N/A      |

### Implementation Location

File: `mcp-servers/avinode-mcp-server/src/client.ts` (lines 71-82, 85-90)

---

## API Flow Verification

### Expected Flow (per Avinode docs)

1. **POST /trips** - Create a trip with departure/arrival details
2. **Response contains `searchInAvinode` deep link** in `actions` collection
3. **Open deep link in browser** - User searches for operators in Avinode UI
4. **Avinode sends webhooks** - `TripRequestSellerResponse` when quotes arrive
5. **GET /rfqs/{id}** - Retrieve specific RFQ details

### Our Implementation

- ✅ `POST /trips` endpoint implemented in MCP server
- ✅ Deep link extraction from response (`actions.searchInAvinode`)
- ✅ Webhook handler at `/api/webhooks/avinode`
- ✅ GET endpoints for RFQs and quotes

---

## Key Documentation Findings

### From Sandbox Documentation

> "The Avinode sandbox environment is rebuilt every week on Mondays between 6 and 8 AM UTC."

**Impact:** All credentials and data are wiped weekly. Our issues started after a Monday sandbox reset.

### From Search Integration Documentation

> "After creating the trip via `POST /trips`, you should instruct your user to follow the deep link that was returned... once a request has been sent to one or more operators... Avinode will send a webhook."

**Our workflow matches this exactly.**

### B2B vs B2C

> "Only B2C applications can use POST /searches to retrieve quotes directly."

**We correctly use the B2B workflow** (create trip → deep link → webhooks).

---

## Authentication Token Analysis

### Token Types Tested

| Token        | avitype | Expected Use           | Error Received                  |
| ------------ | ------- | ---------------------- | ------------------------------- |
| Interactive  | 16      | Browser-based sessions | `AUTHENTICATION_COMPANY_ACCESS` |
| REST/Sandbox | 15      | API integrations       | `ERR_INPUT_GENERIC_INVALID`     |

### JWT Payload (avitype=15 token)

```json
{
  "sub": "60E43D03-5A54-4CDF-AE71-FC0EA98A4359",
  "iss": "avinode",
  "avitype": 15,
  "avidomain": ".avinode.com",
  "avinonce": "c124aa15-36b2-4a72-83eb-ed6d4b53a1de",
  "avitenant": 13792
}
```

The token structure appears valid. The `avitype=15` indicates a REST API token which should work for sandbox API calls.

---

## Root Cause Analysis

### What's Working

- ✅ Client code follows API specification exactly
- ✅ All required headers are present and correctly formatted
- ✅ JWT token structure is valid
- ✅ API workflow is correct (trip → deep link → webhook)

### What's Failing

- ❌ All API endpoints return authentication errors
- ❌ Both token types (avitype=15 and avitype=16) fail
- ❌ Even simple endpoints like `/airports?query=KTEB` return `NOT_FOUND`

### Conclusion

The failures are **account-level permission issues on Avinode's side**, not code issues:

1. Token generation may not be correctly linked to API permissions
2. Sandbox reset may have misconfigured the account
3. The "Company APIs" permission may not be properly activated
4. The API token and authentication token may not be correctly associated

---

## Recommendation

This verification confirms that **Avinode Support intervention is required**. Our code correctly implements the API specification. The issue is with:

1. Account permissions not being properly configured after sandbox reset
2. Possible mismatch between API Token and Authentication Token
3. Token permissions not granting access to required endpoints

The detailed support request in `2025-12-23-avinode-sandbox-access-issue.md` should be sent to Avinode Support with this verification attached as additional context.

---

## Files Reviewed

- `mcp-servers/avinode-mcp-server/src/client.ts` - HTTP client implementation
- `mcp-servers/avinode-mcp-server/.env.local` - Credentials configuration
- Avinode Developer Documentation:
  - [Sandbox Environment](https://developer.avinodegroup.com/docs/sandbox)
  - [Search Integration](https://developer.avinodegroup.com/docs/search-in-avinode-from-your-system)
  - [API Basics](https://developer.avinodegroup.com/docs/api-basics)
