# End-to-End Authentication Test Guide

## Test Environment
- **App URL**: http://localhost:3000
- **Status**: Development server running on port 3000

## Test Scenarios

### Test 1: Unauthenticated User Redirect ✅

**Steps:**
1. Open browser in incognito/private mode
2. Navigate to `http://localhost:3000`
3. **Expected**: Automatically redirected to `http://localhost:3000/sign-in`

**Verification Points:**
- [ ] URL changes from `/` to `/sign-in`
- [ ] Sign-in page displays with Clerk UI
- [ ] Page shows "Welcome to JetVision" heading
- [ ] Page shows "AI-powered private jet booking assistant" description
- [ ] Clerk sign-in form is visible
- [ ] "Don't have an account? Sign up" link is present

---

### Test 2: Sign-Up Page Navigation ✅

**Steps:**
1. From sign-in page, click "Sign up" link
2. **Expected**: Navigate to `http://localhost:3000/sign-up`

**Verification Points:**
- [ ] URL changes to `/sign-up`
- [ ] Sign-up page displays with Clerk UI
- [ ] Page shows "Join JetVision" heading
- [ ] Page shows "Create your account to start booking private jets with AI" description
- [ ] Clerk sign-up form is visible
- [ ] "Already have an account? Sign in" link is present

---

### Test 3: New User Registration ✅

**Steps:**
1. On sign-up page, fill in the form:
   - Email: `test+${Date.now()}@example.com`
   - Password: `TestPassword123!`
2. Click "Continue" or "Sign up"
3. Complete any verification steps (email verification, etc.)
4. **Expected**: Redirected to `http://localhost:3000/` (chat interface)

**Verification Points:**
- [ ] User successfully creates account
- [ ] Redirected to root `/` URL
- [ ] Chat interface loads
- [ ] Landing page shows (with "Start Chat" button)
- [ ] Sidebar is visible with chat sessions
- [ ] Header shows JetVision logo
- [ ] Settings button is visible
- [ ] **UserButton (avatar) is visible** in header next to Settings
- [ ] No redirect loop occurs

---

### Test 4: User Logout ✅

**Steps:**
1. While logged in, click on UserButton (avatar) in header
2. Click "Sign out" from dropdown menu
3. **Expected**: Redirected to `http://localhost:3000/sign-in`

**Verification Points:**
- [ ] UserButton dropdown appears when clicked
- [ ] "Sign out" option is visible
- [ ] After clicking sign out, user is logged out
- [ ] Redirected to `/sign-in` page
- [ ] Session is cleared (cookies removed)
- [ ] Attempting to visit `/` redirects back to `/sign-in`

---

### Test 5: Existing User Login ✅

**Steps:**
1. Navigate to `http://localhost:3000/sign-in`
2. Enter credentials from Test 3
3. Click "Continue" or "Sign in"
4. **Expected**: Redirected to `http://localhost:3000/` (chat interface)

**Verification Points:**
- [ ] User successfully logs in
- [ ] Redirected to root `/` URL
- [ ] Chat interface loads immediately
- [ ] User session is restored
- [ ] UserButton shows user avatar
- [ ] Can access all features (Settings, Chat, etc.)

---

### Test 6: Protected Route Access ✅

**Steps:**
1. Log out completely
2. Try to access `http://localhost:3000/dashboard`
3. **Expected**: Redirected to `http://localhost:3000/sign-in`

**Verification Points:**
- [ ] Cannot access `/dashboard` without authentication
- [ ] Automatically redirected to `/sign-in`
- [ ] After signing in, user is redirected to `/` (not `/dashboard`)
- [ ] Dashboard is bypassed in authentication flow

---

### Test 7: Chat Interface Functionality ✅

**Steps:**
1. Log in successfully
2. Verify chat interface elements
3. Test basic interactions

**Verification Points:**
- [ ] Sidebar toggle button works
- [ ] "New Chat" button in sidebar works
- [ ] Settings button opens settings panel
- [ ] Chat interface is responsive
- [ ] Landing page shows correctly
- [ ] Can start a new chat
- [ ] UserButton is always visible
- [ ] No console errors in browser

---

### Test 8: Session Persistence ✅

**Steps:**
1. Log in successfully
2. Close browser tab
3. Reopen browser and navigate to `http://localhost:3000`
4. **Expected**: Should remain logged in (if session is active)

**Verification Points:**
- [ ] User remains logged in after closing tab
- [ ] Chat interface loads without redirect to sign-in
- [ ] Session persists across page reloads
- [ ] UserButton shows correct user avatar

---

### Test 9: Mobile Responsiveness 🔄

**Steps:**
1. Resize browser to mobile dimensions (375px width)
2. Test authentication flow on mobile

**Verification Points:**
- [ ] Sign-in page is mobile responsive
- [ ] Sign-up page is mobile responsive
- [ ] Chat interface works on mobile
- [ ] Sidebar collapses on mobile
- [ ] UserButton is accessible on mobile
- [ ] Forms are usable on small screens

---

### Test 10: Error Handling ✅

**Steps:**
1. Try to sign in with incorrect credentials
2. Try to sign up with existing email
3. Try to sign up with weak password

**Verification Points:**
- [ ] Invalid credentials show error message
- [ ] Duplicate email shows appropriate error
- [ ] Weak password shows validation error
- [ ] Errors are user-friendly
- [ ] No crashes or blank screens

---

## Quick Test Checklist

Use this for rapid verification:

```
□ Root URL redirects to /sign-in when not authenticated
□ Sign-in page loads correctly with Clerk UI
□ Sign-up link navigates to /sign-up
□ Sign-up page loads correctly with Clerk UI
□ Can create new account
□ After signup, redirected to / (chat interface)
□ Chat interface loads with all elements
□ UserButton is visible in header
□ UserButton dropdown contains "Sign out"
□ Sign out redirects to /sign-in
□ Can sign in with existing credentials
□ After login, redirected to / (chat interface)
□ Protected routes redirect to /sign-in
□ Session persists on page reload
□ No console errors
```

---

## Expected User Interface

### Sign-In Page
```
┌─────────────────────────────────────┐
│                                     │
│         Welcome to JetVision        │
│   AI-powered private jet booking    │
│                                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │   [Clerk Sign-In Component]   │  │
│  │                               │  │
│  │   Email: ________________     │  │
│  │   Password: _____________     │  │
│  │                               │  │
│  │   [ Continue ]                │  │
│  │                               │  │
│  │   Don't have account? Sign up │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Chat Interface (After Login)
```
┌──────────────────────────────────────────────────┐
│ [☰] [JetVision Logo] AI-powered Private Jet...   │
│                         [Settings] [👤 Avatar]   │
├──────────────────────────────────────────────────┤
│ [Sidebar]  │  [Main Chat Interface]              │
│            │                                      │
│ Open Chats │  Welcome message or active chat     │
│ [+ New]    │                                      │
│            │                                      │
│ Flight #1  │                                      │
│ Flight #2  │                                      │
│            │                                      │
└────────────┴──────────────────────────────────────┘
```

---

## Automated Test Commands

### Using curl to check endpoints:

```bash
# Check if app is running
curl -I http://localhost:3000

# Check sign-in page (should return 200)
curl -I http://localhost:3000/sign-in

# Check sign-up page (should return 200)
curl -I http://localhost:3000/sign-up

# Check root without auth (should redirect)
curl -I http://localhost:3000
```

### Using Playwright (if needed):

```bash
# Install Playwright
npm install -D @playwright/test

# Run E2E tests (create test file first)
npx playwright test
```

---

## Browser Console Checks

Open browser DevTools Console and verify:

```javascript
// Check if Clerk is loaded
console.log(window.Clerk !== undefined) // Should be true

// Check current path
console.log(window.location.pathname)

// Check for errors
// No red errors should appear in console
```

---

## Test Results Template

```
Test Date: _______________
Tester: _______________

Test 1: Redirect to Sign-In       [ PASS / FAIL ]
Test 2: Sign-Up Navigation         [ PASS / FAIL ]
Test 3: New User Registration      [ PASS / FAIL ]
Test 4: User Logout                [ PASS / FAIL ]
Test 5: Existing User Login        [ PASS / FAIL ]
Test 6: Protected Route Access     [ PASS / FAIL ]
Test 7: Chat Interface Function    [ PASS / FAIL ]
Test 8: Session Persistence        [ PASS / FAIL ]
Test 9: Mobile Responsiveness      [ PASS / FAIL ]
Test 10: Error Handling            [ PASS / FAIL ]

Overall Status: [ PASS / FAIL ]

Notes:
_________________________________
_________________________________
_________________________________
```

---

## Known Issues / Notes

- Dashboard development is paused - users bypass it after authentication
- All authenticated users redirect to chat interface (`/`)
- Clerk handles email verification, password reset, etc.
- UserButton provides account management features

---

## Support

If any test fails:
1. Check browser console for errors
2. Verify environment variables in `.env.local`
3. Check dev server is running: `npm run dev:app`
4. Clear browser cache/cookies and retry
5. Review `docs/AUTHENTICATION_IMPLEMENTATION.md`
