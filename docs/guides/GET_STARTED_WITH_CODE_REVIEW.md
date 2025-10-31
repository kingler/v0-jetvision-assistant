# Get Started with Code Review Integration

**Quick start guide for the newly integrated code review system.**

---

## ⚡ 30-Second Setup

```bash
# 1. Install dependencies
npm install

# 2. Initialize git hooks
npm run prepare

# 3. Verify it works
npm run review:validate
```

✅ **Done!** Code review is now active on every commit and push.

---

## 🎯 Your First TDD Feature

Let's walk through creating a feature using the new TDD workflow:

### Step 1: Create Feature Branch

```bash
git checkout -b feat/example-feature
```

### Step 2: Start TDD Workflow - RED Phase

```bash
npm run review:tdd
```

**Interactive prompts**:
- `Feature name:` → **example-feature**
- `Current phase (RED/GREEN/REFACTOR):` → **RED**
- `Have you written the failing test?` → Write your test first, then enter **y**

**Example test** (`__tests__/unit/example.test.ts`):
```typescript
import { describe, it, expect } from 'vitest';
import { myNewFunction } from '@/lib/example';

describe('myNewFunction', () => {
  it('should return correct value', () => {
    const result = myNewFunction('test');
    expect(result).toBe('test-processed');
  });
});
```

The workflow will verify the test **fails** (as expected in RED phase).

### Step 3: TDD Workflow - GREEN Phase

Now implement the minimum code to make the test pass:

**Implementation** (`lib/example.ts`):
```typescript
export function myNewFunction(input: string): string {
  return `${input}-processed`;
}
```

Run the workflow again:
```bash
npm run review:tdd
```

- `Current phase:` → **GREEN**
- `Have you implemented the code?` → **y**

The workflow will:
- ✅ Verify tests pass
- ✅ Run code validation
- 📝 Prompt for commit message

Enter commit message:
```
feat(lib): add myNewFunction utility
```

### Step 4: TDD Workflow - REFACTOR Phase

Now improve the code quality:

```typescript
/**
 * Processes input string by appending suffix
 * @param input - The input string to process
 * @returns Processed string with suffix
 */
export function myNewFunction(input: string): string {
  if (!input) {
    throw new Error('Input cannot be empty');
  }
  return `${input}-processed`;
}
```

Add edge case tests:
```typescript
it('should throw error for empty input', () => {
  expect(() => myNewFunction('')).toThrow('Input cannot be empty');
});
```

Run workflow:
```bash
npm run review:tdd
```

- `Current phase:` → **REFACTOR**
- `Have you refactored the code?` → **y**

Enter commit message:
```
refactor(lib): add validation and documentation to myNewFunction
```

### Step 5: Create Pull Request

```bash
# Generate PR review
npm run review:pr

# Create PR
gh pr create
```

🎉 **Congratulations!** You've completed your first TDD cycle with code review!

---

## 🔄 What Happens Automatically

### When You Commit

```bash
git commit -m "feat(lib): add new feature"
```

**Automatic checks** (via `.husky/pre-commit`):
1. ✅ Type check (`tsc --noEmit`)
2. ✅ Lint (`eslint`)
3. ✅ Unit tests for changed files
4. ✅ Code validation (morpheus-validator)

**If any fail**, commit is blocked with helpful error messages.

### When You Push

```bash
git push
```

**Automatic checks** (via `.husky/pre-push`):
1. ✅ Full test suite
2. ✅ Test coverage ≥75%
3. ✅ Integration tests

**If any fail**, push is blocked.

### When You Create a PR

**Automatic checks** (via GitHub Actions):
1. 🤖 Code review job
2. 🔒 Security review job
3. 🏗️ Architecture review job
4. ⚡ Performance review job

**Results posted** as PR comment with detailed report.

---

## 📋 Available Commands

### Code Review Commands

```bash
# Run code validation
npm run review:validate

# Run TDD workflow (interactive)
npm run review:tdd

# Generate PR review report
npm run review:pr

# Auto-fix linting issues
npm run review:fix
```

### Standard Commands

```bash
# Type check
npm run type-check

# Lint code
npm run lint

# Run tests
npm run test:unit
npm run test:integration
npm run test:coverage

# Development
npm run dev
npm run build
```

---

## 🎓 Key Concepts

### TDD Phases

**🔴 RED** - Write a failing test
- Defines desired behavior
- Test should fail initially
- Clarifies requirements

**🟢 GREEN** - Make the test pass
- Write minimal code
- Get test to pass
- Don't worry about perfection

**🔵 REFACTOR** - Improve quality
- Clean up code
- Remove duplication
- Improve structure
- Tests still pass

### Conventional Commits

Every commit must follow this format:

```
type(scope): description

Examples:
feat(agents): add orchestrator agent
fix(api): resolve authentication bug
docs(readme): update setup instructions
test(core): add base-agent unit tests
refactor(lib): improve error handling
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`

### Code Review Levels

**1. Automated** (morpheus-validator)
- Type checking
- Linting
- Security scanning
- Architecture compliance
- Runs on: commit, push, PR

**2. Manual** (code-review-coordinator)
- Code review checklist
- PR review report
- Human judgment
- Runs on: PR creation

**3. CI/CD** (GitHub Actions)
- Full validation suite
- Security audit
- Performance analysis
- Runs on: every push to PR

---

## 🚨 Common Scenarios

### Scenario 1: Pre-commit Check Fails

```bash
$ git commit -m "feat: add feature"

❌ Type check failed. Fix TypeScript errors before committing.
```

**Solution**:
```bash
# See errors
npm run type-check

# Fix errors in your code

# Try again
git commit -m "feat: add feature"
```

### Scenario 2: Test Coverage Too Low

```bash
$ git push

❌ Test coverage below threshold. Add more tests before pushing.
Coverage: 68% (threshold: 75%)
```

**Solution**:
```bash
# See coverage report
npm run test:coverage

# Add missing tests

# Try again
git push
```

### Scenario 3: Invalid Commit Message

```bash
$ git commit -m "added new feature"

❌ Invalid commit message format!

Commit message must follow conventional commits format:
  type(scope): subject
```

**Solution**:
```bash
# Use correct format
git commit -m "feat(lib): add new feature"
```

### Scenario 4: Emergency - Need to Bypass

```bash
# Emergency bypass (not recommended!)
git commit --no-verify -m "hotfix: critical bug"
git push --no-verify
```

⚠️ **Note**: All checks will still run in CI/CD!

---

## 📖 Learn More

### Essential Reading

1. **[CODE_REVIEW_SETUP.md](CODE_REVIEW_SETUP.md)** - What was set up
2. **[docs/CODE_REVIEW_GUIDE.md](docs/CODE_REVIEW_GUIDE.md)** - Complete guide
3. **[.github/CODE_REVIEW_CHECKLIST.md](.github/CODE_REVIEW_CHECKLIST.md)** - Review checklist
4. **[CLAUDE.md](CLAUDE.md)** - Updated project guide

### Reference Files

- **[.husky/pre-commit](.husky/pre-commit)** - Pre-commit hook
- **[.husky/pre-push](.husky/pre-push)** - Pre-push hook
- **[.husky/commit-msg](.husky/commit-msg)** - Message validation
- **[scripts/code-review/validate.ts](scripts/code-review/validate.ts)** - Validation logic
- **[.github/workflows/code-review.yml](.github/workflows/code-review.yml)** - CI/CD workflow

---

## ✅ Quick Verification

Run these to verify everything works:

```bash
# 1. Check hooks installed
ls -la .husky/
# Should show: pre-commit, pre-push, commit-msg (all executable)

# 2. Test validation
npm run review:validate
# Should pass with no staged files

# 3. Test TDD workflow
npm run review:tdd
# Should show interactive prompts

# 4. Test PR review
npm run review:pr
# Should generate report

# 5. Make a test commit
git commit --allow-empty -m "test(setup): verify code review"
# Should run all pre-commit checks
```

---

## 🎯 Best Practices

### DO ✅

- ✅ Always use `npm run review:tdd` for new features
- ✅ Run `npm run review:pr` before creating PRs
- ✅ Follow conventional commits format
- ✅ Keep test coverage ≥75%
- ✅ Write tests before implementation (TDD)
- ✅ Address all checklist items before requesting review

### DON'T ❌

- ❌ Skip git hooks with `--no-verify` (except emergencies)
- ❌ Use `any` type in TypeScript
- ❌ Hardcode secrets or API keys
- ❌ Commit without tests
- ❌ Push without running full test suite
- ❌ Create large PRs (keep them small and focused)

---

## 🆘 Need Help?

### Troubleshooting

1. **Hooks not running?**
   ```bash
   npm run prepare
   chmod +x .husky/*
   ```

2. **Validation failing?**
   ```bash
   npm run review:validate  # See detailed errors
   npm run review:fix       # Auto-fix what's possible
   ```

3. **Tests failing?**
   ```bash
   npm run test:coverage    # See coverage report
   npm run test:watch       # Debug in watch mode
   ```

### Documentation

- **Full Guide**: [docs/CODE_REVIEW_GUIDE.md](docs/CODE_REVIEW_GUIDE.md)
- **Setup Info**: [CODE_REVIEW_SETUP.md](CODE_REVIEW_SETUP.md)
- **Checklist**: [.github/CODE_REVIEW_CHECKLIST.md](.github/CODE_REVIEW_CHECKLIST.md)

---

## 🚀 Ready to Start!

You're all set! Here's your next steps:

1. **Try TDD workflow**:
   ```bash
   git checkout -b feat/my-first-feature
   npm run review:tdd
   ```

2. **Make changes** following the RED → GREEN → REFACTOR cycle

3. **Create PR**:
   ```bash
   npm run review:pr
   gh pr create
   ```

4. **Watch automated review** run in GitHub Actions

---

**Happy coding with automated code review!** 🎉

---

*Last Updated: 2025-10-26*
*Integration: morpheus-validator + code-review-coordinator*
