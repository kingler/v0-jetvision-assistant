# JetVision Database - Quick Reference

## 📊 Database Status: ✅ **FULLY OPERATIONAL**

**Project**: jetvision-assistant-db
**Platform**: Supabase (PostgreSQL 17)
**Security**: Row Level Security (RLS) Enabled
**Tables**: 7/7 Deployed (100% Complete)

---

## 🚀 Quick Commands

### Check Database Schema
```bash
npx tsx scripts/check-db-schema.ts
```

### Connect to Database
```bash
# Using psql
PGPASSWORD=<password> psql -h db.sbzaevawnjlrsjsuevli.supabase.co -p 5432 -U postgres -d postgres

# Using Supabase CLI (requires login)
supabase db remote --project-ref sbzaevawnjlrsjsuevli
```

### Apply New Migrations
```bash
# Using psql
PGPASSWORD=<password> psql -h db.sbzaevawnjlrsjsuevli.supabase.co \
  -p 5432 -U postgres -d postgres \
  -f supabase/migrations/<migration-file>.sql

# Using Supabase CLI (requires login)
supabase login
supabase link --project-ref sbzaevawnjlrsjsuevli
supabase db push
```

---

## 📋 Tables Overview

| # | Table | Purpose | Rows | Status |
|---|-------|---------|------|--------|
| 1 | `iso_agents` | Sales reps & admin staff | 4 | ✅ |
| 2 | `client_profiles` | Customer information | 3 | ✅ |
| 3 | `requests` | Flight RFQ/trip data | 3 | ✅ |
| 4 | `quotes` | Operator proposals | 4 | ✅ |
| 5 | `workflow_states` | Workflow tracking | 7 | ✅ |
| 6 | `agent_executions` | Agent logs | 5 | ✅ |
| 7 | `proposals` | PDF proposals | 0 | ✅ **NEW** |

---

## 🔐 Security Features

- ✅ **Row Level Security (RLS)** enabled on all tables
- ✅ **Multi-tenant isolation** - Users can only access their own data
- ✅ **Admin override** - Admins have full access
- ✅ **Clerk Authentication** integration
- ✅ **Service role bypass** for agent operations

---

## 📚 Documentation

### Comprehensive Guides
- [`DATABASE_SCHEMA_AUDIT.md`](./DATABASE_SCHEMA_AUDIT.md) - Complete schema audit report
- [`SUPABASE_INVESTIGATION_SUMMARY.md`](./SUPABASE_INVESTIGATION_SUMMARY.md) - Investigation results
- [`DATABASE_SCHEMA_DIAGRAM.md`](./DATABASE_SCHEMA_DIAGRAM.md) - Visual schema diagram

### Migration Files
- [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql) - Core tables
- [`supabase/migrations/002_rls_policies.sql`](./supabase/migrations/002_rls_policies.sql) - Security policies
- [`supabase/migrations/003_seed_data.sql`](./supabase/migrations/003_seed_data.sql) - Sample data
- [`supabase/migrations/004_proposals_table.sql`](./supabase/migrations/004_proposals_table.sql) - Proposals table ✨

---

## 🎯 Next Steps

### 1. Configure Supabase Storage
Create a storage bucket for PDF proposals:

```
1. Go to Supabase Dashboard → Storage
2. Create new bucket: "proposal-documents"
3. Set bucket to private (authenticated users only)
4. Configure RLS policies for bucket access
```

### 2. Update Communication Agent
Modify `CommunicationAgent` to:
- Generate PDF proposals
- Upload to Supabase Storage
- Create records in `proposals` table
- Track email delivery

### 3. Test Proposal Workflow
```typescript
// Generate proposal number
const proposalNumber = await supabase.rpc('generate_proposal_number');
// Returns: 'PROP-2025-001'

// Create proposal
await supabase.from('proposals').insert({
  request_id: '...',
  iso_agent_id: '...',
  quote_id: '...',
  proposal_number: proposalNumber,
  // ... other fields
});
```

---

## 🔍 Sample Queries

### Get all requests for current user
```sql
SELECT * FROM requests
WHERE iso_agent_id = get_current_iso_agent_id()
ORDER BY created_at DESC;
```

### Get quotes with analysis for a request
```sql
SELECT * FROM quotes
WHERE request_id = '...'
ORDER BY ranking ASC;
```

### Get proposals with client details
```sql
SELECT
  p.*,
  r.departure_airport,
  r.arrival_airport,
  c.company_name,
  c.contact_name
FROM proposals p
JOIN requests r ON p.request_id = r.id
JOIN client_profiles c ON p.client_profile_id = c.id
WHERE p.iso_agent_id = get_current_iso_agent_id()
ORDER BY p.created_at DESC;
```

### Generate next proposal number
```sql
SELECT generate_proposal_number();
-- Returns: 'PROP-2025-001'
```

---

## 🛠️ Utilities

### Test Database Connection
```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('iso_agents')
  .select('*')
  .limit(1);

console.log(error ? '❌ Connection failed' : '✅ Connected');
```

### Check Table Row Counts
```bash
npx tsx scripts/check-db-schema.ts
```

---

## 📞 Support

- **Supabase Dashboard**: https://supabase.com/dashboard/project/sbzaevawnjlrsjsuevli
- **Database URL**: https://sbzaevawnjlrsjsuevli.supabase.co
- **Documentation**: See files listed above

---

**Last Updated**: 2025-10-24
**Database Version**: PostgreSQL 17
**Schema Version**: 004 (Proposals table added)
