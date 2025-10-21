# Reviewer Checklist

**Project**: JetVision AI Assistant
**Purpose**: Step-by-step guide for conducting thorough code reviews

---

## Pre-Review Checklist

Before you start reviewing, verify:

- [ ] CI/CD checks are passing (or author has explained failures)
- [ ] PR description is complete and clear
- [ ] Linear issue is linked
- [ ] PR is not too large (< 400 lines preferred; if larger, consider requesting split)
- [ ] You have allocated sufficient time (see time estimates below)

**Time Estimates**:
- Small PR (<100 lines): 15-30 minutes
- Medium PR (100-400 lines): 30-60 minutes
- Large PR (400+ lines): 1-2 hours

---

## Step 1: Understand the Context

**Read the PR Description**:
- [ ] What is being changed?
- [ ] Why is it being changed?
- [ ] How does it work?

**Review the Linear Issue**:
- [ ] What are the acceptance criteria?
- [ ] What is the priority?
- [ ] What SubAgent created this?
- [ ] Are there any related issues?

**Check Related Documentation**:
- [ ] Are there architecture docs referenced?
- [ ] Are there design specs?
- [ ] Are there API docs updated?

---

## Step 2: Quality Gates Verification

Verify that all quality gates pass (these should be automated, but double-check):

### TypeScript Strict Mode
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No `any` types used (unless justified)
- [ ] Explicit return types for public functions
- [ ] Proper type definitions for all parameters

### Test Coverage
- [ ] Lines ≥75%
- [ ] Functions ≥75%
- [ ] Branches ≥70%
- [ ] Statements ≥75%
- [ ] Coverage report attached to PR

### Linting
- [ ] No ESLint errors (`npm run lint`)
- [ ] Warnings justified (if any)
- [ ] Code style follows `docs/AGENTS.md`

### Build
- [ ] Production build succeeds (`npm run build`)
- [ ] No build warnings (unless justified)

### Security
- [ ] No hardcoded secrets or API keys
- [ ] No `console.log` or `debugger` statements
- [ ] All sensitive values in environment variables

---

## Step 3: Code Quality Review

### Functionality (15 minutes)

**Does the code work correctly?**
- [ ] Meets all acceptance criteria from Linear issue
- [ ] No obvious bugs or logic errors
- [ ] Edge cases handled properly
- [ ] Error handling is comprehensive

**Test manually**:
```bash
git checkout <branch-name>
npm install
npm run dev
# Test the feature manually
```

- [ ] Feature works as described
- [ ] Error states handled gracefully
- [ ] Loading states implemented (if async)
- [ ] UI is responsive (if UI changes)

### Code Style & Clarity (10 minutes)

**Readability**:
- [ ] Code is self-documenting
- [ ] Variable and function names are descriptive
- [ ] Complex logic has explanatory comments
- [ ] No unnecessarily clever code

**Structure**:
- [ ] Functions are focused (single responsibility)
- [ ] Functions are reasonably sized (< 50 lines preferred)
- [ ] No deep nesting (< 3 levels)
- [ ] No code duplication

**TypeScript Best Practices**:
- [ ] Proper use of types and interfaces
- [ ] No type assertions (`as`) without justification
- [ ] Enums used for constants (when appropriate)
- [ ] Generic types used correctly

**Example Red Flags**:
```typescript
// ❌ Unclear naming
function process(d: any) {
  const x = d.map(i => i.v);
  return x;
}

// ❌ Too nested
if (user) {
  if (user.profile) {
    if (user.profile.settings) {
      if (user.profile.settings.theme === 'dark') {
        // do something
      }
    }
  }
}

// ❌ Magic numbers
const score = price * 0.4 + time * 0.3 + comfort * 0.3;
```

### Architecture & Design Patterns (15 minutes)

**File Organization**:
- [ ] Files in correct directories (`agents/`, `lib/`, `components/`, etc.)
- [ ] Proper use of path aliases (`@agents`, `@lib`, `@components`)
- [ ] Related files grouped logically
- [ ] No deeply nested directories without reason

**Pattern Compliance**:
- [ ] Uses established patterns (Singleton, Factory, Observer, etc.)
- [ ] Extends `BaseAgent` for agent implementations
- [ ] Uses `AgentFactory` for creating agents
- [ ] Uses `MessageBus` for A2A communication
- [ ] Uses `HandoffManager` for task delegation

**Separation of Concerns**:
- [ ] Business logic separated from UI
- [ ] Database queries in `lib/` not in components
- [ ] API routes follow REST conventions
- [ ] No tight coupling between modules

**Example Red Flags**:
```typescript
// ❌ Business logic in component
export default function Dashboard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    supabase.from('requests').select('*').then(setData);
  }, []);

  // ... component logic
}

// ❌ Relative imports instead of aliases
import { BaseAgent } from '../../agents/core/base-agent';
// Should be:
import { BaseAgent } from '@agents/core';
```

### Testing (15 minutes)

**Test Quality**:
- [ ] Tests are meaningful (not just for coverage)
- [ ] Tests verify behavior, not implementation
- [ ] Edge cases are tested
- [ ] Error cases are tested
- [ ] Tests are well-organized and named

**TDD Compliance** (if applicable):
- [ ] Tests written before implementation (author confirmed in PR)
- [ ] Tests follow Red-Green-Refactor cycle
- [ ] Tests guide the implementation

**Test Coverage**:
- [ ] All new functions have tests
- [ ] All new classes have tests
- [ ] All branches are covered
- [ ] Critical paths have integration tests

**Mocking**:
- [ ] External services properly mocked (OpenAI, Redis, MCP)
- [ ] Mocks are realistic and maintainable
- [ ] No flaky tests (run tests multiple times to verify)

**Example Red Flags**:
```typescript
// ❌ Weak test
it('should work', async () => {
  const result = await agent.execute(context);
  expect(result).toBeDefined();
});

// ❌ Testing implementation details
it('should call fetchData', async () => {
  await component.handleClick();
  expect(fetchData).toHaveBeenCalled(); // Implementation detail
});
```

**What to Look For in Tests**:
```typescript
// ✅ Strong test
it('should transition workflow to ANALYZING state and publish TASK_CREATED', async () => {
  const result = await orchestrator.execute(context);

  expect(result.success).toBe(true);
  expect(workflowManager.getWorkflow(context.requestId).getState())
    .toBe(WorkflowState.ANALYZING);
  expect(messageBus.publish).toHaveBeenCalledWith(
    expect.objectContaining({
      type: MessageType.TASK_CREATED,
      sourceAgent: orchestrator.id,
    })
  );
});
```

### Security (10 minutes)

**Authentication & Authorization**:
- [ ] Protected routes use Clerk middleware
- [ ] API endpoints verify authentication
- [ ] User permissions checked before actions
- [ ] Supabase RLS policies in place

**Input Validation**:
- [ ] All user inputs validated (Zod schemas)
- [ ] File uploads validated (type, size)
- [ ] URL parameters sanitized
- [ ] Query parameters validated

**Data Protection**:
- [ ] No sensitive data in logs
- [ ] Passwords hashed (never plaintext)
- [ ] API keys in environment variables
- [ ] Database queries parameterized (no SQL injection)
- [ ] XSS protection (proper escaping)

**Example Red Flags**:
```typescript
// ❌ SQL injection vulnerability
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ❌ No input validation
async function createUser(data: any) {
  await supabase.from('users').insert(data);
}

// ❌ Hardcoded secret
const apiKey = 'sk-1234567890abcdef';
```

### Performance (10 minutes)

**Database Queries**:
- [ ] No N+1 query problems
- [ ] Queries use indexes (when appropriate)
- [ ] Batch operations used for multiple items
- [ ] Pagination implemented for large datasets

**React Performance** (if applicable):
- [ ] No unnecessary re-renders
- [ ] `useMemo` and `useCallback` used appropriately
- [ ] No expensive calculations in render
- [ ] Proper dependency arrays in `useEffect`

**Async Operations**:
- [ ] Proper use of `async/await`
- [ ] Promises properly handled
- [ ] No blocking operations on main thread
- [ ] Loading states implemented

**Bundle Size**:
- [ ] No unnecessary large dependencies
- [ ] Tree-shaking considered
- [ ] Dynamic imports used for large components

**Example Red Flags**:
```typescript
// ❌ N+1 query problem
const users = await fetchUsers();
for (const user of users) {
  const profile = await fetchProfile(user.id); // N+1!
}

// ❌ Expensive calculation in render
function Component({ data }) {
  const result = expensiveCalculation(data); // Recalculates every render
  return <div>{result}</div>;
}
```

### Documentation (5 minutes)

**Code Comments**:
- [ ] Complex logic has explanatory comments
- [ ] Public functions have JSDoc comments
- [ ] TODOs linked to Linear issues
- [ ] No commented-out code (unless with explanation)

**Documentation Updates**:
- [ ] README updated (if new feature)
- [ ] API documentation updated (if new endpoints)
- [ ] Architecture docs updated (if design changes)
- [ ] Migration guide provided (if breaking changes)

**Example Red Flags**:
```typescript
// ❌ Undocumented complex function
function calculateScore(p: Proposal): number {
  return (p.price * 0.4 + p.time * 0.3 + p.comfort * 0.3) / 100;
}

// ❌ TODO without Linear issue
// TODO: Fix this later
```

**What to Look For**:
```typescript
// ✅ Well-documented
/**
 * Calculates a normalized score for a flight proposal.
 *
 * @param proposal - The flight proposal to score
 * @returns A score between 0-1, where higher is better
 *
 * Scoring weights:
 * - Price: 40% (lower is better)
 * - Flight time: 30% (shorter is better)
 * - Comfort rating: 30% (higher is better)
 *
 * @see https://linear.app/designthru-ai/issue/DES-50 for scoring algorithm rationale
 */
function calculateProposalScore(proposal: Proposal): number {
  // ... implementation
}
```

---

## Step 4: Leave Feedback

### Feedback Guidelines

**Prioritize Issues**:

Use severity labels:
- `[CRITICAL]`: Security, data loss, blocking bugs - **Must fix**
- `[MAJOR]`: Architecture, performance, missing tests - **Should fix**
- `[MINOR]`: Style, naming, optional refactoring - **Nice to have**
- `[NIT]`: Tiny style issues - **Optional**
- `[QUESTION]`: Seeking clarification - **Discussion needed**
- `[PRAISE]`: Good work! - **Keep doing this**

**Be Specific and Actionable**:
```markdown
❌ Vague: "This could be better."

✅ Specific: "Consider using Array.reduce here instead of forEach + push.
It's more functional and avoids mutation. Example:
data.reduce((acc, item) => [...acc, transform(item)], [])"
```

**Explain Your Reasoning**:
```markdown
❌ No explanation: "Change this to use a Set."

✅ Explained: "Consider using a Set instead of Array for uniqueIds.
Set has O(1) lookup vs Array's O(n), which matters when checking
duplicates in large datasets."
```

**Suggest, Don't Demand**:
```markdown
❌ Demanding: "Change this immediately."

✅ Suggesting: "What do you think about using a Map here? It might
be more efficient for lookups. Happy to discuss if you prefer the
current approach."
```

**Use Code Suggestions**:

GitHub supports suggested changes that authors can apply with one click:

````markdown
```suggestion
const clientNames = clients.map(client => client.name);
```
````

### Example Review Comments

**Critical Issue**:
```markdown
[CRITICAL] This endpoint is missing authentication. Any user can delete
any request by guessing the ID.

Add Clerk middleware to verify the user is authenticated:

```typescript
import { requireAuth } from '@/lib/auth';

export const DELETE = requireAuth(async (req, { params }) => {
  // Verify user owns this request
  const request = await getRequest(params.id);
  if (request.userId !== req.auth.userId) {
    return new Response('Forbidden', { status: 403 });
  }
  // ... delete logic
});
```
```

**Major Issue**:
```markdown
[MAJOR] This creates an N+1 query problem when fetching profiles for
multiple users. Currently making N queries (one per user).

Consider using a JOIN or batch query:

```typescript
// Instead of:
for (const user of users) {
  const profile = await fetchProfile(user.id);
}

// Do:
const userIds = users.map(u => u.id);
const profiles = await supabase
  .from('profiles')
  .select('*')
  .in('user_id', userIds);
```
```

**Minor Issue**:
```markdown
[MINOR] Consider renaming `data` to `clientProfiles` for clarity.
"data" is too generic and doesn't convey what it contains.
```

**Nit**:
```markdown
[NIT] Extra blank line here (line 42). Feel free to ignore if you
prefer the spacing for readability.
```

**Question**:
```markdown
[QUESTION] Why did you choose Redis over in-memory cache for this?
Just curious about the reasoning - the current approach works fine.
```

**Praise**:
```markdown
[PRAISE] Excellent test coverage! I especially like how you tested
the edge case where the user's profile is incomplete. Great job!
```

---

## Step 5: Make a Decision

Choose one of three actions:

### 1. Approve ✅

**When to Approve**:
- All quality gates pass
- No critical or major issues
- Code meets standards
- Tests are comprehensive
- Documentation is adequate

**How to Approve**:
1. Click "Review changes"
2. Select "Approve"
3. Add summary comment explaining approval
4. Merge PR (if you have permission)
5. Update Linear issue to "Done"

**Example Approval Comment**:
```markdown
✅ Approved!

Great work on this implementation. I especially appreciate:
- Comprehensive test coverage (87%)
- Clean separation of concerns
- Excellent error handling
- Clear documentation

One minor suggestion: Consider extracting the validation logic into
a separate function for reusability, but this is not blocking.

Merging now. Excellent job!
```

### 2. Request Changes 🔄

**When to Request Changes**:
- Critical issues (security, data loss)
- Major issues (architecture, performance)
- Quality gates failing
- Missing tests or documentation

**How to Request Changes**:
1. Click "Review changes"
2. Select "Request changes"
3. Add summary comment
4. Update Linear issue to "In Progress"
5. Reassign to author

**Example Request Changes Comment**:
```markdown
🔄 Changes Requested

Thanks for the PR! The overall approach looks good, but there are a
few issues to address before merging:

**Critical**:
- Missing authentication on DELETE endpoint (see comment on line 45)

**Major**:
- N+1 query problem in user fetching (see comment on line 78)
- Missing tests for error cases (see comment on line 120)

**Minor**:
- Consider renaming `data` variables for clarity

Please address the critical and major issues, and we can merge.
The minor issues are nice-to-have but not blocking.

Let me know if you have questions about any of the feedback!
```

### 3. Comment Only 💬

**When to Comment Only**:
- Minor issues that aren't blocking
- Questions for discussion
- Suggestions for future improvements
- Praise for good work

**How to Comment**:
1. Leave inline comments
2. Click "Review changes"
3. Select "Comment"
4. Add summary comment

**Example Comment-Only Comment**:
```markdown
💬 Comments and Suggestions

Nice work! Everything looks good to merge. I have a few optional
suggestions for future improvements:

1. We could extract the scoring logic into a separate service
   (created Linear issue DES-XXX to track)
2. Consider adding pagination in a future PR (not urgent)
3. The test coverage is excellent - well done!

Feel free to merge when ready. Great job!
```

---

## Step 6: Post-Review Actions

### If You Approved

- [ ] Merge PR (if you have permission)
- [ ] Delete branch (usually automatic)
- [ ] Update Linear issue to "Done"
- [ ] Add comment to Linear with PR link
- [ ] Notify stakeholders (if needed)

**Linear Update Example**:
```typescript
await mcp__linear__update_issue({
  id: 'DES-XXX',
  state: 'Done',
});

await mcp__linear__create_comment({
  issueId: 'DES-XXX',
  body: 'PR reviewed and merged: [PR link]\n\nExcellent work! All quality gates passed.',
});
```

### If You Requested Changes

- [ ] Update Linear issue to "In Progress"
- [ ] Reassign to author (Coder SubAgent)
- [ ] Add comment to Linear explaining changes needed
- [ ] Set yourself as reviewer for re-review

**Linear Update Example**:
```typescript
await mcp__linear__update_issue({
  id: 'DES-XXX',
  state: 'In Progress',
  assignee: 'coder-email@example.com',
});

await mcp__linear__create_comment({
  issueId: 'DES-XXX',
  body: 'PR reviewed, changes requested: [PR link]\n\nPlease address:\n- [Critical issue 1]\n- [Major issue 2]\n\nPing me when ready for re-review.',
});
```

### If You Only Commented

- [ ] No Linear status change needed
- [ ] Author can merge when ready
- [ ] Optionally add comment to Linear

---

## Common File Type Review Checklist

### Reviewing Agent Implementations

**Agent Files** (`agents/implementations/*.ts`):
- [ ] Extends `BaseAgent` correctly
- [ ] Implements `execute()` method
- [ ] Registers tools properly
- [ ] Uses `MessageBus` for communication
- [ ] Uses `HandoffManager` for delegation
- [ ] Handles errors gracefully
- [ ] Updates workflow state
- [ ] Has comprehensive tests

### Reviewing React Components

**Component Files** (`components/*.tsx`):
- [ ] Uses TypeScript with proper props interface
- [ ] Server component by default (unless needs client state)
- [ ] No business logic (delegated to hooks/lib)
- [ ] Proper use of hooks (only in client components)
- [ ] Accessibility attributes (aria-*, role)
- [ ] Responsive design (mobile-first)
- [ ] Loading and error states
- [ ] Proper key props in lists

### Reviewing API Routes

**API Route Files** (`app/api/*.ts`):
- [ ] Input validation (Zod schemas)
- [ ] Authentication checks
- [ ] Error handling (try/catch)
- [ ] Proper HTTP status codes
- [ ] Rate limiting (if needed)
- [ ] CORS headers (if needed)
- [ ] No business logic (delegated to lib)
- [ ] OpenAPI documentation (if applicable)

### Reviewing Database Queries

**Query Files** (`lib/*/queries.ts`):
- [ ] Parameterized queries (no SQL injection)
- [ ] Proper error handling
- [ ] Type-safe (TypeScript types match schema)
- [ ] Optimized (no N+1 queries)
- [ ] Uses indexes (for complex queries)
- [ ] Pagination (for large datasets)
- [ ] Transaction support (if needed)

### Reviewing Tests

**Test Files** (`__tests__/**/*.test.ts`):
- [ ] Descriptive test names
- [ ] Arrange-Act-Assert pattern
- [ ] Tests behavior, not implementation
- [ ] Mocks external dependencies
- [ ] Tests edge cases
- [ ] Tests error cases
- [ ] No flaky tests
- [ ] Fast execution (< 100ms per test preferred)

---

## Reviewer Anti-Patterns to Avoid

### 1. Rubber Stamping
**Don't**: Approve without thorough review
**Do**: Allocate sufficient time and review carefully

### 2. Nitpicking
**Don't**: Block PR for minor style issues
**Do**: Focus on substance over style; let linter handle style

### 3. Delayed Reviews
**Don't**: Let PR sit for days
**Do**: Respond within 24 hours (even if just to say you need more time)

### 4. Hostile Comments
**Don't**: "This is terrible code."
**Do**: "I have concerns about this approach. Could we discuss alternatives?"

### 5. Feature Creep
**Don't**: Request out-of-scope additions
**Do**: Suggest future enhancements in separate Linear issues

### 6. Bikeshedding
**Don't**: Debate minor naming for 20 comments
**Do**: Accept "good enough" for minor decisions; time-box discussions

### 7. Silent Approval
**Don't**: Approve without any comments
**Do**: Leave at least one comment (even if just praise)

---

## Quick Reference

### Quality Gate Commands
```bash
npm run lint              # ESLint
npm run type-check        # TypeScript
npm run test              # All tests
npm run test:coverage     # Coverage report
npm run build             # Production build
```

### Severity Labels
```
[CRITICAL] - Must fix (security, data loss, blocking bugs)
[MAJOR] - Should fix (architecture, performance, missing tests)
[MINOR] - Nice to have (style, naming, optional refactoring)
[NIT] - Optional (tiny style issues)
[QUESTION] - Discussion needed
[PRAISE] - Good work!
```

### Linear Issue States
```
To Do → In Progress → In Review → Done
```

### Review Timeline
```
PR Created → 24h → Initial Review → 48h → Re-review → Merge
```

### Coverage Thresholds
```
Lines: 75%
Functions: 75%
Branches: 70%
Statements: 75%
```

---

## Additional Resources

- **Code Review Guidelines**: `docs/CODE_REVIEW_GUIDELINES.md`
- **Coding Standards**: `docs/AGENTS.md`
- **PR Template**: `.github/PULL_REQUEST_TEMPLATE.md`
- **Architecture Docs**: `docs/architecture/MULTI_AGENT_SYSTEM.md`
- **Testing Guide**: `docs/TESTING.md`

---

**Questions?** Reach out in #code-review channel or ping @reviewer-lead
