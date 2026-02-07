# Triage and Fix Bugs for a Linear Issue

Retrieve a Linear issue, create subtasks for each bug found, notify stakeholders, build a checklist-based implementation plan, and systematically fix each item.

## Parameters:

- **Linear Issue ID** (required): The Linear issue identifier (e.g., `ONEK-177`)
- Usage: `/linear-fix-issue <linear-issue-id>`

## Actions to Execute:

### Step 1: Validate Input and Retrieve Issue

1. **Parse the Linear issue ID** from `$ARGUMENTS`
   - If no argument provided, ask the user: "Which Linear issue should I fix? (e.g., ONEK-177)"
   - Validate format matches `ONEK-\d+` pattern

2. **Fetch full issue details** using the Linear MCP `get_issue` tool:
   - Retrieve title, description, current status, assignee, labels, and priority
   - If the issue is not found, report the error and stop
   - Retrieve existing comments on the issue for context

3. **Confirm access** to the user:
   - Display issue title, status, and assignee
   - Ask: "I have access to {issue-id}: {title}. Should I proceed with bug triage?"
   - If there are existing comments with bug reports, list them as context

### Step 2: Identify and Document Bugs as Subtasks

1. **Gather bug information** from all available sources:
   - **Linear issue comments**: Parse existing comments for reported bugs
   - **E2E test results**: Check for recent `/e2e-test-issue` output (TaskList, screenshots in `screenshots/`)
   - **Current conversation**: Extract any bugs discussed in this session
   - **Codebase search**: Search for TODO/FIXME/HACK comments referencing $ARGUMENTS
     ```bash
     git log --all --oneline --grep="$ARGUMENTS"
     ```
   - **Plan documents**: Check `docs/plans/` for any documents referencing $ARGUMENTS

2. **Deduplicate and categorize** each distinct bug:

   | Severity | Criteria |
   |----------|----------|
   | **Critical** | App crashes, data loss, security vulnerabilities |
   | **Major** | Broken features, incorrect data, significant UI bugs |
   | **Minor** | Cosmetic issues, edge cases, minor UX improvements |

3. **Create a Linear subtask** for each bug using the Linear MCP `create_issue` tool:
   - **Title**: Clear, descriptive (e.g., "Fix: RFQ prices not refreshing in Chat UI")
   - **Description**: Include:
     - Steps to reproduce
     - Expected vs actual behavior
     - Affected files/components (if known)
     - Severity classification
   - **Parent**: Set parent to $ARGUMENTS issue
   - **Labels**: Match parent issue labels + add "bug" label if available

4. **Report to user**: List all created subtasks with their IDs and titles

### Step 3: Add Comments Mentioning Stakeholders

1. **For each bug/subtask**, identify who reported or discovered it:
   - Check Linear comment authors who mentioned the bug
   - Check git blame for the affected code area
   - Check e2e test output for who ran the test
   - If the reporter is unknown, attribute to the parent issue creator

2. **Post a comment** on each subtask using Linear MCP `create_comment`:
   ```markdown
   @{reporter} — This bug was identified during triage of {parent-issue-id}.

   **Bug**: {brief description}
   **Plan**: {one-line fix approach}
   **Subtask of**: {parent-issue-id}
   ```

3. **Post a triage summary comment** on the parent issue:
   ```markdown
   ## Bug Triage Complete

   Identified **{N}** bugs from this issue. Subtasks created:

   | # | Subtask | Severity | Reporter |
   |---|---------|----------|----------|
   | 1 | {subtask-id}: {title} | {severity} | @{reporter} |
   | 2 | {subtask-id}: {title} | {severity} | @{reporter} |

   Implementation plan follows below.
   ```

### Step 4: Create Implementation Plan

1. **Analyze dependencies** between subtasks:
   - Identify which fixes depend on others (e.g., a data model fix must precede a UI fix)
   - Determine optimal ordering: critical severity first, then by dependency chain
   - Note any fixes that can be parallelized

2. **Define acceptance criteria** for each subtask:
   - Specific, testable conditions that prove the fix works
   - Include regression checks (existing functionality unaffected)

3. **Update the parent issue description** using Linear MCP `update_issue`:
   - Append (do not replace) the implementation plan to the existing description
   - Use this format:

   ```markdown
   ---

   ## Implementation Plan

   **Branch**: `{current-or-planned-branch}`
   **Created**: {YYYY-MM-DD}

   ### Fix Order

   - [ ] **{subtask-id}**: {title} (Critical)
     - Acceptance: {specific criteria}
     - Files: {affected files}
     - Depends on: {dependency or "none"}

   - [ ] **{subtask-id}**: {title} (Major)
     - Acceptance: {specific criteria}
     - Files: {affected files}
     - Depends on: {dependency or "none"}

   - [ ] **{subtask-id}**: {title} (Minor)
     - Acceptance: {specific criteria}
     - Files: {affected files}
     - Depends on: {dependency or "none"}

   ### Dependencies
   {subtask-A} must complete before {subtask-B} because {reason}

   ### Testing Strategy
   - Run `/e2e-test-issue {parent-issue-id}` after all fixes
   - Run `/linear-update-summary {parent-issue-id}` to post final summary
   ```

4. **Confirm the plan** with the user before proceeding to implementation

### Step 5: Implement Fixes

1. **Ensure you are on the correct feature branch**:
   ```bash
   git branch --show-current
   ```
   - If on `main`, create or checkout the feature branch:
     ```bash
     git checkout -b fix/$ARGUMENTS-bug-fixes
     ```

2. **Work through the checklist in order**:
   - For each subtask, starting with the highest severity:
     a. Read the subtask details and acceptance criteria
     b. Investigate the root cause in the codebase
     c. Implement the fix
     d. Verify the fix locally (run relevant tests, check the behavior)
     e. Commit with a descriptive message referencing the subtask:
        ```bash
        git commit -m "fix($ARGUMENTS): {description} — resolves {subtask-id}"
        ```

3. **After each fix**, update progress:
   - Update the subtask status in Linear to "Done" using `update_issue`
   - Update the parent issue checkbox (post a comment noting completion):
     ```markdown
     Completed: **{subtask-id}** — {title}
     Root cause: {brief explanation}
     Fix: {what was changed}
     ```

4. **After all fixes are complete**:
   - Run the test suite to verify no regressions:
     ```bash
     npm test
     ```
   - Suggest next steps to the user:
     - `/e2e-test-issue $ARGUMENTS` — to verify all fixes via browser
     - `/linear-update-summary $ARGUMENTS` — to post the development summary

### Step 6: Final Status Report

Report to the user:

- Total bugs triaged: {N}
- Subtasks created: {list with IDs}
- Fixes completed: {N} of {N}
- Commits made: {N}
- Remaining items: {any incomplete subtasks}
- Suggested next commands:
  - `/e2e-test-issue $ARGUMENTS`
  - `/linear-update-summary $ARGUMENTS`

## Notes:

- This command requires the **Linear MCP** server to be running for issue/subtask creation
- If Linear MCP is unavailable, the command will output the triage plan to console for manual entry
- Always **confirm with the user** before creating subtasks and posting comments to Linear
- Subtask creation uses `create_issue` with parent reference — verify the Linear MCP supports parent issue linking
- The implementation plan **appends** to the issue description; it never overwrites existing content
- When attributing bugs to reporters, use Linear usernames/mentions — do not guess email addresses
- This command pairs naturally with the full Linear issue lifecycle:
  1. `/linear-fix-issue ONEK-XXX` — Triage + fix
  2. `/e2e-test-issue ONEK-XXX` — Verify fixes
  3. `/linear-update-summary ONEK-XXX` — Document for UAT
