# Avinode Deep Link Search Prefill Issue

**Date:** December 29, 2025
**From:** Jetvision Development Team / One Kaleidoscope
**To:** Avinode Support Team
**Subject:** searchInAvinode Deep Links Not Prefilling Search Criteria in Sandbox

---

## Issue Summary

When using the `POST /trips` API to create trips, the returned `searchInAvinode` deep links open the Avinode Marketplace with an **empty search form** instead of prefilled criteria as documented.

---

## Documentation References

Your documentation explicitly states that deep links should automatically prefill and initiate searches:

### 1. "Search in Avinode from Your System"

**URL:** <https://developer.avinodegroup.com/docs/search-in-avinode-from-your-system>

> "In the response from this API call there will be a deep link to use for opening a new browser window with the Avinode search, which will be **initiated immediately**."

> "directly displays the **relevant search results, including itinerary details, passenger numbers, and aircraft categories**"

### 2. "End Client Trip Search"

**URL:** <https://developer.avinodegroup.com/docs/end-client-trip-search>

> searchInAvinode "opens up an aircraft search in Avinode **(based on the lead itinerary)** that will be **initiated immediately**"

### 3. "Working with Deep Links"

**URL:** <https://developer.avinodegroup.com/docs/working-with-deep-links>

> "The `searchInAvinode` action demonstrates how search criteria transfer via deep links... this feature **'runs a search with the parameters (itinerary, date, pax, category) of the original RFQ'** and open[s] up the Avinode web UI displaying the search results."

> "The **RFQ ID embedded in the URL carries the original search parameters automatically.**"

---

## Expected vs Actual Behavior

### Expected (per documentation)

When clicking the `searchInAvinode` deep link:

1. Avinode Marketplace opens
2. Search form is **prefilled** with trip criteria (airports, date, passengers)
3. Search is **initiated immediately**
4. Results are displayed automatically

### Actual Behavior

When clicking the `searchInAvinode` deep link:

1. Avinode Marketplace opens
2. Search form is **empty**
3. User must manually re-enter all criteria
4. No automatic search is triggered

---

## Test Cases

We created multiple trips via `POST /trips` with the `X-Avinode-ActAsAccount` header. None of the returned deep links prefill the search form:

| Trip ID | Route | Date | Pax | Deep Link | Prefill? |
|---------|-------|------|-----|-----------|----------|
| atrip-65262223 | KTEB→KMIA→KTEB | Jan 15-17, 2025 | 6 | `https://sandbox.avinode.com/marketplace/mvc/search/load/atrip-65262223?source=api&origin=api_action` | No |
| atrip-65262227 | KLAX→KSFO | Jan 20, 2025 | 3 | `https://sandbox.avinode.com/marketplace/mvc/search/load/atrip-65262227?source=api&origin=api_action` | No |
| atrip-65262229 | KORD→KDEN | Jan 25, 2025 | 5 | `https://sandbox.avinode.com/marketplace/mvc/search/load/atrip-65262229?source=api&origin=api_action` | No |

---

## API Request Example

**Endpoint:** `POST https://sandbox.avinode.com/api/trips`

**Headers:**

```
Authorization: Bearer <JWT token avitype=16>
X-Avinode-ApiToken: d221161f-6e64-4f5a-a564-62b7c0b235bc
X-Avinode-ActAsAccount: 200E3FA0-4B7F-4C9E-93DC-DC4D009083E9
X-Avinode-SentTimestamp: 2025-12-29T10:00:00.000Z
X-Avinode-ApiVersion: v1.0
X-Avinode-Product: Jetvision/1.0.0
Content-Type: application/json
```

**Request Body:**

```json
{
  "criteria": {
    "legs": [
      {
        "departureAirport": { "icao": "KLAX" },
        "arrivalAirport": { "icao": "KSFO" },
        "departureDate": "2025-01-20",
        "departureTime": "14:00"
      }
    ],
    "pax": 3
  }
}
```

**Response (success - trip created):**

```json
{
  "data": {
    "id": "atrip-65262227",
    "tripId": "...",
    "actions": {
      "searchInAvinode": "https://sandbox.avinode.com/marketplace/mvc/search/load/atrip-65262227?source=api&origin=api_action"
    }
  }
}
```

The trip is created successfully, but clicking `searchInAvinode` opens an empty search form.

---

## Questions

1. **Is the deep link prefill feature supported in the sandbox environment?** Or is this production-only?

2. **Is there a browser session requirement?** Must the user be logged in as the same account that created the trip via API?

3. **Is there a timing/propagation delay?** Should we wait before using the deep link?

4. **Are additional permissions required** beyond those needed for trip creation?

5. **Is there a known issue** with the sandbox environment regarding deep link prefill?

---

## Environment Details

- **Environment:** Sandbox (`https://sandbox.avinode.com`)
- **Token Type:** avitype=16 (Interactive)
- **External ID:** 200E3FA0-4B7F-4C9E-93DC-DC4D009083E9
- **Token Expiry:** February 8, 2026

---

Thank you for your assistance.

**Jetvision Development Team**
