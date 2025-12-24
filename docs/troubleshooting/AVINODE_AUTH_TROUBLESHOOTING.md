# Avinode Authentication Troubleshooting

**Date**: 2025-12-23  
**Issue**: 401 Error - "Invalid value for header: Authorization"

---

## Current Status

✅ **Request Format**: Correct (matches Avinode API specification)  
✅ **Headers Format**: Correct (all required headers present)  
✅ **Token Format**: Valid JWT (667 characters)  
❌ **Authentication**: Failing with 401 error

---

## Error Details

```
Status: 401 Unauthorized
Error Code: ERR_INPUT_GENERIC_INVALID
Error Message: "Invalid value for header: Authorization"
```

---

## Possible Causes

### 1. Token Expiration
- JWT tokens may expire even if no `exp` claim is present
- Server-side validation may reject expired tokens
- **Solution**: Generate a fresh token from Avinode dashboard

### 2. OAuth Token Required
- The `.env.local.example` includes OAuth credentials:
  - `CLIENT_ID`
  - `CLIENT_SECRET_JWT`
- Static tokens may not work; OAuth flow may be required
- **Solution**: Use OAuth endpoint to obtain fresh token

### 3. Token-API Token Mismatch
- `API_TOKEN` and `AUTHENTICATION_TOKEN` may need to be from the same source
- They may need to be generated together
- **Solution**: Regenerate both tokens from Avinode dashboard

### 4. Environment Mismatch
- Token may be for production but testing against sandbox (or vice versa)
- **Solution**: Verify token is for correct environment

---

## Next Steps

### Option 1: Verify Token in Avinode Dashboard

1. Log in to [Avinode Sandbox](https://sandbox.avinode.com)
2. Navigate to API credentials section
3. Verify token status:
   - Is it active?
   - Is it for sandbox environment?
   - What is the expiration date?
4. Generate a new token if needed

### Option 2: Use OAuth Token Endpoint

According to Avinode API documentation, there's an OAuth endpoint:
- **Endpoint**: `POST /api/oauth/token`
- **Reference**: [Avinode OAuth Documentation](https://developer.avinodegroup.com/reference/oauth)

**OAuth Token Request**:
```typescript
const response = await axios.post('https://sandbox.avinode.com/api/oauth/token', {
  grant_type: 'client_credentials',
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET_JWT,
}, {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
});

const accessToken = response.data.access_token;
```

### Option 3: Contact Avinode Support

If tokens continue to fail:
1. Contact Avinode support
2. Provide:
   - API Token (first 8 chars)
   - Error message
   - Request headers (sanitized)
3. Ask for:
   - Token validation
   - Correct authentication method
   - OAuth flow documentation

---

## Test Scripts Available

1. **`scripts/test-avinode-connection.ts`** - Full connection test
2. **`scripts/test-avinode-auth-debug.ts`** - Detailed authentication debugging

Both scripts show:
- Token information
- Headers being sent
- Full error responses

---

## Current Configuration

**Location**: `mcp-servers/avinode-mcp-server/.env.local`

**Required Variables** (see `.env.local.example` for template):
```bash
BASE_URI=https://sandbox.avinode.com/api
API_TOKEN=<your-api-token-here>
AUTHENTICATION_TOKEN=<your-jwt-token-here>
```

**OAuth Variables** (if needed):
```bash
CLIENT_ID=<your-client-id-here>
CLIENT_SECRET_JWT=<your-client-secret-here>
```

**Note**: 
- Copy `.env.local.example` to `.env.local` and fill in your actual credentials
- Real credentials are stored in `.env.local` (gitignored) and secure internal tracking system
- Never commit actual credentials to version control
- If you've exposed credentials, rotate them immediately in the Avinode Developer Portal

---

## Verification Checklist

- [ ] Token is active in Avinode dashboard
- [ ] Token is for sandbox environment (not production)
- [ ] Token was generated recently (not expired)
- [ ] API_TOKEN and AUTHENTICATION_TOKEN are from same source
- [ ] OAuth flow attempted (if static tokens don't work)
- [ ] Avinode support contacted (if all else fails)

---

**Last Updated**: 2025-12-23  
**Status**: ⚠️ Authentication failing - requires token refresh or OAuth flow


