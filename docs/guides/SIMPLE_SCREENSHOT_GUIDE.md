# 📸 Simple Screenshot Capture Guide

Since automated authentication is slow, here's a **faster manual approach**:

## Option A: Quick Manual Screenshots (5 minutes)

### What You'll Do:
1. Open your app in a regular browser
2. Log in normally
3. Use browser DevTools to capture screenshots
4. Save them to the `screenshots/` folder

### Step-by-Step:

1. **Open your browser** (Chrome recommended)
   ```
   http://localhost:3000
   ```

2. **Log in with Google OAuth**

3. **Open DevTools** (Press `Cmd+Option+I` on Mac or `F12` on Windows)

4. **Enable device toolbar** (Press `Cmd+Shift+M` or click the phone/tablet icon)

5. **Capture screenshots**:

   For each viewport size and state, press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows), then type "screenshot" and select:
   - "Capture full size screenshot" for full page
   - "Capture screenshot" for visible area only

### What to Capture:

**Desktop (1280x720)**:
- [ ] Landing page (authenticated)
- [ ] Chat - empty state
- [ ] Chat - with suggested prompts
- [ ] Chat - input focused
- [ ] Chat - message typed
- [ ] Chat - message sent
- [ ] Chat - loading state
- [ ] Chat - with response
- [ ] Sidebar - visible
- [ ] Sidebar - toggled
- [ ] Settings panel - opened
- [ ] Settings - sliders/controls
- [ ] Workflow visualization (if visible)
- [ ] User menu - opened

**Mobile (375x667 - iPhone SE)**:
- [ ] Chat interface
- [ ] Sidebar (hamburger menu)
- [ ] Settings

**Tablet (768x1024 - iPad)**:
- [ ] Chat interface
- [ ] Sidebar

**Wide Desktop (1920x1080)**:
- [ ] Full interface

### Save Names:
```
01-landing-authenticated.png
02-chat-empty.png
03-chat-suggested-prompts.png
04-sidebar-visible.png
... etc
```

---

## Option B: Use Browser Extension (Even Faster!)

### Recommended Extensions:

**Chrome/Edge**:
- **Full Page Screen Capture** - Free, one-click full page screenshots
- **Awesome Screenshot** - Capture + annotate

**Firefox**:
- Built-in screenshot tool (Right-click → "Take Screenshot")

### Usage:
1. Install extension
2. Navigate through your app
3. Click extension icon to capture each state
4. Save to `screenshots/` folder

---

## Option C: Use Built-in Browser Tools

### Chrome DevTools Screenshot (No Extension Needed):

1. Open DevTools (`Cmd+Option+I`)
2. Open Command Palette (`Cmd+Shift+P`)
3. Type "screenshot"
4. Choose:
   - "Capture full size screenshot" - entire page
   - "Capture screenshot" - visible viewport only
   - "Capture node screenshot" - specific element

### Firefox Built-in:
1. Right-click anywhere on the page
2. Select "Take Screenshot"
3. Choose "Save full page" or "Save visible"

---

## What to Focus On

### Critical Screenshots (Minimum 10):
1. Landing page - authenticated
2. Chat - empty state
3. Chat - with message
4. Chat - with response
5. Sidebar navigation
6. Settings panel
7. Mobile view - chat
8. Tablet view - chat
9. Desktop wide view
10. User menu

### Nice to Have (Additional 10):
11. Suggested prompts
12. Input focused
13. Loading state
14. Error state (if accessible)
15. Workflow visualization
16. Settings - sliders
17. Different sidebar states
18. Hover effects
19. Multiple messages in chat
20. Different responsive breakpoints

---

## Quick Reference: Viewport Sizes

Set these in DevTools Device Toolbar:

- **Mobile**: 375x667 (iPhone SE)
- **Mobile Large**: 390x844 (iPhone 13)
- **Tablet**: 768x1024 (iPad)
- **Desktop**: 1280x720 (Standard)
- **Desktop Large**: 1920x1080 (Full HD)

---

## After Capturing

1. Save all screenshots to: `./screenshots/`
2. Name them descriptively
3. Optionally create INDEX.md listing all screenshots

---

## Estimated Time

- **Minimal (10 screenshots)**: ~5 minutes
- **Comprehensive (20 screenshots)**: ~15 minutes
- **Complete (all states & viewports)**: ~30 minutes

Much faster than waiting for automated tests! 🚀

---

## Tips

- Take screenshots in a **consistent order** (landing → chat → sidebar → settings)
- Use **full page screenshots** when possible to capture everything
- Include **both light and dark mode** if your app supports it
- Capture **error states** by intentionally triggering validation errors
- Take screenshots of **hover effects** by holding position while capturing

---

## If You Want Automation Later

Once you have the screenshots manually, we can use them as a reference to:
1. Verify the automated tests are capturing the same states
2. Create visual regression tests (comparing new vs old screenshots)
3. Document expected UI behavior

For now, manual is fastest! 📸
