# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains App Router segments; colocate each segment’s `loading.tsx`, `error.tsx`, and data loader (see `app/(dashboard)/requests/` for the pattern).
- UI primitives live in `components/`; feature wrappers like `components/workflow-visualization.tsx` compose them, and shared providers stay near the directory root.
- Shared logic and API clients sit in `lib/`, reusable hooks in `hooks/`, and MCP adapters in `mcp-servers/`.
- Keep static assets in `public/`, styling in `styles/`, docs in `docs/`, and reserve `__tests__/unit|integration|e2e/` for automated coverage.

## Build, Test, and Development Commands
- Install dependencies with `pnpm install`; keep the checked-in `pnpm-lock.yaml` authoritative.
- `pnpm dev` serves the app at `http://localhost:3000`; load env defaults from `.env.local` using keys listed in `docs/PREREQUISITES_CHECKLIST.md`.
- `pnpm lint` executes the Next.js ESLint/Tailwind suite and doubles as the formatting gate.
- `pnpm build` compiles and type-checks; run `pnpm start` afterwards for a production smoke test.

## Coding Style & Naming Conventions
- Stick to TypeScript, React function components, and 2-space indentation (see `app/layout.tsx`). Prefer server components until client-only APIs are needed.
- Use kebab-case filenames for single-export components (`components/chat-interface.tsx`) and PascalCase identifiers inside the file.
- Name hooks and utilities in camelCase, prefixing hooks with `use`; extract repeated Tailwind strings into helpers within `lib/`.
- Run `pnpm lint` before committing—CI relies on it for both linting and formatting.

## Testing Guidelines
- Scaffolds under `__tests__/unit`, `__tests__/integration`, and `__tests__/e2e` mirror the future Jest and Playwright setup defined in `docs/IMPLEMENTATION_PLAN.md`.
- Until automation ships, record manual validation steps in PRs (scenarios run, feature flags, env vars).
- Align with the documented coverage goals—agents ≥85%, API routes ≥80%, UI ≥70%—once runners are in place, starting with logic in `lib/`.

## Commit & Pull Request Guidelines
- Current history shows short, sentence-case subjects (`Initialized repository for project JetVision Agent`); keep using imperative, ≤72-character summaries with optional bodies.
- Each PR needs its purpose, linked issue, UI screenshots/GIFs when relevant, env callouts, and the commands run (`pnpm lint`, `pnpm build`).
- Rebase on `main` before opening a PR and avoid committing generated artifacts beyond the curated `pnpm-lock.yaml`.

## Security & Configuration Notes
- Store secrets in `.env.local` and sync required keys from `docs/PREREQUISITES_CHECKLIST.md`; never commit them.
- Sentry configs (`sentry.*.config.ts`) auto-initialize—confirm DSNs per environment and strip PII before logging.
- MCP connectors in `mcp-servers/` hit external systems; mock them in tests and guard new endpoints with feature flags.
