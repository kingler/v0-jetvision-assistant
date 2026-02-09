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

Agent workspaces use git worktrees at `/Users/kinglerbercy/.claude/git-workspace/` for parallel isolation. Each workspace is mapped to a **Linear Issue**, **Git Branch**, and **Pull Request**.

### Workspace Location & Naming

```text
/Users/kinglerbercy/.claude/git-workspace/
├── onek-123/    # Linear: ONEK-123, Branch: feat/onek-123-*, PR: #45
├── onek-144/    # Linear: ONEK-144, Branch: fix/ONEK-144-*, PR: #98
└── .archive/    # Archived workspace metadata
```

Each directory is named by its Linear issue ID (lowercase). Every workspace contains a `WORKSPACE_META.json` mapping the Linear issue, branch, and PR.

### Workspace Lifecycle

- **Auto-created** when agents are invoked (via PreToolUse hook)
- **Auto-cleaned** only when ALL conditions are met:
  1. All TDD tests pass
  2. PR is created
  3. Code review is completed (approved)
  4. Linear issue is updated
  5. Branch is merged into main

### Slash Commands

- `/worktree-create <branch> <linear-issue-id>` - Create isolated workspace
- `/worktree-status` - View all workspace status
- `/worktree-cleanup [issue-id|--all|--stale]` - Clean up workspaces

### Manual Operations

```bash
# Create workspace for ONEK-207
git worktree add /Users/kinglerbercy/.claude/git-workspace/onek-207 feat/onek-207-feature

# List all worktrees
git worktree list

# Remove completed workspace
git worktree remove /Users/kinglerbercy/.claude/git-workspace/onek-207
```

See `CLAUDE.md` for detailed workspace management documentation.

## CI/CD Workflows (GitHub Actions)

Automated pipelines in `.github/workflows/` enforce quality gates on every PR and push.

### Workflow Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `code-review.yml` | PR, push to main/develop | Automated code quality checks |
| `pr-code-review.yml` | PR events | Detailed PR review with comments |
| `linear-sync.yml` | PR events | Sync PR status to Linear issues |
| `auto-create-pr.yml` | Push to feature branches | Auto-create PRs for new branches |
| `review-command.yml` | PR comment `/review` | On-demand review trigger |

### Review Jobs

Each PR triggers 4 automated review jobs:

1. **code-review** - Type checking, linting, unit/integration tests, coverage (≥75%)
2. **security-review** - `npm audit`, secret scanning with trufflehog
3. **architecture-review** - BaseAgent extension check, MCP SDK usage, API error handling
4. **performance-review** - Production build, bundle size analysis

### Automated PR Labels

PRs receive labels based on review status:

- `✅ code-review-passed` + `ready-for-merge` - All checks pass
- `⚠️ code-review-failed` + `needs-work` - Issues found

### Linear Integration

The `linear-sync.yml` workflow automatically:

- Extracts Linear IDs (e.g., `ONEK-123`) from branch name, PR title, or body
- Updates Linear issue state when PR is opened, ready for review, or merged
- Posts PR links as comments on linked Linear issues

### Running Checks Locally

```bash
pnpm type-check      # TypeScript validation
pnpm lint            # ESLint + Prettier
pnpm test:unit       # Unit tests
pnpm test:coverage   # Coverage report (75% threshold)
pnpm review:validate # Full validation suite
```
