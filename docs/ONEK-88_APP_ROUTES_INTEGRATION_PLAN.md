# App Routes Integration Plan - ChatKit Migration

**Issue**: ONEK-88 - Update App Routes for ChatKit Integration
**Date**: 2025-11-01
**Status**: DESIGN PHASE
**Dependencies**: ONEK-84 (Dependencies), ONEK-85 (Session API), ONEK-86 (Workflow), ONEK-87 (Component)

---

## Executive Summary

This document outlines the integration plan for replacing the custom `ChatInterface` component with the new `ChatKitInterface` component throughout the Jetvision Multi-Agent System application routes. The migration will use a feature flag strategy for gradual rollout and easy rollback.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Integration Strategy](#integration-strategy)
3. [File Modifications](#file-modifications)
4. [Feature Flag Implementation](#feature-flag-implementation)
5. [Migration Steps](#migration-steps)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)

---

## 1. Current State Analysis

### 1.1 Current Implementation

**Main App Route** (`app/page.tsx`):
- Line 5: Imports `ChatInterface` from `@/components/chat-interface`
- Line 194-200: Renders `<ChatInterface>` in chat view
- Uses custom state management for chat sessions
- Integrates with ChatSidebar, WorkflowVisualization, SettingsPanel

**Layout** (`app/layout.tsx`):
- Basic Next.js App Router layout
- Clerk authentication provider
- Theme provider
- No ChatKit script yet

**Component Structure**:
```typescript
{currentView === "chat" && activeChat && (
  <ChatInterface
    activeChat={activeChat}
    isProcessing={isProcessing}
    onProcessingChange={setIsProcessing}
    onViewWorkflow={() => setCurrentView("workflow")}
    onUpdateChat={handleUpdateChat}
  />
)}
```

### 1.2 Required Changes

**Changes Needed**:
1. Add ChatKit script to `app/layout.tsx`
2. Update `app/page.tsx` to conditionally use ChatKitInterface
3. Implement feature flag system
4. Add environment variable configuration
5. Update imports and component usage
6. Preserve existing chat state management
7. Maintain integration with WorkflowVisualization, QuoteCard, ProposalPreview

---

## 2. Integration Strategy

### 2.1 Feature Flag Approach

**Environment Variable**: `NEXT_PUBLIC_USE_CHATKIT`

```env
# .env.local
NEXT_PUBLIC_USE_CHATKIT=false  # Default: use old interface
NEXT_PUBLIC_USE_CHATKIT=true   # Enable ChatKit
```

**Runtime Toggle**: Allow switching without rebuild

```typescript
const useChatKit = process.env.NEXT_PUBLIC_USE_CHATKIT === 'true';
```

### 2.2 Gradual Rollout Strategy

**Phase 1: Internal Testing** (1-2 days)
- Enable for internal users only
- Test all features
- Monitor for issues
- Gather feedback

**Phase 2: Beta Users** (3-5 days)
- Roll out to 10% of users
- Monitor metrics (performance, errors, UX)
- Collect user feedback
- Fix any issues

**Phase 3: Staged Rollout** (1-2 weeks)
- Increase to 25% → 50% → 75% → 100%
- Monitor at each stage
- Ensure no regressions
- Maintain rollback capability

**Phase 4: Full Migration** (after validation)
- Set default to ChatKit
- Deprecate old interface
- Remove feature flag (future cleanup)

### 2.3 Compatibility Requirements

**Must Preserve**:
- ✅ Clerk authentication flow
- ✅ Chat session state management
- ✅ Workflow visualization integration
- ✅ Quote card rendering
- ✅ Proposal preview functionality
- ✅ Settings panel access
- ✅ Mobile responsiveness
- ✅ Dark mode support

**Must Add**:
- ✅ ChatKit session initialization
- ✅ Chain-of-thought visualization
- ✅ File upload for RFP documents
- ✅ Enhanced agent workflow display

---

## 3. File Modifications

### 3.1 Update `app/layout.tsx`

**Current Structure**:
```typescript
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider attribute="class" defaultTheme="dark">
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

**New Structure** (with ChatKit script):
```typescript
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const useChatKit = process.env.NEXT_PUBLIC_USE_CHATKIT === 'true';

  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {useChatKit && (
            <script
              async
              src="https://cdn.jsdelivr.net/npm/@openai/chatkit@latest/dist/chatkit.umd.js"
            />
          )}
        </head>
        <body className={inter.className}>
          <ThemeProvider attribute="class" defaultTheme="dark">
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

**Changes**:
- Add `<head>` section with conditional ChatKit script
- Load ChatKit CDN only when feature flag enabled
- Use async loading for performance

### 3.2 Update `app/page.tsx`

**Current Import**:
```typescript
import { ChatInterface } from "@/components/chat-interface"
```

**New Imports** (conditional):
```typescript
import { ChatInterface } from "@/components/chat-interface"
import { ChatKitInterface } from "@/components/chatkit-interface"  // NEW
```

**Current Render**:
```typescript
{currentView === "chat" && activeChat && (
  <ChatInterface
    activeChat={activeChat}
    isProcessing={isProcessing}
    onProcessingChange={setIsProcessing}
    onViewWorkflow={() => setCurrentView("workflow")}
    onUpdateChat={handleUpdateChat}
  />
)}
```

**New Render** (with feature flag):
```typescript
{currentView === "chat" && activeChat && (
  <>
    {process.env.NEXT_PUBLIC_USE_CHATKIT === 'true' ? (
      <ChatKitInterface
        activeChat={activeChat}
        isProcessing={isProcessing}
        onProcessingChange={setIsProcessing}
        onViewWorkflow={() => setCurrentView("workflow")}
        onUpdateChat={handleUpdateChat}
        workflowId={process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID || ''}
      />
    ) : (
      <ChatInterface
        activeChat={activeChat}
        isProcessing={isProcessing}
        onProcessingChange={setIsProcessing}
        onViewWorkflow={() => setCurrentView("workflow")}
        onUpdateChat={handleUpdateChat}
      />
    )}
  </>
)}
```

**Changes**:
- Add conditional rendering based on feature flag
- Pass `workflowId` prop to ChatKitInterface
- Maintain same props interface for compatibility
- Preserve chat state management logic

### 3.3 Environment Variables

**Add to `.env.local`**:
```env
# ChatKit Configuration (Phase 1 - MCP-UI + ChatKit Integration)
NEXT_PUBLIC_USE_CHATKIT=false
NEXT_PUBLIC_CHATKIT_WORKFLOW_ID=wf-xxxxxxxxxxxxxxxx
```

**Production `.env.production`**:
```env
NEXT_PUBLIC_USE_CHATKIT=true  # After successful rollout
NEXT_PUBLIC_CHATKIT_WORKFLOW_ID=wf-production-workflow-id
```

### 3.4 Type Definitions Update

**Add to `lib/types/chatkit.ts`** (if not exists):
```typescript
export interface ChatKitInterfaceProps {
  activeChat: ChatSession;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
  onViewWorkflow: () => void;
  onUpdateChat: (chatId: string, updates: Partial<ChatSession>) => void;
  workflowId: string;
}
```

---

## 4. Feature Flag Implementation

### 4.1 Feature Flag Hook

**Create** `hooks/use-chatkit-feature-flag.ts`:
```typescript
import { useEffect, useState } from 'react';

export function useChatKitFeatureFlag() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check environment variable
    const envFlag = process.env.NEXT_PUBLIC_USE_CHATKIT === 'true';

    // Optional: Check localStorage for user-specific override (admin only)
    const localOverride = localStorage.getItem('chatkit_override');

    setEnabled(localOverride !== null ? localOverride === 'true' : envFlag);
    setLoading(false);
  }, []);

  return { enabled, loading };
}
```

**Usage in `app/page.tsx`**:
```typescript
const { enabled: useChatKit, loading: featureFlagLoading } = useChatKitFeatureFlag();

if (featureFlagLoading) {
  return <LoadingSpinner />;
}

// Then use `useChatKit` instead of env var check
```

### 4.2 Admin Toggle (Optional)

**Add to Settings Panel** (`components/settings-panel.tsx`):
```typescript
<div className="p-4 border rounded">
  <h3 className="font-semibold mb-2">Beta Features</h3>
  <label className="flex items-center space-x-2">
    <input
      type="checkbox"
      checked={useChatKit}
      onChange={(e) => {
        localStorage.setItem('chatkit_override', e.target.checked.toString());
        window.location.reload();
      }}
    />
    <span>Enable ChatKit Interface (Beta)</span>
  </label>
</div>
```

---

## 5. Migration Steps

### Step 1: Preparation (Before Implementation)
- [ ] Ensure ONEK-84, 85, 86, 87 PRs are merged
- [ ] ChatKit component implemented and tested
- [ ] Workflow ID configured in Agent Builder
- [ ] Session endpoint deployed and working

### Step 2: Environment Setup
- [ ] Add `NEXT_PUBLIC_USE_CHATKIT=false` to .env.local
- [ ] Add `NEXT_PUBLIC_CHATKIT_WORKFLOW_ID` to .env.local
- [ ] Verify environment variables load correctly

### Step 3: Code Changes
- [ ] Update `app/layout.tsx` with ChatKit script
- [ ] Update `app/page.tsx` with conditional rendering
- [ ] Add feature flag hook
- [ ] Update type definitions
- [ ] Verify imports resolve correctly

### Step 4: Testing (Internal)
- [ ] Test with feature flag OFF (old interface)
- [ ] Test with feature flag ON (new interface)
- [ ] Verify chat sessions work in both modes
- [ ] Test workflow visualization integration
- [ ] Test quote cards and proposal preview
- [ ] Test mobile responsiveness
- [ ] Test dark mode switching
- [ ] Verify no console errors

### Step 5: Beta Rollout
- [ ] Enable for 10% of users via server-side flag
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Gather user feedback
- [ ] Fix any critical issues

### Step 6: Gradual Rollout
- [ ] Increase to 25% after 2 days
- [ ] Increase to 50% after 1 week
- [ ] Increase to 75% after 2 weeks
- [ ] Increase to 100% after 3 weeks
- [ ] Monitor at each stage

### Step 7: Cleanup (Future)
- [ ] Set default to ChatKit in production
- [ ] Remove feature flag code
- [ ] Archive old ChatInterface component
- [ ] Update documentation

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Test Files to Create**:
```
__tests__/unit/hooks/use-chatkit-feature-flag.test.ts
__tests__/unit/app/page.test.tsx (update existing)
__tests__/unit/app/layout.test.tsx (update existing)
```

**Test Cases**:
- ✅ Feature flag correctly reads environment variable
- ✅ Correct component renders based on flag
- ✅ ChatKit script loads when flag enabled
- ✅ ChatKit script does not load when flag disabled
- ✅ Props pass correctly to both interfaces
- ✅ State management works with both interfaces

### 6.2 Integration Tests

**Test Scenarios**:
1. **Complete Chat Flow (Old Interface)**:
   - Start chat
   - Send messages
   - View workflow
   - Select quote
   - View proposal
   - Verify all features work

2. **Complete Chat Flow (New Interface)**:
   - Same test as above with ChatKit
   - Additionally test chain-of-thought
   - Test file uploads
   - Test enhanced workflow display

3. **Feature Flag Toggle**:
   - Switch between interfaces
   - Verify state persists
   - Verify no data loss
   - Verify smooth transition

### 6.3 E2E Tests

**Playwright Test Suites**:
```typescript
// __tests__/e2e/chatkit-integration.spec.ts
test.describe('ChatKit Integration', () => {
  test('should render old interface when flag disabled', async ({ page }) => {
    // Set env var to false
    // Load app
    // Verify ChatInterface renders
    // Verify ChatKit script not loaded
  });

  test('should render new interface when flag enabled', async ({ page }) => {
    // Set env var to true
    // Load app
    // Verify ChatKitInterface renders
    // Verify ChatKit script loaded
  });

  test('should complete full RFP workflow with ChatKit', async ({ page }) => {
    // Enable flag
    // Start chat
    // Submit RFP
    // Verify workflow steps
    // Check quotes
    // View proposal
    // Verify all features work
  });
});
```

### 6.4 Performance Testing

**Metrics to Monitor**:
- Time to Interactive (TTI): Should be < 3s
- First Contentful Paint (FCP): Should be < 1.5s
- Bundle size increase: Should be < 50KB (gzipped)
- Memory usage: Monitor for leaks
- Network requests: Optimize API calls

**Tools**:
- Lighthouse CI
- WebPageTest
- Chrome DevTools Performance tab
- Bundle analyzer

---

## 7. Rollback Plan

### 7.1 Immediate Rollback (Critical Issues)

**If critical bug discovered**:
```bash
# Production quick rollback
export NEXT_PUBLIC_USE_CHATKIT=false
# Redeploy immediately
vercel --prod
```

**Expected downtime**: < 2 minutes

### 7.2 Gradual Rollback (Non-Critical Issues)

**If issues found during rollout**:
1. Reduce percentage of users
2. Investigate and fix issues
3. Resume rollout when fixed

### 7.3 Rollback Checklist

**Before Rollback**:
- [ ] Document the issue
- [ ] Capture error logs
- [ ] Take screenshots
- [ ] Note affected users

**During Rollback**:
- [ ] Set feature flag to false
- [ ] Redeploy application
- [ ] Verify old interface working
- [ ] Monitor error rates

**After Rollback**:
- [ ] Investigate root cause
- [ ] Create fix
- [ ] Test fix thoroughly
- [ ] Plan new rollout

---

## Summary

**Files to Modify**: 2 main files
1. `app/layout.tsx` - Add ChatKit script
2. `app/page.tsx` - Add conditional rendering

**Files to Create**: 3 support files
1. `hooks/use-chatkit-feature-flag.ts` - Feature flag hook
2. `docs/CHATKIT_MIGRATION_GUIDE.md` - User-facing guide
3. Additional test files

**Environment Variables**: 2 new variables
1. `NEXT_PUBLIC_USE_CHATKIT` - Feature flag
2. `NEXT_PUBLIC_CHATKIT_WORKFLOW_ID` - Workflow ID (already exists)

**Timeline**:
- Code changes: 1 day
- Testing: 2 days
- Beta rollout: 1 week
- Full rollout: 3-4 weeks
- **Total**: ~5-6 weeks from start to 100% rollout

**Success Criteria**:
- ✅ Zero regression in existing features
- ✅ Successful ChatKit integration
- ✅ Smooth user experience
- ✅ Performance targets met
- ✅ No critical bugs
- ✅ Positive user feedback

---

**Dependencies**: ONEK-84, ONEK-85, ONEK-86, ONEK-87 (all must be complete)
**Blocks**: None (final Phase 1 issue)
**Related**: Phase 1 - ChatKit Frontend Integration (Complete after this)
