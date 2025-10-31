# Avinode API Setup Guide

**Date**: October 22, 2025
**Status**: Sandbox Configuration Required
**MCP Server**: `mcp-servers/avinode-mcp-server`

---

## Overview

This guide walks through setting up the Avinode API integration for Jetvision's flight search and RFQ workflow. The Avinode API provides access to:

- **RFQ Management**: Create and manage Request for Quotes
- **Flight Search**: Query operator databases for available aircraft
- **Quote Management**: Retrieve and track operator quotes
- **Schedule Management**: Sync flight schedules
- **Empty Leg Search**: Find available empty leg flights

**Documentation**: https://developer.avinodegroup.com/

---

## Current Status

⚠️ **The Avinode MCP server currently uses dummy data** because:
- Sandbox access has not been requested
- API credentials have not been obtained
- Authentication has not been configured

---

## Step-by-Step Setup

### 1. Request Sandbox Access

#### Contact Avinode Group

Reach out to your Avinode Group representative to:
1. **Define your use case**: Explain Jetvision's RFQ workflow and trip search requirements
2. **Request sandbox environment access**: Requires Avinode membership or launch customer affiliation
3. **Provide email addresses**: For each user who needs sandbox access

**Timeline**: Approval process typically takes 1-2 business days

#### Use Cases to Request

For Jetvision, request access to these API capabilities:

- ✅ **RFQ Management**: Create, update, and track RFQs
- ✅ **Trip Search**: Search for available flights for end clients
- ✅ **Quote Retrieval**: Fetch and compare operator quotes
- ✅ **Schedule Uploads**: Sync flight schedules (optional)
- ✅ **Data Extraction**: Export lead and quote data

---

### 2. Obtain API Credentials

Once approved, Avinode will provide:

#### API Token (`X-Avinode-ApiToken`)
- Unique identifier for your application
- Hardcoded value (not user-configurable)
- Treat like a password - never commit to version control

#### Bearer Token (`Authorization`)
- Used to identify the API connection
- Format: `Bearer eyJraWQiOiIxNkVBQkQ5RS1BM0...`
- Treat like a password - never share publicly

#### Example `.env` Configuration

```bash
# mcp-servers/avinode-mcp-server/.env

# Avinode API Credentials (DO NOT COMMIT)
AVINODE_API_TOKEN=your-api-token-here
AVINODE_BEARER_TOKEN=your-bearer-token-here

# Environment
AVINODE_SANDBOX_MODE=true  # Set to 'false' for production

# API Base URLs
AVINODE_SANDBOX_URL=https://sandbox.avinode.com/api
AVINODE_PRODUCTION_URL=https://api.avinode.com
```

---

### 3. Configure MCP Server Authentication

Update the Avinode MCP server to use real credentials:

```typescript
// mcp-servers/avinode-mcp-server/src/config.ts

export const AVINODE_CONFIG = {
  baseUrl: process.env.AVINODE_SANDBOX_MODE === 'true'
    ? process.env.AVINODE_SANDBOX_URL || 'https://sandbox.avinode.com/api'
    : process.env.AVINODE_PRODUCTION_URL || 'https://api.avinode.com',
  apiToken: process.env.AVINODE_API_TOKEN,
  bearerToken: process.env.AVINODE_BEARER_TOKEN,
  product: 'Jetvision/1.0.0',
  apiVersion: 'v1.0',
};

// Validate credentials on startup
if (!AVINODE_CONFIG.apiToken || !AVINODE_CONFIG.bearerToken) {
  throw new Error(
    'Missing Avinode API credentials. Set AVINODE_API_TOKEN and AVINODE_BEARER_TOKEN in .env'
  );
}
```

---

### 4. Implement HTTP Request Helper

Create a helper function for making authenticated Avinode API requests:

```typescript
// mcp-servers/avinode-mcp-server/src/api-client.ts

import { AVINODE_CONFIG } from './config.js';

interface AvinodeRequestOptions extends RequestInit {
  endpoint: string;
  actAsAccount?: string; // Optional for interactive API connections
}

export async function makeAvinodeRequest<T>(
  options: AvinodeRequestOptions
): Promise<T> {
  const { endpoint, actAsAccount, ...fetchOptions } = options;
  const url = `${AVINODE_CONFIG.baseUrl}${endpoint}`;

  // Required headers for all requests
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Avinode-ApiToken': AVINODE_CONFIG.apiToken!,
    'Authorization': `Bearer ${AVINODE_CONFIG.bearerToken}`,
    'X-Avinode-SentTimestamp': new Date().toISOString(), // ISO-8601 UTC
    'X-Avinode-ApiVersion': AVINODE_CONFIG.apiVersion,
    'X-Avinode-Product': AVINODE_CONFIG.product,
    'Accept-Encoding': 'gzip',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Optional: Act as a specific account (required for interactive connections)
  if (actAsAccount) {
    headers['X-Avinode-ActAsAccount'] = actAsAccount;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Handle rate limiting (429)
  if (response.status === 429) {
    const resetSeconds = parseInt(
      response.headers.get('X-Rate-Limit-Reset') || '60'
    );
    const limitRemaining = response.headers.get('X-Rate-Limit-Remaining');
    throw new Error(
      `Rate limited. ${limitRemaining} calls remaining. Retry after ${resetSeconds} seconds.`
    );
  }

  // Handle authentication errors
  if (response.status === 401) {
    throw new Error('Unauthorized: Invalid or expired API token');
  }

  if (response.status === 403) {
    throw new Error('Forbidden: Valid token but insufficient permissions');
  }

  // Handle validation errors
  if (response.status === 422) {
    const errorData = await response.json();
    throw new Error(`Validation error: ${JSON.stringify(errorData)}`);
  }

  // Handle other errors
  if (!response.ok) {
    throw new Error(
      `Avinode API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

// Retry logic for rate-limited requests
export async function makeAvinodeRequestWithRetry<T>(
  options: AvinodeRequestOptions,
  maxRetries = 3
): Promise<T> {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      return await makeAvinodeRequest<T>(options);
    } catch (error) {
      attempts++;

      if (error instanceof Error && error.message.includes('Rate limited')) {
        // Exponential backoff: 2^attempts seconds
        const delay = Math.pow(2, attempts) * 1000;
        console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${attempts}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Non-rate-limit error, fail immediately
      throw error;
    }
  }

  throw new Error('Max retries exceeded for Avinode API request');
}
```

---

### 5. Data Format Standards

Follow these ISO standards for all API requests:

#### Date/Time Format
- **Standard**: ISO 8601
- **Format**: `YYYY-MM-DDTHH:mm:ssZ` (UTC)
- **Example**: `2025-11-20T14:00:00Z`

```typescript
// Correct
const departureDate = new Date('2025-11-20T14:00:00Z').toISOString();

// Incorrect
const departureDate = '11/20/2025 2:00 PM'; // ❌ Not ISO 8601
```

#### Currency Codes
- **Standard**: ISO 4217
- **Format**: 3-letter code
- **Examples**: `USD`, `EUR`, `GBP`, `CAD`

```typescript
interface Quote {
  price: number;
  currency: 'USD' | 'EUR' | 'GBP'; // ISO 4217
}
```

#### Country Codes
- **Standard**: ISO 3166-1 alpha-2
- **Format**: 2-letter code
- **Examples**: `US`, `GB`, `FR`, `CA`

```typescript
interface Airport {
  country: string; // e.g., "US"
}
```

#### Province/State Codes
- **Standard**: ISO 3166-2
- **Format**: `{country}-{province}`
- **Examples**: `US-FL`, `US-CA`, `GB-ENG`

```typescript
interface Location {
  province: string; // e.g., "US-FL"
}
```

---

### 6. Rate Limiting

Avinode enforces rate limits to protect API stability:

#### Limits
- **Rate**: Approximately **1 call per second**
- **Burst tolerance**: Allows short bursts above the limit
- **Window**: Rolling 1-hour window

#### Response Headers

When approaching the rate limit, responses include:

```
X-Rate-Limit-Limit: 3600       # Allowed calls per hour
X-Rate-Limit-Remaining: 1250   # Calls remaining in current window
X-Rate-Limit-Reset: 45         # Seconds until counter resets
```

#### Handling 429 Errors

When rate limited, implement exponential backoff:

```typescript
// Example retry strategy
const retryDelays = [2000, 4000, 8000]; // 2s, 4s, 8s

for (let i = 0; i < retryDelays.length; i++) {
  try {
    return await makeAvinodeRequest(options);
  } catch (error) {
    if (error.message.includes('Rate limited') && i < retryDelays.length - 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelays[i]));
      continue;
    }
    throw error;
  }
}
```

---

### 7. Sandbox Environment

#### Access
- **URL**: https://sandbox.avinode.com
- **Login**: Use email addresses provided during setup
- **Password**: Request password reset after each weekly rebuild

#### Important Limitations

⚠️ **Weekly Data Reset**
- Database rebuilds every **Monday, 6-8 AM UTC**
- All test data (RFQs, quotes, flights) is deleted
- Password reset required after each rebuild
- Plan testing accordingly

⚠️ **Shared Environment**
- Multiple customers use the same sandbox
- Test data may be visible to other developers
- **Do not use real client data** in the sandbox
- Follow data confidentiality guidelines

⚠️ **Test Data Only**
- Never extract or disclose sandbox data to third parties
- Use only for development and testing purposes
- Do not connect production systems to sandbox API

#### Creating Test Data

1. **Log in** to https://sandbox.avinode.com
2. **Create test RFQs**:
   - Use fictional routes (e.g., TEB → VNY)
   - Use test passenger counts
   - Use future dates
3. **Verify API responses** match expected format
4. **Test error handling** with invalid data

---

### 8. HTTP Status Codes

Handle these common API responses:

| Code | Status | Meaning | Action |
|------|--------|---------|--------|
| 200 | OK | Successful GET/PUT | Process response |
| 201 | Created | Successful POST | Extract new resource ID |
| 401 | Unauthorized | Invalid/missing token | Check API credentials |
| 403 | Forbidden | Insufficient permissions | Verify API subscription includes this use case |
| 409 | Conflict | Simultaneous update | Retry with fresh data |
| 422 | Unprocessable Entity | Validation failure | Fix request data |
| 423 | Locked | Resource locked | Wait and retry |
| 429 | Too Many Requests | Rate limit exceeded | Implement exponential backoff |
| 503 | Service Unavailable | Temporary server issue | Retry after 30-60 seconds |

---

### 9. Testing Checklist

Before moving to production:

- [ ] **Authentication works** with sandbox credentials
- [ ] **RFQ creation** succeeds with valid data
- [ ] **RFQ creation fails** gracefully with invalid data
- [ ] **Quote retrieval** returns expected format
- [ ] **Rate limiting** is handled with exponential backoff
- [ ] **ISO date formats** are used throughout
- [ ] **ISO currency codes** are used for pricing
- [ ] **Error responses** are logged and handled appropriately
- [ ] **Timestamp validation** ensures requests are within 5-minute window
- [ ] **Weekly data reset** does not break your application

---

## Production Deployment

### Prerequisites

Before requesting production access:

1. ✅ Complete sandbox testing
2. ✅ Pass Avinode's implementation review
3. ✅ Document all API use cases
4. ✅ Implement proper error handling
5. ✅ Implement rate limit handling
6. ✅ Set up monitoring and logging

### Production Credentials

Avinode will provide separate production credentials:

```bash
# .env.production

AVINODE_API_TOKEN=prod-api-token-here
AVINODE_BEARER_TOKEN=prod-bearer-token-here
AVINODE_SANDBOX_MODE=false
```

### Monitoring

Track these metrics in production:

- **API call volume**: Monitor against rate limits
- **Error rates**: Track 4xx and 5xx responses
- **Response times**: Identify slow endpoints
- **Rate limit hits**: Optimize call frequency if needed

---

## Security Best Practices

### Credential Management

✅ **DO**:
- Store credentials in environment variables
- Use `.env.local` for local development
- Use secrets manager for production (AWS Secrets Manager, Vault, etc.)
- Rotate credentials periodically

❌ **DON'T**:
- Commit credentials to version control
- Share credentials in Slack/email
- Log credentials in application logs
- Use production credentials in development

### API Security

- **Use HTTPS/TLS 1.2** for all requests
- **Validate timestamps** are within 5-minute window
- **Implement request signing** if required by Avinode
- **Log API errors** but not sensitive data
- **Monitor for suspicious activity** (unusual call patterns)

---

## Troubleshooting

### Common Issues

#### "Invalid or expired API token" (401)

**Cause**: Incorrect `X-Avinode-ApiToken` or `Authorization` header

**Solution**:
1. Verify `.env` file has correct credentials
2. Check credentials are not expired
3. Ensure headers are formatted correctly
4. Contact Avinode support if credentials are valid

#### "Timestamp validation failed" (400)

**Cause**: `X-Avinode-SentTimestamp` is more than 5 minutes off

**Solution**:
1. Sync your server's clock (use NTP)
2. Ensure timestamp is in ISO-8601 UTC format
3. Check for timezone issues

#### "Rate limited" (429)

**Cause**: Exceeded ~1 call per second limit

**Solution**:
1. Implement exponential backoff
2. Cache API responses where appropriate
3. Batch requests if possible
4. Monitor `X-Rate-Limit-Remaining` header

#### "Weekly sandbox reset broke my tests" (Mondays)

**Cause**: Sandbox database rebuilt, all test data deleted

**Solution**:
1. Implement test data setup scripts
2. Don't rely on specific RFP IDs in tests
3. Create test data dynamically
4. Schedule tests to avoid Monday 6-8 AM UTC

---

## Next Steps

### Phase 1: Sandbox Setup (CURRENT)
1. ✅ Contact Avinode Group representative
2. ⏳ Request sandbox access and define use cases
3. ⏳ Obtain API credentials (API Token + Bearer Token)
4. ⏳ Configure `.env` file with credentials
5. ⏳ Test basic API call (e.g., health check)

### Phase 2: MCP Server Integration
1. Implement authenticated request helper
2. Add error handling and retry logic
3. Test RFQ creation in sandbox
4. Test quote retrieval in sandbox
5. Validate data formats (ISO 8601, ISO 4217, etc.)

### Phase 3: Agent Integration
1. Update FlightSearchAgent to use real Avinode MCP
2. Update ProposalAnalysisAgent to fetch real quotes
3. Test end-to-end workflow in sandbox
4. Add comprehensive error handling
5. Implement monitoring and logging

### Phase 4: Production Deployment
1. Pass Avinode implementation review
2. Obtain production API credentials
3. Configure production environment
4. Deploy to production
5. Monitor API usage and performance

---

## Resources

### Official Documentation
- **Developer Portal**: https://developer.avinodegroup.com/
- **API Basics**: https://developer.avinodegroup.com/docs/api-basics
- **Sandbox Guide**: https://developer.avinodegroup.com/docs/sandbox
- **Introduction**: https://developer.avinodegroup.com/docs/introduction

### Jetvision Documentation
- **Workflow Integration**: `docs/implementation/WORKFLOW-AVINODE-INTEGRATION.md`
- **Quote Data Integration**: `docs/implementation/QUOTE-DATA-INTEGRATION.md`
- **MCP Server**: `mcp-servers/avinode-mcp-server/README.md`

### Support
- **Avinode Support**: Contact through developer portal
- **Jetvision Team**: See project README for contact info

---

**Last Updated**: October 22, 2025
**Status**: Awaiting sandbox access approval
