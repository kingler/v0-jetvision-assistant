# Supabase Setup Guide

This guide walks you through setting up Supabase for the JetVision AI Assistant project.

## Overview

Supabase provides:
- PostgreSQL database with real-time capabilities
- Row Level Security (RLS) for data access control
- Auto-generated REST and GraphQL APIs
- Authentication integration with Clerk

## Prerequisites

- A Supabase account (sign up at https://app.supabase.com)
- Project `.env.local` file

## Step 1: Create a Supabase Project

1. **Go to Supabase Dashboard**
   - Navigate to https://app.supabase.com
   - Click "New Project"

2. **Configure Project**
   - **Name**: `jetvision-ai-assistant` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., `us-west-1`)
   - **Pricing Plan**: Free tier is sufficient for development

3. **Wait for Provisioning**
   - Project setup takes 1-2 minutes
   - You'll see a progress indicator

## Step 2: Get API Credentials

1. **Navigate to Project Settings**
   - Click on your project name
   - Go to **Settings** → **API**

2. **Copy Required Values**

   You'll need three values:

   ```env
   # Project URL
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

   # Anonymous (public) key - safe for client-side use
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # Service role key - NEVER expose to client, server-only
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Get JWT Secret** (Optional but recommended)
   - Still in **Settings** → **API**
   - Under **JWT Settings**, copy the **JWT Secret**

   ```env
   SUPABASE_JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters
   ```

## Step 3: Update Environment Variables

1. **Open `.env.local`** in your project root

2. **Add Supabase Configuration**:

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters
   ```

3. **Save the file**

## Step 4: Set Up Database Schema

The database schema will be created as part of **DES-79: Database Schema & Models** task.

For now, you can verify the connection works:

```bash
npm run verify-services
```

You should see:
```
✓ Supabase: Connected successfully
```

## Step 5: Enable Realtime (Optional)

If you need real-time updates for certain tables:

1. Go to **Database** → **Replication**
2. Find the table you want to enable realtime for
3. Toggle **Enable Realtime** on

This is not required initially but useful for:
- Live RFP status updates
- Real-time agent activity monitoring
- Live notification feeds

## Step 6: Configure Row Level Security (RLS)

RLS will be configured as part of the database schema implementation. Key points:

- **All tables should have RLS enabled**
- **Policies are based on Clerk user authentication**
- **Service role key bypasses RLS for server-side operations**

Example policy (will be implemented in DES-79):
```sql
-- Users can only read their own RFPs
CREATE POLICY "Users can read own RFPs"
ON rfp_requests FOR SELECT
USING (auth.uid() = user_id);
```

## Step 7: Database Connection for Migrations

For running SQL migrations, you may need the direct database URL:

1. Go to **Settings** → **Database**
2. Under **Connection String**, copy the **Connection Pooling** URI
3. Add to `.env.local`:

   ```env
   DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```

**Note**: This is only needed for schema migrations, not regular app usage.

## Verification Checklist

- [ ] Supabase project created
- [ ] Project URL added to `.env.local`
- [ ] Anonymous key added to `.env.local`
- [ ] Service role key added to `.env.local` (keep secret!)
- [ ] JWT secret added to `.env.local`
- [ ] Connection verified with `npm run verify-services`

## Security Best Practices

### DO ✅
- Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side queries
- Use `SUPABASE_SERVICE_ROLE_KEY` only in server-side code (API routes, server components)
- Enable RLS on all tables
- Use Clerk authentication for user identification
- Test RLS policies thoroughly

### DON'T ❌
- Never commit `.env.local` to version control
- Never expose service role key to the client
- Don't disable RLS on production tables
- Don't use service role key for client-side queries
- Never log sensitive credentials

## Common Issues

### "Failed to connect to Supabase"
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check that project is not paused (free tier limitation)
- Ensure API keys are complete (no truncation)

### "Invalid JWT"
- Check that `SUPABASE_JWT_SECRET` matches your project
- Verify Clerk JWT is being sent correctly
- Ensure RLS policies allow the operation

### "Table does not exist"
- Database schema not yet created (normal for initial setup)
- Wait for DES-79 task completion for schema creation

## Next Steps

After Supabase is configured:

1. **DES-78**: Clerk Authentication Integration
2. **DES-79**: Database Schema & Models
3. **DES-80**: Clerk-Supabase User Sync Webhook

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Clerk + Supabase Integration](https://clerk.com/docs/integrations/databases/supabase)

## Support

If you encounter issues:
- Check Supabase Dashboard logs
- Review API error messages in browser console
- Run `npm run verify-services` for connection diagnostics
- Check project status in Supabase Dashboard
