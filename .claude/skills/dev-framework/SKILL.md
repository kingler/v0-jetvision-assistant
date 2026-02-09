---
name: dev-framework
description: >
  Unified development framework combining spec-driven development, context-managed
  execution, static analysis, metacognitive oversight, and UI/UX design intelligence.
  Use when starting features, planning implementations, running security scans,
  checking UI/UX patterns, or verifying deliverables.
argument-hint: [action] [args...]
---

# Unified Development Framework

Route by first argument in `$ARGUMENTS`:

## Sub-Command Router

Parse `$ARGUMENTS` to determine the action:
- **`spec`** — Generate feature specification
- **`plan`** — Create implementation plan
- **`execute`** — Execute plan in fresh context
- **`verify`** — Goal-backward verification
- **`scan`** — Security/quality scan
- **`vibe`** — Metacognitive alignment check
- **`design`** — UI/UX design system query
- **`checklist`** — Pre-delivery quality checklist
- **`state`** — Session memory read/update

If no argument or unrecognized, show available sub-commands.

---

## `spec <description>`

**Source**: Spec-Kit specification methodology

Generate a feature specification from a natural language description.

1. Read the template at `.claude/workflows/templates/spec.md`
2. Create directory `specs/{feature-slug}/`
3. Fill the template:
   - **User Scenarios**: Prioritize as P1 (must have), P2 (should have), P3 (nice to have)
   - Each scenario: `As a {role}, I want {goal} so that {benefit}`
   - Each scenario gets Given/When/Then acceptance criteria
   - **Requirements**: Number as FR-001, FR-002, etc.
   - Mark ambiguous areas with `[NEEDS CLARIFICATION: {what's unclear}]`
   - **Key Entities**: Domain model with attributes and relationships
   - **Success Criteria**: Measurable, technology-agnostic outcomes
4. Write to `specs/{feature-slug}/spec.md`
5. Present the spec and ask: "Are there any areas marked [NEEDS CLARIFICATION] you'd like to resolve?"

**Output**: `specs/{feature-slug}/spec.md`

---

## `plan <spec-path>`

**Source**: Spec-Kit planning + GSD plan structure

Create an implementation plan from a specification.

1. Read the spec at `<spec-path>`
2. Read the template at `.claude/workflows/templates/plan.md`
3. Analyze the spec to determine:
   - Technical context (stack: Next.js 14, TypeScript, Supabase, existing patterns)
   - Files that will be modified (check existing codebase)
   - Dependencies between tasks
4. Fill the plan template:
   - **YAML frontmatter**: phase, wave assignments, `must_haves` (truths, artifacts, key_links)
   - `must_haves.truths`: Observable behaviors users can verify (3-7 items)
   - `must_haves.artifacts`: Files that must exist after completion
   - `must_haves.key_links`: Critical connections where breakage cascades
   - **XML tasks**: 2-3 tasks per plan, each with name/files/action/verify/done
   - Each task: 15-60 minutes of execution time
   - Mark parallelizable tasks with same `wave` number
5. Write to `specs/{feature-slug}/plan.md`

**Output**: `specs/{feature-slug}/plan.md`

---

## `execute <plan-path>`

**Source**: GSD fresh-context execution pattern

Execute a plan in a fresh context to prevent context rot.

**IMPORTANT**: Do NOT execute the plan directly in this conversation. Instead:

1. Read the plan at `<plan-path>`
2. Use the **Task tool** with `subagent_type: "general-purpose"` to spawn a sub-agent
3. Pass the full plan content as the prompt, prefixed with:
   ```
   You are executing a development plan. Follow each task in order.
   Make atomic git commits after each task with descriptive messages.
   After all tasks, create a summary of what was built.

   Plan:
   {plan content}
   ```
4. The sub-agent gets a fresh 200k context window — this is the key benefit
5. When the sub-agent completes, review its summary output
6. Update `.claude/state/STATE.md` with progress

**Output**: Implementation + atomic commits + summary from sub-agent

---

## `verify`

**Source**: GSD goal-backward verification methodology

Verify that the current implementation delivers on its promises.

1. Find the most recent plan in `specs/*/plan.md` (or ask which plan to verify)
2. Parse the YAML frontmatter to extract `must_haves`
3. For each **truth**: Check if the behavior is observable
   - Run relevant commands, read code, check UI state
   - Mark as PASS or FAIL with evidence
4. For each **artifact**: Check if the file exists and is non-empty
   - Use Glob to verify file paths
   - Mark as PASS or FAIL
5. For each **key_link**: Check if the connection is wired
   - Read source files to verify imports, function calls, data flow
   - Mark as PASS or FAIL
6. Produce a verification report:
   ```
   ## Verification Report
   ### Truths: X/Y passed
   ### Artifacts: X/Y exist
   ### Key Links: X/Y wired
   ### Overall: PASS/FAIL
   ```
7. If any FAIL, suggest specific fixes

**Output**: Verification report with PASS/FAIL per item

---

## `scan [path]`

**Source**: Semgrep MCP server via Docker (`ghcr.io/semgrep/mcp`)

Run security and quality scanning on the codebase.

**With Semgrep MCP available** (preferred):
1. Call `mcp__semgrep__security_check` tool with the target path (default: `/src/src/`)
   - The project is mounted at `/src` inside the container
   - So local path `src/` becomes `/src/src/`, `lib/` becomes `/src/lib/`, etc.
2. Parse and present findings grouped by severity (ERROR > WARNING > INFO)
3. For custom rules, use `mcp__semgrep__semgrep_scan_with_custom_rule`
4. For AST analysis, use `mcp__semgrep__get_abstract_syntax_tree`

**Available MCP tools**:
| Tool | Purpose |
|------|---------|
| `security_check` | Scan code for vulnerabilities (Code + Supply Chain + Secrets) |
| `semgrep_scan` | Scan files with a config string |
| `semgrep_scan_with_custom_rule` | Scan with custom Semgrep YAML rules |
| `get_abstract_syntax_tree` | Output code's AST for analysis |
| `supported_languages` | List languages Semgrep supports |
| `semgrep_rule_schema` | Fetch latest rule JSON Schema |

**Without Semgrep MCP** (fallback to Docker CLI):
1. Run via Docker:
   ```bash
   docker run --rm -v "/Volumes/SeagatePortableDrive/Projects/Software/v0-jetvision-assistant:/src" ghcr.io/semgrep/mcp semgrep scan --json --config /src/.semgrep.yml /src/<path>
   ```
2. Parse JSON output and present findings
3. If Docker is not available, print installation instructions:
   ```
   Semgrep MCP server is not available. Pull the Docker image:
     docker pull ghcr.io/semgrep/mcp
   ```

**Output**: Findings report grouped by severity, with file:line references

---

## `vibe <goal>`

**Source**: Vibe Check metacognitive oversight (CPI methodology)

Perform a metacognitive alignment check before major decisions.

**With Vibe Check MCP available** (preferred):
1. Call `mcp__vibe-check__vibe_check` tool with:
   - `goal`: The `<goal>` argument
   - `plan`: Current approach or plan summary
   - `uncertainties`: Any known concerns
2. Present the metacognitive questions and observations
3. If patterns are detected, call `mcp__vibe-check__vibe_learn` to record them

**Without Vibe Check MCP** (fallback — embedded questions):
Perform manual metacognitive check using these 5 questions:

1. **Alignment**: Does this approach directly address what the user asked for, or am I solving a different problem?
2. **Simplicity**: Is there a simpler approach I'm overlooking? Am I over-engineering?
3. **Assumptions**: What am I assuming that hasn't been explicitly stated or verified?
4. **Alternatives**: Have I considered at least 2 different approaches before committing?
5. **Risks**: What could go wrong, and what's the blast radius if it does?

Present each question with your honest assessment. Flag any concerns.

**Output**: Metacognitive assessment with questions and observations

---

## `design <query>`

**Source**: UI/UX Pro Max design intelligence

Query the design database for styles, colors, typography, and patterns.

1. Run via Bash:
   ```bash
   python3 .claude/skills/dev-framework/data/scripts/search.py "<query>" --stack nextjs
   ```
2. Parse the BM25 search results
3. Present findings organized by category (style, color, typography, etc.)

**For design system generation** (comprehensive):
```bash
python3 .claude/skills/dev-framework/data/scripts/search.py "<query>" --design-system -p "Jetvision"
```

**Available search domains** (use `--domain <domain>`):
- `product` — Product type recommendations (SaaS, aviation, dashboard)
- `style` — UI styles (glassmorphism, minimalism, dark mode OLED)
- `color` — Color palettes by industry
- `typography` — Font pairings with Google Fonts imports
- `chart` — Chart types and library recommendations
- `landing` — Landing page patterns and CTA strategies
- `ux` — Best practices and anti-patterns

**If Python is unavailable**: Read the CSV files directly from `.claude/skills/dev-framework/data/` using the Read tool and filter manually.

**Output**: Design recommendations with styles, colors, typography, and patterns

---

## `checklist`

**Source**: Spec-Kit quality checklists + UI/UX Pro Max pre-delivery checks

Read and present the combined quality checklist from `.claude/workflows/templates/checklist.md`.

Walk through each category and check current state:

1. **Spec Completeness** — All P1 scenarios have acceptance criteria, no unresolved `[NEEDS CLARIFICATION]`
2. **Code Quality** — No `any` types, no `console.log` in production, explicit return types, error handling on API boundaries
3. **Security** — No `eval()`, no unsanitized `dangerouslySetInnerHTML`, no hardcoded secrets, Semgrep scan clean
4. **UI/UX** — WCAG 2.1 AA (4.5:1 contrast), responsive (375/768/1024/1440px), `cursor-pointer` on clickables, `prefers-reduced-motion` respected, Lucide icons (no emoji as icons)
5. **Testing** — Coverage ≥75%, edge cases, integration tests for API boundaries
6. **Architecture** — Follows project patterns (BaseAgent, MCP SDK, barrel exports, kebab-case files)

**Output**: Checklist with PASS/FAIL per item and actionable fixes for failures

---

## `state [update]`

**Source**: GSD STATE.md session memory persistence

Manage session state that survives across conversations and compactions.

**Read state** (`/dev-framework state`):
1. Read `.claude/state/STATE.md`
2. Present current position, decisions, blockers, and key context

**Update state** (`/dev-framework state update`):
1. Read current `.claude/state/STATE.md`
2. Ask what to update (or infer from conversation):
   - Current position (phase, last action, next step)
   - New decisions made (with rationale)
   - Blockers encountered or resolved
   - Key context that must survive compaction
3. Write updated STATE.md

**Output**: Current state summary or confirmation of update
