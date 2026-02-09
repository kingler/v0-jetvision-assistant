# Pre-Delivery Quality Checklist

> Combined from Spec-Kit quality gates + UI/UX Pro Max pre-delivery checks

## 1. Spec Completeness

- [ ] All P1 user scenarios have Given/When/Then acceptance criteria
- [ ] No unresolved `[NEEDS CLARIFICATION]` markers in spec
- [ ] All functional requirements are testable and unambiguous
- [ ] Success criteria are measurable and technology-agnostic
- [ ] Key entities have defined attributes and relationships

## 2. Code Quality

- [ ] No `any` type usage (use proper types or `unknown`)
- [ ] No `console.log` in production code (test files excluded)
- [ ] Explicit return types on public methods
- [ ] Error handling on API boundaries (try/catch in route handlers)
- [ ] No TODO/FIXME without linked Linear issue
- [ ] Files follow naming conventions (kebab-case for non-components, PascalCase for React components)
- [ ] Barrel exports (index.ts) for public APIs

## 3. Security

- [ ] No `eval()` usage
- [ ] No unsanitized `dangerouslySetInnerHTML` (use DOMPurify if needed)
- [ ] No hardcoded secrets or API keys (use environment variables)
- [ ] No SQL injection vectors (use parameterized queries)
- [ ] Semgrep scan passes with no ERROR findings (`/dev-framework scan`)
- [ ] Input validation on user-facing API endpoints

## 4. UI/UX

- [ ] Accessibility: WCAG 2.1 AA compliance (4.5:1 contrast ratio for text)
- [ ] Responsive: Tested at 375px, 768px, 1024px, 1440px breakpoints
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide visual feedback (150-300ms transitions)
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected for animations
- [ ] Icons use consistent set (Lucide) — no emoji as icons
- [ ] Light/dark mode: text readable, borders visible, glass elements clear
- [ ] No layout-shifting hover states
- [ ] Form inputs have labels and error states

## 5. Testing

- [ ] Unit test coverage ≥ 75% for new code
- [ ] Edge cases tested (empty states, error states, boundary values)
- [ ] Integration tests for API boundaries
- [ ] Test files follow naming convention: `*.test.ts` or `*.test.tsx`
- [ ] Mocks for external services (MCP servers, OpenAI, Redis)

## 6. Architecture

- [ ] Agents extend `BaseAgent` from `@agents/core`
- [ ] MCP servers use `@modelcontextprotocol/sdk`
- [ ] API routes have try/catch error handling
- [ ] Path aliases used (`@/`, `@agents/`, `@lib/`, `@components/`)
- [ ] No circular dependencies between modules
- [ ] Follows existing project patterns (check similar implementations)

## 7. Git Hygiene

- [ ] Atomic commits (one logical change per commit)
- [ ] Conventional commit messages: `feat|fix|refactor|test|docs(scope): message`
- [ ] No `.env` files or secrets in commits
- [ ] No large binary files committed
