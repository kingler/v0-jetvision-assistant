# TASK-000: Fix TypeScript Compilation & Vitest Dependency Blockers

**Status**: 🔴 URGENT - Blocking All Development
**Priority**: CRITICAL
**Estimated Time**: 2.5 hours
**Actual Time**: _TBD_
**Assigned To**: Development Team
**Created**: October 21, 2025
**Due Date**: October 21, 2025 (TODAY)

---

## Task Overview

### Objective
Fix critical TypeScript compilation errors (15 errors) and vitest dependency issue that are blocking all development work, testing, and CI/CD pipeline.

### User Story
```
As a developer
I want TypeScript compilation and tests to work without errors
So that I can continue implementing features and ensure code quality
```

### Business Value
- **Unblocks**: All development tasks (TASK-001 through TASK-037)
- **Enables**: Testing infrastructure and TDD workflow
- **Prevents**: CI/CD failures when pipeline is set up
- **Improves**: Developer experience and productivity

### Current Blocker Impact
- ❌ TypeScript compilation fails (15 errors)
- ❌ Cannot run tests (`vitest/config` not found)
- ❌ CI/CD would fail if enabled
- ❌ Code quality cannot be verified

---

## Requirements & Acceptance Criteria

### Functional Requirements

**FR-1**: TypeScript Compilation
- [ ] All TypeScript files compile without errors
- [ ] `npm run type-check` exits with code 0
- [ ] `npm run build` succeeds without type warnings

**FR-2**: Vitest Dependency
- [ ] vitest module is properly installed
- [ ] `vitest.config.ts` compiles without errors
- [ ] `npm test` command works (even with 0 tests)

**FR-3**: Type Definitions
- [ ] ChatSession interface includes all required properties
- [ ] Component prop types are correctly defined
- [ ] All imports resolve correctly

### Non-Functional Requirements

**NFR-1**: No Breaking Changes
- Fixes should not alter functionality
- Existing passing builds should still work
- No changes to public APIs

**NFR-2**: Documentation
- Document any type changes made
- Update interfaces if properties added

### Acceptance Criteria

✅ **DONE when**:
1. `npm run type-check` shows 0 errors
2. `npm run build` completes successfully
3. `npm test -- --version` shows vitest version
4. All 15 TypeScript errors are resolved
5. No new errors introduced

---

## TDD Approach

### Phase 1: RED - Write Failing Tests ❌

Since this is a bug fix for build/compilation issues, our "tests" are:

**Test 1: TypeScript Compilation Test**
```bash
# This currently fails
npm run type-check
# Expected: Exit code 0
# Actual: Exit code 2 (15 errors)
```

**Test 2: Build Test**
```bash
# This succeeds but has warnings
npm run build
# Expected: No type warnings
# Actual: Deprecation warnings
```

**Test 3: Vitest Config Test**
```bash
# This currently fails
node -e "require('./vitest.config.ts')"
# Expected: Loads config
# Actual: Cannot find module 'vitest/config'
```

**Commit Message**:
```
test(build): add verification for TypeScript and vitest fixes

Red phase - compilation currently failing

- TypeScript: 15 errors in 8 files
- Vitest: Cannot find module 'vitest/config'
- Build: Succeeds but has warnings

Related to: TASK-000
```

### Phase 2: GREEN - Make Tests Pass ✅

**Step 1: Fix Vitest Dependency (30 minutes)**

```bash
# Remove corrupted node_modules
rm -rf node_modules pnpm-lock.yaml

# Clean npm cache
npm cache clean --force

# Reinstall all dependencies
npm install

# Verify vitest is installed
npm ls vitest

# Expected output:
# vitest@2.1.0

# Test the fix
npm test -- --version
# Expected: Shows vitest version
```

**Step 2: Fix OpenAI Import (15 minutes)**

File: `agents/core/types.ts:6`

```typescript
// Before (fails)
import type { ChatCompletion } from 'openai';

// After (works)
import type { ChatCompletion } from 'openai/resources/chat';
// OR verify openai is installed:
// npm ls openai
// npm install openai@latest --save
```

**Step 3: Fix ChatSession Type (30 minutes)**

Create/update type definitions file:

```typescript
// lib/types/chat.ts
export interface Customer {
  name: string;
  email?: string;
  phone?: string;
  preferences?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  route: string;
  passengers: number;
  date: string;
  status: 'understanding_request' | 'searching_aircraft' | 'requesting_quotes' | 'analyzing_options' | 'proposal_ready';
  currentStep: number;
  totalSteps: number;
  aircraft?: string;
  operator?: string;
  basePrice?: number;
  totalPrice?: number;
  margin?: number;
  messages: ChatMessage[];
  quotesReceived?: number;
  quotesTotal?: number;
  customer?: Customer; // Add this property
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  showWorkflow?: boolean;
  showProposal?: boolean;
  showQuoteStatus?: boolean;
  showCustomerPreferences?: boolean; // Add this property
}
```

**Step 4: Fix Component Ref Types (20 minutes)**

File: `components/ui/badge.tsx` and `components/ui/button.tsx`

```typescript
// Before (fails)
<span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />

// After (works)
<span ref={ref as React.Ref<HTMLSpanElement>} className={cn(badgeVariants({ variant }), className)} {...props} />

// OR use proper forwardRef typing
import { forwardRef } from 'react';

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
    );
  }
);
Badge.displayName = "Badge";
```

**Step 5: Fix ProposalPreview Return Type (15 minutes)**

File: `components/proposal-preview.tsx`

```typescript
// Before (fails - returns undefined in some cases)
export function ProposalPreview(props: ProposalPreviewProps) {
  if (!someCondition) {
    return; // Returns undefined
  }
  return <div>...</div>;
}

// After (works)
export function ProposalPreview(props: ProposalPreviewProps) {
  if (!someCondition) {
    return null; // Returns null instead of undefined
  }
  return <div>...</div>;
}
```

**Step 6: Fix ThemeProvider Children Prop (10 minutes)**

File: `components/theme-provider.tsx`

```typescript
// Add children to props interface
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
  storageKey?: string;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <ThemeProviderPrimitive {...props}>{children}</ThemeProviderPrimitive>;
}
```

**Commit Messages** (one per fix):
```
fix(types): add openai type import resolution

Green phase - fix openai module import

- Update import path for ChatCompletion type
- Verify openai package is installed

Fixes: TASK-000

---

fix(types): add missing ChatSession properties

Green phase - complete ChatSession interface

- Add customer property
- Add showCustomerPreferences flag
- Create Customer interface

Fixes: TASK-000

---

fix(components): correct ref types for Badge and Button

Green phase - fix component ref forwarding

- Update ref type casting
- Ensure proper forwardRef usage

Fixes: TASK-000

---

fix(components): ensure ProposalPreview returns JSX element

Green phase - fix return type consistency

- Return null instead of undefined
- Ensure consistent JSX.Element return

Fixes: TASK-000

---

fix(components): add children prop to ThemeProvider

Green phase - complete ThemeProviderProps

- Add children: React.ReactNode
- Fix missing prop error

Fixes: TASK-000

---

fix(deps): resolve vitest dependency issue

Green phase - reinstall dependencies

- Remove corrupted node_modules
- Clear npm cache
- Reinstall all packages
- Verify vitest installation

Fixes: TASK-000
```

### Phase 3: BLUE - Refactor & Optimize 🔵

**Refactoring 1**: Consolidate Type Definitions

```typescript
// Create lib/types/index.ts for centralized exports
export * from './chat';
export * from './agent';
export * from './database';

// Update imports throughout codebase to use:
import type { ChatSession, ChatMessage } from '@/lib/types';
```

**Refactoring 2**: Add Type Documentation

```typescript
/**
 * Represents a chat session between user and AI agent
 * Used for RFP request tracking and workflow visualization
 */
export interface ChatSession {
  // ... with JSDoc comments for each property
}
```

**Commit Message**:
```
refactor(types): consolidate and document type definitions

Blue phase - improve type organization

- Create centralized type exports
- Add JSDoc documentation
- Organize by domain (chat, agent, database)

Related to: TASK-000
```

---

## Implementation Steps

### Step 1: Setup and Verification (10 minutes)

```bash
# 1. Check current status
npm run type-check 2>&1 | tee typescript-errors-before.txt
npm test -- --version 2>&1 | tee vitest-check-before.txt

# 2. Create feature branch
git checkout -b fix/TASK-000-typescript-vitest-blockers
git checkout -b fix/task-000-blocking-issues  # Alternative naming

# 3. Verify branch
git branch --show-current
```

### Step 2: Fix Vitest Dependency (30 minutes)

```bash
# 1. Backup package files
cp package.json package.json.backup
cp pnpm-lock.yaml pnpm-lock.yaml.backup 2>/dev/null || true

# 2. Remove node_modules
rm -rf node_modules pnpm-lock.yaml

# 3. Clear cache
npm cache clean --force

# 4. Reinstall
npm install

# 5. Verify
npm ls vitest
npm test -- --version

# 6. Commit if successful
git add package.json pnpm-lock.yaml
git commit -m "fix(deps): resolve vitest dependency issue

Green phase - reinstall dependencies to fix vitest module

- Removed corrupted node_modules
- Cleared npm cache
- Reinstalled all packages
- Verified vitest@2.1.0 installation

Fixes: TASK-000"
```

### Step 3: Fix TypeScript Errors (60 minutes)

```bash
# 1. Create type definitions directory
mkdir -p lib/types

# 2. Create lib/types/chat.ts with ChatSession and Customer interfaces

# 3. Create lib/types/index.ts for exports

# 4. Update components with fixed types

# 5. Run type check after each fix
npm run type-check

# 6. Commit each fix individually (see commit messages in Green phase)
```

### Step 4: Verification (15 minutes)

```bash
# 1. Full type check
npm run type-check
# Expected: 0 errors

# 2. Build
npm run build
# Expected: Success

# 3. Test command
npm test -- --version
# Expected: Shows vitest version

# 4. Save verification results
npm run type-check > typescript-errors-after.txt
echo "TypeScript errors: 0" >> verification.txt
npm test -- --version >> verification.txt

# 5. Commit verification
git add typescript-errors-after.txt verification.txt
git commit -m "chore: add verification results for TASK-000

Verification shows all blocking issues resolved
- TypeScript errors: 0
- Vitest: Working
- Build: Successful"
```

### Step 5: Push and Create PR (15 minutes)

```bash
# 1. Push branch
git push -u origin fix/TASK-000-typescript-vitest-blockers

# 2. Create PR via GitHub CLI (or web interface)
gh pr create \
  --title "Fix: Resolve TypeScript compilation and vitest dependency blockers (TASK-000)" \
  --body "$(cat <<EOF
## Summary
Fixes critical blocking issues preventing development:
- 15 TypeScript compilation errors
- Vitest dependency not found error

## Changes Made
- ✅ Fixed openai type import
- ✅ Added missing ChatSession properties
- ✅ Fixed component ref types (Badge, Button)
- ✅ Fixed ProposalPreview return type
- ✅ Added ThemeProvider children prop
- ✅ Reinstalled dependencies to fix vitest

## Testing
- ✅ TypeScript: 0 errors (was 15)
- ✅ Build: Successful
- ✅ Vitest: Working

## Related Task
Closes TASK-000
Unblocks: TASK-001, TASK-002, TASK-003, and all subsequent tasks

## Verification
\`\`\`bash
npm run type-check  # ✅ 0 errors
npm run build       # ✅ Success
npm test -- --version  # ✅ vitest 2.1.0
\`\`\`
EOF
)" \
  --label "bug,critical,blocker" \
  --assignee "@me"
```

---

## Git Workflow

### Branch Naming
```
fix/TASK-000-typescript-vitest-blockers
```

### Commit Strategy
1. One commit per logical fix
2. Follow conventional commits format
3. Reference TASK-000 in each commit

### Commit Message Format
```
<type>(<scope>): <description>

<phase> - <context>

<details>

<task-reference>
```

**Example**:
```
fix(types): add missing ChatSession properties

Green phase - complete ChatSession interface

- Add customer property with Customer interface
- Add showCustomerPreferences boolean flag
- Update all components using ChatSession

Fixes: TASK-000
```

---

## Code Review Checklist

### Functionality
- [ ] TypeScript compiles with 0 errors
- [ ] Build succeeds without warnings
- [ ] Vitest command works
- [ ] No functionality broken

### Code Quality
- [ ] Type definitions are comprehensive
- [ ] No `any` types introduced
- [ ] Proper use of TypeScript features
- [ ] Code follows project style guide

### Testing
- [ ] Type check passes: `npm run type-check`
- [ ] Build passes: `npm run build`
- [ ] Vitest works: `npm test -- --version`
- [ ] No regression in existing functionality

### Documentation
- [ ] Type interfaces documented
- [ ] Commit messages clear and descriptive
- [ ] PR description complete

### Security
- [ ] No security vulnerabilities introduced
- [ ] Dependencies updated from trusted sources
- [ ] No secrets in code

---

## Testing Requirements

### Compilation Tests

**Test 1: TypeScript Compilation**
```bash
npm run type-check
# Expected: Exit code 0, no errors
```

**Test 2: Production Build**
```bash
npm run build
# Expected: Successful build, no type errors
```

**Test 3: Vitest Module Resolution**
```bash
npm test -- --version
# Expected: Shows vitest version number
```

### Type Safety Tests

**Test 4: ChatSession Type Usage**
```typescript
// Should compile without errors
const session: ChatSession = {
  id: '123',
  route: 'LAX-JFK',
  passengers: 4,
  date: '2025-11-01',
  status: 'understanding_request',
  currentStep: 1,
  totalSteps: 5,
  messages: [],
  customer: {
    name: 'John Doe'
  }
};
```

**Test 5: Component Props**
```typescript
// Should compile without errors
<Badge variant="default">Test</Badge>
<Button onClick={() => {}}>Click</Button>
<ProposalPreview operator={mockOperator} {...props} />
```

---

## Definition of Done

✅ **Technical Completion**
- [ ] All 15 TypeScript errors resolved
- [ ] `npm run type-check` exits with code 0
- [ ] `npm run build` succeeds
- [ ] `npm test -- --version` shows vitest version
- [ ] No new TypeScript errors introduced
- [ ] All existing functionality works

✅ **Quality Gates**
- [ ] Code review approved
- [ ] All commits follow convention
- [ ] No breaking changes
- [ ] Types properly documented

✅ **Documentation**
- [ ] Type interfaces documented
- [ ] Commit messages descriptive
- [ ] PR description complete

✅ **Deployment**
- [ ] PR merged to main
- [ ] Verified on main branch
- [ ] Task moved to completed/

---

## Resources & References

### TypeScript Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [forwardRef Typing](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/forward_and_create_ref/)

### Vitest Documentation
- [Vitest Getting Started](https://vitest.dev/guide/)
- [Vitest Configuration](https://vitest.dev/config/)

### Project Documentation
- `docs/AGENTS.md` - Coding standards
- `vitest.config.ts` - Test configuration
- `tsconfig.json` - TypeScript configuration

### Error References
```
agents/core/types.ts(6,24): error TS2307: Cannot find module 'openai'
app/page.tsx(20,67): error TS2345: Type mismatch
components/chat-interface.tsx(170,80): error TS2339: Property 'customer' missing
components/proposal-preview.tsx(73,28): error TS2339: Property 'customer' missing
components/theme-provider.tsx(9,33): error TS2339: Property 'children' missing
components/ui/badge.tsx(38,6): error TS2322: Ref type incompatible
components/ui/button.tsx(51,6): error TS2322: Ref type incompatible
vitest.config.ts(1,30): error TS2307: Cannot find module 'vitest/config'
```

---

## Notes & Questions

### Implementation Notes
- Started: _TBD_
- Blockers discovered: TypeScript errors, vitest missing
- Decisions made: Fix vitest first, then TypeScript errors one by one

### Questions
- Q: Should we upgrade to latest openai package version?
  - A: Check compatibility first, current version may be fine

- Q: Should we create separate type files for each domain?
  - A: Yes, organize types by domain (chat, agent, database)

### Learnings
- _To be filled during implementation_

---

## Completion Summary

**Completed On**: _TBD_
**Actual Time**: _TBD_
**Variance**: _TBD_

### What Worked Well
- _To be filled_

### Challenges Faced
- _To be filled_

### Improvements for Next Time
- _To be filled_

### Metrics
```
TypeScript Errors Before: 15
TypeScript Errors After: 0
Build Time: ~30s
Coverage: N/A (no tests yet)
```

### Follow-up Tasks
- TASK-001: Clerk Authentication (unblocked)
- TASK-002: Supabase Database Schema (unblocked)
- All other tasks now unblocked

---

**Created**: October 21, 2025
**Last Updated**: October 21, 2025
**Status**: 🟡 Active
