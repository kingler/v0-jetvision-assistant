# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts all Next.js App Router segments; colocate `loading.tsx`, `error.tsx`, and route-specific data loaders inside each segment (e.g., `app/(dashboard)/requests/`).
- UI building blocks live in `components/`; feature shells such as `components/workflow-visualization.tsx` compose these primitives, while cross-cutting providers (e.g., `components/theme-provider.tsx`) stay near the root.
- Business logic, API clients, and shared helpers belong in `lib/`; custom hooks sit in `hooks/`, and MCP integrations are grouped under `mcp-servers/`.
- Static assets live in `public/`, Tailwind configuration and globals in `styles/`, and reference docs in `docs/`. Reserve `__tests__/unit|integration|e2e/` for automated coverage as test tooling lands.

## Build, Test, and Development Commands
- Install dependencies with `pnpm install`; never mix package managers once the `pnpm-lock.yaml` is committed.
- `pnpm dev` starts the local server on `http://localhost:3000`; pair it with `NEXT_PUBLIC_…` env vars from `docs/PREREQUISITES_CHECKLIST.md`.
- `pnpm lint` runs the Next.js ESLint suite plus Tailwind rules—treat warnings as failures before pushing.
- `pnpm build` validates types and production bundles; follow with `pnpm start` for a smoke test of the compiled app.

## Coding Style & Naming Conventions
- Use TypeScript, React function components, and 2-space indentation (see `app/layout.tsx`). Prefer server components unless client state or effects are required.
- Name components with PascalCase files only when they export multiple constructs; otherwise stick with kebab-case filenames (`components/chat-interface.tsx`) and default exports.
- Keep hooks and utilities in camelCase, prefixing hooks with `use`. Extract repeated Tailwind class strings into helpers in `lib/styles.ts` or similar utilities.
- Trigger `pnpm lint` (and format via the IDE’s default TS/JS formatter) before committing; no standalone formatter runs in CI.

## Testing Guidelines
- Testing scaffolds live under `__tests__`, mirroring `unit`, `integration`, and `e2e` scopes; follow the structure laid out in `docs/IMPLEMENTATION_PLAN.md` when wiring Jest and Playwright.
- Until the automated harness is configured, document manual validation in PRs (scenarios exercised, feature flags toggled, env vars used).
- Respect coverage goals from the project docs (agents ≥85%, API routes ≥80%, UI ≥70%) once test runners are added; prioritize logic-heavy modules in `lib/` first.

## Commit & Pull Request Guidelines
- Current history uses short, sentence-case subjects (`Initialized repository for project JetVision Agent`). Continue with imperative summaries capped at 72 characters and add context in an optional body.
- Every PR should include: purpose, linked issue or roadmap item, screenshots/GIFs for UI deltas, environment notes, and a checklist of commands run (`pnpm lint`, `pnpm build`).
- Rebase against `main` before opening a PR; avoid committing generated artifacts outside `pnpm-lock.yaml` unless they are required for deployment.

## Security & Configuration Notes
- Keep sensitive values in `.env.local`; never commit them. Reference the required keys in `docs/PREREQUISITES_CHECKLIST.md`.
- Sentry instrumentation (`sentry.*.config.ts`) initializes automatically—verify DSNs in each environment and scrub PII before logging.
- MCP connectors under `mcp-servers/` hit external systems; mock those calls in tests and gate new endpoints behind feature flags when possible.
