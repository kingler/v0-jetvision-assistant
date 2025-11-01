# Supabase Database Schema Audit Report

**Date**: 2025-10-24
**Database**: jetvision-assistant-db
**Project Ref**: sbzaevawnjlrsjsuevli

---

## ✅ Existing Tables (All Present & Working)

### 1. `iso_agents` - Sales Representatives & Admin Staff
**Status**: ✅ **EXISTS** (4 rows)

**Purpose**: Stores user profiles for Jetvision Group's sales representatives and admin staff members

**Key Columns**:
- `id` - UUID primary key
- `clerk_user_id` - Linked to Clerk authentication (unique)
- `email` - User email
- `full_name` - Full name
- `role` - Enum: `iso_agent`, `admin`, `operator`
- `margin_type` - How margin is calculated (`percentage` or `fixed`)
- `margin_value` - Margin amount to apply to quotes
- `is_active` - Boolean status
- `metadata` - JSONB for flexible additional data
- `created_at`, `updated_at` - Timestamps

**Current Data**:
- System User (system@jetvision.ai) - admin
- John Doe (agent1@jetvision.ai) - iso_agent
- Jane Smith (agent2@jetvision.ai) - iso_agent
- Admin User (admin@jetvision.ai) - admin

**RLS**: ✅ Enabled - Users can view their own profile, admins can view all

---

### 2. `client_profiles` - Customer Information
**Status**: ✅ **EXISTS** (3 rows)

**Purpose**: Stores customer information and their preferences

**Key Columns**:
- `id` - UUID primary key
- `iso_agent_id` - FK to iso_agents (which sales rep manages this client)
- `company_name` - Customer company name
- `contact_name` - Primary contact person
- `email` - Contact email
- `phone` - Contact phone
- `preferences` - JSONB for flight preferences (aircraft type, amenities, etc.)
- `notes` - Text field for additional notes
- `is_active` - Boolean status
- `created_at`, `updated_at` - Timestamps

**Current Data**:
- Acme Corporation (Bob Johnson)
- TechStart Inc (Alice Williams)
- Global Ventures LLC (Charlie Davis)

**RLS**: ✅ Enabled - Users can only access their own clients

---

### 3. `requests` - Flight RFQ/Booking Trip Data
**Status**: ✅ **EXISTS** (3 rows)

**Purpose**: Stores flight request/RFQ data submitted by sales reps

**Key Columns**:
- `id` - UUID primary key
- `iso_agent_id` - FK to iso_agents (who created the request)
- `client_profile_id` - FK to client_profiles (optional)
- `departure_airport` - ICAO code (e.g., KTEB)
- `arrival_airport` - ICAO code (e.g., KLAX)
- `departure_date` - Timestamp
- `return_date` - Timestamp (nullable for one-way)
- `passengers` - Number of passengers (1-100)
- `aircraft_type` - Preferred aircraft
- `budget` - Decimal (nullable)
- `special_requirements` - Text field
- `status` - Enum (draft, pending, analyzing, searching_flights, etc.)
- `metadata` - JSONB (Avinode RFP ID, etc.)
- `created_at`, `updated_at` - Timestamps

**Current Data**:
- KTEB → KLAX (completed)
- KBOS → KMIA (awaiting_quotes)
- KJFK → EGLL (draft)

**RLS**: ✅ Enabled - Users can only access their own requests

---

### 4. `quotes` - Operator Proposals/Quotes
**Status**: ✅ **EXISTS** (4 rows)

**Purpose**: Stores operator quotes/proposals received for flight requests

**Key Columns**:
- `id` - UUID primary key
- `request_id` - FK to requests
- `operator_id` - External operator ID
- `operator_name` - Operator name (NetJets, VistaJet, etc.)
- `base_price` - Base flight cost
- `fuel_surcharge`, `taxes`, `fees` - Additional costs
- `total_price` - Total cost
- `aircraft_type` - Aircraft model
- `aircraft_tail_number` - Registration number
- `aircraft_details` - JSONB (year, range, amenities, etc.)
- `availability_confirmed` - Boolean
- `valid_until` - Timestamp (quote expiration)
- `score` - AI-generated score (0-100)
- `ranking` - Relative ranking among quotes
- `analysis_notes` - Text field
- `status` - Enum (pending, received, analyzed, accepted, rejected)
- `metadata` - JSONB (Avinode quote ID, etc.)
- `created_at`, `updated_at` - Timestamps

**Current Data**:
- NetJets: $112,000 (Gulfstream G650) - accepted
- VistaJet: $124,000 (Gulfstream G650ER) - received
- FlexJet: $103,800 (Gulfstream G550) - received
- Wheels Up: $33,000 (Citation X) - received

**RLS**: ✅ Enabled - Users can only access quotes for their own requests

---

### 5. `workflow_states` - Workflow State Tracking
**Status**: ✅ **EXISTS** (7 rows)

**Purpose**: Tracks request workflow state machine transitions

**Key Columns**:
- `id` - UUID primary key
- `request_id` - FK to requests
- `current_state` - Current workflow state
- `previous_state` - Previous state
- `agent_id` - Agent that performed the transition
- `metadata` - JSONB state-specific data
- `error_message` - Text (if state failed)
- `retry_count` - Integer
- `state_entered_at` - Timestamp
- `state_duration_ms` - Duration in previous state
- `created_at` - Timestamp

**RLS**: ✅ Enabled - Service role only (managed by agents)

---

### 6. `agent_executions` - Agent Execution Logs
**Status**: ✅ **EXISTS** (5 rows)

**Purpose**: Logs all agent activity for monitoring and debugging

**Key Columns**:
- `id` - UUID primary key
- `request_id` - FK to requests (nullable)
- `agent_type` - Enum (orchestrator, client_data, flight_search, etc.)
- `agent_id` - Agent instance ID
- `input_data` - JSONB
- `output_data` - JSONB
- `execution_time_ms` - Integer
- `status` - Enum (pending, running, completed, failed, timeout)
- `error_message`, `error_stack` - Text fields
- `retry_count` - Integer
- `metadata` - JSONB
- `started_at`, `completed_at`, `created_at` - Timestamps

**RLS**: ✅ Enabled - Service role only (managed by agents)

---

## ❌ Missing Tables

### 1. `proposals` - Generated PDF Proposals
**Status**: ❌ **MISSING** - **NEEDS TO BE CREATED**

**Purpose**: Store generated PDF proposals with links to sales rep and RFQs

**Recommended Schema**:
```sql
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  iso_agent_id UUID NOT NULL REFERENCES iso_agents(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,

  -- Document metadata
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,  -- URL to Supabase Storage or S3
  file_size_bytes INTEGER,
  mime_type TEXT DEFAULT 'application/pdf',

  -- Proposal details
  proposal_number TEXT UNIQUE, -- e.g., "PROP-2025-001"
  title TEXT NOT NULL,
  description TEXT,
  total_amount DECIMAL(12, 2),

  -- Status
  status proposal_status NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,

  -- Email tracking
  sent_to_email TEXT,
  email_subject TEXT,
  email_body TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_file_size CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
  CONSTRAINT valid_total_amount CHECK (total_amount IS NULL OR total_amount > 0)
);

-- Status enum
CREATE TYPE proposal_status AS ENUM (
  'draft',
  'generated',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired'
);
```

**Indexes**:
```sql
CREATE INDEX idx_proposals_request_id ON proposals(request_id);
CREATE INDEX idx_proposals_iso_agent_id ON proposals(iso_agent_id);
CREATE INDEX idx_proposals_quote_id ON proposals(quote_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);
CREATE INDEX idx_proposals_proposal_number ON proposals(proposal_number);
```

**RLS Policies**:
```sql
-- Users can only access their own proposals
CREATE POLICY "Users can view own proposals"
  ON proposals FOR SELECT
  USING (iso_agent_id = get_current_iso_agent_id() OR is_admin());

CREATE POLICY "Users can create own proposals"
  ON proposals FOR INSERT
  WITH CHECK (iso_agent_id = get_current_iso_agent_id());

CREATE POLICY "Users can update own proposals"
  ON proposals FOR UPDATE
  USING (iso_agent_id = get_current_iso_agent_id() OR is_admin())
  WITH CHECK (iso_agent_id = get_current_iso_agent_id() OR is_admin());
```

---

### 2. `proposal_templates` - Email/PDF Templates (Optional Enhancement)
**Status**: ❌ **MISSING** - **RECOMMENDED FOR FUTURE**

**Purpose**: Store reusable templates for proposals and emails

**Recommended Schema**:
```sql
CREATE TABLE proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL, -- 'pdf', 'email_subject', 'email_body'
  content TEXT NOT NULL, -- HTML or template string
  variables JSONB DEFAULT '[]'::jsonb, -- List of available variables
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES iso_agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔧 Recommendations

### Immediate Actions Required

1. **Create `proposals` table** - Migration file needed
2. **Set up Supabase Storage bucket** for PDF files:
   ```bash
   # Create bucket: proposal-documents
   # Set policies for authenticated users
   ```

3. **Update `CommunicationAgent`** to:
   - Generate PDF proposal
   - Upload to Supabase Storage
   - Create record in `proposals` table
   - Link to `request_id`, `iso_agent_id`, and `quote_id`

### Future Enhancements

1. **Add `proposal_versions` table** - Track proposal revisions
2. **Add `proposal_analytics` table** - Track views, downloads, time spent
3. **Add Storage integration** - Configure Supabase Storage buckets
4. **Add `client_communications` table** - Log all client emails/calls

---

## 📊 Summary

| Table | Status | Rows | Purpose |
|-------|--------|------|---------|
| `iso_agents` | ✅ Deployed | 4 | Sales reps & admin staff |
| `client_profiles` | ✅ Deployed | 3 | Customer information |
| `requests` | ✅ Deployed | 3 | Flight RFQs/trip data |
| `quotes` | ✅ Deployed | 4 | Operator proposals |
| `workflow_states` | ✅ Deployed | 7 | Workflow tracking |
| `agent_executions` | ✅ Deployed | 5 | Agent logs |
| `proposals` | ❌ Missing | 0 | **NEEDS CREATION** |

**Overall**: 6/7 tables deployed (85.7% complete)

**Critical Missing Feature**: PDF proposal storage and tracking

---

## 🔐 Security Status

✅ **Row Level Security (RLS)**: Enabled on all tables
✅ **Multi-tenant isolation**: Properly configured
✅ **Service role bypass**: Configured for agent operations
✅ **Helper functions**: `get_current_iso_agent_id()`, `is_admin()`, `owns_resource()`

---

## Next Steps

1. ✅ Review this audit report
2. 📝 Create migration: `004_proposals_table.sql`
3. 🚀 Deploy migration to Supabase
4. 🗄️ Configure Supabase Storage bucket
5. 🔧 Update `CommunicationAgent` to use new table
