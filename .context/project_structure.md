# Project Structure Analysis

**Analysis Date**: October 27, 2025  
**Project**: JetVision AI Assistant  
**Approx. File Count**: ~1,700 tracked files (excludes `node_modules/`)  
**TypeScript Sources**: 177 (`.ts`/`.tsx`)  
**Test Suites**: 38 Vitest specs under `__tests__/`

---

## Key Changes Since Oct 20 Snapshot

- `app/` now contains authenticated areas (`admin/`, `settings/`), full REST API handlers under `app/api/**`, and archived dashboard routes preserved under `_archived/`.
- `agents/implementations/` filled out with six production agents, plus coordination utilities (`message-bus`, `task-queue`, `state-machine`).
- `lib/` expanded with Supabase clients (`lib/supabase/*`), chat service orchestration, validation schemas, RBAC middleware, and reusable hooks.
- `mcp-servers/` hosts fully scaffolded MCP connectors for Avinode, Gmail, Google Sheets, and Supabase with CLI tooling.
- `supabase/migrations/` tracks 8 SQL migrations plus RLS docs; type definitions live in `lib/types/database.ts`.
- Automated testing footprint grew to 38 specs spanning unit, integration, E2E templates, and MCP server tests; coverage artefacts stored in `coverage/`.
- Operational scripts and task runners added under `scripts/`, `lib/task-runner/`, and `.context/` (status reports, testing logs).

---

## Directory Overview

- `app/`
  - `api/` – Endpoints for agents, chat streaming, clients, quotes, requests, users, workflows, and Clerk webhooks.
  - `admin/` & `settings/` – Authenticated server components for user management and profile updates.
  - `_archived/dashboard/` – Legacy dashboard preserved for reference; not wired into routing.
  - `sign-in/`, `sign-up/` – Clerk-hosted auth flows with chat-first redirects.
- `agents/`
  - `core/`, `coordination/`, `implementations/` – Complete agent pipeline with BullMQ queue integration and typed contexts.
- `components/`
  - Rich chat UI primitives, workflow visualization, proposal preview, aviation quote cards, and shared `ui/` shadcn exports.
- `hooks/`
  - Streaming/SSE consumer (`use-streaming-response`), Supabase real-time hook (`use-rfp-realtime`), responsive helpers (`use-mobile`).
- `lib/`
  - Config (`config/openai-config.ts`), services (`services/chat-agent-service.ts`, `services/supabase-queries.ts`), RBAC middleware, validation schemas, and supabase server/client factories.
- `mcp-servers/`
  - Four deployable servers with startup scripts, typed clients, and tool definitions for Avinode, Gmail, Google Sheets, Supabase.
- `supabase/`
  - SQL migrations, seed helpers, Supabase CLI metadata, and migration README.
- `__tests__/`
  - Unit coverage for agents, API routes, hooks, middleware, MCP servers, plus integration/E2E scaffolding.
- `tasks/`
  - Backlog and completion docs, task index, and generation templates; status metadata now out-of-date with current code progress.
- `docs/`
  - 40+ reference guides (PRD, implementation plan, architecture, testing playbooks, MCP onboarding).
- `coverage/` & `.next/`
  - Locally generated artefacts (coverage, Next.js build cache). Both are gitignored but inflate working tree size.

---

## Condensed Tree (Top-Level)

```
.
├── app/
│   ├── _archived/
│   ├── admin/
│   ├── api/
│   ├── settings/
│   ├── sign-in/
│   ├── sign-up/
│   └── page.tsx
├── agents/
│   ├── coordination/
│   ├── core/
│   └── implementations/
├── components/
│   ├── aviation/
│   ├── chat-*
│   └── ui/
├── hooks/
├── lib/
│   ├── hooks/
│   ├── services/
│   ├── supabase/
│   └── types/
├── mcp-servers/
├── supabase/
├── __tests__/
├── tasks/
├── docs/
├── scripts/
└── coverage/ (local artefact)
```

*Note*: Full directory listing available via `find` output captured during analysis (see review logs).
