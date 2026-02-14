# Database Relational Schema Diagram

Complete entity-relationship diagram for the Jetvision system including all core tables, onboarding system, the 3-party chat system, Avinode integration, and the contract/payment lifecycle.

## Core Business Tables

```mermaid
erDiagram
    iso_agents {
        uuid id PK
        text clerk_user_id UK
        text email UK
        text full_name
        text first_name
        text last_name
        date date_of_birth
        text phone
        text address_line_1
        text address_line_2
        text city
        text state
        text zip_code
        text role "admin | iso_agent | operator"
        text margin_type "percentage | fixed"
        decimal margin_value
        decimal commission_percentage "default 10.00"
        onboarding_status onboarding_status "pending|profile_complete|contract_sent|contract_signed|completed"
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    client_profiles {
        uuid id PK
        uuid iso_agent_id FK
        text company_name
        text contact_name
        text email
        text phone
        jsonb preferences
        text notes
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    requests {
        uuid id PK
        uuid iso_agent_id FK
        uuid client_profile_id FK
        text departure_airport
        text arrival_airport
        date departure_date
        date return_date
        integer passengers
        text aircraft_type
        decimal budget
        text special_requirements
        request_status status "16 enum values"
        text avinode_trip_id
        text avinode_rfq_id
        text avinode_deep_link
        jsonb workflow_state "WorkingMemory JSON"
        timestamptz created_at
        timestamptz updated_at
    }

    quotes {
        uuid id PK
        uuid request_id FK
        text avinode_quote_id
        text operator_id
        text operator_name
        decimal base_price
        decimal fuel_surcharge
        decimal taxes
        decimal fees
        decimal total_price
        text aircraft_type
        text aircraft_tail_number
        integer score
        integer ranking
        quote_status status
        timestamptz valid_until
        timestamptz created_at
        timestamptz updated_at
    }

    proposals {
        uuid id PK
        uuid request_id FK
        uuid iso_agent_id FK
        uuid quote_id FK
        uuid client_profile_id FK
        text proposal_number UK
        text title
        proposal_status status
        decimal total_amount
        decimal margin_applied
        text file_name
        text file_url
        text file_path
        integer file_size_bytes
        text sent_to_email
        timestamptz sent_at
        timestamptz created_at
        timestamptz updated_at
    }

    contracts {
        uuid id PK
        uuid request_id FK
        uuid proposal_id FK
        uuid quote_id FK
        uuid iso_agent_id FK
        uuid client_profile_id FK
        text contract_number UK
        text reference_quote_number
        contract_status status "draft|sent|viewed|signed|payment_pending|paid|completed|cancelled|expired"
        text file_name
        text file_url
        text file_path
        integer file_size_bytes
        text client_name
        text client_email
        text client_company
        text departure_airport
        text arrival_airport
        date departure_date
        text aircraft_type
        integer passengers
        decimal flight_cost
        decimal federal_excise_tax
        decimal domestic_segment_fee
        decimal subtotal
        decimal total_amount
        text currency
        jsonb amenities
        text payment_method
        text payment_reference
        decimal payment_amount
        timestamptz payment_received_at
        text client_signature_data
        timestamptz sent_at
        timestamptz signed_at
        timestamptz completed_at
        timestamptz cancelled_at
        integer version
        uuid previous_version_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    iso_agents ||--o{ client_profiles : "manages"
    iso_agents ||--o{ requests : "creates"
    iso_agents ||--o{ proposals : "generates"
    iso_agents ||--o{ contracts : "issues"
    client_profiles ||--o{ requests : "requests flight"
    client_profiles ||--o{ contracts : "signs"
    requests ||--o{ quotes : "receives"
    requests ||--o{ proposals : "produces"
    requests ||--o{ contracts : "leads to"
    quotes ||--o| proposals : "basis for"
    quotes ||--o| contracts : "contracted"
    proposals ||--o| contracts : "generates"
    contracts ||--o| contracts : "amends (previous_version)"
```

## ISO Agent Onboarding System

```mermaid
erDiagram
    iso_agents {
        uuid id PK
        text clerk_user_id UK
        text email UK
        text first_name
        text last_name
        date date_of_birth
        text phone
        text address_line_1
        text city
        text state
        text zip_code
        onboarding_status onboarding_status "pending|profile_complete|contract_sent|contract_signed|completed"
        decimal commission_percentage "default 10.00"
    }

    onboarding_contracts {
        uuid id PK
        uuid agent_id FK
        text pdf_storage_path "onboarding/agent_id/commission-contract-date.pdf"
        decimal commission_percentage
        text status "pending | signed"
        timestamptz signed_at
        text signature_data "digital signature capture"
        text signed_name "typed full name"
        text signed_ip_address "audit trail"
        timestamptz created_at
        timestamptz updated_at
    }

    contract_tokens {
        uuid id PK
        uuid contract_id FK
        uuid agent_id FK
        text token UK "crypto.randomBytes(32) hex"
        text email "bound to specific email"
        timestamptz expires_at "72 hours from creation"
        timestamptz used_at "NULL until used (single-use)"
        timestamptz created_at
    }

    iso_agents ||--o{ onboarding_contracts : "receives"
    onboarding_contracts ||--o{ contract_tokens : "secured by"
    iso_agents ||--o{ contract_tokens : "issued to"
```

## Chat & Messaging System

```mermaid
erDiagram
    chat_sessions {
        uuid id PK
        uuid conversation_id FK
        uuid request_id FK
        uuid iso_agent_id FK
        text session_status "active|idle|completed"
        text conversation_type "flight_request|general"
        text avinode_trip_id
        text avinode_rfp_id
        text avinode_rfq_id
        uuid primary_quote_id FK
        uuid proposal_id FK
        jsonb current_step
        jsonb workflow_state "WorkingMemory JSONB"
        integer message_count
        integer quotes_received_count
        integer quotes_expected_count
        timestamptz created_at
        timestamptz updated_at
    }

    messages {
        uuid id PK
        uuid request_id FK
        uuid parent_message_id FK "threading"
        message_sender_type sender_type "iso_agent|ai_assistant|operator|system"
        uuid sender_iso_agent_id FK
        uuid sender_operator_id FK
        text content
        message_content_type content_type "text|rfp_created|quote_shared|proposal_shared|email_approval_request|contract_shared|payment_confirmed|deal_closed|..."
        jsonb rich_content "structured data for UI cards"
        message_status status "sending|sent|delivered|read|failed"
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
    }

    operator_profiles {
        uuid id PK
        text avinode_operator_id UK
        text company_name
        text contact_name
        text contact_email
        text contact_phone
        text[] aircraft_types
        text region
        decimal operator_rating
        boolean is_preferred_partner
        timestamptz created_at
        timestamptz updated_at
    }

    conversations {
        uuid id PK
        uuid request_id FK
        text conversation_type "buyer_seller|internal|customer"
        text subject
        text status "active|archived|closed"
        timestamptz created_at
        timestamptz updated_at
    }

    conversation_participants {
        uuid id PK
        uuid conversation_id FK
        text participant_type "iso_agent|operator|ai_assistant"
        uuid participant_iso_agent_id FK
        uuid participant_operator_id FK
        timestamptz joined_at
        timestamptz left_at
    }

    requests ||--|| chat_sessions : "tracked by"
    requests ||--o{ messages : "contains"
    requests ||--o{ conversations : "has"
    iso_agents ||--o{ chat_sessions : "owns"
    iso_agents ||--o{ messages : "sends"
    conversations ||--o{ messages : "contains"
    conversations ||--o{ conversation_participants : "members"
    operator_profiles ||--o{ conversation_participants : "participates"
    operator_profiles ||--o{ messages : "sends"
    messages ||--o{ messages : "replies to (parent)"
    quotes ||--o| chat_sessions : "primary quote"
    proposals ||--o| chat_sessions : "linked proposal"
```

## Avinode Integration & Webhooks

```mermaid
erDiagram
    avinode_webhook_events {
        uuid id PK
        text event_id UK
        text event_type "rfq_received|quote_received|message_received|booking_confirmed|trip_created|trip_updated|trip_cancelled"
        text trip_id
        text rfq_id
        text quote_id
        text operator_id
        uuid conversation_id FK
        jsonb payload "raw webhook payload"
        processing_status status "pending|processing|completed|failed|skipped|dead_letter"
        integer retry_count
        timestamptz next_retry_at
        text error_message
        text signature_hash
        boolean signature_valid
        timestamptz received_at
        timestamptz processed_at
        timestamptz created_at
    }

    workflow_states {
        uuid id PK
        uuid request_id FK
        text current_state
        text previous_state
        text agent_id
        jsonb metadata
        text error_message
        integer retry_count
        timestamptz created_at
        timestamptz updated_at
    }

    agent_executions {
        uuid id PK
        uuid request_id FK
        text agent_type
        text agent_id
        jsonb input_data
        jsonb output_data
        integer execution_time_ms
        text status "started|completed|failed"
        text error_message
        timestamptz created_at
    }

    requests ||--o{ workflow_states : "state history"
    requests ||--o{ agent_executions : "execution log"
    requests ||--o{ avinode_webhook_events : "receives events"
    conversations ||--o{ avinode_webhook_events : "linked"
    operator_profiles ||--o{ avinode_webhook_events : "sent by"
```
