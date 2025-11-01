# Jetvision AI Assistant - Project Structure

This document describes the complete project directory structure and organization.

**Last Updated**: October 20, 2025
**Version**: 1.0

---

## 📁 Complete Directory Structure

```
v0-jetvision-assistant/
│
├── app/                          # Next.js 14 App Router
│   ├── (dashboard)/             # Authenticated dashboard routes
│   │   ├── requests/            # Request management pages
│   │   ├── quotes/              # Quote review pages
│   │   ├── proposals/           # Proposal management pages
│   │   └── settings/            # User settings pages
│   ├── api/                     # API routes
│   │   ├── auth/                # Authentication endpoints
│   │   ├── requests/            # Request CRUD operations
│   │   ├── quotes/              # Quote management
│   │   ├── webhooks/            # External service webhooks
│   │   └── agents/              # Agent trigger endpoints
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Landing page
│
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── chat-interface.tsx       # Main chat interface
│   ├── chat-sidebar.tsx         # Sidebar navigation
│   ├── landing-page.tsx         # Public landing page
│   ├── operator-responses.tsx   # Quote display
│   ├── proposal-preview.tsx     # Proposal preview
│   ├── settings-panel.tsx       # Settings UI
│   ├── theme-provider.tsx       # Theme context
│   └── workflow-visualization.tsx # Workflow status display
│
├── lib/                          # Core library code
│   ├── agents/                  # AI Agent implementations
│   │   ├── base-agent.ts        # Base class for all agents
│   │   ├── rfp-orchestrator-agent.ts
│   │   ├── client-data-manager-agent.ts
│   │   ├── flight-search-agent.ts
│   │   ├── proposal-analysis-agent.ts
│   │   ├── communication-manager-agent.ts
│   │   ├── error-monitoring-agent.ts
│   │   └── README.md
│   ├── supabase/                # Supabase client configurations
│   │   ├── client.ts            # Browser client
│   │   ├── server.ts            # Server client
│   │   ├── middleware.ts        # Auth middleware
│   │   └── README.md
│   ├── mcp/                     # MCP client integration
│   │   ├── client.ts            # MCP client initialization
│   │   ├── types.ts             # MCP TypeScript types
│   │   └── README.md
│   ├── pdf/                     # PDF generation
│   │   ├── generator.ts         # PDF generation logic
│   │   ├── templates/           # PDF templates
│   │   └── README.md
│   ├── config/                  # Configuration files
│   │   ├── openai-config.ts     # OpenAI setup
│   │   └── env.ts               # Environment variables
│   ├── types/                   # TypeScript type definitions
│   │   ├── database.ts          # Database types
│   │   ├── agents.ts            # Agent types
│   │   └── api.ts               # API types
│   ├── utils/                   # Utility functions
│   │   ├── date.ts
│   │   ├── format.ts
│   │   └── validation.ts
│   ├── mock-data.ts             # Mock data for development
│   └── utils.ts                 # General utilities
│
├── __tests__/                    # Test files
│   ├── unit/                    # Unit tests
│   │   ├── agents/
│   │   ├── components/
│   │   └── lib/
│   ├── integration/             # Integration tests
│   │   ├── api/
│   │   └── agents/
│   ├── e2e/                     # End-to-end tests
│   │   ├── auth.spec.ts
│   │   ├── rfp-workflow.spec.ts
│   │   └── proposal-generation.spec.ts
│   ├── mocks/                   # Mock data and utilities
│   │   ├── handlers.ts          # MSW handlers
│   │   ├── supabase.ts
│   │   └── openai.ts
│   └── README.md
│
├── mcp-servers/                  # MCP server implementations
│   ├── avinode-server/          # Avinode API integration
│   │   ├── src/
│   │   ├── package.json
│   │   └── README.md
│   ├── gmail-server/            # Gmail API integration
│   │   ├── src/
│   │   ├── package.json
│   │   └── README.md
│   ├── sheets-server/           # Google Sheets integration
│   │   ├── src/
│   │   ├── package.json
│   │   └── README.md
│   └── README.md
│
├── scripts/                      # Utility scripts
│   ├── setup-dev.sh             # Development setup
│   ├── seed-database.sh         # Database seeding
│   ├── deploy-staging.sh        # Staging deployment
│   ├── deploy-production.sh     # Production deployment
│   └── README.md
│
├── docs/                         # Project documentation
│   ├── subagents/               # Agent-specific docs
│   │   ├── agents/
│   │   ├── guides/
│   │   ├── technology-stack/
│   │   └── README.md
│   ├── AGENT_TOOLS.md           # Agent tools reference
│   ├── SYSTEM_ARCHITECTURE.md   # System architecture
│   ├── IMPLEMENTATION_PLAN.md   # Implementation plan
│   ├── GETTING_STARTED.md       # Getting started guide
│   ├── PROJECT_SCHEDULE_OVERVIEW.md
│   ├── PROJECT_SCHEDULE_README.md
│   ├── PROJECT_TIMELINE_VISUAL.md
│   ├── PROJECT_SCHEDULE.csv
│   ├── PREREQUISITES_CHECKLIST.md
│   ├── AGENTS.md                # Agent overview
│   ├── requirements_text.txt    # Text requirements
│   └── Jetvision AI Assistant Requirements.pdf
│
├── public/                       # Static assets
│   ├── images/                  # Image assets
│   │   └── jetvision-logo.png
│   ├── placeholder-logo.png
│   ├── placeholder-logo.svg
│   ├── placeholder-user.jpg
│   └── ...
│
├── styles/                       # Global styles
│   └── globals.css
│
├── hooks/                        # React hooks
│   └── use-mobile.ts
│
├── .claude/                      # Claude Code configuration
│   └── commands/                # Custom slash commands
│
├── .github/                      # GitHub configuration
│   └── workflows/               # GitHub Actions
│       ├── test.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
│
├── .next/                        # Next.js build output (gitignored)
├── node_modules/                 # Dependencies (gitignored)
├── .env.local                    # Local environment variables (gitignored)
│
├── .gitignore                    # Git ignore rules
├── components.json               # shadcn/ui configuration
├── instrumentation.ts            # Next.js instrumentation
├── next-env.d.ts                 # Next.js TypeScript declarations
├── next.config.mjs               # Next.js configuration
├── package.json                  # Project dependencies
├── pnpm-lock.yaml                # pnpm lock file
├── postcss.config.mjs            # PostCSS configuration
├── tsconfig.json                 # TypeScript configuration
├── sentry.client.config.ts       # Sentry client config
├── sentry.edge.config.ts         # Sentry edge config
├── sentry.server.config.ts       # Sentry server config
│
├── README.md                     # Project README
└── PROJECT_STRUCTURE.md          # This file
```

---

## 🎯 Directory Purposes

### `/app` - Next.js Application
The main application code using Next.js 14 App Router:
- **`(dashboard)/`** - Route group for authenticated pages
- **`api/`** - Server-side API routes
- **`layout.tsx`** - Root layout with providers
- **`page.tsx`** - Public landing page

### `/components` - React Components
Reusable React components:
- **`ui/`** - Base UI components from shadcn/ui
- Feature-specific components (chat, proposals, etc.)
- Theme and layout components

### `/lib` - Core Business Logic
The heart of the application:
- **`agents/`** - AI agent implementations
- **`supabase/`** - Database client configurations
- **`mcp/`** - External service integration
- **`pdf/`** - PDF generation utilities
- **`types/`** - TypeScript type definitions
- **`utils/`** - Shared utility functions

### `/__tests__` - Test Suite
Comprehensive testing:
- **`unit/`** - Unit tests for individual functions
- **`integration/`** - API and agent integration tests
- **`e2e/`** - End-to-end user workflow tests
- **`mocks/`** - Mock data and utilities

### `/mcp-servers` - External Integrations
Standalone MCP server implementations:
- **`avinode-server/`** - Flight search and RFP
- **`gmail-server/`** - Email automation
- **`sheets-server/`** - Client database sync

### `/scripts` - Automation Scripts
Development and deployment utilities:
- Development environment setup
- Database management
- Deployment automation

### `/docs` - Documentation
All project documentation:
- Architecture diagrams
- Implementation guides
- API documentation
- Project schedules and plans

### `/public` - Static Assets
Publicly accessible files:
- Images and logos
- Fonts
- Static documents

---

## 📝 Key Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview and quick start |
| `PROJECT_STRUCTURE.md` | This file - directory organization |
| `package.json` | Dependencies and scripts |
| `next.config.mjs` | Next.js configuration |
| `tsconfig.json` | TypeScript configuration |
| `.env.local` | Local environment variables |
| `instrumentation.ts` | Sentry and monitoring setup |
| `components.json` | shadcn/ui component configuration |

---

## 🔒 Security Notes

### Gitignored Files
The following are excluded from version control:
- `.env.local` - Contains API keys and secrets
- `.next/` - Build artifacts
- `node_modules/` - Dependencies
- `.venv/` - Python virtual environment
- `*.log` - Log files

### Environment Variables
Required in `.env.local`:
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# External Services
AVINODE_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Monitoring
SENTRY_DSN=
```

---

## 🚀 Development Workflow

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Run Tests**
   ```bash
   npm test
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

4. **Start MCP Servers**
   ```bash
   # Each server separately
   cd mcp-servers/avinode-server && npm start
   ```

---

## 📚 Related Documentation

- [README.md](../README.md) - Project overview
- [SYSTEM_ARCHITECTURE.md](./docs/SYSTEM_ARCHITECTURE.md) - Architecture details
- [IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md) - Implementation guide
- [GETTING_STARTED.md](./docs/GETTING_STARTED.md) - Setup instructions
- [AGENT_TOOLS.md](./docs/AGENT_TOOLS.md) - Agent documentation

---

## 🔄 Keeping Structure Updated

This document should be updated whenever:
- New directories are added
- File organization changes
- New major components are introduced
- Project structure evolves

Last reviewed: October 20, 2025

---

**Maintained by**: Jetvision Development Team
**Questions**: See [GETTING_STARTED.md](./docs/GETTING_STARTED.md) for support
