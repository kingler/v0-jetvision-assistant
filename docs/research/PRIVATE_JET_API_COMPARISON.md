# Private Jet Charter API Research

> **Date**: December 2024
> **Purpose**: Evaluate publicly available APIs for private jet search, RFQ, and booking as alternatives/supplements to Avinode

---

## Executive Summary

This research identifies publicly available APIs for private jet charter services. **Aviapages** emerges as the strongest alternative to Avinode for developers, offering transparent pricing, OpenAPI documentation, and a free tier for testing.

**Key Finding**: Avinode and Aviapages operate **separate operator networks**. Integrating both provides broader market coverage, not redundant data.

---

## API Providers Comparison

### Tier 1: Recommended for Integration

#### 1. Aviapages (Recommended)

**Website**: [aviapages.com/aviapages_api](https://aviapages.com/aviapages_api/)
**Documentation**: [dir.aviapages.com/api/documentation](https://dir.aviapages.com/api/documentation/)

| Feature | Details |
|---------|---------|
| **API Access** | Public REST API with OpenAPI/Swagger docs |
| **Authentication** | Bearer token, Basic auth, API key, OAuth 2.0 |
| **Free Tier** | Available upon request |
| **Commission** | None - operator sets full price |
| **Documentation** | Swagger, Rapidoc, Redoc, OpenAPI formats |

**Available APIs**:

- Flight Time & Route Calculator API
- Flight Price Calculator API (instant estimates)
- Empty Legs API
- Charter Request API (RFQ functionality)
- Charter Directories API
- NOTAM API (decoded/undecoded)
- METAR & TAF API
- Aircraft Schedule API

**Pricing (Monthly)**:

| Tier | API Calls | Price |
|------|-----------|-------|
| Tier 1 | 600 | $144 |
| Tier 2 | 1,200 | $288 |
| Tier 3 | 2,000 | $432 |
| Tier 4 | 5,000 | $864 |
| Tier 5 | 10,000 | $1,440 |
| Tier 6 | 20,000 | $2,592 |

Yearly plans available at ~10 months' cost. Custom plans available.

**Contact**: <support@aviapages.com>

---

#### 2. Returnjet

**Website**: [returnjet.com](https://returnjet.com/)

| Feature | Details |
|---------|---------|
| **API Access** | Broker API with white-label widget |
| **Pricing** | Free up to usage threshold, then capped |
| **Aircraft Database** | 8,500+ aircraft |
| **Commission** | None - free platform |

**Key Features**:

- Real-time aircraft search and availability
- Empty legs automatically identified via scheduling feeds
- FL3XX integration (API-driven)
- White-labeled search widget available

**Note**: Documentation requires direct contact. Positioned as "world's largest free platform for charter operators & brokers."

---

### Tier 2: Enterprise/Partnership Required

#### 3. Avinode (Current Integration)

**Website**: [avinode.com/api](https://avinode.com/api/)

| Feature | Details |
|---------|---------|
| **Market Position** | Largest global marketplace (since 2002) |
| **Users** | 7,000+ aviation professionals |
| **API Access** | Enterprise partnerships only |
| **Pricing** | Not publicly disclosed |

**Capabilities**:

- Real-time aircraft availability
- Empty legs data
- CRM integration
- Click-to-book functionality

---

#### 4. Stratos Jets

**Website**: [stratosjets.com/data-integrations](https://www.stratosjets.com/data-integrations/)

| Feature | Details |
|---------|---------|
| **Focus** | Carrier scheduling platform integration |
| **API Access** | Contact sales |
| **Best For** | Air carriers, not brokers |

**Features**:

- Push empty legs to qualified customers
- Real-time positioning and availability
- Seamless carrier scheduling integration

---

#### 5. Jettly

**Website**: [jettly.com/api-intregrations](https://jettly.com/api-intregrations)

| Feature | Details |
|---------|---------|
| **API Access** | Available for operators, brokers, FBOs |
| **Documentation** | Contact required |

**Features**:

- Real-time data access
- Booking management
- Empty leg monetization
- FBO operational tools

---

#### 6. FlightPartner

**Website**: [flightpartner.com](https://www.flightpartner.com/)

| Feature | Details |
|---------|---------|
| **Architecture** | Global Distribution Network (GDN) for private jets |
| **Tech Stack** | Laravel/PHP backend, Angular.js frontend |
| **API Access** | Widget and API integration available |

**Capabilities**:

- Build custom booking applications
- Real-time aircraft availability
- Multi-source quote aggregation

---

### Tier 3: Limited API / Consumer-Focused

#### 7. Jet.AI / CharterGPT

**Website**: [jet.ai](https://jet.ai/)

| Feature | Details |
|---------|---------|
| **Public API** | DynoFlight carbon crediting only |
| **Booking** | Consumer app (CharterGPT), not developer API |
| **AI Features** | Natural language booking via "Ava" agent |

**Note**: No public API for flight search/booking. Consumer-focused mobile app.

---

## Avinode vs Aviapages: Key Differences

### Market Coverage

| Aspect | Avinode | Aviapages |
|--------|---------|-----------|
| **Founded** | 2002 | Later entrant |
| **Market Position** | Industry leader | Challenger |
| **Operator Network** | 7,000+ professionals | Different operator base |
| **Geographic Strength** | Global, strong US/Europe | Growing network |

### Critical Insight: Separate Inventories

**Avinode and Aviapages do NOT share the same aircraft inventory.**

- Operators subscribe to each platform separately
- Not all operators are on both platforms
- Same aircraft may have different pricing on each
- Empty legs are particularly different (time-sensitive, single-platform updates)

**Implication**: Integrating both platforms provides **broader market coverage**, not redundant data.

```text
Example Search Results:
Avinode Search  →  15 aircraft options
Aviapages Search →  12 aircraft options
                    ─────────────────────
Combined (deduplicated) →  ~22 unique options
```

### API Accessibility

| Factor | Avinode | Aviapages |
|--------|---------|-----------|
| **Public Pricing** | No | Yes |
| **Free Tier** | No | Yes (upon request) |
| **Documentation** | Partner-only | Public OpenAPI |
| **Developer Onboarding** | Enterprise sales | Self-service |

---

## Recommendation

### For Jetvision Integration

**Primary Recommendation**: Implement **multi-provider architecture** with both Avinode and Aviapages.

**Rationale**:

1. **Broader Coverage**: Access operators on both networks
2. **Price Competition**: Compare quotes from different platforms
3. **Redundancy**: Failover if one platform is unavailable
4. **Unique Features**: Aviapages offers instant price estimates (no RFQ wait)

### Implementation Priority

1. **Aviapages** - Add as new provider (transparent API, easy onboarding)
2. **Returnjet** - Consider for free tier / cost optimization
3. **Others** - Evaluate based on specific regional needs

---

## Technical Integration Notes

### Aviapages API Details

**Base URL**: `https://dir.aviapages.com/api/`

**Authentication Options**:

- Bearer token (recommended)
- Basic authentication
- API key header
- OAuth 2.0

**Rate Limits** (by tier):

- Tier 1: 600 calls/month
- Tier 2: 1,200 calls/month
- Tier 3: 2,000 calls/month
- Higher tiers available

### Tool Mapping: Avinode → Aviapages

| Avinode Tool | Aviapages Equivalent | Notes |
|--------------|---------------------|-------|
| `search_flights` | `search_flights` | Direct mapping |
| `search_empty_legs` | Empty Legs API | Via dedicated endpoint |
| `create_rfp` | Charter Request API | RFQ to operators |
| `get_rfp_status` | Poll for responses | Similar pattern |
| `search_airports` | Directories API | Airport lookup |
| N/A | Flight Price Calculator | **Aviapages-only**: Instant estimates |

### Deduplication Strategy

When same operator/aircraft appears on both platforms:

1. Match by operator name + aircraft registration
2. Keep option with lower price
3. Track source provider for transparency

---

## Sources

- [Aviapages Flight API](https://aviapages.com/aviapages_api/)
- [Aviapages API Documentation](https://dir.aviapages.com/api/documentation/)
- [Avinode API](https://avinode.com/api/)
- [Returnjet Broker API Announcement](https://returnjet.com/returnjet-launches-long-awaited-broker-api-in-support-of-their-ongoing-campaign-to-make-it-easier-for-everyone-to-do-business/)
- [Returnjet - World's Largest Free Platform](https://www.theaircharterassociation.aero/8015-2/)
- [Stratos Jets Data Integrations](https://www.stratosjets.com/data-integrations/)
- [Jettly API Integrations](https://jettly.com/api-intregrations)
- [FlightPartner](https://www.flightpartner.com/)
- [Jet.AI](https://jet.ai/)
- [Top Avinode Alternatives 2025](https://slashdot.org/software/p/Avinode/alternatives)
- [Best Aviation Software 2025 Comparison](https://aerotalon.com/compare/best-aviation-software-avinode-leon-fl3xx/)

---

## Appendix: Other Aviation APIs (Non-Charter)

For general flight data (not private charter), these APIs are available:

| Provider | Use Case | URL |
|----------|----------|-----|
| FlightAPI.io | Commercial flight status/schedules | flightapi.io |
| AeroDataBox | Aviation data (aircraft, airports) | aerodatabox.com |
| IATA Open API | Airline/travel industry data | api.developer.iata.org |

These are **not** suitable for private jet charter search/booking.
