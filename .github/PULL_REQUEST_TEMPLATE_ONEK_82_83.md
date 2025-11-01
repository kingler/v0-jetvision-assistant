# Tool Execution with Retry Logic and Streaming Integration

**Issues**: ONEK-82, ONEK-83
**Branch**: `feat/ONEK-82-83-tool-execution-retry-and-integration`

---

## 📋 Summary

Implements robust tool execution with exponential backoff retry logic and integrates it into the OpenAI streaming response workflow, completing the end-to-end RFP processing pipeline.

This PR enables the Orchestrator Agent to reliably execute MCP tools (Avinode, Supabase, Gmail) with automatic retry on transient failures and seamless integration into GPT-5's streaming conversational flow.

---

## 🎯 Changes

### ONEK-82: Retry Logic and Error Handling

**Implementation:**
- ✅ `executeToolWithRetry()` - Wrapper function with exponential backoff retry mechanism
- ✅ `isRetryableError()` - Error classification to distinguish transient vs permanent failures
- ✅ Configurable retry options: `maxRetries` (default: 3), `baseDelay` (default: 1000ms)
- ✅ Exponential backoff timing: 1000ms, 2000ms, 4000ms for attempts 1, 2, 3
- ✅ New SSE event type: `tool_call_retry` with retry metadata

**Error Classification:**
- **Retryable Errors** (will retry): Network errors (ECONNREFUSED, ETIMEDOUT, ENOTFOUND, ECONNRESET), HTTP 503/504, timeout errors
- **Permanent Errors** (no retry): Validation errors, HTTP 400/401/404, tool not found

**Testing:**
- ✅ 28 comprehensive test cases in `execute-tool-with-retry.test.ts`
- ✅ Tests verify exponential backoff timing accuracy
- ✅ Tests cover all error types and retry scenarios

### ONEK-83: Streaming Integration

**Implementation:**
- ✅ Multi-turn conversation loop with `MAX_TOOL_DEPTH = 5` to prevent infinite loops
- ✅ Detects `finish_reason === 'tool_calls'` from GPT-5 streaming response
- ✅ Parses and executes all requested tools using `executeToolWithRetry()`
- ✅ Adds tool results to conversation history with `role: 'tool'`
- ✅ Continues streaming with updated conversation context
- ✅ Graceful error handling (adds error messages to conversation for GPT-5)

**Client-Side Integration:**
- ✅ Updated `use-streaming-response.ts` hook to handle retry events
- ✅ Added event handlers: `tool_call_retry`, `tool_call_result`, `tool_call_error`
- ✅ Client-side logging for retry attempts and tool execution status

---

## 🔄 End-to-End Workflow

```
User Message
  ↓
GPT-5 Streaming (with MCP tools available)
  ↓
Detects finish_reason: 'tool_calls'
  ↓
Parse tool call arguments (JSON)
  ↓
executeToolWithRetry() with exponential backoff
  ├─ Attempt 1 (immediate)
  ├─ Attempt 2 (after 1s if retryable error)
  ├─ Attempt 3 (after 2s if retryable error)
  └─ Attempt 4 (after 4s if retryable error)
  ↓
Add tool results to conversation (role: 'tool')
  ↓
Continue GPT-5 streaming with tool context
  ↓
Stream final response to client
```

---

## 📁 Files Modified

### Core Implementation
- **`app/api/chat/respond/route.ts`** (204 lines added)
  - Added `executeTool()` base function (ONEK-81)
  - Added `isRetryableError()` error classifier
  - Added `executeToolWithRetry()` with exponential backoff
  - Rewrote streaming loop for multi-turn tool calling
  - Added SSE event types: `tool_call_retry`, `tool_call_result`, `tool_call_error`

### Client-Side Integration
- **`hooks/use-streaming-response.ts`** (30 lines modified)
  - Added `tool_call_retry` event handler (logs retry attempts)
  - Added `tool_call_result` event handler (logs successful results)
  - Added `tool_call_error` event handler (updates tool status)

### Testing
- **`__tests__/unit/api/chat/execute-tool-with-retry.test.ts`** (601 lines, NEW)
  - 28 comprehensive test cases
  - Test categories:
    - Successful execution on first try
    - Retry on transient errors (network, timeout, 503/504)
    - No retry on permanent errors (validation, 400/401/404)
    - Exponential backoff timing verification
    - Max retries exceeded handling
    - Custom retry configuration
    - Error classification (retryable vs permanent)

---

## ✅ Testing

### Unit Tests (28 test cases)

**Successful Execution:**
- ✅ Should execute tool successfully on first try
- ✅ Should parse JSON tool result correctly
- ✅ Should emit tool_call_start and tool_call_result events

**Retry Logic:**
- ✅ Should retry on network error (ECONNREFUSED)
- ✅ Should retry on timeout error (ETIMEDOUT)
- ✅ Should retry on 503 Service Unavailable
- ✅ Should retry on 504 Gateway Timeout
- ✅ Should use exponential backoff (1s, 2s, 4s)
- ✅ Should emit tool_call_retry events with correct metadata

**Permanent Errors (No Retry):**
- ✅ Should NOT retry on validation error (400)
- ✅ Should NOT retry on authentication error (401)
- ✅ Should NOT retry on not found error (404)
- ✅ Should NOT retry on tool not found error

**Max Retries:**
- ✅ Should fail after max retries exceeded
- ✅ Should throw last error when all retries exhausted

**Configuration:**
- ✅ Should respect custom maxRetries option
- ✅ Should respect custom baseDelay option
- ✅ Should use default values when not specified

**Error Classification:**
- ✅ isRetryableError() should correctly classify all error types

### Manual Testing Checklist

- [ ] Test single tool call flow (e.g., "Search for available flights")
- [ ] Test multi-turn tool calling (tool → result → tool → result)
- [ ] Test retry on simulated network failure
- [ ] Test max depth prevention (5 levels)
- [ ] Verify SSE events streamed to client
- [ ] Test graceful error handling on permanent failures
- [ ] Verify exponential backoff timing in browser console

---

## 🔗 Dependencies

**Requires (Completed):**
- ✅ ONEK-71: Mock Data Infrastructure
- ✅ ONEK-72: stdio Process Spawning
- ✅ ONEK-79: MCP Client Integration
- ✅ ONEK-80: MCP Health Check
- ✅ ONEK-81: executeTool Function

**Enables (Next):**
- 🔜 ONEK-84: Orchestrator Agent Implementation
- 🔜 ONEK-85: Complete RFP Processing Pipeline
- 🔜 Integration tests for end-to-end workflow

---

## 📊 Code Quality

**Style Guidelines:**
- ✅ Follows project TypeScript conventions
- ✅ Proper error handling and logging
- ✅ Comprehensive JSDoc comments
- ✅ Type safety (no `any` types)
- ✅ Consistent naming conventions

**Performance:**
- ✅ Exponential backoff prevents rapid retry storms
- ✅ Max depth limit prevents infinite loops
- ✅ Efficient SSE streaming (no buffering delays)

**Security:**
- ✅ Input validation for tool arguments
- ✅ Error messages sanitized (no sensitive data)
- ✅ Configurable retry limits

---

## 🚀 Deployment Notes

**Environment Variables:**
No new environment variables required.

**Breaking Changes:**
None. Backward compatible with existing code.

**Rollback Plan:**
Revert commits `ca6188d` and `2d6e29a` if issues arise.

---

## 📝 Checklist

- [x] Code follows project style guidelines
- [x] Tests added and passing (28/28)
- [x] Documentation updated (Linear comments)
- [x] No breaking changes
- [x] Error handling implemented
- [x] Logging added for debugging
- [x] SSE events properly structured
- [x] Client-side integration complete
- [x] Ready for review

---

## 🔗 Related Issues

- **Closes** [ONEK-82](https://linear.app/designthru-ai/issue/ONEK-82): Add Retry Logic and Error Handling for Tool Execution
- **Closes** [ONEK-83](https://linear.app/designthru-ai/issue/ONEK-83): Integrate Tool Execution into OpenAI Streaming Loop

---

## 👥 Reviewers

Please review:
1. Retry logic and exponential backoff implementation
2. Error classification accuracy
3. Streaming integration correctness
4. Test coverage completeness
5. SSE event structure

---

🤖 **Generated with Claude Code**

Co-Authored-By: Claude <noreply@anthropic.com>
