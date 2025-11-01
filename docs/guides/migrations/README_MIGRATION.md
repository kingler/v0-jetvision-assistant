# 🚀 Database Migration Summary - Align with Documentation

**Date**: 2025-11-01
**Status**: ✅ READY TO EXECUTE
**Migration SQL**: 📋 **Already in your clipboard!**

---

## 📌 Quick Summary

Your Supabase database currently uses the **old schema** (`iso_agents` table), but all the documentation references the **new schema** (`users` table). This migration aligns the database with the documentation.

### What Changes:
- Table: `iso_agents` → `users`
- Role: `iso_agent` → `sales_rep`
- Foreign keys: `iso_agent_id` → `user_id`

---

## 🎯 5-Step Process

### ✅ Step 1: Apply Migration (DO THIS FIRST)

The migration SQL is **already in your clipboard!**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Click "New Query"
3. **Paste** (Cmd+V) - the migration is ready!
4. Click "Run" (Cmd+Enter)
5. Wait ~30 seconds

**Expected Success Message**:
```
✅ Table successfully renamed from iso_agents to users
✅ Migrated 7 users to sales_rep role
✅ Migration 010 Completed Successfully
```

📖 **Detailed Guide**: [APPLY_MIGRATION_010.md](APPLY_MIGRATION_010.md)

---

### ✅ Step 2: Replace Sync Script

```bash
# Backup current
mv scripts/clerk/sync-users.ts scripts/clerk/sync-users-OLD.ts

# Use new version
mv scripts/clerk/sync-users-NEW.ts scripts/clerk/sync-users.ts
```

---

### ✅ Step 3: Update Webhook

File: `app/api/webhooks/clerk/route.ts`

**Find & Replace** (4 occurrences):
- Find: `.from('iso_agents')`
- Replace: `.from('users')`

📖 **Exact Changes**: [WEBHOOK_CHANGES_NEEDED.md](WEBHOOK_CHANGES_NEEDED.md)

---

### ✅ Step 4: Re-sync Users

```bash
# Dry run first
npx tsx scripts/clerk/sync-users.ts --dry-run

# If good, run actual sync
npx tsx scripts/clerk/sync-users.ts
```

---

### ✅ Step 5: Verify

```bash
# Check users in database
npx tsx scripts/clerk/verify-sync.ts
```

Expected:
- ✅ All users in `users` table
- ✅ All users have `sales_rep` or `admin` role
- ✅ No `iso_agent` role

---

## 📚 All Generated Files

| File | Purpose |
|------|---------|
| [MIGRATION_COMPLETE_GUIDE.md](MIGRATION_COMPLETE_GUIDE.md) | **⭐ Complete step-by-step guide** |
| [APPLY_MIGRATION_010.md](APPLY_MIGRATION_010.md) | Detailed migration instructions |
| [WEBHOOK_CHANGES_NEEDED.md](WEBHOOK_CHANGES_NEEDED.md) | Exact webhook changes needed |
| `supabase/migrations/010_migrate_to_users_table.sql` | The migration file |
| `scripts/clerk/sync-users-NEW.ts` | Updated sync script (new schema) |
| `scripts/clerk/sync-users.ts` | Current sync script (old schema) |

---

## 🔄 Current vs Target State

### Current State (Before Migration):
```
┌────────────────────────────────────┐
│  Table: iso_agents                 │
│  ┌─────────────────────────────┐  │
│  │ id                          │  │
│  │ clerk_user_id               │  │
│  │ email                       │  │
│  │ full_name                   │  │
│  │ role: iso_agent ❌          │  │
│  └─────────────────────────────┘  │
│                                    │
│  Foreign Keys:                     │
│  - iso_agent_id ❌                 │
└────────────────────────────────────┘
```

### Target State (After Migration):
```
┌────────────────────────────────────┐
│  Table: users                      │
│  ┌─────────────────────────────┐  │
│  │ id                          │  │
│  │ clerk_user_id               │  │
│  │ email                       │  │
│  │ full_name                   │  │
│  │ role: sales_rep ✅          │  │
│  │ avatar_url (new)            │  │
│  │ phone (new)                 │  │
│  │ timezone (new)              │  │
│  │ preferences (new)           │  │
│  │ last_login_at (new)         │  │
│  └─────────────────────────────┘  │
│                                    │
│  Foreign Keys:                     │
│  - user_id ✅                      │
└────────────────────────────────────┘
```

---

## ⚡ Quick Reference

### Migration File Location:
```
supabase/migrations/010_migrate_to_users_table.sql
```

### Backup Before Migration:
```sql
-- Run in Supabase SQL Editor to backup
CREATE TABLE iso_agents_backup AS SELECT * FROM iso_agents;
```

### Rollback if Needed:
```bash
cat supabase/migrations/009_rollback_to_iso_agents.sql | pbcopy
# Then paste and run in Supabase SQL Editor
```

---

## ✅ Success Checklist

- [ ] Migration applied (SQL ran successfully)
- [ ] Verification queries passed
- [ ] sync-users.ts replaced
- [ ] webhook route.ts updated (4 changes)
- [ ] Users re-synced
- [ ] All users show `sales_rep` role
- [ ] Application works (auth, RBAC, etc.)

---

## 🆘 If Something Goes Wrong

1. **Check error message** in Supabase SQL Editor
2. **Review** [APPLY_MIGRATION_010.md](APPLY_MIGRATION_010.md) troubleshooting
3. **Rollback** using migration 009 if needed
4. **Restore** from backup

---

## 📊 Impact Analysis

### Tables Affected:
- `iso_agents` → `users` ✅
- `client_profiles` (foreign key updated) ✅
- `requests` (foreign key updated) ✅
- `quotes` (RLS policies updated) ✅
- `workflow_states` (RLS policies updated) ✅
- `agent_executions` (RLS policies updated) ✅

### Code Changes Required:
- `scripts/clerk/sync-users.ts` ✅ (prepared)
- `app/api/webhooks/clerk/route.ts` ⏳ (you'll update)

### Documentation Alignment:
- ✅ `docs/CLERK_SUPABASE_SYNC.md` - Will match after migration
- ✅ `docs/USER_MANAGEMENT_MIGRATION_PLAN.md` - Will match after migration
- ✅ `docs/database/APPLY_USER_MIGRATIONS.md` - Will match after migration

---

## 🎬 Ready to Start?

**The migration SQL is in your clipboard!** Follow [MIGRATION_COMPLETE_GUIDE.md](MIGRATION_COMPLETE_GUIDE.md) for the complete process.

**Estimated Time**: 15-20 minutes total

---

**Created**: 2025-11-01
**Migration Version**: 010
**Status**: ✅ Ready to Execute
