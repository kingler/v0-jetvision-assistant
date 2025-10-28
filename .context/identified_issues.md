# Identified Issues & Gaps

1. **Chat experience still driven by mock data** (Severity: 🔴 High, Impact: primary workflow unusable with live backend)
   - Evidence: `app/page.tsx:31` seeds sessions from `useCaseChats` and drives conversations through `simulateWorkflowProgress` instead of service calls; `components/chat-interface.tsx:101` renders quotes/proposals from in-memory arrays.
   - Consequence: No real Supabase persistence, MCP calls, or agent orchestration is exercised in UI; user testing cannot validate backend logic.

2. **Live chat hooks are implemented but unused** (Severity: 🟠 Medium)
   - Evidence: `hooks/use-chat-agent.ts` exposes full agent integration but is never imported outside documentation; archived dashboard is the only consumer of `useRFPRealtime` (`app/_archived/dashboard/rfp/page.tsx`), leaving active chat without realtime updates.
   - Consequence: Streaming responses, workflow subscriptions, and quote updates never surface in production UI.

3. **Automated test coverage is effectively zero** (Severity: 🔴 High)
   - Evidence: Coverage summary shows **0.7% statements (117/16,493)** in `coverage/lcov-report/index.html:25-29`; integration/E2E suites are placeholders (`tests/*.spec.ts`).
   - Consequence: Regressions in agents, API routes, and Supabase policies will ship undetected; no quality gate for CI/CD.

4. **Task and status documentation badly out of sync** (Severity: 🟡 Medium)
   - Evidence: Master index still reports only 1/37 tasks complete (`tasks/TASK_INDEX.md:1-126`) and individual “completed” task files (e.g., `tasks/completed/TASK-001-clerk-authentication-integration.md:3`) list status as “Active” with unchecked acceptance criteria.
   - Consequence: Project management artifacts misrepresent progress, making coordination with Linear/backlog unreliable.

5. **Proposal delivery pipeline incomplete** (Severity: 🟠 Medium)
   - Evidence: Communication agent drafts emails but PDF generation service noted in `tasks/backlog/TASK-019-pdf-generation-service.md` remains unimplemented; `/app/api/quotes/route.ts` never triggers email send on acceptance.
   - Consequence: User Story 5 cannot be satisfied; operators’ quotes stop at analysis with no customer-facing output.

6. **Operational dependencies not validated** (Severity: 🟠 Medium)
   - Evidence: BullMQ queue instantiation defaults to local Redis (`agents/coordination/task-queue.ts:36-69`), but no environment provisioning or smoke tests exist; MCP servers rely on env vars without credential checks.
   - Consequence: First deployment risks runtime failures due to missing Redis/MCP credentials and untested connections.
