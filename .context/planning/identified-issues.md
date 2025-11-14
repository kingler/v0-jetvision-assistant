# Identified Issues, Bugs & Technical Debt

**Project**: Jetvision AI Assistant
**Analysis Date**: 2025-11-13
**Priority Scale**: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low

---

## Critical Issues (🔴 P0 - Blocking MVP)

### 1. Unified Chat Interface Not Started
**Severity**: 🔴 Critical | **Impact**: Primary UX blocker
**Linear**: ONEK-92 (88 story points)

**Evidence**:
- Only ONEK-93 (Message Components) completed
- 23 subtasks across 4 phases remain
- Old multi-page dashboard still active

**Consequence**:
- User experience fragmented across 5+ separate pages
- Cannot achieve "ChatGPT for private jet booking" vision
- All conversational flows blocked

**Location**: `app/dashboard/`, `app/chat/page.tsx`
**Recommended Fix**: Start ONEK-92 Phase 1 immediately (Chat Interface Enhancement)

---

### 2. Test Coverage Below 75% Threshold
**Severity**: 🔴 Critical | **Impact**: Production confidence, CI/CD blocked
**Coverage**: ~50-55% (Target: 75%)

**Evidence**:
- 30 test failures blocking coverage reporting
  - ProfilePage: 25 failures (ResizeObserver not defined)
  - ChatKit Session: 5 failures (missing mocks)
- 640 tests passing but insufficient coverage
- Integration tests incomplete (RLS policies untested)
- E2E tests in backup folder

**Consequence**:
- Cannot measure actual coverage
- Production deployment risky without test confidence
- Regressions will ship undetected

**Location**: `__tests__/unit/app/settings/profile/page.test.tsx`, `__tests__/unit/api/chatkit/session.test.ts`
**Recommended Fix**:
1. Add ResizeObserver polyfill to test setup
2. Create ChatKit SDK mocks
3. Expand RLS integration tests
4. Move E2E tests out of backup

---

### 3. MCP Servers Incomplete
**Severity**: 🔴 Critical | **Impact**: Agent functionality blocked

**Evidence**:
| Server | Completion | Missing |
|--------|------------|---------|
| Avinode | 60% | Full tool suite, error handling |
| Google Sheets | 30% | OAuth 2.0, CRUD operations |
| Gmail | 30% | OAuth 2.0, send with attachments |
| Supabase | 40% | Complex queries, RLS-aware ops |

**Consequence**:
- ClientDataAgent cannot fetch client profiles
- FlightSearchAgent cannot search/create RFPs
- CommunicationAgent cannot send proposals
- End-to-end workflows impossible

**Location**: `mcp-servers/*/src/`
**Recommended Fix**: Complete OAuth implementations and core tool sets (1 week effort)

---

### 4. Agent Implementations Incomplete
**Severity**: 🔴 Critical | **Impact**: Core functionality missing
**Overall Completion**: 45%

**Evidence**:
- All 6 agents only partially implemented (40-65% each)
- No agent tools directory (`agents/tools/` empty)
- MCP integration missing from all agents
- Error handling and retry logic incomplete

**Consequence**:
- OrchestratorAgent cannot parse complex RFPs
- No agent can successfully complete full workflow
- NLP understanding insufficient for production

**Location**: `agents/implementations/`
**Recommended Fix**: Wire agent-to-MCP connections, add comprehensive error handling

---

## High Priority Issues (🟠 P1)

### 5. Chat UI Still Uses Mock Data
**Severity**: 🟠 High | **Impact**: Primary workflow unusable with live backend

**Evidence**:
- `app/page.tsx` seeds sessions from `useCaseChats` mock data
- `components/chat-interface.tsx` renders from in-memory arrays
- `simulateWorkflowProgress` drives conversations instead of agents
- Live hooks implemented but unused (`hooks/use-chat-agent.ts`)

**Consequence**:
- No real Supabase persistence exercised
- MCP calls never triggered from UI
- Agent orchestration not validated
- User testing cannot validate backend logic

**Location**: `app/page.tsx:31`, `components/chat-interface.tsx:101`, `lib/mock-data.ts`
**Recommended Fix**: Replace mocks with actual service calls after ONEK-92 Phase 2

---

### 6. Production Deployment Infrastructure Missing
**Severity**: 🟠 High | **Impact**: Cannot deploy to production

**Evidence**:
- No Docker/Docker Compose configuration
- No Kubernetes manifests
- No deployment scripts or runbooks
- No environment-specific configs (dev/staging/prod)
- Monitoring (Sentry) integrated but not configured

**Consequence**:
- Manual deployment process error-prone
- Cannot replicate production environment locally
- No rollback strategy
- No deployment automation

**Location**: Root directory (missing files)
**Recommended Fix**: Create `Dockerfile`, `docker-compose.yml`, `.github/workflows/deploy.yml`

---

### 7. OAuth Flows Not Implemented
**Severity**: 🟠 High | **Impact**: Gmail and Sheets MCP blocked

**Evidence**:
- Google Sheets MCP has no OAuth 2.0 flow
- Gmail MCP has no OAuth 2.0 flow
- Credential management undocumented
- No token refresh logic

**Consequence**:
- ClientDataAgent cannot access client profiles
- CommunicationAgent cannot send emails
- User Story 2 and 5 blocked

**Location**: `mcp-servers/google-sheets-mcp-server/`, `mcp-servers/gmail-mcp-server/`
**Recommended Fix**: Implement OAuth 2.0 with token refresh using `google-auth-library`

---

### 8. Proposal PDF Generation Not Implemented
**Severity**: 🟠 High | **Impact**: User Story 5 blocked

**Evidence**:
- PDF generation service documented but not implemented
- Communication Agent can draft emails but no PDF attachment
- No PDF template system
- TASK-019 in backlog

**Consequence**:
- Cannot deliver proposals to clients
- Manual PDF creation required
- User Story 5 only 40% complete

**Location**: Missing service (should be `lib/pdf/`)
**Recommended Fix**: Implement PDF service using a library like `@react-pdf/renderer` or `puppeteer`

---

## Medium Priority Issues (🟡 P2)

### 9. Real-Time Updates Not Wired
**Severity**: 🟡 Medium | **Impact**: Quote tracking incomplete

**Evidence**:
- `hooks/use-rfp-realtime.ts` implemented but unused in active UI
- Only archived dashboard uses realtime subscription
- Chat interface has no Supabase realtime integration
- Quote polling not implemented

**Consequence**:
- Users must manually refresh for quote updates
- No notifications when quotes arrive
- User Story 3 only 55% complete

**Location**: `hooks/use-rfp-realtime.ts`, `components/chat-interface.tsx`
**Recommended Fix**: Wire realtime hooks into unified chat interface

---

### 10. Test Data Out of Sync with Schemas
**Severity**: 🟡 Medium | **Impact**: Test failures

**Evidence**:
- PR #11: 4 email API tests failing due to stricter Zod validation
- Test mocks use old database field names
- Test data doesn't match current validation rules

**Consequence**:
- Tests fail even when code is correct
- False negatives in CI
- Developer friction

**Location**: `__tests__/unit/api/email/route.test.ts`
**Recommended Fix**: Update test data to match strict schemas

---

### 11. API Documentation Missing
**Severity**: 🟡 Medium | **Impact**: Developer experience

**Evidence**:
- No OpenAPI/Swagger documentation
- No API versioning strategy
- No request/response examples in docs
- Endpoint documentation scattered

**Consequence**:
- Difficult for frontend to integrate
- No contract testing
- API changes break consumers

**Location**: Missing documentation (should have `docs/api/`)
**Recommended Fix**: Generate OpenAPI spec from Zod schemas

---

### 12. Rate Limiting Not Implemented
**Severity**: 🟡 Medium | **Impact**: Security/abuse risk

**Evidence**:
- No rate limiting on any API routes
- No throttling for expensive operations
- No quota management per user

**Consequence**:
- Vulnerable to abuse/DoS
- No cost control for OpenAI/Avinode API calls
- Resource exhaustion possible

**Location**: `app/api/` routes
**Recommended Fix**: Implement rate limiting middleware using Redis

---

### 13. Error Monitoring Not Configured
**Severity**: 🟡 Medium | **Impact**: Observability gap

**Evidence**:
- Sentry package installed but not configured
- No error dashboards or alerts
- No APM (Application Performance Monitoring)
- Basic console logging only

**Consequence**:
- Cannot detect production errors
- No performance metrics
- Slow incident response

**Location**: Missing Sentry initialization
**Recommended Fix**: Configure Sentry with proper DSN and environment tags

---

### 14. ResizeObserver Polyfill Missing
**Severity**: 🟡 Medium | **Impact**: 25 ProfilePage tests failing

**Evidence**:
```
ReferenceError: ResizeObserver is not defined
  at ProfilePage > should show preferences for customer role
```

**Consequence**:
- ProfilePage component tests all fail
- Cannot verify UI behavior
- Blocks test coverage improvements

**Location**: `__tests__/helpers/setup.ts`
**Recommended Fix**: Add ResizeObserver polyfill to test setup:
```typescript
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
```

---

### 15. E2E Tests in Backup Folder
**Severity**: 🟡 Medium | **Impact**: Critical flows untested

**Evidence**:
- Auth E2E tests in `__tests__/e2e/auth.backup/`
- Tests not running in CI
- Playwright configured but not used

**Consequence**:
- No end-to-end validation
- Sign-in/sign-up flows untested
- User journeys unverified

**Location**: `__tests__/e2e/auth.backup/`
**Recommended Fix**: Move tests out of backup, fix and enable in CI

---

## Low Priority Issues (🟢 P3)

### 16. Performance Indexes Missing
**Severity**: 🟢 Low | **Impact**: Query performance at scale

**Evidence**:
- Database schema has basic indexes only
- No compound indexes for common queries
- No query plan analysis done

**Consequence**:
- Slower queries as data grows
- Potential N+1 query issues

**Location**: `supabase/migrations/`
**Recommended Fix**: Add indexes after profiling slow queries

---

### 17. Backup/Restore Procedures Missing
**Severity**: 🟢 Low | **Impact**: Disaster recovery

**Evidence**:
- No documented backup strategy
- No restore procedures
- No backup testing

**Consequence**:
- Data loss risk
- Long recovery time
- Compliance issues

**Location**: Missing documentation
**Recommended Fix**: Document and test backup/restore procedures

---

### 18. Mobile Responsiveness Untested
**Severity**: 🟢 Low | **Impact**: Mobile UX unknown

**Evidence**:
- Desktop UI working
- No mobile testing documented
- Responsive design partial (60%)

**Consequence**:
- Possible mobile UX issues
- Touch interactions not optimized

**Location**: All components
**Recommended Fix**: Test on mobile devices, add responsive breakpoint tests

---

## Technical Debt

### Code Quality Debt

1. **Empty Directories**: `agents/tools/`, `agents/guardrails/`, `agents/monitoring/` exist but unused
2. **Archived Dashboard**: Old multi-page UI at `app/_archived/dashboard/` should be removed after migration
3. **Mock Data Dependencies**: `lib/mock-data.ts` used in production code paths
4. **Type Safety**: Some `any` types in agent implementations
5. **Error Messages**: Generic error messages, need user-friendly localized messages

### Architecture Debt

1. **No HTTP+SSE Transport**: MCP servers only support stdio, limiting deployment options
2. **No Circuit Breakers**: External API calls have no failure protection
3. **No Caching Layer**: Repeated API calls not cached (Redis available but unused)
4. **No Request Deduplication**: Simultaneous identical requests not deduplicated
5. **No Idempotency**: POST requests not idempotent, risking duplicate operations

### Documentation Debt

1. **Task Index Out of Sync**: `tasks/TASK_INDEX.md` shows 1/37 complete (actually much higher)
2. **Linear Sync**: Project status not reflected in Linear issues
3. **Deployment Guide Missing**: No step-by-step production deployment
4. **Architecture Diagrams Outdated**: Diagrams don't show latest structure
5. **API Examples Missing**: No request/response examples

---

## Issue Summary by Priority

### Critical (🔴 P0): 4 issues
1. Unified Chat Interface not started - **BLOCKER**
2. Test coverage below 75%
3. MCP servers incomplete
4. Agent implementations incomplete

### High (🟠 P1): 4 issues
5. Chat UI uses mock data
6. Production deployment infrastructure missing
7. OAuth flows not implemented
8. PDF generation not implemented

### Medium (🟡 P2): 7 issues
9. Real-time updates not wired
10. Test data out of sync
11. API documentation missing
12. Rate limiting not implemented
13. Error monitoring not configured
14. ResizeObserver polyfill missing
15. E2E tests in backup folder

### Low (🟢 P3): 3 issues
16. Performance indexes missing
17. Backup/restore procedures missing
18. Mobile responsiveness untested

**Total Issues**: 18 identified issues + 15 technical debt items

---

## Recommended Issue Resolution Order

### Week 1
1. 🔴 Start ONEK-92 Phase 1 (Chat Interface Enhancement)
2. 🔴 Fix 30 test failures (ResizeObserver + ChatKit mocks)
3. 🟠 Complete OAuth flows for Gmail and Sheets

### Week 2
4. 🔴 Complete MCP server implementations
5. 🔴 Wire agents to MCP servers
6. 🟡 Implement real-time updates in chat

### Week 3
7. 🟠 Create production deployment infrastructure (Docker, CI/CD)
8. 🟠 Implement PDF generation service
9. 🟡 Expand test coverage to 75%

### Week 4+
10. 🟡 Add API documentation
11. 🟡 Configure error monitoring
12. 🟡 Implement rate limiting
13. 🟢 Performance optimization
14. 🟢 Mobile testing
