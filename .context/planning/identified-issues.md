# Identified Issues, Bugs & Technical Debt

**Project**: Jetvision AI Assistant
**Analysis Date**: 2026-02-09
**Previous Report**: 2025-01-31
**Priority Scale**: P0 Critical | P1 High | P2 Medium | P3 Low

---

## Issue Summary

| Priority | Previous (Jan 31) | Current (Feb 9) | Change |
|----------|-------------------|------------------|--------|
| P0 Critical | 1 | **0** | Resolved |
| P1 High | 2 | 1 | -1 (resolved) |
| P2 Medium | 5 | 4 | -1 (resolved) |
| P3 Low | 3 | 3 | Stable |

**Status**: P0 TypeScript errors fully resolved. 7 test files failing (40 tests). 144 lint warnings (non-blocking).

---

## Critical Issues (P0)

**None.** All P0 issues resolved.

### RESOLVED: TypeScript Type Export Errors
- **Previous**: 14 TypeScript errors from missing type exports
- **Resolution**: All 14 errors fixed. `npx tsc --noEmit` exits cleanly with 0 errors.
- **Date Resolved**: February 2026

---

## High Priority Issues (P1)

### 1. Test Suite Failures (7 Files, 40 Tests)
**Severity**: P1 High | **Impact**: CI reliability, regression detection

**Evidence** (from `npx vitest run` — Feb 9):

| Test Area | Files | Passed | Failed | Skipped |
|-----------|-------|--------|--------|---------|
| lib/ | 21 | 381 | 0 | 0 |
| components/ | 46 | 1,159 | 12 | 16 |
| api/ | 17 | 159 | 28 | 17 |
| mcp/ | 7 | 151 | 0 | 0 |
| mcp-servers/ | 3 | 82 | 0 | 0 |
| prompts/ | 1 | 70 | 0 | 0 |
| integration/ | 11 | 136 | 0 | 43 |
| **Totals** | **106** | **2,138** | **40** | **76** |

**Failing Test Files**:
1. `components/avinode/avinode-auth-status.test.tsx` — Date calculation (days until expiration) drifted from expected values
2. `components/conversation-starters/conversation-starter-hub.test.tsx` — DEFAULT_STARTERS array changed, tests expect old values
3. `components/conversation-starters/hooks/use-smart-starters.test.ts` — Badge/priority assertions stale after conversation starter refactor
4. `api/agents/route.test.ts` — All 7 tests fail (mock or import issue)
5. `api/clients/route.test.ts` — All 7 tests fail (mock or import issue)
6. `api/quotes/route.test.ts` — All 6 tests fail (mock or import issue)
7. `integration/database/schema.test.ts` — Schema assertion mismatches

**Root Cause**: Tests written against older API shapes or component props. Mocks need updating after Feb refactors.

**Recommended Fix**:
1. Update `avinode-auth-status` test date calculations
2. Update `conversation-starter-hub` test expectations to match current DEFAULT_STARTERS
3. Update `use-smart-starters` badge/priority assertions
4. Fix API route test mock setup (agents, clients, quotes)
5. Update schema test assertions

**Effort**: 2-4 hours

---

## Medium Priority Issues (P2)

### 2. Google Sheets OAuth Not Complete
**Severity**: P2 Medium | **Impact**: External CRM sync

**Evidence**:
- Google Sheets MCP at 70% completion
- OAuth flow structure exists but not tested
- Token refresh mechanism needed

**Consequence**: Cannot sync client data from external sources

**Recommended Fix**: Complete OAuth 2.0 flow with token refresh

**Effort**: 1-2 days

---

### 3. Production Deployment Configuration
**Severity**: P2 Medium | **Impact**: Launch readiness

**Evidence**:
- Vercel configured but needs finalization
- No Sentry monitoring configured
- No rate limiting middleware

**Recommended Fix**:
1. Configure production environment variables
2. Set up Sentry with DSN and source maps
3. Add Redis-based rate limiter middleware

**Effort**: 1-2 days

---

### 4. Lint Warnings (144 Warnings, 26 Files)
**Severity**: P2 Medium | **Impact**: Code quality

**Evidence** (from `npx next lint` — Feb 9):

| Source | Warnings | Type |
|--------|----------|------|
| `app/_archived/` | ~95 | Unescaped entities, `<img>` alt text |
| `components/` (active) | ~30 | `<img>` alt text, unescaped entities |
| `lib/pdf/` | ~10 | `<img>` alt text in PDF templates |
| `lib/chat/` | ~5 | Various |
| Other | ~4 | Various |

**Files with Active (Non-Archived) Warnings**:
- `components/avinode/avinode-message-card.tsx`
- `components/avinode/book-flight-modal.tsx`
- `components/avinode/flight-search-progress.tsx`
- `components/chat-interface.tsx`
- `components/chat/agent-message-v2.tsx`
- `components/customer-selection-dialog.tsx`
- `components/rich-markdown.tsx`
- `lib/pdf/proposal-template.tsx`
- `lib/pdf/contract-template.tsx`
- `lib/chat/hooks/use-streaming-chat.ts`

**Recommended Fix**:
1. Remove `app/_archived/` from ESLint scope (add to `.eslintignore`)
2. Fix `<img>` → `<Image>` or add `alt` attributes in active components
3. Fix unescaped entities (`'` → `&apos;`, `"` → `&quot;`)

**Effort**: 1-2 hours

---

### 5. `.venv/` Tracked in Git
**Severity**: P2 Medium | **Impact**: Repository bloat

**Evidence**: Python virtual environment directory committed to git

**Recommended Fix**:
```bash
echo ".venv/" >> .gitignore
git rm -r --cached .venv/
git commit -m "chore: remove .venv from git tracking"
```

**Effort**: 15 minutes

---

## Low Priority Issues (P3)

### 6. API Documentation Missing
**Severity**: P3 Low | **Impact**: Developer experience

**Evidence**:
- 41 API routes with no OpenAPI spec
- Documentation scattered across docs/

**Recommended Fix**: Generate OpenAPI spec from Zod schemas using `zod-to-openapi`

**Effort**: 1 day

---

### 7. Mobile Responsiveness Testing Needed
**Severity**: P3 Low | **Impact**: Mobile UX

**Evidence**:
- Desktop and tablet UI excellent
- Mobile not systematically tested
- 85% completion on responsive design

**Recommended Fix**: Test on mobile devices, add responsive breakpoint tests

**Effort**: 1 day

---

### 8. Contract Digital Signatures
**Severity**: P3 Low | **Impact**: Contract workflow completion

**Evidence**:
- Contract generation and send implemented (ONEK-207)
- Rich contract card with auto-open PDF working
- No digital signature integration

**Recommended Fix**: Integrate DocuSign or similar for v2

**Effort**: 2-3 days (future enhancement)

---

## Resolved Issues (Since Jan 31 Report)

### RESOLVED: TypeScript Type Export Errors (P0)
- **Previous**: 14 TypeScript errors from missing type exports
- **Resolution**: All exports fixed, `npx tsc --noEmit` clean
- **Date**: February 2026

### RESOLVED: Email Approval Workflow Edge Cases (P1)
- **Previous**: Missing edit, cancel, retry functionality
- **Resolution**: EmailPreviewCard with margin slider (ONEK-178), human-in-the-loop approval working, Gmail MCP production integration (ONEK-140)
- **Date**: February 2026

### RESOLVED: Production Deployment Partial (P2 → still P2 but improved)
- **Previous Score**: 50% DevOps
- **Current Score**: 72% DevOps — CI/CD complete, deployment partially configured
- **Remaining**: Sentry, rate limiting, production env vars

### RESOLVED: Multi-City Trip Rendering
- **Previous**: Multi-city trips rendered as one-way
- **Resolution**: ONEK-144 (segments[], system prompt, UI prop extractor, European airports)
- **Date**: February 2026

### RESOLVED: Duplicate Proposal/Email Cards
- **Previous**: Proposal and email cards duplicated in chat
- **Resolution**: ONEK-209 deduplication
- **Date**: February 2026

### RESOLVED: RFQ Price Display
- **Previous**: Prices not refreshing
- **Resolution**: ONEK-175 price update refresh
- **Date**: February 2026

---

## Technical Debt

### Code Quality Debt

1. **Archived Dashboard**: `app/_archived/` generates ~95 lint warnings — should be excluded from lint or deleted
2. **Stale Test Mocks**: 7 test files with outdated assertions after Feb refactors
3. **Test Suite Timeout**: Full test suite exceeds 120s timeout on pre-push hook (exit code 144)

### Architecture Debt

1. **No HTTP+SSE Transport**: MCP servers only support stdio
2. **No Caching Layer**: API responses not cached (Redis available but unused for caching)
3. **No Request Deduplication**: Simultaneous API requests not deduplicated

### Documentation Debt

1. **API Examples**: Need request/response examples for 41 routes
2. **Deployment Guide**: Needs finalization for production

---

## Recommended Resolution Order

### This Week (Priority)
1. P1: Fix 7 failing test files (2-4 hours)
2. P2: Remove `.venv/` from git (15 minutes)
3. P2: Configure Sentry monitoring (2-4 hours)

### Next Week
4. P2: Add rate limiting middleware (4-6 hours)
5. P2: Fix lint warnings in active components (1-2 hours)
6. P2: Configure production environment (1 day)

### Future (Post-Launch)
7. P2: Complete Google Sheets OAuth
8. P3: API documentation
9. P3: Mobile responsiveness testing
10. P3: Digital signatures

