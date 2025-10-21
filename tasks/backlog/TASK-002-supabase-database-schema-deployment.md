# TASK-002: Deploy Supabase Database Schema with Row Level Security

**Status**: 🟡 Active
**Priority**: HIGH
**Estimated Time**: 3-4 hours
**Assigned To**: Neo Agent
**Created**: October 20, 2025
**Due Date**: October 23, 2025

---

## 1. Task Overview

### Objective
Deploy the complete database schema to Supabase PostgreSQL database, including all tables, relationships, indexes, and Row Level Security (RLS) policies to ensure proper multi-tenant data isolation.

### User Story
```
As a system administrator
I want a secure, multi-tenant database schema deployed to Supabase
So that each broker's data is isolated and the system is ready for development
```

### Business Value
- **Data Security**: RLS ensures complete tenant isolation
- **Scalability**: Proper indexes for query performance
- **Compliance**: SOC 2 compliant data isolation
- **Development Readiness**: Enables immediate feature development
- **Data Integrity**: Foreign key constraints prevent orphaned records

### Success Metrics
- ✅ All 7 tables created successfully
- ✅ All foreign key relationships established
- ✅ RLS enabled on all tables
- ✅ RLS policies tested with test users
- ✅ Indexes created for query optimization
- ✅ Migration can be rolled back if needed

---

## 2. Requirements & Acceptance Criteria

### Functional Requirements

**FR-1: Table Schema**
- [ ] `users` table created with all columns
- [ ] `clients` table created with user_id foreign key
- [ ] `flight_requests` table created with workflow states
- [ ] `quotes` table created with operator data
- [ ] `proposals` table created with ranking logic
- [ ] `communications` table created for email logs
- [ ] `workflow_history` table created for state transitions

**FR-2: Relationships**
- [ ] `clients.user_id` → `users.id` (CASCADE delete)
- [ ] `flight_requests.user_id` → `users.id` (CASCADE delete)
- [ ] `flight_requests.client_id` → `clients.id` (SET NULL)
- [ ] `quotes.flight_request_id` → `flight_requests.id` (CASCADE delete)
- [ ] `proposals.flight_request_id` → `flight_requests.id` (CASCADE delete)
- [ ] `communications.flight_request_id` → `flight_requests.id` (CASCADE delete)
- [ ] `workflow_history.flight_request_id` → `flight_requests.id` (CASCADE delete)

**FR-3: Row Level Security**
- [ ] RLS enabled on all 7 tables
- [ ] SELECT policy: Users can only see their own data
- [ ] INSERT policy: Users can only insert with their own user_id
- [ ] UPDATE policy: Users can only update their own data
- [ ] DELETE policy: Users can only delete their own data

**FR-4: Indexes**
- [ ] Index on `users.clerk_user_id` (unique)
- [ ] Index on `clients.user_id`
- [ ] Index on `flight_requests.user_id`
- [ ] Index on `flight_requests.status`
- [ ] Index on `quotes.flight_request_id`
- [ ] Index on `proposals.flight_request_id`
- [ ] Composite index on `flight_requests.user_id, status`

**FR-5: Data Integrity**
- [ ] NOT NULL constraints on required fields
- [ ] CHECK constraints on enum values (status, role)
- [ ] DEFAULT values (created_at, updated_at, role)
- [ ] UNIQUE constraints (clerk_user_id, email)

### Non-Functional Requirements

**NFR-1: Performance**
- Query for user's flight requests <100ms
- All indexes created for common queries

**NFR-2: Security**
- RLS policies prevent cross-tenant data access
- Service role key separate from anon key
- Webhook access uses service role

**NFR-3: Maintainability**
- Migration files versioned
- Rollback script available
- Schema documented

### Acceptance Criteria

- [ ] ✅ Migration script executes without errors
- [ ] ✅ All tables exist in Supabase dashboard
- [ ] ✅ RLS policies visible in table settings
- [ ] ✅ Test users cannot access other users' data
- [ ] ✅ Foreign key constraints enforced
- [ ] ✅ Indexes created and visible
- [ ] ✅ Rollback script tested
- [ ] ✅ Schema documentation updated

---

## 3. Test-Driven Development (TDD) Approach

### Phase 1: Red - Write Failing Tests

**Step 1**: Create test database utilities

File: `__tests__/utils/database.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

export async function createTestClient() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  return supabase
}

export async function cleanupTestData(supabase: any, userId: string) {
  await supabase.from('users').delete().eq('clerk_user_id', userId)
}
```

**Step 2**: Write schema validation tests

File: `__tests__/integration/database/schema.test.ts`
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestClient, cleanupTestData } from '@/tests/utils/database'

describe('Database Schema', () => {
  let supabase: any
  const testUserId = 'test_user_001'

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  afterAll(async () => {
    await cleanupTestData(supabase, testUserId)
  })

  it('should have users table with correct columns', async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1)

    expect(error).toBeNull()
    expect(data).toBeDefined()

    // Check schema structure
    const schema = Object.keys(data[0] || {})
    expect(schema).toContain('id')
    expect(schema).toContain('clerk_user_id')
    expect(schema).toContain('email')
    expect(schema).toContain('full_name')
    expect(schema).toContain('role')
    expect(schema).toContain('created_at')
  })

  it('should have flight_requests table with correct columns', async () => {
    const { data, error } = await supabase
      .from('flight_requests')
      .select('*')
      .limit(1)

    expect(error).toBeNull()
    const schema = Object.keys(data[0] || {})
    expect(schema).toContain('id')
    expect(schema).toContain('user_id')
    expect(schema).toContain('client_id')
    expect(schema).toContain('departure_airport')
    expect(schema).toContain('arrival_airport')
    expect(schema).toContain('departure_date')
    expect(schema).toContain('passengers')
    expect(schema).toContain('status')
  })
})
```

**Step 3**: Write RLS policy tests

File: `__tests__/integration/database/rls.test.ts`
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createTestClient } from '@/tests/utils/database'

describe('Row Level Security Policies', () => {
  let adminClient: any
  let user1Client: any
  let user2Client: any
  let user1Id: string
  let user2Id: string

  beforeAll(async () => {
    adminClient = await createTestClient()

    // Create test users
    const { data: user1 } = await adminClient
      .from('users')
      .insert({
        clerk_user_id: 'test_user_001',
        email: 'user1@test.com',
        full_name: 'Test User 1',
        role: 'broker',
      })
      .select()
      .single()

    const { data: user2 } = await adminClient
      .from('users')
      .insert({
        clerk_user_id: 'test_user_002',
        email: 'user2@test.com',
        full_name: 'Test User 2',
        role: 'broker',
      })
      .select()
      .single()

    user1Id = user1.id
    user2Id = user2.id

    // Create clients with anon key (RLS enforced)
    user1Client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    user2Client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  })

  afterAll(async () => {
    await adminClient.from('users').delete().eq('id', user1Id)
    await adminClient.from('users').delete().eq('id', user2Id)
  })

  it('should prevent user1 from accessing user2 flight requests', async () => {
    // User 2 creates a flight request
    const { data: request } = await adminClient
      .from('flight_requests')
      .insert({
        user_id: user2Id,
        departure_airport: 'TEB',
        arrival_airport: 'VNY',
        departure_date: '2025-11-01',
        passengers: 4,
        status: 'pending',
      })
      .select()
      .single()

    // User 1 tries to access it (should fail)
    const { data, error } = await user1Client
      .from('flight_requests')
      .select('*')
      .eq('id', request.id)
      .single()

    expect(data).toBeNull()
    expect(error).toBeDefined()
  })

  it('should allow user to access their own flight requests', async () => {
    // User 1 creates a flight request
    const { data: request } = await adminClient
      .from('flight_requests')
      .insert({
        user_id: user1Id,
        departure_airport: 'TEB',
        arrival_airport: 'VNY',
        departure_date: '2025-11-01',
        passengers: 4,
        status: 'pending',
      })
      .select()
      .single()

    // User 1 can access it
    const { data, error } = await user1Client
      .from('flight_requests')
      .select('*')
      .eq('id', request.id)
      .single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.id).toBe(request.id)
  })

  it('should prevent user from updating another users data', async () => {
    const { data: request } = await adminClient
      .from('flight_requests')
      .insert({
        user_id: user2Id,
        departure_airport: 'TEB',
        arrival_airport: 'VNY',
        departure_date: '2025-11-01',
        passengers: 4,
        status: 'pending',
      })
      .select()
      .single()

    // User 1 tries to update user 2's request (should fail)
    const { error } = await user1Client
      .from('flight_requests')
      .update({ passengers: 10 })
      .eq('id', request.id)

    expect(error).toBeDefined()
  })
})
```

**Commit Tests**:
```bash
git add __tests__/
git commit -m "test(db): add schema and RLS policy tests

- Schema structure validation tests
- RLS policy isolation tests
- Foreign key constraint tests
- Tests currently failing (Red phase)

Related to: TASK-002"
```

### Phase 2: Green - Write Migration to Pass Tests

**Step 1**: Create migration file

File: `lib/database/migrations/001_initial_schema.sql`
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'broker' CHECK (role IN ('broker', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_users_email ON users(email);

-- RLS Policies for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (clerk_user_id = auth.jwt() ->> 'sub');

-- ============================================
-- CLIENTS TABLE
-- ============================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_user_id ON clients(user_id);

-- RLS Policies for clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clients"
  ON clients FOR SELECT
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can insert their own clients"
  ON clients FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can update their own clients"
  ON clients FOR UPDATE
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can delete their own clients"
  ON clients FOR DELETE
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
  ));

-- ============================================
-- FLIGHT_REQUESTS TABLE
-- ============================================
CREATE TABLE flight_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  departure_airport TEXT NOT NULL,
  arrival_airport TEXT NOT NULL,
  departure_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ,
  passengers INTEGER NOT NULL CHECK (passengers > 0),
  aircraft_preferences JSONB DEFAULT '{}',
  budget_range JSONB,
  special_requests TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'analyzing',
      'searching',
      'quotes_received',
      'proposal_ready',
      'sent_to_client',
      'client_reviewing',
      'accepted',
      'rejected',
      'expired',
      'error'
    )
  ),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flight_requests_user_id ON flight_requests(user_id);
CREATE INDEX idx_flight_requests_status ON flight_requests(status);
CREATE INDEX idx_flight_requests_user_status ON flight_requests(user_id, status);
CREATE INDEX idx_flight_requests_client_id ON flight_requests(client_id);

-- RLS Policies for flight_requests
ALTER TABLE flight_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
  ON flight_requests FOR SELECT
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can insert their own requests"
  ON flight_requests FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can update their own requests"
  ON flight_requests FOR UPDATE
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can delete their own requests"
  ON flight_requests FOR DELETE
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
  ));

-- ============================================
-- QUOTES TABLE
-- ============================================
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_request_id UUID NOT NULL REFERENCES flight_requests(id) ON DELETE CASCADE,
  operator_name TEXT NOT NULL,
  aircraft_type TEXT NOT NULL,
  aircraft_tail_number TEXT,
  base_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  availability TEXT NOT NULL CHECK (availability IN ('confirmed', 'pending', 'unavailable')),
  specifications JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotes_flight_request_id ON quotes(flight_request_id);

-- RLS Policies for quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quotes for their requests"
  ON quotes FOR SELECT
  USING (flight_request_id IN (
    SELECT id FROM flight_requests
    WHERE user_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  ));

-- ============================================
-- PROPOSALS TABLE
-- ============================================
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_request_id UUID NOT NULL REFERENCES flight_requests(id) ON DELETE CASCADE,
  selected_quotes JSONB NOT NULL,
  ranking_analysis JSONB,
  total_options INTEGER NOT NULL,
  recommendation TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proposals_flight_request_id ON proposals(flight_request_id);

-- RLS Policies for proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view proposals for their requests"
  ON proposals FOR SELECT
  USING (flight_request_id IN (
    SELECT id FROM flight_requests
    WHERE user_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  ));

-- ============================================
-- COMMUNICATIONS TABLE
-- ============================================
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_request_id UUID NOT NULL REFERENCES flight_requests(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'notification')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  recipient TEXT,
  subject TEXT,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_communications_flight_request_id ON communications(flight_request_id);

-- RLS Policies for communications
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view communications for their requests"
  ON communications FOR SELECT
  USING (flight_request_id IN (
    SELECT id FROM flight_requests
    WHERE user_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  ));

-- ============================================
-- WORKFLOW_HISTORY TABLE
-- ============================================
CREATE TABLE workflow_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_request_id UUID NOT NULL REFERENCES flight_requests(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  agent_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_history_flight_request_id ON workflow_history(flight_request_id);

-- RLS Policies for workflow_history
ALTER TABLE workflow_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow history for their requests"
  ON workflow_history FOR SELECT
  USING (flight_request_id IN (
    SELECT id FROM flight_requests
    WHERE user_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  ));

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flight_requests_updated_at
  BEFORE UPDATE ON flight_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Step 2**: Create deployment script

File: `lib/database/deploy-schema.ts`
```typescript
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

async function deploySchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials in environment variables')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('📦 Reading migration file...')
  const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql')
  const migration = fs.readFileSync(migrationPath, 'utf-8')

  console.log('🚀 Deploying schema to Supabase...')

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migration,
    })

    if (error) {
      throw error
    }

    console.log('✅ Schema deployed successfully!')
    console.log('✅ All tables created')
    console.log('✅ RLS policies applied')
    console.log('✅ Indexes created')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

deploySchema()
```

**Step 3**: Create rollback script

File: `lib/database/rollback-schema.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

async function rollbackSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('⚠️  Rolling back schema...')

  const rollbackSQL = `
    DROP TABLE IF EXISTS workflow_history CASCADE;
    DROP TABLE IF EXISTS communications CASCADE;
    DROP TABLE IF EXISTS proposals CASCADE;
    DROP TABLE IF EXISTS quotes CASCADE;
    DROP TABLE IF EXISTS flight_requests CASCADE;
    DROP TABLE IF EXISTS clients CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
  `

  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: rollbackSQL,
    })

    if (error) {
      throw error
    }

    console.log('✅ Schema rolled back successfully')
  } catch (error) {
    console.error('❌ Rollback failed:', error)
    throw error
  }
}

rollbackSchema()
```

**Commit Implementation**:
```bash
git add lib/database/
git commit -m "feat(db): create initial database schema with RLS

- Add migration file with all 7 tables
- Implement Row Level Security policies
- Add indexes for query optimization
- Create deployment and rollback scripts
- All tests now passing (Green phase)

Implements: TASK-002"
```

### Phase 3: Blue - Refactor and Improve

**Step 1**: Add schema documentation

File: `lib/database/README.md`
```markdown
# Database Schema

## Tables

### users
Primary table for user accounts synced from Clerk.

### clients
Client profiles managed by brokers.

### flight_requests
RFP requests with workflow status tracking.

### quotes
Operator quotes for flight requests.

### proposals
Generated proposals with ranked options.

### communications
Email and communication logs.

### workflow_history
Audit trail of workflow state transitions.

## Row Level Security

All tables have RLS policies that filter by `clerk_user_id` from JWT token.
```

**Step 2**: Add migration helper utilities

File: `lib/database/migration-utils.ts`
```typescript
/**
 * Executes SQL migration file in Supabase
 * @param {string} filepath - Path to .sql migration file
 * @returns {Promise<void>}
 */
export async function executeMigration(filepath: string): Promise<void> {
  // Implementation
}

/**
 * Verifies all tables exist in database
 * @param {string[]} tableNames - Array of expected table names
 * @returns {Promise<boolean>}
 */
export async function verifyTables(tableNames: string[]): Promise<boolean> {
  // Implementation
}
```

**Commit Refactoring**:
```bash
git add .
git commit -m "refactor(db): add documentation and helper utilities

- Document database schema and RLS policies
- Add migration helper utilities
- Improve error handling in deployment scripts
- Add JSDoc comments
- Tests still passing (Blue phase)

Related to: TASK-002"
```

---

## 4. Implementation Steps

### Step 1: Supabase Project Setup
- [ ] Sign up at supabase.com
- [ ] Create new project "jetvision-assistant-db"
- [ ] Choose region closest to users
- [ ] Save database password securely
- [ ] Copy project URL and anon key
- [ ] Copy service role key
- [ ] Add to `.env.local`

### Step 2: Enable Required Extensions
- [ ] Navigate to Database → Extensions in Supabase dashboard
- [ ] Enable `uuid-ossp` extension

### Step 3: Create Migration Files
- [ ] Create `lib/database/migrations/` directory
- [ ] Write `001_initial_schema.sql` migration
- [ ] Review SQL for syntax errors
- [ ] Test migration locally with Supabase CLI (if available)

### Step 4: Deploy Schema
- [ ] Run deployment script: `npx tsx lib/database/deploy-schema.ts`
- [ ] Verify tables created in Supabase dashboard
- [ ] Verify RLS policies enabled
- [ ] Verify indexes created

### Step 5: Test RLS Policies
- [ ] Create two test users with different clerk_user_id
- [ ] Insert test data for each user
- [ ] Verify user A cannot access user B's data
- [ ] Test SELECT, INSERT, UPDATE, DELETE operations
- [ ] Clean up test data

### Step 6: Documentation
- [ ] Create database README
- [ ] Document each table schema
- [ ] Document RLS policies
- [ ] Add ERD diagram (optional)

---

## 5. Git Workflow

### Branch Creation
```bash
git checkout main
git pull origin main
git checkout -b feature/TASK-002-supabase-database-schema
```

### Commit Messages
```bash
# Tests (Red phase)
git commit -m "test(db): add schema and RLS validation tests"

# Implementation (Green phase)
git commit -m "feat(db): create initial database schema with RLS"

# Refactoring (Blue phase)
git commit -m "refactor(db): add documentation and utilities"
```

### Pull Request
```bash
git push -u origin feature/TASK-002-supabase-database-schema
# Create PR: [TASK-002] Deploy Supabase database schema with RLS
```

---

## 6. Code Review Checklist

### Functionality
- [ ] All 7 tables created successfully
- [ ] RLS enabled on all tables
- [ ] Foreign key relationships correct
- [ ] Indexes created on all foreign keys
- [ ] Migration script executes without errors
- [ ] Rollback script works correctly

### Data Integrity
- [ ] NOT NULL constraints on required fields
- [ ] CHECK constraints on enum values
- [ ] DEFAULT values configured
- [ ] UNIQUE constraints present
- [ ] CASCADE rules appropriate

### Security
- [ ] RLS policies prevent cross-tenant access
- [ ] Service role key only used server-side
- [ ] Anon key used for client access
- [ ] JWT validation in RLS policies

### Performance
- [ ] Indexes on all foreign keys
- [ ] Composite indexes on common queries
- [ ] No redundant indexes

### Documentation
- [ ] Schema documented
- [ ] RLS policies explained
- [ ] Deployment steps clear
- [ ] Rollback procedure documented

---

## 7. Testing Requirements

### Integration Tests
```bash
npm run test __tests__/integration/database
```

**Test Cases**:
- [ ] All tables exist
- [ ] RLS policies enforce isolation
- [ ] Foreign key constraints work
- [ ] Cascade deletes work correctly
- [ ] Indexes exist and are used

### Manual Testing
- [ ] Create test user A
- [ ] Create flight request for user A
- [ ] Create test user B
- [ ] Verify user B cannot see user A's request
- [ ] Test all CRUD operations
- [ ] Clean up test data

---

## 8. Definition of Done

- [ ] Migration executed successfully
- [ ] All tests passing
- [ ] RLS policies verified
- [ ] Documentation complete
- [ ] PR approved and merged
- [ ] Task moved to `tasks/completed/`

---

## 9. Resources & References

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- `docs/PRD.md` - Database schema requirements

---

## 10. Notes & Questions

### Dependencies
- **Depends on**: Supabase account creation
- **Blocks**: TASK-001 (Clerk needs users table)

---

**Task Created By**: Development Team
**Last Updated**: October 20, 2025
