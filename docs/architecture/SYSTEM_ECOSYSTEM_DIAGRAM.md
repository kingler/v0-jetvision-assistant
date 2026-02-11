# System Ecosystem Diagram

High-level view of the Jetvision multi-agent system: all services, data stores, external integrations, and communication paths.

## Full System Ecosystem

```mermaid
flowchart TB
    subgraph Users["👤 Users"]
        ISO[ISO Agent<br/>Browser]
        Customer[Customer<br/>Email Client]
        Operator[Avinode Operator]
    end

    subgraph Frontend["Next.js 14 Frontend"]
        UI[Chat Interface<br/>chat-interface.tsx]
        Cards[UI Cards<br/>TripSummary, RFQFlights,<br/>EmailPreview, ContractSent,<br/>PaymentConfirmed, ClosedWon]
        Sidebar[Sidebar<br/>Trip Details, Quotes,<br/>Contract Status]
        SSEClient[SSE Client<br/>Real-time Updates]
        OnboardingForm[Onboarding Form<br/>app/onboarding/page.tsx<br/>3-step: Personal Info,<br/>Commission Terms, Review]
        ContractReview[Contract Review Page<br/>app/onboarding/contract-review/token<br/>PDF viewer + Digital Signature]
    end

    subgraph APILayer["Next.js API Routes"]
        ChatAPI["/api/chat<br/>Main Chat Endpoint"]
        ContractSendAPI["/api/contract/send<br/>Generate & Send Contract"]
        PaymentAPI["/api/contract/{id}/payment<br/>Record Payment"]
        ProposalAPI["/api/proposal/approve-email<br/>Send Approved Email"]
        WebhookAPI["/api/webhooks/avinode<br/>Webhook Handler"]
        ClerkWebhook["/api/webhooks/clerk<br/>user.created → iso_agents"]
        InboxAPI["/api/inbox/check-replies<br/>Check Customer Replies"]
        SSEEndpoint["/api/avinode/events<br/>SSE Event Stream"]
        OnboardingRegister["/api/onboarding/register<br/>Submit Personal Info"]
        OnboardingGenContract["/api/onboarding/generate-contract<br/>Generate Commission PDF"]
        OnboardingSendContract["/api/onboarding/send-contract<br/>Email Contract + Token"]
        OnboardingValidateToken["/api/onboarding/validate-token/token<br/>Verify Token"]
        OnboardingSign["/api/onboarding/sign-contract<br/>Capture Digital Signature"]
    end

    subgraph AgentLayer["JetvisionAgent (Single Agent)"]
        Agent[JetvisionAgent<br/>OpenAI Function Calling<br/>GPT-4 Turbo]
        IntentDetect[Intent Detection<br/>detectIntentWithHistory]
        SystemPrompt[System Prompt Builder<br/>16 Scenarios + Working Memory]
        ToolExec[Tool Executor<br/>Routes to MCP Servers]
    end

    subgraph MCPLayer["MCP Servers (stdio transport)"]
        AvinodeMCP[Avinode MCP Server<br/>8 tools: create_trip, get_rfq,<br/>get_quote, cancel_trip,<br/>send_trip_message, get_trip_messages,<br/>search_airports, search_empty_legs]
        GmailMCP[Gmail MCP Server<br/>4 tools: send_email,<br/>prepare_proposal_email,<br/>search_emails, get_email]
        DatabaseMCP[Supabase MCP<br/>12 tools: get_client, list_clients,<br/>create_client, update_client,<br/>get_request, list_requests,<br/>get_quotes, update_quote_status,<br/>get_operator, list_preferred_operators,<br/>create_proposal, get_proposal]
    end

    subgraph Services["Service Layer"]
        ContractService[Contract Service<br/>lib/services/contract-service.ts]
        ContractPDF[Contract PDF Generator<br/>lib/pdf/contract-generator.ts]
        InboxMonitor[Inbox Monitor<br/>lib/services/inbox-monitor.ts]
        EmailService[Email Service<br/>lib/services/email-service.ts]
        MessagePersist[Message Persistence<br/>lib/conversation/message-persistence.ts]
        SessionTracker[Chat Session Tracker<br/>lib/sessions/track-chat-session.ts]
        OnboardingService[Onboarding Service<br/>lib/services/onboarding-service.ts]
        OnboardingPDF[Onboarding Contract PDF<br/>lib/pdf/onboarding-contract-template.tsx<br/>lib/pdf/onboarding-contract-generator.ts]
        OnboardingValidation[Onboarding Validation<br/>lib/validations/onboarding.ts<br/>Zod schema]
    end

    subgraph DataStores["Data Stores"]
        Supabase[(Supabase PostgreSQL<br/>requests, quotes, proposals,<br/>contracts, messages, iso_agents,<br/>client_profiles, chat_sessions,<br/>avinode_webhook_events,<br/>onboarding_contracts,<br/>contract_tokens)]
        SupaStorage[(Supabase Storage<br/>Proposal PDFs<br/>Flight Contract PDFs<br/>Onboarding Contract PDFs)]
    end

    subgraph External["External Services"]
        AvinodeAPI[Avinode API<br/>Trip Management<br/>RFQ/Quote System<br/>Operator Messaging]
        GmailAPI[Gmail API<br/>Email Sending<br/>Inbox Search]
        ClerkAuth[Clerk<br/>Authentication<br/>JWT Tokens]
        OpenAI[OpenAI API<br/>GPT-4 Turbo<br/>Function Calling]
    end

    %% User interactions
    ISO --> UI
    ISO --> OnboardingForm
    Customer -.->|"Email reply"| GmailAPI
    Operator -.->|"Quote response"| AvinodeAPI

    %% Onboarding flow
    OnboardingForm --> OnboardingRegister
    OnboardingRegister --> OnboardingService
    OnboardingGenContract --> OnboardingPDF
    OnboardingSendContract --> EmailService
    OnboardingService --> Supabase
    OnboardingPDF --> SupaStorage
    OnboardingValidateToken --> OnboardingService
    OnboardingSign --> OnboardingService
    ContractReview --> OnboardingValidateToken
    ContractReview --> OnboardingSign
    ClerkWebhook --> Supabase

    %% Frontend to API
    UI --> ChatAPI
    UI --> ContractSendAPI
    UI --> PaymentAPI
    UI --> ProposalAPI
    SSEClient -.->|"Subscribe"| SSEEndpoint
    Cards --> UI
    Sidebar --> UI

    %% API to Agent
    ChatAPI --> Agent
    Agent --> IntentDetect
    Agent --> SystemPrompt
    Agent --> ToolExec

    %% Agent to MCP
    ToolExec --> AvinodeMCP
    ToolExec --> GmailMCP
    ToolExec --> DatabaseMCP

    %% MCP to External
    AvinodeMCP --> AvinodeAPI
    GmailMCP --> GmailAPI
    DatabaseMCP --> Supabase

    %% API routes to services
    ContractSendAPI --> ContractService
    ContractSendAPI --> ContractPDF
    ContractSendAPI --> EmailService
    PaymentAPI --> ContractService
    InboxAPI --> InboxMonitor

    %% Services to data
    ContractService --> Supabase
    ContractPDF --> SupaStorage
    MessagePersist --> Supabase
    SessionTracker --> Supabase
    EmailService --> GmailAPI

    %% Webhooks
    AvinodeAPI -.->|"TripRequestSellerResponse<br/>TripChatSeller"| WebhookAPI
    WebhookAPI --> Supabase
    WebhookAPI -.-> SSEEndpoint

    %% Auth
    ChatAPI -.->|"Verify JWT"| ClerkAuth
    Agent -.->|"Chat completion"| OpenAI

    %% Chat API to persistence
    ChatAPI --> MessagePersist
    ChatAPI --> SessionTracker

    %% Styling
    classDef user fill:#e3f2fd,stroke:#1565c0,color:#000
    classDef frontend fill:#e8f5e9,stroke:#2e7d32,color:#000
    classDef api fill:#fff3e0,stroke:#e65100,color:#000
    classDef agent fill:#f3e5f5,stroke:#6a1b9a,color:#000
    classDef mcp fill:#fce4ec,stroke:#c62828,color:#000
    classDef service fill:#e0f7fa,stroke:#00838f,color:#000
    classDef data fill:#fff9c4,stroke:#f9a825,color:#000
    classDef external fill:#efebe9,stroke:#4e342e,color:#000

    class ISO,Customer,Operator user
    class UI,Cards,Sidebar,SSEClient,OnboardingForm,ContractReview frontend
    class ChatAPI,ContractSendAPI,PaymentAPI,ProposalAPI,WebhookAPI,ClerkWebhook,InboxAPI,SSEEndpoint,OnboardingRegister,OnboardingGenContract,OnboardingSendContract,OnboardingValidateToken,OnboardingSign api
    class Agent,IntentDetect,SystemPrompt,ToolExec agent
    class AvinodeMCP,GmailMCP,DatabaseMCP mcp
    class ContractService,ContractPDF,InboxMonitor,EmailService,MessagePersist,SessionTracker,OnboardingService,OnboardingPDF,OnboardingValidation service
    class Supabase,SupaStorage data
    class AvinodeAPI,GmailAPI,ClerkAuth,OpenAI external
```

## Data Flow Summary

```mermaid
flowchart LR
    subgraph Input["Input Channels"]
        Chat[Chat Message]
        Webhook[Avinode Webhook]
        ClerkWH[Clerk Webhook]
        UIAction[UI Button Click]
        OnboardForm[Onboarding Form]
    end

    subgraph Processing["Processing"]
        ChatAPI[Chat API + Agent]
        WebhookHandler[Webhook Handler]
        ContractAPI[Contract/Payment API]
        OnboardingAPI[Onboarding API]
    end

    subgraph Storage["Persistent Storage"]
        DB[(Supabase DB)]
        Files[(Supabase Storage)]
    end

    subgraph Output["Output Channels"]
        SSE[SSE Stream → Browser]
        Email[Gmail → Customer]
        AvinodeMsg[Avinode → Operator]
    end

    Chat --> ChatAPI
    Webhook --> WebhookHandler
    ClerkWH --> WebhookHandler
    UIAction --> ContractAPI
    OnboardForm --> OnboardingAPI

    ChatAPI --> DB
    ChatAPI --> SSE
    ChatAPI --> Email
    ChatAPI --> AvinodeMsg

    WebhookHandler --> DB
    WebhookHandler --> SSE

    ContractAPI --> DB
    ContractAPI --> Files
    ContractAPI --> Email

    OnboardingAPI --> DB
    OnboardingAPI --> Files
    OnboardingAPI --> Email
```

## Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Clerk
    participant NextAPI as Next.js API
    participant Supabase

    Browser->>Clerk: Sign in (email/OAuth)
    Clerk-->>Browser: JWT token + session cookie

    Browser->>NextAPI: API request + JWT
    NextAPI->>Clerk: auth() — verify JWT
    Clerk-->>NextAPI: { userId: "clerk_xxx" }
    NextAPI->>Supabase: SELECT iso_agents WHERE clerk_user_id = ?
    Supabase-->>NextAPI: { id: "uuid", role: "iso_agent" }

    Note over NextAPI: All subsequent queries<br/>scoped by iso_agent_id

    NextAPI->>Supabase: SELECT requests WHERE iso_agent_id = ?
    Supabase-->>NextAPI: Agent's requests only (RLS enforced)
```

## ISO Agent Onboarding Flow

```mermaid
sequenceDiagram
    autonumber
    participant Browser
    participant Clerk
    participant Middleware as Next.js Middleware
    participant WebhookAPI as /api/webhooks/clerk
    participant OnboardingUI as /onboarding
    participant OnboardingAPI as /api/onboarding/*
    participant EmailSvc as Email Service
    participant Gmail as Gmail MCP
    participant DB as Supabase (DB)
    participant Storage as Supabase Storage

    Note over Browser,DB: Step 1 — Clerk Sign-Up + Webhook

    Browser->>Clerk: Sign up (email/OAuth)
    Clerk-->>Browser: JWT token + session cookie
    Clerk->>WebhookAPI: POST user.created webhook
    WebhookAPI->>WebhookAPI: Map role (sales_rep → iso_agent)
    WebhookAPI->>DB: INSERT iso_agents (email, name, role=iso_agent, onboarding_status=pending)
    Clerk-->>Browser: Redirect to /onboarding (afterSignUpUrl)

    Note over Browser,DB: Step 2 — Middleware Routing

    Browser->>Middleware: GET /onboarding
    Middleware->>Middleware: Check: /onboarding in public routes? Yes
    Middleware->>Middleware: Check: authenticated? Yes
    Middleware-->>Browser: Allow access (no redirect loop)

    Note over Browser,DB: Step 3 — Multi-Step Registration Form

    Browser->>OnboardingUI: Load onboarding page
    OnboardingUI->>OnboardingAPI: GET /api/onboarding/status
    OnboardingAPI->>DB: SELECT onboarding_status FROM iso_agents
    OnboardingAPI-->>OnboardingUI: { status: "pending", nextStep: "personal_info" }

    Browser->>OnboardingUI: Fill Step 1: Personal Info (name, DOB, phone, address)
    Browser->>OnboardingUI: Fill Step 2: Commission Terms (acknowledge checkbox)
    Browser->>OnboardingUI: Step 3: Review & Submit
    OnboardingUI->>OnboardingAPI: POST /api/onboarding/register { personalInfo }
    OnboardingAPI->>OnboardingAPI: Validate with Zod schema (age >= 18, phone, ZIP)
    OnboardingAPI->>DB: UPDATE iso_agents SET first_name, last_name, ..., onboarding_status=profile_complete

    Note over Browser,DB: Step 4 — Contract PDF Generation & Email

    OnboardingAPI->>OnboardingAPI: POST /api/onboarding/generate-contract
    OnboardingAPI->>OnboardingAPI: Render employment commission PDF (React PDF)
    OnboardingAPI->>Storage: Upload to onboarding/{agent_id}/commission-contract-{date}.pdf
    OnboardingAPI->>DB: INSERT onboarding_contracts (agent_id, pdf_path, commission_%, status=pending)

    OnboardingAPI->>OnboardingAPI: POST /api/onboarding/send-contract
    OnboardingAPI->>OnboardingAPI: Generate token: crypto.randomBytes(32).toString('hex')
    OnboardingAPI->>DB: INSERT contract_tokens (token, agent_id, email, expires_at=NOW()+72h)
    OnboardingAPI->>EmailSvc: sendOnboardingContractEmail(agentEmail, token, pdfUrl)
    EmailSvc->>Gmail: Send email with review link
    OnboardingAPI->>DB: UPDATE iso_agents SET onboarding_status=contract_sent
    OnboardingAPI-->>Browser: "Contract sent! Check your email."

    Note over Browser,DB: Step 5 — Contract Review & Signature

    Browser->>OnboardingUI: Click email link → /onboarding/contract-review/[token]
    OnboardingUI->>OnboardingAPI: GET /api/onboarding/validate-token/[token]
    OnboardingAPI->>DB: SELECT contract_tokens WHERE token = ?
    OnboardingAPI->>OnboardingAPI: Check: not expired (72h), not used, email matches auth user

    alt Token valid
        OnboardingAPI-->>OnboardingUI: { valid: true, contractId, pdfUrl }
        OnboardingUI-->>Browser: Display PDF + signature fields
        Browser->>OnboardingUI: Type full name + check acknowledgment
        OnboardingUI->>OnboardingAPI: POST /api/onboarding/sign-contract { signature, name, IP }
        OnboardingAPI->>DB: UPDATE onboarding_contracts SET status=signed, signed_at, signature_data
        OnboardingAPI->>DB: UPDATE contract_tokens SET used_at=NOW()
        OnboardingAPI->>DB: UPDATE iso_agents SET onboarding_status=completed
        OnboardingAPI-->>Browser: Redirect to /chat (fully onboarded)
    else Token expired or used
        OnboardingAPI-->>OnboardingUI: { valid: false, reason: "expired" }
        OnboardingUI-->>Browser: Show error + "Resend Contract" button
        Browser->>OnboardingAPI: POST /api/onboarding/resend-contract
        OnboardingAPI->>OnboardingAPI: Generate new token, invalidate old
        OnboardingAPI->>EmailSvc: Resend email with new token
    end
```
