# JetVision AI Assistant

*Automatically synced with your [v0.app](https://v0.app) deployments*

## Overview

JetVision is an AI-powered private aviation platform that streamlines how brokers search for aircraft, manage RFQs (Requests for Quote), and complete bookings. The system combines intelligent search capabilities, personalized customer experience management, and automated quote workflows to improve operational efficiency and service quality.

**Live Deployment**: [https://vercel.com/ab-2555s-projects/v0-jet-vision-agent](https://vercel.com/ab-2555s-projects/v0-jet-vision-agent)

**Build Platform**: [https://v0.app/chat/projects/Srm7B7Ppqgl](https://v0.app/chat/projects/Srm7B7Ppqgl)

---

## Table of Contents

1. [Chat Behavior & Conversation Flow](#chat-behavior--conversation-flow)
2. [Jetvision Group](#jetvision-group)
3. [RFQ via Avinode API](#rfq-via-avinode-api)
4. [Flight Proposal PDF Generation](#flight-proposal-pdf-generation)
5. [Customers & Client Profiles](#customers--client-profiles)
6. [Architecture](#architecture)
7. [Deployment](#deployment)

---

## Chat Behavior & Conversation Flow

### How Conversations Work

The JetVision Assistant uses a **three-layer conversation architecture**:

1. **`chat_sessions`** - Workflow tracking layer (tracks trip IDs, RFQ status, workflow steps)
2. **`conversations`** - Conversation container (metadata, status, counts)
3. **`messages`** - Message content (actual text thread)

### Starting a Conversation

When a user sends their first message:

1. **Conversation Created**: A record is added to the `conversations` table in Supabase
2. **Message Saved**: The user's message is saved to the `messages` table
3. **Session Tracked**: A `chat_sessions` record is created to track workflow state

**Important**: Conversations are created when the user sends their first message, **not** when a Trip ID arrives. The conversation can exist independently and be linked to a request later.

### General Conversation vs Flight Requests

The system supports **two types of interactions**:

- **General Conversation**: Users can chat about anything (greetings, questions, general inquiries)
- **Flight Request Creation**: When users mention trip/flights/destination with flight details (airports + passengers + date), the system automatically triggers flight request creation

### Flight Request Detection

The system automatically detects flight requests when messages contain:

- **Airport codes** (ICAO codes like KTEB, KLAX, or airport names)
- **Passenger counts** (e.g., "4 passengers", "6 pax")
- **Dates** (e.g., "Jan 20", "next Friday", "2025-01-15")
- **Flight keywords** (flight, charter, jet, fly, travel)

When all conditions are met, the system:
1. Calls the `create_trip` MCP tool via Avinode API
2. Creates a trip container and receives a deep link
3. Displays the deep link prominently so users can access the Avinode marketplace

### Conversation Persistence

All conversations and messages are persisted in Supabase:

- **Conversations**: Stored in `conversations` table (one per conversation thread)
- **Messages**: Stored in `messages` table (multiple per conversation, linked by `conversation_id`)
- **Sessions**: Stored in `chat_sessions` table (workflow tracking with trip IDs, RFQ status)

**Note**: Conversations are only created if the user has a corresponding record in the `iso_agents` table (linked by Clerk user ID).

---

## Jetvision Group

### Company Overview

**Jetvision** is a private jet charter broker that operates as an ISO (Independent Sales Organization) in the private aviation industry. The platform serves as an internal broker operations system to streamline aircraft search, RFQ management, and booking workflows.

### Architecture: AI Agent as Single API Access Point

Jetvision employs an innovative **MCP (Model Context Protocol) server/client architecture** where an AI Agent serves as the **sole access point** to all Avinode APIs:

```
[Multiple Jetvision Users] 
    ↓ (Chat Interface)
[Jetvision Frontend Application]
    ↓ (MCP Client Protocol)
[AI Agent MCP Server] ← **SINGLE AVINODE API CONNECTION**
    ↓ (REST API Calls)
[Avinode Group APIs]
```

**Key Benefits**:
- **Single API Connection**: One Avinode API connection managed exclusively by the AI Agent MCP server
- **Multi-User Access**: Jetvision manages multiple broker users (10-15 initially, growing to 30-50) through a chat-based frontend interface
- **Intelligent Request Routing**: AI Agent interprets natural language requests from users and translates them into appropriate Avinode API calls
- **Centralized Security**: All API credentials, rate limiting, and compliance controls managed at the MCP server level
- **Unified Audit Trail**: Complete logging of all API interactions through single integration point

### User Roles

The system supports multiple user roles:

- **ISO Agents**: Sales representatives who interact with customers and manage flight requests
- **Admins**: System administrators with full access
- **Clients**: End customers who request charter flights (managed through `client_profiles` table)

---

## RFQ via Avinode API

### Overview

The system integrates with **Avinode Group APIs** to manage RFQs (Requests for Quote) through a **deep link-based workflow** that enables human-in-the-loop decision making.

### Deep Link Workflow

Instead of automatically creating and sending RFQs, the system uses a **human-in-the-loop workflow**:

1. **User provides flight details** → AI Agent analyzes request
2. **System creates trip container** → Calls `create_trip` MCP tool
3. **Deep link generated** → Returns `trip_id` and `deep_link` URL
4. **Sales rep opens Avinode** → Clicks deep link to open Avinode Web UI
5. **Sales rep selects operators** → Manually reviews and selects preferred aircraft/operators
6. **Sales rep sends RFP** → Creates and sends RFP to selected operators in Avinode
7. **Webhook events received** → System receives quote events via webhooks
8. **Quotes displayed** → Real-time updates via SSE (Server-Sent Events)

### Avinode MCP Tools

The Avinode MCP server provides 8 tools:

| Tool | Purpose | Returns |
|------|---------|---------|
| `create_trip` | Create trip and get deep link | `trip_id`, `deep_link` |
| `get_rfq` | Get RFQ details with quotes | RFQ object with quotes, prices, operator info |
| `get_quote` | Get specific quote details | Quote object |
| `cancel_trip` | Cancel an active trip | Confirmation |
| `send_trip_message` | Send message to operators | Message ID |
| `get_trip_messages` | Get message history | Messages array |
| `search_airports` | Search airports by code/name | Airport list |
| `search_empty_legs` | Find empty leg flights | Empty legs list |

### Webhook Integration

The system receives real-time updates from Avinode via webhooks:

- **Webhook Endpoint**: `/api/webhooks/avinode`
- **Event Types**: 
  - `TripRequestSellerResponse` - Operator submitted a quote
  - `TripChatSeller` - Operator sent a message
  - `TripChatMine` - Confirmation of sent message
- **Real-time Updates**: Events are streamed to frontend via SSE endpoint `/api/avinode/events`

### Database Storage

RFQ and trip data is stored in the `requests` table:

```sql
-- Key fields for Avinode integration:
avinode_rfp_id TEXT      -- RFQ identifier
avinode_trip_id TEXT     -- Trip identifier (e.g., "atrip-64956150")
avinode_deep_link TEXT   -- Full URL to Avinode Web UI
```

---

## Flight Proposal PDF Generation

### Overview

The system generates professional PDF proposals from selected RFQ flights using React PDF. Proposals include flight details, pricing breakdown, and customer information.

### Proposal Generation Flow

1. **User selects flights** → Sales rep selects preferred flights from RFQ results
2. **Proposal data prepared** → System gathers customer info, trip details, and selected flights
3. **PDF generated** → React PDF renders proposal document
4. **Proposal sent** → PDF attached to email and sent to customer

### API Endpoints

#### Generate Proposal

**POST** `/api/proposal/generate`

Generates a PDF proposal from selected RFQ flights.

**Request Body**:
```typescript
{
  customer: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
  };
  tripDetails: {
    departureAirport: { icao: string; name?: string; city?: string };
    arrivalAirport: { icao: string; name?: string; city?: string };
    departureDate: string;
    departureTime?: string;
    passengers: number;
    tripId?: string;
  };
  selectedFlights: RFQFlight[];  // Array of selected flights from RFQ
  jetvisionFeePercentage?: number;  // Default: 10%
}
```

**Response**:
```typescript
{
  success: true;
  proposalId: string;
  fileName: string;
  pdfBase64: string;  // Base64-encoded PDF for preview/download
  generatedAt: string;
  pricing: {
    subtotal: number;
    jetvisionFee: number;
    taxes: number;
    total: number;
    currency: string;
  };
}
```

#### Send Proposal

**POST** `/api/proposal/send`

Sends the generated proposal PDF via email to the customer.

**Request Body**:
```typescript
{
  proposalId: string;
  customerEmail: string;
  customerName: string;
  pdfBase64: string;
  fileName: string;
  subject?: string;  // Optional custom email subject
}
```

### Proposal Content

The PDF proposal includes:

- **Header**: JetVision branding and proposal ID
- **Customer Information**: Name, email, company
- **Trip Details**: Departure/arrival airports, dates, passenger count
- **Selected Flights**: Aircraft type, operator, pricing, amenities
- **Pricing Breakdown**: 
  - Subtotal (operator quotes)
  - JetVision fee (configurable percentage, default 10%)
  - Taxes
  - Total price
- **Quote Validity**: Expiration date based on quote deadlines
- **Terms & Conditions**: Standard charter terms

### Implementation

- **PDF Generation**: `lib/pdf/proposal-generator.ts`
- **PDF Template**: `lib/pdf/proposal-template.tsx` (React PDF)
- **Email Service**: `lib/services/email-service.ts` (Gmail MCP integration)

---

## Customers & Client Profiles

### Overview

Customer information is managed through the `client_profiles` table in Supabase. This enables personalized service, preference tracking, and relationship management.

### Database Schema

**Table**: `client_profiles`

```sql
CREATE TABLE client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_agent_id UUID NOT NULL REFERENCES iso_agents(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,  -- Flexible preferences storage
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Features

- **Agent Association**: Each client profile is linked to an ISO agent (`iso_agent_id`)
- **Flexible Preferences**: JSONB field stores customer preferences (aircraft types, amenities, budget ranges, travel patterns)
- **Contact Information**: Company name, contact name, email, phone
- **Notes**: Free-form notes field for agent observations
- **Active Status**: Soft delete via `is_active` flag

### Customer Preferences

The `preferences` JSONB field can store:

```json
{
  "preferred_aircraft_types": ["Citation X", "Gulfstream G550"],
  "amenities": ["WiFi", "Catering", "Pet-friendly"],
  "budget_range": {
    "min": 50000,
    "max": 200000,
    "currency": "USD"
  },
  "travel_patterns": {
    "frequent_routes": ["KTEB-KMIA", "KLAX-KJFK"],
    "preferred_departure_times": ["morning", "afternoon"]
  },
  "special_requirements": ["Wheelchair accessible", "Medical equipment"]
}
```

### Integration with Flight Requests

Customer profiles are linked to flight requests:

```sql
-- In requests table:
client_profile_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL
```

When creating a flight request, agents can:
1. Select an existing client profile
2. Create a new client profile
3. Process request without linking to a profile (guest booking)

### Customer Data Usage

The system uses customer profiles to:

- **Personalize Proposals**: Include customer name, company, and preferences
- **Track History**: Link all flight requests to customer profiles
- **Apply Preferences**: Automatically suggest preferred aircraft types and amenities
- **Build Relationships**: Maintain notes and preferences for repeat customers

---

## Architecture

### Multi-Agent System

JetVision uses a **6-agent multi-agent system** that coordinates through an internal Agent-to-Agent (A2A) communication layer:

1. **OrchestratorAgent** - Analyzes RFP, delegates tasks, manages workflow
2. **ClientDataAgent** - Fetches client profile and preferences
3. **FlightSearchAgent** - Searches flights via Avinode, creates trips
4. **ProposalAnalysisAgent** - Scores and ranks quotes
5. **CommunicationAgent** - Generates emails, creates PDFs, sends proposals
6. **ErrorMonitorAgent** - Monitors errors, implements retries

### Technology Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk
- **AI/ML**: OpenAI GPT-4, OpenAI Agent SDK
- **MCP**: Model Context Protocol for external service integration
- **Task Queue**: BullMQ + Redis
- **PDF Generation**: React PDF (@react-pdf/renderer)
- **Email**: Gmail MCP integration

### Key Integrations

- **Avinode API**: Flight search, trip management, RFQ handling
- **Gmail MCP**: Email automation for proposals
- **Google Sheets MCP**: Customer data and reporting
- **Supabase**: Database, authentication, real-time subscriptions

---

## Deployment

### Automatic Sync

This repository automatically syncs with your [v0.app](https://v0.app) deployments. Any changes made to your deployed app are automatically pushed to this repository.

### Deployment Process

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

### Environment Variables

Required environment variables (see `.env.local.example`):

```env
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ORGANIZATION_ID=org-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Clerk (Authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Avinode API
AVINODE_API_KEY=your-avinode-api-key
AVINODE_API_URL=https://api.avinode.com

# Redis (for task queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Local Development

```bash
# Install dependencies
pnpm install

# Start development server (app + MCP servers)
pnpm dev

# Start app only
pnpm dev:app

# Start MCP servers only
pnpm dev:mcp

# Run tests
pnpm test

# Type checking
pnpm type-check

# Linting
pnpm lint
```

---

## Documentation

For detailed documentation, see:

- **Architecture**: `docs/architecture/MULTI_AGENT_SYSTEM.md`
- **Avinode Integration**: `docs/api/AVINODE_API_INTEGRATION.md`
- **Deep Link Workflow**: `docs/subagents/agents/flight-search/DEEP_LINK_WORKFLOW.md`
- **UX Requirements**: `docs/ux/UX_REQUIREMENTS_AVINODE_WORKFLOW.md`
- **Getting Started**: `docs/GETTING_STARTED.md`

---

**Built with**: Next.js 14, OpenAI Agent SDK, TypeScript, Supabase, Avinode API, React PDF
