# 🤖 Automated PR Code Review Guide

This document explains how to use the automated PR code review system based on the [git-branch-tree-pr-code-review-workflow.md](../.claude/commands/git-branch-tree-pr-code-review-workflow.md).

---

## Overview

The automated code review system implements **Phase 7 (Final PR Review)** from the workflow document with the following components:

1. **GitHub Actions Workflow** - Runs automatically on every PR
2. **PR Review Automation Script** - Can be run locally before creating PRs
3. **PR Template** - Standardized checklist for all PRs
4. **Review Reports** - Detailed reports stored in `.github/pr-reviews/`

---

## Quick Start

### Before Creating a PR

Run the automated review locally to catch issues early:

```bash
npm run review:automated
```

This will:
- ✅ Run code validation (morpheus-validator)
- ✅ Check TypeScript types
- ✅ Run ESLint
- ✅ Execute unit tests
- ✅ Verify test coverage ≥75%
- ✅ Generate PR review report
- ✅ Perform security scan
- ✅ Check architecture compliance
- 📄 Generate comprehensive review summary

### Creating a PR

1. **Commit your changes** following conventional commits:
   ```bash
   git add .
   git commit -m "feat(agents): add orchestrator agent"
   ```

2. **Run automated review**:
   ```bash
   npm run review:automated
   ```

3. **Fix any issues** reported by the automated review

4. **Push your branch**:
   ```bash
   git push -u origin your-branch-name
   ```

5. **Create PR** on GitHub - the PR template will automatically populate

6. **GitHub Actions will run** - Code Review Agent will comment on your PR

---

## GitHub Actions Workflow

### What Runs Automatically

When you create or update a PR, three jobs run in parallel:

#### 1. Code Review Job
- Code validation (morpheus-validator)
- TypeScript type checking
- ESLint
- Unit tests
- Test coverage
- PR review coordinator
- Posts comprehensive review comment on PR
- Adds labels: `✅ code-review-passed` or `⚠️ code-review-failed`

#### 2. Security Review Job
- NPM audit for vulnerabilities
- Secret scanning (API keys, tokens, private keys)
- Posts security review comment on PR

#### 3. Architecture Review Job
- Checks agents extend `BaseAgent`
- Verifies MCP servers use `@modelcontextprotocol/sdk`
- Ensures API routes have error handling
- Posts architecture compliance comment on PR

### Workflow File

Location: [`.github/workflows/pr-code-review.yml`](./workflows/pr-code-review.yml)

### Artifacts

All reports are saved as GitHub Actions artifacts for 30 days:
- `validation-report.txt`
- `type-check-report.txt`
- `lint-report.txt`
- `unit-test-report.txt`
- `coverage-report.txt`
- `pr-review-report.txt`
- `review-summary.md`

---

## Local PR Review Script

### Usage

```bash
./scripts/pr-review-automation.sh
```

Or via npm:

```bash
npm run review:automated
```

### What It Does

1. **Checks Prerequisites**
   - Verifies git repository
   - Checks Node.js and npm
   - Ensures dependencies installed

2. **Phase 7 Checks**
   - Code validation
   - Type checking
   - Linting
   - Unit tests
   - Test coverage
   - PR review coordinator

3. **Security Checks**
   - NPM audit
   - Secret scanning

4. **Architecture Checks**
   - Agent compliance
   - MCP server compliance
   - API route error handling

5. **Generates Reports**
   - All reports saved to `.github/pr-reviews/`
   - Timestamped for tracking
   - Comprehensive summary generated

### Report Location

All reports are saved to: `.github/pr-reviews/`

Example:
```
.github/pr-reviews/
├── validation_20251028_143022.txt
├── type-check_20251028_143022.txt
├── lint_20251028_143022.txt
├── unit-tests_20251028_143022.txt
├── coverage_20251028_143022.txt
├── pr-review_20251028_143022.txt
├── security_20251028_143022.txt
├── architecture_20251028_143022.txt
└── review-summary_20251028_143022.md
```

---

## PR Template

### Auto-populated Checklist

When creating a PR, the template at [`.github/PULL_REQUEST_TEMPLATE.md`](./PULL_REQUEST_TEMPLATE.md) will automatically populate with:

#### 8 Main Categories:
1. **Code Quality** - Style, error handling, naming
2. **Testing** - Unit tests, integration tests, coverage
3. **Documentation** - JSDoc, README, comments
4. **Security** - Secrets, validation, vulnerabilities
5. **Architecture** - Structure, patterns, dependencies
6. **Performance** - Rendering, queries, caching
7. **Accessibility** - ARIA, keyboard nav, screen readers
8. **Mobile Responsiveness** - Hydration, touch targets, layouts

### Checklist Usage

- Check off items as you complete them
- Automated checks will validate some items
- Human reviewers will verify others

---

## Code Review Standards

### Required Checks (Must Pass)

| Check | Threshold | Blocking |
|-------|-----------|----------|
| Code Validation | 0 errors | ✅ Yes |
| Type Check | 0 errors | ✅ Yes |
| Lint | 0 errors | ✅ Yes |
| Unit Tests | All passing | ✅ Yes |
| Test Coverage | ≥75% | ✅ Yes |

### Advisory Checks (Warnings)

| Check | Threshold | Blocking |
|-------|-----------|----------|
| Security Scan | 0 high/critical | ⚠️ No (warning) |
| Architecture | 0 violations | ⚠️ No (warning) |
| PR Review Report | 0 warnings | ⚠️ No (warning) |

### Code Style

From [`docs/AGENTS.md`](../docs/AGENTS.md):

- **Indentation**: 2 spaces
- **Semicolons**: Required
- **Quotes**: Single quotes
- **Trailing commas**: Required in multi-line
- **No `any` types**: Use proper types
- **JSDoc**: Required on exported functions

### Naming Conventions

- **Classes**: PascalCase (e.g., `OrchestratorAgent`)
- **Functions**: camelCase (e.g., `fetchClientData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Interfaces**: PascalCase with `I` prefix (e.g., `IAgent`)
- **Types**: PascalCase (e.g., `AgentConfig`)
- **Enums**: PascalCase (e.g., `AgentType`)

---

## Workflow Integration

### Phase 7: Final PR Review

The automated system implements Phase 7 from the workflow document:

```
Phase 7: Final PR Review
├── 7.1: Code Review Agent validates code
├── 7.2: Pull Request Agent creates PR
├── 7.3: Automated checks run
├── 7.4: Review comments posted
└── 7.5: Labels applied
```

### Agent Roles

From the workflow document:

#### Code Review Agent
- Reviews code changes
- Validates against standards
- Generates review report
- Posts comments on PR

#### Pull Request Agent
- Creates PR from branch
- Populates PR template
- Links to issues
- Sets labels and assignees

### Success Metrics

✅ **PR Approved** when:
- All required checks pass
- No blocking issues found
- Code review checklist complete
- Security scan clean
- Architecture compliant

⚠️ **PR Needs Work** when:
- Any required check fails
- Blocking issues found
- Missing tests or documentation
- Security vulnerabilities
- Architecture violations

---

## Troubleshooting

### Common Issues

#### 1. Test Coverage Below Threshold

**Error**: `❌ Test coverage below threshold`

**Fix**:
```bash
# Check current coverage
npm run test:coverage

# Add missing tests
# Aim for ≥75% coverage on:
# - Lines
# - Functions
# - Branches
# - Statements
```

#### 2. TypeScript Errors

**Error**: `❌ Type check failed`

**Fix**:
```bash
# Run type check to see errors
npm run type-check

# Fix type errors
# Never use `any` - use proper types
```

#### 3. Lint Errors

**Error**: `❌ Lint check failed`

**Fix**:
```bash
# See lint errors
npm run lint

# Auto-fix where possible
npm run lint -- --fix
```

#### 4. Security Vulnerabilities

**Error**: `⚠️ Vulnerabilities detected`

**Fix**:
```bash
# See vulnerability details
npm audit

# Fix automatically where possible
npm audit fix

# For breaking changes
npm audit fix --force
```

#### 5. Secrets Detected

**Error**: `⚠️ Potential secrets found`

**Fix**:
1. Remove secrets from code
2. Use environment variables
3. Add to `.env.local` (never commit)
4. Update `.gitignore` if needed

---

## Best Practices

### Before Creating PR

1. ✅ Run `npm run review:automated` locally
2. ✅ Fix all issues before pushing
3. ✅ Ensure tests pass
4. ✅ Update documentation
5. ✅ Check for secrets
6. ✅ Update Linear issue status

### During PR Review

1. ✅ Address automated review comments
2. ✅ Respond to human reviewer feedback
3. ✅ Keep PR scope focused
4. ✅ Update tests as needed
5. ✅ Maintain clean commit history
6. ✅ Re-run automated checks after changes

### After PR Approval

1. ✅ Merge using workflow Phase 9
2. ✅ Delete feature branch
3. ✅ Update Linear issue to "Done"
4. ✅ Deploy if needed
5. ✅ Monitor for issues

---

## Advanced Usage

### Custom Review Configuration

You can customize the review by modifying:

- **Workflow**: `.github/workflows/pr-code-review.yml`
- **Script**: `scripts/pr-review-automation.sh`
- **Template**: `.github/PULL_REQUEST_TEMPLATE.md`

### Adding Custom Checks

Add custom checks to the automation script:

```bash
# In scripts/pr-review-automation.sh

run_custom_check() {
  print_header "Custom Check"

  # Your custom logic here

  if [ $? -eq 0 ]; then
    print_success "Custom check passed"
    return 0
  else
    print_error "Custom check failed"
    return 1
  fi
}

# Then add to main() function
run_custom_check || custom_check_status=$?
```

### Skipping Checks (Not Recommended)

Only in emergencies:

```bash
# Skip pre-commit hooks
git commit --no-verify -m "emergency fix"

# Skip pre-push hooks
git push --no-verify
```

**Note**: All checks still run in CI/CD.

---

## Resources

### Documentation
- [Git Workflow](../.claude/commands/git-branch-tree-pr-code-review-workflow.md) - Complete workflow document
- [Agent Guidelines](../docs/AGENTS.md) - Agent creation and code style
- [System Architecture](../docs/SYSTEM_ARCHITECTURE.md) - System overview

### Scripts
- [PR Review Automation](../scripts/pr-review-automation.sh) - Local review script
- [GitHub Actions Workflow](./workflows/pr-code-review.yml) - Automated workflow

### Templates
- [PR Template](./PULL_REQUEST_TEMPLATE.md) - PR checklist template

---

## Support

### Getting Help

1. **Check Documentation** - Start with this guide and workflow docs
2. **Review Logs** - Check `.github/pr-reviews/` for detailed reports
3. **GitHub Actions** - View workflow runs for CI/CD issues
4. **Team Review** - Request help from team members

### Reporting Issues

If you find issues with the automated review system:

1. Create GitHub issue with:
   - Description of problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Relevant logs/screenshots

2. Tag with appropriate label:
   - `bug` - For broken functionality
   - `enhancement` - For feature requests
   - `documentation` - For doc improvements

---

## Changelog

### Version 1.0.0 (2025-10-28)

Initial release:
- ✅ GitHub Actions workflow
- ✅ Local PR review script
- ✅ PR template
- ✅ Automated code review
- ✅ Security scanning
- ✅ Architecture validation
- ✅ Comprehensive reporting

---

**Last Updated**: 2025-10-28
**Maintained by**: Development Team
**Based on**: git-branch-tree-pr-code-review-workflow.md
