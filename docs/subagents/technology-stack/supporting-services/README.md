# Supporting Services

**Version**: 1.0.0
**Last Updated**: October 20, 2025

---

## 📋 Overview

This document covers the supporting services and technologies used in JetVision: Clerk, Supabase, Google APIs, Next.js, and Vercel.

---

## 🔐 Clerk Authentication

**Official Docs**: https://clerk.com/docs

### Setup

```bash
npm install @clerk/nextjs
```

### Configuration

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect()
  }
})
```

### Getting User ID

```typescript
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  const { userId } = auth()
  // Use userId for database queries
}
```

---

## 🗄️ Supabase Database

**Official Docs**: https://supabase.com/docs

### Client Setup

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value
        },
      },
    }
  )
}
```

### Row Level Security (RLS)

```sql
-- Set Clerk user context
CREATE OR REPLACE FUNCTION set_clerk_user_context(user_id text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.clerk_user_id', user_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy
CREATE POLICY "Users can view own requests"
  ON requests FOR SELECT
  USING (
    iso_agent_id IN (
      SELECT id FROM users 
      WHERE clerk_user_id = current_setting('app.clerk_user_id', true)
    )
  );
```

---

## 📧 Google APIs

### Gmail API (MCP Server)

```typescript
// mcp-servers/gmail/tools/send-email.ts
import { google } from 'googleapis'

export const sendEmailTool = {
  name: 'send_email',
  async execute(args: { to: string; subject: string; body: string }) {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const message = [
      `To: ${args.to}`,
      `Subject: ${args.subject}`,
      '',
      args.body,
    ].join('\n')

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    })

    return { sent: true }
  },
}
```

### Google Sheets API (MCP Server)

```typescript
// mcp-servers/google-sheets/tools/search-client.ts
export const searchClientTool = {
  name: 'search_client',
  async execute(args: { clientName: string }) {
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client })

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
      range: 'Clients!A:H',
    })

    const rows = response.data.values || []
    const clientRow = rows.find(
      (row) => row[0].toLowerCase() === args.clientName.toLowerCase()
    )

    if (!clientRow) {
      return { found: false }
    }

    return {
      found: true,
      data: {
        name: clientRow[0],
        email: clientRow[1],
        phone: clientRow[2],
        company: clientRow[3],
        vipStatus: clientRow[4],
      },
    }
  },
}
```

---

## ⚛️ Next.js Framework

**Official Docs**: https://nextjs.org/docs

### App Router Structure

```
app/
├── layout.tsx              # Root layout with ClerkProvider
├── page.tsx               # Homepage
├── dashboard/
│   ├── layout.tsx         # Dashboard layout
│   └── page.tsx           # Dashboard page (authenticated)
└── api/
    ├── requests/
    │   └── route.ts       # Request management API
    ├── proposals/
    │   └── route.ts       # Proposal API
    └── webhooks/
        ├── clerk/
        │   └── route.ts   # Clerk webhook
        └── avinode/
            └── route.ts   # Avinode webhook
```

### API Route Pattern

```typescript
// app/api/requests/route.ts
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Authenticate
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body
  const body = await request.json()

  // Database operation
  const supabase = createClient()
  await supabase.rpc('set_clerk_user_context', { user_id: userId })

  const { data, error } = await supabase
    .from('requests')
    .insert({ ...body })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

---

## 🚀 Vercel Deployment

**Official Docs**: https://vercel.com/docs

### Environment Variables

Set in Vercel Dashboard:
- `OPENAI_API_KEY`
- `CLERK_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `AVINODE_API_KEY`
- `REDIS_HOST`
- `REDIS_PORT`

### Deployment

```bash
# Automatic deployment
git push origin main

# Manual deployment
vercel --prod
```

### Vercel Configuration

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install"
}
```

---

## 📚 Related Documentation

- [Clerk Docs](https://clerk.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Google APIs](https://developers.google.com/apis-explorer)
- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Docs](https://vercel.com/docs)

---

**Version**: 1.0.0 | **Last Updated**: Oct 20, 2025
