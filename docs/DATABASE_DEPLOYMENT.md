# Database Schema Deployment Guide

**Task**: TASK-002: Supabase Database Schema Deployment
**Last Updated**: 2025-11-01
**Status**: Ready for deployment

---

## Overview

This guide walks through deploying the Jetvision AI Assistant database schema to Supabase. The schema includes:

- 7 tables with complete structure
- Row Level Security (RLS) policies on all tables
- Foreign key constraints
- Indexes for query optimization
- Automatic timestamp triggers

---

## Prerequisites

Before deploying, ensure you have:

- [x] Completed TASK-003 (Environment Configuration)
- [x] Supabase project created
- [x] Environment variables configured in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_KEY`
- [x] Database connection verified

---

## Deployment Methods

### Option 1: Supabase Dashboard (Recommended for First Deployment)

1. **Open Supabase Dashboard**
   - Navigate to https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Execute Schema**
   - Open `lib/supabase/schema.sql`
   - Copy the entire file contents
   - Paste into the SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

4. **Verify Deployment**
   - Check for success message
   - Navigate to "Database" > "Tables"
   - Verify all 7 tables are listed:
     - users
     - clients
     - flight_requests
     - quotes
     - proposals
     - communications
     - workflow_history

5. **Verify RLS Policies**
   - Navigate to "Authentication" > "Policies"
   - Each table should show multiple policies
   - Verify policies are enabled (green status)

### Option 2: Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref <your-project-ref>

# Push schema to Supabase
supabase db push

# Or execute the schema file directly
supabase db execute -f lib/supabase/schema.sql
```

---

## Post-Deployment Steps

### 1. Generate TypeScript Types

After schema deployment, regenerate TypeScript types to ensure they match your actual database:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > lib/types/database.ts
```

**Note**: The existing `database.ts` already has types that match the schema. Only regenerate if you make schema changes.

### 2. Test Database Connection

Run the test script to verify all tables are accessible:

```bash
npx tsx scripts/test-db-connection.ts
```

Expected output:
```
✅ users table accessible
✅ clients table accessible
✅ flight_requests table accessible
✅ quotes table accessible
✅ proposals table accessible
✅ communications table accessible
✅ workflow_history table accessible
```

### 3. Run Integration Tests

```bash
npm run test:integration -- database
```

Tests verify:
- All tables exist
- Foreign key relationships work
- RLS policies enforce data isolation
- CRUD operations function correctly

### 4. Verify RLS Policies

Test RLS manually in the Supabase SQL Editor:

```sql
-- This should return only the current user's data
SELECT * FROM flight_requests;

-- This should fail (no permission to insert without auth)
INSERT INTO users (clerk_user_id, email) VALUES ('test', 'test@test.com');
```

---

## Database Schema Overview

### Table: users

Core user profiles linked to Clerk authentication.

**Columns**:
- `id` (UUID, PK) - Internal user ID
- `clerk_user_id` (TEXT, UNIQUE) - Clerk authentication ID
- `email` (TEXT) - User email
- `full_name` (TEXT, nullable) - User's full name
- `role` (TEXT) - Either 'iso_agent' or 'admin'
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**RLS Policies**:
- Users can read their own profile
- Users can update their own profile

### Table: clients

Customer profiles managed by ISO agents.

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id) - Owner
- `name` (TEXT) - Client name
- `email` (TEXT, nullable)
- `phone` (TEXT, nullable)
- `preferences` (JSONB) - Client preferences
- `is_returning` (BOOLEAN) - Returning client flag
- `created_at`, `updated_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can manage only their own clients

### Table: flight_requests

RFP requests from clients.

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id) - Request owner
- `client_id` (UUID, FK → clients.id, nullable) - Associated client
- `departure_airport` (TEXT) - Origin airport code
- `arrival_airport` (TEXT) - Destination airport code
- `passengers` (INTEGER, CHECK 1-19) - Passenger count
- `departure_date` (DATE) - Flight date
- `return_date` (DATE, nullable) - Return flight date
- `status` (TEXT, CHECK) - Workflow status
- `current_step` (INTEGER) - Current workflow step
- `total_steps` (INTEGER) - Total workflow steps
- `metadata` (JSONB) - Additional data
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Status Values**:
- `new`, `analyzing`, `searching`, `quotes_received`, `proposal_ready`, `sent`, `accepted`, `completed`, `cancelled`

**RLS Policies**:
- Users can manage only their own requests

### Table: quotes

Operator quotes for flight requests.

**Columns**:
- `id` (UUID, PK)
- `request_id` (UUID, FK → flight_requests.id) - Associated request
- `operator_name` (TEXT) - Operator company name
- `aircraft_type` (TEXT) - Aircraft model
- `base_price` (NUMERIC) - Quote price
- `response_time` (INTEGER, nullable) - Response time in minutes
- `specifications` (JSONB) - Aircraft specs
- `rating` (NUMERIC, nullable, CHECK 0-5) - Operator rating
- `score` (NUMERIC, nullable) - Calculated ranking score
- `created_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can view quotes for their own requests
- System can insert quotes for user requests

### Table: proposals

Finalized proposals sent to clients.

**Columns**:
- `id` (UUID, PK)
- `request_id` (UUID, FK → flight_requests.id)
- `quote_id` (UUID, FK → quotes.id)
- `markup_type` (TEXT, CHECK) - 'fixed' or 'percentage'
- `markup_value` (NUMERIC) - Markup amount
- `total_price` (NUMERIC) - Final price to client
- `status` (TEXT, CHECK) - 'draft', 'sent', 'accepted', 'rejected'
- `sent_at` (TIMESTAMPTZ, nullable) - When proposal was sent
- `created_at`, `updated_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can manage proposals for their own requests

### Table: communications

Email/SMS communication tracking.

**Columns**:
- `id` (UUID, PK)
- `request_id` (UUID, FK → flight_requests.id)
- `type` (TEXT, CHECK) - 'email' or 'sms'
- `recipient` (TEXT) - Recipient address
- `subject` (TEXT, nullable) - Email subject
- `body` (TEXT) - Message body
- `attachments` (JSONB) - Attachment metadata
- `status` (TEXT, CHECK) - 'queued', 'sent', 'delivered', 'failed'
- `error_message` (TEXT, nullable) - Error details if failed
- `sent_at` (TIMESTAMPTZ, nullable)
- `created_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can view communications for their own requests
- System can insert communications for user requests

### Table: workflow_history

Audit trail for RFP workflow state changes.

**Columns**:
- `id` (UUID, PK)
- `request_id` (UUID, FK → flight_requests.id)
- `from_state` (TEXT, nullable) - Previous state
- `to_state` (TEXT) - New state
- `triggered_by` (TEXT) - Agent name that triggered change
- `metadata` (JSONB) - Additional context
- `created_at` (TIMESTAMPTZ)

**RLS Policies**:
- Users can view workflow history for their own requests
- System can insert workflow history for user requests

---

## Indexes

The schema includes indexes on:

- Foreign keys: All foreign key columns are indexed for join performance
- Status columns: Frequently filtered columns (status, created_at)
- Lookup columns: User IDs, clerk_user_id, email

---

## Triggers

Automatic `updated_at` triggers on:
- users
- clients
- flight_requests
- proposals

These automatically update the `updated_at` timestamp on every UPDATE.

---

## Rollback

If you need to rollback the schema deployment:

```sql
-- Drop all tables (this will delete all data!)
DROP TABLE IF EXISTS workflow_history CASCADE;
DROP TABLE IF EXISTS communications CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS flight_requests CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column();
```

**⚠️ WARNING**: This will permanently delete all data in these tables!

---

## Troubleshooting

### Issue: "relation already exists"

**Solution**: Tables already exist. Either:
1. Drop existing tables first (see Rollback section)
2. Or use `IF NOT EXISTS` clauses (already in schema.sql)

### Issue: RLS policies blocking queries

**Solution**: Verify authentication is working:
1. Check Clerk JWT is being passed to Supabase
2. Verify `auth.uid()` returns the correct clerk_user_id
3. Test with service role key temporarily (bypasses RLS)

### Issue: Foreign key constraint violation

**Solution**: Ensure parent records exist before inserting child records:
1. Create user first
2. Then create flight_requests
3. Then create quotes/proposals

### Issue: TypeScript errors after deployment

**Solution**: Regenerate types from actual database:
```bash
npx supabase gen types typescript --project-id <your-project-ref> > lib/types/database.ts
```

---

## Next Steps

After successful deployment:

1. ✅ Verify all tables accessible
2. ✅ Test RLS policies
3. ✅ Run integration tests
4. ⏭️ Proceed to TASK-001: Clerk Authentication Integration
5. ⏭️ Then TASK-004: Redis and BullMQ Setup

---

## Support

If you encounter issues:

1. Check the Supabase dashboard logs
2. Run the test connection script
3. Verify environment variables are set correctly
4. Review the RLS policy documentation: https://supabase.com/docs/guides/auth/row-level-security

---

**Deployment Complete!** 🎉

The database is now ready to support the Jetvision AI Assistant application.
