#!/bin/bash

# Validation script for ONEK-82 and ONEK-83 implementation
# Checks that all required files exist and have the expected functions

set -e

echo "🔍 Validating Tool Execution with Retry Logic Implementation"
echo "============================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from project root${NC}"
    exit 1
fi

# Validation counters
PASSED=0
FAILED=0

# Helper function to check
check_file_exists() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} File exists: $file"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌${NC} File missing: $file"
        ((FAILED++))
        return 1
    fi
}

check_function_exists() {
    local file=$1
    local function_name=$2
    if grep -q "$function_name" "$file"; then
        echo -e "${GREEN}✅${NC} Function found: $function_name in $file"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌${NC} Function missing: $function_name in $file"
        ((FAILED++))
        return 1
    fi
}

echo "📁 Checking Required Files..."
echo "----------------------------"
check_file_exists "app/api/chat/respond/route.ts"
check_file_exists "hooks/use-streaming-response.ts"
check_file_exists "__tests__/unit/api/chat/execute-tool-with-retry.test.ts"
echo ""

echo "🔧 Checking Core Functions..."
echo "----------------------------"
check_function_exists "app/api/chat/respond/route.ts" "executeTool"
check_function_exists "app/api/chat/respond/route.ts" "executeToolWithRetry"
check_function_exists "app/api/chat/respond/route.ts" "isRetryableError"
check_function_exists "app/api/chat/respond/route.ts" "MAX_TOOL_DEPTH"
echo ""

echo "🎯 Checking SSE Event Types..."
echo "----------------------------"
check_function_exists "app/api/chat/respond/route.ts" "tool_call_retry"
check_function_exists "app/api/chat/respond/route.ts" "tool_call_result"
check_function_exists "app/api/chat/respond/route.ts" "tool_call_error"
echo ""

echo "🪝 Checking Client-Side Handlers..."
echo "----------------------------"
check_function_exists "hooks/use-streaming-response.ts" "case 'tool_call_retry'"
check_function_exists "hooks/use-streaming-response.ts" "case 'tool_call_result'"
check_function_exists "hooks/use-streaming-response.ts" "case 'tool_call_error'"
echo ""

echo "🧪 Checking Test Coverage..."
echo "----------------------------"
if grep -q "executeToolWithRetry" "__tests__/unit/api/chat/execute-tool-with-retry.test.ts"; then
    echo -e "${GREEN}✅${NC} Test suite includes executeToolWithRetry tests"
    ((PASSED++))
else
    echo -e "${RED}❌${NC} Missing executeToolWithRetry tests"
    ((FAILED++))
fi

if grep -q "exponential backoff" "__tests__/unit/api/chat/execute-tool-with-retry.test.ts"; then
    echo -e "${GREEN}✅${NC} Test suite includes exponential backoff tests"
    ((PASSED++))
else
    echo -e "${RED}❌${NC} Missing exponential backoff tests"
    ((FAILED++))
fi

if grep -qi "retryable" "__tests__/unit/api/chat/execute-tool-with-retry.test.ts"; then
    echo -e "${GREEN}✅${NC} Test suite includes error classification tests"
    ((PASSED++))
else
    echo -e "${RED}❌${NC} Missing error classification tests"
    ((FAILED++))
fi
echo ""

echo "📊 Validation Summary"
echo "===================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All validations passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Create PR: https://github.com/kingler/v0-jetvision-assistant/pull/new/feat/ONEK-82-83-tool-execution-retry-and-integration"
    echo "2. Copy PR description from: .github/PULL_REQUEST_TEMPLATE_ONEK_82_83.md"
    echo "3. Request code review"
    echo "4. Run end-to-end tests"
    exit 0
else
    echo -e "${RED}❌ Validation failed. Please fix the issues above.${NC}"
    exit 1
fi
