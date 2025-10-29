## 🎯 PR Title Format
<!-- Use conventional commits format: -->
<!-- feat(scope): description -->
<!-- fix(scope): description -->
<!-- docs(scope): description -->
<!-- refactor(scope): description -->
<!-- test(scope): description -->
<!-- chore(scope): description -->

## 📝 Description

### What does this PR do?
<!-- Briefly describe the changes in this PR -->

### Why are we making this change?
<!-- Explain the motivation or context -->

### Related Issues
<!-- Link to Linear issues, GitHub issues, or tickets -->
- Fixes: ONEK-XXX
- Relates to: #XXX

---

## 🧪 Testing

### How has this been tested?
<!-- Describe the testing you've done -->
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Manual testing

### Test coverage
<!-- Current test coverage percentage -->
- Coverage: __%

---

## 📋 Code Review Checklist

### 1. Code Quality
- [ ] Code follows project style guidelines (2 spaces, semicolons, single quotes)
- [ ] No `console.log` statements in production code
- [ ] No `any` types used
- [ ] Proper error handling with try/catch
- [ ] Meaningful variable and function names
- [ ] No code duplication
- [ ] JSDoc comments on exported functions

### 2. Testing
- [ ] Unit tests added for new features
- [ ] Integration tests added where appropriate
- [ ] Edge cases covered
- [ ] Test coverage ≥75%
- [ ] All tests passing locally
- [ ] No flaky tests

### 3. Documentation
- [ ] JSDoc comments added/updated
- [ ] README updated if necessary
- [ ] CHANGELOG updated
- [ ] Inline comments for complex logic
- [ ] API documentation updated (if applicable)

### 4. Security
- [ ] No secrets or API keys committed
- [ ] Input validation on user data
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Authentication/authorization checked
- [ ] Dependencies scanned for vulnerabilities

### 5. Architecture
- [ ] Follows project structure
- [ ] Agents extend `BaseAgent` (if applicable)
- [ ] MCP servers use `@modelcontextprotocol/sdk` (if applicable)
- [ ] Proper separation of concerns
- [ ] API routes have error handling
- [ ] No circular dependencies

### 6. Performance
- [ ] No unnecessary re-renders (React)
- [ ] Efficient database queries
- [ ] Appropriate use of caching
- [ ] No memory leaks
- [ ] Bundle size impact considered
- [ ] Images optimized

### 7. Accessibility (if UI changes)
- [ ] ARIA labels added
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Focus indicators visible

### 8. Mobile Responsiveness (if UI changes)
- [ ] Works on mobile devices
- [ ] No hydration mismatches
- [ ] Touch targets appropriately sized
- [ ] Layout doesn't break on small screens

---

## 🤖 Automated Code Review

<!-- This section will be populated automatically by GitHub Actions -->

### Validation Results
Will be updated by Code Review Agent after PR creation.

---

## 📸 Screenshots / Videos
<!-- If applicable, add screenshots or videos to demonstrate the changes -->

### Before


### After


---

## 🚀 Deployment Notes

### Breaking Changes
<!-- List any breaking changes -->
- None

### Database Migrations
<!-- List any database migrations required -->
- None

### Environment Variables
<!-- List any new environment variables -->
- None

### Dependencies
<!-- List any new dependencies added -->
- None

---

## 🔗 Additional Context

### References
- [Git Workflow Documentation](./.claude/commands/git-branch-tree-pr-code-review-workflow.md)
- [Agent Creation Guidelines](./docs/AGENTS.md)
- [System Architecture](./docs/SYSTEM_ARCHITECTURE.md)

### Notes
<!-- Any additional notes for reviewers -->

---

## ✅ Pre-submission Checklist

Before submitting this PR, ensure:

- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published
- [ ] I have checked for merge conflicts
- [ ] I have run `npm run review:automated` locally (if available)
- [ ] I have updated Linear issue status to "In Review"

---

<!--
For automated code review, the following checks will be run:
1. Code validation (morpheus-validator)
2. TypeScript type checking
3. ESLint
4. Unit tests
5. Test coverage ≥75%
6. PR review coordinator
7. Security scan
8. Architecture compliance check

View workflow details: .github/workflows/pr-code-review.yml
-->
