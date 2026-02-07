# Linear Issue Cleanup and Synchronization

Automated Linear board hygiene: deduplicate issues, validate statuses against test results, synchronize with codebase state, triage the backlog, and post UAT-ready comments with user stories and acceptance criteria.

## Parameters:

- **Team** (optional): Linear team name (e.g., `One Kaleidoscope`, `DesignThru AI`). Defaults to all teams.
- **Scope** (optional): `--scope=all|duplicates|status|sync|backlog`. Defaults to `all`.
- Usage: `/linear-cleanup [team] [--scope=<phase>]`

## Actions to Execute:

### Step 1: Parse Arguments and Initialize

1. **Parse `$ARGUMENTS`** for optional team name and scope flag:
   - If `$ARGUMENTS` contains `--scope=`, extract the scope value (`duplicates`, `status`, `sync`, `backlog`, or `all`)
   - Remaining text is the team name filter
   - If no scope specified, default to `all` (run all phases)
   - If no team specified, process both teams

2. **Fetch team information** using `list_teams`:
   - Available teams: **One Kaleidoscope** (`ONEK-*`) and **DesignThru AI** (`DES-*`)
   - If a team was specified, validate it exists

3. **Fetch all issue statuses** for the target team(s) using `list_issue_statuses`:
   - Store the status IDs for each team (needed for status updates)
   - Check if "Ready for Deploy" status exists — if not, flag for creation in Phase 3

4. **Fetch all non-archived issues** using `list_issues`:
   - Filter by team if specified
   - Include: title, description, status, labels, priority, assignee, createdAt, updatedAt
   - Page through results if >50 issues (use cursor)
   - Store full issue list for analysis

5. **Report initialization** to the user:
   - "Found {N} issues across {team(s)}. Running cleanup phases: {scope list}"
   - Show breakdown by status

---

### Step 2: Deduplication Scan (scope: `duplicates` or `all`)

1. **Build a comparison matrix** of all non-completed, non-canceled issues:
   - For each pair of issues, compute similarity signals:

   | Signal | Weight | Method |
   |--------|--------|--------|
   | Title keyword overlap | High | Tokenize titles, compute Jaccard similarity (>0.6 = suspect) |
   | Description overlap | Medium | Compare first 200 chars for shared phrases |
   | Same labels | Medium | Identical label set + similar title = strong signal |
   | Same assignee + similar title | Low | Supporting signal only |

2. **Identify duplicate clusters**:
   - Group issues where similarity score exceeds threshold
   - For each cluster, designate the **oldest issue** (earliest `createdAt`) as canonical
   - Mark newer issues as duplicates

3. **Present findings to user** for confirmation:
   ```
   Duplicate Clusters Found: {N}

   Cluster 1:
     Canonical: ONEK-101 "Flight search returns empty results" (created 2025-11-01)
     Duplicate: ONEK-156 "No flights returned from search" (created 2025-12-15)
     Similarity: Title overlap 0.72, same labels [Bug]

   Cluster 2: ...

   Proceed with merging? (yes/no/select)
   ```

4. **For each confirmed duplicate**:
   a. **Post a comment on the duplicate** using `create_comment`:
      ```markdown
      ## Marked as Duplicate

      This issue has been identified as a duplicate of **{canonical-id}**: {canonical-title}.

      **Reason**: {similarity explanation}
      **Action**: Closing this issue. All discussion should continue on {canonical-id}.

      _Automated by `/linear-cleanup` on {date}_
      ```

   b. **Transfer unique context** from duplicate to canonical:
      - If the duplicate has unique information in its description not present in the canonical, post it as a comment on the canonical:
        ```markdown
        ## Additional Context (from duplicate {duplicate-id})

        {unique content from duplicate description}
        ```

   c. **Update the duplicate issue** using `update_issue`:
      - Set status to `Duplicate`
      - Set `duplicateOf` to the canonical issue ID

5. **Track results** for the final report:
   - Number of clusters found
   - Number of issues merged
   - List of canonical issues

---

### Step 3: Status Validation (scope: `status` or `all`)

1. **Filter issues** to validate:
   - Include: `Todo`, `In Progress`, `In Review`, `Backlog` statuses
   - Exclude: `Done`, `Canceled`, `Duplicate`

2. **For each issue**, perform validation:

   a. **Extract the issue identifier** from the title (e.g., `ONEK-123` from "ONEK-123: Flight search feature")
      - Also search for issue references in the description

   b. **Search the codebase** for related code:
      ```bash
      # Search git history for issue references
      git log --all --oneline --grep="ONEK-123" 2>/dev/null | head -5
      ```
      - Also search file contents for the issue ID:
        - Use Grep to find references across the codebase
      - Check for related branches:
        ```bash
        git branch -a --list "*ONEK-123*" "*onek-123*" 2>/dev/null
        ```

   c. **Find related test files**:
      - Map the issue to affected source files (from git log or description mentions)
      - For each source file, find the corresponding test file:
        - `components/chat-sidebar.tsx` → `__tests__/unit/components/chat-sidebar.test.tsx`
        - `lib/utils/format.ts` → `__tests__/unit/lib/utils/format.test.ts`
        - `app/api/chat/route.ts` → `__tests__/unit/api/chat/route.test.ts`

   d. **Run targeted tests** (if test files found):
      ```bash
      npx vitest run __tests__/unit/<path-to-test> --reporter=verbose 2>&1 | tail -20
      ```
      - IMPORTANT: Run **targeted** tests, not the full suite (external drive is slow)
      - Capture pass/fail results

   e. **Determine the correct status** based on results:

      | Code Found | Tests Found | Tests Pass | Deployed | New Status |
      |-----------|-------------|-----------|----------|------------|
      | Yes | Yes | All pass | No | **Ready for Deploy** |
      | Yes | Yes | All pass | Yes | **Done** |
      | Yes | Yes | Some fail | - | **In Progress** |
      | Yes | Yes | All fail | - | **In Progress** |
      | Yes | No | - | - | **Todo** + flag "Needs Tests" |
      | No | No | - | - | **Backlog** |
      | Yes | Yes | Pass | - | **In Review** (if PR exists) |

   f. **Check for "Ready for Deploy" status** in the team:
      - If not present and needed, ask user: "The 'Ready for Deploy' status doesn't exist for {team}. Create it? (yes/no)"
      - If yes, note for manual creation (Linear MCP doesn't support status creation — instruct user to create it in Linear settings)

3. **Present proposed status changes** for confirmation:
   ```
   Status Changes Proposed: {N}

   | Issue | Current | Proposed | Reason |
   |-------|---------|----------|--------|
   | ONEK-123 | In Progress | Done | All 5 tests pass, code complete |
   | ONEK-145 | Todo | In Progress | Branch exists, 2/4 tests pass |
   | ONEK-167 | In Review | Todo | No tests found — needs tests |

   Apply these changes? (yes/no/select)
   ```

4. **Apply confirmed changes** using `update_issue`:
   - Update the status
   - If flagged "Needs Tests", add a comment:
     ```markdown
     ## Status Update: Needs Tests

     Code exists for this issue but no unit tests were found.

     **Files identified**: {list of source files}
     **Expected test locations**:
     - `__tests__/unit/{path}/{file}.test.ts`

     Please create tests before marking as complete.

     @AB @Kham — This issue needs test coverage before UAT.

     _Automated by `/linear-cleanup` on {date}_
     ```

---

### Step 4: Project Synchronization (scope: `sync` or `all`)

1. **Gather codebase state**:
   - Run the equivalent of `/analyze_codebase` analysis:
     - List all source files and their last modified dates
     - Identify features by directory structure:
       - `components/avinode/` → Avinode integration features
       - `components/chat/` → Chat UI features
       - `components/proposal/` → Proposal features
       - `app/api/` → API endpoints
       - `lib/` → Core libraries
       - `mcp-servers/` → MCP server implementations
     - Check test coverage per area

2. **Cross-reference with Linear issues**:
   - For each feature area, find matching Linear issues
   - Identify discrepancies:

   | Discrepancy | Description | Action |
   |-------------|-------------|--------|
   | **Code Complete, Issue Open** | Feature code exists and tests pass, but issue is still In Progress/Todo | Propose status → Done |
   | **Issue Done, Code Missing** | Issue marked Done but no code found | Flag for investigation |
   | **Orphaned Code** | Code area with no corresponding issue | Report as potential tech debt |
   | **Stale Branch** | Branch exists for issue but no commits in >30 days | Flag as potentially abandoned |

3. **Check for PRs** associated with issues:
   ```bash
   gh pr list --state all --json number,title,state,headRefName --limit 100
   ```
   - Map PRs to issues by branch name or title
   - If PR is merged but issue isn't Done → propose status change

4. **Present sync discrepancies** to user:
   ```
   Sync Discrepancies: {N}

   Code Complete, Issue Open:
   - ONEK-175: Webhook bug fixes — code merged in b222f48, tests pass
   - ONEK-177: Service charge feature — code exists, 8 tests pass

   Issue Done, Code Missing:
   - (none found)

   Orphaned Code Areas:
   - components/chat/margin-selection-card.tsx — new file, no matching issue

   Apply corrections? (yes/no/select)
   ```

5. **Apply confirmed corrections** using `update_issue`

---

### Step 5: Backlog Triage (scope: `backlog` or `all`)

1. **Analyze backlog issues** (status: `Backlog` or `Todo` with no recent activity):

   For each backlog item, evaluate:

   a. **Staleness** — last updated date:
      - `>6 months`: Flag as stale, recommend Cancel
      - `3-6 months`: Flag as aging, recommend review
      - `<3 months`: Active, evaluate priority

   b. **Dependency completion** — check if blocking issues are now Done:
      - Use `get_issue` with `includeRelations: true` for blocking relationships
      - If all blockers are Done, recommend prioritizing this issue

   c. **Relevance** — does the feature/fix still matter:
      - Search codebase for references to determine if the area is still active
      - Check if the described problem still exists (e.g., bug may have been fixed incidentally)

   d. **Business value signals**:
      - Priority field (1=Urgent, 2=High, 3=Normal, 4=Low)
      - Label types (Bug > Feature > Improvement for urgency)
      - Related issues count

2. **Categorize each backlog item**:

   | Category | Criteria | Action |
   |----------|----------|--------|
   | **Promote** | Dependencies done, high priority, area active | Move to Todo, increase priority |
   | **Keep** | Still relevant, moderate priority | Leave in Backlog |
   | **Cancel** | Stale >6mo, superseded, or duplicate of done work | Move to Canceled |
   | **Needs Discussion** | Unclear relevance, needs stakeholder input | Flag for review |

3. **Present recommendations** for confirmation:
   ```
   Backlog Triage: {N} items analyzed

   Promote to Todo:
   - ONEK-200: Add operator messaging — blocker ONEK-150 is now Done
   - ONEK-210: Performance monitoring — high priority, area has recent activity

   Recommend Cancel:
   - ONEK-105: Legacy PDF format — no activity since 2025-06-01, superseded by ONEK-180
   - ONEK-112: Old search UI — feature completely redesigned in ONEK-160

   Keep in Backlog:
   - ONEK-220: Dark mode — low priority, no blockers

   Apply? (yes/no/select)
   ```

4. **Apply confirmed changes**:
   - For promotions: `update_issue` to change status to Todo + adjust priority
   - For cancellations: `update_issue` to change status to Canceled + post comment:
     ```markdown
     ## Canceled — Stale/Superseded

     This issue has been canceled during backlog triage.

     **Reason**: {specific reason — e.g., "No activity since 2025-06-01, feature superseded by ONEK-180"}

     If this issue is still relevant, please reopen and update the description.

     _Automated by `/linear-cleanup` on {date}_
     ```

---

### Step 6: UAT Comments with User Stories and Acceptance Criteria

1. **For every issue that was updated** during this cleanup run (status changed, merged, or triaged):

   a. **Generate a User Story** based on the issue title and description:
      ```
      As a [charter flight broker/sales representative/client],
      I want [feature derived from issue title],
      So that [benefit derived from issue description/context]
      ```

   b. **Define Acceptance Criteria** as testable checkboxes:
      - Derive from the issue description, related code, and test assertions
      - Each criterion should be specific and manually verifiable

   c. **Write Manual Test Steps** for UAT:
      - Step-by-step instructions for @AB and @Kham to verify
      - Include preconditions, actions, and expected results
      - Reference specific UI elements, URLs, or data to use

   d. **Post the UAT comment** using `create_comment`:
      ```markdown
      ## User Story

      **As a** {role},
      **I want** {feature},
      **So that** {benefit}.

      ---

      ## Acceptance Criteria

      - [ ] {Criterion 1 — specific, testable condition}
      - [ ] {Criterion 2}
      - [ ] {Criterion 3}
      - [ ] {Regression: existing functionality still works as expected}

      ---

      ## Manual Test Steps

      **Preconditions**: {setup required — e.g., "Log in as admin, navigate to Chat"}

      1. {Step 1 — specific action}
         - Expected: {what should happen}
      2. {Step 2}
         - Expected: {what should happen}
      3. {Step 3}
         - Expected: {what should happen}

      ---

      @AB @Kham — Please verify the acceptance criteria above.

      **Status**: {new status after cleanup}
      **Updated by**: `/linear-cleanup` on {date}
      **Reason for update**: {brief explanation of what changed and why}
      ```

---

### Step 7: Generate Cleanup Report

1. **Compile the full report** from all phases:

   ```markdown
   ## Linear Cleanup Report — {YYYY-MM-DD}

   **Team(s)**: {team names}
   **Scope**: {phases run}
   **Issues analyzed**: {total count}

   ---

   ### Duplicates (Phase 1)
   - **Found**: {N} duplicate clusters
   - **Merged**: {N} issues marked as Duplicate
   - **Canonical issues**: {list with IDs}

   ### Status Corrections (Phase 2)
   - **Validated**: {N} issues checked against tests
   - **Updated**: {N} status changes applied

   | Issue | Old Status | New Status | Reason |
   |-------|-----------|-----------|--------|
   | {id} | {old} | {new} | {reason} |

   ### Sync Discrepancies (Phase 3)
   - **Misaligned**: {N} issues had incorrect status vs codebase
   - **Corrected**: {N} issues updated
   - **Orphaned code**: {N} code areas with no issue

   ### Backlog Triage (Phase 4)
   - **Analyzed**: {N} backlog items
   - **Promoted**: {N} moved to Todo
   - **Canceled**: {N} stale/superseded issues closed
   - **Kept**: {N} remain in backlog

   | Issue | Action | Rationale |
   |-------|--------|-----------|
   | {id} | {promote/cancel/keep} | {reason} |

   ### UAT Comments (Phase 5)
   - **Posted**: {N} issues updated with user stories and acceptance criteria
   - **Stakeholders notified**: @AB, @Kham

   ---

   ### Audit Trail

   All changes were confirmed by the user before execution.
   Full action log available in this conversation.

   ### Suggested Next Steps
   - Run `/e2e-test-issue` on promoted issues to verify functionality
   - Review orphaned code areas for potential new issues
   - Schedule next cleanup in {2 weeks}
   ```

2. **Display the report** to the user in the terminal

3. **Ask if the user wants to post** the report summary as a Linear document:
   - If yes, use `create_document` to save it to the project

---

## Notes:

- This command requires the **Linear MCP** server to be running for all issue operations
- If Linear MCP is unavailable, the command outputs analysis to console for manual action
- **Always confirm with the user** before making any changes — this is a bulk operation
- Tests run on the **external SeagatePortableDrive** are slow — use targeted test runs only
- The `use-smart-starters.test.ts` file has **pre-existing failures** — exclude from validation
- The "Ready for Deploy" status may not exist — the command will prompt to create it if needed
- Each phase can be run independently using `--scope=<phase>` for incremental cleanup
- All changes are logged for audit trail — the conversation itself serves as the log
- UAT comments always mention **@AB** and **@Kham** for verification
- This command pairs with the full Linear lifecycle:
  1. `/linear-cleanup` — Board hygiene and sync
  2. `/linear-fix-issue ONEK-XXX` — Fix individual issues
  3. `/e2e-test-issue ONEK-XXX` — Verify fixes
  4. `/linear-update-summary ONEK-XXX` — Document for UAT
