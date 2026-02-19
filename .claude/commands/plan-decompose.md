# Plan Decompose -- PRD/Plan to Hierarchical Markdown Files + Linear Issues

Convert a PRD, implementation plan, or interactive description into both `.claude/plans/` hierarchy files AND mirrored Linear issues: Features > Epics > User Stories (with Given-When-Then AC) > Tasks. Auto-increments IDs, creates wikilinks, updates INDEX.md, and creates Linear issues with parent-child linking.

## Parameters:

- **Document Path** (optional): Path to a PRD or plan markdown file
- **`--parent-feature F{NNN}`** (optional): Expand an existing feature with new epics/stories/tasks
- **`--dry-run`** (optional): Preview the hierarchy tree without writing any files or creating issues
- **`--no-linear`** (optional): Create plan files only, skip Linear issue creation
- **`--interactive`** (optional): Force interactive mode even if a document path is provided
- Usage: `/plan-decompose [document-path] [--parent-feature F{NNN}] [--dry-run] [--no-linear] [--interactive]`

## Actions to Execute:

**IMPORTANT:** You MUST invoke the `plan-decompose` skill using the Skill tool BEFORE taking any action. The skill contains the full 10-step workflow for document analysis, hierarchy generation, file creation, INDEX.md updates, and Linear issue creation.

```
Skill: plan-decompose
Args: $ARGUMENTS
```

Follow the skill's instructions exactly. Do not proceed without loading it first.

---

<details>
<summary>Full workflow reference (loaded via skill above)</summary>

### Step 1: Parse Arguments and Validate Inputs

1. **Parse `$ARGUMENTS`**:
   - If a file path is provided (contains `/` or ends with `.md`):
     - Read the document using the Read tool
     - Use the document content to extract features, epics, stories, and tasks
   - If `--parent-feature F{NNN}` is provided:
     - Set expansion mode -- skip feature creation, add to existing feature
     - Verify the feature file exists: `.claude/plans/features/F{NNN}-*.md`
   - If `--dry-run` is provided:
     - Preview only -- display hierarchy tree but do not write files or create issues
   - If `--no-linear` is provided:
     - Create plan files only, skip Linear issue creation (Steps 8-9)
   - If `--interactive` or no path provided:
     - Ask: "Describe the feature you want to decompose. Include: name, description, major work areas, and key user-facing requirements."

2. **Validate Linear MCP** (unless `--no-linear`):
   - Call `list_issue_labels` to verify Linear MCP is reachable
   - If unavailable, warn and offer to continue with `--no-linear` behavior

3. **Display mode**:
   ```
   Plan Decompose: {document|interactive|expansion}
   Source: {path | "User input" | "Expanding F{NNN}"}
   Linear: {enabled | disabled (--no-linear)}
   ```

### Step 2: Scan Existing IDs

1. **Glob each plans subdirectory** for the highest existing numeric ID:
   ```bash
   # Use Glob tool for each:
   .claude/plans/features/F*.md
   .claude/plans/epics/EPIC*.md
   .claude/plans/user-stories/US*.md
   .claude/plans/tasks/TASK*.md
   ```

2. **Extract the highest ID** from each set of filenames by parsing the numeric portion after the prefix (F, EPIC, US, TASK).

3. **Set next ID counters**: `nextFeature`, `nextEpic`, `nextStory`, `nextTask` = highest + 1.

4. **Display**:
   ```
   ID Scan:
     Next Feature: F{NNN}    | Next Epic: EPIC{NNN}
     Next Story:   US{NNN}   | Next Task: TASK{NNN}
   ```

### Step 3: Analyze Document and Build Hierarchy

1. **Read the source document** (or use interactive input).

2. **Extract hierarchy levels**:
   - **Feature**: Top-level capability (1 per PRD, skip if `--parent-feature`)
   - **Epics**: Major functional groupings or phases
   - **User Stories**: Individual requirements as "As a... I want... so that..."
   - **Tasks**: Technical implementation items for each story

3. **For each item, determine**: title, priority (Critical/High/Medium/Low), description, and parent reference.

4. **Generate slugs**: lowercase, hyphens, max 40 chars (e.g., "Real-Time Quote Updates" -> `real-time-quote-updates`).

### Step 4: Generate Acceptance Criteria

For each user story, generate Given-When-Then acceptance criteria:

**Rule**: Minimum 2 AC per story (1 happy path + 1 edge/error case).

**Format** (match existing files):
```markdown
### AC1: {Scenario Name}
**Given** {precondition}
**When** {action}
**Then** {result}

### AC2: {Edge/Error Scenario}
**Given** {precondition}
**When** {action}
**Then** {result}
```

### Step 5: Present Hierarchy Tree for User Confirmation

Display the full tree with IDs, priorities, story points, and AC counts:

```
=== Plan Decomposition Preview ===

F{NNN} - {Feature Name} [{Priority}]
├── EPIC{NNN} - {Epic Name} [{Priority}]
│   ├── US{NNN} - {Story Title} [{Priority}, {SP}sp] ({N} AC)
│   │   ├── TASK{NNN} - {Task Name} [{Priority}, {Est}h]
│   │   └── TASK{NNN} - {Task Name} [{Priority}, {Est}h]
│   └── US{NNN} - {Story Title} [{Priority}, {SP}sp] ({N} AC)
│       └── TASK{NNN} - {Task Name} [{Priority}, {Est}h]
└── EPIC{NNN} - {Epic Name} [{Priority}]
    └── US{NNN} - {Story Title} [{Priority}, {SP}sp] ({N} AC)
        └── TASK{NNN} - {Task Name} [{Priority}, {Est}h]

Summary: {N} feature, {N} epics, {N} stories ({N} AC), {N} tasks
```

**If `--dry-run`**: Stop here. Do not create files.

**Otherwise**: Ask user to confirm:
```
Options:
  (a) Create all files
  (b) Edit hierarchy before creating
  (c) Cancel
```

Wait for user confirmation before proceeding.

### Step 6: Write Markdown Files

Create each file in the correct subdirectory using Write tool. Templates:

**Feature** (`features/F{NNN}-{slug}.md`):
- Header: `# Feature ID`, `# Feature Name`, `# Status: Planned`, `# Priority`
- Sections: Description, Business Value, Key Capabilities, Related Epics (wikilinks), Dependencies, Technical Components

**Epic** (`epics/EPIC{NNN}-{slug}.md`):
- Header: `# Epic ID`, `# Epic Name`, `# Parent Feature: [[F{NNN}-{slug}|F{NNN} - {name}]]`, `# Status: Planned`, `# Priority`
- Sections: Description, Goals, User Stories (wikilinks), Acceptance Criteria Summary, Technical Scope

**User Story** (`user-stories/US{NNN}-{slug}.md`):
- Header: `# User Story ID`, `# Title`, `# Parent Epic: [[EPIC{NNN}-{slug}|EPIC{NNN} - {name}]]`, `# Status: Planned`, `# Priority`, `# Story Points`
- Sections: User Story (As a.../I want.../so that...), Acceptance Criteria (Given/When/Then), Tasks (wikilinks), Technical Notes

**Task** (`tasks/TASK{NNN}-{slug}.md`):
- Header: `# Task ID`, `# Task Name`, `# Parent User Story: [[US{NNN}-{slug}|US{NNN} - {title}]]`, `# Status: Pending`, `# Priority`, `# Estimate`
- Sections: Description, Acceptance Criteria, Implementation Details, Dependencies

**Expansion mode** (`--parent-feature`):
- Read the existing feature file
- Append new epic wikilinks to the `## Related Epics` section using Edit tool
- Create epics, stories, and tasks as normal

### Step 7: Update INDEX.md

1. **Read** `.claude/plans/INDEX.md`

2. **Update the Summary Statistics table**: Increment the counts for Features, Epics, User Stories, Tasks.

3. **Append a new Feature Map entry** after the last `### [[F...` block:
   ```markdown
   ### [[F{NNN}-{slug}|F{NNN} - {Feature Name}]] ({PRIORITY})
   > {one-line description}

   | Epic | User Stories | Tasks |
   |------|-------------|-------|
   | [[EPIC{NNN}-{slug}|EPIC{NNN} - {Epic Name}]] | [[US{NNN}-{slug}|US{NNN}]]-[[US{NNN}-{slug}|US{NNN}]] | [[TASK{NNN}-{slug}|TASK{NNN}]]-[[TASK{NNN}-{slug}|TASK{NNN}]] |
   ```

4. **For expansion mode**: Find the existing feature's section and append the new epic row to its table.

### Step 8: Create Linear Issues (Mirrored Hierarchy)

**Skip if `--no-linear` flag is set.**

Create Linear issues mirroring the same Feature > Epic > User Story > Task hierarchy using `parentId` linking.

**Creation order** (top-down, each level needs the parent's issue ID):

1. **Feature issue** (top level):
   ```
   create_issue({ title: "F{NNN}: {name}", team: "One Kaleidoscope", labels: ["Feature"], state: "Backlog" })
   ```
   Store returned ID as `$FEATURE_ISSUE_ID`.

2. **Epic issues** (mid level, parentId = feature):
   ```
   create_issue({ title: "Epic: {name}", parentId: $FEATURE_ISSUE_ID, team: "One Kaleidoscope", labels: ["Feature"], state: "Backlog" })
   ```
   Store each returned ID as `$EPIC_ISSUE_ID`.

3. **User Story issues** (parentId = epic):
   ```
   create_issue({ title: "Story: {title}", parentId: $EPIC_ISSUE_ID, description: "...AC in Given/When/Then...", team: "One Kaleidoscope", labels: ["Feature"], state: "Backlog" })
   ```
   Store each returned ID as `$STORY_ISSUE_ID`.

4. **Task issues** (leaf level, parentId = story):
   ```
   create_issue({ title: "Dev: {name}", parentId: $STORY_ISSUE_ID, team: "One Kaleidoscope", labels: ["Agent:Coder"], state: "Backlog" })
   ```

Each Linear issue description includes a `**Plan File**:` link back to the corresponding `.claude/plans/` file.

**Rate limiting**: If >20 issues, batch with 1-second delays and show progress.

### Step 9: Cross-Link Plan Files with Linear IDs

After Linear issues are created, update each plan file to add a `# Linear Issue: ONEK-{NNN}` header line (inserted after the ID header). This creates bidirectional links: plan file references Linear, Linear description references plan file.

Use the Edit tool to insert the line into each file.

### Step 10: Final Report

Display a comprehensive summary:

```
=== Plan Decomposition Complete ===

Source: {path or "Interactive"}

Plan Files: {N} created
  features/F{NNN}-{slug}.md
  epics/EPIC{NNN}-{slug}.md, ...
  user-stories/US{NNN}-{slug}.md, ...
  tasks/TASK{NNN}-{slug}.md, ...

INDEX.md: updated (+{N} feature, +{N} epics, +{N} stories, +{N} tasks)

Linear Issues: {N} created
  ONEK-300 -- F{NNN}: {Feature Name}              [Feature]
  ├── ONEK-301 -- Epic: {name}                    [Feature]
  │   ├── ONEK-311 -- Story: {title} (3 AC)       [Feature]
  │   │   ├── ONEK-321 -- Dev: {task}             [Agent:Coder]
  │   │   └── ONEK-322 -- Dev: {task}             [Agent:Coder]
  │   └── ONEK-312 -- Story: {title} (2 AC)       [Feature]
  │       └── ONEK-323 -- Dev: {task}             [Agent:Coder]
  └── ONEK-302 -- Epic: {name}                    [Feature]
      └── ONEK-313 -- Story: {title} (2 AC)       [Feature]
          └── ONEK-324 -- Dev: {task}             [Agent:Coder]

Cross-links: All plan files updated with ONEK IDs

Options:
  (a) Generate UAT instructions (/uat_instructions)
  (b) Start implementation (/work-on-issue ONEK-{first-story})
  (c) Done
```

## Error Handling

### Document Not Found
- Warn: "Document not found at '{path}'. Switching to interactive mode."
- Fall back to user input.

### Parent Feature Not Found
- Error: "Feature F{NNN} not found in .claude/plans/features/."
- Stop execution.

### ID Collision
- If a computed filename already exists, increment the ID.
- Warn: "ID collision on {filename}. Using {new_filename}."

### INDEX.md Not Found
- Warn: "INDEX.md not found. Skipping index update."
- Still create the individual files.

## Notes

- All plan files use `#` header metadata (NOT YAML frontmatter) -- matching the existing 462 files
- Wikilinks use `[[FILENAME-WITHOUT-EXT|Display Text]]` format
- Slugs are kebab-case, max 40 characters
- Status defaults: Features/Epics/Stories = `Planned`, Tasks = `Pending`
- The user MUST confirm the hierarchy tree before any files are written or issues created
- Linear issues are created by default using the same Feature > Epic > Story > Task hierarchy with `parentId` linking
- Use `--no-linear` to skip Linear issue creation (plan files only)
- All Linear issues are created in the **One Kaleidoscope** team with state **Backlog**
- Feature/Epic/Story issues use the `Feature` label; Task issues use the `Agent:Coder` label
- Each Linear issue description includes a `**Plan File**:` back-link to the `.claude/plans/` file
- Each plan file gets a `# Linear Issue: ONEK-{NNN}` header for bidirectional cross-linking
- If Linear MCP is unavailable, plan files are still created and a warning is displayed

</details>
