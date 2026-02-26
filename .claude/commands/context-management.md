# Context Management

Manage the `.context/` documentation directory. This command **writes** context docs; use `/context-prime` to **read** them.

**Sub-command**: `$ARGUMENTS`

---

## Sub-commands

### `init`

Create the `.context/` directory structure and baseline documents.

**Steps:**
1. Create directories: `.context/`, `.context/status/`, `.context/assessments/`, `.context/planning/`, `.context/documentation/`, `.context/workspaces/`
2. Run `/context-prime full` to gather current project state
3. Create `.context/README.md` with a metrics summary table:
   - Rows: Architecture, Testing, Documentation, Deployment, Security, Overall
   - Columns: Area, Status (emoji), Completion %, Notes
4. Create `.context/overall_project_status.md` with sections: Overview, Current Sprint, Architecture Status, Key Metrics, Known Issues, Recent Changes
5. Create `.context/project_structure.md` from the `find -maxdepth 3` output
6. Create `.context/identified_issues.md` with any issues found during priming
7. Create `.context/recommendations.md` with prioritized next steps
8. Commit: `docs(context): initialize .context/ documentation`

### `analyze`

Identify stale or outdated context documentation.

**Steps:**
1. Run `git log --since="7 days ago" --oneline` to find recent changes
2. Run `git diff --stat HEAD~20` to see which areas changed most
3. For each file in `.context/`:
   - Check last modified date vs recent git activity
   - Flag if the doc references files/features that have changed since last update
4. Output a staleness report:
   ```
   ## Context Staleness Report
   | Document | Last Updated | Changes Since | Status |
   |----------|-------------|---------------|--------|
   | overall_project_status.md | 2025-12-01 | 14 commits | STALE |
   | project_structure.md | 2025-12-10 | 3 commits | OK |
   ```
5. Recommend which documents to update first

### `update $COMPONENT`

Refresh a specific area of context documentation. `$COMPONENT` can be: `status`, `structure`, `issues`, `recommendations`, `all`.

**Steps:**
1. Run `/context-prime` to get current project state
2. Read the existing `.context/` document for the target component
3. Update the document with current information:
   - `status` → Refresh `.context/overall_project_status.md` and `.context/README.md` metrics table
   - `structure` → Regenerate `.context/project_structure.md` from `find` output
   - `issues` → Update `.context/identified_issues.md` with new issues, close resolved ones
   - `recommendations` → Refresh `.context/recommendations.md` based on current state
   - `all` → Update all of the above in sequence
4. Add a "Last Updated" timestamp to each modified document
5. Commit: `docs(context): update {component} documentation`

### `generate`

Regenerate all `.context/` files from scratch (destructive — overwrites existing).

**Steps:**
1. Confirm with user: "This will overwrite all existing `.context/` files. Continue?"
2. Run `/context-prime full` for comprehensive project state
3. Regenerate every file as described in `init`, but using current project data
4. Preserve any `.context/workspaces/` content (workspace metadata is managed separately)
5. Run `analyze` to verify all docs are now current
6. Commit: `docs(context): regenerate all context documentation`

---

## Usage

```bash
/context-management init
/context-management analyze
/context-management update status
/context-management update all
/context-management generate
```
