# JetVision AI Assistant

**AI-Powered Private Jet Booking RFP Automation System**

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/ab-2555s-projects/v0-jet-vision-agent)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/Srm7B7Ppqgl)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991?style=for-the-badge&logo=openai)](https://openai.com)

---

## 📖 Documentation

This project includes comprehensive documentation to guide you through the entire implementation:

### 🚀 [**GETTING_STARTED.md**](./docs/GETTING_STARTED.md) ← START HERE
Quick start guide with links to all documentation

### ✅ [**PREREQUISITES_CHECKLIST.md**](./docs/PREREQUISITES_CHECKLIST.md) ← REQUIRED FIRST
Complete this checklist **BEFORE** starting development:
- Account registrations (Clerk, Supabase, OpenAI, Avinode, etc.)
- API key generation and configuration
- Database setup and verification
- Development tools installation
- **Time Required**: 4-6 hours

### 📁 [**PROJECT_STRUCTURE.md**](./PROJECT_STRUCTURE.md) ← NEW!
Complete project directory organization:
- Full directory structure with explanations
- Purpose of each directory
- Security notes and gitignored files
- Development workflow guide

### 📋 [**IMPLEMENTATION_PLAN.md**](./docs/IMPLEMENTATION_PLAN.md)
6-7 week detailed implementation guide:
- Week-by-week development schedule (Oct 20 - Dec 1, 2025)
- Complete code examples for all components
- Database schema with Row Level Security
- AI agent implementations with MCP integration
- Testing strategy (TDD approach)
- Deployment instructions

### 🏗️ [**SYSTEM_ARCHITECTURE.md**](./docs/SYSTEM_ARCHITECTURE.md)
Visual system architecture and data flows:
- Comprehensive architecture diagrams (Mermaid)
- Authentication flow (Clerk + Supabase)
- Data flow sequences (RFP request to proposal)
- Technology stack overview
- Deployment architecture

### ⚙️ [**lib/config/openai-config.ts**](./lib/config/openai-config.ts)
OpenAI model configuration:
- Latest GPT-5 model settings
- Agent-specific configurations
- Rate limiting and retry logic

---

## 🌟 Overview

**JetVision AI Assistant** is a production-ready multi-agent AI system for automating private jet booking RFP (Request for Proposal) workflows. The system uses 6 specialized AI agents powered by OpenAI GPT-5 to intelligently orchestrate the entire booking process from initial client request to final proposal delivery.

### Key Features

✅ **Multi-Agent AI System**: 6 specialized agents handling orchestration, client data, flight search, proposal analysis, communications, and error monitoring

✅ **Secure Multi-Tenant Architecture**: Clerk authentication + Supabase Row Level Security ensures complete data isolation between ISO agents

✅ **Real-Time Updates**: Live quote tracking and workflow progress via Supabase Realtime (WebSocket)

✅ **External Service Integration**: MCP (Model Context Protocol) servers for clean integration with Avinode, Gmail, and Google Sheets

✅ **Intelligent Automation**: AI-driven client profiling, aircraft selection, multi-factor proposal analysis, and personalized email generation

✅ **Background Job Processing**: BullMQ + Redis for asynchronous agent tasks and long-running operations

---

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** (App Router) - React framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4.1.9** - Styling
- **shadcn/ui** - Component library
- **Clerk** - Authentication

### Backend
- **Supabase PostgreSQL** - Database with Row Level Security
- **OpenAI GPT-5** - AI agents (Assistants API)
- **BullMQ + Redis** - Job queue and caching
- **MCP Servers** - External API integration layer

### External Services
- **Avinode API** - Flight search and RFP distribution
- **Gmail API** - Email communications
- **Google Sheets API** - Client database synchronization

### DevOps
- **Vercel** - Hosting and deployment
- **GitHub Actions** - CI/CD pipeline
- **Sentry** - Error monitoring
- **GitHub** - Version control

---

## 🚀 Quick Start

### 1. Complete Prerequisites (Required First!)

**Before writing any code**, complete all items in the Prerequisites Checklist:

```bash
open docs/PREREQUISITES_CHECKLIST.md
```

This includes:
- Creating accounts (Clerk, Supabase, OpenAI, etc.)
- Generating all API keys
- Deploying database schema
- Creating OpenAI assistants
- Configuring environment variables

**Estimated Time**: 4-6 hours

### 2. Set Up Development Environment

```bash
# Clone repository
git clone https://github.com/your-org/jetvision-ai-assistant.git
cd jetvision-ai-assistant

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Fill in all API keys and credentials in .env.local
nano .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 3. Verify Setup

```bash
# Run tests
npm test

# Verify authentication works
# 1. Visit http://localhost:3000
# 2. Sign up with test account
# 3. Check Supabase for new user entry

# Check OpenAI connection
npm run test:openai
```

### 4. Follow Implementation Plan

Once prerequisites are complete, follow the 6-week schedule in `docs/IMPLEMENTATION_PLAN.md`:

- **Week 1**: Foundation & Authentication (Clerk + Supabase)
- **Week 2**: MCP Servers & Core Agents
- **Week 3**: Advanced Agents & Workflow
- **Week 4**: Frontend Integration
- **Week 5**: Testing & Optimization
- **Week 6**: Production Readiness

---

## 📅 Project Timeline

**Start Date**: October 20, 2025
**Target Launch**: December 1, 2025 (First week)
**Total Duration**: 6-7 weeks

---

## 🔒 Security

- ✅ Clerk JWT-based authentication
- ✅ Supabase Row Level Security (RLS) policies
- ✅ Environment variables for all secrets (never committed to Git)
- ✅ HTTPS enforced on all endpoints
- ✅ API rate limiting
- ✅ Real-time error monitoring with Sentry

---

## 💰 Cost Estimates

### Development/Testing
- **Monthly**: $50-150 (mostly OpenAI usage)

### Small Production (< 100 requests/month)
- **Monthly**: $280-450 + Avinode fees

### Medium Production (500+ requests/month)
- **Monthly**: $750-1850 + Avinode fees

See detailed cost breakdown in `docs/PREREQUISITES_CHECKLIST.md` Section 8.

---

## 📦 Project Structure

The project follows a well-organized structure for maintainability and scalability:

```
jetvision-ai-assistant/
├── app/                          # Next.js 14 App Router
│   ├── (dashboard)/             # Authenticated dashboard routes
│   ├── api/                     # API routes (protected with Clerk)
│   │   ├── auth/                # Authentication endpoints
│   │   ├── requests/            # Request management
│   │   ├── webhooks/            # Webhook handlers
│   │   └── agents/              # Agent triggers
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Landing page
│
├── components/                   # React components
│   ├── ui/                      # shadcn/ui base components
│   ├── chat-interface.tsx       # Main chat interface
│   ├── workflow-visualization.tsx
│   └── proposal-preview.tsx
│
├── lib/                         # Core business logic
│   ├── agents/                  # AI agent implementations
│   │   ├── base-agent.ts        # Base agent class
│   │   ├── rfp-orchestrator-agent.ts
│   │   ├── client-data-manager-agent.ts
│   │   ├── flight-search-agent.ts
│   │   ├── proposal-analysis-agent.ts
│   │   ├── communication-manager-agent.ts
│   │   └── error-monitoring-agent.ts
│   ├── supabase/                # Database clients
│   │   ├── client.ts            # Browser client
│   │   └── server.ts            # Server client
│   ├── mcp/                     # MCP integration
│   ├── pdf/                     # PDF generation
│   ├── config/                  # Configuration
│   ├── types/                   # TypeScript types
│   └── utils/                   # Utility functions
│
├── __tests__/                   # Test suite
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   ├── e2e/                     # End-to-end tests
│   └── mocks/                   # Mock data
│
├── mcp-servers/                 # MCP server implementations
│   ├── avinode-server/          # Avinode integration
│   ├── gmail-server/            # Gmail integration
│   └── sheets-server/           # Google Sheets integration
│
├── scripts/                     # Utility scripts
│   ├── setup-dev.sh             # Dev environment setup
│   ├── seed-database.sh         # Database seeding
│   └── deploy-*.sh              # Deployment scripts
│
├── docs/                        # Documentation
│   ├── GETTING_STARTED.md       # Quick start
│   ├── IMPLEMENTATION_PLAN.md   # Implementation guide
│   ├── SYSTEM_ARCHITECTURE.md   # Architecture
│   ├── AGENT_TOOLS.md           # Agent reference
│   └── subagents/               # Agent-specific docs
│
├── public/                      # Static assets
├── styles/                      # Global styles
├── PROJECT_STRUCTURE.md         # Full structure documentation
└── README.md                    # This file
```

📘 **See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for detailed directory documentation**

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- rfp-orchestrator.test.ts

# Run E2E tests (Playwright)
npx playwright test
```

**Test Coverage Goals**:
- Agent classes: 85%+
- API routes: 80%+
- Database functions: 90%+
- UI components: 70%+

---

## 🚢 Deployment

### Automatic Deployment (Recommended)

Push to `main` branch triggers automatic deployment via Vercel:

```bash
git add .
git commit -m "feat: your feature"
git push origin main
```

### Manual Deployment

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel
```

**Pre-deployment Checklist**:
- [ ] All tests passing
- [ ] Environment variables set in Vercel
- [ ] Clerk webhook URL updated to production URL
- [ ] Database schema deployed to production Supabase
- [ ] Monitoring configured (Sentry)

---

## 📞 Support

### Documentation
- [Clerk Docs](https://clerk.com/docs) - Authentication
- [Supabase Docs](https://supabase.com/docs) - Database
- [OpenAI Docs](https://platform.openai.com/docs) - AI APIs
- [Next.js Docs](https://nextjs.org/docs) - Framework
- [MCP Docs](https://modelcontextprotocol.io) - MCP Protocol

### Getting Help
- **Issues**: Create GitHub issue with detailed description
- **Questions**: Check documentation first, then ask in discussions
- **Security**: Report security vulnerabilities privately

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (TDD approach)
4. Implement feature
5. Commit changes (`git commit -m 'feat: add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open Pull Request

See `docs/IMPLEMENTATION_PLAN.md` for detailed Git workflow and PR template.

---

## 📄 License

This project is proprietary and confidential.

---

## 🎯 Success Metrics

### Technical KPIs
- ✅ 99.9% uptime
- ✅ <2s API response times
- ✅ 80%+ test coverage
- ✅ Zero P0 errors in production

### Business KPIs
- ✅ 90%+ quote conversion rate
- ✅ <5 min average proposal generation time
- ✅ 100% RFP tracking accuracy

---

## 📝 Next Steps

1. ✅ Read [GETTING_STARTED.md](./docs/GETTING_STARTED.md)
2. 📋 Complete [PREREQUISITES_CHECKLIST.md](./docs/PREREQUISITES_CHECKLIST.md)
3. 📁 Review [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for directory organization
4. 🔧 Set up development environment
5. ✅ Verify all tests pass
6. 📖 Review [SYSTEM_ARCHITECTURE.md](./docs/SYSTEM_ARCHITECTURE.md)
7. 🚀 Start Week 1 in [IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md)

---

**Built with ❤️ using Next.js 14, OpenAI GPT-5, and Supabase**

**Last Updated**: October 20, 2025 | **Version**: 1.0.0