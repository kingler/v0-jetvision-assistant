# Supabase Integration

This directory contains Supabase client configurations for different environments.

## Files

- `client.ts` - Client-side Supabase client (for browser)
- `server.ts` - Server-side Supabase client (for API routes)
- `middleware.ts` - Supabase middleware for authentication

## Row Level Security (RLS)

All database queries are automatically filtered by the authenticated user's `clerk_user_id`.
This ensures multi-tenant data isolation.

## Usage

```typescript
// Server-side (API routes)
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Client-side (React components)
import { createSupabaseClient } from '@/lib/supabase/client'
```
