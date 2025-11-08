# 📸 Automated Screenshot Capture Guide

## Overview

This guide explains how to capture comprehensive screenshots of the Jetvision app using Playwright automation with manual authentication.

## 🎯 Two-Step Process

### Step 1: Manual Authentication (One-time setup)

Run this command to save your authentication state:

```bash
npx playwright test auth-setup --headed --debug --project=chromium
```

**What happens:**
1. Browser opens to the sign-in page
2. Playwright Inspector window appears with "Pause" state
3. **You manually log in** using Google OAuth
4. After successful login, click **"Resume"** in Playwright Inspector
5. Authentication state is saved to `.auth/user.json`

**Output:**
```
✅ Authentication state saved to: .auth/user.json
   This state will be reused for automated screenshot capture
```

### Step 2: Automated Screenshot Capture

Once authenticated, run the automated capture:

```bash
npx playwright test capture-screenshots-authenticated --headed --project=chromium
```

**What happens:**
1. Loads saved authentication state (no manual login needed)
2. Automatically navigates through all app pages and states
3. Captures 20+ screenshots covering:
   - Landing page (authenticated)
   - Chat interface (empty, with messages, loading states)
   - Sidebar navigation
   - Settings panel
   - Workflow visualization
   - Mobile/tablet/desktop responsive views
   - User profile menu
   - Hover states

**Output:**
- Screenshots saved to: `./screenshots/`
- Index file created: `./screenshots/INDEX.md`

---

## 📁 Files Created

### Test Files
- `__tests__/e2e/auth-setup.spec.ts` - Manual authentication capture
- `__tests__/e2e/capture-screenshots-authenticated.spec.ts` - Automated screenshot capture

### Generated Files
- `.auth/user.json` - Saved authentication state (gitignored)
- `screenshots/*.png` - All captured screenshots (gitignored)
- `screenshots/INDEX.md` - Markdown index with all screenshots

---

## 🔄 Re-authentication

If your session expires or you need to re-authenticate:

```bash
# Delete old auth state
rm -rf .auth/user.json

# Run authentication setup again
npx playwright test auth-setup --headed --debug --project=chromium
```

---

## 🎨 What Gets Captured

### 1. **Landing Page** (authenticated)
- Main interface after login
- Initial state

### 2. **Chat Interface States**
- Empty state
- With suggested prompts
- Input focused
- Message typed
- Message sent
- Loading state
- Response received

### 3. **Navigation**
- Sidebar visible
- Sidebar toggled
- Menu states

### 4. **Settings Panel**
- Settings opened
- Margin/commission sliders
- Configuration options

### 5. **Workflow Visualization**
- Progress tracking
- Status indicators

### 6. **Responsive Design**
- Mobile (390px - iPhone 13)
- Tablet (768px - iPad)
- Desktop (1280px)
- Wide Desktop (1920px)

### 7. **User Menu**
- Profile dropdown
- Account options

### 8. **Interactive States**
- Button hover effects
- Focus states

---

## 🛠️ Troubleshooting

### Authentication state not found

**Error:**
```
Authentication state not found at .auth/user.json
```

**Solution:**
Run Step 1 first to create the authentication state:
```bash
npx playwright test auth-setup --headed --debug --project=chromium
```

### Session expired

If screenshots show sign-in page instead of authenticated content:

1. Delete old auth state: `rm .auth/user.json`
2. Re-run authentication setup
3. Try automated capture again

### Dev server not running

**Error:**
```
webServer is not running
```

**Solution:**
Start dev server in another terminal:
```bash
npm run dev:app
```

Or let Playwright start it automatically (configured in `playwright.config.ts`).

---

## 🔐 Security Notes

- `.auth/user.json` contains your session cookies and tokens
- This file is gitignored to prevent accidental commits
- Authentication state expires based on Clerk session length
- Passwords are NOT stored, only session tokens

---

## 📊 Expected Output

After running both steps successfully:

```
./screenshots/
├── 01-landing-page-authenticated.png
├── 02-chat-initial-empty.png
├── 03-suggested-prompts.png
├── 04-sidebar-navigation.png
├── 05-sidebar-toggled.png
├── 06-settings-panel.png
├── 07-settings-controls.png
├── 08-chat-input-focused.png
├── 09-chat-message-typed.png
├── 10-chat-send-button-ready.png
├── 11-chat-message-sent.png
├── 12-chat-loading-state.png
├── 13-chat-with-response.png
├── 14-workflow-visualization.png
├── 15-mobile-chat-view.png
├── 16-tablet-chat-view.png
├── 17-desktop-standard-view.png
├── 18-desktop-wide-view.png
├── 19-user-menu-open.png
├── 20-button-hover-state.png
└── INDEX.md
```

Total: **20+ screenshots** covering all major app states and viewports.

---

## 🚀 Quick Start

```bash
# Step 1: Authenticate (one-time)
npx playwright test auth-setup --headed --debug --project=chromium

# Wait for browser to open, log in manually, click Resume in Inspector

# Step 2: Capture screenshots (repeatable)
npx playwright test capture-screenshots-authenticated --headed --project=chromium

# View results
open screenshots/INDEX.md
```

---

## 🎓 Advanced Usage

### Capture specific sections only

Edit `__tests__/e2e/capture-screenshots-authenticated.spec.ts` and comment out sections you don't need.

### Change viewport sizes

Modify the viewport sizes in Section 8:

```typescript
// Custom mobile size
await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
```

### Add more screenshots

Add new capture sections by following the existing pattern:

```typescript
console.log('\n📍 Section X: Your Section Name');

// Navigate or interact
await page.locator('selector').click();

// Capture
capturedScreenshots.push({
  name: 'XX-descriptive-name',
  description: 'Description of what this shows',
  filename: await captureScreenshot(page, 'XX-descriptive-name', 'Short description')
});
```

---

## 📝 Notes

- Screenshots are full-page by default (`fullPage: true`)
- Each section waits 1-2 seconds for animations to complete
- Total capture time: ~2-3 minutes for all 20+ screenshots
- Browser runs in headed mode (visible) by default for debugging

To run headless (faster, no visible browser):
```bash
npx playwright test capture-screenshots-authenticated --project=chromium
```
(Remove the `--headed` flag)

---

**Built with**: Playwright, TypeScript, Next.js 14
**Documentation**: See `UX_UI_AUDIT_REPORT.md` for detailed UX/UI analysis
