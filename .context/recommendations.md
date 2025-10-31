# Recommendations

| Priority | Recommendation | Rationale | Suggested Owner |
|----------|----------------|-----------|-----------------|
| P0 | Replace chat simulation with live agent integration (`useChatAgent`) and `/api/chat/respond` SSE streaming. Persist sessions/requests to Supabase and remove `lib/mock-data.ts` from runtime. | Unblocks all PRD user stories by exercising backend, agents, and MCP stack end-to-end. | Frontend + Backend pairing |
| P0 | Establish critical-path automated tests (auth, requests, quotes, agent orchestration) and enforce `pnpm test:coverage` ≥70% statements before merge. | Current coverage is 0.7%, leaving regressions undetected; CI must fail fast. | QA / Platform |
| P0 | Validate Supabase + Redis infrastructure: provision sandbox resources, run smoke tests for each MCP tool, document required environment variables. | Prevent runtime failures when BullMQ, Supabase RLS, and MCP servers go live. | DevOps |
| P1 | Update project management artefacts (`tasks/TASK_INDEX.md`, task files, Linear sync scripts) to reflect true completion state, and link code deliverables to issues. | Eliminates coordination drift and ensures planners have accurate burndown data. | Project Management |
| P1 | Implement proposal delivery pipeline: PDF generation (TASK-019), quote acceptance trigger in `/api/quotes/route.ts`, and Gmail MCP send with delivery confirmation. | Satisfies User Story 5 and completes customer-facing deliverable. | Backend / Communications Agent team |
| P1 | Connect real-time subscriptions to active UI (quotes, workflow progress) using Supabase `useRFPRealtime` and agent event listeners. | Delivers promised live dashboard experience and surfaces agent progress to users. | Frontend |
| P2 | Harden error handling & observability: wire Sentry transports, add structured logs around agent execution, configure health checks for MCP servers. | Improves production diagnosability once live traffic begins. | Platform Ops |
| P2 | Plan CI/CD rollout (GitHub Actions) with lint, type-check, test, build, and deploy steps; include secrets management for MCP/Redis credentials. | Supports repeatable deployments and reduces manual configuration risk. | DevOps |
