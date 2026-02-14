# Create Linear Issues with Hierarchy

Create structured Linear issues with proper parent-child hierarchy: Feature Request or Bug Fix > Epic > User Story > Design/Development Tasks. All user stories include Given-When-Then acceptance criteria.

## Parameters:

- **Plan Document** (optional): Path to a planning document to seed issue content (e.g., `.claude/plans/2026-02-12-chat-session-load.md`)
- **`--type`** (optional): Top-level issue type — `feature` (default) or `bug`
- **`--epic-only`** (optional): Create only an epic under an existing feature/bug
- **`--story-only`** (optional): Create only a user story under an existing epic
- Usage: `/create-linear-issue [plan-path] [--type=feature|bug] [--epic-only ONEK-XXX] [--story-only ONEK-XXX]`

## Actions to Execute:

### Step 1: Parse Arguments and Determine Mode

1. **Parse `$ARGUMENTS`**:
   - If a file path is provided (contains `/` or ends with `.md`):
     - Read the plan document to extract feature name, scope, and requirements
     - Use the plan content to pre-populate issue titles, descriptions, and acceptance criteria
   - If `--type=bug` is provided, set the top-level type to "Bug Fix" (label: `Bug`)
   - If `--type=feature` or no type flag, set to "Feature Request" (label: `Feature`)
   - If `--epic-only ONEK-XXX` is provided:
     - Fetch the parent issue using `get_issue`
     - Skip to Step 3 (Epic Creation) with parentId set
   - If `--story-only ONEK-XXX` is provided:
     - Fetch the parent epic using `get_issue`
     - Skip to Step 4 (User Story Creation) with parentId set
   - If no arguments provided:
     - Ask the user: "What would you like to create? Describe the feature or bug, or provide a plan document path."

### Step 2: Create Top-Level Issue (Feature Request or Bug Fix)

1. **Gather information** (from plan document or user input):
   - **Title**: Concise feature/bug name (e.g., "Chat Session Loading Performance")
   - **Description**: Markdown description including:
     - Problem statement or feature overview
     - Business value / user impact
     - High-level scope
     - Links to plan document if provided

2. **Determine labels**:
   - Feature Request → label: `Feature`
   - Bug Fix → label: `Bug`

3. **Create the top-level issue** using Linear MCP `create_issue`:
   ```
   create_issue({
     title: "{Feature/Bug title}",
     description: "{description with overview}",
     team: "One Kaleidoscope",
     labels: ["{Feature or Bug}"],
     priority: {1-4 based on user input, default 3},
     state: "Backlog"
   })
   ```

4. **Store the created issue ID** as `$FEATURE_ID` for parent linking.

5. **Display result**:
   ```
   Created: ONEK-XXX — {title}
   Type: {Feature Request | Bug Fix}
   Status: Backlog
   ```

### Step 3: Create Epics (Mid-Level)

1. **Identify epics** from the plan document or ask the user:
   - If plan document provided: Extract major sections/phases as epics
   - If no plan: Ask "What are the major work areas (epics) for this feature? List them, or describe and I'll suggest a breakdown."

2. **For each epic**, create a Linear issue:
   ```
   create_issue({
     title: "Epic: {epic name}",
     description: "## Epic: {name}\n\n{scope description}\n\n**Parent**: ONEK-{FEATURE_ID}\n\n### Scope\n{bullet list of what this epic covers}",
     team: "One Kaleidoscope",
     parentId: "{FEATURE_ID}",
     labels: ["{Feature or Bug}"],
     priority: {inherited or specified},
     state: "Backlog"
   })
   ```

3. **Store each epic ID** for user story linking.

4. **Display epic summary**:
   ```
   Epics Created:
     ONEK-XXX — Epic: {name 1}
     ONEK-YYY — Epic: {name 2}
     ...
   Parent: ONEK-{FEATURE_ID}
   ```

### Step 4: Create User Stories (Low-Level)

1. **For each epic**, identify user stories:
   - If plan document provided: Extract tasks/requirements as user stories
   - If no plan: Ask "What user stories belong to epic '{epic name}'? Use the format: As a [role], I want [action] so that [benefit]."

2. **For each user story**, generate acceptance criteria in Given-When-Then format:

   **Validation Rule**: Every user story MUST have at least 2 acceptance criteria:
   - 1 primary scenario (happy path)
   - 1 edge case, error case, or regression scenario

   If the user provides a story without acceptance criteria, generate them and ask for confirmation before creating the issue.

   **Acceptance criteria format**:
   ```markdown
   ## Acceptance Criteria

   ### AC-1: {Scenario Name}

   **Given** {precondition or initial state}
   **When** {user action or system event}
   **Then** {expected observable result}

   ### AC-2: {Edge Case or Error Scenario}

   **Given** {precondition}
   **When** {action that tests boundary/error}
   **Then** {expected handling behavior}
   ```

3. **Create each user story** using Linear MCP `create_issue`:
   ```
   create_issue({
     title: "Story: {user story title}",
     description: "## User Story\n\nAs a {role}, I want {action} so that {benefit}.\n\n## Acceptance Criteria\n\n### AC-1: {scenario}\n\n**Given** {precondition}\n**When** {action}\n**Then** {result}\n\n### AC-2: {scenario}\n\n**Given** {precondition}\n**When** {action}\n**Then** {result}\n\n---\n\n**Epic**: ONEK-{EPIC_ID}\n**Feature**: ONEK-{FEATURE_ID}",
     team: "One Kaleidoscope",
     parentId: "{EPIC_ID}",
     labels: ["{Feature or Bug}"],
     state: "Backlog"
   })
   ```

4. **Store each story ID** for task linking.

5. **Display user story summary** with AC count:
   ```
   User Stories Created for Epic ONEK-{EPIC_ID}:
     ONEK-AAA — Story: {name 1} (3 AC)
     ONEK-BBB — Story: {name 2} (2 AC)
     ...
   ```

### Step 5: Create Design and Development Tasks

1. **For each user story**, create sub-tasks:

   **Design Tasks** (if applicable):
   ```
   create_issue({
     title: "Design: {task description}",
     description: "Design task for Story ONEK-{STORY_ID}\n\n{details}",
     team: "One Kaleidoscope",
     parentId: "{STORY_ID}",
     labels: ["Agent:UX-Designer"],
     state: "Backlog"
   })
   ```

   **Development Tasks**:
   ```
   create_issue({
     title: "Dev: {task description}",
     description: "Development task for Story ONEK-{STORY_ID}\n\n{implementation details}",
     team: "One Kaleidoscope",
     parentId: "{STORY_ID}",
     labels: ["Agent:Coder"],
     state: "Backlog"
   })
   ```

2. **Display task summary**:
   ```
   Tasks Created for Story ONEK-{STORY_ID}:
     ONEK-DDD — Design: {description}
     ONEK-EEE — Dev: {description}
     ...
   ```

### Step 6: Validate Hierarchy and Generate Summary

1. **Validate the complete hierarchy** by fetching each created issue and verifying:
   - Top-level issue has child epics
   - Each epic has child user stories
   - Each user story has acceptance criteria in description
   - Each user story has at least one task

2. **Display the full hierarchy tree**:
   ```
   === Linear Issue Hierarchy Created ===

   ONEK-100 — Feature: {title}
   ├── ONEK-101 — Epic: {name 1}
   │   ├── ONEK-111 — Story: {name} (3 AC)
   │   │   ├── ONEK-121 — Design: {task}
   │   │   └── ONEK-122 — Dev: {task}
   │   └── ONEK-112 — Story: {name} (2 AC)
   │       └── ONEK-123 — Dev: {task}
   └── ONEK-102 — Epic: {name 2}
       └── ONEK-113 — Story: {name} (2 AC)
           ├── ONEK-124 — Design: {task}
           └── ONEK-125 — Dev: {task}

   Total: 1 feature, 2 epics, 3 user stories, 5 tasks
   All user stories have Given-When-Then acceptance criteria: YES
   ```

### Step 7: Generate UAT Instructions

1. **For each user story that has acceptance criteria**, ask the user:
   ```
   Generate UAT instructions for the user stories? This will:
   - Create UAT test plans based on the acceptance criteria
   - Save to docs/uat/
   - Optionally post to Linear

   Options:
   (1) Generate for all stories (recommended)
   (2) Select specific stories
   (3) Skip UAT generation
   ```

2. **If generating UAT**: For each selected user story, invoke the `/uat_instructions` workflow:
   - Use the story's acceptance criteria as the primary input
   - The UAT document will be saved to `docs/uat/UAT-ONEK-{STORY_ID}-{slug}.md`
   - Offer to post as Linear comment addressed to @AB and @Kham

3. **Display UAT summary**:
   ```
   UAT Instructions Generated:
     docs/uat/UAT-ONEK-111-{slug}.md (3 criteria, 3 test steps)
     docs/uat/UAT-ONEK-112-{slug}.md (2 criteria, 2 test steps)
     docs/uat/UAT-ONEK-113-{slug}.md (2 criteria, 2 test steps)

   Linear comments posted: {yes/no}
   Addressed to: @AB, @Kham
   ```

### Step 8: Final Report

Display a comprehensive summary:

```
=== Create Linear Issue — Complete ===

Feature:     ONEK-100 — {title}
Type:        {Feature Request | Bug Fix}
Plan Source: {plan-path or "User input"}

Hierarchy:
  Feature/Bug:   1 issue
  Epics:         {N} issues
  User Stories:  {N} issues ({total AC} acceptance criteria)
  Tasks:         {N} issues ({design count} design, {dev count} development)
  Total:         {grand total} Linear issues created

UAT:
  Documents:     {N} generated in docs/uat/
  Linear Posts:  {N} comments posted

Next Steps:
  1. Review the hierarchy in Linear (filter by parent: ONEK-100)
  2. Prioritize epics and stories for the current sprint
  3. Use /work-on-issue ONEK-{first-story} to start implementation
  4. Use /linear-cleanup to verify issue health
```

## Error Handling

### Missing Acceptance Criteria
If a user story is provided without acceptance criteria:
1. Warn: "User story '{title}' has no acceptance criteria. Generating from context..."
2. Auto-generate Given-When-Then criteria from the story description
3. Show generated criteria and ask for confirmation before creating the issue

### Invalid Issue Type
If `--type` value is not `feature` or `bug`:
- Warn: "Invalid type '{value}'. Using 'feature' as default."

### Parent Issue Not Found
If `--epic-only` or `--story-only` references a non-existent issue:
- Error: "Parent issue ONEK-XXX not found in Linear. Please check the issue ID."
- Stop execution

### Linear MCP Unavailable
If Linear MCP tools fail:
- Output the full hierarchy as a structured markdown document to the console
- Save to `docs/linear-issues/{date}-{feature-slug}.md` for manual entry

### Plan Document Not Found
If the provided plan path doesn't exist:
- Warn: "Plan document not found at '{path}'. Proceeding with interactive mode."
- Fall back to asking the user for input

## Linear MCP Tools Used

| Tool | Purpose |
|------|---------|
| `create_issue` | Create issues at all hierarchy levels |
| `get_issue` | Fetch parent issue details, validate hierarchy |
| `update_issue` | Link issues, update descriptions |
| `list_issue_labels` | Verify label existence |
| `create_comment` | Post UAT instructions to stories |

## Notes

- All issues are created in the **One Kaleidoscope** team
- Default state for all new issues is **Backlog**
- User stories use the "Story: " prefix in titles for easy filtering
- Epics use the "Epic: " prefix
- Design tasks use the "Design: " prefix and the `Agent:UX-Designer` label
- Development tasks use the "Dev: " prefix and the `Agent:Coder` label
- The command works with or without a plan document — interactive mode fills gaps
- Acceptance criteria validation is strict: no user story is created without at least 2 AC
- UAT generation reuses the existing `/uat_instructions` workflow patterns
