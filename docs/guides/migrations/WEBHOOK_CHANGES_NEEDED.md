# Webhook Changes Needed After Migration 010

**File**: `app/api/webhooks/clerk/route.ts`

After applying migration 010, you need to update the webhook to use the new schema.

---

## Changes Required

The webhook currently uses `iso_agents` table. You need to change it to `users` table.

### Change 1: Line 11 (Comment)
```typescript
// FROM:
 * - user.created: Creates a new user record in Supabase iso_agents table

// TO:
 * - user.created: Creates a new user record in Supabase users table
```

### Change 2: Line 101 (user.created event)
```typescript
// FROM:
const { data, error } = await supabase
  .from('iso_agents')

// TO:
const { data, error } = await supabase
  .from('users')
```

### Change 3: Line 153 (user.updated event)
```typescript
// FROM:
const { data, error } = await supabase
  .from('iso_agents')

// TO:
const { data, error } = await supabase
  .from('users')
```

### Change 4: Line 175 (user.deleted event)
```typescript
// FROM:
const { data, error } = await supabase
  .from('iso_agents')

// TO:
const { data, error } = await supabase
  .from('users')
```

---

## Quick Find & Replace

The easiest way is to use find & replace in your editor:

### VS Code / Cursor:
1. Open `app/api/webhooks/clerk/route.ts`
2. Press `Cmd+H` (Mac) or `Ctrl+H` (Windows/Linux)
3. Find: `.from('iso_agents')`
4. Replace: `.from('users')`
5. Click "Replace All"

### Command Line:
```bash
# macOS/Linux
sed -i.bak "s/.from('iso_agents')/.from('users')/g" app/api/webhooks/clerk/route.ts

# Verify changes
git diff app/api/webhooks/clerk/route.ts
```

---

## After Making Changes

1. **Save the file**
2. **Test the webhook** (see below)
3. **Commit the changes**

---

## Testing the Webhook

Use the test script:

```bash
# Run webhook test
npx tsx scripts/clerk/test-webhook.ts
```

Expected output after changes:
```
✅ Successfully created user in Supabase
✅ User exists in users table (not iso_agents)
```

---

## Verification Query

After updating the webhook, verify in Supabase SQL Editor:

```sql
-- This should work (new schema)
SELECT * FROM users WHERE clerk_user_id = 'test_user_id';

-- This should fail (old schema no longer exists)
SELECT * FROM iso_agents WHERE clerk_user_id = 'test_user_id';
-- Error: relation "iso_agents" does not exist ✅ Expected!
```

---

## Complete Diff

Here's what the changes look like:

```diff
  /**
   * Clerk Webhook Handler
   *
   * This endpoint receives webhook events from Clerk and syncs user data to Supabase.
   * Events handled:
-  * - user.created: Creates a new user record in Supabase iso_agents table
+  * - user.created: Creates a new user record in Supabase users table
   * - user.updated: Updates existing user record in Supabase
   * - user.deleted: Soft deletes user record in Supabase
   *
@@ -98,7 +98,7 @@
         }

         // Create user in Supabase
         const { data, error } = await supabase
-          .from('iso_agents')
+          .from('users')
           .insert({
             clerk_user_id: id,
             email: email,
@@ -150,7 +150,7 @@

         // Update user in Supabase
         const { data, error } = await supabase
-          .from('iso_agents')
+          .from('users')
           .update(updateData)
           .eq('clerk_user_id', id)
           .select()
@@ -172,7 +172,7 @@

         // Soft delete: mark user as inactive instead of deleting
         const { data, error } = await supabase
-          .from('iso_agents')
+          .from('users')
           .update({
             is_active: false,
             updated_at: new Date().toISOString(),
```

---

## Checklist

- [ ] Updated line 11 (comment)
- [ ] Updated line 101 (user.created)
- [ ] Updated line 153 (user.updated)
- [ ] Updated line 175 (user.deleted)
- [ ] Saved file
- [ ] Tested webhook
- [ ] Verified in Supabase

---

**Total Changes**: 4 occurrences of `.from('iso_agents')` → `.from('users')`
