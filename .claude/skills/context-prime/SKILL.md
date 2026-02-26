---
name: context-prime
description: Use when starting work on a task, onboarding to the codebase, or needing project context — produces a scannable summary of project state, architecture, key files, and recommended next steps. Supports focus modes (full, ui, backend, api, database, or custom keyword).
---

# Context Prime

## Overview

Unified context priming skill that reads project structure, documentation, and git state to produce a concise, actionable project summary. Supports **focus modes** to narrow output to specific areas.

**Important**: This skill does NOT re-read `CLAUDE.md` — it is already injected as project instructions in system context. Reading it again wastes ~3000 tokens.

## When to Use

- Starting a new conversation or task and need project context
- Onboarding to an unfamiliar part of the codebase
- Before planning a feature to understand current state
- After being away from the project to catch up on changes
- When narrowing focus to a specific area (UI, backend, API, database)

## When NOT to Use

- When you need to **write or update** context documentation (use `/context-management` instead)
- When you already have sufficient context from the current conversation
- For deep debugging of a specific file (just read that file directly)

## Prerequisites

- Working directory is the project root
- Git repository initialized

## Command Usage

```bash
# Full project context (default)
/context-prime

# Focus on UI/frontend
/context-prime ui

# Focus on backend/agents
/context-prime backend

# Focus on API routes and MCP servers
/context-prime api

# Focus on database/Supabase
/context-prime database

# Custom keyword search
/context-prime "Avinode webhook flow"
/context-prime "proposal email"
```

## Focus Modes

| Mode | Triggers | Primary Targets |
|------|----------|----------------|
| `full` | No argument, or `full` | README, `.context/` status, architecture docs |
| `ui` | `ui`, `frontend`, `design` | `components/`, `app/`, Tailwind config |
| `backend` | `backend`, `agents`, `server` | `agents/`, `mcp-servers/`, `lib/` |
| `api` | `api`, `routes`, `endpoints` | `app/api/`, `mcp-servers/`, `docs/api/` |
| `database` | `database`, `db`, `supabase`, `schema` | `supabase/migrations/`, `lib/supabase/` |
| Custom | Anything else | Full mode reads + Grep for keywords |

---

## Steps

### Step 1: Determine Focus Mode

Parse `$ARGUMENTS` to determine the focus mode:

- If empty or `full` → **full** mode
- If matches a known mode keyword (see table above, case-insensitive) → that mode
- Otherwise → **custom** mode with `$ARGUMENTS` as the search keyword

Announce the mode:
```
Priming context in **{MODE}** mode...
```

### Step 2: Scan Project Structure

Run `find` to get the directory tree (fast, avoids slow `git ls-files` on external drive):

```bash
find . -maxdepth 3 -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.md" -o -name "*.json" -o -name "*.sql" \) | head -200
```

Also run:
```bash
find . -maxdepth 2 -type d | sort
```

These two commands give structure context without the overhead of `git ls-files`.

### Step 3: Read Documentation (Mode-Dependent)

Read files **in parallel** based on the focus mode. Only read what the mode needs.

#### Full Mode
- `README.md`
- `.context/README.md` (metrics summary table)
- `.context/overall_project_status.md`
- `docs/architecture/MULTI_AGENT_SYSTEM.md` (first 100 lines only)

#### UI Mode
- `README.md` (first 30 lines for project name/purpose)
- List `components/` directory (2 levels deep)
- List `app/` directory (2 levels deep)
- Read `tailwind.config.ts`
- List `components/ui/` contents

#### Backend Mode
- `README.md` (first 30 lines)
- List `agents/` directory (2 levels deep)
- List `mcp-servers/` directory (2 levels deep)
- List `lib/` directory (2 levels deep)
- `docs/architecture/MULTI_AGENT_SYSTEM.md` (first 100 lines)

#### API Mode
- `README.md` (first 30 lines)
- List `app/api/` directory (2 levels deep)
- List `mcp-servers/` directory (2 levels deep)
- List `docs/api/` directory if it exists

#### Database Mode
- `README.md` (first 30 lines)
- List `supabase/migrations/` directory
- Read `supabase/config.toml` if it exists
- List `lib/supabase/` directory
- Read the **last 3 migration files** (most recent changes)

#### Custom Mode
- Read all **Full Mode** files
- Run Grep for `$ARGUMENTS` keywords across `*.ts`, `*.tsx`, `*.md` files (limit to 30 results)

### Step 4: Identify Key Files

Based on mode and what was read in Steps 2-3, identify **8-12 key files** grouped by category:

- **Configuration**: package.json, tsconfig.json, next.config.mjs, etc.
- **Entry Points**: Main app routes, API handlers, agent entry points
- **Core Logic**: Agent implementations, MCP servers, utility libraries
- **Tests**: Key test files, test configuration
- **Documentation**: Architecture docs, status files

For focused modes, bias toward files in the focus area.

### Step 5: Assess Git State

Run these commands to understand current development state:

```bash
# Current branch and tracking
git branch --show-current

# Recent commits (last 10, one-line)
git log --oneline -10

# Uncommitted changes summary
git status --short

# Any stashes
git stash list
```

### Step 6: Produce Output

Format the output using the template below. Keep it **scannable and bullet-heavy**. Do not dump raw file contents — synthesize and summarize.

---

## Output Template

```markdown
## Project Context: Jetvision AI Assistant [{MODE} Focus]

### Overview
<!-- 1-3 sentences: what the project is, what it does, current stage -->

### Architecture
<!-- Stack, patterns, key integrations. Bullet points. -->
- **Stack**: ...
- **Pattern**: ...
- **Integrations**: ...

### Current State
<!-- Branch, recent work, uncommitted changes, blockers -->
- **Branch**: `{branch}` tracking `{remote}`
- **Recent commits**:
  - `{hash}` {message}
  - `{hash}` {message}
  - `{hash}` {message}
- **Uncommitted changes**: {count} files ({summary})
- **Blockers/Issues**: {any known issues from .context/ or git state}

### Key Files
<!-- 8-12 files grouped by category, with 1-line descriptions -->
**Configuration**
- `package.json` — Dependencies and scripts
- ...

**Core**
- `agents/jetvision-agent/` — Unified agent implementation
- ...

**{Mode-specific category}**
- ...

### Focus Areas
<!-- Traffic-light assessment -->
- **Strong**: {areas working well}
- **In Progress**: {areas under active development}
- **Needs Attention**: {areas with issues, staleness, or gaps}

### Recommended Next
<!-- 2-3 actionable items based on git state and project status -->
1. ...
2. ...
3. ...
```

---

## Error Handling

- If `.context/` directory doesn't exist, skip those reads and note "No .context/ directory found — consider running `/context-management init`" in the output.
- If a file doesn't exist, skip it silently (don't error out).
- If `find` returns too many results, the `head -200` cap prevents output overflow.
- If on a slow filesystem, the `find -maxdepth 3` approach is intentionally bounded.
