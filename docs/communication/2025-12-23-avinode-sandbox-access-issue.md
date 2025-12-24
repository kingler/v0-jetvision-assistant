# Avinode Sandbox API Access Issue

**Date:** December 23, 2025
**From:** Jetvision Development Team / One Kaleidoscope
**To:** Avinode Support Team
**Subject:** Unable to Access Sandbox API - Permission Issue After Monday Reset

---

## Email Draft

**To:** Avinode Support
**Subject:** Sandbox API Access Issue - Unable to Switch Accounts for User Permission Settings

---

Dear Avinode Support Team,

I am reaching out regarding an issue we are experiencing with our Avinode Sandbox API integration for our Jetvision application.

### Background

We have been developing an integration with the Avinode API and were successfully accessing the sandbox environment last week. We followed the instructions outlined in your documentation for retrieving API tokens:
[Retrieving API Tokens for Integrations in Avinode](https://help.avinodegroup.com/hc/en-us/articles/11089252981019-Retrieving-API-Tokens-for-Integrations-in-Avinode)

### Current Issue

Following the Monday sandbox reset (which we understand occurs between 6-8 AM UTC weekly), we are experiencing several issues with our API integration. Specifically:

1. **Account Switching Unavailable:** Last week, I was able to switch accounts From Jetvision LLC to Sandbox Dev Operator to access the user permission settings page for API configuration. This functionality is no longer available to me. I'm no longer able to access the Sandbox Dev Operator account at all (see attached screenshots).

![alt text](<../../Screenshot 2025-12-23 at 9.35.08 AM.png>)
![alt text](<../../Screenshot 2025-12-23 at 9.35.24 AM.png>)

2. **Permission Requirement:** Per your documentation: *"Please note: Without these user permissions, you will not be able to access the API section in Avinode for your company."*

3. **Re-configured Credentials:** After discovering the sandbox reset, I regenerated fresh API Token, Authentication Secret (JWT), and OAuth credentials (CLIENT_ID and CLIENT_SECRET) from the Avinode Sandbox UI. However, despite using these newly generated credentials, I continue to receive authentication errors.

4. **UI Access Works, API Access Fails:** I am able to successfully login to the Jetvision LLC account for the Avinode Sandbox UI and search the marketplace manually. However, when attempting to retrieve the linked RFQs via the API, I receive permission errors (`NOT_FOUND`). This suggests the API credentials do not have the same access level as my UI session.

5. **Deep Link Search Parameters Not Pre-filled:** When the API worked last week, the `POST /trips` API call returns a deep link to the Avinode Marketplace, the search query parameters (airport codes, date, passengers) that I entered in my web application are **not automatically pre-filled** in the Avinode Marketplace. I have to manually re-enter the search criteria in the Avinode web app, which defeats the purpose of the API integration.

### Current User Permissions (View Only)

After the sandbox reset, I now see a **read-only, non-editable** permission entry on my account in the Jetvision LLC account Company -> My Profile -> Edit User -> Permissions & Email that was not present last week when I initially configured API access:

**Permission Page:** `https://sandbox.avinode.com/industry/mvc/account/permissions/edit?companyAccountId=458934`

| Access    | Permission         | Access To | Description                                              |
| --------- | ------------------ | --------- | -------------------------------------------------------- |
| View Only | Company APIs       | -         | Access company APIs                                      |
| Full      | Requests & Quotes  | -         | Respond to charter requests and create quotes            |
| Full      | Search             | -         | Use all search features to which your company has access |
| Full      | Support Access     | -         | Grant and revoke access for Avinode Support              |
| Full      | Technical Staff    | -         | Configure technical settings and API integrations        |

**Note:** I can see the "View Only" permission in the Edit User page under the "Permissions & Email" tab. It appears I have permissions for Company APIs, Requests & Quotes, Search, Support Access, and Technical Staff. However, despite these permissions being visible, I am still unable to connect to the API. The "Company APIs" permission was not present in my initial setup last week, and I'm unsure if "View Only" is sufficient for API access or if "Full" access is required.

### Authentication Token Testing

We tested **two different Authentication Token types** after regenerating credentials, and both are failing with different errors:

#### Token Type 1: Interactive/Regular API Token (`avitype=16`)

**JWT Payload:**

```json
{
  "sub": "60E43D03-5A54-4CDF-AE71-FC0EA98A4359",
  "iss": "avinode",
  "avitype": 16,
  "avidomain": ".avinode.com",
  "avitenant": 13792
}
```

**Error:** `AUTHENTICATION_COMPANY_ACCESS` - The token appears to belong to a different company than the one creating trips in the browser.

#### Token Type 2: REST/Sandbox API Token (`avitype=15`)

**JWT Payload:**

```json
{
  "sub": "60E43D03-5A54-4CDF-AE71-FC0EA98A4359",
  "iss": "avinode",
  "avitype": 15,
  "avidomain": ".avinode.com",
  "avitenant": 13792
}
```

**Error:** `ERR_INPUT_GENERIC_INVALID` on buyer endpoints (`/trips`, `/rfqs`) - but this token type may work on other endpoints.

#### Summary of Token Type Failures

| Token Type              | avitype | Error on Buyer Endpoints        | Notes                                                   |
| ----------------------- | ------- | ------------------------------- | ------------------------------------------------------- |
| Interactive/Regular API | 16      | `AUTHENTICATION_COMPANY_ACCESS` | Token belongs to different company than browser session |
| REST/Sandbox API        | 15      | `ERR_INPUT_GENERIC_INVALID`     | May work on non-buyer endpoints                         |

**Both token types fail on the buyer endpoints we need (`/trips`, `/rfqs`).** We are unsure which token type is correct for our use case (creating trips and retrieving RFQs as a buyer/broker).

### API Request Details

We are making the following API calls with these credentials:

**Environment Variables:**

```bash
API_TOKEN="d221161f-6e64-4f5a-a564-62b7c0b235bc"

# Token Type 1: Interactive (avitype=16) - Results in AUTHENTICATION_COMPANY_ACCESS
AUTH_TOKEN_INTERACTIVE="eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6IjBiODAwN2ZiLTQ5MDMtNDQzNy05NDE1LTQ3ZmRlZTFlMzU4YyJ9.eyJzdWIiOiI2MEU0M0QwMy01QTU0LTRDREYtQUU3MS1GQzBFQTk4QTQzNTkiLCJpc3MiOiJhdmlub2RlIiwiYXZpdHlwZSI6MTYsImF2aWRvbWFpbiI6Ii5hdmlub2RlLmNvbSIsImF2aW5vbmNlIjoiNDAyNTQ0OWUtODk2YS00NDQzLTkwN2UtZGYzOTdmZmY4YzdiIiwiYXZpdGVuYW50IjoxMzc5Mn0.ZsVV2fV4-J7Rb4ViI0Qy3hkncZIvdFYvJRrgHbiuijaMUt_cR-xhYdr2T8E48aAYtGDpYRK7Nm2s_M6OaiVyCHX-K5Lbz8PsAN0D9XW86cB8MAyW4jU62KMtCs5osXzbcPzdW_VteaTuBTZN0a6HcHPZqg2wgTfhI_Zp1lZxFiEw8mZcU4jyA7qP1hSYJMutn5-HbNOe_2ZwaW29MOiTBlGRUFxOKU7zc2h8w2YcCAc6JEdwdSDEUn6iQBnYfEw9AjfN1D0ZhsklVEYDI2Va2VZoIvEFJTg-38pSE5OIdA_9MUMdvHq7eOybY_fwwz9Q0KszyFHYllZo8LgoeFMCZQ"

# Token Type 2: REST/Sandbox (avitype=15) - Results in ERR_INPUT_GENERIC_INVALID on buyer endpoints
AUTH_TOKEN_REST="eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6IjBiODAwN2ZiLTQ5MDMtNDQzNy05NDE1LTQ3ZmRlZTFlMzU4YyJ9.eyJzdWIiOiI2MEU0M0QwMy01QTU0LTRDREYtQUU3MS1GQzBFQTk4QTQzNTkiLCJpc3MiOiJhdmlub2RlIiwiYXZpdHlwZSI6MTUsImF2aWRvbWFpbiI6Ii5hdmlub2RlLmNvbSIsImF2aW5vbmNlIjoiYzU0OGQyYzItMzY4Ny00MmE2LWJlOTEtMmY3YTA1Njc3NWJjIiwiYXZpdGVuYW50IjoxMzc5Mn0.Sjd4bY-123yynx8pKv779EjJ_jH8HmuMJ2cWjz-Hs4Ka2KfMMB4fZ8TNFjcWb4OeM-rPtQU3q3o91SivPNIb3IlUmkY9JEl9GKfBd_ATedHTOLSoz_HFWDtxqxlBPX2vcP0NJUT8JJWNkyoUAmN2XbkUp8EhI7MHBSrbZiBq63WtwvJoVsN3_Z0zCL2Kabd_ioFUQ-VjyNsEHUWubWN8Aam0qWt4A2u3Ze63P9qeiQeCHg3bIGELKkIC6aIVqjXQK_f9ayCKBDIrFI0GKJ_pzLWmgwon8-wjjk-S_rFKwekDxVs54pJMTtqJtYM9yAi_YuVWsc-aq8nr5Qc35P6Vjg"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
```

---

#### 1. Create Trip Request (to get Avinode Marketplace URL)

**Endpoint:** `POST https://sandbox.avinode.com/api/trips`

**Purpose:** Create a new trip and receive a deep link to the Avinode Marketplace for operator selection.

**curl command:**

```bash
curl -s -X POST "https://sandbox.avinode.com/api/trips" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "X-Avinode-ApiToken: $API_TOKEN" \
  -H "X-Avinode-SentTimestamp: $TIMESTAMP" \
  -H "X-Avinode-ApiVersion: v1.0" \
  -H "X-Avinode-Product: Jetvision/1.0.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "legs": [
      {
        "departureAirport": {
          "icao": "KTEB"
        },
        "arrivalAirport": {
          "icao": "KMIA"
        },
        "departureDate": "2025-01-15",
        "departureTime": "10:00"
      }
    ],
    "passengers": 4,
    "externalId": "jetvision-test-001",
    "notes": "Test trip request from Jetvision API integration"
  }'
```

**Expected Response:** Trip ID and Avinode Marketplace deep link URL

**Actual Response:**

```json
{
  "meta": {
    "errors": [
      {
        "title": "Unfortunately the application has experienced an error. Please try again later or contact us.",
        "code": "ERR_INTERNAL_CRITICAL"
      }
    ],
    "warnings": [],
    "infos": []
  }
}
```

---

#### 2. Retrieve Trip RFQs (FAILED)

**Endpoint:** `GET https://sandbox.avinode.com/api/trips/{tripId}/rfqs`

**Purpose:** Retrieve RFQ data and operator quotes for an existing trip.

**curl command:**

```bash
curl -s "https://sandbox.avinode.com/api/trips/FVCZ9M/rfqs" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "X-Avinode-ApiToken: $API_TOKEN" \
  -H "X-Avinode-SentTimestamp: $TIMESTAMP" \
  -H "X-Avinode-ApiVersion: v1.0" \
  -H "X-Avinode-Product: Jetvision/1.0.0" \
  -H "Accept: application/json"
```

**Expected Response:** List of RFQs with operator quotes for trip FVCZ9M

**Actual Response:**

```json
{
  "meta": {
    "errors": [
      {
        "title": "Not found",
        "code": "NOT_FOUND"
      }
    ],
    "warnings": [],
    "infos": []
  }
}
```

---

#### 3. Get Single Trip Details (FAILED)

**Endpoint:** `GET https://sandbox.avinode.com/api/trips/{tripId}`

**curl command:**

```bash
curl -s "https://sandbox.avinode.com/api/trips/FVCZ9M" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "X-Avinode-ApiToken: $API_TOKEN" \
  -H "X-Avinode-SentTimestamp: $TIMESTAMP" \
  -H "X-Avinode-ApiVersion: v1.0" \
  -H "X-Avinode-Product: Jetvision/1.0.0" \
  -H "Accept: application/json"
```

**Actual Response:**

```json
{
  "meta": {
    "errors": [
      {
        "title": "Not found",
        "code": "NOT_FOUND"
      }
    ],
    "warnings": [],
    "infos": []
  }
}
```

**Note:** Trip ID `FVCZ9M` is visible in the Avinode Sandbox UI but returns "Not found" via the API.

---

#### 4. OAuth Token Request (FAILED)

**Endpoint:** `POST https://sandbox.avinode.com/api/oauth/token`

**Purpose:** Obtain a fresh OAuth access token using client credentials.

**curl command:**

```bash
curl -X POST "https://sandbox.avinode.com/api/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET"
```

**Credentials Used:**

- `CLIENT_ID=<REDACTED_CLIENT_ID>`
- `CLIENT_SECRET_JWT=<REDACTED_CLIENT_SECRET>`

**Note**: Real OAuth credentials are stored in `.env.local` and secure internal tracking system. Never commit actual credentials to version control.

**Actual Response:**

```json
{
  "error": "invalid_client",
  "errorDetails": [
    {
      "code": "invalid_client_secret_post",
      "description": "The provided client credentials are invalid."
    }
  ],
  "error_description": "The provided client credentials are invalid."
}
```

**Note:** These are **freshly regenerated credentials** obtained from the Avinode Sandbox UI after discovering the Monday reset. Despite being newly created, the OAuth token endpoint still returns `invalid_client`.

### Summary of Errors

| Endpoint                        | Error Code             | Error Message                                        |
| ------------------------------- | ---------------------- | ---------------------------------------------------- |
| `POST /api/oauth/token`         | `invalid_client`       | The provided client credentials are invalid          |
| `POST /api/trips`               | `ERR_INTERNAL_CRITICAL`| Unfortunately the application has experienced error  |
| `GET /api/trips/{tripId}`       | `NOT_FOUND`            | Not found                                            |
| `GET /api/trips/{tripId}/rfqs`  | `NOT_FOUND`            | Not found                                            |

### Our Configuration

- **Tenant ID:** 13792 (from JWT payload)
- **API Token:** Configured via `X-Avinode-ApiToken` header
- **Authentication:** Bearer token via `Authorization` header
- **User Type:** Buyer account (avitype: 16)
- **External ID:** 200E3FA0-4B7F-4C9E-93DC-DC4D009083E9

### Request for Assistance

We kindly request clarification on the following:

**Authentication & Credentials:**

1. We have already regenerated fresh OAuth credentials (CLIENT_ID and CLIENT_SECRET and The Authentication Token) from the Avinode Sandbox UI after the Monday reset, but the OAuth token endpoint still returns `invalid_client`. Can you verify that our credentials are correctly configured on your end?

2. Is there an additional activation step required after regenerating OAuth credentials in the sandbox?

3. Should we be using the OAuth 2.0 Client Credentials flow to obtain short-lived access tokens, or is the static JWT token approach valid for the sandbox environment?

4. Could there be an issue with how the sandbox reset restored our account that prevents OAuth from working?

**Permissions & Access:**

1. How can we regain access to switch accounts and configure user permissions for API access after the sandbox reset?

2. The "Company APIs" permission shows as "View Only" and is non-editable. How do we obtain "Full" access to this permission?

3. Why does my UI session have access to search the marketplace while the API credentials return errors? How can we align API access with UI access?

**Deep Link Integration:**

1. When creating a trip via the API (`POST /api/trips`), does the response include a `searchInAvinode` deep link with pre-filled search parameters?

2. Is there specific request body formatting required to ensure the search criteria (airports, date, passengers) are passed through to the marketplace URL?

### Project Context

We are building Jetvision, an AI-powered charter flight assistant that integrates with Avinode for:

- Creating trip requests via the API
- Retrieving RFQ data and operator quotes
- Processing webhook events for real-time quote updates

Your prompt assistance would be greatly appreciated as this is blocking our development progress.

Thank you for your support.

Best regards,

Jetvision Development Team

---

## Internal Notes (Do Not Include in Email)

### Critical Findings from Documentation Review

After reviewing the Avinode documentation, we identified several potential issues with our implementation:

#### 1. OAuth Token vs Static Bearer Token

**Issue:** We are using a **static JWT token** stored in `AUTHENTICATION_TOKEN`, but the documentation states:

> "The Avinode Authorization Server issues a **short-lived Access Token**" with a default lifespan of **30 minutes** (configurable 1-120 minutes).

**Our Current Approach:** Using a pre-generated JWT token that may have expired or been invalidated during the sandbox reset.

**Correct Approach:** We should be using the OAuth 2.0 Client Credentials flow to dynamically obtain a fresh Bearer token:

```bash
curl -X POST "https://sandbox.avinode.com/api/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET"
```

**We have these credentials but are NOT using OAuth:**
- `CLIENT_ID=<REDACTED_CLIENT_ID>`
- `CLIENT_SECRET_JWT=<REDACTED_CLIENT_SECRET>`

**Note**: Real OAuth credentials are stored in `.env.local` and secure internal tracking system. Never commit actual credentials to version control.

#### 2. Deep Links Are Returned IN Responses, Not Created

**Issue:** Deep links are **automatically generated and embedded** in API responses (in the `actions` or `links` collection). They are not created through separate API calls.

**Per Documentation:**
> "Deep links appear in either the actions or links collection of API resources."

The `searchInAvinode` action with pre-filled parameters is returned when you successfully call `POST /trips` or `GET /rfqs/{id}`.

**Our Error:** We may be expecting the deep link to come from a different source, when it should be returned in the trip creation response.

#### 3. Required User Permissions

**Issue:** The OAuth documentation explicitly states these permissions are required:
- **Company APIs** (we have "View Only" - may need "Full")
- **Technical Staff** (we have "Full")

#### 4. API Connection Expiration

**Issue:** Per documentation:
> "Connections expire after **60 days of inactivity**"

If the API connection was inactive, it may have been deactivated.

#### 5. Sandbox Data Reset Impact

**Issue:** The sandbox reset wipes ALL data including:
- User accounts and credentials
- Test data, messages, RFQs, quotes
- Trips created via API

**This explains why trip ID `FVCZ9M` returns NOT_FOUND** - it was deleted during the Monday reset.

### Action Items Before Sending Email

#### Tested OAuth Token Flow - FAILED

```bash
curl -X POST "https://sandbox.avinode.com/api/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=<REDACTED_CLIENT_ID>&client_secret=<REDACTED_CLIENT_SECRET>"
```

**Response:**

```json
{
  "error": "invalid_client",
  "errorDetails": [
    {
      "code": "invalid_client_secret_post",
      "description": "The provided client credentials are invalid."
    }
  ],
  "error_description": "The provided client credentials are invalid."
}
```

**Conclusion:** Even after regenerating fresh credentials from the Avinode Sandbox UI, OAuth still fails with `invalid_client`. This suggests either:

1. The credentials are not being correctly saved/activated on Avinode's side
2. There's a permission issue preventing OAuth from working
3. The "View Only" Company APIs permission is blocking OAuth authentication
4. The sandbox account was not fully restored after the reset

This confirms we need Avinode support to investigate and restore our API access.

### Questions to Clarify with Avinode

If OAuth token flow still fails, ask:
1. Should we use OAuth Client Credentials flow or the static JWT token approach?
2. Does the sandbox reset invalidate OAuth client credentials?
3. How do we request "Full" access to "Company APIs" permission instead of "View Only"?

---

## Attachments to Include

1. Screenshot of the account switching interface (if available)
2. Screenshot of the permission settings page from last week (if available)
3. Full API request/response logs

## Follow-up Actions

- [ ] Send email to Avinode support
- [ ] Request confirmation of sandbox account status
- [ ] Document any resolution steps for future Monday resets
