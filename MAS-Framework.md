# MAS Framework Package

Portable Multiagent Development System (MAS) framework for AI-driven software development.

## Quick Start

### 1. Extract to Your Project

```bash
# Unzip to your project root
unzip mas-framework-package.zip -d /path/to/your/project
```

### 2. Generate MAS Structure

```bash
cd /path/to/your/project

# Generate with default agents (development, architect, qa)
node .claude/skills/mas-module-generator/scripts/generate.js \
  --project-name "YourProjectName"

# Or generate all agent types
node .claude/skills/mas-module-generator/scripts/generate.js \
  --project-name "YourProjectName" \
  --full
```

### 3. Initialize MAS Commands (Optional)

```bash
# Install MAS CLI commands
./scripts/setup/install_mas_commands.sh

# Load commands in current session
source ~/.mas_commands/load_mas.sh

# Initialize the system
mas-init
```

## Package Contents

```
vo-jetvision-assistant/
├── .claude/
│   └── skills/
│       └── mas-module-generator/     # MAS generator skill
│           ├── SKILL.md              # Skill definition
│           ├── scripts/
│           │   └── generate.js       # Generator script
│           └── templates/
│               ├── agent-base.md     # BDI agent template
│               ├── bootstrap.md      # Bootstrap protocol
│               └── masConfig.json    # Config template
├── .context/
│   ├── agents/
│   │   └── templates/                # Agent templates
│   ├── shared/
│   │   ├── bootstrap/               # Initialization protocols
│   │   ├── communication/           # Agent chat
│   │   └── memory/                  # Memory management
│   ├── integrations/
│   │   ├── beads/                   # Local issue tracking
│   │   └── linear/                  # External tracking
│   └── workspaces/                  # (Legacy - see ~/.claude/git-workspace/)
│       └── .archive/                # Archived workspace metadata
├── docs/
│   └── git-workflow/                # TDD & Git workflow docs
├── scripts/
│   ├── multiagent/                  # Orchestration scripts
│   └── setup/                       # Installation scripts
├── .masConfig.example               # Example configuration
└── MAS-Framework.md                        # This file
```

## Core Components

### Agent Types

| Agent | Role | Capabilities |
|-------|------|--------------|
| development | Full-stack development | code, test, debug, refactor |
| architect | System design | design, architecture, planning |
| ux | User experience | ui, ux, design, accessibility |
| database | Database management | database, schema, queries |
| api | API development | api, integration, documentation |
| qa | Quality assurance | test, qa, e2e, unit |
| security | Security assessment | security, audit, vulnerability |
| devops | Infrastructure | deploy, ci, cd, infrastructure |

### Key Features

- **BDI Architecture**: Belief-Desire-Intention framework for agents
- **Stigmergic Coordination**: Indirect communication via signals
- **Contract Net Protocol**: Intelligent task allocation
- **TDD Workflow**: RED-GREEN-BLUE development cycle
- **Git Worktrees**: Parallel agent workspace isolation at `~/.claude/git-workspace/`

### Git Worktree Workspace Management

Agent workspaces are stored at `/Users/kinglerbercy/.claude/git-workspace/`, named by Linear issue ID (lowercase). Each workspace maps to a **Linear Issue**, **Git Branch**, and **Pull Request**.

**Automatic Lifecycle**:

- Worktrees are **auto-created** when agents are invoked (PreToolUse hook)
- Worktrees are **auto-cleaned** only when ALL conditions are met:
  1. All TDD tests pass
  2. PR is created
  3. Code review is completed (approved)
  4. Linear issue is updated
  5. Branch is merged into main

**Slash Commands**:

- `/worktree-create <branch> <issue-id>` - Create workspace
- `/worktree-status` - View all workspaces
- `/worktree-cleanup [issue-id|--all|--stale]` - Clean up workspaces

## Configuration

Copy and customize `.masConfig.example`:

```bash
cp .masConfig.example .masConfig
```

Key settings:

```json
{
  "dynamics": {
    "evaporation_rate": 0.1,
    "amplification_factor": 1.2
  },
  "beads_integration": {
    "enabled": true
  },
  "contract_net": {
    "enabled": true,
    "min_capability_match": 0.3
  }
}
```

## Usage

### Generate Agent Templates

```bash
# Specific agents
node .claude/skills/mas-module-generator/scripts/generate.js \
  -p "MyProject" \
  -a "development,qa,security"

# All agents with overwrite
node .claude/skills/mas-module-generator/scripts/generate.js \
  --full --overwrite
```

### Beads Integration (Local Issue Tracking)

```bash
# Generate signals from issues
node .context/integrations/beads/beads-signal-dynamics.js

# Run task bidding
node .context/integrations/beads/beads-contract-net.js
```

### Linear Integration (External Tracking)

```bash
# Two-way sync with Linear
.context/integrations/linear/beads-linear-sync.sh sync
```

## Git Workflow

Follow TDD cycle:

1. **RED**: Write failing tests first
2. **GREEN**: Implement minimum code to pass
3. **BLUE**: Refactor while keeping tests green

Branch naming: `<type>/<TASK-ID>-<description>`

Examples:

- `feature/TASK-001-user-auth`
- `fix/BUG-042-validation-error`
- `refactor/TECH-015-database-client`

## CI/CD Workflows (GitHub Actions)

Automated quality gates run on every PR and push via `.github/workflows/`:

| Workflow | Purpose |
|----------|---------|
| `code-review.yml` | Type check, lint, tests, coverage |
| `pr-code-review.yml` | PR comments, labels, detailed reports |
| `linear-sync.yml` | Sync PR status to Linear issues |
| `auto-create-pr.yml` | Auto-create PRs for feature branches |

### Review Jobs

- **code-review** - TypeScript, ESLint, unit/integration tests, coverage ≥75%
- **security-review** - `npm audit`, secret scanning
- **architecture-review** - BaseAgent extension, API error handling
- **performance-review** - Build validation, bundle analysis

### PR Labels

- `✅ code-review-passed` + `ready-for-merge` - All checks pass
- `⚠️ code-review-failed` + `needs-work` - Issues found

### Local Validation

```bash
pnpm type-check      # TypeScript
pnpm lint            # ESLint + Prettier
pnpm test:unit       # Unit tests
pnpm test:coverage   # Coverage (75% threshold)
pnpm review:validate # Full validation
```

## Documentation

- [Git Workflow Overview](docs/git-workflow/README.md)
- [Branch Strategy](docs/git-workflow/01-branch-strategy.md)
- [TDD Workflow](docs/git-workflow/02-tdd-workflow.md)
- [Multi-Agent Coordination](docs/git-workflow/06-multi-agent-coordination.md)
- [Git Worktree for Agents](docs/git-workflow/07-git-worktree-agents.md)

## License

MIT License - Use freely in your projects.
