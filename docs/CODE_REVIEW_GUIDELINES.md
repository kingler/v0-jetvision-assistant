# Code Review Guidelines

**Project**: JetVision AI Assistant
**Version**: 1.0.0
**Last Updated**: October 21, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Code Review Philosophy](#code-review-philosophy)
3. [Quality Gates (Must Pass)](#quality-gates-must-pass)
4. [Review Focus Areas](#review-focus-areas)
5. [Review Process](#review-process)
6. [Linear Workflow Integration](#linear-workflow-integration)
7. [Approval Criteria](#approval-criteria)
8. [Common Anti-Patterns](#common-anti-patterns)
9. [Review Best Practices](#review-best-practices)
10. [Reviewer Assignment](#reviewer-assignment)

---

## Overview

Code reviews are a critical part of our development process for the JetVision AI Assistant project. They ensure code quality, share knowledge across the team, and maintain consistency across all 37 project tasks.

### Goals of Code Review

- **Quality Assurance**: Catch bugs, security issues, and performance problems early
- **Knowledge Sharing**: Distribute understanding of the codebase across the team
- **Consistency**: Maintain architectural and style consistency
- **Mentorship**: Help team members grow through constructive feedback
- **Documentation**: Ensure code is well-documented and maintainable

### Review Timeline

- **Target Response Time**: Within 24 hours of PR creation
- **Target Review Completion**: Within 48 hours of PR creation
- **Author Response Time**: Within 24 hours of feedback

---

## Code Review Philosophy

### The Four C's of Code Review

1. **Constructive**: Focus on improving the code, not criticizing the author
2. **Collaborative**: Work together to find the best solution
3. **Clear**: Provide specific, actionable feedback
4. **Consistent**: Apply standards uniformly across all reviews

### Reviewer Mindset

- **Assume Positive Intent**: The author did their best work
- **Ask Questions**: "Why did you choose this approach?" instead of "This is wrong"
- **Suggest, Don't Demand**: "Consider using X instead" vs "Change this to X"
- **Praise Good Work**: Call out clever solutions and clean code
- **Focus on Impact**: Prioritize issues by severity (critical > major > minor)

### Author Mindset

- **Be Open**: Welcome feedback as a learning opportunity
- **Don't Take It Personally**: Feedback is about the code, not you
- **Explain Your Reasoning**: Help reviewers understand your decisions
- **Ask for Clarification**: If feedback is unclear, ask questions
- **Iterate Quickly**: Address feedback promptly to keep momentum

---

## Quality Gates (Must Pass)

All PRs must pass these automated quality gates before requesting review:

### 1. TypeScript Strict Mode

```bash
npm run type-check
```

**Requirements**:
- Zero TypeScript errors
- No use of `any` type (use proper types or `unknown`)
- Explicit return types for all public functions
- Proper type definitions for all parameters

**Example**:
```typescript
// ❌ Bad - Uses 'any'
function processData(data: any): any {
  return data.value;
}

// ✅ Good - Proper types
function processData(data: AgentContext): AgentResult {
  return {
    success: true,
    data: data.requestId,
  };
}
```

### 2. Test Coverage

```bash
npm run test:coverage
```

**Requirements** (from `vitest.config.ts`):
- Lines: ≥75%
- Functions: ≥75%
- Branches: ≥70%
- Statements: ≥75%

**Coverage by Module**:
- Agents: ≥85%
- API Routes: ≥80%
- UI Components: ≥70%
- Utilities: ≥75%

### 3. Linting

```bash
npm run lint
```

**Requirements**:
- Zero ESLint errors
- Warnings acceptable with justification in PR description
- Tailwind CSS class ordering followed
- No disabled ESLint rules without explanation

### 4. Build Success

```bash
npm run build
```

**Requirements**:
- Production build completes successfully
- No build warnings (unless justified)
- Bundle size within acceptable limits
- No missing dependencies

### 5. Security Checks

**Requirements**:
- No hardcoded secrets or API keys
- All sensitive values in `.env.local`
- No `console.log` or `debugger` statements
- Input validation present for all user inputs
- Authentication/authorization checks in place

### 6. Code Style

**Requirements** (see `docs/AGENTS.md`):
- 2-space indentation (enforced)
- Single quotes for strings
- Semicolons required
- Trailing commas in multi-line objects/arrays
- PascalCase for classes, camelCase for functions
- UPPER_SNAKE_CASE for constants

---

## Review Focus Areas

### 1. Code Quality

#### What to Look For

- **Clarity**: Is the code self-documenting and easy to understand?
- **Simplicity**: Is this the simplest solution that could work?
- **DRY Principle**: Is there unnecessary code duplication?
- **Single Responsibility**: Does each function/class do one thing well?
- **Naming**: Are names descriptive and follow conventions?

#### Red Flags

- Functions longer than 50 lines (consider breaking up)
- Nested conditionals more than 3 levels deep
- Copy-pasted code blocks
- Magic numbers without explanation
- Unclear variable names (e.g., `data`, `temp`, `x`)

#### Example Review Comments

```typescript
// ❌ Unclear naming
function process(d: any) {
  const x = d.map(i => i.v);
  return x;
}

// ✅ Clear naming
function extractClientNames(clients: Client[]): string[] {
  return clients.map(client => client.name);
}
```

**Good Review Comment**:
> "Consider renaming `process` to `extractClientNames` to make the function's purpose clearer. Also, let's add proper TypeScript types instead of `any`."

### 2. Architecture

#### What to Look For

- **Follows Established Patterns**: Uses BaseAgent, Factory, Singleton patterns correctly
- **Proper File Structure**: Files in correct directories (`agents/`, `lib/`, etc.)
- **Path Aliases**: Uses `@agents`, `@lib`, `@components` (not relative paths)
- **Separation of Concerns**: Business logic separated from UI
- **Agent Coordination**: Proper use of MessageBus, HandoffManager, TaskQueue

#### Red Flags

- Direct database calls from UI components
- Business logic in React components
- Relative import paths (`../../lib/utils`)
- New patterns without discussion
- Bypassing established abstractions

#### Example Review Comments

```typescript
// ❌ Business logic in component
export default function Dashboard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Direct database call in component
    supabase.from('requests').select('*').then(setData);
  }, []);
}

// ✅ Business logic in lib
// lib/requests/queries.ts
export async function fetchRequests(): Promise<Request[]> {
  const { data, error } = await supabase.from('requests').select('*');
  if (error) throw error;
  return data;
}

// components/dashboard.tsx
export default function Dashboard() {
  const { data } = useRequests(); // Custom hook
}
```

**Good Review Comment**:
> "Let's move this database query to `lib/requests/queries.ts` and create a `useRequests` hook. This keeps business logic separate from the UI and makes testing easier."

### 3. Testing

#### What to Look For

- **TDD Approach**: Tests written before implementation (when applicable)
- **Test Coverage**: All new code covered by tests
- **Edge Cases**: Tests for error conditions and edge cases
- **Test Quality**: Tests are meaningful, not just for coverage
- **Proper Mocking**: External services (OpenAI, Redis, MCP) properly mocked

#### Red Flags

- Tests that don't actually test anything
- Tests that always pass
- Missing error case tests
- Flaky tests (sometimes pass, sometimes fail)
- Tests that test implementation details, not behavior

#### Example Review Comments

```typescript
// ❌ Weak test
it('should work', async () => {
  const result = await agent.execute(context);
  expect(result).toBeDefined();
});

// ✅ Strong test
it('should create workflow and transition to ANALYZING state', async () => {
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

**Good Review Comment**:
> "This test could be more specific. Let's verify the workflow state changes to ANALYZING and that a TASK_CREATED message is published to the message bus."

### 4. Security

#### What to Look For

- **No Hardcoded Secrets**: API keys, passwords, tokens in environment variables
- **Input Validation**: All user inputs validated (Zod schemas)
- **SQL Injection Protection**: Parameterized queries only
- **XSS Protection**: Proper escaping of user-generated content
- **Authentication**: Routes protected with Clerk middleware
- **Authorization**: RLS policies on Supabase tables
- **Rate Limiting**: API routes protected against abuse

#### Red Flags

- API keys in code or committed `.env` files
- Raw SQL queries with string interpolation
- Unvalidated user input
- Missing authentication checks
- Disabled security features

#### Example Review Comments

```typescript
// ❌ SQL injection vulnerability
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ Parameterized query
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId);
```

**Good Review Comment**:
> "This raw SQL query is vulnerable to SQL injection. Let's use Supabase's query builder which automatically parameterizes queries."

### 5. Performance

#### What to Look For

- **Database Queries**: Optimized, no N+1 queries
- **Async/Await**: Proper use of async patterns
- **React Performance**: No unnecessary re-renders
- **Bundle Size**: No large dependencies without justification
- **Caching**: Appropriate use of caching (Redis, React Query)

#### Red Flags

- N+1 query problems
- Blocking operations on main thread
- Missing loading states
- Unnecessary useEffect dependencies
- Large bundle size increases

#### Example Review Comments

```typescript
// ❌ N+1 query problem
const users = await fetchUsers();
for (const user of users) {
  const profile = await fetchProfile(user.id); // N+1!
}

// ✅ Batch query
const users = await fetchUsers();
const userIds = users.map(u => u.id);
const profiles = await fetchProfilesBatch(userIds);
```

**Good Review Comment**:
> "This creates an N+1 query problem. Let's fetch all profiles in a single query using `fetchProfilesBatch` or a JOIN."

### 6. Documentation

#### What to Look For

- **Code Comments**: Complex logic explained
- **JSDoc Comments**: Public functions documented
- **README Updates**: New features documented
- **Architecture Docs**: Changes to system architecture documented
- **Migration Guides**: Breaking changes explained

#### Red Flags

- Undocumented public APIs
- Complex code without comments
- Outdated documentation
- Missing README updates for new features

#### Example Review Comments

```typescript
// ❌ Undocumented complex function
function calculateScore(p: Proposal): number {
  return (p.price * 0.4 + p.time * 0.3 + p.comfort * 0.3) / 100;
}

// ✅ Documented with JSDoc
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
 */
function calculateProposalScore(proposal: Proposal): number {
  const priceScore = (1 - proposal.price / MAX_PRICE) * 0.4;
  const timeScore = (1 - proposal.flightTime / MAX_TIME) * 0.3;
  const comfortScore = (proposal.comfortRating / 5) * 0.3;

  return priceScore + timeScore + comfortScore;
}
```

**Good Review Comment**:
> "Let's add a JSDoc comment explaining the scoring algorithm, especially the weights. This will help future maintainers understand why these specific percentages are used."

---

## Review Process

### 1. Author Creates PR

**Steps**:
1. Complete all work and self-review
2. Run quality gates locally:
   ```bash
   npm run lint
   npm run type-check
   npm run test:coverage
   npm run build
   ```
3. Update Linear issue to "In Review"
4. Create PR using template (`.github/PULL_REQUEST_TEMPLATE.md`)
5. Fill out all sections of PR template
6. Link Linear issue in description
7. Assign reviewer (based on SubAgent specialization)

**PR Title Format**:
```
[DES-XXX] Brief description of changes
```

**Example**:
```
[DES-73] Fix TypeScript strict mode errors and Vitest configuration
```

### 2. CI Runs Automated Checks

**Automated Checks** (from `.github/workflows/`):
- TypeScript type checking
- ESLint
- Unit tests
- Integration tests
- Build validation
- Security scanning (Sentry)

**If CI Fails**:
- Author fixes issues
- Re-runs CI
- Does NOT request review until CI passes

### 3. Reviewer Assigned

**Assignment Strategy**:

| SubAgent | Reviewer Focus |
|----------|----------------|
| **Coder** | Code quality, architecture, performance |
| **Tester** | Test coverage, edge cases, TDD compliance |
| **Designer** | UI/UX, accessibility, responsive design |
| **Documenter** | Documentation, comments, README updates |
| **Reviewer** | Overall quality, security, standards compliance |

**Multiple Reviewers**:
- Simple changes: 1 reviewer
- Architecture changes: 2 reviewers (Coder + Reviewer)
- Security-critical: 2 reviewers (Coder + Reviewer)
- UI changes: 2 reviewers (Coder + Designer)

### 4. Reviewer Reviews Code

**Review Checklist** (see `.github/REVIEWER_CHECKLIST.md`):
1. Read PR description and linked Linear issue
2. Understand the "why" before reviewing the "how"
3. Check out branch locally and test manually
4. Review code changes using focus areas above
5. Leave comments (see "How to Leave Feedback" below)
6. Make decision: Approve, Request Changes, or Comment

**Time Box**:
- Small PR (<100 lines): 15-30 minutes
- Medium PR (100-400 lines): 30-60 minutes
- Large PR (400+ lines): 1-2 hours (or request split)

### 5. Author Addresses Feedback

**Steps**:
1. Read all feedback carefully
2. Ask clarifying questions if needed
3. Make requested changes
4. Respond to each comment:
   - "Done ✅" for completed changes
   - "Fixed in [commit hash]" with explanation
   - Engage in discussion if you disagree
5. Re-request review
6. Update Linear issue with progress

**Handling Disagreements**:
- Discuss respectfully
- Explain your reasoning
- Be open to compromise
- Escalate to tech lead if needed

### 6. Reviewer Re-Reviews

**Steps**:
1. Check that feedback was addressed
2. Review new changes
3. Verify no new issues introduced
4. Approve if satisfied
5. Update Linear issue to "Done"

### 7. Merge

**Merge Checklist**:
- At least 1 approval
- All conversations resolved
- CI/CD checks passing
- No merge conflicts
- Branch up-to-date with main

**Merge Strategy**:
- **Squash and Merge**: For feature branches (default)
- **Merge Commit**: For release branches
- **Rebase and Merge**: For small fixes (optional)

**Post-Merge**:
- Delete branch (automatic)
- Update Linear issue to "Done"
- Notify stakeholders (if needed)

---

## Linear Workflow Integration

### Coder → Reviewer Handoff

```
┌─────────────────────────────────────────────┐
│ 1. Coder completes work                      │
│    - All acceptance criteria met             │
│    - Tests passing                           │
│    - Self-review completed                   │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 2. Coder updates Linear issue                │
│    - Status: "In Review"                     │
│    - Comment: "PR created: [link]"           │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 3. Coder creates PR                          │
│    - Uses PR template                        │
│    - Links Linear issue                      │
│    - Assigns reviewer                        │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 4. Reviewer gets notified                    │
│    - Via GitHub notification                 │
│    - Via Linear (issue status change)        │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 5. Reviewer reviews within 24 hours          │
│    - Leaves feedback on PR                   │
│    - Updates Linear with comments            │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│ If Approved   │   │ If Changes    │
│               │   │ Needed        │
└───────┬───────┘   └───────┬───────┘
        │                   │
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│ Reviewer:     │   │ Reviewer:     │
│ - Merges PR   │   │ - Updates     │
│ - Updates     │   │   Linear to   │
│   Linear to   │   │   "In         │
│   "Done"      │   │   Progress"   │
└───────────────┘   │ - Reassigns   │
                    │   to Coder    │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Coder:        │
                    │ - Addresses   │
                    │   feedback    │
                    │ - Re-requests │
                    │   review      │
                    └───────────────┘
```

### Linear MCP Tools

Use these Linear MCP tools for workflow management:

```typescript
// Update issue status
await mcp__linear__update_issue({
  id: 'DES-XXX',
  state: 'In Review', // or 'In Progress', 'Done'
});

// Add comment to issue
await mcp__linear__create_comment({
  issueId: 'DES-XXX',
  body: 'PR created: [link to PR]\n\nReady for review.',
});

// Assign reviewer
await mcp__linear__update_issue({
  id: 'DES-XXX',
  assignee: 'reviewer-email@example.com',
});
```

---

## Approval Criteria

### When to Approve

A PR should be approved when:

1. **Functionality**:
   - Meets all acceptance criteria from Linear issue
   - No regressions introduced
   - Edge cases handled

2. **Code Quality**:
   - Follows project standards
   - No major code smells
   - Well-structured and maintainable

3. **Testing**:
   - All quality gates pass
   - Test coverage ≥75%
   - Tests are meaningful and comprehensive

4. **Security**:
   - No security vulnerabilities
   - Proper authentication/authorization
   - Input validation present

5. **Performance**:
   - No obvious performance issues
   - Database queries optimized
   - Bundle size acceptable

6. **Documentation**:
   - Code is well-commented
   - Documentation updated
   - Breaking changes explained

### When to Request Changes

Request changes when:

1. **Critical Issues**:
   - Security vulnerabilities
   - Data loss risks
   - Breaking changes without migration path
   - Quality gates failing

2. **Major Issues**:
   - Significant architectural concerns
   - Missing test coverage
   - Performance problems
   - Unclear or confusing code

3. **Clarification Needed**:
   - Purpose of change unclear
   - Implementation approach questionable
   - Missing context or documentation

### When to Comment Only

Leave comments (without blocking) for:

1. **Minor Issues**:
   - Style inconsistencies (if linter passes)
   - Naming suggestions
   - Optional refactoring opportunities

2. **Questions**:
   - Curiosity about implementation
   - Learning opportunities
   - Alternative approaches to consider

3. **Praise**:
   - Clever solutions
   - Clean code
   - Good tests

---

## Common Anti-Patterns

### Anti-Pattern 1: Rubber Stamping

**What It Is**: Approving a PR without thorough review.

**Why It's Bad**: Bugs, security issues, and quality problems slip through.

**How to Avoid**:
- Allocate sufficient time for review
- Check out branch and test manually
- Read code carefully, don't just scan
- Use the reviewer checklist

### Anti-Pattern 2: Nitpicking

**What It Is**: Focusing on trivial style issues over substance.

**Why It's Bad**: Demoralizes authors, wastes time, misses real issues.

**How to Avoid**:
- Focus on automated linting for style
- Prioritize feedback (critical > major > minor)
- Let minor style issues go if linter passes
- Suggest style improvements, don't demand them

**Example**:
```typescript
// ❌ Nitpicking
"Change this to a const arrow function instead of a regular function."

// ✅ Substantive
"This function has O(n²) complexity. Consider using a Map for O(n) lookup."
```

### Anti-Pattern 3: Delayed Reviews

**What It Is**: Letting PRs sit for days without review.

**Why It's Bad**: Blocks progress, creates merge conflicts, reduces momentum.

**How to Avoid**:
- Commit to 24-hour response time
- Set aside dedicated review time daily
- Notify author if you can't review in time
- Reassign if necessary

### Anti-Pattern 4: Hostile Comments

**What It Is**: Negative, condescending, or sarcastic feedback.

**Why It's Bad**: Creates toxic culture, discourages collaboration.

**How to Avoid**:
- Be constructive and respectful
- Focus on code, not the person
- Ask questions instead of making statements
- Assume positive intent

**Example**:
```typescript
// ❌ Hostile
"This is terrible code. Did you even test this?"

// ✅ Constructive
"I'm concerned about edge cases here. Could you add tests for empty arrays and null values?"
```

### Anti-Pattern 5: Feature Creep

**What It Is**: Requesting out-of-scope changes in a PR.

**Why It's Bad**: Expands scope, delays completion, frustrates author.

**How to Avoid**:
- Review against acceptance criteria only
- Suggest future improvements separately
- Create new Linear issues for out-of-scope work
- Respect the PR's defined scope

**Example**:
```typescript
// ❌ Feature creep
"While you're at it, can you also add pagination, sorting, and filtering?"

// ✅ Scope-appropriate
"This looks good. For future enhancement, we could add pagination (I'll create a Linear issue)."
```

### Anti-Pattern 6: Bikeshedding

**What It Is**: Excessive debate on minor details.

**Why It's Bad**: Wastes time, distracts from important issues.

**How to Avoid**:
- Time-box discussions (max 2 rounds)
- Escalate to tech lead if no agreement
- Accept "good enough" for minor decisions
- Focus on impact, not perfection

**Example**:
```typescript
// ❌ Bikeshedding (20 comments arguing about naming)
"Should this be fetchData or getData or retrieveData?"

// ✅ Pragmatic
"Either fetchData or getData works. Let's go with fetchData for consistency with other files."
```

### Anti-Pattern 7: Silent Approval

**What It Is**: Approving without leaving any feedback or comments.

**Why It Is Bad**: Misses learning opportunities, provides no context for future.

**How to Avoid**:
- Leave at least one comment (even if just praise)
- Highlight good code and clever solutions
- Explain why you approved
- Share knowledge and insights

**Example**:
```
✅ "Nice work! I especially like how you used the Factory pattern here to keep the code DRY. The test coverage is comprehensive. Approved!"
```

---

## Review Best Practices

### For Reviewers

#### 1. Read the Context First

- Read PR description completely
- Review linked Linear issue
- Understand the "why" before the "how"
- Check acceptance criteria

#### 2. Start with the Big Picture

- Review architecture and approach first
- Check file structure and organization
- Verify design patterns used correctly
- Look for missing abstractions

#### 3. Then Zoom into Details

- Review individual functions
- Check for bugs and edge cases
- Verify error handling
- Look for performance issues

#### 4. Test Manually

- Check out the branch
- Run tests locally
- Test the feature manually
- Try to break it (edge cases)

#### 5. Provide Actionable Feedback

```typescript
// ❌ Vague
"This could be better."

// ✅ Specific
"Consider using Array.reduce here instead of forEach + push. It's more concise and functional. Example: data.reduce((acc, item) => [...acc, transform(item)], [])"
```

#### 6. Prioritize Your Feedback

Use severity labels:

- **[CRITICAL]**: Security, data loss, blocking bugs
- **[MAJOR]**: Architecture, performance, missing tests
- **[MINOR]**: Style, naming, optional refactoring
- **[NIT]**: Tiny style issues (optional to fix)
- **[QUESTION]**: Seeking clarification
- **[PRAISE]**: Good work!

**Example**:
```
[CRITICAL] This endpoint is missing authentication. Any user can delete any request.

[MAJOR] This creates an N+1 query. Consider using a JOIN or batch query.

[MINOR] Consider renaming `data` to `clientProfiles` for clarity.

[NIT] Extra blank line here (feel free to ignore).

[QUESTION] Why did you choose Redis over in-memory cache here?

[PRAISE] Excellent test coverage! Great job handling all edge cases.
```

#### 7. Explain Your Reasoning

```typescript
// ❌ No explanation
"Change this to use a Set."

// ✅ Explained
"Consider using a Set instead of Array for `uniqueIds`. Set has O(1) lookup vs Array's O(n), which matters when checking duplicates in large datasets."
```

#### 8. Suggest, Don't Demand

```typescript
// ❌ Demanding
"Change this immediately."

// ✅ Suggesting
"What do you think about using X here? It might be more efficient."
```

#### 9. Praise Good Work

```typescript
// ✅ Examples
"Love this abstraction! Very clean."
"Excellent test coverage."
"Smart use of the Factory pattern here."
"This is much more readable than the old approach."
```

#### 10. Use Code Suggestions

GitHub supports suggested changes that authors can apply with one click:

````markdown
```suggestion
const clientNames = clients.map(client => client.name);
```
````

### For Authors

#### 1. Make Reviewers' Jobs Easy

- Keep PRs small (<400 lines)
- Write clear PR descriptions
- Link all context (Linear issue, docs)
- Explain non-obvious decisions
- Add screenshots for UI changes

#### 2. Self-Review First

- Read through all your changes
- Check for console.logs, debuggers
- Verify tests pass
- Run linter and type checker
- Fix obvious issues before requesting review

#### 3. Respond to All Feedback

```markdown
✅ Good responses:

"Done ✅"
"Fixed in abc123. I extracted this into a separate function."
"Great catch! Added test for this edge case."
"I tried that approach initially but ran into X issue. Open to other ideas."
"Can you clarify what you mean by Y?"
```

#### 4. Don't Take It Personally

- Feedback is about code, not you
- Everyone's code gets reviewed
- Reviews make you a better developer
- Embrace the learning opportunity

#### 5. Push Back When Appropriate

```markdown
✅ Constructive pushback:

"I considered that approach, but it would require refactoring the entire auth system. Could we handle that in a separate PR?"

"This is out of scope for this PR. I'll create a Linear issue to track it separately."

"I disagree because X. What if we compromise and do Y?"
```

#### 6. Ask Questions

```markdown
✅ Good questions:

"Can you explain why approach X is better than Y?"
"I'm not familiar with pattern Z. Do you have a resource I can read?"
"How would you handle the error case here?"
```

---

## Reviewer Assignment

### Assignment Strategy

Assign reviewers based on SubAgent specialization and expertise:

| Change Type | Primary Reviewer | Secondary Reviewer |
|-------------|------------------|-------------------|
| Agent implementation | Coder | Reviewer |
| Test additions | Tester | Coder |
| UI components | Designer | Coder |
| Documentation | Documenter | - |
| Security changes | Reviewer | Coder |
| Architecture | Reviewer | Coder |
| Bug fixes | Coder | Tester |
| Performance | Coder | Reviewer |

### When Multiple Reviewers Are Needed

- **Architecture Changes**: Coder + Reviewer
- **Security-Critical**: Coder + Reviewer
- **Large PRs (>400 lines)**: 2 reviewers (split focus areas)
- **Breaking Changes**: Coder + Reviewer
- **UI + Logic**: Designer + Coder

### Fresh Perspective

For complex or critical changes, assign someone unfamiliar with that code for a fresh perspective.

### Avoiding Bottlenecks

- Rotate reviewers to distribute knowledge
- Don't always assign the "expert"
- Junior developers can review too
- Set clear response time expectations

---

## Appendix: Quick Reference

### Quality Gate Commands

```bash
# Run all quality gates
npm run lint && npm run type-check && npm run test:coverage && npm run build

# Individual checks
npm run lint              # ESLint
npm run type-check        # TypeScript
npm run test              # All tests
npm run test:coverage     # Coverage report
npm run build             # Production build
```

### Coverage Thresholds

```yaml
lines: 75%
functions: 75%
branches: 70%
statements: 75%
```

### Review Timeline

```
PR Created → 24h → Initial Review → 48h → Re-review → Merge
```

### Severity Labels

```
[CRITICAL] - Must fix before merging
[MAJOR] - Should fix before merging
[MINOR] - Nice to have, not blocking
[NIT] - Tiny issue, optional
[QUESTION] - Seeking clarification
[PRAISE] - Good work!
```

### Linear Issue States

```
To Do → In Progress → In Review → Done
```

### Review Approval Emoji Guide

```
✅ - Approved, ready to merge
🔄 - Changes requested, needs work
💬 - Comment only, not blocking
🚀 - Approved with minor suggestions
⚠️ - Concerns that need discussion
```

---

**Questions?** Reach out in #code-review channel or ping @reviewer-lead
