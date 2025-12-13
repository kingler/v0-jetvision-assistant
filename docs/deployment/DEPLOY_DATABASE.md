# Database Deployment Guide - JetVision

## Status: ⚠️ Migrations Need to be Deployed

The database schema has been designed and migration files are ready, but they need to be executed on the Supabase instance.

---

## Quick Deploy (Supabase Dashboard)

### Step 1: Open SQL Editor

Go to: **[Supabase SQL Editor](https://supabase.com/dashboard/project/sbzaevawnjlrsjsuevli/sql/new)**

### Step 2: Execute Migrations in Order

Execute each migration file in the SQL Editor:

#### 1. Initial Schema (`001_initial_schema.sql`)
```bash
# Copy contents from:
supabase/migrations/001_initial_schema.sql
```
- Creates 6 core tables
- Creates 6 enums
- Adds constraints and indexes

#### 2. RLS Policies (`002_rls_policies.sql`)
```bash
# Copy contents from:
supabase/migrations/002_rls_policies.sql
```
- Enables RLS on all tables
- Creates 24 security policies
- Adds helper functions

#### 3. Seed Data (`003_seed_data.sql`)
```bash
# Copy contents from:
supabase/migrations/003_seed_data.sql
```
- Creates 3 test users
- Creates 3 client profiles
- Creates 3 test requests

### Step 3: Verify Deployment

Run the verification script:
```bash
npm run db:verify
```

---

## Alternative: Supabase CLI Deploy

If you have Supabase CLI access token:

```bash
# Set access token
export SUPABASE_ACCESS_TOKEN=your_token_here

# Link project
supabase link --project-ref sbzaevawnjlrsjsuevli

# Push migrations
supabase db push

# Or reset database (WARNING: deletes all data)
supabase db reset --linked
```

---

## Verification Checklist

After deployment, verify:

- [ ] All 6 tables created
  - `iso_agents`
  - `client_profiles`
  - `requests`
  - `quotes`
  - `workflow_states`
  - `agent_executions`

- [ ] All enums created
  - `request_status`
  - `quote_status`
  - `user_role`
  - `margin_type`
  - `agent_type`
  - `execution_status`

- [ ] RLS enabled on all tables
- [ ] Seed data loaded (3 users, 3 clients, 3 requests)

---

## Troubleshooting

### Error: "Could not find the table in schema cache"
**Solution**: Migrations haven't been run yet. Execute migration files in SQL Editor.

### Error: "Permission denied"
**Solution**: Make sure you're using the service role key, not the anon key.

### Error: "Relation already exists"
**Solution**: Table was already created. You can skip that migration or drop and recreate.

---

## Project Details

- **Project Ref**: `sbzaevawnjlrsjsuevli`
- **Project URL**: `https://sbzaevawnjlrsjsuevli.supabase.co`
- **Dashboard**: `https://supabase.com/dashboard/project/sbzaevawnjlrsjsuevli`

---

## After Deployment

Once migrations are deployed:

1. Run verification: `npm run db:verify`
2. Test RLS policies: `npm run db:test-rls`
3. Test agent operations: `npm run db:test-agents`
4. Continue to Phase 2: MCP Server implementations

---

**Last Updated**: 2025-10-21
