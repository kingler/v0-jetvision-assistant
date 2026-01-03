# Step 3 RFQ Manual Fetch - Test Plan

**Feature**: Manual RFQ fetching for Step 3
**Date**: 2026-01-03
**Status**: Ready for Testing

## Overview

This test plan covers the manual RFQ fetch functionality that allows users to load RFQs created in the Avinode Marketplace web UI by clicking the "View RFQs" button.

## Pre-Test Setup

### 1. Environment Setup
```bash
# Ensure environment variables are set
cp .env.example .env.local
# Add your Avinode API credentials

# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. Test Data Requirements
- Valid Avinode API credentials
- At least one Trip ID with RFQs created in Avinode Marketplace
- Example Trip IDs: `atrip-64956150`, `B22E7Z`, `QQ263P`

## Test Cases

### Test 1: Manual Fetch Button ✅

**Objective**: Verify "View RFQs" button works correctly

**Steps**:
1. Create a chat session with a Trip ID
2. Observe button text: "View RFQs"
3. Click the button to load RFQs
4. Verify RFQs are displayed
5. Create a new RFQ in Avinode Marketplace
6. Click "View RFQs" button again
7. Verify new RFQ appears

**Expected Results**:
- ✅ Button text always shows: "View RFQs"
- ✅ During loading: "Loading RFQs..." with spinner
- ✅ Manual click fetches latest RFQs
- ✅ Button remains clickable at all times

**Actual Results**: _[To be filled during testing]_

---

### Test 2: Last Updated Timestamp ✅

**Objective**: Verify timestamp displays correctly

**Steps**:
1. Click "View RFQs" to load RFQs for a Trip ID
2. Observe "Last updated" timestamp appears
3. Wait 2 minutes
4. Observe timestamp shows "2 minutes ago"
5. Click "View RFQs" again
6. Verify timestamp resets to "Just now"

**Expected Results**:
- ✅ Timestamp appears next to "View RFQs" button
- ✅ Shows "Just now" immediately after fetch
- ✅ Shows "X minutes ago" after time passes
- ✅ Shows "X hours ago" after 1+ hours
- ✅ Resets to "Just now" after manual refresh

**Actual Results**: _[To be filled during testing]_

---

### Test 3: Empty State Handling ✅

**Objective**: Verify behavior when no RFQs exist

**Steps**:
1. Create a Trip ID with no RFQs in Avinode
2. Click "View RFQs" button
3. Observe Step 3 section

**Expected Results**:
- ✅ Shows "No RFQs available" message
- ✅ Button click returns empty array
- ✅ No errors in console

**Actual Results**: _[To be filled during testing]_

---

### Test 4: Error Handling ✅

**Objective**: Verify graceful error handling

**Steps**:
1. Disconnect from internet
2. Click "View RFQs" button
3. Reconnect internet
4. Click "View RFQs" again

**Expected Results**:
- ✅ UI doesn't crash
- ✅ Error message displayed to user
- ✅ User can retry with "View RFQs" button

**Actual Results**: _[To be filled during testing]_

---

### Test 5: Multiple Chat Sessions ✅

**Objective**: Verify button works correctly with multiple sessions

**Steps**:
1. Create Chat Session A with Trip ID A
2. Create Chat Session B with Trip ID B
3. Switch between sessions
4. Click "View RFQs" in each session

**Expected Results**:
- ✅ Each session loads its own RFQs
- ✅ No cross-session data contamination
- ✅ Timestamp is session-specific

**Actual Results**: _[To be filled during testing]_

---

## Performance Checks

- [ ] No excessive API calls (only on button click)
- [ ] Page remains responsive
- [ ] Network tab shows requests only when button is clicked

## Regression Testing

- [ ] Existing manual Trip ID submission still works
- [ ] Chat message parsing still extracts Trip IDs
- [ ] Step 1 and Step 2 functionality unaffected
- [ ] Step 4 proposal generation still works
- [ ] RFQ selection and booking flow intact

## Test Environment

- **Browser**: Chrome/Firefox/Safari
- **Node Version**: 18+
- **Next.js Version**: 14
- **Test Date**: _[To be filled]_
- **Tester**: _[To be filled]_

## Sign-Off

- [ ] All test cases passed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Ready for production deployment

**Tested By**: _______________
**Date**: _______________
**Signature**: _______________
