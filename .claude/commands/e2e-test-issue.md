# End-to-End Test Linear Issue Implementation

Test a Linear issue's implementation end-to-end using browser automation, capturing screenshots and documenting all issues found.

## Parameters:

- **Linear Issue ID** (required): The Linear issue identifier (e.g., `ONEK-178`)
- Usage: `/e2e-test-issue <linear-issue-id>`

## Actions to Execute:

### Step 1: Environment Setup

1. **Kill existing processes on port 3000**:
   ```bash
   lsof -ti:3000 | xargs kill -9 2>/dev/null || true
   ```

2. **Create screenshots directory** for this test run:
   ```bash
   mkdir -p /Volumes/SeagatePortableDrive/Projects/Software/v0-jetvision-assistant/screenshots
   ```

3. **Start the development server** in the background:
   ```bash
   pnpm run dev
   ```
   Wait for the server to be fully ready (confirm by checking `http://localhost:3000` responds).

### Step 2: Gather Context

1. **Look up the Linear issue** $ARGUMENTS to understand what was implemented:
   - Search the codebase for references to the issue ID (e.g., `ONEK-178` in commit messages, code comments, docs)
   - Read any related plan documents in `docs/plans/` that reference this issue
   - Identify the key features, components, and workflows that were changed

2. **Retrieve test data** if needed:
   - Query the database for existing Trip IDs with operator quotes/responses
   - Identify any test data required for the specific feature being tested
   - Note relevant API endpoints, UI routes, and component paths

### Step 3: End-to-End Browser Testing

Using the Claude in Chrome browser automation tools (`mcp__claude-in-chrome__*`):

1. **Navigate to `http://localhost:3000`** and verify the app loads correctly
2. **Test the $ARGUMENTS feature implementation specifically**:
   - Walk through each major workflow step of the implemented feature
   - Interact with all new/modified UI components
   - Test with real data (existing Trip IDs, quotes, etc.)
   - Test edge cases and error states
3. **Capture screenshots** at each major step:
   - Save to `/Volumes/SeagatePortableDrive/Projects/Software/v0-jetvision-assistant/screenshots/`
   - Use descriptive filenames: `{issue-id-lowercase}-step-N-description.png`
   - Example: `onek-178-step-1-trip-creation.png`, `onek-178-step-2-quote-display.png`

### Step 4: Issue Analysis and Documentation

During testing, identify and document all of the following:

| Category | What to Look For |
|----------|-----------------|
| **Bugs** | Crashes, errors, broken functionality, console errors |
| **UI/UX Issues** | Layout problems, inconsistencies, poor responsiveness, accessibility |
| **Incomplete Features** | Missing functionality, TODO placeholders, stub implementations |
| **Data Issues** | Incorrect display, missing data, wrong formatting, stale state |
| **Logic Errors** | Incorrect calculations, wrong flow, missing validation |
| **Performance** | Slow loading, unnecessary re-renders, large payloads |

### Step 5: Create Action Plan

If issues are found:

1. **Create structured tasks** using the task management tools (TaskCreate) for each issue found
2. **Prioritize by severity**:
   - **Critical**: App crashes, data loss, security issues
   - **Major**: Broken features, incorrect data, significant UI bugs
   - **Minor**: Cosmetic issues, minor UX improvements, edge cases
3. **For each task specify**:
   - Clear description of the issue
   - Steps to reproduce
   - Expected vs actual behavior
   - Suggested fix approach
   - Affected files/components

### Step 6: Generate Report

Produce a summary report containing:

1. **Test Summary**: What was tested, pass/fail status for each workflow step
2. **Screenshots**: List of all captured screenshots with descriptions
3. **Issues Found**: Categorized list with severity ratings
4. **Action Plan**: Link to created tasks with priorities
5. **Recommendations**: Any architectural or UX recommendations

## Deliverables:

1. Screenshots of each testing step saved in the `screenshots/` directory
2. Detailed report of all issues found (output to console)
3. Actionable task plan (created via TaskCreate) for fixing identified issues

## Notes:

- If the dev server fails to start, check for dependency issues with `pnpm install` first
- If browser automation tools are unavailable, fall back to API-level testing and manual inspection
- Always check the browser console for JavaScript errors during testing
- Test with multiple Trip IDs if available to verify consistency
