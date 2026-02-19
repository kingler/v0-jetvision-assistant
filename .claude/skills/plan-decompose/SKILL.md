---
name: plan-decompose
description: Use when converting a PRD, implementation plan, or feature description into the hierarchical markdown file structure in .claude/plans/ AND corresponding Linear issues. Generates features, epics, user stories (with Given-When-Then AC), and tasks as individual files with wikilinks, auto-incremented IDs, INDEX.md updates, and mirrored Linear issues with parent-child linking.
---

# Plan Decompose Skill

Convert a PRD, implementation plan, or interactive description into both the hierarchical `.claude/plans/` markdown file structure AND mirrored Linear issues: Features > Epics > User Stories (with Given-When-Then AC) > Tasks. All plan files use `#` header metadata, Obsidian `[[wikilinks]]`, and auto-incremented IDs. All Linear issues are created with the same hierarchy using `parentId` linking.

## When to Use

- **New feature planning** that needs decomposition into plan files AND Linear issues simultaneously
- **Converting a PRD or plan document** into trackable feature/epic/story/task hierarchy (files + Linear)
- **Expanding an existing feature** with new epics, stories, and tasks
- **After brainstorming** when you have a feature spec ready for full decomposition
- **Sprint planning** when features need formal breakdown with both documentation and issue tracking

## When NOT to Use

- **Linear issues only (no plan files)** -- use `/create-linear-issue` instead
- **Plan files only (no Linear)** -- use this with `--no-linear` flag
- **Single task tracking** -- just create a task file manually
- **Updating existing plan files** -- edit them directly
- **Generating test plans** -- use `/uat_instructions` or `/e2e-test-issue`

## Core Workflow

```
docs/plans/YYYY-MM-DD-feature.md        (input: PRD or plan document)
        |
        v
/plan-decompose [path] [flags]          (THIS SKILL)
        |
        v
Scan .claude/plans/*/ for highest IDs   (auto-increment)
        |
        v
Analyze document -> extract hierarchy   (features, epics, stories, tasks)
        |
        v
Generate Given-When-Then AC             (min 2 per user story)
        |
        v
Present hierarchy tree for confirmation (user gate)
        |
        v
Write .claude/plans/{features,epics,    (individual markdown files)
  user-stories,tasks}/*.md
        |
        v
Update .claude/plans/INDEX.md           (append feature map, update stats)
        |
        v
Create Linear issues (same hierarchy)   (Feature > Epic > Story > Task with parentId)
        |
        v
Cross-link plan files with ONEK IDs     (add Linear issue IDs to plan files)
        |
        v
Offer UAT generation                    (optional: /uat_instructions)
```

## Prerequisites

1. **`.claude/plans/` directory** exists with `features/`, `epics/`, `user-stories/`, `tasks/` subdirectories
2. **`.claude/plans/INDEX.md`** exists as the master index
3. **Linear MCP** configured in `.mcp.json` (unless `--no-linear` flag is used)
4. **Team**: One Kaleidoscope (hardcoded default for Linear)
5. **Labels exist in Linear**: `Feature`, `Bug`, `Agent:UX-Designer`, `Agent:Coder` (verified at runtime)
6. **Source document** (optional) -- a PRD, plan, or feature description in markdown

## Command Usage

### From a Document (files + Linear issues)

```bash
/plan-decompose docs/plans/2026-02-15-feature.md
```

### Interactive Mode

```bash
/plan-decompose
/plan-decompose --interactive
```

### Expand Existing Feature

```bash
/plan-decompose docs/plans/epic-spec.md --parent-feature F015
```

### Dry Run (Preview Only)

```bash
/plan-decompose docs/plans/feature.md --dry-run
```

### Plan Files Only (Skip Linear)

```bash
/plan-decompose docs/plans/feature.md --no-linear
```

## Detailed Steps

### Step 1: Parse Arguments

1. **Parse `$ARGUMENTS`**:
   - If a file path is provided (contains `/` or ends with `.md`): read the document
   - If `--parent-feature F{NNN}` is provided: set expansion mode (add to existing feature)
   - If `--dry-run` is provided: preview hierarchy tree without writing files or creating issues
   - If `--no-linear` is provided: create plan files only, skip Linear issue creation
   - If `--interactive` or no path: prompt user to describe the feature

2. **Validate inputs**:
   - If file path provided, verify it exists with Read tool
   - If `--parent-feature` provided, verify the feature file exists in `.claude/plans/features/`
   - Unless `--no-linear`, verify Linear MCP is available by calling `list_issue_labels`
   - Display: `Mode: {document|interactive|expansion}, Source: {path|user input}, Linear: {yes|no}`

### Step 2: Scan Existing IDs

1. **Glob each subdirectory** to find the highest existing ID:

   ```
   .claude/plans/features/F*.md     -> highest F{NNN}
   .claude/plans/epics/EPIC*.md     -> highest EPIC{NNN}
   .claude/plans/user-stories/US*.md -> highest US{NNN}
   .claude/plans/tasks/TASK*.md     -> highest TASK{NNN}
   ```

2. **Extract numeric IDs** from filenames using the pattern prefix (F, EPIC, US, TASK) followed by zero-padded digits.

3. **Set next ID counters**:
   ```
   nextFeature = max(F###) + 1
   nextEpic    = max(EPIC###) + 1
   nextStory   = max(US###) + 1
   nextTask    = max(TASK###) + 1
   ```

4. **Display**:
   ```
   ID Scan Complete:
     Features:     F001-F{max}     -> next: F{next}
     Epics:        EPIC001-EPIC{max} -> next: EPIC{next}
     User Stories: US001-US{max}   -> next: US{next}
     Tasks:        TASK001-TASK{max} -> next: TASK{next}
   ```

### Step 3: Analyze Document and Extract Hierarchy

1. **Read the source document** (or gather from user input in interactive mode).

2. **Extract the hierarchy**:
   - **Features**: Top-level capabilities or product areas (usually 1 per PRD)
   - **Epics**: Major work areas, phases, or functional groupings within the feature
   - **User Stories**: Individual user-facing requirements in "As a... I want... so that..." format
   - **Tasks**: Technical implementation work items for each story

3. **For each level, determine**:
   - **Title**: Concise name (used in filename slug)
   - **Priority**: Critical, High, Medium, or Low
   - **Description**: Detailed description from the source
   - **Parent**: The parent item in the hierarchy

4. **Slug generation rules**:
   - Derive from title: lowercase, replace spaces with hyphens, remove special characters
   - Maximum 40 characters
   - Examples: "AI Chat Assistant" -> `ai-chat-assistant`, "Handle Chat Errors Gracefully" -> `handle-chat-errors-gracefully`

### Step 4: Generate Acceptance Criteria

For each user story, generate Given-When-Then acceptance criteria:

**Validation Rule**: Every user story MUST have at least 2 acceptance criteria:
- 1 primary scenario (happy path)
- 1 edge case, error case, or boundary scenario

**Format** (must match existing files exactly):

```markdown
### AC1: {Scenario Name}
**Given** {precondition or initial state}
**When** {user action or system event}
**Then** {expected observable result}

### AC2: {Edge Case or Error Scenario}
**Given** {precondition for boundary/error condition}
**When** {action that tests the edge case}
**Then** {expected error handling or fallback behavior}
```

**Quality Rules**:

| Good | Bad |
|------|-----|
| "Given a round-trip with 2 legs, when viewing the proposal, then both legs display with dates and prices" | "Proposals work for round trips" |
| "Given no internet connection, when clicking Send, then an error toast appears and the draft is preserved" | "Handle offline" |

### Step 5: Present Hierarchy Tree for Confirmation

Display the full hierarchy with assigned IDs, priorities, and estimates:

```
=== Plan Decomposition Preview ===

Source: docs/plans/2026-02-15-feature.md

F{NNN} - {Feature Name} [{Priority}]
├── EPIC{NNN} - {Epic Name} [{Priority}]
│   ├── US{NNN} - {Story Title} [{Priority}, {SP}sp] (3 AC)
│   │   ├── TASK{NNN} - {Task Name} [{Priority}, {Est}h]
│   │   └── TASK{NNN} - {Task Name} [{Priority}, {Est}h]
│   └── US{NNN} - {Story Title} [{Priority}, {SP}sp] (2 AC)
│       └── TASK{NNN} - {Task Name} [{Priority}, {Est}h]
└── EPIC{NNN} - {Epic Name} [{Priority}]
    └── US{NNN} - {Story Title} [{Priority}, {SP}sp] (2 AC)
        ├── TASK{NNN} - {Task Name} [{Priority}, {Est}h]
        └── TASK{NNN} - {Task Name} [{Priority}, {Est}h]

Summary: 1 feature, 2 epics, 3 user stories (7 AC), 5 tasks

Options:
  (a) Create all files
  (b) Edit hierarchy before creating
  (c) Cancel
```

**If `--dry-run`**: Display the tree and stop. Do not create any files.

**Wait for user confirmation** before proceeding to Step 6.

### Step 6: Write Markdown Files

Create each file using the templates below. All files use `#` header metadata (NOT YAML frontmatter) and Obsidian `[[wikilinks]]`.

#### Feature Template (`features/F{NNN}-{slug}.md`)

```markdown
# Feature ID: F{NNN}
# Feature Name: {name}
# Status: Planned
# Priority: {Critical|High|Medium|Low}

## Description
{detailed description from source document}

## Business Value
{why this feature matters -- extract from PRD or generate from context}

## Key Capabilities
- {capability 1}
- {capability 2}
- {capability N}

## Related Epics
- [[EPIC{NNN}-{slug}|EPIC{NNN} - {Epic Name}]]
- [[EPIC{NNN}-{slug}|EPIC{NNN} - {Epic Name}]]

## Dependencies
- [[F{NNN}-{slug}|F{NNN} - {Dependency Name}]]

## Technical Components
- {file or module reference}
```

#### Epic Template (`epics/EPIC{NNN}-{slug}.md`)

```markdown
# Epic ID: EPIC{NNN}
# Epic Name: {name}
# Parent Feature: [[F{NNN}-{slug}|F{NNN} - {Feature Name}]]
# Status: Planned
# Priority: {Critical|High|Medium|Low}

## Description
{detailed description}

## Goals
- {goal 1}
- {goal 2}

## User Stories
- [[US{NNN}-{slug}|US{NNN} - {Story Title}]]
- [[US{NNN}-{slug}|US{NNN} - {Story Title}]]

## Acceptance Criteria Summary
- {summary criterion 1}
- {summary criterion 2}

## Technical Scope
- {component or module}
```

#### User Story Template (`user-stories/US{NNN}-{slug}.md`)

```markdown
# User Story ID: US{NNN}
# Title: {title}
# Parent Epic: [[EPIC{NNN}-{slug}|EPIC{NNN} - {Epic Name}]]
# Status: Planned
# Priority: {Critical|High|Medium|Low}
# Story Points: {1|2|3|5|8|13}

## User Story
As a {role}, I want {action}, so that {benefit}.

## Acceptance Criteria

### AC1: {Scenario Name}
**Given** {precondition}
**When** {action}
**Then** {result}

### AC2: {Edge/Error Scenario}
**Given** {precondition}
**When** {action}
**Then** {result}

## Tasks
- [[TASK{NNN}-{slug}|TASK{NNN} - {Task Name}]]
- [[TASK{NNN}-{slug}|TASK{NNN} - {Task Name}]]

## Technical Notes
- {implementation note}
```

#### Task Template (`tasks/TASK{NNN}-{slug}.md`)

```markdown
# Task ID: TASK{NNN}
# Task Name: {name}
# Parent User Story: [[US{NNN}-{slug}|US{NNN} - {Story Title}]]
# Status: Pending
# Priority: {Critical|High|Medium|Low}
# Estimate: {N}h

## Description
{what needs to be done}

## Acceptance Criteria
- {testable criterion 1}
- {testable criterion 2}

## Implementation Details
- **File(s)**: {target files}
- **Approach**: {implementation approach}

## Dependencies
- {dependency or "None"}
```

#### Expansion Mode (`--parent-feature`)

When expanding an existing feature:
1. Read the existing feature file
2. Append new epic wikilinks to the `## Related Epics` section
3. Create new epics, stories, and tasks with auto-incremented IDs
4. Do NOT create a new feature file

### Step 7: Update INDEX.md

1. **Read `.claude/plans/INDEX.md`**

2. **Update Summary Statistics** table:
   - Increment the counts for Features, Epics, User Stories, Tasks by the number created

3. **Append Feature Map entry** (after the last `### [[F...` section):

   ```markdown
   ### [[F{NNN}-{slug}|F{NNN} - {Feature Name}]] ({PRIORITY})
   > {one-line description}

   | Epic | User Stories | Tasks |
   |------|-------------|-------|
   | [[EPIC{NNN}-{slug}|EPIC{NNN} - {Epic Name}]] | [[US{NNN}-{slug}|US{NNN}]]-[[US{NNN}-{slug}|US{NNN}]] | [[TASK{NNN}-{slug}|TASK{NNN}]]-[[TASK{NNN}-{slug}|TASK{NNN}]] |
   ```

4. **For expansion mode**: Find the existing feature's section in INDEX.md and append the new epic row to its table.

### Step 8: Create Linear Issues (Mirrored Hierarchy)

**Skip this step if `--no-linear` flag is set.**

Create Linear issues that mirror the exact same Feature > Epic > User Story > Task hierarchy, using `parentId` linking to maintain the tree structure.

#### 8a: Create Feature Issue (Top Level)

```
create_issue({
  title: "F{NNN}: {Feature Name}",
  description: "## Feature: {name}\n\n{description}\n\n**Plan File**: `.claude/plans/features/F{NNN}-{slug}.md`\n\n## Business Value\n{value}\n\n## Key Capabilities\n{capabilities list}",
  team: "One Kaleidoscope",
  labels: ["Feature"],
  priority: {1-4 based on Critical/High/Medium/Low},
  state: "Backlog"
})
```

Store the returned issue ID as `$FEATURE_ISSUE_ID` (e.g., `ONEK-300`).

#### 8b: Create Epic Issues (Mid Level)

For each epic:

```
create_issue({
  title: "Epic: {Epic Name}",
  description: "## Epic: {name}\n\n{description}\n\n**Plan File**: `.claude/plans/epics/EPIC{NNN}-{slug}.md`\n**Parent Feature**: F{NNN}\n\n## Goals\n{goals}\n\n## Acceptance Criteria Summary\n{summary}",
  team: "One Kaleidoscope",
  parentId: "{FEATURE_ISSUE_ID}",
  labels: ["Feature"],
  priority: {inherited or specified},
  state: "Backlog"
})
```

Store each epic issue ID as `$EPIC_ISSUE_ID`.

#### 8c: Create User Story Issues (Low Level)

For each user story:

```
create_issue({
  title: "Story: {Story Title}",
  description: "## User Story\n\nAs a {role}, I want {action} so that {benefit}.\n\n**Plan File**: `.claude/plans/user-stories/US{NNN}-{slug}.md`\n**Parent Epic**: EPIC{NNN}\n\n## Acceptance Criteria\n\n### AC-1: {scenario}\n\n**Given** {precondition}\n**When** {action}\n**Then** {result}\n\n### AC-2: {scenario}\n\n**Given** {precondition}\n**When** {action}\n**Then** {result}",
  team: "One Kaleidoscope",
  parentId: "{EPIC_ISSUE_ID}",
  labels: ["Feature"],
  state: "Backlog"
})
```

Store each story issue ID as `$STORY_ISSUE_ID`.

#### 8d: Create Task Issues (Leaf Level)

For each task:

```
create_issue({
  title: "Dev: {Task Name}",
  description: "## Task\n\n{description}\n\n**Plan File**: `.claude/plans/tasks/TASK{NNN}-{slug}.md`\n**Parent Story**: US{NNN}\n\n## Acceptance Criteria\n{criteria}\n\n## Implementation Details\n{details}",
  team: "One Kaleidoscope",
  parentId: "{STORY_ISSUE_ID}",
  labels: ["Agent:Coder"],
  priority: {inherited},
  estimate: {hours},
  state: "Backlog"
})
```

#### 8e: Rate Limiting

If creating more than 20 issues, batch requests with a 1-second delay between batches. Display progress:

```
Creating Linear issues... [12/25] ONEK-312 — Story: {title}
```

### Step 9: Cross-Link Plan Files with Linear Issue IDs

After all Linear issues are created, update each plan file to include its corresponding Linear issue ID. Add a `# Linear Issue: ONEK-{NNN}` header line after the existing header metadata.

**Example** -- update `features/F016-new-feature.md`:

Before:
```
# Feature ID: F016
# Feature Name: New Feature
# Status: Planned
# Priority: High
```

After:
```
# Feature ID: F016
# Feature Name: New Feature
# Linear Issue: ONEK-300
# Status: Planned
# Priority: High
```

Use the Edit tool to insert the `# Linear Issue:` line into each created plan file. This creates a bidirectional link: plan file references Linear, Linear description references plan file.

### Step 10: Final Report and UAT Offer

Display a comprehensive summary:

```
=== Plan Decomposition Complete ===

Source: {document path or "Interactive"}

Plan Files Created: {N} total
  features/F{NNN}-{slug}.md
  epics/EPIC{NNN}-{slug}.md, EPIC{NNN}-{slug}.md
  user-stories/US{NNN}-{slug}.md, US{NNN}-{slug}.md, US{NNN}-{slug}.md
  tasks/TASK{NNN}-{slug}.md, TASK{NNN}-{slug}.md, ...

INDEX.md: updated (+{N} feature, +{N} epics, +{N} stories, +{N} tasks)

Linear Issues Created: {N} total
  ONEK-300 — F{NNN}: {Feature Name}                    [Feature]
  ├── ONEK-301 — Epic: {Epic Name}                     [Feature]
  │   ├── ONEK-311 — Story: {Story Title} (3 AC)       [Feature]
  │   │   ├── ONEK-321 — Dev: {Task Name}              [Agent:Coder]
  │   │   └── ONEK-322 — Dev: {Task Name}              [Agent:Coder]
  │   └── ONEK-312 — Story: {Story Title} (2 AC)       [Feature]
  │       └── ONEK-323 — Dev: {Task Name}              [Agent:Coder]
  └── ONEK-302 — Epic: {Epic Name}                     [Feature]
      └── ONEK-313 — Story: {Story Title} (2 AC)       [Feature]
          └── ONEK-324 — Dev: {Task Name}              [Agent:Coder]

Cross-links: All plan files updated with Linear issue IDs

Options:
  (a) Generate UAT instructions for user stories (/uat_instructions)
  (b) Start implementation (/work-on-issue ONEK-{first-story})
  (c) Done
```

If the user selects (a), invoke `/uat_instructions` for each user story issue.
If the user selects (b), invoke `/work-on-issue` with the first user story's ONEK ID.

## Validation Rules

### File Naming
- Features: `F{NNN}-{slug}.md` where NNN is zero-padded to 3 digits
- Epics: `EPIC{NNN}-{slug}.md` where NNN is zero-padded to 3 digits
- User Stories: `US{NNN}-{slug}.md` where NNN is zero-padded to 3 digits
- Tasks: `TASK{NNN}-{slug}.md` where NNN is zero-padded to 3 digits
- Slugs: kebab-case, max 40 characters, alphanumeric and hyphens only

### Wikilinks
- Format: `[[FILENAME-WITHOUT-EXT|Display Text]]`
- Example: `[[EPIC036-new-epic|EPIC036 - New Epic Name]]`
- All parent/child references MUST use wikilinks
- Wikilinks MUST resolve to actual files that exist or will be created

### Header Metadata
- Use `#` prefix (NOT YAML frontmatter) for ID, Name/Title, Status, Priority, etc.
- Match the exact format of existing files (see templates above)
- Status defaults: Features/Epics/Stories = `Planned`, Tasks = `Pending`

### Acceptance Criteria
- Minimum 2 AC per user story (1 happy path + 1 edge/error case)
- Use `**Given**`, `**When**`, `**Then**` with bold keywords
- Each AC has a descriptive name after `### AC{N}:`

## Error Handling

### Source Document Not Found
- Warn: "Document not found at '{path}'. Switching to interactive mode."
- Fall back to interactive input.

### Parent Feature Not Found (Expansion Mode)
- Error: "Feature file F{NNN} not found in .claude/plans/features/. Check the feature ID."
- Stop execution.

### INDEX.md Not Found
- Warn: "INDEX.md not found. Skipping index update. Files were still created."
- Continue with file creation, skip Step 7.

### ID Collision
- If a file with the computed name already exists, increment the ID and regenerate the slug.
- Warn: "ID collision: {filename} already exists. Using {new_filename} instead."

### Linear MCP Unavailable
- If Linear MCP tools fail during Step 8:
  - Warn: "Linear MCP unavailable. Plan files were created successfully. Linear issues skipped."
  - Display: "Run `/create-linear-issue .claude/plans/features/F{NNN}-{slug}.md` later to create Linear issues."
  - Continue to final report without Linear section.

### Linear Rate Limiting
- If creating more than 20 issues, batch with 1-second delays.
- Display progress: `Creating Linear issues... [12/25] ONEK-312 -- Story: {title}`

## Linear MCP Tools Used

| Tool | Purpose |
|------|---------|
| `create_issue` | Create issues at all hierarchy levels (with parentId linking) |
| `get_issue` | Fetch parent issue details for expansion mode |
| `update_issue` | Update descriptions with cross-links if needed |
| `list_issue_labels` | Verify required labels exist before creating issues |

## References

- [INDEX.md](/.claude/plans/INDEX.md) -- Master index to update
- [create-linear-issue](/.claude/commands/create-linear-issue.md) -- Linear issue creation (chaining target)
- [pr-followup-issues](/.claude/skills/pr-followup-issues/SKILL.md) -- Structural reference for skill format
- [F001-ai-chat-assistant.md](/.claude/plans/features/F001-ai-chat-assistant.md) -- Canonical feature format
- [EPIC001-chat-interface-core.md](/.claude/plans/epics/EPIC001-chat-interface-core.md) -- Canonical epic format
- [US001-send-message-to-ai.md](/.claude/plans/user-stories/US001-send-message-to-ai.md) -- Canonical story format
- [TASK001-implement-chat-input.md](/.claude/plans/tasks/TASK001-implement-chat-input.md) -- Canonical task format
