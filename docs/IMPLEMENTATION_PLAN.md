# Jetvision AI Assistant - Comprehensive Implementation Plan

**Project**: Jetvision AI Assistant - Multi-Agent RFP Automation System
**Timeline**: October 20, 2025 - December 1, 2025 (6-7 weeks)
**Current Date**: October 20, 2025
**Target Delivery**: First week of December 2025

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Authentication Layer (Clerk + Supabase)](#authentication-layer)
4. [Implementation Timeline](#implementation-timeline)
5. [Git Workflow & TDD Strategy](#git-workflow--tdd-strategy)
6. [Database Schema & RLS Policies](#database-schema--rls-policies)
7. [MCP Server Implementations](#mcp-server-implementations)
8. [AI Agent Implementations](#ai-agent-implementations)
9. [API Routes & Integration](#api-routes--integration)
10. [Testing Strategy](#testing-strategy)
11. [Deployment & DevOps](#deployment--devops)
12. [Subagent Task Assignments](#subagent-task-assignments)

---

## Executive Summary

### Project Overview

Jetvision AI Assistant transforms the current MVP into a production-ready multi-agent AI system for automated private jet booking RFP workflow management. The system integrates:

- **Authentication**: Clerk for user authentication and session management
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **AI Agents**: 6 specialized OpenAI GPT-4 agents orchestrating the RFP workflow
- **External Services**: MCP (Model Context Protocol) servers for Avinode, Gmail, and Google Sheets
- **Frontend**: Next.js 14 App Router with real-time updates

### Technology Stack

```
Frontend:
├── Next.js 14 (App Router)
├── React 18
├── TypeScript
├── Clerk Authentication
├── Tailwind CSS 4.1.9
└── shadcn/ui Components

Backend:
├── Supabase PostgreSQL (Database)
├── Supabase Realtime (Live updates)
├── OpenAI GPT-5 (AI Agents)
├── OpenAI Assistants API
└── Node.js MCP Servers

External Integrations (via MCP):
├── Avinode API (Flight search & RFP)
├── Gmail API (Email communications)
└── Google Sheets API (Client data sync)

DevOps:
├── Vercel (Hosting)
├── GitHub (Version control)
├── Sentry (Error monitoring)
└── BullMQ + Redis (Job queue)
```

### Key Features

1. **Authenticated Multi-Tenant System**: ISO agents securely manage their client requests
2. **Intelligent RFP Orchestration**: AI-driven workflow from request to proposal
3. **Real-time Quote Management**: Live updates as operators respond to RFPs
4. **Automated Client Profiling**: Smart client preference detection and personalization
5. **Multi-Factor Proposal Analysis**: AI-powered comparative analysis and recommendations
6. **Automated Communications**: Email generation and delivery tracking
7. **Comprehensive Error Handling**: Automatic recovery and escalation workflows

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER (ISO Agent)                                   │
│                                  ↓                                           │
│                         ┌─────────────────┐                                 │
│                         │   Browser UI    │                                 │
│                         │   (Next.js 14)  │                                 │
│                         └────────┬────────┘                                 │
│                                  ↓                                           │
│                         ┌─────────────────┐                                 │
│                         │  Clerk Auth     │                                 │
│                         │  (JWT Tokens)   │                                 │
│                         └────────┬────────┘                                 │
│                                  ↓                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                         NEXT.JS API ROUTES                                   │
│                    (Protected with Clerk Middleware)                         │
│                                  ↓                                           │
│         ┌────────────────────────┼────────────────────────┐                │
│         ↓                        ↓                         ↓                │
│  ┌──────────────┐      ┌─────────────────┐      ┌──────────────────┐      │
│  │   Supabase   │      │   OpenAI        │      │   MCP Servers    │      │
│  │   Database   │      │   Agents        │      │   (External API) │      │
│  │   (RLS with  │      │   (GPT-5) │      │                  │      │
│  │  Clerk UIDs) │      │                 │      │                  │      │
│  └──────┬───────┘      └────────┬────────┘      └────────┬─────────┘      │
│         │                       │                         │                │
│         │                       │                         │                │
│         │              ┌────────┴──────────┐             │                │
│         │              │   6 AI Agents:    │             │                │
│         │              │ ┌───────────────┐ │             │                │
│         │              │ │ 1. Orchestrator│←────────────┤                │
│         │              │ └───────────────┘ │             │                │
│         │              │ ┌───────────────┐ │             │                │
│         │              │ │ 2. Client Data│←────────┐    │                │
│         │              │ └───────────────┘ │        │    │                │
│         │              │ ┌───────────────┐ │        │    │                │
│         │              │ │ 3. Flight     │←────────┼────┤                │
│         │              │ │    Search     │ │        │    │                │
│         │              │ └───────────────┘ │        │    │                │
│         │              │ ┌───────────────┐ │        │    │                │
│         │              │ │ 4. Proposal   │←────────┤    │                │
│         │              │ │    Analysis   │ │        │    │                │
│         │              │ └───────────────┘ │        │    │                │
│         │              │ ┌───────────────┐ │        │    │                │
│         │              │ │ 5. Comms      │←────────┼────┤                │
│         │              │ │    Manager    │ │        │    │                │
│         │              │ └───────────────┘ │        │    │                │
│         │              │ ┌───────────────┐ │        │    │                │
│         │              │ │ 6. Error      │←────────┘    │                │
│         │              │ │    Monitor    │ │             │                │
│         │              │ └───────────────┘ │             │                │
│         │              └───────────────────┘             │                │
│         │                                                 │                │
│         ↓                                                 ↓                │
│  ┌──────────────────────────────────────────────────────────────┐         │
│  │                    MCP SERVERS                                │         │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐     │         │
│  │  │  Avinode    │  │   Gmail     │  │  Google Sheets   │     │         │
│  │  │  MCP Server │  │ MCP Server  │  │   MCP Server     │     │         │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬─────────┘     │         │
│  │         ↓                ↓                   ↓               │         │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐     │         │
│  │  │  Avinode    │  │   Gmail     │  │  Google Sheets   │     │         │
│  │  │     API     │  │    API      │  │       API        │     │         │
│  │  └─────────────┘  └─────────────┘  └──────────────────┘     │         │
│  └──────────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
┌──────────┐           ┌─────────┐           ┌──────────┐
│   User   │──Sign In─→│  Clerk  │──JWT────→ │ Next.js  │
└──────────┘           └─────────┘           │   API    │
                             │               └────┬─────┘
                             │                    │
                             ↓                    ↓
                    ┌────────────────┐    ┌──────────────┐
                    │ Clerk Webhook  │    │  Supabase    │
                    │  (User Sync)   │───→│  (RLS Check) │
                    └────────────────┘    └──────────────┘
                                                   │
                                          Validate JWT &
                                          Check user.id
                                          matches RLS
```

### Data Flow: RFP Request to Proposal

```
1. User creates request
   ↓
2. RFP Orchestrator analyzes → Stores in Supabase
   ↓
3. Client Data Manager fetches profile → Google Sheets MCP
   ↓
4. Flight Search Agent searches → Avinode MCP → RFP Distribution
   ↓
5. Quotes arrive via webhook → Stored in Supabase
   ↓
6. Proposal Analysis Agent scores → AI analysis
   ↓
7. Communication Manager sends proposals → Gmail MCP
   ↓
8. Real-time updates → Supabase Realtime → Frontend
```

---

## Authentication Layer

### Clerk Authentication Setup

#### Installation & Configuration

**Branch**: `feature/clerk-authentication`

**Step 1: Install Clerk**

```bash
npm install @clerk/nextjs
```

**Step 2: Environment Variables**

Create/update `.env.local`:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
CLERK_SECRET_KEY=sk_test_YOUR_SECRET_KEY

# Clerk Webhooks (for user sync)
CLERK_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://sbzaevawnjlrsjsuevli.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiemFldmF3bmpscnNqc3VldmxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjcxMDIsImV4cCI6MjA3NjUwMzEwMn0.r-ClgNXSaDnzcz8sJ9LeJb-ITceLLWV_RUSJBYcJThg
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

**⚠️ SECURITY NOTE**: Verify `.gitignore` includes `.env*` to prevent credential leaks.

**Step 3: Create Middleware**

File: `middleware.ts`

```typescript
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

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
```

**Step 4: Wrap App with ClerkProvider**

File: `app/layout.tsx`

```typescript
import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Jetvision AI Assistant',
  description: 'AI-powered private jet booking assistant',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

**Step 5: Add Authentication UI Components**

File: `components/auth/auth-header.tsx`

```typescript
'use client'

import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

export function AuthHeader() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <img src="/jetvision-logo.png" alt="Jetvision" className="h-8" />
          <h1 className="text-xl font-bold">Jetvision AI Assistant</h1>
        </div>

        <div className="flex items-center space-x-4">
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button>Get Started</Button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-10 h-10'
                }
              }}
            />
          </SignedIn>
        </div>
      </div>
    </header>
  )
}
```

**Step 6: Create Protected Dashboard Page**

File: `app/dashboard/page.tsx`

```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import JetVisionAgent from '@/app/page'

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return <JetVisionAgent />
}
```

### Supabase Integration with Clerk

#### Clerk User Sync via Webhook

**Branch**: `feature/clerk-supabase-sync`

**Step 1: Create Webhook Handler**

File: `app/api/webhooks/clerk/route.ts`

```typescript
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env.local')
  }

  // Get headers
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', { status: 400 })
  }

  // Get body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error: Verification error', { status: 400 })
  }

  // Handle the event
  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data

    // Insert user into Supabase
    const { error } = await supabase.from('users').insert({
      clerk_user_id: id,
      email: email_addresses[0]?.email_address,
      full_name: `${first_name || ''} ${last_name || ''}`.trim(),
      role: 'iso_agent',
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Error creating user in Supabase:', error)
      return new Response('Error: Database error', { status: 500 })
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data

    const { error } = await supabase
      .from('users')
      .update({
        email: email_addresses[0]?.email_address,
        full_name: `${first_name || ''} ${last_name || ''}`.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('clerk_user_id', id)

    if (error) {
      console.error('Error updating user in Supabase:', error)
      return new Response('Error: Database error', { status: 500 })
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('clerk_user_id', id)

    if (error) {
      console.error('Error deleting user from Supabase:', error)
      return new Response('Error: Database error', { status: 500 })
    }
  }

  return new Response('Webhook processed successfully', { status: 200 })
}
```

**Step 2: Configure Clerk Webhook**

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to Webhooks
3. Add endpoint: `https://your-app.vercel.app/api/webhooks/clerk`
4. Subscribe to events: `user.created`, `user.updated`, `user.deleted`
5. Copy webhook secret to `.env.local` as `CLERK_WEBHOOK_SECRET`

#### Supabase Helper with Clerk Context

File: `lib/supabase/server.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

export async function createSupabaseServerClient() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized: No user ID found')
  }

  // Create Supabase client with service role key (for server-side)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  )

  // Get Supabase user ID from Clerk user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!user) {
    throw new Error('User not found in database')
  }

  return { supabase, userId: user.id, clerkUserId: userId }
}
```

File: `lib/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

export function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

## Implementation Timeline

### 6-7 Week Compressed Schedule

**Total Duration**: October 20 - December 1, 2025 (42 days)

### Week 1: Foundation & Authentication (Oct 20-26)

**Sprint Goal**: Establish authentication, database, and core infrastructure

| Day | Task | Branch | Owner |
|-----|------|--------|-------|
| Mon Oct 20 | Project setup, dependencies installation | `setup/initial-config` | DevOps Engineer |
| Tue Oct 21 | Clerk authentication integration | `feature/clerk-authentication` | Backend Developer |
| Wed Oct 22 | Supabase schema deployment + RLS policies | `feature/database-schema` | System Architect |
| Thu Oct 23 | Clerk-Supabase webhook sync | `feature/clerk-supabase-sync` | Integration Specialist |
| Fri Oct 24 | Protected API routes + middleware | `feature/auth-middleware` | Backend Developer |
| Sat Oct 25 | Core agent base class + error monitoring | `feature/agent-framework` | Backend Developer |
| Sun Oct 26 | Testing: Auth flow + database sync | `test/auth-integration` | QA Engineer |

**Deliverables**:
- ✅ Clerk authentication working
- ✅ Users synced to Supabase
- ✅ RLS policies enforcing user isolation
- ✅ Protected API routes

### Week 2: MCP Servers & Core Agents (Oct 27 - Nov 2)

**Sprint Goal**: Build MCP servers and implement first 3 agents

| Day | Task | Branch | Owner |
|-----|------|--------|-------|
| Mon Oct 27 | Avinode MCP server implementation | `feature/avinode-mcp-server` | Integration Specialist |
| Tue Oct 28 | Gmail MCP server implementation | `feature/gmail-mcp-server` | Integration Specialist |
| Wed Oct 29 | Google Sheets MCP server | `feature/sheets-mcp-server` | Integration Specialist |
| Thu Oct 30 | RFP Orchestrator Agent | `feature/rfp-orchestrator-agent` | Backend Developer |
| Fri Oct 31 | Client Data Manager Agent | `feature/client-data-agent` | Backend Developer |
| Sat Nov 1 | Flight Search Agent | `feature/flight-search-agent` | Backend Developer |
| Sun Nov 2 | Integration testing: Agents + MCP | `test/agent-mcp-integration` | QA Engineer |

**Deliverables**:
- ✅ 3 MCP servers operational
- ✅ First 3 AI agents working
- ✅ Agent-to-MCP communication functional

### Week 3: Advanced Agents & Workflow (Nov 3-9)

**Sprint Goal**: Complete remaining agents and workflow orchestration

| Day | Task | Branch | Owner |
|-----|------|--------|-------|
| Mon Nov 3 | Proposal Analysis Agent | `feature/proposal-analysis-agent` | Backend Developer |
| Tue Nov 4 | Communication Manager Agent | `feature/communication-agent` | Backend Developer |
| Wed Nov 5 | Error Monitoring Agent | `feature/error-monitoring-agent` | Backend Developer |
| Thu Nov 6 | Workflow orchestration + state machine | `feature/workflow-orchestration` | System Architect |
| Fri Nov 7 | Background job queue (BullMQ + Redis) | `feature/job-queue` | DevOps Engineer |
| Sat Nov 8 | Agent integration testing | `test/all-agents` | QA Engineer |
| Sun Nov 9 | E2E workflow testing | `test/e2e-workflow` | QA Engineer |

**Deliverables**:
- ✅ All 6 AI agents operational
- ✅ Complete RFP workflow working
- ✅ Background job processing

### Week 4: Frontend Integration & Real-time Updates (Nov 10-16)

**Sprint Goal**: Connect frontend to backend, implement real-time features

| Day | Task | Branch | Owner |
|-----|------|--------|-------|
| Mon Nov 10 | Update chat interface for authenticated users | `feature/auth-ui-integration` | Frontend Developer |
| Tue Nov 11 | Supabase Realtime integration | `feature/realtime-updates` | Frontend Developer |
| Wed Nov 12 | Request creation flow with auth | `feature/request-creation-ui` | Frontend Developer |
| Thu Nov 13 | Live quote status display + PDF generation service | `feature/quote-status-ui` + `feature/pdf-generation` | Frontend + Backend Developer |
| Fri Nov 14 | Proposal review interface + PDF download/preview | `feature/proposal-ui` | Frontend Developer |
| Sat Nov 15 | Frontend E2E tests (Playwright) + PDF tests | `test/frontend-e2e` | QA Engineer |
| Sun Nov 16 | UI/UX polish and accessibility | `enhancement/ui-polish` | Frontend Developer |

**Deliverables**:
- ✅ Complete authenticated UI
- ✅ Real-time updates working
- ✅ PDF generation service operational
- ✅ PDF download and preview functionality
- ✅ End-user workflow functional

### Week 5: Testing & Optimization (Nov 17-23)

**Sprint Goal**: Comprehensive testing and performance optimization

| Day | Task | Branch | Owner |
|-----|------|--------|-------|
| Mon Nov 17 | Unit test coverage → 80%+ | `test/unit-coverage` | QA Engineer |
| Tue Nov 18 | Integration test suite | `test/integration-suite` | QA Engineer |
| Wed Nov 19 | Load testing (100+ concurrent users) | `test/load-testing` | QA Engineer |
| Thu Nov 20 | Performance optimization (API < 2s) | `optimization/api-performance` | Backend Developer |
| Fri Nov 21 | Database query optimization | `optimization/database-queries` | Backend Developer |
| Sat Nov 22 | Security audit + penetration testing | `security/audit` | Security Engineer |
| Sun Nov 23 | Bug fixes from testing | `bugfix/test-issues` | All Teams |

**Deliverables**:
- ✅ 80%+ test coverage
- ✅ <2s API response times
- ✅ Security vulnerabilities fixed

### Week 6: Production Readiness (Nov 24-30)

**Sprint Goal**: Monitoring, logging, documentation, staging deployment

| Day | Task | Branch | Owner |
|-----|------|--------|-------|
| Mon Nov 24 | Sentry error monitoring setup | `feature/sentry-monitoring` | DevOps Engineer |
| Tue Nov 25 | Logging aggregation + dashboards | `feature/logging` | DevOps Engineer |
| Wed Nov 26 | CI/CD pipeline configuration | `feature/ci-cd` | DevOps Engineer |
| Thu Nov 27 | Staging environment deployment | `deployment/staging` | DevOps Engineer |
| Fri Nov 28 | User acceptance testing (UAT) | `uat/staging` | Product Owner |
| Sat Nov 29 | Production deployment preparation | `deployment/production-prep` | DevOps Engineer |
| Sun Nov 30 | Final pre-launch checklist | `deployment/final-checks` | All Teams |

**Deliverables**:
- ✅ Monitoring and alerting live
- ✅ Staging environment tested
- ✅ Production deployment ready

### Week 7: Launch Week (Dec 1-7)

**Sprint Goal**: Production launch and post-launch support

| Day | Task | Branch | Owner |
|-----|------|--------|-------|
| Mon Dec 1 | Production deployment | `main` | DevOps Engineer |
| Tue Dec 2 | Post-launch monitoring | N/A | All Teams |
| Wed Dec 3 | User onboarding + training | N/A | Product Owner |
| Thu Dec 4 | Bug fixes (if any) | `hotfix/*` | Backend Developer |
| Fri Dec 5 | Performance tuning | `optimization/*` | Backend Developer |

**Deliverables**:
- ✅ Production system live
- ✅ Zero critical bugs
- ✅ Users onboarded

---

## Git Workflow & TDD Strategy

### Branch Naming Convention

```
feature/     - New features (e.g., feature/clerk-authentication)
bugfix/      - Bug fixes (e.g., bugfix/login-validation)
test/        - Test additions (e.g., test/agent-integration)
enhancement/ - Improvements (e.g., enhancement/ui-polish)
optimization/- Performance improvements
security/    - Security fixes
hotfix/      - Production hotfixes
deployment/  - Deployment-related changes
```

### Git Workflow Process

```
1. Create Feature Branch
   git checkout -b feature/your-feature-name

2. Write Tests First (TDD)
   - Create test file: __tests__/your-feature.test.ts
   - Write failing tests
   - Run: npm test (should fail)

3. Implement Feature
   - Write minimal code to pass tests
   - Run: npm test (should pass)
   - Refactor if needed

4. Commit with Descriptive Message
   git add .
   git commit -m "feat: implement your feature

   - Add detailed description
   - Reference issue/ticket if applicable
   - Include breaking changes if any"

5. Push and Create Pull Request
   git push origin feature/your-feature-name
   gh pr create --title "Feature: Your Feature" --body "Description..."

6. Code Review
   - Request review from assigned subagent
   - Address feedback
   - Ensure CI/CD passes

7. Merge to Main
   - Squash and merge (keeps history clean)
   - Delete feature branch after merge
```

### Test-Driven Development (TDD) Approach

#### Red-Green-Refactor Cycle

```
1. RED: Write a failing test
   ├── Define the expected behavior
   ├── Write test assertions
   └── Run test (should fail)

2. GREEN: Write minimal code to pass
   ├── Implement just enough to pass
   ├── Don't optimize yet
   └── Run test (should pass)

3. REFACTOR: Improve code quality
   ├── Clean up duplication
   ├── Improve naming
   ├── Optimize performance
   └── Ensure tests still pass
```

#### Example TDD Workflow

**Scenario**: Implementing RFP Orchestrator Agent

**Step 1: Write Test First** (`lib/agents/__tests__/rfp-orchestrator.test.ts`)

```typescript
import { RFPOrchestratorAgent } from '../rfp-orchestrator'
import { createSupabaseServerClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server')
jest.mock('openai')

describe('RFPOrchestratorAgent', () => {
  let orchestrator: RFPOrchestratorAgent

  beforeEach(() => {
    orchestrator = new RFPOrchestratorAgent()
  })

  describe('analyzeRequest', () => {
    it('should analyze request and return priority classification', async () => {
      // Arrange
      const mockRequestId = 'test-request-123'
      const mockRequest = {
        id: mockRequestId,
        passenger_count: 6,
        departure_airport: 'TEB',
        arrival_airport: 'VNY',
        client: { vip_status: true }
      }

      // Mock Supabase response
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue({
        supabase: {
          from: jest.fn(() => ({
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({ data: mockRequest, error: null }))
              }))
            }))
          }))
        }
      })

      // Act
      const analysis = await orchestrator.analyzeRequest(mockRequestId)

      // Assert
      expect(analysis).toHaveProperty('priority')
      expect(analysis.priority).toBe('vip')
      expect(analysis).toHaveProperty('complexity_score')
      expect(analysis.complexity_score).toBeGreaterThan(0)
    })

    it('should throw error if request not found', async () => {
      // Arrange
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue({
        supabase: {
          from: jest.fn(() => ({
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({ data: null, error: new Error('Not found') }))
              }))
            }))
          }))
        }
      })

      // Act & Assert
      await expect(orchestrator.analyzeRequest('invalid-id'))
        .rejects
        .toThrow('Failed to fetch request')
    })
  })
})
```

**Step 2: Run Test (Should Fail)**

```bash
npm test -- rfp-orchestrator.test.ts

# Output:
# FAIL  lib/agents/__tests__/rfp-orchestrator.test.ts
#   ● RFPOrchestratorAgent › analyzeRequest › should analyze request
#     RFPOrchestratorAgent is not defined
```

**Step 3: Implement Minimal Code** (`lib/agents/rfp-orchestrator.ts`)

```typescript
import OpenAI from 'openai'
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface OrchestrationAnalysis {
  priority: 'standard' | 'urgent' | 'vip'
  complexity_score: number
  next_actions: string[]
}

export class RFPOrchestratorAgent {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }

  async analyzeRequest(requestId: string): Promise<OrchestrationAnalysis> {
    const { supabase } = await createSupabaseServerClient()

    const { data: request, error } = await supabase
      .from('requests')
      .select('*, client:clients(*)')
      .eq('id', requestId)
      .single()

    if (error) throw new Error(`Failed to fetch request: ${error.message}`)

    // Simple logic for MVP
    const priority = request.client.vip_status ? 'vip' : 'standard'
    const complexity_score = request.passenger_count > 8 ? 7 : 5

    return {
      priority,
      complexity_score,
      next_actions: ['fetch_client_data', 'search_flights']
    }
  }
}
```

**Step 4: Run Test Again (Should Pass)**

```bash
npm test -- rfp-orchestrator.test.ts

# Output:
# PASS  lib/agents/__tests__/rfp-orchestrator.test.ts
#   ✓ RFPOrchestratorAgent › analyzeRequest › should analyze request (125 ms)
#   ✓ RFPOrchestratorAgent › analyzeRequest › should throw error if request not found (45 ms)
```

**Step 5: Refactor for Production**

- Add OpenAI integration
- Enhance complexity calculation
- Add more test cases
- Document the code

### Pull Request Template

Create `.github/pull_request_template.md`:

```markdown
## Description
<!-- Provide a brief description of the changes in this PR -->

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issue
<!-- Link to the issue this PR addresses -->
Closes #

## Changes Made
<!-- List the specific changes made in this PR -->
-
-
-

## Testing
<!-- Describe the tests you ran and their results -->
- [ ] All existing tests pass
- [ ] New tests added and passing
- [ ] Manual testing completed

### Test Coverage
- Unit tests: ____%
- Integration tests: ____%

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No merge conflicts

## Deployment Notes
<!-- Any special instructions for deployment -->

## Security Considerations
<!-- Highlight any security implications -->
- [ ] No sensitive data exposed
- [ ] Environment variables properly configured
- [ ] RLS policies verified (if database changes)
```

---

## Database Schema & RLS Policies

### Complete Supabase Schema with Clerk Integration

**Branch**: `feature/database-schema`

**File**: `supabase/schema.sql`

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE request_priority AS ENUM ('standard', 'urgent', 'vip');
CREATE TYPE request_status AS ENUM ('pending', 'searching', 'quotes_received', 'analyzing', 'proposal_sent', 'confirmed', 'cancelled');
CREATE TYPE proposal_status AS ENUM ('draft', 'pending_review', 'sent', 'accepted', 'rejected');
CREATE TYPE aircraft_category AS ENUM ('light', 'midsize', 'heavy', 'ultra-long-range');
CREATE TYPE communication_type AS ENUM ('email', 'sms', 'phone', 'internal_note');
CREATE TYPE error_severity AS ENUM ('P0', 'P1', 'P2', 'P3');

-- ============================================================================
-- USERS TABLE (ISO Agents) - Synced from Clerk
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL, -- Clerk user ID
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'iso_agent',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  vip_status BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}',
  google_sheets_row_id INTEGER,
  last_flight_date TIMESTAMP WITH TIME ZONE,
  total_bookings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_clients_created_by ON clients(created_by);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_google_sheets_row ON clients(google_sheets_row_id);

-- ============================================================================
-- OPERATORS TABLE
-- ============================================================================
CREATE TABLE operators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  avinode_operator_id VARCHAR(100) UNIQUE,
  contact_email VARCHAR(255),
  response_time_avg INTEGER,
  rating DECIMAL(3,2),
  location VARCHAR(255),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_operators_avinode_id ON operators(avinode_operator_id);

-- ============================================================================
-- AIRCRAFT TABLE
-- ============================================================================
CREATE TABLE aircraft (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID REFERENCES operators(id) ON DELETE CASCADE,
  model VARCHAR(255) NOT NULL,
  category aircraft_category NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  range INTEGER NOT NULL,
  speed INTEGER NOT NULL,
  base_price DECIMAL(12,2),
  specifications JSONB DEFAULT '{}',
  availability BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_aircraft_operator ON aircraft(operator_id);
CREATE INDEX idx_aircraft_category ON aircraft(category);

-- ============================================================================
-- REQUESTS TABLE
-- ============================================================================
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  iso_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  priority request_priority DEFAULT 'standard',

  -- Flight details
  departure_airport CHAR(3) NOT NULL,
  arrival_airport CHAR(3) NOT NULL,
  departure_date TIMESTAMP WITH TIME ZONE NOT NULL,
  return_date TIMESTAMP WITH TIME ZONE,
  passenger_count INTEGER NOT NULL CHECK (passenger_count > 0),

  -- Preferences
  aircraft_preferences JSONB DEFAULT '[]',
  special_requirements TEXT,
  budget_range JSONB,

  -- Workflow state
  status request_status DEFAULT 'pending',
  current_agent VARCHAR(100),
  workflow_state JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_requests_iso_agent ON requests(iso_agent_id);
CREATE INDEX idx_requests_client ON requests(client_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_created_at ON requests(created_at DESC);

-- ============================================================================
-- QUOTES TABLE
-- ============================================================================
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  aircraft_id UUID REFERENCES aircraft(id) ON DELETE SET NULL,

  -- Pricing
  base_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  pricing_breakdown JSONB DEFAULT '{}',

  -- Quote details
  avinode_quote_id VARCHAR(100),
  valid_until TIMESTAMP WITH TIME ZONE,
  response_time INTEGER,
  operator_notes TEXT,

  -- Status
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quotes_request ON quotes(request_id);
CREATE INDEX idx_quotes_operator ON quotes(operator_id);
CREATE INDEX idx_quotes_avinode_id ON quotes(avinode_quote_id);

-- ============================================================================
-- PROPOSALS TABLE
-- ============================================================================
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,

  -- Proposal details
  title VARCHAR(255),
  recommended BOOLEAN DEFAULT FALSE,

  -- Analysis scores
  analysis_scores JSONB DEFAULT '{}',

  -- Pricing with markup
  base_price DECIMAL(12,2) NOT NULL,
  markup_amount DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  markup_percentage DECIMAL(5,2),

  -- Status
  status proposal_status DEFAULT 'draft',
  sent_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_proposals_request ON proposals(request_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_created_by ON proposals(created_by);

-- ============================================================================
-- COMMUNICATIONS TABLE
-- ============================================================================
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,

  -- Communication details
  type communication_type NOT NULL,
  direction VARCHAR(20) NOT NULL,

  -- Recipients
  to_email VARCHAR(255),
  from_email VARCHAR(255),
  cc_emails TEXT[],

  -- Content
  subject VARCHAR(500),
  body TEXT,
  template_used VARCHAR(100),

  -- External IDs
  gmail_message_id VARCHAR(255),

  -- Status
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_communications_request ON communications(request_id);
CREATE INDEX idx_communications_gmail_id ON communications(gmail_message_id);

-- ============================================================================
-- ERROR LOGS TABLE
-- ============================================================================
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,

  -- Error details
  severity error_severity NOT NULL,
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,

  -- Context
  agent_name VARCHAR(100),
  function_name VARCHAR(100),
  context_data JSONB DEFAULT '{}',

  -- Resolution
  resolution_status VARCHAR(50) DEFAULT 'open',
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  escalated BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_request ON error_logs(request_id);

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,

  -- Action details
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,

  -- Changes
  old_values JSONB,
  new_values JSONB,

  -- Metadata
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_request ON audit_logs(request_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- AGENT SESSIONS TABLE
-- ============================================================================
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  agent_name VARCHAR(100) NOT NULL,

  -- OpenAI details
  openai_thread_id VARCHAR(255),
  openai_assistant_id VARCHAR(255),

  -- Session state
  session_state JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_agent_sessions_request ON agent_sessions(request_id);
CREATE INDEX idx_agent_sessions_thread ON agent_sessions(openai_thread_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operators_updated_at BEFORE UPDATE ON operators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_aircraft_updated_at BEFORE UPDATE ON aircraft
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own user record
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (clerk_user_id = current_setting('app.clerk_user_id', true));

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (clerk_user_id = current_setting('app.clerk_user_id', true));

-- Clients: Users can see clients they created
CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  USING (
    created_by IN (
      SELECT id FROM users WHERE clerk_user_id = current_setting('app.clerk_user_id', true)
    )
  );

CREATE POLICY "Users can create clients"
  ON clients FOR INSERT
  WITH CHECK (
    created_by IN (
      SELECT id FROM users WHERE clerk_user_id = current_setting('app.clerk_user_id', true)
    )
  );

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  USING (
    created_by IN (
      SELECT id FROM users WHERE clerk_user_id = current_setting('app.clerk_user_id', true)
    )
  );

-- Requests: Users can only see their own requests
CREATE POLICY "Users can view own requests"
  ON requests FOR SELECT
  USING (
    iso_agent_id IN (
      SELECT id FROM users WHERE clerk_user_id = current_setting('app.clerk_user_id', true)
    )
  );

CREATE POLICY "Users can create requests"
  ON requests FOR INSERT
  WITH CHECK (
    iso_agent_id IN (
      SELECT id FROM users WHERE clerk_user_id = current_setting('app.clerk_user_id', true)
    )
  );

CREATE POLICY "Users can update own requests"
  ON requests FOR UPDATE
  USING (
    iso_agent_id IN (
      SELECT id FROM users WHERE clerk_user_id = current_setting('app.clerk_user_id', true)
    )
  );

-- Quotes: Users can see quotes for their requests
CREATE POLICY "Users can view quotes for own requests"
  ON quotes FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM requests WHERE iso_agent_id IN (
        SELECT id FROM users WHERE clerk_user_id = current_setting('app.clerk_user_id', true)
      )
    )
  );

-- Proposals: Users can see proposals for their requests
CREATE POLICY "Users can view proposals for own requests"
  ON proposals FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM requests WHERE iso_agent_id IN (
        SELECT id FROM users WHERE clerk_user_id = current_setting('app.clerk_user_id', true)
      )
    )
  );

CREATE POLICY "Users can update proposals for own requests"
  ON proposals FOR UPDATE
  USING (
    request_id IN (
      SELECT id FROM requests WHERE iso_agent_id IN (
        SELECT id FROM users WHERE clerk_user_id = current_setting('app.clerk_user_id', true)
      )
    )
  );

-- Communications: Users can see communications for their requests
CREATE POLICY "Users can view communications for own requests"
  ON communications FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM requests WHERE iso_agent_id IN (
        SELECT id FROM users WHERE clerk_user_id = current_setting('app.clerk_user_id', true)
      )
    )
  );

-- Error logs: Users can view errors for their requests
CREATE POLICY "Users can view error logs for own requests"
  ON error_logs FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM requests WHERE iso_agent_id IN (
        SELECT id FROM users WHERE clerk_user_id = current_setting('app.clerk_user_id', true)
      )
    ) OR request_id IS NULL
  );

-- Audit logs: Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_user_id = current_setting('app.clerk_user_id', true)
    )
  );
```

### Setting Clerk User Context in API Routes

File: `app/api/requests/route.ts`

```typescript
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Create Supabase client with Clerk user context
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        headers: {
          // Set Clerk user ID for RLS policies
          'x-clerk-user-id': userId
        }
      }
    }
  )

  // Set app.clerk_user_id for RLS
  await supabase.rpc('set_clerk_user_context', { clerk_user_id: userId })

  // Now RLS policies will filter data automatically
  const { data, error } = await supabase
    .from('requests')
    .select('*')

  if (error) {
    return new Response(error.message, { status: 500 })
  }

  return Response.json(data)
}
```

**Helper Function** (add to schema):

```sql
-- Helper function to set Clerk user context for RLS
CREATE OR REPLACE FUNCTION set_clerk_user_context(clerk_user_id TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.clerk_user_id', clerk_user_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## MCP Server Implementations

### Overview of MCP Architecture

Model Context Protocol (MCP) servers provide a standardized way for AI agents to interact with external services. Each MCP server exposes **tools** that agents can call via OpenAI function calling.

**Benefits**:
- Clean separation between agents and external APIs
- Reusable service integrations
- Easy testing and mocking
- Standardized error handling

### MCP Server Structure

```
mcp-servers/
├── avinode/
│   ├── package.json
│   ├── index.ts              # Main MCP server
│   ├── tools/
│   │   ├── search-flights.ts
│   │   ├── create-rfp.ts
│   │   └── get-quotes.ts
│   └── __tests__/
├── gmail/
│   ├── package.json
│   ├── index.ts
│   ├── tools/
│   │   ├── send-email.ts
│   │   └── get-threads.ts
│   └── __tests__/
└── google-sheets/
    ├── package.json
    ├── index.ts
    ├── tools/
    │   ├── sync-clients.ts
    │   └── get-client.ts
    └── __tests__/
```

### Avinode MCP Server

**Branch**: `feature/avinode-mcp-server`

**File**: `mcp-servers/avinode/package.json`

```json
{
  "name": "@jetvision/avinode-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "description": "MCP server for Avinode API integration",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch index.ts",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "axios": "^1.6.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "jest": "^29.7.0"
  }
}
```

**File**: `mcp-servers/avinode/index.ts`

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import axios from 'axios'
import { z } from 'zod'

// Avinode API configuration
const AVINODE_API_KEY = process.env.AVINODE_API_KEY
const AVINODE_BASE_URL = process.env.AVINODE_API_BASE_URL || 'https://api.avinode.com/v1'

if (!AVINODE_API_KEY) {
  throw new Error('AVINODE_API_KEY environment variable is required')
}

// Initialize MCP server
const server = new Server(
  {
    name: 'avinode-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// ============================================================================
// TOOL 1: Search Flights
// ============================================================================

const SearchFlightsSchema = z.object({
  departure_airport: z.string().length(3),
  arrival_airport: z.string().length(3),
  departure_date: z.string(),
  return_date: z.string().optional(),
  passenger_count: z.number().int().positive(),
  aircraft_categories: z.array(z.enum(['light', 'midsize', 'heavy', 'ultra-long-range'])),
})

async function searchFlights(args: z.infer<typeof SearchFlightsSchema>) {
  const response = await axios.post(
    `${AVINODE_BASE_URL}/search`,
    {
      route: {
        legs: [
          {
            departure_airport: args.departure_airport,
            arrival_airport: args.arrival_airport,
            departure_date: args.departure_date,
          },
        ],
      },
      passenger_count: args.passenger_count,
      aircraft_categories: args.aircraft_categories,
    },
    {
      headers: {
        Authorization: `Bearer ${AVINODE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return response.data
}

// ============================================================================
// TOOL 2: Create RFP
// ============================================================================

const CreateRFPSchema = z.object({
  reference_id: z.string(),
  departure_airport: z.string().length(3),
  arrival_airport: z.string().length(3),
  departure_date: z.string(),
  passenger_count: z.number().int().positive(),
  operator_ids: z.array(z.string()),
  response_deadline_hours: z.number().positive(),
  special_requirements: z.string().optional(),
  budget_range: z
    .object({
      min: z.number(),
      max: z.number(),
      currency: z.string().default('USD'),
    })
    .optional(),
})

async function createRFP(args: z.infer<typeof CreateRFPSchema>) {
  const deadline = new Date()
  deadline.setHours(deadline.getHours() + args.response_deadline_hours)

  const response = await axios.post(
    `${AVINODE_BASE_URL}/rfp`,
    {
      reference_id: args.reference_id,
      route: {
        legs: [
          {
            departure_airport: args.departure_airport,
            arrival_airport: args.arrival_airport,
            departure_date: args.departure_date,
          },
        ],
      },
      passenger_count: args.passenger_count,
      operators: args.operator_ids,
      response_deadline: deadline.toISOString(),
      special_requirements: args.special_requirements,
      budget_indication: args.budget_range,
    },
    {
      headers: {
        Authorization: `Bearer ${AVINODE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return response.data
}

// ============================================================================
// TOOL 3: Get RFP Quotes
// ============================================================================

const GetQuotesSchema = z.object({
  rfp_id: z.string(),
})

async function getQuotes(args: z.infer<typeof GetQuotesSchema>) {
  const response = await axios.get(`${AVINODE_BASE_URL}/rfp/${args.rfp_id}/quotes`, {
    headers: {
      Authorization: `Bearer ${AVINODE_API_KEY}`,
    },
  })

  return response.data
}

// ============================================================================
// MCP Tool Registration
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_flights',
        description:
          'Search for available aircraft and operators for a specific route and date. Returns a list of aircraft that match the criteria.',
        inputSchema: {
          type: 'object',
          properties: {
            departure_airport: {
              type: 'string',
              description: 'IATA code for departure airport (e.g., "TEB")',
            },
            arrival_airport: {
              type: 'string',
              description: 'IATA code for arrival airport (e.g., "VNY")',
            },
            departure_date: {
              type: 'string',
              description: 'Departure date in ISO format (e.g., "2025-12-01T10:00:00Z")',
            },
            return_date: {
              type: 'string',
              description: 'Optional return date for round-trip',
            },
            passenger_count: {
              type: 'number',
              description: 'Number of passengers',
            },
            aircraft_categories: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['light', 'midsize', 'heavy', 'ultra-long-range'],
              },
              description: 'Preferred aircraft categories',
            },
          },
          required: [
            'departure_airport',
            'arrival_airport',
            'departure_date',
            'passenger_count',
            'aircraft_categories',
          ],
        },
      },
      {
        name: 'create_rfp',
        description:
          'Create an RFP (Request for Proposal) and send it to selected operators. Returns the RFP ID and operator contact details.',
        inputSchema: {
          type: 'object',
          properties: {
            reference_id: {
              type: 'string',
              description: 'Internal reference ID (e.g., request UUID)',
            },
            departure_airport: {
              type: 'string',
              description: 'IATA code for departure airport',
            },
            arrival_airport: {
              type: 'string',
              description: 'IATA code for arrival airport',
            },
            departure_date: {
              type: 'string',
              description: 'Departure date in ISO format',
            },
            passenger_count: {
              type: 'number',
              description: 'Number of passengers',
            },
            operator_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of operator IDs to send RFP to',
            },
            response_deadline_hours: {
              type: 'number',
              description: 'Hours until response deadline (e.g., 24)',
            },
            special_requirements: {
              type: 'string',
              description: 'Special requirements or notes',
            },
            budget_range: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' },
                currency: { type: 'string' },
              },
            },
          },
          required: [
            'reference_id',
            'departure_airport',
            'arrival_airport',
            'departure_date',
            'passenger_count',
            'operator_ids',
            'response_deadline_hours',
          ],
        },
      },
      {
        name: 'get_quotes',
        description: 'Get all quotes received for a specific RFP',
        inputSchema: {
          type: 'object',
          properties: {
            rfp_id: {
              type: 'string',
              description: 'The RFP ID to get quotes for',
            },
          },
          required: ['rfp_id'],
        },
      },
    ],
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params

    switch (name) {
      case 'search_flights': {
        const validated = SearchFlightsSchema.parse(args)
        const result = await searchFlights(validated)
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        }
      }

      case 'create_rfp': {
        const validated = CreateRFPSchema.parse(args)
        const result = await createRFP(validated)
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        }
      }

      case 'get_quotes': {
        const validated = GetQuotesSchema.parse(args)
        const result = await getQuotes(validated)
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid arguments: ${error.message}`)
    }
    throw error
  }
})

// Start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Avinode MCP server running on stdio')
}

main().catch((error) => {
  console.error('Server error:', error)
  process.exit(1)
})
```

### Gmail MCP Server

**Branch**: `feature/gmail-mcp-server`

**File**: `mcp-servers/gmail/index.ts`

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { google } from 'googleapis'
import { z } from 'zod'

// Gmail API configuration
const gmail = google.gmail('v1')
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET
)

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
})

google.options({ auth: oauth2Client })

const server = new Server(
  {
    name: 'gmail-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// ============================================================================
// TOOL 1: Send Email
// ============================================================================

const SendEmailSchema = z.object({
  to: z.string().email(),
  from: z.string().email(),
  subject: z.string(),
  body_html: z.string(),
  cc: z.array(z.string().email()).optional(),
})

async function sendEmail(args: z.infer<typeof SendEmailSchema>) {
  const messageParts = [
    `From: ${args.from}`,
    `To: ${args.to}`,
    ...(args.cc ? [`Cc: ${args.cc.join(', ')}`] : []),
    `Subject: ${args.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    args.body_html,
  ]

  const message = messageParts.join('\n')
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  })

  return response.data
}

// ============================================================================
// TOOL 2: Get Email Threads
// ============================================================================

const GetThreadsSchema = z.object({
  query: z.string().optional(),
  max_results: z.number().int().positive().default(10),
})

async function getThreads(args: z.infer<typeof GetThreadsSchema>) {
  const response = await gmail.users.threads.list({
    userId: 'me',
    q: args.query,
    maxResults: args.max_results,
  })

  return response.data
}

// ============================================================================
// MCP Tool Registration
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'send_email',
        description: 'Send an email via Gmail API',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient email address' },
            from: { type: 'string', description: 'Sender email address' },
            subject: { type: 'string', description: 'Email subject' },
            body_html: { type: 'string', description: 'HTML email body' },
            cc: {
              type: 'array',
              items: { type: 'string' },
              description: 'CC recipients',
            },
          },
          required: ['to', 'from', 'subject', 'body_html'],
        },
      },
      {
        name: 'get_threads',
        description: 'Get email threads from Gmail',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Gmail search query' },
            max_results: { type: 'number', description: 'Maximum results to return' },
          },
        },
      },
    ],
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params

    switch (name) {
      case 'send_email': {
        const validated = SendEmailSchema.parse(args)
        const result = await sendEmail(validated)
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        }
      }

      case 'get_threads': {
        const validated = GetThreadsSchema.parse(args)
        const result = await getThreads(validated)
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid arguments: ${error.message}`)
    }
    throw error
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Gmail MCP server running on stdio')
}

main().catch((error) => {
  console.error('Server error:', error)
  process.exit(1)
})
```

### Google Sheets MCP Server

**Branch**: `feature/sheets-mcp-server`

**File**: `mcp-servers/google-sheets/index.ts`

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { google } from 'googleapis'
import { z } from 'zod'

const sheets = google.sheets('v4')
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})

google.options({ auth })

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

const server = new Server(
  {
    name: 'google-sheets-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// ============================================================================
// TOOL 1: Sync All Clients
// ============================================================================

const SyncClientsSchema = z.object({
  range: z.string().default('Clients!A2:Z'),
})

async function syncClients(args: z.infer<typeof SyncClientsSchema>) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: args.range,
  })

  const rows = response.data.values || []

  const clients = rows.map((row: string[], index: number) => ({
    name: row[0],
    email: row[1],
    phone: row[2],
    company: row[3],
    vip_status: row[4]?.toLowerCase() === 'yes',
    preferences: row[5] ? JSON.parse(row[5]) : {},
    google_sheets_row_id: index + 2,
  }))

  return { clients, count: clients.length }
}

// ============================================================================
// TOOL 2: Get Client by Email/Name
// ============================================================================

const GetClientSchema = z.object({
  identifier: z.string(),
  range: z.string().default('Clients!A2:Z'),
})

async function getClient(args: z.infer<typeof GetClientSchema>) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: args.range,
  })

  const rows = response.data.values || []

  const matchingRow = rows.find(
    (row: string[]) =>
      row[0]?.toLowerCase().includes(args.identifier.toLowerCase()) || // Name
      row[1]?.toLowerCase() === args.identifier.toLowerCase() // Email
  )

  if (!matchingRow) {
    throw new Error(`Client not found: ${args.identifier}`)
  }

  return {
    name: matchingRow[0],
    email: matchingRow[1],
    phone: matchingRow[2],
    company: matchingRow[3],
    vip_status: matchingRow[4]?.toLowerCase() === 'yes',
    preferences: matchingRow[5] ? JSON.parse(matchingRow[5]) : {},
    google_sheets_row_id: rows.indexOf(matchingRow) + 2,
  }
}

// ============================================================================
// MCP Tool Registration
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'sync_clients',
        description: 'Sync all client data from Google Sheets',
        inputSchema: {
          type: 'object',
          properties: {
            range: {
              type: 'string',
              description: 'Sheet range to read (default: Clients!A2:Z)',
            },
          },
        },
      },
      {
        name: 'get_client',
        description: 'Get a specific client by email or name from Google Sheets',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Client email or name to search for',
            },
            range: {
              type: 'string',
              description: 'Sheet range to search (default: Clients!A2:Z)',
            },
          },
          required: ['identifier'],
        },
      },
    ],
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params

    switch (name) {
      case 'sync_clients': {
        const validated = SyncClientsSchema.parse(args)
        const result = await syncClients(validated)
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        }
      }

      case 'get_client': {
        const validated = GetClientSchema.parse(args)
        const result = await getClient(validated)
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid arguments: ${error.message}`)
    }
    throw error
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Google Sheets MCP server running on stdio')
}

main().catch((error) => {
  console.error('Server error:', error)
  process.exit(1)
})
```

### PDF Generation Service

**File**: `lib/pdf/generator.ts`

PDF generation is implemented as an agent tool and standalone service for creating professional proposal documents. Unlike the MCP servers above, PDF generation is a direct service integrated into the Communication Manager Agent.

#### Installation

```bash
npm install @react-pdf/renderer
```

#### Architecture

```
┌──────────────────────────────────────┐
│   Communication Manager Agent        │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Agent Tool:                   │ │
│  │  generate_proposal_pdf()       │ │
│  └────────────┬───────────────────┘ │
│               │                      │
└───────────────┼──────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│       PDF Generator Service           │
│                                       │
│  • generateProposalPDF()             │
│  • fetchProposalData()               │
│  • savePDFToStorage()                │
└───────────────┬───────────────────────┘
                │
      ┌─────────┴─────────┐
      ▼                   ▼
┌─────────────┐    ┌─────────────┐
│  Supabase   │    │   Storage   │
│  Database   │    │   (PDFs)    │
└─────────────┘    └─────────────┘
```

#### PDF Generator Implementation

**File**: `lib/pdf/generator.ts`

```typescript
import { renderToBuffer, renderToStream } from '@react-pdf/renderer'
import { ProposalPDF } from './templates/proposal-template'
import { createClient } from '@/utils/supabase/server'
import type { PDFGenerationOptions, ProposalData } from './types'

export class PDFGenerator {
  private supabase = createClient()

  /**
   * Generate PDF document for a proposal
   */
  async generateProposalPDF(
    proposalId: string,
    options: PDFGenerationOptions = {}
  ): Promise<Buffer> {
    // 1. Fetch proposal data
    const proposal = await this.fetchProposalData(proposalId)

    // 2. Validate data
    this.validateProposalData(proposal)

    // 3. Generate PDF using React-PDF
    const pdfDocument = (
      <ProposalPDF proposal={proposal} options={options} />
    )
    const pdfBuffer = await renderToBuffer(pdfDocument)

    // 4. Optionally save to storage
    if (options.saveToStorage) {
      await this.savePDFToStorage(proposalId, pdfBuffer, options)
    }

    // 5. Log generation for audit trail
    await this.logPDFGeneration(proposalId, options)

    return pdfBuffer
  }

  /**
   * Generate PDF as stream (for large documents)
   */
  async generateProposalPDFStream(
    proposalId: string,
    options: PDFGenerationOptions = {}
  ) {
    const proposal = await this.fetchProposalData(proposalId)
    const pdfDocument = <ProposalPDF proposal={proposal} options={options} />
    return renderToStream(pdfDocument)
  }

  /**
   * Fetch proposal data from database
   */
  private async fetchProposalData(proposalId: string): Promise<ProposalData> {
    const { data: proposal, error } = await this.supabase
      .from('proposals')
      .select(`
        *,
        quote:quotes(
          *,
          operator:operators(*),
          aircraft:aircraft(*)
        ),
        request:requests(
          *,
          client:clients(*)
        )
      `)
      .eq('id', proposalId)
      .single()

    if (error || !proposal) {
      throw new Error(`Proposal not found: ${proposalId}`)
    }

    return this.transformToProposalData(proposal)
  }

  /**
   * Save PDF to Supabase Storage
   */
  private async savePDFToStorage(
    proposalId: string,
    pdfBuffer: Buffer,
    options: PDFGenerationOptions
  ): Promise<string> {
    const fileName = `proposal-${proposalId}-${Date.now()}.pdf`
    const filePath = `proposals/${proposalId}/${fileName}`

    const { error } = await this.supabase.storage
      .from('pdfs')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (error) {
      throw new Error(`Failed to save PDF: ${error.message}`)
    }

    return filePath
  }

  /**
   * Log PDF generation for audit trail
   */
  private async logPDFGeneration(
    proposalId: string,
    options: PDFGenerationOptions
  ) {
    await this.supabase.from('audit_logs').insert({
      action: 'pdf_generated',
      resource_type: 'proposal',
      resource_id: proposalId,
      user_id: options.generatedBy,
      metadata: {
        watermark: options.watermark,
        internalView: options.internalView,
        template: options.template || 'proposal',
      },
    })
  }

  private validateProposalData(proposal: ProposalData) {
    const required = ['id', 'client', 'route', 'aircraft', 'pricing']
    for (const field of required) {
      if (!proposal[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }
  }

  private transformToProposalData(rawData: any): ProposalData {
    // Transform database result to ProposalData type
    return {
      id: rawData.id,
      createdAt: rawData.created_at,
      client: {
        name: rawData.request.client.name,
        email: rawData.request.client.email,
        company: rawData.request.client.company,
      },
      route: {
        departure: rawData.request.route.departure,
        arrival: rawData.request.route.arrival,
        departureCode: rawData.request.route.departure_code,
        arrivalCode: rawData.request.route.arrival_code,
      },
      flightDate: rawData.request.flight_date,
      passengers: rawData.request.passengers,
      estimatedDuration: rawData.quote.estimated_duration,
      aircraft: {
        model: rawData.quote.aircraft.model,
        type: rawData.quote.aircraft.type,
        capacity: rawData.quote.aircraft.capacity,
        amenities: rawData.quote.aircraft.amenities || [],
      },
      operator: {
        name: rawData.quote.operator.name,
        rating: rawData.quote.operator.rating,
      },
      pricing: {
        basePrice: rawData.base_price,
        margin: rawData.margin,
        fuelSurcharge: rawData.fuel_surcharge || 0,
        taxesAndFees: rawData.taxes_and_fees || 0,
        totalPrice: rawData.total_price,
        validUntil: rawData.valid_until,
      },
    }
  }
}

// Export singleton instance
export const pdfGenerator = new PDFGenerator()

// Convenience functions
export async function generateProposalPDF(
  proposalId: string,
  options?: PDFGenerationOptions
) {
  return pdfGenerator.generateProposalPDF(proposalId, options)
}

export async function generateProposalPDFStream(
  proposalId: string,
  options?: PDFGenerationOptions
) {
  return pdfGenerator.generateProposalPDFStream(proposalId, options)
}
```

#### TypeScript Types

**File**: `lib/pdf/types.ts`

```typescript
export interface ProposalData {
  id: string
  createdAt: string
  client: {
    name: string
    email: string
    company?: string
  }
  route: {
    departure: string
    arrival: string
    departureCode: string
    arrivalCode: string
  }
  flightDate: string
  passengers: number
  estimatedDuration: string
  aircraft: {
    model: string
    type: string
    capacity: number
    amenities: string[]
  }
  operator: {
    name: string
    rating: number
  }
  pricing: {
    basePrice: number
    margin: number
    fuelSurcharge: number
    taxesAndFees: number
    totalPrice: number
    validUntil: string
  }
}

export interface PDFGenerationOptions {
  template?: 'proposal' | 'invoice' | 'quote_comparison'
  watermark?: boolean
  internalView?: boolean
  saveToStorage?: boolean
  generatedBy?: string
  format?: 'buffer' | 'stream'
}
```

#### PDF Template

**File**: `lib/pdf/templates/proposal-template.tsx`

```typescript
import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import type { ProposalData, PDFGenerationOptions } from '../types'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2 solid #3b82f6',
  },
  logo: {
    width: 120,
    height: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1e40af',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: '40%',
    fontWeight: 'bold',
  },
  value: {
    width: '60%',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottom: '1 solid #e5e7eb',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 10,
    borderTop: '2 solid #1e40af',
    fontWeight: 'bold',
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#6b7280',
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '25%',
    fontSize: 60,
    color: '#e5e7eb',
    opacity: 0.3,
    transform: 'rotate(-45deg)',
  },
})

interface ProposalPDFProps {
  proposal: ProposalData
  options?: PDFGenerationOptions
}

export const ProposalPDF: React.FC<ProposalPDFProps> = ({
  proposal,
  options = {},
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Flight Proposal</Text>
          <Text>Proposal ID: {proposal.id}</Text>
        </View>

        {/* Client Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{proposal.client.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{proposal.client.email}</Text>
          </View>
          {proposal.client.company && (
            <View style={styles.row}>
              <Text style={styles.label}>Company:</Text>
              <Text style={styles.value}>{proposal.client.company}</Text>
            </View>
          )}
        </View>

        {/* Flight Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Route:</Text>
            <Text style={styles.value}>
              {proposal.route.departure} ({proposal.route.departureCode}) →{' '}
              {proposal.route.arrival} ({proposal.route.arrivalCode})
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{proposal.flightDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Passengers:</Text>
            <Text style={styles.value}>{proposal.passengers}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Duration:</Text>
            <Text style={styles.value}>{proposal.estimatedDuration}</Text>
          </View>
        </View>

        {/* Aircraft Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aircraft</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Model:</Text>
            <Text style={styles.value}>{proposal.aircraft.model}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Type:</Text>
            <Text style={styles.value}>{proposal.aircraft.type}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Capacity:</Text>
            <Text style={styles.value}>{proposal.aircraft.capacity} passengers</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Operator:</Text>
            <Text style={styles.value}>
              {proposal.operator.name} (Rating: {proposal.operator.rating}/5)
            </Text>
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          {options.internalView && (
            <View style={styles.priceRow}>
              <Text>Base Price (Operator):</Text>
              <Text>{formatCurrency(proposal.pricing.basePrice)}</Text>
            </View>
          )}
          {options.internalView && (
            <View style={styles.priceRow}>
              <Text>Margin:</Text>
              <Text>{formatCurrency(proposal.pricing.margin)}</Text>
            </View>
          )}
          <View style={styles.priceRow}>
            <Text>Flight Cost:</Text>
            <Text>
              {formatCurrency(
                options.internalView
                  ? proposal.pricing.basePrice + proposal.pricing.margin
                  : proposal.pricing.totalPrice -
                    proposal.pricing.fuelSurcharge -
                    proposal.pricing.taxesAndFees
              )}
            </Text>
          </View>
          {proposal.pricing.fuelSurcharge > 0 && (
            <View style={styles.priceRow}>
              <Text>Fuel Surcharge:</Text>
              <Text>{formatCurrency(proposal.pricing.fuelSurcharge)}</Text>
            </View>
          )}
          <View style={styles.priceRow}>
            <Text>Taxes & Fees:</Text>
            <Text>{formatCurrency(proposal.pricing.taxesAndFees)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Total Price:</Text>
            <Text>{formatCurrency(proposal.pricing.totalPrice)}</Text>
          </View>
          <Text style={{ marginTop: 10, fontSize: 9, color: '#6b7280' }}>
            Valid until: {proposal.pricing.validUntil}
          </Text>
        </View>

        {/* Terms & Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          <Text style={{ fontSize: 9, lineHeight: 1.5 }}>
            This proposal is subject to aircraft availability. Final pricing may vary based on
            actual flight time, fuel costs, and additional services requested. A deposit of 50%
            is required to confirm the booking. Cancellation policy applies as per our standard
            terms.
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Jetvision AI • Powered by intelligent flight matching • contact@jetvision.ai
        </Text>

        {/* Watermark */}
        {options.watermark && <Text style={styles.watermark}>DRAFT</Text>}
      </Page>
    </Document>
  )
}
```

#### API Endpoint

**File**: `app/api/proposals/[id]/pdf/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateProposalPDF } from '@/lib/pdf/generator'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get query parameters
    const searchParams = request.nextUrl.searchParams
    const watermark = searchParams.get('watermark') === 'true'
    const internalView = searchParams.get('internal') === 'true'
    const inline = searchParams.get('inline') === 'true'

    // 3. Generate PDF
    const pdfBuffer = await generateProposalPDF(params.id, {
      watermark,
      internalView,
      generatedBy: userId,
      saveToStorage: true,
    })

    // 4. Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': inline
          ? `inline; filename="proposal-${params.id}.pdf"`
          : `attachment; filename="proposal-${params.id}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
```

**Complete documentation**: See `docs/subagents/technology-stack/pdf-generation/README.md`

### MCP Client Integration in Agents

**File**: `lib/mcp/client.ts`

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

export class MCPClient {
  private clients: Map<string, Client> = new Map()

  async connect(serverName: string, command: string, args: string[] = []) {
    if (this.clients.has(serverName)) {
      return this.clients.get(serverName)!
    }

    const transport = new StdioClientTransport({
      command,
      args,
    })

    const client = new Client(
      {
        name: `jetvision-${serverName}-client`,
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    )

    await client.connect(transport)
    this.clients.set(serverName, client)

    return client
  }

  async callTool(serverName: string, toolName: string, args: any) {
    const client = this.clients.get(serverName)
    if (!client) {
      throw new Error(`MCP client not connected: ${serverName}`)
    }

    const result = await client.callTool({
      name: toolName,
      arguments: args,
    })

    return JSON.parse(result.content[0].text)
  }

  async disconnect(serverName: string) {
    const client = this.clients.get(serverName)
    if (client) {
      await client.close()
      this.clients.delete(serverName)
    }
  }

  async disconnectAll() {
    for (const [name, client] of this.clients) {
      await client.close()
    }
    this.clients.clear()
  }
}

// Singleton instance
export const mcpClient = new MCPClient()
```

---

## AI Agent Implementations

### Agent Base Class with MCP Integration

**Branch**: `feature/agent-framework`

**File**: `lib/agents/base-agent.ts`

```typescript
import OpenAI from 'openai'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { mcpClient } from '@/lib/mcp/client'
import { ErrorMonitoringAgent } from './error-monitoring-agent'

export abstract class BaseAgent {
  protected openai: OpenAI
  protected supabase: any
  protected userId: string
  protected errorMonitor: ErrorMonitoringAgent
  protected abstract agentName: string
  protected abstract assistantId: string

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    this.errorMonitor = new ErrorMonitoringAgent()
  }

  async initialize() {
    const { supabase, userId } = await createSupabaseServerClient()
    this.supabase = supabase
    this.userId = userId
  }

  /**
   * Execute agent task with error handling
   */
  protected async executeWithErrorHandling<T>(
    fn: () => Promise<T>,
    context: {
      request_id?: string
      function_name: string
      context_data?: any
    }
  ): Promise<T> {
    try {
      return await fn()
    } catch (error: any) {
      await this.errorMonitor.logError({
        request_id: context.request_id,
        agent_name: this.agentName,
        function_name: context.function_name,
        error_message: error.message,
        error_stack: error.stack,
        context_data: context.context_data,
      })
      throw error
    }
  }

  /**
   * Call MCP tool
   */
  protected async callMCPTool(serverName: string, toolName: string, args: any) {
    return await mcpClient.callTool(serverName, toolName, args)
  }

  /**
   * Wait for OpenAI assistant run to complete
   */
  protected async waitForCompletion(threadId: string, runId: string, maxWaitSeconds = 30) {
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitSeconds * 1000) {
      const run = await this.openai.beta.threads.runs.retrieve(threadId, runId)

      if (run.status === 'completed') {
        return run
      } else if (
        run.status === 'failed' ||
        run.status === 'cancelled' ||
        run.status === 'expired'
      ) {
        throw new Error(`Assistant run ${run.status}: ${run.last_error?.message}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    throw new Error('Assistant run timeout')
  }

  /**
   * Create or get agent session
   */
  protected async createSession(requestId: string, threadId: string) {
    const { data } = await this.supabase
      .from('agent_sessions')
      .insert({
        request_id: requestId,
        agent_name: this.agentName,
        openai_thread_id: threadId,
        openai_assistant_id: this.assistantId,
      })
      .select()
      .single()

    return data
  }
}
```

### Flight Search Agent (with MCP)

**Branch**: `feature/flight-search-agent`

**File**: `lib/agents/flight-search-agent.ts`

```typescript
import { BaseAgent } from './base-agent'
import { mcpClient } from '@/lib/mcp/client'

interface SearchParameters {
  departure_airport: string
  arrival_airport: string
  departure_date: string
  passenger_count: number
  aircraft_categories: string[]
  max_operators: number
}

export class FlightSearchAgent extends BaseAgent {
  protected agentName = 'flight_search'
  protected assistantId = process.env.OPENAI_FLIGHT_SEARCH_ASSISTANT_ID!

  async initialize() {
    await super.initialize()

    // Connect to Avinode MCP server
    await mcpClient.connect(
      'avinode',
      'node',
      ['mcp-servers/avinode/dist/index.js']
    )
  }

  /**
   * Search for flights and create RFP
   */
  async searchAndRequestQuotes(requestId: string) {
    return this.executeWithErrorHandling(
      async () => {
        // 1. Fetch request data
        const { data: request } = await this.supabase
          .from('requests')
          .select('*, client:clients(*), workflow_state')
          .eq('id', requestId)
          .single()

        if (!request) throw new Error('Request not found')

        // 2. Extract search parameters
        const searchParams: SearchParameters = {
          departure_airport: request.departure_airport,
          arrival_airport: request.arrival_airport,
          departure_date: request.departure_date,
          passenger_count: request.passenger_count,
          aircraft_categories: request.workflow_state?.orchestrator_analysis?.search_parameters
            ?.aircraft_categories || ['midsize', 'heavy'],
          max_operators:
            request.workflow_state?.orchestrator_analysis?.search_parameters?.max_operators || 5,
        }

        // 3. Call Avinode MCP: search_flights
        const searchResults = await this.callMCPTool('avinode', 'search_flights', {
          departure_airport: searchParams.departure_airport,
          arrival_airport: searchParams.arrival_airport,
          departure_date: searchParams.departure_date,
          passenger_count: searchParams.passenger_count,
          aircraft_categories: searchParams.aircraft_categories,
        })

        // 4. Select best operators
        const selectedOperators = this.selectOperators(
          searchResults.results || [],
          request.client.preferences,
          searchParams.max_operators
        )

        // 5. Call Avinode MCP: create_rfp
        const rfpResponse = await this.callMCPTool('avinode', 'create_rfp', {
          reference_id: requestId,
          departure_airport: searchParams.departure_airport,
          arrival_airport: searchParams.arrival_airport,
          departure_date: searchParams.departure_date,
          passenger_count: searchParams.passenger_count,
          operator_ids: selectedOperators.map((op: any) => op.operator_id),
          response_deadline_hours: request.workflow_state?.orchestrator_analysis?.search_parameters
            ?.response_deadline_hours || 24,
          special_requirements: request.special_requirements,
          budget_range: request.budget_range,
        })

        // 6. Update request status
        await this.supabase
          .from('requests')
          .update({
            status: 'searching',
            current_agent: 'flight_search',
            workflow_state: {
              ...request.workflow_state,
              search_completed: true,
              avinode_rfp_id: rfpResponse.rfp_id,
              operators_contacted: selectedOperators.length,
              quotes_requested: selectedOperators.length,
              quotes_received: 0,
            },
          })
          .eq('id', requestId)

        return {
          rfp_id: rfpResponse.rfp_id,
          operators_contacted: selectedOperators.length,
        }
      },
      {
        request_id: requestId,
        function_name: 'searchAndRequestQuotes',
      }
    )
  }

  /**
   * Select best operators based on client preferences
   */
  private selectOperators(availableAircraft: any[], clientPreferences: any, maxOperators: number) {
    const scoredOperators = availableAircraft.map((aircraft) => {
      let score = 0

      // Match aircraft preferences
      if (clientPreferences.aircraft_preferences?.includes(aircraft.model)) {
        score += 10
      }

      // Operator rating
      score += (aircraft.operator_rating || 0) * 2

      // Response time
      score += (100 - (aircraft.avg_response_time || 100)) / 10

      // Price
      const priceScore = aircraft.estimated_price ? (50000 / aircraft.estimated_price) * 5 : 0
      score += Math.min(priceScore, 10)

      return {
        ...aircraft,
        selection_score: score,
      }
    })

    return scoredOperators
      .sort((a, b) => b.selection_score - a.selection_score)
      .slice(0, maxOperators)
  }
}
```

### Communication Manager Agent (with Gmail MCP)

**Branch**: `feature/communication-agent`

**File**: `lib/agents/communication-manager-agent.ts`

```typescript
import { BaseAgent } from './base-agent'
import { mcpClient } from '@/lib/mcp/client'
import { generateProposalPDF } from '@/lib/pdf/generator'

export class CommunicationManagerAgent extends BaseAgent {
  protected agentName = 'communication_manager'
  protected assistantId = process.env.OPENAI_COMMUNICATION_ASSISTANT_ID!

  async initialize() {
    await super.initialize()

    // Connect to Gmail MCP server
    await mcpClient.connect(
      'gmail',
      'node',
      ['mcp-servers/gmail/dist/index.js']
    )
  }

  /**
   * Define agent tools including PDF generation
   */
  protected getAgentTools() {
    return [
      {
        type: 'function' as const,
        function: {
          name: 'generate_proposal_pdf',
          description: 'Generate a PDF document for a proposal with options for watermarks and internal/client views',
          parameters: {
            type: 'object',
            properties: {
              proposalId: {
                type: 'string',
                description: 'The ID of the proposal to generate PDF for',
              },
              watermark: {
                type: 'boolean',
                description: 'Whether to add a DRAFT watermark to the PDF',
                default: false,
              },
              internalView: {
                type: 'boolean',
                description: 'Whether to show internal pricing breakdown (base price + margin)',
                default: false,
              },
              saveToStorage: {
                type: 'boolean',
                description: 'Whether to save the PDF to Supabase Storage',
                default: true,
              },
            },
            required: ['proposalId'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'send_email_with_pdf',
          description: 'Send an email with proposal PDFs attached',
          parameters: {
            type: 'object',
            properties: {
              requestId: {
                type: 'string',
                description: 'The request ID',
              },
              proposalIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of proposal IDs to generate PDFs for and attach',
              },
              watermark: {
                type: 'boolean',
                description: 'Whether to add watermark to PDFs',
                default: false,
              },
            },
            required: ['requestId', 'proposalIds'],
          },
        },
      },
    ]
  }

  /**
   * Handle tool calls from OpenAI
   */
  protected async handleToolCall(toolName: string, args: any) {
    switch (toolName) {
      case 'generate_proposal_pdf':
        return this.generatePDF(args)
      case 'send_email_with_pdf':
        return this.sendProposalEmailWithPDFs(args.requestId, args.proposalIds, args.watermark)
      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  }

  /**
   * Generate PDF for a single proposal
   */
  private async generatePDF(args: {
    proposalId: string
    watermark?: boolean
    internalView?: boolean
    saveToStorage?: boolean
  }) {
    try {
      const pdfBuffer = await generateProposalPDF(args.proposalId, {
        watermark: args.watermark || false,
        internalView: args.internalView || false,
        saveToStorage: args.saveToStorage !== false,
      })

      return {
        success: true,
        proposalId: args.proposalId,
        size: pdfBuffer.length,
        message: 'PDF generated successfully',
      }
    } catch (error) {
      console.error('PDF generation failed:', error)
      throw error
    }
  }

  /**
   * Send proposal email with PDF attachments
   */
  async sendProposalEmailWithPDFs(
    requestId: string,
    proposalIds: string[],
    watermark = false
  ) {
    return this.executeWithErrorHandling(
      async () => {
        // 1. Fetch request and proposals
        const { data: request } = await this.supabase
          .from('requests')
          .select('*, client:clients(*), iso_agent:users(*)')
          .eq('id', requestId)
          .single()

        const { data: proposals } = await this.supabase
          .from('proposals')
          .select(`
            *,
            quote:quotes(*, operator:operators(*), aircraft:aircraft(*))
          `)
          .in('id', proposalIds)
          .order('analysis_scores->overall_score', { ascending: false })

        if (!request || !proposals) {
          throw new Error('Request or proposals not found')
        }

        // 2. Generate PDFs for all proposals
        const pdfAttachments = await Promise.all(
          proposalIds.map(async (proposalId, index) => {
            const pdfBuffer = await generateProposalPDF(proposalId, {
              watermark,
              internalView: false, // Always client view for external emails
              saveToStorage: true,
            })

            return {
              filename: `proposal-${index + 1}-${proposalId.slice(0, 8)}.pdf`,
              content: pdfBuffer.toString('base64'),
              contentType: 'application/pdf',
            }
          })
        )

        // 3. Generate email content using OpenAI
        const emailContent = await this.generateEmailContent(request, proposals)

        // 4. Send email via Gmail MCP with PDF attachments
        const sentMessage = await this.callMCPTool('gmail', 'send_email', {
          to: request.client.email,
          from: request.iso_agent.email,
          subject: emailContent.subject,
          body_html: emailContent.html_body,
          attachments: pdfAttachments,
        })

        // 5. Log communication
        await this.supabase.from('communications').insert({
          request_id: requestId,
          type: 'email',
          direction: 'outbound',
          to_email: request.client.email,
          from_email: request.iso_agent.email,
          subject: emailContent.subject,
          body: emailContent.body,
          template_used: 'proposal_email',
          gmail_message_id: sentMessage.id,
          sent_at: new Date().toISOString(),
          metadata: {
            pdf_attachments: pdfAttachments.length,
            watermark,
          },
        })

        // 6. Update proposals
        await this.supabase
          .from('proposals')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .in('id', proposalIds)

        // 7. Update request
        await this.supabase
          .from('requests')
          .update({
            status: 'proposal_sent',
            workflow_state: {
              proposal_sent: true,
              proposals_sent_count: proposalIds.length,
            },
          })
          .eq('id', requestId)

        return {
          gmail_message_id: sentMessage.id,
          pdf_attachments: pdfAttachments.length,
        }
      },
      {
        request_id: requestId,
        function_name: 'sendProposalEmailWithPDFs',
      }
    )
  }

  /**
   * Send proposal email to client (legacy method without PDF)
   */
  async sendProposalEmail(requestId: string, proposalIds: string[]) {
    return this.executeWithErrorHandling(
      async () => {
        // 1. Fetch request and proposals
        const { data: request } = await this.supabase
          .from('requests')
          .select('*, client:clients(*), iso_agent:users(*)')
          .eq('id', requestId)
          .single()

        const { data: proposals } = await this.supabase
          .from('proposals')
          .select(`
            *,
            quote:quotes(*, operator:operators(*), aircraft:aircraft(*))
          `)
          .in('id', proposalIds)
          .order('analysis_scores->overall_score', { ascending: false })

        if (!request || !proposals) {
          throw new Error('Request or proposals not found')
        }

        // 2. Generate email content using OpenAI
        const emailContent = await this.generateEmailContent(request, proposals)

        // 3. Send email via Gmail MCP
        const sentMessage = await this.callMCPTool('gmail', 'send_email', {
          to: request.client.email,
          from: request.iso_agent.email,
          subject: emailContent.subject,
          body_html: emailContent.html_body,
        })

        // 4. Log communication
        await this.supabase.from('communications').insert({
          request_id: requestId,
          type: 'email',
          direction: 'outbound',
          to_email: request.client.email,
          from_email: request.iso_agent.email,
          subject: emailContent.subject,
          body: emailContent.body,
          template_used: 'proposal_email',
          gmail_message_id: sentMessage.id,
          sent_at: new Date().toISOString(),
        })

        // 5. Update proposals
        await this.supabase
          .from('proposals')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .in('id', proposalIds)

        // 6. Update request
        await this.supabase
          .from('requests')
          .update({
            status: 'proposal_sent',
            workflow_state: {
              proposal_sent: true,
              proposals_sent_count: proposalIds.length,
            },
          })
          .eq('id', requestId)

        return { gmail_message_id: sentMessage.id }
      },
      {
        request_id: requestId,
        function_name: 'sendProposalEmail',
      }
    )
  }

  private async generateEmailContent(request: any, proposals: any[]) {
    const thread = await this.openai.beta.threads.create()

    await this.openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: JSON.stringify({
        client_name: request.client.name,
        iso_agent_name: request.iso_agent.full_name,
        route: `${request.departure_airport} → ${request.arrival_airport}`,
        departure_date: request.departure_date,
        passenger_count: request.passenger_count,
        proposals: proposals.map((p) => ({
          aircraft: p.quote.aircraft.model,
          operator: p.quote.operator.name,
          total_price: p.total_price,
          capacity: p.quote.aircraft.capacity,
          recommended: p.recommended,
          highlights: p.analysis_scores,
        })),
      }),
    })

    const run = await this.openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: this.assistantId,
    })

    const messages = await this.openai.beta.threads.messages.list(thread.id)
    const emailMessage = messages.data[0]

    return JSON.parse(
      emailMessage.content[0].type === 'text' ? emailMessage.content[0].text.value : '{}'
    )
  }
}
```

---

## API Routes & Integration

### Protected API Routes

**Branch**: `feature/auth-middleware`

**File**: `app/api/requests/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { RFPOrchestratorAgent } from '@/lib/agents/rfp-orchestrator'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabase } = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('requests')
      .select(
        `
        *,
        client:clients(*),
        iso_agent:users(*),
        proposals:proposals(count)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      data,
      pagination: {
        total: count,
        limit,
        offset,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabase, userId: dbUserId } = await createSupabaseServerClient()
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['departure_airport', 'arrival_airport', 'departure_date', 'passenger_count']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Create request
    const { data: newRequest, error } = await supabase
      .from('requests')
      .insert({
        client_id: body.client_id,
        iso_agent_id: dbUserId,
        departure_airport: body.departure_airport,
        arrival_airport: body.arrival_airport,
        departure_date: body.departure_date,
        return_date: body.return_date,
        passenger_count: body.passenger_count,
        special_requirements: body.special_requirements,
        budget_range: body.budget_range,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Trigger RFP Orchestrator (async)
    const orchestrator = new RFPOrchestratorAgent()
    await orchestrator.initialize()
    orchestrator.analyzeRequest(newRequest.id).catch(console.error)

    return NextResponse.json(newRequest, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### Real-time Updates Hook

**File**: `lib/hooks/useRequestUpdates.ts`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { createSupabaseClient } from '@/lib/supabase/client'

export function useRequestUpdates(requestId: string) {
  const { isSignedIn } = useAuth()
  const [request, setRequest] = useState<any>(null)
  const [quotes, setQuotes] = useState<any[]>([])
  const [proposals, setProposals] = useState<any[]>([])

  useEffect(() => {
    if (!isSignedIn || !requestId) return

    const supabase = createSupabaseClient()

    // Subscribe to request changes
    const requestChannel = supabase
      .channel(`request:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          setRequest(payload.new)
        }
      )
      .subscribe()

    // Subscribe to new quotes
    const quotesChannel = supabase
      .channel(`quotes:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quotes',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          setQuotes((prev) => [...prev, payload.new])
        }
      )
      .subscribe()

    // Subscribe to proposal updates
    const proposalsChannel = supabase
      .channel(`proposals:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposals',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setProposals((prev) => [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setProposals((prev) =>
              prev.map((p) => (p.id === payload.new.id ? payload.new : p))
            )
          }
        }
      )
      .subscribe()

    return () => {
      requestChannel.unsubscribe()
      quotesChannel.unsubscribe()
      proposalsChannel.unsubscribe()
    }
  }, [isSignedIn, requestId])

  return { request, quotes, proposals }
}
```

---

## Testing Strategy

### Test Setup

**Branch**: `test/infrastructure`

**Dependencies**:

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event @testing-library/react-hooks
npm install --save-dev @types/jest ts-jest
npm install --save-dev @playwright/test
npm install --save-dev msw
```

**Jest Config** (`jest.config.js`):

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'lib/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

### Example Unit Test

**Branch**: `test/unit-coverage`

**File**: `lib/agents/__tests__/flight-search-agent.test.ts`

```typescript
import { FlightSearchAgent } from '../flight-search-agent'
import { mcpClient } from '@/lib/mcp/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'

jest.mock('@/lib/mcp/client')
jest.mock('@/lib/supabase/server')

describe('FlightSearchAgent', () => {
  let agent: FlightSearchAgent

  beforeEach(async () => {
    agent = new FlightSearchAgent()

    // Mock Supabase
    ;(createSupabaseServerClient as jest.Mock).mockResolvedValue({
      supabase: {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: {
                  id: 'test-request',
                  departure_airport: 'TEB',
                  arrival_airport: 'VNY',
                  departure_date: '2025-12-01T10:00:00Z',
                  passenger_count: 6,
                  client: { vip_status: true, preferences: {} },
                  workflow_state: {}
                },
                error: null
              }))
            }))
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null }))
          }))
        }))
      },
      userId: 'user-123'
    })

    await agent.initialize()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('searchAndRequestQuotes', () => {
    it('should search flights and create RFP', async () => {
      // Mock MCP calls
      ;(mcpClient.callTool as jest.Mock)
        .mockResolvedValueOnce({
          // search_flights response
          results: [
            {
              operator_id: 'op-1',
              model: 'Gulfstream G200',
              operator_rating: 4.8,
              estimated_price: 25000
            }
          ]
        })
        .mockResolvedValueOnce({
          // create_rfp response
          rfp_id: 'rfp-123',
          operators_contacted: 1
        })

      const result = await agent.searchAndRequestQuotes('test-request')

      expect(result.rfp_id).toBe('rfp-123')
      expect(result.operators_contacted).toBe(1)
      expect(mcpClient.callTool).toHaveBeenCalledWith('avinode', 'search_flights', expect.any(Object))
      expect(mcpClient.callTool).toHaveBeenCalledWith('avinode', 'create_rfp', expect.any(Object))
    })
  })
})
```

### E2E Test with Playwright

**Branch**: `test/frontend-e2e`

**File**: `e2e/authenticated-booking-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Authenticated Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in via Clerk
    await page.goto('http://localhost:3000')
    await page.click('text=Sign In')
    await page.fill('input[name="identifier"]', 'test@jetvision.com')
    await page.click('button:has-text("Continue")')
    await page.fill('input[name="password"]', 'TestPassword123')
    await page.click('button:has-text("Continue")')
    await page.waitForURL('http://localhost:3000/dashboard')
  })

  test('should create flight request and receive proposal', async ({ page }) => {
    // Navigate to create request
    await page.click('text=I want to help book a flight for a new client')

    // Fill in flight details
    await page.fill('input[name="departure_airport"]', 'TEB')
    await page.fill('input[name="arrival_airport"]', 'VNY')
    await page.fill('input[name="departure_date"]', '2025-12-01')
    await page.fill('input[name="passenger_count"]', '6')

    // Submit
    await page.click('button:has-text("Search Flights")')

    // Wait for workflow to progress
    await expect(page.locator('text=Understanding Request')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Searching Aircraft')).toBeVisible({ timeout: 10000 })

    // Verify real-time updates
    await expect(page.locator('text=Live Quote Status')).toBeVisible({ timeout: 30000 })

    // Wait for proposal
    await expect(page.locator('text=Proposal Ready')).toBeVisible({ timeout: 60000 })

    // Verify proposal details
    await expect(page.locator('text=Gulfstream')).toBeVisible()
  })
})
```

---

## Deployment & DevOps

### Environment Variables Checklist

**File**: `.env.example`

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://sbzaevawnjlrsjsuevli.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=
OPENAI_ORGANIZATION_ID=
OPENAI_ORCHESTRATOR_ASSISTANT_ID=
OPENAI_CLIENT_DATA_ASSISTANT_ID=
OPENAI_FLIGHT_SEARCH_ASSISTANT_ID=
OPENAI_PROPOSAL_ANALYSIS_ASSISTANT_ID=
OPENAI_COMMUNICATION_ASSISTANT_ID=
OPENAI_ERROR_MONITOR_ASSISTANT_ID=

# Avinode API
AVINODE_API_KEY=
AVINODE_API_BASE_URL=https://api.avinode.com/v1

# Google APIs
GOOGLE_SHEETS_API_KEY=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=

# Redis (BullMQ)
REDIS_URL=redis://localhost:6379

# Application
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production

# Monitoring
SENTRY_DSN=
DATADOG_API_KEY=
```

### CI/CD Pipeline

**Branch**: `feature/ci-cd`

**File**: `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build

  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    needs: [build]
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: [build]
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

---

## Subagent Task Assignments

### Week-by-Week Agent Assignments

#### Week 1: Foundation & Authentication

| Task | Subagent | Branch |
|------|----------|--------|
| Project setup | `devops-engineer-link` | `setup/initial-config` |
| Clerk auth integration | `backend-developer-tank` | `feature/clerk-authentication` |
| Supabase schema deployment | `system-architect` | `feature/database-schema` |
| Clerk-Supabase webhook | `integration-specialist` | `feature/clerk-supabase-sync` |
| Protected API routes | `backend-developer-tank` | `feature/auth-middleware` |
| Agent framework base class | `backend-developer-tank` | `feature/agent-framework` |
| Auth testing | `qa-engineer-seraph` | `test/auth-integration` |

#### Week 2: MCP Servers & Core Agents

| Task | Subagent | Branch |
|------|----------|--------|
| Avinode MCP server | `integration-specialist` | `feature/avinode-mcp-server` |
| Gmail MCP server | `integration-specialist` | `feature/gmail-mcp-server` |
| Google Sheets MCP | `integration-specialist` | `feature/sheets-mcp-server` |
| RFP Orchestrator Agent | `backend-developer-tank` | `feature/rfp-orchestrator-agent` |
| Client Data Manager | `backend-developer-tank` | `feature/client-data-agent` |
| Flight Search Agent | `backend-developer-tank` | `feature/flight-search-agent` |
| MCP integration tests | `qa-engineer-seraph` | `test/agent-mcp-integration` |

#### Week 3: Advanced Agents & Workflow

| Task | Subagent | Branch |
|------|----------|--------|
| Proposal Analysis Agent | `backend-developer-tank` | `feature/proposal-analysis-agent` |
| Communication Manager | `backend-developer-tank` | `feature/communication-agent` |
| Error Monitoring Agent | `backend-developer-tank` | `feature/error-monitoring-agent` |
| Workflow orchestration | `system-architect` | `feature/workflow-orchestration` |
| Job queue (BullMQ) | `devops-engineer-link` | `feature/job-queue` |
| All agents testing | `qa-engineer-seraph` | `test/all-agents` |
| E2E workflow testing | `qa-engineer-seraph` | `test/e2e-workflow` |

#### Week 4: Frontend Integration

| Task | Subagent | Branch |
|------|----------|--------|
| Auth UI integration | `frontend-developer-mouse` | `feature/auth-ui-integration` |
| Realtime updates | `frontend-developer-mouse` | `feature/realtime-updates` |
| Request creation UI | `frontend-developer-mouse` | `feature/request-creation-ui` |
| Quote status UI | `frontend-developer-mouse` | `feature/quote-status-ui` |
| **PDF generation service** | `backend-developer-tank` | `feature/pdf-generation` |
| **PDF template + API endpoint** | `backend-developer-tank` | `feature/pdf-generation` |
| Proposal UI + PDF download | `frontend-developer-mouse` | `feature/proposal-ui` |
| Frontend E2E tests + PDF | `qa-engineer-seraph` | `test/frontend-e2e` |
| UI/UX polish | `frontend-developer-mouse` | `enhancement/ui-polish` |

**PDF Generation Implementation** (Thu Nov 13 - Fri Nov 14):

```bash
# Install dependency
npm install @react-pdf/renderer

# Files to create:
# - lib/pdf/types.ts
# - lib/pdf/generator.ts
# - lib/pdf/templates/proposal-template.tsx
# - app/api/proposals/[id]/pdf/route.ts

# Update Communication Manager Agent:
# - lib/agents/communication-manager-agent.ts (add PDF tool)

# Complete documentation at:
# - docs/subagents/technology-stack/pdf-generation/README.md
```

#### Week 5: Testing & Optimization

| Task | Subagent | Branch |
|------|----------|--------|
| Unit test coverage | `qa-engineer-seraph` | `test/unit-coverage` |
| Integration tests | `qa-engineer-seraph` | `test/integration-suite` |
| Load testing | `qa-engineer-seraph` | `test/load-testing` |
| API optimization | `backend-developer-tank` | `optimization/api-performance` |
| DB optimization | `backend-developer-tank` | `optimization/database-queries` |
| Security audit | `security-engineer` | `security/audit` |
| Bug fixes | All teams | `bugfix/*` |

#### Week 6: Production Readiness

| Task | Subagent | Branch |
|------|----------|--------|
| Sentry monitoring | `devops-engineer-link` | `feature/sentry-monitoring` |
| Logging | `devops-engineer-link` | `feature/logging` |
| CI/CD pipeline | `devops-engineer-link` | `feature/ci-cd` |
| Staging deployment | `devops-engineer-link` | `deployment/staging` |
| UAT | `product-owner-oracle` | `uat/staging` |
| Production prep | `devops-engineer-link` | `deployment/production-prep` |
| Final checklist | All teams | `deployment/final-checks` |

---

## Summary & Next Steps

### Implementation Priorities (Week 1)

**Immediate Actions** (First 3 Days):

1. **Monday Oct 20**:
   - Set up Clerk authentication
   - Create Supabase project and deploy schema
   - Configure environment variables

2. **Tuesday Oct 21**:
   - Implement Clerk webhook for user sync
   - Set up RLS policies
   - Test authentication flow

3. **Wednesday Oct 22**:
   - Create protected API routes
   - Implement base agent class
   - Start Avinode MCP server

### Success Criteria

**By December 1, 2025**:

- ✅ Fully authenticated multi-tenant system
- ✅ All 6 AI agents operational
- ✅ 3 MCP servers integrated (Avinode, Gmail, Google Sheets)
- ✅ Complete RFP workflow from request to proposal
- ✅ Real-time updates functioning
- ✅ 80%+ test coverage
- ✅ <2s API response times
- ✅ Production deployment complete
- ✅ Zero P0 errors

### Key Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| OpenAI API rate limits | High | Implement exponential backoff, caching |
| Avinode API downtime | High | Fallback mechanisms, retry logic |
| RLS policy complexity | Medium | Thorough testing, clear documentation |
| Timeline pressure | High | Parallel work streams, MVP scope focus |
| Integration bugs | Medium | Comprehensive integration testing |

---

## Appendix

### Useful Commands

```bash
# Development
npm run dev                    # Start Next.js dev server
npm test                       # Run tests
npm test -- --coverage         # Test with coverage
npm run lint                   # Lint code

# Database
supabase db push               # Push schema changes
supabase db reset              # Reset database

# MCP Servers
cd mcp-servers/avinode && npm run dev
cd mcp-servers/gmail && npm run dev
cd mcp-servers/google-sheets && npm run dev

# Deployment
vercel                         # Deploy to Vercel
vercel --prod                  # Deploy to production
```

### Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI Assistants API](https://platform.openai.com/docs/assistants)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io)
- [Next.js App Router](https://nextjs.org/docs/app)

---

**Document Version**: 1.0
**Last Updated**: October 20, 2025
**Maintained By**: Jetvision Development Team
