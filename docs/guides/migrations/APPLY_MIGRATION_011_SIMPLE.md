# Apply Migration 011: Add Customer & Sales Rep Roles (SIMPLE VERSION)

**Status**: ✅ Ready to Apply
**Date**: 2025-11-01
**Complexity**: LOW (no table rename, minimal changes)

---

## What This Does

This is a **SIMPLIFIED** migration that:
- ✅ **Keeps** the `iso_agents` table (no rename!)
- ✅ **Adds** new roles: `sales_rep` and `customer`
- ✅ **Keeps** existing roles: `iso_agent`, `admin`, `operator`
- ✅ **No breaking changes** - all existing data stays the same

### Why This Is Better:
- ❌ No table rename = No code changes needed
- ❌ No foreign key updates = No risk
- ✅ Just adds flexibility for new role types
- ✅ Can apply in 30 seconds
- ✅ Zero downtime

---

## Quick Apply (30 Seconds)

### Step 1: Copy Migration SQL

```bash
cat supabase/migrations/011_add_customer_role.sql | pbcopy
```

### Step 2: Apply in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Click "New Query"
3. **Paste** the migration SQL
4. Click **Run**

### Step 3: Verify Success

You should see:
```
NOTICE:  ========================================
NOTICE:  Migration 011 Completed Successfully
NOTICE:  ========================================
NOTICE:  Current Role Distribution:
NOTICE:    - ISO Agents: 7
NOTICE:    - Sales Reps: 0
NOTICE:    - Admins: 2
NOTICE:    - Customers: 0
NOTICE:    - Operators: 0
NOTICE:  Total Users: 9
NOTICE:  ========================================
NOTICE:  New roles available: sales_rep, customer
NOTICE:  Table name: iso_agents (unchanged)
NOTICE:  ========================================
```

---

## What Changed

### Before Migration:
```typescript
// Only 3 roles supported
type UserRole = 'iso_agent' | 'admin' | 'operator';
```

### After Migration:
```typescript
// Now 5 roles supported
type UserRole = 'iso_agent' | 'sales_rep' | 'admin' | 'customer' | 'operator';
```

### Table Name:
- ✅ **Still `iso_agents`** (unchanged)

### Existing Users:
- ✅ **All keep their current roles** (no changes)
- ✅ **All data preserved** exactly as is

---

## Code Already Updated

I've already updated the application code to support all 5 roles:

### ✅ Updated Files:
1. **`scripts/clerk/sync-users.ts`** - Now supports all 5 roles
2. **`app/api/webhooks/clerk/route.ts`** - Now supports all 5 roles

### What This Means:
- ✅ New users can be created with any of the 5 roles
- ✅ Existing `iso_agent` users continue working
- ✅ You can now create `customer` and `sales_rep` users
- ✅ No code changes needed!

---

## Using the New Roles

### Option 1: Via Clerk Metadata

When creating a user in Clerk, set their public metadata:

```json
{
  "role": "customer"
}
```

Valid options:
- `iso_agent` - ISO sales agents (default)
- `sales_rep` - Generic sales reps
- `admin` - Administrators
- `customer` - End customers
- `operator` - System operators

### Option 2: Via Supabase SQL

Update an existing user's role:

```sql
-- Change an iso_agent to sales_rep
UPDATE iso_agents
SET role = 'sales_rep'
WHERE email = 'example@domain.com';

-- Change a user to customer
UPDATE iso_agents
SET role = 'customer'
WHERE email = 'customer@example.com';
```

### Option 3: Via Sync Script

The sync script will now respect the role from Clerk metadata:

```bash
# Will sync with whatever role is set in Clerk
npx tsx scripts/clerk/sync-users.ts
```

---

## Verification

After applying the migration, test the new roles:

### Create a Test Customer

```sql
INSERT INTO iso_agents (clerk_user_id, email, full_name, role, is_active)
VALUES ('test_customer_1', 'test@customer.com', 'Test Customer', 'customer', true);
```

### Create a Test Sales Rep

```sql
INSERT INTO iso_agents (clerk_user_id, email, full_name, role, is_active)
VALUES ('test_sales_1', 'test@sales.com', 'Test Sales', 'sales_rep', true);
```

### Query by Role

```sql
-- Get all customers
SELECT * FROM iso_agents WHERE role = 'customer';

-- Get all sales people (iso_agent OR sales_rep)
SELECT * FROM iso_agents WHERE role IN ('iso_agent', 'sales_rep');

-- Get role distribution
SELECT role, COUNT(*) as count
FROM iso_agents
GROUP BY role;
```

---

## Comparison: Old vs New Migration Plans

### ❌ Old Plan (Migration 010 - Complex):
- Rename `iso_agents` → `users`
- Update all foreign keys
- Update all RLS policies
- Update all application code
- High risk, lots of changes

### ✅ New Plan (Migration 011 - Simple):
- Keep `iso_agents` table
- Just add new role options
- No code changes needed (already done)
- Low risk, minimal changes

---

## FAQ

**Q: Why keep `iso_agents` instead of renaming to `users`?**
A: Less risk, faster to apply, no code changes needed. The table name is just a label - what matters is the functionality.

**Q: Can I still rename it to `users` later?**
A: Yes! You can apply migration 010 later if you want. This migration doesn't prevent that.

**Q: Will existing iso_agent users break?**
A: No! All existing users keep working exactly as before. We only **added** new role options.

**Q: Do I need to update any code?**
A: No! I already updated the sync script and webhook to support all 5 roles.

**Q: What's the difference between iso_agent and sales_rep?**
A: `iso_agent` is industry-specific (private aviation ISO agents), while `sales_rep` is more generic. Functionally they can be the same, or you can use them differently based on your business needs.

---

## Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
-- Drop the new enum
DROP TYPE user_role CASCADE;

-- Recreate the old enum
CREATE TYPE user_role AS ENUM ('iso_agent', 'admin', 'operator');

-- Re-add role column
ALTER TABLE iso_agents ADD COLUMN role user_role DEFAULT 'iso_agent';
```

But this migration is so simple, rollback shouldn't be necessary!

---

## Summary

### What Happens:
1. ✅ Run migration (30 seconds)
2. ✅ Verify it worked (check NOTICE messages)
3. ✅ Done! New roles are available

### What Doesn't Change:
- ❌ No table rename
- ❌ No foreign key changes
- ❌ No code updates needed
- ❌ No existing user changes

### Risk Level: **VERY LOW** ✅

---

**Ready?** Copy the migration and paste it into Supabase SQL Editor!

```bash
cat supabase/migrations/011_add_customer_role.sql | pbcopy
```
