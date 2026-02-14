# Trip Creation Sequence Diagram

Full sequence from user message through trip creation, RFQ lifecycle, proposal, contract, payment, and deal closure.

> **Prerequisite**: ISO agent must have completed onboarding (`onboarding_status = 'completed'`). See [System Ecosystem Diagram](./SYSTEM_ECOSYSTEM_DIAGRAM.md#iso-agent-onboarding-flow) for the onboarding sequence.

## Trip Creation & RFQ Flow

```mermaid
sequenceDiagram
    autonumber
    participant U as ISO Agent (Browser)
    participant FE as Next.js Frontend
    participant API as /api/chat
    participant Agent as JetvisionAgent
    participant MCP as Avinode MCP Server
    participant AV as Avinode API
    participant DB as Supabase (DB)
    participant WH as Webhook Handler

    Note over U,DB: Phase 1 — Gather Flight Details (Multi-Turn)
    U->>FE: "I need a flight KTEB to KLAX for 4 pax May 10"
    FE->>API: POST /api/chat { message, conversationHistory }
    API->>API: Authenticate (Clerk JWT)
    API->>DB: getOrCreateConversation()
    API->>DB: Load workflow_state from requests table
    API->>DB: Check messages for UI-driven stage transitions
    API->>Agent: execute(message, history, workingMemory)
    Agent->>Agent: detectIntent() → "create_rfp"
    Agent->>Agent: Check required fields (departure, arrival, date, pax, time, trip type)

    alt Missing fields (e.g., no departure time)
        Agent-->>API: "What time would you like to depart?"
        API-->>FE: SSE stream { content }
        FE-->>U: Display question
        U->>FE: "4pm EST, one way"
        FE->>API: POST /api/chat { message, conversationHistory }
        API->>Agent: execute(message, history, workingMemory)
        Agent->>Agent: Extract all params from full conversation history
    end

    alt City name instead of ICAO code
        Agent->>MCP: search_airports({ query: "Kansas City" })
        MCP->>AV: GET /airports?q=Kansas+City
        AV-->>MCP: [KMCI, KMKC]
        MCP-->>Agent: airports[]
        Agent-->>API: "I found KMCI and KMKC. Which one?"
        API-->>FE: SSE stream
        FE-->>U: Display airport options
        U->>FE: "KMCI"
    end

    Note over U,DB: Phase 2 — Create Trip
    Agent->>MCP: create_trip({ departure: "KTEB", arrival: "KLAX", date: "2026-05-10", pax: 4, time: "16:00" })
    MCP->>AV: POST /trips
    AV-->>MCP: { trip_id: "atrip-123", deep_link: "https://avinode.com/..." }
    MCP-->>Agent: { trip_id, deep_link }
    Agent-->>API: result { message, tripId, deepLink, rfpData }
    API->>DB: UPDATE requests SET avinode_trip_id, avinode_deep_link, workflow_state.workflowStage='trip_created'
    API->>DB: saveMessage(assistant, "Trip created successfully...")
    API-->>FE: SSE stream { content, trip_data { trip_id, deep_link, route... } }
    FE-->>U: Display TripSummaryCard + AvinodeDeepLinks button

    Note over U,AV: Phase 3 — Manual RFQ in Avinode (Human-in-the-Loop)
    U->>AV: Click deep link → Open Avinode Marketplace
    U->>AV: Browse available aircraft, select operators
    U->>AV: Submit RFQs to selected operators

    Note over WH,DB: Phase 4 — Quote Reception (Webhook-Driven)
    AV->>WH: POST /api/webhooks/avinode { event: "TripRequestSellerResponse" }
    WH->>WH: Verify signature, parse event
    WH->>DB: INSERT avinode_webhook_events
    WH->>DB: INSERT/UPDATE quotes
    WH-->>FE: SSE push via /api/avinode/events

    Note over U,DB: Phase 5 — Quote Review & Proposal
    U->>FE: "Update RFQs" / "Check quotes"
    FE->>API: POST /api/chat { message }
    API->>Agent: execute()
    Agent->>MCP: get_rfq({ rfq_id: "atrip-123" })
    MCP->>AV: GET /trips/atrip-123/rfqs
    AV-->>MCP: { flights: [...quotes] }
    MCP-->>Agent: rfqData
    API->>DB: UPDATE workflow_state.workflowStage='quotes_received'
    API-->>FE: SSE { content, rfq_data }
    FE-->>U: Display RFQQuoteDetailsCard

    U->>FE: "Create a proposal from the first quote"
    FE->>API: POST /api/chat { message }
    Agent->>MCP: create_proposal({ request_id, quote_id, title })
    MCP-->>Agent: proposal { id, proposal_number, file_url }
    API->>DB: UPDATE workflow_state.workflowStage='proposal_ready'
    API-->>FE: SSE { content }
    FE-->>U: Display MarginSelectionCard

    Note over U,FE: Phase 5b — Profit Margin Selection
    FE-->>U: Show margin slider (10%, 15%, 20%, custom)
    U->>FE: Select profit margin percentage
    FE->>API: POST /api/proposal/margin { proposalId, marginPercent }
    API->>DB: UPDATE proposals SET margin_applied = marginPercent
    API-->>FE: Updated pricing with margin applied
    FE-->>U: "Proposal ready with [X]% margin. Ready to send?"

    Note over U,DB: Phase 6 — Send Proposal (Human-in-the-Loop Email)
    U->>FE: "Send proposal to client@example.com"
    FE->>API: POST /api/chat
    Agent->>MCP: prepare_proposal_email({ proposal_id, to_email, to_name })
    MCP-->>Agent: { subject, body, attachments (prices include margin) }
    API-->>FE: SSE { email_approval_data }
    FE-->>U: Display EmailPreviewCard (subject, body, PDF with margin pricing)
    U->>FE: Review, edit, click "Send Email"
    FE->>API: POST /api/proposal/approve-email
    API->>DB: UPDATE workflow_state.workflowStage='proposal_sent'
    API-->>FE: "Email sent successfully"
```

## Post-Proposal: Contract → Payment → Deal Closure

```mermaid
sequenceDiagram
    autonumber
    participant U as ISO Agent (Browser)
    participant FE as Next.js Frontend
    participant API as /api/chat
    participant Agent as JetvisionAgent
    participant Gmail as Gmail MCP
    participant ContractAPI as /api/contract/*
    participant DB as Supabase (DB)

    Note over U,DB: Phase 7 — Check for Customer Reply
    U->>FE: "Did the customer reply?"
    FE->>API: POST /api/chat
    API->>DB: Load workflow_state (stage=proposal_sent)
    API->>Agent: execute()
    Agent->>Agent: detectIntent() → "check_inbox"
    Agent->>Gmail: search_emails({ query: "from:client@example.com" })
    Gmail-->>Agent: { messages: [{ subject, snippet, date }] }

    alt Customer replied
        API->>DB: UPDATE workflow_state.workflowStage='customer_replied'
        Agent-->>API: "Customer replied! They said: '...' Would you like to proceed with booking?"
        API-->>FE: SSE { content }
        FE-->>U: Display reply summary
    else No reply
        Agent-->>API: "No reply yet. Would you like to send a follow-up?"
        API-->>FE: SSE { content }
        FE-->>U: Display no-reply guidance
    end

    Note over U,DB: Phase 8 — Book Flight / Generate Contract
    U->>FE: "Book the flight"
    FE->>API: POST /api/chat
    Agent->>Agent: detectIntent() → "book_flight"
    Agent->>Agent: Verify stage=customer_replied, all details present
    Agent-->>API: "Ready to book. Click Book Flight to generate and send the contract."
    API-->>FE: SSE { content }
    FE-->>U: Display confirmation + Book Flight button

    U->>FE: Click "Book Flight" button
    FE->>ContractAPI: POST /api/contract/send
    ContractAPI->>ContractAPI: Generate contract PDF (contract-generator.ts)
    Note over ContractAPI: PDF includes:<br/>- Flight details (route, aircraft, dates, times)<br/>- Pricing breakdown (base + margin)<br/>- Terms & conditions<br/>- Payment form on final page<br/>  (wire/check instructions)
    ContractAPI->>DB: INSERT contracts (status=draft)
    ContractAPI-->>FE: { contractId, contractNumber, pdfPreviewUrl }
    FE-->>U: Display contract email preview for review
    U->>FE: Review contract PDF & email, approve sending
    FE->>ContractAPI: Confirm send
    ContractAPI->>DB: UPDATE contracts SET status='sent', sent_at=NOW()
    ContractAPI->>Gmail: Send contract email with PDF attachment
    ContractAPI->>DB: saveMessage(contentType='contract_shared', richContent={contractSent})
    ContractAPI-->>FE: { contractId, contractNumber, fileUrl }
    FE-->>U: Display ContractSentConfirmation card

    Note over U,DB: Phase 9 — Offline Payment & Confirmation
    Note over U: Customer pays offline via wire transfer,<br/>check, or other method using<br/>payment form on contract PDF

    U->>FE: "Payment received" or clicks "Mark Payment Received"
    FE->>API: POST /api/chat
    API->>DB: Load workflow_state (detects contract_shared message → stage=contract_sent)
    Agent->>Agent: detectIntent() → "confirm_payment"
    Agent-->>API: "Click Mark Payment Received in the contract card."
    API-->>FE: SSE { content }
    FE-->>U: Display payment guidance

    U->>FE: Click "Mark Payment Received"
    FE-->>U: Open PaymentConfirmationModal
    U->>FE: Enter: amount, method (wire/credit_card/check), reference, date
    FE->>ContractAPI: POST /api/contract/{id}/payment
    ContractAPI->>DB: UPDATE contracts SET status='paid', payment_amount, payment_method, payment_reference, payment_received_at
    ContractAPI->>DB: saveMessage(contentType='payment_confirmed', richContent={paymentConfirmed})
    ContractAPI-->>FE: { success, contract_number, payment_amount }
    FE-->>U: Display PaymentConfirmedCard (amount, method, reference, date)

    Note over U,DB: Phase 10 — Close Deal
    U->>FE: "Close the deal"
    FE->>API: POST /api/chat
    API->>DB: Load workflow_state (detects payment_confirmed message → stage=payment_received)
    Agent->>Agent: detectIntent() → "close_deal"
    Agent-->>API: "Deal closed! Timeline: proposal → contract → payment → closed."
    API->>DB: UPDATE workflow_state.workflowStage='deal_closed'
    API-->>FE: SSE { content }
    FE-->>U: Display ClosedWonConfirmation card with timeline

    opt Auto-close after payment
        ContractAPI->>DB: UPDATE contracts SET status='completed', completed_at=NOW()
        ContractAPI->>DB: saveMessage(contentType='deal_closed', richContent={dealClosed})
    end
```
