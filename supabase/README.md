# Supabase Database Schema Documentation

**Project**: JetVision AI Assistant
**Version**: 1.0.0
**Last Updated**: 2025-10-21

## Overview

The JetVision database schema is designed for a multi-tenant RFP management system for private jet charter bookings. It supports a complete workflow from request creation through quote analysis and proposal generation, with comprehensive audit trails and multi-agent coordination tracking.

## Architecture Principles

### Multi-Tenancy
- **Row Level Security (RLS)** enforced on all tables
- ISO agents can only access their own data
- Admins have full access across all tenants
- Service role bypasses RLS for system operations

### Data Integrity
- Foreign key constraints ensure referential integrity
- Check constraints validate data quality
- Automatic timestamp management via triggers
- JSONB fields for flexible, schema-less data

### Performance
- Indexes on all foreign keys
- Indexes on frequently queried columns
- Efficient JSONB indexing for metadata fields

## Database Schema

### Tables

#### 1. `iso_agents`
User profiles synced from Clerk authentication.

```sql
CREATE TABLE iso_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'iso_agent',
  margin_type margin_type DEFAULT 'percentage',
  margin_value DECIMAL(10, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Store user profiles for ISO agents, admins, and operators.

**Key Columns**:
- `clerk_user_id`: Unique identifier from Clerk (used for auth mapping)
- `role`: User's role (`iso_agent`, `admin`, `operator`)
- `margin_type`: How commission is calculated (`percentage` or `fixed`)
- `margin_value`: Commission amount to apply to quotes

**Indexes**:
- `idx_iso_agents_clerk_user_id` on `clerk_user_id`
- `idx_iso_agents_email` on `email`
- `idx_iso_agents_role` on `role`

**RLS Policies**:
- SELECT: Users can view own profile, admins view all
- INSERT: Service role only (via Clerk webhook)
- UPDATE: Users can update own profile, admins update any
- DELETE: Admins only

---

#### 2. `client_profiles`
Client information managed by ISO agents.

```sql
CREATE TABLE client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_agent_id UUID NOT NULL REFERENCES iso_agents(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Store client details and preferences for personalized service.

**Key Columns**:
- `preferences`: JSONB containing preferred aircraft, amenities, budget range, dietary restrictions
- `notes`: Free-form notes about the client

**Preferences Structure**:
```typescript
{
  preferred_aircraft: ["Gulfstream G650", "Bombardier Global 7500"],
  dietary_restrictions: ["vegetarian", "gluten-free"],
  preferred_amenities: ["wifi", "full_galley"],
  budget_range: { min: 50000, max: 150000 }
}
```

**Indexes**:
- `idx_client_profiles_iso_agent_id` on `iso_agent_id`
- `idx_client_profiles_email` on `email`
- `idx_client_profiles_company_name` on `company_name`

**RLS Policies**:
- All operations: Users can only access their own clients

---

#### 3. `requests`
Flight RFP requests submitted by ISO agents.

```sql
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_agent_id UUID NOT NULL REFERENCES iso_agents(id) ON DELETE CASCADE,
  client_profile_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL,
  departure_airport TEXT NOT NULL,
  arrival_airport TEXT NOT NULL,
  departure_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ,
  passengers INTEGER NOT NULL,
  aircraft_type TEXT,
  budget DECIMAL(12, 2),
  special_requirements TEXT,
  status request_status NOT NULL DEFAULT 'draft',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Core RFP requests with flight details and requirements.

**Key Columns**:
- `status`: Workflow state (see Request Status Lifecycle)
- `metadata`: JSONB containing Avinode RFP ID, preferred times, etc.

**Status Values**:
- `draft` - Initial creation
- `pending` - Submitted for processing
- `analyzing` - Being analyzed by Orchestrator
- `fetching_client_data` - Client data being retrieved
- `searching_flights` - Flight search in progress
- `awaiting_quotes` - Waiting for operator quotes
- `analyzing_proposals` - Quotes being analyzed
- `generating_email` - Email being generated
- `sending_proposal` - Proposal being sent
- `completed` - Successfully completed
- `failed` - Processing failed
- `cancelled` - Cancelled by user

**Constraints**:
- Passengers: 1-100
- Departure date: Must be in the future
- Return date: Must be after departure date (if provided)

**Indexes**:
- `idx_requests_iso_agent_id` on `iso_agent_id`
- `idx_requests_client_profile_id` on `client_profile_id`
- `idx_requests_status` on `status`
- `idx_requests_departure_date` on `departure_date`
- `idx_requests_created_at` on `created_at DESC`

**RLS Policies**:
- All operations: Users can only access their own requests

---

#### 4. `quotes`
Operator quotes/proposals for flight requests.

```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  operator_id TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  base_price DECIMAL(12, 2) NOT NULL,
  fuel_surcharge DECIMAL(12, 2) DEFAULT 0.00,
  taxes DECIMAL(12, 2) DEFAULT 0.00,
  fees DECIMAL(12, 2) DEFAULT 0.00,
  total_price DECIMAL(12, 2) NOT NULL,
  aircraft_type TEXT NOT NULL,
  aircraft_tail_number TEXT,
  aircraft_details JSONB DEFAULT '{}'::jsonb,
  availability_confirmed BOOLEAN DEFAULT false,
  valid_until TIMESTAMPTZ,
  score DECIMAL(5, 2),
  ranking INTEGER,
  analysis_notes TEXT,
  status quote_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Store operator quotes with pricing, aircraft details, and AI analysis.

**Key Columns**:
- `score`: AI-generated score (0-100) based on price, aircraft quality, and availability
- `ranking`: Relative ranking among all quotes for the request
- `aircraft_details`: JSONB with aircraft specifications

**Aircraft Details Structure**:
```typescript
{
  year: 2020,
  range_nm: 7000,
  max_passengers: 14,
  amenities: ["wifi", "full_galley", "shower", "bedroom"],
  crew: 2,
  flight_attendant: true
}
```

**Status Values**:
- `pending` - Quote requested
- `received` - Quote received from operator
- `analyzed` - Quote analyzed by AI
- `accepted` - Quote accepted by client
- `rejected` - Quote rejected
- `expired` - Quote validity expired

**Constraints**:
- Base price: Must be > 0
- Total price: Must be > 0
- Score: 0-100 (if provided)
- Ranking: > 0 (if provided)

**Indexes**:
- `idx_quotes_request_id` on `request_id`
- `idx_quotes_operator_id` on `operator_id`
- `idx_quotes_status` on `status`
- `idx_quotes_score` on `score DESC NULLS LAST`
- `idx_quotes_ranking` on `ranking ASC NULLS LAST`

**RLS Policies**:
- SELECT: Users can view quotes for their own requests
- INSERT: Service role only (quotes from external systems)
- UPDATE: Users can update quotes for their own requests
- DELETE: Users can delete quotes for their own requests

---

#### 5. `workflow_states`
Request workflow state tracking for agent coordination.

```sql
CREATE TABLE workflow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  current_state request_status NOT NULL,
  previous_state request_status,
  agent_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  state_entered_at TIMESTAMPTZ DEFAULT NOW(),
  state_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Track workflow state machine transitions for debugging and monitoring.

**Key Columns**:
- `current_state`: Current workflow state
- `previous_state`: Previous state (for transition tracking)
- `state_duration_ms`: Time spent in previous state (milliseconds)
- `agent_id`: Which agent handled this state

**Metadata Structure**:
```typescript
{
  analysis_result: "Valid RFP, proceeding to client data fetch",
  avinode_rfp_created: true,
  operators_contacted: 15,
  quotes_expected: 15,
  quotes_received: 3
}
```

**Indexes**:
- `idx_workflow_states_request_id` on `request_id`
- `idx_workflow_states_current_state` on `current_state`
- `idx_workflow_states_agent_id` on `agent_id`
- `idx_workflow_states_created_at` on `created_at DESC`

**RLS Policies**:
- SELECT: Users can view workflow states for their own requests
- INSERT/UPDATE/DELETE: Service role only (managed by agents)

---

#### 6. `agent_executions`
Agent execution logs for monitoring and debugging.

```sql
CREATE TABLE agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  agent_type agent_type NOT NULL,
  agent_id TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  execution_time_ms INTEGER,
  status execution_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Comprehensive logging of all agent activities for monitoring and debugging.

**Key Columns**:
- `agent_type`: Type of agent (`orchestrator`, `client_data`, `flight_search`, etc.)
- `input_data`: Agent input parameters
- `output_data`: Agent execution results
- `execution_time_ms`: Total execution time

**Agent Types**:
- `orchestrator` - RFP analysis and task delegation
- `client_data` - Client profile retrieval
- `flight_search` - Flight search via Avinode
- `proposal_analysis` - Quote scoring and ranking
- `communication` - Email generation and sending
- `error_monitor` - Error monitoring and retries

**Execution Statuses**:
- `pending` - Queued for execution
- `running` - Currently executing
- `completed` - Successfully completed
- `failed` - Execution failed
- `timeout` - Execution timed out

**Indexes**:
- `idx_agent_executions_request_id` on `request_id`
- `idx_agent_executions_agent_type` on `agent_type`
- `idx_agent_executions_status` on `status`
- `idx_agent_executions_started_at` on `started_at DESC`

**RLS Policies**:
- SELECT: Users can view execution logs for their own requests
- INSERT/UPDATE/DELETE: Service role only (managed by agents)

---

## Enums

### `user_role`
```sql
CREATE TYPE user_role AS ENUM ('iso_agent', 'admin', 'operator');
```

### `margin_type`
```sql
CREATE TYPE margin_type AS ENUM ('percentage', 'fixed');
```

### `request_status`
```sql
CREATE TYPE request_status AS ENUM (
  'draft', 'pending', 'analyzing', 'fetching_client_data',
  'searching_flights', 'awaiting_quotes', 'analyzing_proposals',
  'generating_email', 'sending_proposal', 'completed', 'failed', 'cancelled'
);
```

### `quote_status`
```sql
CREATE TYPE quote_status AS ENUM (
  'pending', 'received', 'analyzed', 'accepted', 'rejected', 'expired'
);
```

### `execution_status`
```sql
CREATE TYPE execution_status AS ENUM (
  'pending', 'running', 'completed', 'failed', 'timeout'
);
```

### `agent_type`
```sql
CREATE TYPE agent_type AS ENUM (
  'orchestrator', 'client_data', 'flight_search',
  'proposal_analysis', 'communication', 'error_monitor'
);
```

---

## Functions

### `get_current_iso_agent_id()`
Returns the ISO agent ID for the currently authenticated user.

```sql
SELECT get_current_iso_agent_id();
```

### `is_admin()`
Returns true if the current user has admin role.

```sql
SELECT is_admin();
```

### `owns_resource(resource_agent_id UUID)`
Returns true if the current user owns the resource or is an admin.

```sql
SELECT owns_resource('a1111111-1111-1111-1111-111111111111');
```

### `update_updated_at_column()`
Trigger function that automatically updates the `updated_at` column.

---

## Triggers

All tables with `updated_at` columns have triggers that automatically update the timestamp on row updates:

- `update_iso_agents_updated_at`
- `update_client_profiles_updated_at`
- `update_requests_updated_at`
- `update_quotes_updated_at`

---

## Row Level Security (RLS)

### Overview
RLS is enabled on all tables to ensure multi-tenant data isolation.

### Key Principles
1. **Users can only access their own data** (filtered by `iso_agent_id`)
2. **Admins can access all data** (via `is_admin()` function)
3. **Service role bypasses RLS** (for system operations)

### Helper Functions
RLS policies use helper functions for consistent access control:

- `get_current_iso_agent_id()`: Gets current user's agent ID from JWT
- `is_admin()`: Checks if current user is admin
- `owns_resource(uuid)`: Checks if user owns resource or is admin

### Policy Patterns

#### Standard User Table Pattern
```sql
-- SELECT: Own data + admin override
CREATE POLICY "Users can view own X"
  ON table_name FOR SELECT
  USING (owns_resource(iso_agent_id));

-- INSERT: Own data only
CREATE POLICY "Users can create own X"
  ON table_name FOR INSERT
  WITH CHECK (iso_agent_id = get_current_iso_agent_id());
```

#### Service-Managed Table Pattern
```sql
-- Service role only (agents manage the data)
CREATE POLICY "Service role can insert X"
  ON table_name FOR INSERT
  WITH CHECK (false);
```

---

## Migrations

### Running Migrations

#### Local Development (via Supabase CLI)
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Run all migrations
supabase db push

# Run specific migration
supabase db push --file supabase/migrations/001_initial_schema.sql
```

#### Production (via Supabase Dashboard)
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of migration file
3. Execute SQL
4. Repeat for each migration in order

### Migration Order
Migrations must be executed in order:

1. `001_initial_schema.sql` - Create tables, enums, functions
2. `002_rls_policies.sql` - Enable RLS and create policies
3. `003_seed_data.sql` - Load development seed data (dev only)

### Rollback Strategy
To rollback a migration:

```sql
-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS agent_executions CASCADE;
DROP TABLE IF EXISTS workflow_states CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS client_profiles CASCADE;
DROP TABLE IF EXISTS iso_agents CASCADE;

-- Drop types
DROP TYPE IF EXISTS agent_type;
DROP TYPE IF EXISTS execution_status;
DROP TYPE IF EXISTS quote_status;
DROP TYPE IF EXISTS request_status;
DROP TYPE IF EXISTS margin_type;
DROP TYPE IF EXISTS user_role;
```

---

## TypeScript Integration

### Importing Types
```typescript
import {
  ISOAgent,
  Request,
  Quote,
  ClientProfile,
  RequestStatus,
  QuoteStatus,
  Database,
} from '@lib/types/database';
```

### Using with Supabase Client
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@lib/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Type-safe queries
const { data, error } = await supabase
  .from('requests')
  .select('*')
  .eq('status', RequestStatus.AWAITING_QUOTES);
```

### Inserting Data
```typescript
import type { RequestInsert } from '@lib/types/database';

const newRequest: RequestInsert = {
  iso_agent_id: 'agent-id',
  departure_airport: 'KTEB',
  arrival_airport: 'KLAX',
  departure_date: '2025-11-20T09:00:00Z',
  passengers: 8,
  status: RequestStatus.DRAFT,
};

const { data, error } = await supabase
  .from('requests')
  .insert(newRequest)
  .select()
  .single();
```

---

## Common Queries

### Get User's Active Requests
```sql
SELECT *
FROM requests
WHERE iso_agent_id = get_current_iso_agent_id()
AND status NOT IN ('completed', 'failed', 'cancelled')
ORDER BY created_at DESC;
```

### Get Request with All Quotes
```sql
SELECT
  r.*,
  q.id AS quote_id,
  q.operator_name,
  q.total_price,
  q.score,
  q.ranking,
  q.status AS quote_status
FROM requests r
LEFT JOIN quotes q ON q.request_id = r.id
WHERE r.id = 'request-id'
ORDER BY q.ranking ASC NULLS LAST;
```

### Get Top 3 Quotes for a Request
```sql
SELECT *
FROM quotes
WHERE request_id = 'request-id'
AND status IN ('received', 'analyzed')
ORDER BY ranking ASC NULLS LAST
LIMIT 3;
```

### Get Request Workflow History
```sql
SELECT
  current_state,
  previous_state,
  agent_id,
  state_duration_ms,
  state_entered_at
FROM workflow_states
WHERE request_id = 'request-id'
ORDER BY created_at ASC;
```

### Get Agent Performance Metrics
```sql
SELECT
  agent_type,
  COUNT(*) AS total_executions,
  AVG(execution_time_ms) AS avg_execution_time,
  COUNT(*) FILTER (WHERE status = 'completed') AS successful_executions,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_executions
FROM agent_executions
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY agent_type;
```

---

## Performance Optimization

### Indexes
All foreign keys have indexes for efficient joins.

### Query Optimization Tips
1. Use `SELECT *` sparingly - specify needed columns
2. Use `LIMIT` for pagination
3. Filter by indexed columns first (`iso_agent_id`, `status`, etc.)
4. Use `EXPLAIN ANALYZE` to identify slow queries

### Connection Pooling
Supabase automatically manages connection pooling. For high-traffic scenarios:
- Use Supabase connection pooler in transaction mode
- Consider using `supabaseUrl` with `:6543` port for pooling

---

## Security Best Practices

### RLS Testing
Always test RLS policies with different user roles:

```sql
-- Test as specific user
SET LOCAL request.jwt.claims.sub = 'user_test_agent_1';

-- Verify user can only see their own data
SELECT * FROM requests;

-- Reset
RESET request.jwt.claims.sub;
```

### SQL Injection Prevention
- Always use parameterized queries
- Never concatenate user input into SQL
- Use Supabase client's built-in query builder

### Data Validation
- Constraints enforce data integrity at database level
- Additional validation should occur at application level
- Use TypeScript types for compile-time safety

---

## Backup and Recovery

### Automated Backups
Supabase Pro plan includes:
- Daily automated backups (retained for 7 days)
- Point-in-time recovery (PITR) available

### Manual Backup
```bash
# Export entire database
supabase db dump -f backup.sql

# Restore from backup
supabase db reset
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

---

## Troubleshooting

### RLS Policy Issues
```sql
-- List all policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### Permission Issues
```sql
-- Check current role
SELECT current_user;

-- Check grants
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public';
```

### Foreign Key Constraint Violations
```sql
-- Check referential integrity
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f';
```

---

## Related Documentation

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [TypeScript Types](../lib/types/database.ts)

---

**For questions or issues, contact the development team.**
