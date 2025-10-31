#!/bin/bash

###############################################################################
# PR Code Review Automation Script
# Based on: git-branch-tree-pr-code-review-workflow.md
# Implements: Phase 7 (Final PR Review) with Code Review Agent
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Report directory
REPORT_DIR="$PROJECT_ROOT/.github/pr-reviews"
mkdir -p "$REPORT_DIR"

# Timestamp for report
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

###############################################################################
# Helper Functions
###############################################################################

print_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

###############################################################################
# Check Prerequisites
###############################################################################

check_prerequisites() {
  print_header "Checking Prerequisites"

  # Check if we're in a git repository
  if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    print_error "Not inside a git repository"
    exit 1
  fi

  # Check if node is installed
  if ! command -v node &>/dev/null; then
    print_error "Node.js is not installed"
    exit 1
  fi

  # Check if npm is installed
  if ! command -v npm &>/dev/null; then
    print_error "npm is not installed"
    exit 1
  fi

  # Check if dependencies are installed
  if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    print_warning "Dependencies not installed. Running npm install..."
    npm install
  fi

  print_success "All prerequisites met"
}

###############################################################################
# Phase 7: Code Review Agent - Automated Checks
###############################################################################

run_code_validation() {
  print_header "Phase 7.1: Code Validation (morpheus-validator)"

  local validation_report="$REPORT_DIR/validation_$TIMESTAMP.txt"

  if npm run review:validate 2>&1 | tee "$validation_report"; then
    print_success "Code validation passed"
    return 0
  else
    print_error "Code validation failed - see $validation_report"
    return 1
  fi
}

run_type_check() {
  print_header "Phase 7.2: TypeScript Type Check"

  local type_check_report="$REPORT_DIR/type-check_$TIMESTAMP.txt"

  if npm run type-check 2>&1 | tee "$type_check_report"; then
    print_success "Type check passed"
    return 0
  else
    print_error "Type check failed - see $type_check_report"
    return 1
  fi
}

run_lint() {
  print_header "Phase 7.3: ESLint"

  local lint_report="$REPORT_DIR/lint_$TIMESTAMP.txt"

  if npm run lint 2>&1 | tee "$lint_report"; then
    print_success "Lint check passed"
    return 0
  else
    print_error "Lint check failed - see $lint_report"
    return 1
  fi
}

run_unit_tests() {
  print_header "Phase 7.4: Unit Tests"

  local unit_test_report="$REPORT_DIR/unit-tests_$TIMESTAMP.txt"

  if npm run test:unit 2>&1 | tee "$unit_test_report"; then
    print_success "Unit tests passed"
    return 0
  else
    print_error "Unit tests failed - see $unit_test_report"
    return 1
  fi
}

run_test_coverage() {
  print_header "Phase 7.5: Test Coverage (≥75%)"

  local coverage_report="$REPORT_DIR/coverage_$TIMESTAMP.txt"

  if npm run test:coverage 2>&1 | tee "$coverage_report"; then
    print_success "Test coverage meets threshold (≥75%)"
    return 0
  else
    print_error "Test coverage below threshold - see $coverage_report"
    return 1
  fi
}

run_pr_review_coordinator() {
  print_header "Phase 7.6: PR Review Coordinator"

  local pr_review_report="$REPORT_DIR/pr-review_$TIMESTAMP.txt"

  if npm run review:pr 2>&1 | tee "$pr_review_report"; then
    print_success "PR review coordinator completed"
    return 0
  else
    print_warning "PR review coordinator completed with warnings - see $pr_review_report"
    return 1
  fi
}

###############################################################################
# Security Checks
###############################################################################

run_security_checks() {
  print_header "Security Review"

  local security_report="$REPORT_DIR/security_$TIMESTAMP.txt"
  local security_passed=true

  # NPM audit
  print_info "Running npm audit..."
  if npm audit --audit-level=moderate 2>&1 | tee "$security_report"; then
    print_success "No vulnerabilities found"
  else
    print_warning "Vulnerabilities detected - see $security_report"
    security_passed=false
  fi

  # Check for secrets
  print_info "Scanning for secrets..."
  local secrets_found=false

  # API keys
  if git diff --cached | grep -iE "(api[_-]?key|apikey|api[_-]?secret)" | grep -vE "^\-|^@@|process\.env\.|NEXT_PUBLIC_"; then
    print_warning "Potential API keys found in staged changes"
    secrets_found=true
  fi

  # Private keys
  if git diff --cached | grep -E "BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY"; then
    print_error "Private keys found in staged changes"
    secrets_found=true
  fi

  # Tokens
  if git diff --cached | grep -iE "(auth[_-]?token|access[_-]?token)" | grep -vE "^\-|^@@|process\.env\."; then
    print_warning "Potential tokens found in staged changes"
    secrets_found=true
  fi

  if [ "$secrets_found" = true ]; then
    print_error "Secrets detected in staged changes"
    security_passed=false
  else
    print_success "No secrets found in staged changes"
  fi

  if [ "$security_passed" = true ]; then
    return 0
  else
    return 1
  fi
}

###############################################################################
# Architecture Compliance Check
###############################################################################

run_architecture_check() {
  print_header "Architecture Compliance Check"

  local arch_report="$REPORT_DIR/architecture_$TIMESTAMP.txt"
  local violations=0

  {
    # Check agents extend BaseAgent
    print_info "Checking agents extend BaseAgent..."
    for file in $(find "$PROJECT_ROOT/agents/implementations" -name "*.ts" 2>/dev/null); do
      if grep -q "class.*Agent" "$file"; then
        if ! grep -q "extends BaseAgent" "$file"; then
          print_warning "$file: Agent class does not extend BaseAgent"
          violations=$((violations + 1))
        fi
      fi
    done

    # Check MCP servers use SDK
    print_info "Checking MCP servers use @modelcontextprotocol/sdk..."
    for file in $(find "$PROJECT_ROOT/mcp-servers" -name "*.ts" 2>/dev/null); do
      if grep -q "createServer" "$file"; then
        if ! grep -q "@modelcontextprotocol/sdk" "$file"; then
          print_warning "$file: MCP server does not use @modelcontextprotocol/sdk"
          violations=$((violations + 1))
        fi
      fi
    done

    # Check API routes have error handling
    print_info "Checking API routes have error handling..."
    for file in $(find "$PROJECT_ROOT/app/api" -name "route.ts" 2>/dev/null); do
      if ! grep -q "try\|catch" "$file"; then
        print_warning "$file: API route missing try/catch error handling"
        violations=$((violations + 1))
      fi
    done
  } | tee "$arch_report"

  if [ "$violations" -eq 0 ]; then
    print_success "Architecture compliance check passed"
    return 0
  else
    print_warning "Found $violations architecture violations - see $arch_report"
    return 1
  fi
}

###############################################################################
# Generate Review Summary
###############################################################################

generate_review_summary() {
  local validation_status=$1
  local type_check_status=$2
  local lint_status=$3
  local unit_tests_status=$4
  local coverage_status=$5
  local pr_review_status=$6
  local security_status=$7
  local architecture_status=$8

  local summary_file="$REPORT_DIR/review-summary_$TIMESTAMP.md"

  cat > "$summary_file" << EOF
# 🤖 Automated PR Code Review Summary

**Date**: $(date +"%Y-%m-%d %H:%M:%S")
**Branch**: $(git branch --show-current)
**Commit**: $(git rev-parse --short HEAD)
**Author**: $(git config user.name)

---

## 📊 Review Results

| Check | Status |
|-------|--------|
| Code Validation (morpheus-validator) | $([ "$validation_status" -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL") |
| Type Check | $([ "$type_check_status" -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL") |
| Lint | $([ "$lint_status" -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL") |
| Unit Tests | $([ "$unit_tests_status" -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL") |
| Test Coverage (≥75%) | $([ "$coverage_status" -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL") |
| PR Review Coordinator | $([ "$pr_review_status" -eq 0 ] && echo "✅ PASS" || echo "⚠️ WARNINGS") |
| Security Review | $([ "$security_status" -eq 0 ] && echo "✅ PASS" || echo "⚠️ ISSUES") |
| Architecture Compliance | $([ "$architecture_status" -eq 0 ] && echo "✅ PASS" || echo "⚠️ VIOLATIONS") |

---

## 🎯 Overall Assessment

EOF

  local all_passed=true
  [ "$validation_status" -ne 0 ] && all_passed=false
  [ "$type_check_status" -ne 0 ] && all_passed=false
  [ "$lint_status" -ne 0 ] && all_passed=false
  [ "$unit_tests_status" -ne 0 ] && all_passed=false
  [ "$coverage_status" -ne 0 ] && all_passed=false

  if [ "$all_passed" = true ]; then
    cat >> "$summary_file" << EOF
**Status**: ✅ **APPROVED**

All required checks passed. This PR meets the quality standards defined in the workflow.

### Next Steps:
1. Request human code review
2. Address any feedback
3. Merge to target branch following workflow Phase 9

EOF
  else
    cat >> "$summary_file" << EOF
**Status**: ⚠️ **NEEDS WORK**

Some checks failed. Please review the reports and address the issues before merging.

### Required Actions:
1. Fix all failing checks
2. Re-run automated review
3. Ensure all checks pass before requesting human review

EOF
  fi

  cat >> "$summary_file" << EOF
---

## 📄 Detailed Reports

All detailed reports are available in: \`.github/pr-reviews/\`

- Validation Report: \`validation_$TIMESTAMP.txt\`
- Type Check Report: \`type-check_$TIMESTAMP.txt\`
- Lint Report: \`lint_$TIMESTAMP.txt\`
- Unit Test Report: \`unit-tests_$TIMESTAMP.txt\`
- Coverage Report: \`coverage_$TIMESTAMP.txt\`
- PR Review Report: \`pr-review_$TIMESTAMP.txt\`
- Security Report: \`security_$TIMESTAMP.txt\`
- Architecture Report: \`architecture_$TIMESTAMP.txt\`

---

## 📚 Resources

- [Git Workflow Documentation](./.claude/commands/git-branch-tree-pr-code-review-workflow.md)
- [Agent Creation Guidelines](./docs/AGENTS.md)
- [System Architecture](./docs/SYSTEM_ARCHITECTURE.md)

---

*Generated by PR Review Automation Script*
*Workflow: Phase 7 (Final PR Review)*
EOF

  echo "$summary_file"
}

###############################################################################
# Main Execution
###############################################################################

main() {
  print_header "🤖 PR Code Review Automation"
  print_info "Based on: git-branch-tree-pr-code-review-workflow.md"
  print_info "Phase 7: Final PR Review - Code Review Agent\n"

  # Check prerequisites
  check_prerequisites

  # Track results
  local validation_status=0
  local type_check_status=0
  local lint_status=0
  local unit_tests_status=0
  local coverage_status=0
  local pr_review_status=0
  local security_status=0
  local architecture_status=0

  # Run all checks
  run_code_validation || validation_status=$?
  run_type_check || type_check_status=$?
  run_lint || lint_status=$?
  run_unit_tests || unit_tests_status=$?
  run_test_coverage || coverage_status=$?
  run_pr_review_coordinator || pr_review_status=$?
  run_security_checks || security_status=$?
  run_architecture_check || architecture_status=$?

  # Generate summary
  print_header "Generating Review Summary"
  local summary_file=$(generate_review_summary \
    "$validation_status" \
    "$type_check_status" \
    "$lint_status" \
    "$unit_tests_status" \
    "$coverage_status" \
    "$pr_review_status" \
    "$security_status" \
    "$architecture_status")

  print_success "Review summary generated: $summary_file"

  # Display summary
  echo ""
  cat "$summary_file"

  # Determine exit code
  if [ "$validation_status" -eq 0 ] && \
     [ "$type_check_status" -eq 0 ] && \
     [ "$lint_status" -eq 0 ] && \
     [ "$unit_tests_status" -eq 0 ] && \
     [ "$coverage_status" -eq 0 ]; then
    print_header "✅ PR Code Review PASSED"
    print_success "All required checks passed!"
    print_info "This PR is ready for human review and merge."
    exit 0
  else
    print_header "❌ PR Code Review FAILED"
    print_error "Some checks failed. Please review and fix the issues."
    print_info "See detailed reports in: .github/pr-reviews/"
    exit 1
  fi
}

# Run main function
main "$@"
