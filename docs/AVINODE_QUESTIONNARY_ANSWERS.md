# Avinode API Application Questionnaire - JetVision

---

## **Company Information**

**Company name:** JetVision

**Company type:** ☑ Broker

**Commercial contact:**
- Contact name: [Your name]
- Email: [Your email]

**Technical contact:**
- Contact name: [Your technical lead name]
- Email: [Your technical lead email]

---

## **Solution Overview**

**Your solution description:**

JetVision is an AI-powered private aviation platform that streamlines how brokers search for aircraft, manage RFQs (Requests for Quote), and complete bookings. Our solution combines intelligent search capabilities, personalized customer experience management, and automated quote workflows to improve operational efficiency and service quality.

**Unique Architecture - AI Agent as Single API Access Point:**

JetVision employs an innovative MCP (Model Context Protocol) server/client architecture where an AI Agent serves as the **sole access point** to all Avinode APIs. This centralized approach provides:

- **Single API Connection**: One Avinode API connection managed exclusively by the AI Agent MCP server
- **Multi-User Access**: JetVision manages multiple broker users through a chat-based frontend interface
- **Intelligent Request Routing**: AI Agent interprets natural language requests from users and translates them into appropriate Avinode API calls
- **Centralized Security**: All API credentials, rate limiting, and compliance controls managed at the MCP server level
- **Unified Audit Trail**: Complete logging of all API interactions through single integration point

**Platform Architecture:**
```
[Multiple JetVision Users] 
    ↓ (Chat Interface)
[JetVision Frontend Application]
    ↓ (MCP Client Protocol)
[AI Agent MCP Server] ← **SINGLE AVINODE API CONNECTION**
    ↓ (REST API Calls)
[Avinode Group APIs]
```

**Key Features:**
- **AI Agent Interface**: Conversational AI for natural language aircraft search and RFQ management
- **Customer Preference Engine**: Remembers individual client preferences (aircraft types, amenities, budget ranges, travel patterns)
- **Intelligent Flight Search**: AI Agent processes search requests and queries Avinode inventory in real-time
- **Automated Quote Management**: AI-assisted RFQ responses with pricing and proposal generation
- **Booking Workflow**: Streamlined booking process from search through confirmation

JetVision serves as the operational hub for our broker team, enabling efficient aircraft search, quote management, and booking operations through an intuitive chat interface.

**Links to solution examples:**
- Prototype: https://v0-jet-vision-agent.vercel.app
- (Note: Currently using dummy data for demonstration purposes)

---

## **Workflow Overview**

**Your workflow description:**

### **Step-by-Step User Workflow:**

**IMPORTANT ARCHITECTURAL NOTE:** 
All Avinode API interactions flow through a **single AI Agent MCP server**. Multiple JetVision users (brokers, sales team, customer service) access Avinode functionality through a unified chat interface, but only the AI Agent MCP server holds the Avinode API credentials and makes direct API calls.

---

**1. Customer Inquiry & Aircraft Search**
- Customer contacts JetVision broker with trip requirements
- Broker receives inquiry (phone, email, or in-person)
- **JetVision Broker Chat Interaction:** Broker asks AI Agent: "Search for Citation X from Teterboro to Miami, departing March 15th at 2 PM, 6 passengers"

**AI Agent MCP Server Processing:**
- Parses natural language request into structured parameters
- **Avinode API Call:** `POST /searches` with origin, destination, dates, passenger count, aircraft preferences
- Receives aircraft availability results from Avinode Marketplace
- Formats response for broker in conversational format

**Avinode Integration Point:** AI Agent MCP server calls `POST /searches` to query available aircraft

**AI Agent Response to Broker:** "Found 5 available Citation X aircraft: [Option 1]: Tail N123AB, $28,500, available at KTEB... [Option 2]: Tail N456CD, $30,200, positioning from KPBI..."

---

**2. Aircraft Review & Customer Presentation**
- Broker reviews search results via chat interface
- AI Agent presents aircraft with:
  - Aircraft specifications and details
  - Estimated flight times and routing
  - Preliminary pricing
  - Operator information
  - Aircraft amenities
- **JetVision Broker Chat Interaction:** "Show me full details for option 1"

**AI Agent MCP Server Processing:**
- Retrieves additional aircraft details if needed
- Formats comprehensive aircraft information
- Presents pricing breakdown

**Broker Action:** Broker discusses options with customer, customer selects preferred aircraft

---

**3. RFQ Creation & Submission**
- Broker needs to submit formal RFQ for selected aircraft
- **JetVision Broker Chat Interaction:** "Create RFQ for tail N123AB, KTEB to KMIA, March 15 at 14:00, 6 passengers, customer is John Smith, john@example.com"

**AI Agent MCP Server Processing:**
- Structures RFQ parameters
- Validates required information
- **Avinode API Call:** Creates RFQ in Avinode Marketplace system
- Confirms RFQ submission

**Avinode Integration Point:** AI Agent MCP server submits RFQ to initiate quote request process

---

**4. RFQ Monitoring & Notifications**
- **AI Agent MCP Server Processing:**
- Monitors webhook notifications for RFQ updates
- **Avinode API Call:** Receives `Trip Request` webhook when operators respond
- **Avinode API Call:** `GET /rfqs/{id}` to fetch updated RFQ status

**AI Agent Alert to Broker:** "Update on RFQ-12345: 3 new quotes received from operators"

**JetVision Broker Chat Interaction:** "Show me quotes for RFQ-12345"

**AI Agent MCP Server Processing:**
- **Avinode API Call:** `GET /quotes/{id}` for each quote
- Formats and presents quote comparison
- Returns: "Quote 1: Operator ABC, $28,500, includes catering... Quote 2: Operator XYZ, $29,000, newer aircraft..."

**Avinode Integration Point:** AI Agent MCP server retrieves quote details via API

---

**5. Quote Preparation & Counter-Offer**
- Broker reviews operator quotes and determines pricing strategy
- **JetVision Broker Chat Interaction:** "Submit our quote for RFQ-12345: $32,000 total, includes ground transport and catering, using our standard terms"

**AI Agent MCP Server Processing:**
- Validates quote parameters
- Structures quote payload with:
  - Pricing and line items
  - Aircraft details and positioning information
  - Flight segments (passenger and ferry/positioning legs)
  - Terms and conditions
- **Avinode API Call:** `POST /tripmsgs/{requestId}/submitQuote`
- Uses `X-Avinode-ActAsAccount` header with broker's username for personalization
- Confirms submission

**Avinode Integration Point:** AI Agent MCP server submits quote on behalf of broker

**AI Agent Confirmation:** "Quote submitted successfully to customer John Smith. Quote ID: Q-789"

---

**6. Customer Communication & Quote Revision**
- Customer may have questions or request changes
- **AI Agent MCP Server Processing:**
- Monitors `Buyer Chat` webhook notifications
- **Avinode API Call:** `GET /tripmsgs/{id}` to retrieve customer messages

**AI Agent Alert to Broker:** "Message from customer on RFQ-12345: 'Can we adjust departure time to 4 PM?'"

**JetVision Broker Chat Interaction:** "Reply: 'Yes, we can accommodate 4 PM departure. Price remains the same.'"

**AI Agent MCP Server Processing:**
- **Avinode API Call:** `POST /tripmsgs/{requestId}/sendMessage`
- Sends message to customer via Avinode

**Alternatively, if quote revision needed:**
- **JetVision Broker Chat Interaction:** "Update quote for RFQ-12345: change departure time to 16:00, price now $32,500"

**AI Agent MCP Server Processing:**
- **Avinode API Call:** `POST /tripmsgs/{requestId}/submitQuote` (updated quote)

**Avinode Integration Point:** AI Agent MCP server handles all message exchange and quote updates

---

**7. Booking Confirmation**
- Customer accepts quote through Avinode Marketplace
- **AI Agent MCP Server Processing:**
- Receives booking acceptance webhook notification
- **Avinode API Call:** `GET /rfqs/{id}` to retrieve final booking details

**AI Agent Alert to Broker:** "✓ BOOKING CONFIRMED - RFQ-12345: Customer John Smith accepted quote Q-789. Flight KTEB→KMIA, March 15, 16:00, Citation X N123AB, $32,500"

**Broker Action:** Proceeds with post-booking operations (confirmations, flight coordination, payment)

**Avinode Integration Point:** AI Agent MCP server receives webhook notification and retrieves booking details

---

**8. Post-Booking Follow-up**
- **JetVision Broker Chat Interaction:** "Show me booking details for RFQ-12345"

**AI Agent MCP Server Processing:**
- **Avinode API Call:** `GET /rfqs/{id}` with relevant sparse fields
- Retrieves complete booking information including itinerary, customer details, pricing
- Formats for broker review

---

**9. Historical Analysis & Reporting**
- **JetVision Manager Chat Interaction:** "Show me all bookings from last month"

**AI Agent MCP Server Processing:**
- Queries historical RFQ data
- **Avinode API Call:** `GET /rfqs/{id}` for relevant date range
- Analyzes booking patterns and metrics
- Generates report in conversational format

**Avinode Integration Point:** AI Agent MCP server performs analytical queries for business intelligence

---

### **Multi-User Access Management:**

**Chat-Based Interface for All Users:**
- **Broker Team**: "Search for available Gulfstream G550 NYC to LAX tomorrow"
- **Sales Manager**: "Show me all pending RFQs this week"
- **Customer Service**: "What's the status of booking for customer John Smith?"

**All requests flow through the same AI Agent MCP server, which:**
1. Authenticates user via JetVision internal auth
2. Determines appropriate Avinode API call(s)
3. Executes API calls using single API connection
4. Returns formatted results via chat interface
5. Logs all interactions for audit trail

**Security & Access Control:**
- User permissions managed within JetVision platform
- AI Agent enforces role-based access (e.g., junior brokers can't see all pricing)
- Single Avinode API token secured at MCP server level
- No user has direct access to Avinode credentials

---

### **Third-Party Application Interactions:**

**CRM System (Salesforce/HubSpot):**
- Stage: After booking confirmation - Customer booking information synchronized
- **Note:** CRM receives processed data from JetVision, never directly accesses Avinode APIs

**Communication Platform (Email/SMS):**
- Stage: Post-booking - Confirmations and itinerary delivery
- **Note:** Uses JetVision-formatted data, no direct Avinode access

**Accounting/Payment Platform:**
- Stage: Post-booking - Invoice generation and payment processing
- **Note:** Receives booking financial data from JetVision

**CRITICAL ARCHITECTURAL PRINCIPLE:** 
Only the AI Agent MCP server has Avinode API credentials. No third-party system, no JetVision user, and no frontend application directly accesses Avinode APIs. This ensures:
- Single point of rate limiting compliance
- Unified security and credential management
- Complete audit trail of all API usage
- Simplified integration maintenance

---

## **Usage of Avinode Group APIs**

**Your API usage description:**

### **MCP Server Architecture - Single API Integration Point**

**IMPORTANT:** JetVision implements a Model Context Protocol (MCP) server/client architecture where:

- **One Avinode API Connection**: The AI Agent MCP server holds the single API connection to Avinode
- **Multiple Human Users**: JetVision manages 10-50+ broker and staff users internally
- **Chat Interface Frontend**: All users interact via conversational interface
- **AI Agent as Proxy**: The AI Agent interprets requests and executes appropriate Avinode API calls
- **No Direct User Access**: Individual users never access Avinode APIs directly

**Benefits of This Architecture:**
1. **Security**: API credentials secured at single MCP server, not distributed to clients
2. **Rate Limiting**: Centralized control ensures compliance with Avinode rate limits
3. **Auditability**: Complete logging of all API calls with user attribution
4. **Scalability**: Add unlimited users without additional API connections
5. **Maintenance**: Single integration point simplifies updates and debugging
6. **Intelligence**: AI Agent can optimize API usage, cache results, and batch requests

---

### **Primary Use Case: Aircraft Search, RFQ Management & Booking**

**READ OPERATIONS (Executed by AI Agent MCP Server):**

1. **Aircraft Search & Availability**
   - `POST /searches` - AI Agent processes natural language search requests from brokers
   - `GET /airports` - Airport lookup for autocomplete functionality
   - Returns: Aircraft options, preliminary pricing, flight times, formatted conversationally
   - **Example User Request:** "Find me a heavy jet from NYC to Dubai next Tuesday"
   - **AI Agent Action:** Parses request → Calls API → Returns: "Found 5 aircraft: Gulfstream G650 ($120K), Bombardier Global 7500..."

2. **RFQ Data Retrieval**
   - `GET /rfqs/{id}` - AI Agent fetches RFQ details when broker requests status updates
   - `GET /quotes/{id}` - Retrieves quote details for comparison and review
   - `GET /tripmsgs/{id}` - Accesses messages when broker needs customer communications
   - Sparse fields utilized: `buyermessages`, `quotebreakdown`, `sellercontactinfo`, `taildetails`, `timestamps`
   - **Example User Request:** "Show me all details for RFQ-12345"
   - **AI Agent Action:** Fetches data → Formats → Returns comprehensive RFQ summary

3. **Booking Status & History**
   - Retrieve confirmed booking details
   - Access historical RFQ data for reporting
   - **Example User Request:** "Show me all confirmed bookings this month"
   - **AI Agent Action:** Queries historical data → Returns formatted booking list

**WRITE OPERATIONS (Executed by AI Agent MCP Server):**

1. **RFQ Creation**
   - Create formal RFQs in Avinode Marketplace system
   - **Example User Request:** "Create RFQ for Citation X, Teterboro to Miami, March 15, 6 passengers"
   - **AI Agent Action:** Structures RFQ → Submits to Avinode → Confirms creation

2. **Quote Submission**
   - `POST /tripmsgs/{requestId}/submitQuote` - AI Agent submits quotes based on broker instructions
   - Quote includes:
     - Complete pricing breakdown with line items
     - Flight segments (passenger and positioning/ferry flights)
     - Aircraft specifications and details
     - Terms and conditions (PDF attachments)
     - Custom broker messaging
   - **Example User Request:** "Submit quote for RFQ-123: Citation X, $35K total, includes catering"
   - **AI Agent Action:** 
     - Validates pricing structure
     - Formats complete quote payload
     - Uses `X-Avinode-ActAsAccount` with broker's username
     - Submits via API
     - Confirms: "Quote submitted successfully"

3. **Quote Updates & Revisions**
   - Update existing quotes with pricing or schedule changes
   - **Example User Request:** "Update RFQ-123 quote: change departure time to 16:00, price $35,500"
   - **AI Agent Action:** Formats updated quote → Submits revision → Confirms

4. **Communication Management**
   - `POST /tripmsgs/{requestId}/sendMessage` - AI Agent sends messages per broker direction
   - **Example User Request:** "Reply to customer: 'Yes, we can accommodate the earlier departure time'"
   - **AI Agent Action:** Formats message → Sends via API → Confirms delivery

5. **RFQ Status Management**
   - Decline RFQs with appropriate reason codes when unable to fulfill
   - **Example User Request:** "Decline RFQ-456, reason: no aircraft availability"
   - **AI Agent Action:** Submits decline with reason code → Confirms

**WEBHOOK SUBSCRIPTIONS (Monitored by AI Agent MCP Server):**
- **Trip Request** - AI Agent monitors new RFQs and updates, notifies relevant brokers via chat
- **Buyer Chat Messages** - AI Agent fetches customer messages, presents to brokers conversationally
- **Quote Responses** - AI Agent tracks when operators submit quotes
- **Booking Confirmations** - AI Agent alerts team when customer accepts quote
- **Trip Request Updates** - AI Agent tracks changes/cancellations, alerts team

**API CALL FLOW EXAMPLE:**
```
[Broker types in chat]: "Search for Global 6000 LAX to Cabo tomorrow"
         ↓
[JetVision Frontend] → [MCP Client Protocol] 
         ↓
[AI Agent MCP Server]:
  - Authenticates broker
  - Parses: origin=LAX, dest=Cabo, aircraft=Global 6000, date=tomorrow
  - Calls: POST /searches with parameters
  - Receives: 3 available aircraft
  - Formats response conversationally
         ↓
[Returns to broker]: "Found 3 Global 6000 aircraft: Aircraft #1: $28K, departs 10 AM..."
```

**DATA WE WILL NOT MODIFY:**
- Aircraft availability schedules (managed by operators in Avinode)
- Operator company profiles or settings
- User account information in Avinode system
- System configuration data
- No bulk data scraping or automated data harvesting

**RATE LIMITING & COMPLIANCE:**
- Single MCP server manages all rate limiting
- Implements exponential backoff (~1 call/second steady state)
- AI Agent can intelligently batch requests and cache results
- Webhook-driven architecture minimizes unnecessary polling
- All calls logged with originating user for audit trail

**SECURITY MODEL:**
- API Token: Hard-coded in MCP server, never exposed to clients
- Bearer Token: Secured at MCP server level
- User Authentication: Managed by JetVision (separate from Avinode)
- Role-Based Access: AI Agent enforces JetVision user permissions
- Audit Logging: Complete trail of which user triggered which API call

---

## **Market & Estimated Usage**

**Your geographical presence and intended market:**

**Current Presence:**
- United States (Primary market - East Coast focus)
- Operating as a private aviation broker serving high-net-worth clientele

**Intended Market Expansion:**
- Phase 1: US domestic charter market
- Phase 2: Transatlantic routes (US-Europe)
- Phase 3: Global expansion following customer demand patterns

**Target Customer Segments:**
- C-suite executives and entrepreneurs
- Family offices and high-net-worth individuals
- Private equity and venture capital firms
- Corporate travel departments

**Your intended application purpose:**
☑ **Inhouse purpose** - JetVision is our proprietary broker platform for internal sales and operations team use

**User Scale:**
- Initial: 10-15 broker/sales users accessing via chat interface
- Growth: 30-50 users (brokers, managers, customer service, operations)
- All users share single Avinode API connection via AI Agent MCP server

**Your estimated application calls:**

**Initial Phase (Months 1-3):** ~5,000 calls/month
- 3,000 aircraft search queries (`POST /searches`) from ~10 active brokers
- 1,500 RFQ/quote retrievals (`GET /rfqs`, `GET /quotes`)
- 500 quote submissions, communications, and RFQ updates
- **Note:** Efficient MCP server caching reduces redundant API calls

**Growth Phase (Months 4-12):** ~15,000 calls/month
- 9,000 aircraft search queries from ~25 active brokers
- 4,500 RFQ/quote retrievals and status checks
- 1,500 quote submissions, revisions, and communications
- AI Agent optimizes batch requests for reporting queries

**Steady State (Year 2+):** ~30,000-50,000 calls/month
- Scales with booking volume and team growth
- 40-50 concurrent broker and operations users
- Intelligent caching and request optimization by AI Agent
- Webhook-driven architecture minimizes unnecessary API polling

**API Call Distribution via MCP Server:**
- **Real-time operations** (75%): Search, RFQ retrieval, quote submission, booking confirmation
- **Reporting/analytics** (15%): Historical data analysis, performance metrics
- **Administrative/communications** (10%): Message retrieval, status checks

**Usage Pattern:**
- Peak activity: Monday-Friday, 8 AM - 8 PM EST
- Weekend activity: ~20% of weekday volume (emergency charters, last-minute bookings)
- Real-time responsiveness required for customer-facing search and quote operations
- AI Agent performs batch analytics during off-peak hours

**Rate Limiting Compliance:**
- MCP server enforces ~1 call/second steady state
- Burst capacity managed centrally
- Request queuing prevents rate limit violations
- Multiple user requests intelligently batched when possible

---

## **Additional Notes**

**MCP Architecture Technical Details:**

**MCP Server Components:**
- **API Gateway**: Single connection to Avinode APIs
- **Request Parser**: Natural language → API parameters
- **Response Formatter**: API JSON → Conversational responses
- **Cache Layer**: Redis for frequently accessed data (airport info, aircraft specs)
- **Webhook Listener**: Real-time notification processing
- **Audit Logger**: Complete API call tracking with user attribution

**Technology Stack:**
- **MCP Server**: Node.js/Python for API integration layer
- **MCP Client Protocol**: WebSocket-based for real-time communication
- **Frontend**: React-based chat interface (web & mobile)
- **AI Agent**: Claude (Anthropic) with custom tooling
- **Infrastructure**: AWS with auto-scaling
- **Database**: PostgreSQL for customer and booking data, Redis for caching
- **Message Queue**: RabbitMQ for webhook processing

**Security & Compliance:**
- SOC 2 Type II compliance planned
- GDPR and CCPA compliant data handling
- End-to-end encryption for customer PII
- API credentials never leave MCP server
- Regular security audits and penetration testing
- Zero-trust architecture between clients and MCP server

**Advantages of MCP Architecture for Avinode:**
1. **Single API Connection Management**: Simplifies Avinode's account management
2. **Built-in Rate Limit Protection**: MCP server prevents violations
3. **Enhanced Security**: Credentials centralized, not distributed
4. **Scalability**: Add users without additional API connections
5. **Auditability**: Complete trail of API usage with user context
6. **Intelligent Optimization**: AI Agent can cache, batch, and optimize requests

**Implementation Compliance:**
- Only approved use cases implemented (Aircraft Search, RFQ Management, Booking)
- Proper webhook configuration for real-time updates
- All calls include `X-Avinode-Product` header with application name/version
- Sandbox environment only for development/testing
- No automatic testing against live or sandbox APIs
- Sensible retry policies with exponential backoff
- Handle new API response properties without breaking

**Timeline:**
- Sandbox access needed: Immediately
- MCP server development: 3-4 months
- Beta testing with 5 pilot brokers: 1-2 months
- Production launch: 6 months from sandbox access
- User onboarding: Gradual (5 users/month)

**Success Metrics:**
- Aircraft search response time: < 3 seconds
- Quote submission time: < 2 minutes
- Quote acceptance rate improvement: 25%+
- Customer satisfaction score: > 9.0/10
- Broker efficiency: 50% reduction in manual data entry
- API rate limit compliance: 100%
- System uptime: 99.9%

---

**We are excited to partner with Avinode Group to streamline our aircraft search, RFQ management, and booking operations through our innovative AI Agent MCP architecture. This design ensures secure, scalable, and compliant access to Avinode APIs while providing our broker team with an intuitive chat-based interface for all booking workflows. We look forward to collaborating on this integration!**