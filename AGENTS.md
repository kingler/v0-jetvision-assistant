# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts the Next.js 14 App Router; chat flows sit in `app/(chat)` with colocated loading and error states.
- Shared UI, data helpers, and hooks live in `components/`, `lib/`, and `hooks/`; feature wrappers compose primitives from here.
- `agents/`, `mcp-servers/`, `scripts/`, and `tasks/` cover agent configs, hosted MCP connectors, task CLIs, and TaskMaster briefs.
- Tests reside in `__tests__/`, `tests/`, and `test-results/`; docs live in `docs/`, and static assets stay under `public/`.

## Build, Test, and Development Commands
- Install dependencies with `pnpm install`; keep `pnpm-lock.yaml` authoritative.
- `pnpm dev` runs the app plus MCP dev servers; populate `.env.local` using `docs/PREREQUISITES_CHECKLIST.md`.
- `pnpm lint`, `pnpm type-check`, and `pnpm build` guard formatting, types, and production bundles; finish with `pnpm start` for smoke tests.
- Use focused Vitest suites: `pnpm test`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:agents`, and `pnpm test:coverage`.

## Coding Style & Naming Conventions
- Use TypeScript, 2-space indentation, and Prettier defaults; prefer server components until client hooks are required.
- Name files in kebab-case (`chat-interface.tsx`, `operator-availability.ts`) and export PascalCase components with explicit `Props` types.
- Route handlers belong in `app/api/**/route.ts`; suffix platform-specific helpers with `.server.ts` or `.client.ts`.
- Reuse existing Tailwind utility patterns; extract repeat styling into helpers in `lib/`.

## Testing Guidelines
- Place unit and integration specs beside code or within `__tests__/unit|integration`; mirror folder structure for discoverability.
- Mock Responses API streams and hosted MCP tools; commit deterministic fixtures under `tests/`.
- Track coverage goals (agents ≥85%, API routes ≥80%, UI ≥70%) and verify via `pnpm test:coverage`.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat(scope): summary`) or ticket-scoped variants (`fix(ONEK-49): ...`); keep subjects imperative and ≤72 characters.
- Group logical changes into focused commits; avoid mixing infra, UI, and data migrations.
- PRs must describe the change, list validation commands, and attach UI evidence when applicable.
- Link TaskMaster briefs or issues, and document env or MCP configuration impacts before reviewers approve.

## Security & Configuration Notes

- Keep secrets in `.env.local`; never expose API keys in client bundles or commit histories.
- Hosted MCP connectors should log tool names/args server-side only; sanitize inputs and rate-limit per session.
- Sentry configs live in `sentry.*.config.ts`; confirm DSNs per environment and strip PII before logging.
- Update `tasks/` or `docs/` whenever Responses API, Agents SDK, or security decisions change so future agents inherit context.

## Git Worktree Workspace Isolation

Agent workspaces use git worktrees in `.context/workspaces/` for parallel isolation across 9 SDLC phases.

### Workspace Lifecycle

- **Auto-created** when agents are invoked (via PreToolUse hook)
- **Auto-cleaned** only when ALL conditions are met:
  1. All TDD tests pass
  2. PR is created
  3. Code review is completed (approved)
  4. Linear issue is updated
  5. Branch is merged into main

### Slash Commands

- `/worktree-create <phase> <branch> [issue-id]` - Create isolated workspace
- `/worktree-status` - View all workspace status
- `/worktree-cleanup [branch|--all|--stale]` - Clean up workspaces

### Phase Structure

| Phase | Name | Purpose |
|-------|------|---------|
| 1 | branch-init | Branch initialization |
| 2 | test-creation | TDD test writing (RED) |
| 3 | implementation | Code implementation (GREEN) |
| 4 | code-review | Code review |
| 5 | iteration | Iteration & fixes (REFACTOR) |
| 6 | pr-creation | PR creation |
| 7 | pr-review | PR review |
| 8 | conflict-resolution | Conflict resolution |
| 9 | merge | Branch merge |

See `CLAUDE.md` for detailed workspace management documentation.
