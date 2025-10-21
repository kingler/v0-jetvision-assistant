# JetVision AI Assistant - Prerequisites Checklist

**Document Purpose**: This checklist outlines all required accounts, configurations, and setup steps that must be completed before implementing the JetVision AI Assistant system.

**Target Audience**: Project managers, technical leads, and non-technical stakeholders

**Estimated Time to Complete**: 4-6 hours

---

## Table of Contents

1. [Account Registrations](#1-account-registrations)
2. [API Keys & Authentication Setup](#2-api-keys--authentication-setup)
3. [Database Configuration](#3-database-configuration)
4. [External Service Connections](#4-external-service-connections)
5. [Development Tools & Dependencies](#5-development-tools--dependencies)
6. [Environment Configuration](#6-environment-configuration)
7. [Verification & Testing](#7-verification--testing)
8. [Cost Estimates](#8-cost-estimates)

---

## 1. Account Registrations

### 1.1 Clerk (Authentication Service)

**Purpose**: User authentication and session management

**Steps**:
- [ ] Go to [https://clerk.com](https://clerk.com)
- [ ] Click "Sign Up" and create an account
- [ ] Verify your email address
- [ ] Create a new application/project named "JetVision AI Assistant"
- [ ] Select "Next.js" as the framework
- [ ] Note: Free tier includes 10,000 monthly active users

**Required Information**:
- Business email address
- Application name: "JetVision AI Assistant"
- Application type: Production or Development

**Estimated Time**: 10 minutes

---

### 1.2 Supabase (Database & Backend)

**Purpose**: PostgreSQL database, real-time updates, and backend services

**Steps**:
- [ ] Go to [https://supabase.com](https://supabase.com)
- [ ] Click "Start your project" and sign up
- [ ] Create a new organization (use your company name)
- [ ] Create a new project:
  - **Project name**: `jetvision-assistant-db`
  - **Database password**: Generate a strong password (save this securely)
  - **Region**: Select closest to your users (e.g., US East, EU West)
- [ ] Wait for project provisioning (3-5 minutes)
- [ ] Note: Free tier includes 500MB database, 2GB bandwidth

**Required Information**:
- Organization name (your company)
- Database password (store in password manager)
- Preferred region

**Estimated Time**: 15 minutes

---

### 1.3 OpenAI (AI Services)

**Purpose**: GPT-5 AI agents for intelligent automation

**Steps**:
- [ ] Go to [https://platform.openai.com](https://platform.openai.com)
- [ ] Click "Sign up" and create an account
- [ ] Verify your email address
- [ ] Complete account setup:
  - Add payment method (credit card required)
  - Set up billing with spending limits
  - **Recommended**: Set a monthly spending limit of $100-$500 to start
- [ ] Review pricing: [https://openai.com/pricing](https://openai.com/pricing)
  - GPT-5: $10 per 1M input tokens, $30 per 1M output tokens
  - Assistants API: Additional $0.03 per 1K tokens

**Required Information**:
- Business email address
- Payment method (credit/debit card)
- Billing address
- Tax ID (if applicable)

**Cost Estimate**: $50-200/month depending on usage

**Estimated Time**: 20 minutes

---

### 1.4 Avinode (Flight Search & RFP Platform)

**Purpose**: Access to private jet operators and RFP distribution

**Steps**:
- [ ] Contact Avinode sales: [https://www.avinode.com/contact](https://www.avinode.com/contact)
- [ ] Request API access for charter brokers
- [ ] Complete onboarding process:
  - Provide business documentation
  - Sign API agreement
  - Complete compliance verification
- [ ] Receive API credentials (typically 3-5 business days)
- [ ] Review API documentation: [https://developer.avinodegroup.com](https://developer.avinodegroup.com)

**Required Information**:
- Business registration documents
- Broker license (if applicable)
- Company details and contact information
- Use case description

**Note**: Avinode requires business verification. Plan 5-10 business days for approval.

**Estimated Time**: 30 minutes (initial contact) + waiting period

---

### 1.5 Google Workspace (Gmail & Sheets Integration)

**Purpose**: Email communications and client database synchronization

**Steps**:

#### Gmail API Setup:
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Sign in with your Google Workspace account
- [ ] Create a new project: "JetVision Assistant"
- [ ] Enable Gmail API:
  - Navigate to "APIs & Services" → "Library"
  - Search for "Gmail API"
  - Click "Enable"
- [ ] Create OAuth 2.0 credentials:
  - Go to "APIs & Services" → "Credentials"
  - Click "Create Credentials" → "OAuth client ID"
  - Application type: "Web application"
  - Add authorized redirect URIs
  - Download client configuration

#### Google Sheets API Setup:
- [ ] Enable Google Sheets API:
  - Navigate to "APIs & Services" → "Library"
  - Search for "Google Sheets API"
  - Click "Enable"
- [ ] Create Service Account:
  - Go to "APIs & Services" → "Credentials"
  - Click "Create Credentials" → "Service account"
  - Name: "jetvision-sheets-access"
  - Download JSON key file
- [ ] Share your client database spreadsheet with the service account email

**Required Information**:
- Google Workspace account (admin access)
- Client database spreadsheet ID
- Service account email (generated during setup)

**Estimated Time**: 30 minutes

---

### 1.6 Vercel (Hosting & Deployment)

**Purpose**: Application hosting and serverless deployment

**Steps**:
- [ ] Go to [https://vercel.com](https://vercel.com)
- [ ] Click "Sign Up" (use GitHub account for easier integration)
- [ ] Import your GitHub repository (once created)
- [ ] Configure project settings:
  - Framework preset: Next.js
  - Root directory: ./
  - Build command: `npm run build`
  - Output directory: .next
- [ ] Note: Free tier includes 100GB bandwidth, serverless functions

**Required Information**:
- GitHub account
- Repository access

**Estimated Time**: 10 minutes

---

### 1.7 GitHub (Version Control)

**Purpose**: Source code management and CI/CD

**Steps**:
- [ ] Go to [https://github.com](https://github.com)
- [ ] Sign up or sign in
- [ ] Create a new repository:
  - **Name**: `jetvision-ai-assistant`
  - **Visibility**: Private (recommended)
  - Initialize with README: Yes
- [ ] Add team members as collaborators (if applicable)

**Required Information**:
- Email address
- Repository name
- Team member emails

**Estimated Time**: 10 minutes

---

### 1.8 Sentry (Error Monitoring) - Optional but Recommended

**Purpose**: Real-time error tracking and performance monitoring

**Steps**:
- [ ] Go to [https://sentry.io](https://sentry.io)
- [ ] Click "Get Started"
- [ ] Create an account
- [ ] Create a new project:
  - Platform: Next.js
  - Project name: "jetvision-assistant"
- [ ] Copy DSN (Data Source Name)
- [ ] Note: Free tier includes 5,000 errors/month
- [x] **Sentry MCP Server Added to Claude Code** - Use `/mcp` to authenticate

**Required Information**:
- Business email
- Project name

**Estimated Time**: 10 minutes

**Claude Code Integration**:
The Sentry MCP server has been added and provides access to Sentry's full issue context through AI. You can query errors, analyze patterns, and get insights about application issues directly from Claude Code.

---

## 2. API Keys & Authentication Setup

### 2.1 Clerk API Keys

**Steps**:
- [ ] Log in to [Clerk Dashboard](https://dashboard.clerk.com)
- [ ] Select your "JetVision AI Assistant" application
- [ ] Navigate to "API Keys" section
- [ ] Copy the following keys:
  - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
  - **Secret Key** (starts with `sk_test_` or `sk_live_`)
- [ ] Store these keys securely (password manager recommended)

**Security Notes**:
- Never commit these keys to Git
- Use test keys for development, live keys for production
- Rotate keys if compromised

**Where to Save**:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

---

### 2.2 Clerk Webhook Configuration

**Purpose**: Sync user data from Clerk to Supabase

**Steps**:
- [ ] In Clerk Dashboard, go to "Webhooks"
- [ ] Click "Add Endpoint"
- [ ] **Endpoint URL**: `https://your-app.vercel.app/api/webhooks/clerk`
  - (Use your Vercel deployment URL)
  - For development: Use ngrok or similar tunnel
- [ ] Subscribe to events:
  - [x] user.created
  - [x] user.updated
  - [x] user.deleted
- [ ] Copy the "Signing Secret" (starts with `whsec_`)
- [ ] Save signing secret:
  ```
  CLERK_WEBHOOK_SECRET=whsec_xxxxx
  ```

**Note**: You'll need to update this URL after deploying to Vercel

---

### 2.3 Supabase API Keys

**Steps**:
- [ ] Log in to [Supabase Dashboard](https://supabase.com/dashboard)
- [ ] Select your `jetvision-assistant-db` project
- [ ] Navigate to "Settings" → "API"
- [ ] Copy the following:
  - **Project URL** (e.g., `https://xxxxx.supabase.co`)
  - **anon public** key (for client-side, already provided in requirements)
  - **service_role** key (⚠️ NEVER expose on client-side)
- [ ] Store these securely

**Where to Save**:
```
NEXT_PUBLIC_SUPABASE_URL=https://sbzaevawnjlrsjsuevli.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(DIFFERENT_KEY)
```

**Security Warning**: Service role key bypasses Row Level Security. Only use server-side.

---

### 2.4 OpenAI API Keys

**Steps**:
- [ ] Log in to [OpenAI Platform](https://platform.openai.com)
- [ ] Navigate to "API Keys" section
- [ ] Click "Create new secret key"
- [ ] **Name**: "JetVision Assistant - Production"
- [ ] Copy the key (shown only once!)
- [ ] Store securely in password manager
- [ ] Copy your Organization ID:
  - Click on your profile (top right)
  - Go to "Settings"
  - Copy "Organization ID"

**Where to Save**:
```
OPENAI_API_KEY=sk-xxxxx
OPENAI_ORGANIZATION_ID=org-xxxxx
```

**Cost Management**:
- [ ] Set usage limits in OpenAI Dashboard:
  - Go to "Billing" → "Usage limits"
  - Set hard limit: $100-500/month (adjust based on needs)
  - Set soft limit: $50 (email notification)

---

### 2.5 OpenAI Assistants Creation

**Purpose**: Create AI assistants for each agent type

**Steps**:

#### Create 6 Assistants:

1. **RFP Orchestrator Assistant**:
   - [ ] Go to [OpenAI Playground → Assistants](https://platform.openai.com/playground?mode=assistant)
   - [ ] Click "Create"
   - [ ] **Name**: "RFP Orchestrator"
   - [ ] **Model**: gpt-5
   - [ ] **Instructions**: (Copy from IMPLEMENTATION_PLAN.md line 965)
   - [ ] **Response format**: JSON
   - [ ] Click "Save"
   - [ ] Copy Assistant ID: `asst_xxxxx`

2. **Client Data Manager Assistant**:
   - [ ] Click "Create" again
   - [ ] **Name**: "Client Data Manager"
   - [ ] **Model**: gpt-5
   - [ ] **Instructions**: (Copy from IMPLEMENTATION_PLAN.md line 1137)
   - [ ] **Response format**: JSON
   - [ ] Click "Save"
   - [ ] Copy Assistant ID: `asst_xxxxx`

3. **Flight Search Assistant**: (Instructions in plan, no separate assistant needed - uses MCP)

4. **Proposal Analysis Assistant**:
   - [ ] **Name**: "Proposal Analysis Agent"
   - [ ] **Model**: gpt-5
   - [ ] **Instructions**: (Copy from IMPLEMENTATION_PLAN.md line 1611)
   - [ ] **Response format**: JSON
   - [ ] Click "Save"
   - [ ] Copy Assistant ID: `asst_xxxxx`

5. **Communication Manager Assistant**:
   - [ ] **Name**: "Communication Manager"
   - [ ] **Model**: gpt-5
   - [ ] **Instructions**: (Copy from IMPLEMENTATION_PLAN.md line 1836)
   - [ ] **Response format**: JSON
   - [ ] Click "Save"
   - [ ] Copy Assistant ID: `asst_xxxxx`

6. **Error Monitoring Assistant**: (Uses standard error logging, may not need assistant)

**Where to Save**:
```
OPENAI_ORCHESTRATOR_ASSISTANT_ID=asst_xxxxx
OPENAI_CLIENT_DATA_ASSISTANT_ID=asst_xxxxx
OPENAI_FLIGHT_SEARCH_ASSISTANT_ID=asst_xxxxx
OPENAI_PROPOSAL_ANALYSIS_ASSISTANT_ID=asst_xxxxx
OPENAI_COMMUNICATION_ASSISTANT_ID=asst_xxxxx
OPENAI_ERROR_MONITOR_ASSISTANT_ID=asst_xxxxx
```

**Estimated Time**: 45 minutes

---

### 2.6 Avinode API Credentials

**Steps**:
- [ ] Once approved by Avinode, log in to developer portal
- [ ] Navigate to API credentials section
- [ ] Generate API key
- [ ] Copy API key and base URL
- [ ] Review rate limits and quotas

**Where to Save**:
```
AVINODE_API_KEY=your-api-key
AVINODE_API_BASE_URL=https://api.avinode.com/v1
```

**Note**: Contact Avinode support if you don't have access after 10 business days

---

### 2.7 Google API Credentials

**Steps**:

#### Gmail OAuth Credentials:
- [ ] Download OAuth client JSON from Google Cloud Console
- [ ] Extract the following:
  - Client ID
  - Client Secret
- [ ] Generate Refresh Token:
  - Use OAuth Playground: [https://developers.google.com/oauthplayground](https://developers.google.com/oauthplayground)
  - Authorize Gmail API
  - Exchange authorization code for refresh token

#### Google Sheets Service Account:
- [ ] Download service account JSON key file
- [ ] Extract the following:
  - Service account email
  - Private key (entire key including `-----BEGIN PRIVATE KEY-----`)

**Where to Save**:
```
GMAIL_CLIENT_ID=xxxxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=xxxxx
GMAIL_REFRESH_TOKEN=xxxxx

GOOGLE_SERVICE_ACCOUNT_EMAIL=jetvision-sheets-access@xxxxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxxxx\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_SPREADSHEET_ID=xxxxx
```

**Security**: Keep service account JSON file secure, never commit to Git

---

### 2.8 Vercel Environment Variables

**Steps**:
- [ ] After connecting GitHub repository to Vercel
- [ ] Go to Project Settings → Environment Variables
- [ ] Add all environment variables from `.env.local`
- [ ] Separate environments:
  - **Production**: Use live/production keys
  - **Preview**: Use test/development keys
  - **Development**: Use test keys

**Deployment**:
- [ ] Set up automatic deployments:
  - Production: Deploy from `main` branch
  - Preview: Deploy from all branches

---

## 3. Database Configuration

### 3.1 Supabase Database Schema Deployment

**Purpose**: Create all required database tables, indexes, and policies

**Steps**:
- [ ] Log in to [Supabase Dashboard](https://supabase.com/dashboard)
- [ ] Select `jetvision-assistant-db` project
- [ ] Navigate to "SQL Editor"
- [ ] Click "New query"
- [ ] Copy the entire database schema from `IMPLEMENTATION_PLAN.md` (lines 956-1260)
- [ ] Paste into SQL editor
- [ ] Click "Run" to execute
- [ ] Verify tables created:
  - [ ] users
  - [ ] clients
  - [ ] operators
  - [ ] aircraft
  - [ ] requests
  - [ ] quotes
  - [ ] proposals
  - [ ] communications
  - [ ] error_logs
  - [ ] audit_logs
  - [ ] agent_sessions

**Verification**:
- [ ] Go to "Table Editor" in Supabase
- [ ] Confirm all 11 tables are present
- [ ] Check that Row Level Security (RLS) is enabled on key tables

**Estimated Time**: 15 minutes

---

### 3.2 Database Connection String

**Steps**:
- [ ] In Supabase Dashboard, go to "Settings" → "Database"
- [ ] Copy "Connection string" for direct database access (if needed)
- [ ] Copy "Connection pooling" string for production use

**Use Cases**:
- Direct connection: Database migrations, manual queries
- Connection pooling: High-traffic production use

---

### 3.3 Row Level Security (RLS) Verification

**Purpose**: Ensure data isolation between users

**Steps**:
- [ ] In Supabase Dashboard, go to "Authentication" → "Policies"
- [ ] Verify RLS policies are active for:
  - [x] users table
  - [x] clients table
  - [x] requests table
  - [x] quotes table
  - [x] proposals table
- [ ] Test policies:
  - Create test user in Clerk
  - Verify user can only see their own data

**Testing Script** (optional):
```sql
-- Run as authenticated user
SELECT * FROM requests;
-- Should only return requests where iso_agent_id matches logged-in user
```

---

## 4. External Service Connections

### 4.1 Google Sheets Client Database Setup

**Purpose**: Sync existing client data into the system

**Steps**:
- [ ] Create or identify your existing client database spreadsheet
- [ ] Ensure spreadsheet has these columns (in order):
  - Column A: Client Name
  - Column B: Email
  - Column C: Phone
  - Column D: Company
  - Column E: VIP Status (yes/no)
  - Column F: Preferences (JSON format)
- [ ] Share spreadsheet with service account email:
  - Click "Share" button
  - Add service account email: `jetvision-sheets-access@xxxxx.iam.gserviceaccount.com`
  - Give "Viewer" access
- [ ] Copy Spreadsheet ID from URL:
  - URL format: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
  - Copy the `SPREADSHEET_ID` part

**Example Data Format**:
```
Name          | Email              | Phone          | Company    | VIP | Preferences
John Doe      | john@example.com   | +1-555-0100    | ABC Corp   | yes | {"aircraft":["G200"],"catering":"Gourmet"}
Jane Smith    | jane@example.com   | +1-555-0101    | XYZ Inc    | no  | {}
```

**Where to Save**:
```
GOOGLE_SHEETS_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
```

---

### 4.2 Gmail Email Templates

**Purpose**: Set up email signature and templates (optional)

**Steps**:
- [ ] Configure Gmail signature in your Google Workspace account
- [ ] Prepare email templates (handled by AI, but you can customize)
- [ ] Test email sending:
  - Send test email to yourself
  - Verify formatting and signature

---

### 4.3 Avinode Operator Network Setup

**Purpose**: Configure which operators receive RFPs

**Steps**:
- [ ] Log in to Avinode platform
- [ ] Review available operators in your region
- [ ] Configure operator preferences:
  - Preferred operators
  - Operator categories
  - Geographic coverage
- [ ] Test RFP distribution:
  - Send test RFP to 1-2 operators
  - Verify they receive requests

**Note**: This may require Avinode support assistance

---

## 5. Development Tools & Dependencies

### 5.1 Node.js & npm

**Purpose**: JavaScript runtime and package manager

**Steps**:
- [ ] Download and install Node.js: [https://nodejs.org](https://nodejs.org)
- [ ] Recommended version: **Node.js 20.x LTS** (Long Term Support)
- [ ] Verify installation:
  ```bash
  node --version  # Should show v20.x.x
  npm --version   # Should show 10.x.x
  ```

**Operating System**:
- **Windows**: Download Windows installer (.msi)
- **macOS**: Download macOS installer (.pkg) or use Homebrew: `brew install node@20`
- **Linux**: Use package manager: `sudo apt install nodejs npm` (Ubuntu/Debian)

**Estimated Time**: 10 minutes

---

### 5.2 Git

**Purpose**: Version control system

**Steps**:
- [ ] Download and install Git: [https://git-scm.com/downloads](https://git-scm.com/downloads)
- [ ] Verify installation:
  ```bash
  git --version  # Should show version 2.x or higher
  ```
- [ ] Configure Git:
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "your.email@company.com"
  ```

**Estimated Time**: 10 minutes

---

### 5.3 Code Editor (VS Code Recommended)

**Purpose**: Development environment

**Steps**:
- [ ] Download VS Code: [https://code.visualstudio.com](https://code.visualstudio.com)
- [ ] Install recommended extensions:
  - [ ] ESLint
  - [ ] Prettier - Code formatter
  - [ ] Tailwind CSS IntelliSense
  - [ ] GitLens
  - [ ] TypeScript + JavaScript Language Features
  - [ ] Next.js snippets

**Optional but Recommended**:
- [ ] Install Prettier extension
- [ ] Install Auto Close Tag
- [ ] Install Auto Rename Tag

**Estimated Time**: 15 minutes

---

### 5.4 Redis (Local Development)

**Purpose**: Job queue and caching for local development

**Steps**:

**macOS**:
```bash
brew install redis
brew services start redis
```

**Windows**:
- Download Redis for Windows: [https://github.com/microsoftarchive/redis/releases](https://github.com/microsoftarchive/redis/releases)
- Install and run as Windows service

**Linux (Ubuntu/Debian)**:
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
```

**Verification**:
```bash
redis-cli ping  # Should return "PONG"
```

**Where to Save** (for local development):
```
REDIS_URL=redis://localhost:6379
```

**Production**: Use managed Redis service (Upstash, Redis Cloud, AWS ElastiCache)

**Estimated Time**: 15 minutes

---

### 5.5 TypeScript & Project Dependencies

**Purpose**: Type checking and project libraries

**Steps**:
- [ ] Clone the repository (after it's created):
  ```bash
  git clone https://github.com/your-org/jetvision-ai-assistant.git
  cd jetvision-ai-assistant
  ```
- [ ] Install dependencies:
  ```bash
  npm install
  ```
- [ ] Verify installation:
  ```bash
  npm run build  # Should compile without errors
  ```

**Common Issues**:
- If `npm install` fails, try:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

**Estimated Time**: 10 minutes (depending on internet speed)

---

## 6. Environment Configuration

### 6.1 Create .env.local File

**Purpose**: Store all environment variables locally

**Steps**:
- [ ] Navigate to project root directory
- [ ] Create file named `.env.local`
- [ ] Copy template from `.env.example`
- [ ] Fill in all values from previous steps

**Template** (`.env.local`):
```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://sbzaevawnjlrsjsuevli.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(DIFFERENT_KEY)

# OpenAI
OPENAI_API_KEY=sk-xxxxx
OPENAI_ORGANIZATION_ID=org-xxxxx
OPENAI_ORCHESTRATOR_ASSISTANT_ID=asst_xxxxx
OPENAI_CLIENT_DATA_ASSISTANT_ID=asst_xxxxx
OPENAI_FLIGHT_SEARCH_ASSISTANT_ID=asst_xxxxx
OPENAI_PROPOSAL_ANALYSIS_ASSISTANT_ID=asst_xxxxx
OPENAI_COMMUNICATION_ASSISTANT_ID=asst_xxxxx
OPENAI_ERROR_MONITOR_ASSISTANT_ID=asst_xxxxx

# Avinode API
AVINODE_API_KEY=your-api-key
AVINODE_API_BASE_URL=https://api.avinode.com/v1

# Google APIs
GOOGLE_SHEETS_API_KEY=xxxxx
GOOGLE_SERVICE_ACCOUNT_EMAIL=jetvision-sheets-access@xxxxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxxxx\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_SPREADSHEET_ID=xxxxx
GMAIL_CLIENT_ID=xxxxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=xxxxx
GMAIL_REFRESH_TOKEN=xxxxx

# Redis (BullMQ)
REDIS_URL=redis://localhost:6379

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Monitoring (Optional)
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

**Security Checklist**:
- [ ] Verify `.gitignore` includes `.env.local`
- [ ] Never commit `.env.local` to Git
- [ ] Use different keys for development vs production
- [ ] Store production keys in Vercel environment variables

---

### 6.2 Verify .gitignore

**Purpose**: Prevent sensitive data from being committed

**Steps**:
- [ ] Open `.gitignore` file in project root
- [ ] Verify it includes:
  ```
  # Environment variables
  .env
  .env*.local
  .env.production

  # Node modules
  node_modules/

  # Build output
  .next/
  out/
  build/
  dist/

  # Dependencies
  package-lock.json
  yarn.lock

  # IDE
  .vscode/
  .idea/

  # OS
  .DS_Store
  Thumbs.db
  ```

---

## 7. Verification & Testing

### 7.1 Local Development Server

**Purpose**: Verify application runs locally

**Steps**:
- [ ] Start development server:
  ```bash
  npm run dev
  ```
- [ ] Open browser to `http://localhost:3000`
- [ ] Verify:
  - [x] Page loads without errors
  - [x] Clerk sign-in button appears
  - [x] No console errors in browser DevTools (F12)

**Expected Output**:
```
> jetvision-ai-assistant@0.1.0 dev
> next dev

  ▲ Next.js 14.2.16
  - Local:        http://localhost:3000
  - Ready in 2.5s
```

**Common Issues**:
- **Port 3000 already in use**: Stop other processes or change port:
  ```bash
  PORT=3001 npm run dev
  ```
- **Module not found**: Run `npm install` again
- **Environment variable errors**: Check `.env.local` format

---

### 7.2 Authentication Flow Test

**Purpose**: Verify Clerk authentication works

**Steps**:
- [ ] Click "Sign Up" button on homepage
- [ ] Create a test account:
  - Email: `test@yourdomain.com`
  - Password: Strong password (8+ characters)
- [ ] Verify email (check inbox)
- [ ] Sign in with test account
- [ ] Verify:
  - [x] Redirected to dashboard
  - [x] User button shows in header
  - [x] Can sign out successfully

**Expected Result**: Successful sign-in, user data stored in Supabase `users` table

**Verification**:
- [ ] Check Supabase Dashboard → Table Editor → `users` table
- [ ] Should see new user with `clerk_user_id`

---

### 7.3 Database Connection Test

**Purpose**: Verify Supabase connection and RLS policies

**Steps**:
- [ ] With test user signed in, try creating a request:
  - Go to dashboard
  - Fill in flight request form
  - Submit request
- [ ] Verify:
  - [x] Request appears in UI
  - [x] No errors in console
  - [x] Request stored in database

**Verification**:
- [ ] Check Supabase Dashboard → Table Editor → `requests` table
- [ ] Should see new request with `iso_agent_id` matching test user

**Test RLS**:
- [ ] Create second test user
- [ ] Sign in with second user
- [ ] Verify first user's requests are NOT visible

---

### 7.4 OpenAI Integration Test

**Purpose**: Verify OpenAI API connectivity

**Steps**:
- [ ] Create a simple test script:
  ```typescript
  // test-openai.ts
  import OpenAI from 'openai';

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async function testOpenAI() {
    const response = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [{ role: 'user', content: 'Say "OpenAI connected"' }],
      max_tokens: 10,
    });

    console.log('Response:', response.choices[0].message.content);
  }

  testOpenAI();
  ```
- [ ] Run test:
  ```bash
  npx ts-node test-openai.ts
  ```
- [ ] Expected output: `Response: OpenAI connected`

**Troubleshooting**:
- **401 Unauthorized**: Check API key format
- **429 Rate limit**: Check OpenAI usage dashboard
- **Model not found**: Update model name to latest available

---

### 7.5 External API Tests

**Purpose**: Verify external service connections

#### Gmail API Test:
- [ ] Run MCP server:
  ```bash
  cd mcp-servers/gmail
  npm run dev
  ```
- [ ] Test email sending (use test email address)

#### Google Sheets API Test:
- [ ] Run MCP server:
  ```bash
  cd mcp-servers/google-sheets
  npm run dev
  ```
- [ ] Verify can read client data

#### Avinode API Test:
- [ ] Run MCP server:
  ```bash
  cd mcp-servers/avinode
  npm run dev
  ```
- [ ] Test flight search (if test environment available)

**Note**: Full testing may require Avinode approval and test credentials

---

### 7.6 Production Deployment Test

**Purpose**: Verify production deployment works

**Steps**:
- [ ] Push code to GitHub `main` branch:
  ```bash
  git add .
  git commit -m "Initial deployment"
  git push origin main
  ```
- [ ] Vercel should automatically deploy
- [ ] Check deployment status in Vercel dashboard
- [ ] Visit production URL
- [ ] Verify:
  - [x] Site loads
  - [x] Authentication works
  - [x] No errors in console

**Production Checklist**:
- [ ] Update Clerk webhook URL to production URL
- [ ] Update NEXT_PUBLIC_APP_URL to production URL
- [ ] Switch to live Clerk keys (if using production)
- [ ] Verify all environment variables in Vercel
- [ ] Test critical user flows

---

## 8. Cost Estimates

### Monthly Operating Costs

**Tier 1: Development/Testing** (Low Usage)
| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Clerk | Free | $0 |
| Supabase | Free | $0 |
| OpenAI | Pay-as-you-go | $50-100 |
| Vercel | Free | $0 |
| Redis Cloud | Free | $0 |
| GitHub | Free/Team | $0-48 |
| Sentry | Free | $0 |
| **Total** | | **$50-150/month** |

**Tier 2: Small Production** (< 100 requests/month)
| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Clerk | Hobby | $0 |
| Supabase | Pro | $25 |
| OpenAI | Pay-as-you-go | $150-300 |
| Vercel | Pro | $20 |
| Redis Cloud | Paid | $10 |
| GitHub | Team | $48 |
| Sentry | Team | $26 |
| Avinode | Quote-based | Variable |
| **Total** | | **$280-450/month** + Avinode |

**Tier 3: Medium Production** (500+ requests/month)
| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Clerk | Production | $25 |
| Supabase | Pro | $25-100 |
| OpenAI | Pay-as-you-go | $500-1500 |
| Vercel | Pro | $20 |
| Redis Cloud | Standard | $30 |
| GitHub | Team | $48 |
| Sentry | Business | $89 |
| Avinode | Enterprise | Variable |
| **Total** | | **$750-1850/month** + Avinode |

**Notes**:
- OpenAI costs vary significantly based on request volume and complexity
- Avinode pricing is custom based on your operator network
- Supabase scales with database size and bandwidth
- Consider annual billing for ~20% discount on most services

---

## Completion Checklist

### Before Starting Development:

- [ ] All 8 accounts created and verified
- [ ] All API keys generated and stored in password manager
- [ ] `.env.local` file created with all variables
- [ ] Development tools installed (Node.js, Git, VS Code, Redis)
- [ ] Database schema deployed to Supabase
- [ ] OpenAI assistants created and IDs saved
- [ ] Clerk webhook configured
- [ ] Google Sheets shared with service account
- [ ] Local development server runs without errors
- [ ] Authentication flow tested successfully
- [ ] OpenAI API connection verified
- [ ] Vercel project connected to GitHub

### Before Production Deployment:

- [ ] Switched to production API keys where applicable
- [ ] Billing and spending limits configured on all services
- [ ] Production Clerk webhook URL updated
- [ ] Row Level Security policies tested
- [ ] All environment variables set in Vercel
- [ ] Team members have necessary access
- [ ] Monitoring and error tracking configured
- [ ] Backup and disaster recovery plan documented

---

## Support & Resources

### Documentation Links:
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)

### Getting Help:
- **Technical Issues**: Create issue in GitHub repository
- **Clerk Support**: https://clerk.com/support
- **Supabase Support**: https://supabase.com/support
- **OpenAI Support**: https://help.openai.com

### Emergency Contacts:
- Project Lead: [Name and Email]
- Technical Lead: [Name and Email]
- DevOps: [Name and Email]

---

## Appendix: Quick Reference

### Essential Commands

```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server (after build)
npm start

# Lint code
npm run lint

# Deploy to Vercel
vercel --prod
```

### Essential File Locations

```
├── .env.local              # Environment variables (DO NOT COMMIT)
├── middleware.ts           # Clerk authentication middleware
├── app/
│   ├── layout.tsx         # ClerkProvider wrapper
│   └── api/               # API routes
├── lib/
│   ├── agents/            # AI agent implementations
│   ├── mcp/               # MCP client
│   └── supabase/          # Supabase helpers
└── mcp-servers/           # External MCP servers
```

---

**Document Version**: 1.0
**Last Updated**: October 20, 2025
**Estimated Total Setup Time**: 4-6 hours (excluding approval waiting periods)

**Next Steps**: Once all prerequisites are complete, proceed to Week 1 of the Implementation Plan.
