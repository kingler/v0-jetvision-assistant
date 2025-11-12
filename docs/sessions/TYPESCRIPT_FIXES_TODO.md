# TypeScript Fixes TODO

**Status**: Post-merge cleanup from PR #6
**Date**: 2025-11-12
**Priority**: Medium

## Overview

After successfully merging PR #6 (Multi-Agent System with MCP Infrastructure), there are remaining TypeScript errors in API routes and database seed scripts that need to be resolved before production deployment.

## TypeScript Errors Summary

**Total**: ~41 errors across 3 categories

### 1. API Routes (~30 errors)

**Location**: `app/api/*`

#### Supabase Type Mismatches
Properties not found on `never` type - indicates Supabase type generation issues:

- **`app/api/clients/route.ts`** (6 errors)
  - Line 22, 47, 81, 83: Property operations on `never` type
  - Insert and update operations type mismatches

- **`app/api/requests/route.ts`** (4 errors)
  - Line 34, 66, 73: Request insert/query operations

- **`app/api/quotes/route.ts`** (4 errors)
  - Line 26, 53, 61: Quote update operations

- **`app/api/agents/route.ts`** (1 error)
  - Line 27: Property 'id' on `never` type

- **`app/api/email/route.ts`** (3 errors)
  - Line 103, 117: Email history insert operations

- **`app/api/webhooks/clerk/route.ts`** (1 error)
  - Line 102: Clerk user sync operations

- **`app/api/analytics/route.ts`** (1 error)
  - Line 68: Analytics parameter type mismatch

#### Chat API Type Issues
- **`app/api/chat/respond/route.ts`** (4 errors)
  - Line 208: Null assignment to string
  - Lines 241, 271, 280: "tool" role not in MessageRole union

### 2. Database Seed Scripts (~8 errors)

**Location**: `scripts/test/seed-database.ts`

- Line 135, 176, 221: Insert operations with Supabase type mismatches
- Lines 250, 257, 260, 263: Property access on `never` type

### 3. Archived Files (~3 errors)

**Location**: `app/_archived/dashboard/rfp/rfp-detail-page.tsx`

- Lines 346, 369, 395: `aiScore` property should be `score`
- **Action**: Consider removing entire `app/_archived` directory (156K) if no longer needed

## Root Cause Analysis

### Primary Issue: Supabase Type Generation

The `lib/types/database.ts` file may not properly reflect the current database schema, causing all Supabase operations to return `never` type.

**Evidence**:
- Multiple "Property X does not exist on type 'never'" errors
- Insert/update operations failing type checks
- Query results typed as `never`

### Contributing Factors

1. **Schema Evolution** - Database migrations updated but types not regenerated
2. **Type Inference** - Supabase client configuration may need updates
3. **Message Role Types** - Chat API using "tool" role not in type definitions

## Proposed Solution

### Phase 1: Regenerate Supabase Types ⚠️ HIGH PRIORITY

```bash
# Option 1: Generate from live Supabase project
npx supabase gen types typescript \
  --project-id <your-project-id> \
  > lib/types/database.ts

# Option 2: Generate from local migrations
npx supabase start
npx supabase db reset
npx supabase gen types typescript --local > lib/types/database.ts
```

### Phase 2: Fix API Route Types

1. **Update Supabase Client Usage**
   ```typescript
   // Before
   const { data, error } = await supabase.from('table').select()
   // data has type 'never'

   // After (with proper types)
   const { data, error } = await supabase
     .from('table')
     .select<Database['public']['Tables']['table']['Row']>()
   ```

2. **Fix Chat Message Types**
   - Add "tool" to MessageRole union in `agents/core/types.ts`
   - Or map "tool" messages to "assistant" role

3. **Add Type Assertions Where Needed**
   ```typescript
   // For operations that can't be fully typed
   const result = data as ClientProfile
   ```

### Phase 3: Clean Up

1. **Remove Archived Files** (if confirmed unused)
   ```bash
   git rm -r app/_archived
   git commit -m "chore: remove archived dashboard files"
   ```

2. **Update Seed Scripts**
   - Use properly typed insert operations
   - Add type guards for data validation

## Testing Plan

### Pre-Fix Verification
- [x] Document all TypeScript errors
- [x] Confirm errors don't affect runtime
- [x] Identify root causes

### Post-Fix Verification
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] All API routes tested manually
- [ ] Database operations work in dev/test
- [ ] Pre-commit hooks pass
- [ ] Integration tests pass
- [ ] No breaking changes to existing functionality

## Implementation Checklist

### Step 1: Type Generation
- [ ] Backup current `lib/types/database.ts`
- [ ] Generate new types from Supabase
- [ ] Compare old vs new types
- [ ] Update imports if table names changed

### Step 2: API Routes
- [ ] Fix clients route types (6 errors)
- [ ] Fix requests route types (4 errors)
- [ ] Fix quotes route types (4 errors)
- [ ] Fix email route types (3 errors)
- [ ] Fix chat respond route (4 errors)
- [ ] Fix webhooks route (1 error)
- [ ] Fix agents route (1 error)
- [ ] Fix analytics route (1 error)

### Step 3: Seed Scripts
- [ ] Update insert operations (3 errors)
- [ ] Fix property access (5 errors)

### Step 4: Cleanup
- [ ] Review archived files usage
- [ ] Remove or fix archived files
- [ ] Update documentation

### Step 5: Validation
- [ ] Run type check
- [ ] Run all tests
- [ ] Manual testing of affected routes
- [ ] Commit and push

## Priority & Timeline

**Priority**: Medium
**Blocking**: No - core functionality works
**Recommended Timeline**: Before next release
**Estimated Effort**: 4-6 hours

## Notes

- Core multi-agent system is unaffected (agents, coordination, MCP servers all pass type checks)
- Runtime functionality is not impacted
- Errors are compile-time only
- Consider using GitHub Issues disabled - document here or in Linear

## Related Work

- PR #6: Multi-Agent System with MCP Infrastructure
- Post-merge cleanup from 35 conflict resolution
- Follows successful merge to main on 2025-11-12

---

**Last Updated**: 2025-11-12
**Next Review**: Before staging deployment

🤖 Generated with [Claude Code](https://claude.com/claude-code)
