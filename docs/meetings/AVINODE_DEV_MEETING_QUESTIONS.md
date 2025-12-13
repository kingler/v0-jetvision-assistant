# Avinode Developer Meeting - Questions & Implementation Review

**Date:** 2025-11-19
**Project:** Jetvision Multi-Agent Assistant - Broker Operations Platform
**Integration Type:** Interactive API (Broker-to-End Client)
**MCP Server:** `@mcp-servers/avinode-mcp-server`
**Purpose:** Validate broker workflow implementation and clarify endpoint usage

---

## Executive Summary

Jetvision is building an **internal sales operations platform** where our sales representatives interact with Avinode through a conversational AI Agent interface. The AI Agent serves as the single connection point to Avinode APIs, translating natural language requests from sales reps into API calls for search, RFQ management, and quote submission.

### Our Use Case (Internal Sales Platform)

- **Company Type:** Boutique private aviation broker (East Coast US)
- **Internal Users:** 10-15 sales representatives initially, scaling to 30-50
- **End Clients:** Have NO direct access to the platform (sales reps handle all interactions)
- **Architecture:** Single AI Agent with one Avinode API connection serving multiple internal sales reps
- **User Workflow:**
  1. Sales rep receives customer inquiry (phone/email from end client)
  2. Sales rep uses AI Agent to search flights and create RFQs
  3. Sales rep reviews quotes and prepares proposal for customer
  4. Sales rep presents options to customer (via phone/email/in-person)
  5. Customer makes decision → Sales rep executes booking
- **Primary Functions:**
  1. Aircraft search (sales rep searches on behalf of customers)
  2. RFQ/quote management (internal quote tracking)
  3. Customer communications through Avinode (sales rep as intermediary)
  4. Booking confirmations

### Key Questions Focus Areas

1. **🚨 CRITICAL:** Search endpoint clarification (`POST /searches` vs `POST /trips`)
2. **⚠️ HIGH:** Quote submission workflow using `X-Avinode-ActAsAccount` header
3. **⚠️ MEDIUM:** Multi-broker architecture with single API connection
4. **⚠️ MEDIUM:** Webhook configuration for quote notifications
5. **ℹ️ LOW:** Sandbox testing with broker personas

---

## Current Implementation Overview

### Our Broker Workflow (Per Application Questionnaire)

**Step 1: Aircraft Search (Sales Rep → AI Agent → Avinode)**
- Sales rep receives customer inquiry via phone/email: "Client needs G550, NYC to LAX, March 15, 6 passengers"
- Sales rep types in AI chat: "Find Gulfstream G550 NYC to LAX, March 15, 6 passengers"
- AI Agent → `POST /searches` API
- Results displayed to sales rep in conversational format
- Sales rep reviews options (NO direct customer access to platform)

**Step 2: RFQ Creation (Sales Rep Creates on Behalf of Customer)**
- Sales rep discusses options with customer (phone/email/in-person)
- Customer indicates interest → Sales rep: "Create RFQ for tail N123AB, customer John Smith, john@example.com"
- AI Agent → Submit RFQ through Avinode API
- RFQ confirmation provided to sales rep

**Step 3: Quote Management (Internal Tracking)**
- AI Agent monitors Avinode webhooks for RFQ updates
- When quotes received → Alert sales rep via AI chat
- Sales rep: "Show me quotes for RFQ-12345"
- AI Agent → `GET /quotes/{id}` API
- Sales rep prepares proposal for customer presentation

**Step 4: Quote Submission (Jetvision as Seller)**
- Sales rep prepares quote for customer RFQ
- Sales rep: "Submit quote for RFQ-12345: $32,000, includes catering"
- AI Agent → `POST /tripmsgs/{requestId}/submitQuote` API
- Uses `X-Avinode-ActAsAccount` header with **sales rep's name** (e.g., "John Smith")

**Step 5: Customer Communications (Sales Rep as Intermediary)**
- AI Agent monitors webhooks for customer messages → Retrieves via `GET /tripmsgs`
- Presents messages to sales rep in AI chat
- Sales rep drafts response → AI Agent sends via message API
- **Important:** Customer communicates with Avinode system, sales rep responds through AI Agent

### MCP Server Tools (Current Implementation)

**Search Operations:**
- `search_flights` - Aircraft availability searches (`POST /searches`)
- `search_airports` - Airport lookup (`GET /airports`)

**READ Operations:**
- `get_rfp_status` - RFQ details and status (`GET /rfqs/{id}`)
- *(Quote retrieval to be added: `GET /quotes/{id}`)*
- *(Message retrieval: `GET /tripmsgs/{id}`)*

**WRITE Operations:**
- `create_rfp` - Create RFQ *(endpoint TBD)*
- *(Quote submission: `POST /tripmsgs/{requestId}/submitQuote`)*
- *(Message sending: `POST /tripmsgs/{requestId}/sendMessage`)*
- *(RFQ decline functionality)*

**Monitoring:**
- `create_watch` - Webhook monitoring setup
- Webhook subscriptions: Trip Requests, Buyer Chat Messages, Booking confirmations

**Implementation Files:**
- [Application Questionnaire](../../docs/AVINODE_QUESTIONARY_ANSWERS_Shorter.md)
- [API Setup Guide](../../docs/implementation/AVINODE-API-SETUP.md)
- [MCP Server Source](../../mcp-servers/avinode-mcp-server/src/)

---

## CRITICAL QUESTIONS

### 1. Search API for Broker-to-End Client Use 🚨 **HIGHEST PRIORITY**

**Our Use Case (From Questionnaire):**
> "Jetvision is developing an **internal broker operations platform**. Our **sales team** (10-15 users initially) will interact with the system by typing requests in natural language (e.g., 'Search for Citation X from Teterboro to Miami tomorrow'), and the AI Agent translates these into the appropriate Avinode API calls."

**Critical Clarification:**
- **Internal users only:** Jetvision sales representatives (NOT end clients)
- **Sales rep workflow:** Receives customer inquiry → Uses AI Agent to search → Presents options to customer
- **Customer interaction:** Via phone/email/in-person (customers do NOT access the platform directly)

**Current Implementation:**
```typescript
// We've implemented this:
POST /searches  // ← Is this correct for internal sales team use case?

// API docs mention restriction for "B2B integrations"
// We are BROKERS with INTERNAL SALES TEAM searching on behalf of END CLIENTS
```

#### Questions:

**1.1 Internal Sales Team Search Workflow Clarification:**
- As a **broker with internal sales team** searching on behalf of end clients:
  - **Sales reps** use our AI platform (not end clients directly)
  - Sales reps search → review results → present to customers via phone/email
  - Should we use `POST /searches` programmatically for this internal tool?
  - Or is `POST /trips` → deep link required even for internal broker tools?

**1.2 "Inhouse Purpose" Classification:**
> Our application questionnaire states: "Intended application purpose: ☑ Inhouse purpose"

- Does "Inhouse purpose" + "Interactive API" mean:
  - ✅ Internal sales team can use `POST /searches` programmatically?
  - ❌ Must use deep links even for internal tools?
- Is the B2B restriction only for:
  - Software vendors reselling to other businesses?
  - SaaS platforms where end clients access the search directly?
  - Operator-to-operator integrations?
- **Our case:** Internal sales operations platform (no end client access) - are we correctly classified?

**1.3 Search Response Format:**
```typescript
// What does POST /searches return?
{
  search_id: string;
  results: [
    {
      operator: { id, name, rating },
      aircraft: { type, model, availability },
      pricing: { estimated_total, currency }
      // ... what else?
    }
  ];
  total_results: number;
}
```
- What's the complete schema of search results?
- Do we get operator IDs we can use for RFQ creation?
- Are pricing estimates included, or only availability?

**1.4 Search Endpoint URL:**
```typescript
// Our assumption:
POST https://api.avinode.com/searches
// Or is it:
POST https://api.avinode.com/api/searches
```
- What's the exact endpoint path?
- Is it versioned (`/v1/searches`)?

---

### 2. Quote Submission as Sellers (Broker Role) ⚠️ **HIGH PRIORITY**

**Our Sales Team Workflow (From Questionnaire):**
> "**Step 4: Quote Submission**
> - Sales rep instructs AI Agent: 'Submit quote for RFQ-12345: $32,000, includes catering'
> - AI Agent formats and submits quote via `POST /tripmsgs/{requestId}/submitQuote` API
> - **Uses `X-Avinode-ActAsAccount` header with sales rep's name for personalization**"

**Critical Understanding:**
- We are **both buyers AND sellers** (Jetvision acts in dual capacity)
- When we receive RFQs from customers → Sales rep submits quotes back through AI Agent
- Multiple **internal sales reps** (10-50) need to submit quotes using the **same API connection**
- Customer sees sales rep's name on the quote (personalization through `X-Avinode-ActAsAccount`)

#### Questions:

**2.1 X-Avinode-ActAsAccount Header Usage (Sales Rep Attribution):**
```typescript
// Our planned implementation:
POST /tripmsgs/{requestId}/submitQuote
Headers:
  X-Avinode-ApiToken: {our_api_token}
  Authorization: Bearer {our_bearer_token}
  X-Avinode-ActAsAccount: "John Smith"  // ← Sales rep name
Body:
  {
    price: 32000,
    currency: "USD",
    message: "Includes catering, WiFi, etc."
  }
```
- Is this the **correct** usage for internal sales team attribution?
- What should the value be:
  - Sales rep's full name ("John Smith")?
  - Sales rep's Avinode username/account?
  - Sales rep's email?
  - Company + rep name ("Jetvision - John Smith")?
- **Important:** Will the customer see this name when they receive the quote?
  - We want customers to see their specific sales rep's name (personalization)
  - Not just generic "Jetvision" company name

**2.2 Quote Submission Endpoint:**
- Is `POST /tripmsgs/{requestId}/submitQuote` the correct endpoint?
- What's the full request schema?
```typescript
interface SubmitQuoteRequest {
  price: number;
  currency: string;  // ISO 4217
  message?: string;
  aircraft?: {
    tail_number: string;
    type: string;
    model: string;
  };
  terms?: {
    cancellation_policy?: string;
    payment_terms?: string;
  };
  valid_until?: string; // ISO 8601
  // What else is required/optional?
}
```

**2.3 Multi-Sales-Rep Quote Attribution:**
- With 10-50 **internal sales reps** using the **same API connection**, how does Avinode:
  - Attribute quotes to individual sales reps?
  - Display sales rep names to customers?
  - Track individual sales rep performance/activity?
- Is `X-Avinode-ActAsAccount` the only mechanism, or are there other fields?
- **Use case:** Sales rep "John Smith" submits quote → Customer should see "John Smith" (not generic "Jetvision")

**2.4 Quote Lifecycle:**
- After submission, can brokers:
  - Update their quote (change price)?
  - Retract their quote?
  - View quote status (pending, accepted, rejected)?
- What endpoints handle these operations?

---

### 3. Authentication for Single API Connection (Multi-Broker) 🔐 **HIGH PRIORITY**

**Our Architecture (From Questionnaire):**
> "**Architecture:** Single AI Agent with **one Avinode API connection** serving 10-50 **internal sales reps** via chat interface."
>
> "Only the AI Agent has Avinode API credentials. All **sales reps** access Avinode functionality through the chat interface. This provides centralized security, rate limiting compliance, and complete audit logging."
>
> **Key Point:** End clients have NO access to the platform. Sales reps are the only users.

**Current Setup (From AVINODE-API-SETUP.md):**
```typescript
// Required headers
headers: {
  'X-Avinode-ApiToken': process.env.AVINODE_API_TOKEN,
  'Authorization': `Bearer ${process.env.AVINODE_BEARER_TOKEN}`,
  'X-Avinode-SentTimestamp': new Date().toISOString(),
  'X-Avinode-ApiVersion': 'v1.0',
  'X-Avinode-Product': 'Jetvision/1.0.0',
  'Accept-Encoding': 'gzip',
}
```

#### Questions:

**3.1 Single Connection for Multiple Sales Reps - Is This Correct?**
- We plan to use **one set of API credentials** (API Token + Bearer Token) for all 10-50 **internal sales reps**
- Sales reps are differentiated using `X-Avinode-ActAsAccount` header
- Is this the **recommended architecture** for an internal sales operations platform?
- Or should each sales rep have separate API credentials?
- **Clarification:** This is an internal tool (like a CRM) - sales reps don't have individual Avinode accounts

**3.2 API Token vs Bearer Token:**
```bash
# From our setup guide:
AVINODE_API_TOKEN=your-api-token-here           # ← What is this?
AVINODE_BEARER_TOKEN=your-bearer-token-here     # ← What is this?
```
- What's the difference between `X-Avinode-ApiToken` (in headers) and `Authorization: Bearer {token}`?
- Are these two separate credentials, or derived from the same source?
- Do we need OAuth `client_credentials` flow, or are these static tokens?

**3.3 Token Expiration:**
- Do `AVINODE_API_TOKEN` and `AVINODE_BEARER_TOKEN` expire?
- If yes, what's the expiration period?
- Do we need to implement token refresh logic?
- Or are these long-lived credentials (rotated manually)?

**3.4 Credential Provisioning:**
- How do we obtain these credentials?
  - Through developer portal after sandbox approval?
  - Via support request?
  - Self-service in Avinode Marketplace account?
- Are sandbox credentials different from production credentials?

**3.5 Rate Limiting with Single Connection:**
> "Rate limiting managed centrally (~1 call/second)"

- With one API connection serving 50 **internal sales reps**, how do we ensure compliance?
- If sales rep A and sales rep B both try to search simultaneously, do we:
  - Queue requests internally (our AI Agent queues them)?
  - Implement token bucket algorithm?
  - Rely on Avinode's rate limiting (and handle 429s)?
- Are there different rate limits for different endpoint types (search vs quotes)?

---

## MEDIUM PRIORITY QUESTIONS

### 4. Webhooks for Broker Notifications 📡

**Our Webhook Strategy (From Questionnaire):**
> "**Webhooks:**
> - Trip Request notifications (new RFQs and updates)
> - Buyer Chat Messages (customer communications)
> - Booking confirmations
>
> **Compliance:**
> - Webhook-driven architecture (not polling)
> - Complete audit logging with user attribution"

#### Questions:

**4.1 Webhook Configuration:**
- Where do we configure webhook URLs in the Avinode dashboard/portal?
- Can we have **different webhook URLs per event type**?
  - Example: `TripRequestSellerResponse` → `/api/webhooks/quotes`
  - Example: `EmptyLegs` → `/api/webhooks/empty-legs`
- Can we register/update webhook URLs programmatically via API?
- Is there a webhook configuration API endpoint?

**4.2 Sales-Team-Specific Webhook Events:**
```
Our Internal Workflow:
Step 3: When customer RFQ receives quotes → AI Agent alerts sales rep
Step 5: When customer sends message → AI Agent presents to sales rep
Step 6: When customer accepts quote → AI Agent alerts sales rep
```
- **For sales reps managing customer RFQs**, which webhook events should we subscribe to:
  - `TripRequest` - New RFQs from customers?
  - `TripChatFromBuyer` - Customer messages?
  - Booking confirmation event - What's the event name?

- **For sales reps sending quotes to customers**, do we get notifications when:
  - Customer views our quote?
  - Customer accepts/rejects our quote?
  - Customer sends us a message?
  - What events cover these scenarios?

**4.3 Single Webhook URL for All Sales Reps:**
```typescript
// Our planned webhook endpoint
POST https://api.jetvision.com/webhooks/avinode

// Receives notifications for all 10-50 internal sales reps
// How do we route to correct sales rep?
```
- With one API connection, do we receive:
  - All webhook events for our company account?
  - Events only for specific sales rep actions (via `X-Avinode-ActAsAccount`)?
- How do we determine **which sales rep** a webhook event belongs to?
  - Is there a sales rep identifier in the payload?
  - Or must we look up the RFQ/trip to find which rep created it?

**4.4 Webhook Payload Schema:**
```json
{
  "id": "unique-id",
  "href": "https://sandbox.avinode.com/api/rfqs/arfq-12345678",
  "type": "rfqs"
}
```
- Is this the complete webhook payload schema?
- Are there additional fields we should expect?
- Does `type` field have other values besides `rfqs`, `tripmsgs`, `emptylegs`, `leads`?
- Can we get a full example payload for each event type?

**4.5 Webhook Retry & Delivery Guarantees:**
- If our webhook endpoint is temporarily down (server restart, deployment), do you retry delivery?
- What's the retry strategy?
  - How many retries?
  - What's the backoff interval? (exponential, fixed, linear)
  - How long do you keep retrying?
- If all retries fail, is the webhook lost permanently?
- Is there a way to **replay missed webhooks** (e.g., fetch missed events by timestamp)?
- Do you provide webhook delivery logs/monitoring in the dashboard?

**4.6 Webhook Security:**
- Do you sign webhook payloads?
  - HMAC signature in headers?
  - What hashing algorithm?
  - Where do we get the signing secret?
- Should we validate the `href` domain to prevent spoofing?
- Do you include any authentication headers (API key, token)?

**4.7 Webhook Response Requirements:**
> "The receiving webhook server should always respond with HTTP 200 status"

- Must we respond with **exactly** 200, or are 2xx codes acceptable?
- What if we need to return 201 (Created) or 204 (No Content)?
- Is there a maximum response time before timeout?
- Should we process webhooks asynchronously and return 200 immediately, or is synchronous processing OK?

**4.8 Handling Duplicate Webhooks:**
> Documentation mentions: "Handle parallel and duplicate notifications"

- Under what conditions do you send duplicate webhooks?
- Should we implement idempotency based on webhook `id` field?
- How long should we cache webhook IDs to detect duplicates?

---

### 5. RFQ/Trip Message Endpoints (Customer Communications) 💬

**Our Workflow (From Questionnaire):**
> "**Step 5: Customer Communications**
> - AI Agent monitors for customer messages via Avinode webhooks
> - Retrieves messages via `GET /tripmsgs` API
> - Presents to broker in chat
> - Broker sends responses through AI Agent, which calls Avinode message API"

#### Questions:

**5.1 Retrieving Customer Messages:**
```typescript
// Our assumption:
GET /tripmsgs/{requestId}  // Get all messages for an RFQ?
// Or:
GET /tripmsgs?rfq_id={id}  // Query parameter?
```
- What's the correct endpoint to retrieve messages for a specific RFQ/trip?
- Does it return:
  - All messages (buyer + seller)?
  - Only customer (buyer) messages?
  - Threaded conversation?

**5.2 Message Response Schema:**
```typescript
// What does GET /tripmsgs return?
{
  messages: [
    {
      id: string;
      sender: 'buyer' | 'seller';
      sender_name: string;
      message: string;
      timestamp: string;
      rfq_id: string;
      // What else?
    }
  ]
}
```

**5.3 Sending Messages to Customers:**
```typescript
// Our assumption:
POST /tripmsgs/{requestId}/sendMessage
Headers:
  X-Avinode-ActAsAccount: "John Smith"  // Broker name
Body:
  {
    message: "Thank you for your inquiry. We can provide..."
  }
```
- Is this the correct endpoint?
- What fields are required/optional in the message body?
- Can we attach files/documents to messages?

**5.4 RFQ Decline Functionality:**
> "RFQ decline functionality when unable to fulfill requests"

- When we can't fulfill a customer RFQ, how do we decline it?
- Is there a specific endpoint:
  - `POST /tripmsgs/{requestId}/decline`?
  - `PUT /rfqs/{id}/status` with `status: 'declined'`?
- Do we need to provide a decline reason?

---

### 6. Sandbox Testing for Broker Workflows 🧪

**From AVINODE-API-SETUP.md:**
> "⚠️ **Weekly Data Reset:** Database rebuilds every Monday, 6-8 AM UTC. All test data (RFQs, quotes, flights) is deleted."

#### Questions:

**6.1 Testing Sales Rep Personas in Sandbox:**
- Can we create **multiple sales rep personas** in sandbox to test `X-Avinode-ActAsAccount`?
  - Example: "John Smith", "Sarah Johnson", "Mike Chen" as different sales reps
- Or do we just use any string value for testing?
- **Note:** These are internal sales reps (not separate Avinode user accounts)

**6.2 Test RFQ Workflow:**
- For end-to-end testing of our broker workflow:
  1. We create a search → Get results
  2. We create an RFQ/trip
  3. ??? How do we simulate receiving quotes in sandbox?
     - Do test operators automatically respond?
     - Must we manually create quotes through sandbox UI?
     - Can we trigger test quotes via API?

**6.3 Webhook Testing:**
- Can we use **ngrok/localtunnel URLs** for webhook testing during development?
  - Example: `https://abc123.ngrok.io/webhooks/avinode`
- Do all webhook events fire in sandbox?
- Can we trigger test webhook events without actual RFQ activity?

**6.4 Sandbox Credentials:**
- Will sandbox credentials be different from production?
- After approval, how long until we receive sandbox access?
- Is there a test `AVINODE_API_TOKEN` and `AVINODE_BEARER_TOKEN` we should expect?

---

## LOW PRIORITY QUESTIONS

### 7. Rate Limits & API Performance ⚡

**From Questionnaire:**
> "Rate limiting managed centrally (~1 call/second)"

**From AVINODE-API-SETUP.md:**
> "**Rate**: Approximately 1 call per second, with burst tolerance"

#### Questions:

**7.1 Rate Limit Enforcement:**
```
Our Estimated Usage (from questionnaire):
- Initial phase (months 1-3): ~5,000 calls/month  (~2 calls/hour)
- Growth phase (months 4-12): ~15,000 calls/month (~7 calls/hour)
- Steady state: ~30,000 calls/month              (~14 calls/hour)
```
- At steady state (~14 calls/hour average), we're well under any limit
- But **bursts** are possible (multiple brokers searching simultaneously)
- What's the actual burst tolerance?
  - Can we do 5 calls in 10 seconds, then wait?
  - Or is it strictly 1 call/second with no burst?

**7.2 Rate Limit Headers:**
```
X-Rate-Limit-Limit: ?
X-Rate-Limit-Remaining: ?
X-Rate-Limit-Reset: ?
```
- Are these headers included in all responses?
- Should we proactively throttle based on `Remaining` count?

**7.3 429 Handling Strategy:**
- From our setup guide, we've implemented exponential backoff: 2s, 4s, 8s
- Is this appropriate, or should we use `Retry-After` header value?

---

### 8. Airport Search & Data 🛫

**MCP Tool:**
```typescript
search_airports - Airport lookup (GET /airports)
```

#### Questions:

**8.1 Airport Search Endpoint:**
- What's the correct endpoint?
  - `GET /airports/search?query={query}&country={country}`
  - `GET /airports?q={query}`
  - Different path?

**8.2 Airport Data Coverage:**
- Does the airport database include:
  - All US airports (our primary market)?
  - FBO information (important for charter operations)?
  - Runway length/aircraft size restrictions?
  - Operating hours/curfews?

---

### 9. Data Format Requirements 📋

**From AVINODE-API-SETUP.md, we've documented:**
- **Date/Time**: ISO 8601 (`2025-11-20T14:00:00Z`)
- **Currency**: ISO 4217 (`USD`, `EUR`, `GBP`)
- **Country**: ISO 3166-1 alpha-2 (`US`, `GB`)
- **Province/State**: ISO 3166-2 (`US-FL`, `US-CA`)

#### Questions:

**9.1 Required Header Validation:**
```typescript
'X-Avinode-SentTimestamp': new Date().toISOString()
```
- Is the 5-minute timestamp validation window documented correctly?
- What happens if our server clock drifts?
- Do you recommend NTP synchronization?

**9.2 Currency Support:**
- Our brokers primarily work in USD
- Should we support multi-currency quotes?
- If a customer requests EUR pricing, do we:
  - Convert USD to EUR client-side?
  - Can Avinode API handle currency conversion?

---

## Implementation Path Based on Meeting Outcomes

### Expected Scenario: Broker Interactive API (Most Likely)

**If we're correctly classified as broker using Interactive API:**

**Implementation Plan:**
1. ✅ **Keep `search_flights` using `POST /searches`**
   - Confirms brokers can search programmatically
   - No deep link workflow needed

2. ✅ **Implement quote submission tools:**
   ```typescript
   // Add to MCP server:
   - submit_quote: POST /tripmsgs/{requestId}/submitQuote
   - send_message: POST /tripmsgs/{requestId}/sendMessage
   - decline_rfq: (endpoint TBD)
   - get_messages: GET /tripmsgs/{requestId}
   ```

3. ✅ **Implement `X-Avinode-ActAsAccount` pattern:**
   ```typescript
   // All broker-specific actions include:
   headers: {
     'X-Avinode-ActAsAccount': brokerName  // "John Smith"
   }
   ```

4. ✅ **Set up webhook receiver:**
   ```typescript
   // Single endpoint for all broker notifications
   POST /api/webhooks/avinode
   // Routes to correct broker based on RFQ/trip lookup
   ```

5. ✅ **Request throttling for single connection:**
   ```typescript
   // Token bucket implementation
   class AvinodeRateLimiter {
     private tokens = 1;
     private lastRefill = Date.now();

     async throttle() {
       // Ensure ~1 call/second compliance
     }
   }
   ```

**Timeline:**
- Week 1: Sandbox approval + credentials received
- Week 2: Implement quote submission + messaging tools
- Week 3: Webhook receiver + end-to-end testing
- Week 4: Production deployment

---

## QUESTIONS SUMMARY (Prioritized for Meeting)

### Must Ask (Top 5 - 10 minutes)

1. **Search API Classification for Internal Sales Tool**
   - As internal sales team (NOT end clients) searching on behalf of customers, can we use `POST /searches` programmatically?
   - "Inhouse purpose" + sales reps as users (not end clients) - does this qualify for programmatic search?
   - Or is "Interactive API" restricted to UI deep links only?

2. **X-Avinode-ActAsAccount Usage for Sales Rep Attribution**
   - Is this the correct mechanism for multi-sales-rep attribution (10-50 internal users, one API connection)?
   - What value format: sales rep name, email, username?
   - Will customers see this name when receiving quotes? (important for personalization)

3. **Quote Submission Endpoint**
   - Is `POST /tripmsgs/{requestId}/submitQuote` correct?
   - Full request schema needed

4. **Authentication Tokens**
   - Difference between `AVINODE_API_TOKEN` and `AVINODE_BEARER_TOKEN`?
   - Do they expire? Need refresh?

5. **Webhook Events for Internal Sales Team**
   - Which events for: receiving customer RFQs, customer messages, booking confirmations?
   - Single webhook URL routing for 10-50 sales reps - how to identify which rep?

### Should Ask If Time (Next 5 - 5 minutes)

6. **RFQ/Message Endpoints**
   - `GET /tripmsgs/{requestId}` - correct for retrieving customer messages?
   - `POST /tripmsgs/{requestId}/sendMessage` - correct for responses?
   - RFQ decline endpoint?

7. **Sandbox Testing**
   - Can we test `X-Avinode-ActAsAccount` with fake sales rep names?
   - How to simulate quote responses for testing?
   - Ngrok URLs for webhook testing?

8. **Rate Limiting**
   - Burst tolerance details (5 calls in 10 seconds OK?)
   - Different limits per endpoint type?

9. **Airport Search Endpoint**
   - Exact path and query parameters?

10. **Credential Provisioning**
    - How/when do we receive sandbox credentials after approval?

### Nice to Have (If Extra Time - 3 minutes)

11. Data format validation (5-minute timestamp window)
12. Rate limit header names
13. Multi-currency support
14. OpenAPI spec availability
15. Developer support channels

---

## Pre-Meeting Checklist

**Before the meeting, bring:**

- [ ] **Application Questionnaire** ([AVINODE_QUESTIONARY_ANSWERS_Shorter.md](../../docs/AVINODE_QUESTIONARY_ANSWERS_Shorter.md))
- [ ] **API Setup Guide** ([AVINODE-API-SETUP.md](../../docs/implementation/AVINODE-API-SETUP.md))
- [ ] **MCP Server Code** (for endpoint reference)
- [ ] **Sales team workflow diagram** (6-step process: sales rep → AI Agent → Avinode)
- [ ] **Architecture diagram** (single AI Agent → Avinode, serving 10-50 internal sales reps)
- [ ] **User clarification:** Sales reps are internal users, NOT end clients
- [ ] **Estimated API usage numbers** (5K → 30K calls/month)
- [ ] **List of assumed endpoint URLs** (for confirmation)
- [ ] **Recording permission** from all participants

---

## Post-Meeting Action Items

**Immediately after meeting:**

- [ ] Document all answers in this file
- [ ] Update implementation plan based on clarifications
- [ ] File GitHub issues for required code changes
- [ ] Update API client with correct endpoints
- [ ] Update MCP tool schemas if needed
- [ ] Schedule follow-up if critical questions remain unanswered
- [ ] Share meeting notes with team
- [ ] Update project timeline based on implementation changes

---

## Meeting Notes Section

**Date:**
**Attendees:**
**Duration:**

### Answers Received

_(Fill in during/after meeting)_

#### 1. Search API Restrictions
**Answer:**


**Action Items:**


---

#### 2. RFQ/RFP Workflow
**Answer:**


**Action Items:**


---

#### 3. OAuth & Authentication
**Answer:**


**Action Items:**


---

#### 4. Webhooks
**Answer:**


**Action Items:**


---

#### 5. Empty Legs
**Answer:**


**Action Items:**


---

#### 6. Sandbox
**Answer:**


**Action Items:**


---

### Additional Topics Discussed

_(Any topics not covered in prepared questions)_

---

### Follow-up Required

- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

---

## Related Documentation

- [Avinode Developer Portal](https://developer.avinodegroup.com/)
- [Avinode API - Search Integration](https://developer.avinodegroup.com/docs/search-in-avinode-from-your-system)
- [Avinode API - Webhooks](https://developer.avinodegroup.com/docs/avinode-webhooks)
- [Avinode API - OAuth](https://developer.avinodegroup.com/docs/oauth-management)
- [Avinode API - Terminology](https://developer.avinodegroup.com/docs/terminology)
- [Avinode API - Sandbox](https://developer.avinodegroup.com/docs/sandbox)
- [Our MCP Server Implementation](../../mcp-servers/avinode-mcp-server/)
- [Flight Search Agent Design](../subagents/agents/flight-search/)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-19
**Next Review:** After Avinode dev meeting
