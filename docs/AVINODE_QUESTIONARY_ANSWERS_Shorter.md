# Avinode API Application Questionnaire - JetVision

**COMPANY INFORMATION**
- Company name: JetVision
- Company type: ☑ Broker
- Commercial contact: [Ofra to fill in name and email]
- Technical contact: [Ofra to fill in name and email]

---

**SOLUTION OVERVIEW**

*Your solution description:*

JetVision is developing an internal broker operations platform to streamline aircraft search, RFQ management, and booking workflows. Our solution uses an AI Agent that serves as a single connection point to Avinode APIs, allowing multiple JetVision brokers to access Avinode functionality through a simple chat interface.

This architecture means we only need one Avinode API connection. Our broker team (10-15 users initially, growing to 30-50) will interact with the system by typing requests in natural language (e.g., "Search for Citation X from Teterboro to Miami tomorrow"), and the AI Agent translates these into the appropriate Avinode API calls.

Key benefits:
- Faster aircraft search and quote turnaround for customers
- Reduced manual data entry for brokers
- Centralized access control and security
- Complete audit trail of all activities

*Links to solution examples:*
Prototype demo: https://v0-jet-vision-agent.vercel.app (using dummy data)

---

**WORKFLOW OVERVIEW**

*Your workflow description:*

**Step 1: Aircraft Search**
- Broker receives customer inquiry (phone/email)
- Broker types search request into JetVision chat interface: "Find Gulfstream G550 NYC to LAX, March 15, 6 passengers"
- AI Agent calls Avinode POST /searches API
- Results displayed to broker in conversational format
- Broker reviews options with customer

**Step 2: RFQ Creation**
- Customer selects preferred aircraft
- Broker instructs AI Agent: "Create RFQ for tail N123AB, customer John Smith, john@example.com"
- AI Agent submits RFQ through Avinode API
- RFQ confirmation provided to broker

**Step 3: Quote Management**
- AI Agent monitors Avinode webhooks for RFQ updates
- When quotes received, AI Agent alerts broker via chat
- Broker reviews quotes: "Show me quotes for RFQ-12345"
- AI Agent retrieves quote details via Avinode GET /quotes API
- Broker prepares response

**Step 4: Quote Submission**
- Broker instructs: "Submit quote for RFQ-12345: $32,000, includes catering"
- AI Agent formats and submits quote via Avinode POST /tripmsgs/{requestId}/submitQuote API
- Uses X-Avinode-ActAsAccount header with broker's name for personalization

**Step 5: Customer Communications**
- AI Agent monitors for customer messages via Avinode webhooks
- Retrieves messages via Avinode GET /tripmsgs API
- Presents to broker in chat
- Broker sends responses through AI Agent, which calls Avinode message API

**Step 6: Booking Confirmation**
- When customer accepts quote, AI Agent receives Avinode webhook notification
- Alerts broker team: "Booking confirmed for RFQ-12345"
- Broker proceeds with post-booking operations

**Third-Party Interactions:**
- CRM system (Salesforce) receives booking data after confirmation (does not access Avinode directly)
- Email platform sends customer confirmations (does not access Avinode directly)

**Architecture Note:** Only the AI Agent has Avinode API credentials. All broker users access Avinode functionality through the chat interface. This provides centralized security, rate limiting compliance, and complete audit logging.

---

**USAGE OF AVINODE GROUP APIs**

*Your API usage description:*

**Architecture:** Single AI Agent with one Avinode API connection serving 10-50 broker users via chat interface.

**READ Operations:**
- POST /searches - Aircraft availability searches based on trip requirements
- GET /airports - Airport lookup for search functionality  
- GET /rfqs/{id} - Retrieve RFQ details and status
- GET /quotes/{id} - Retrieve quote details for review
- GET /tripmsgs/{id} - Retrieve customer messages

**WRITE Operations:**
- POST /tripmsgs/{requestId}/submitQuote - Submit quotes to customers with pricing, flight details, and terms
- POST /tripmsgs/{requestId}/sendMessage - Send messages to customers
- RFQ decline functionality when unable to fulfill requests

**Webhooks:** 
- Trip Request notifications (new RFQs and updates)
- Buyer Chat Messages (customer communications)
- Booking confirmations

**Data We Will NOT Modify:**
- Aircraft availability schedules
- Operator profiles or settings
- Avinode system configuration

**Compliance:**
- Webhook-driven architecture (not polling)
- Rate limiting managed centrally (~1 call/second)
- All API tokens secured at AI Agent server level
- Complete audit logging with user attribution

---

**MARKET & ESTIMATED USAGE**

*Your geographical presence and intended market:*

United States, primarily East Coast. We are a boutique private aviation broker serving corporate and high-net-worth clients. Initial focus on US domestic charter market with potential expansion to transatlantic routes as business grows.

*Your intended application purpose:*
☑ Inhouse purpose

*Your estimated application calls:*

- Initial phase (months 1-3): ~5,000 calls/month
- Growth phase (months 4-12): ~15,000 calls/month  
- Steady state: ~30,000 calls/month

Call distribution: 75% search/RFQ operations, 15% reporting, 10% communications

---

Ready for Ofra to add contact details and submit. Let me know if you need any adjustments.

Best,
[Your name]