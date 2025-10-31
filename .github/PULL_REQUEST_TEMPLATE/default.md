# Pull Request

## Description

<!-- Provide a clear and concise description of the changes -->

### Related Task/Issue
Closes #TASK-XXX (link to task file or GitHub issue)

### Type of Change
<!-- Mark the relevant option with an 'x' -->

- [ ] 🆕 New feature (non-breaking change which adds functionality)
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🎨 Style/UI change (no functional changes)
- [ ] ♻️ Code refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] ✅ Test addition or update
- [ ] 🔧 Build/tooling change

---

## Changes Made

### Files Created
<!-- List new files created -->
- `path/to/new/file.ts`
- `path/to/another/file.tsx`

### Files Modified
<!-- List existing files modified -->
- `path/to/modified/file.ts` - Added X functionality
- `path/to/another/modified.tsx` - Fixed Y bug

### Files Deleted
<!-- List files deleted (if any) -->
- `path/to/deleted/file.ts`

---

## Testing

### Test-Driven Development
<!-- Confirm TDD approach was followed -->
- [ ] ✅ Tests written BEFORE implementation (Red phase)
- [ ] ✅ Implementation written to pass tests (Green phase)
- [ ] ✅ Code refactored while keeping tests passing (Blue phase)

### Test Coverage
<!-- Run: npm run test:coverage -->

```
Test Suites: X passed, X total
Tests:       X passed, X total
Coverage:    XX% statements, XX% branches, XX% functions, XX% lines
```

**Coverage Meets Thresholds** (75% minimum):
- [ ] ✅ Lines: XX%
- [ ] ✅ Functions: XX%
- [ ] ✅ Branches: XX%
- [ ] ✅ Statements: XX%

### Tests Performed

#### Unit Tests
<!-- List unit test files created/modified -->
- [ ] `__tests__/unit/[feature]/[test].test.ts`
- [ ] All unit tests pass locally

#### Integration Tests
<!-- List integration test files created/modified (if applicable) -->
- [ ] `__tests__/integration/[feature]/[test].test.ts`
- [ ] All integration tests pass locally

#### E2E Tests
<!-- List E2E test files created/modified (if applicable) -->
- [ ] `__tests__/e2e/[feature]/[test].test.ts`
- [ ] All E2E tests pass locally

#### Manual Testing
<!-- Describe manual testing performed -->
- [ ] Tested on Chrome
- [ ] Tested on Firefox (if UI changes)
- [ ] Tested on Safari (if UI changes)
- [ ] Tested on mobile viewport (if responsive changes)
- [ ] Tested error scenarios
- [ ] Tested edge cases

**Manual Test Results**:
<!-- Describe what you tested and results -->
```
1. Tested feature X: ✓ Works as expected
2. Tested error case Y: ✓ Handles gracefully
3. Tested edge case Z: ✓ Behaves correctly
```

---

## Code Quality

### Linting & Type Checking
- [ ] ✅ No ESLint errors (`npm run lint`)
- [ ] ✅ No TypeScript errors (compiles successfully)
- [ ] ✅ Build succeeds (`npm run build`)
- [ ] ✅ All tests pass (`npm test`)

### Code Style
- [ ] ✅ Follows project coding guidelines (see `docs/AGENTS.md`)
- [ ] ✅ 2-space indentation used consistently
- [ ] ✅ Proper TypeScript typing (no `any` types)
- [ ] ✅ Functions are focused and do one thing
- [ ] ✅ Variable/function names are clear and descriptive
- [ ] ✅ No code duplication
- [ ] ✅ Comments added for complex logic
- [ ] ✅ JSDoc comments for public functions

### Security Checklist
- [ ] ✅ No API keys or secrets in code
- [ ] ✅ Environment variables used for sensitive data
- [ ] ✅ Input validation implemented where needed
- [ ] ✅ SQL injection protection (parameterized queries)
- [ ] ✅ XSS protection (proper escaping)
- [ ] ✅ Authentication/authorization checks present
- [ ] ✅ No console.log or debugging code

### Performance Checklist
- [ ] ✅ No unnecessary re-renders (React components)
- [ ] ✅ Database queries optimized
- [ ] ✅ No N+1 query problems
- [ ] ✅ Proper error handling and retries
- [ ] ✅ Loading states implemented (if async operations)

---

## Screenshots/Videos

<!-- If UI changes, include before/after screenshots or screen recordings -->

### Before
<!-- Screenshot of previous state (if applicable) -->

### After
<!-- Screenshot of new state -->

---

## Documentation

### Documentation Updated
- [ ] ✅ Code comments added for complex logic
- [ ] ✅ JSDoc comments added for public functions
- [ ] ✅ README.md updated (if needed)
- [ ] ✅ API documentation updated (if new endpoints)
- [ ] ✅ IMPLEMENTATION_PLAN.md updated (if architecture changes)
- [ ] ✅ Task completion notes added to task file

### Breaking Changes Documentation
<!-- If breaking changes, describe migration path -->
- [ ] N/A - No breaking changes
- [ ] Breaking changes documented below:

**Migration Guide** (if applicable):
```
1. Step to migrate...
2. Step to migrate...
```

---

## Deployment

### Environment Variables
<!-- List any new environment variables needed -->
- [ ] N/A - No new environment variables
- [ ] New variables documented below:

**New Environment Variables**:
```bash
NEW_VAR_NAME=description of what it does
```

### Database Changes
<!-- List any database schema changes -->
- [ ] N/A - No database changes
- [ ] Migration file created: `migrations/YYYY-MM-DD-description.sql`
- [ ] Migration tested locally
- [ ] Rollback plan documented

### Dependencies
<!-- List any new npm packages added -->
- [ ] N/A - No new dependencies
- [ ] New dependencies listed below:

**New Dependencies**:
- `package-name@version` - Purpose/reason for adding

---

## Checklist

### Before Requesting Review
- [ ] ✅ Self-review completed (read through all changes)
- [ ] ✅ All acceptance criteria met (from task)
- [ ] ✅ Tests written using TDD approach
- [ ] ✅ All tests passing locally
- [ ] ✅ Code coverage >75% for new code
- [ ] ✅ No linting errors
- [ ] ✅ No TypeScript errors
- [ ] ✅ Build succeeds
- [ ] ✅ Manual testing completed
- [ ] ✅ Screenshots added (if UI changes)
- [ ] ✅ Documentation updated
- [ ] ✅ Branch up-to-date with main

### Reviewer Checklist
<!-- For reviewers to check during code review -->
- [ ] Functionality meets acceptance criteria
- [ ] Code quality is high (follows standards)
- [ ] Tests are comprehensive and pass
- [ ] No security vulnerabilities introduced
- [ ] Performance is acceptable
- [ ] Documentation is adequate
- [ ] No unresolved questions or concerns

---

## Additional Context

### Motivation and Context
<!-- Why is this change required? What problem does it solve? -->

### Related Issues/PRs
<!-- Link any related issues or PRs -->
- Related to #XXX
- Depends on #YYY
- Blocks #ZZZ

### Open Questions
<!-- Any questions for reviewers? -->
- [ ] Question 1?
- [ ] Question 2?

### Risks/Concerns
<!-- Any risks or concerns reviewers should be aware of? -->
- Risk 1: Description
- Concern 1: Description

### Future Work
<!-- Any follow-up work needed after this PR? -->
- Future enhancement 1
- Future enhancement 2

---

## Review Instructions

### How to Test
<!-- Step-by-step instructions for reviewers to test -->

1. Pull this branch: `git checkout feature/branch-name`
2. Install dependencies: `npm install`
3. Set up environment: Copy `.env.example` to `.env.local` and fill in values
4. Run tests: `npm test`
5. Start dev server: `npm run dev`
6. Navigate to: `http://localhost:3000/[path]`
7. Test scenario 1: [Description]
8. Test scenario 2: [Description]

### Areas of Focus
<!-- What should reviewers pay special attention to? -->
- Focus area 1: [e.g., "Error handling in the webhook handler"]
- Focus area 2: [e.g., "Performance of the database query"]

---

## Merge Checklist

<!-- For maintainer to check before merging -->
- [ ] At least 1 approval received
- [ ] All conversations resolved
- [ ] CI/CD checks passing
- [ ] No merge conflicts
- [ ] Branch up-to-date with main
- [ ] Commits follow conventional commits format
- [ ] Ready to deploy

---

<!--
Thank you for your contribution! 🎉

Please ensure you've completed all checklist items before requesting review.
Reviewers: Please use the reviewer checklist to guide your review.
-->
