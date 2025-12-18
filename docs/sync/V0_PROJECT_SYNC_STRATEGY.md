# V0 Project Sync Strategy

**Created:** 2025-12-18
**Purpose:** Document strategy for receiving future UI updates from the original V0 project owner

---

## Overview

This document outlines the approach for syncing UI/UX updates from the original V0 project owner into the Jetvision assistant. The `abcucinalabs` fork was NOT the source for UI updates (it only contained database infrastructure), so a direct sync strategy with the V0 project is needed.

---

## Current UI Architecture

### Design System

| Component | Location | Description |
|-----------|----------|-------------|
| Design Tokens | `lib/design-system/tokens.ts` | Brand colors, typography, spacing, shadows |
| Tailwind Theme | `lib/design-system/tailwind-theme.ts` | Token integration with Tailwind |
| Global CSS | `app/globals.css` | OKLch color space variables, dark mode |
| Tailwind Config | `tailwind.config.ts` | Extended theme configuration |

### Brand Colors

- **Aviation Blue:** `#0066cc` (primary - trust & professionalism)
- **Sky Blue:** `#00a8e8` (secondary - innovation & speed)
- **Sunset Orange:** `#ff6b35` (accent - luxury & premium)

### Component Library

| Directory | Purpose | Component Count |
|-----------|---------|-----------------|
| `components/ui/` | Shadcn/Radix-ui primitives | 14+ components |
| `components/message-components/` | Chat message rendering | 16+ component types |
| `components/avinode/` | Avinode workflow UI | 9 components |
| `components/quotes/` | Quote comparison | 4 components |
| `components/aviation/` | Aviation-specific UI | 5 components |

---

## Protected Areas (Do Not Overwrite)

These directories contain Jetvision-specific implementations that should NEVER be overwritten during V0 syncs:

### Agent System (Not in V0)

- `agents/` - Multi-agent system architecture
- `agents/core/` - BaseAgent, AgentFactory, AgentRegistry
- `agents/coordination/` - MessageBus, HandoffManager, TaskQueue
- `agents/implementations/` - Specialized agent implementations

### MCP Infrastructure (Not in V0)

- `mcp-servers/` - Model Context Protocol servers
- `mcp-servers/avinode-mcp-server/` - Avinode API integration
- `lib/mcp/` - MCP client utilities

### Custom Components (Jetvision-specific)

- `components/avinode/` - Avinode workflow components
- `components/quotes/` - Quote comparison system
- `components/message-components/` - Custom message renderer

### API Routes (Custom)

- `app/api/webhooks/` - Webhook handlers (Avinode, etc.)
- `app/api/agents/` - Agent API routes
- `app/api/chatkit/` - ChatKit session management

### Database Layer (Custom)

- `lib/supabase/` - Supabase client infrastructure
- `lib/types/database.ts` - Database types
- `supabase/migrations/` - Schema migrations

---

## Sync Strategy Options

### Option A: Upstream Remote (Recommended)

Add the V0 project as an upstream remote and compare changes:

```bash
# Add V0 project as upstream (replace URL with actual V0 repo)
git remote add v0-upstream <v0-project-url>

# Fetch latest changes
git fetch v0-upstream

# Compare UI-related directories
git diff main...v0-upstream/main -- \
  components/ui/ \
  app/globals.css \
  lib/design-system/ \
  tailwind.config.ts

# View specific component changes
git diff main...v0-upstream/main -- components/ui/button.tsx
```

**Pros:**

- Easy to see all changes at once
- Can cherry-pick specific commits
- Maintains full git history

**Cons:**

- Requires access to V0 repo
- May have significant divergence over time

### Option B: Component-Level Cherry-Pick

Track V0 releases/tags and cherry-pick specific component updates:

```bash
# Fetch specific tag
git fetch v0-upstream v0.2.0

# Cherry-pick UI component updates
git cherry-pick <commit-hash> -- components/ui/

# Or extract specific files
git show v0-upstream/main:components/ui/button.tsx > components/ui/button.tsx.new
```

**Pros:**

- Granular control
- Low risk of breaking changes

**Cons:**

- Manual process
- May miss interdependencies

### Option C: Design Token Sync

Export V0 design tokens and update local token file:

```bash
# Export tokens from V0
# (Method depends on V0's token format)

# Update local tokens
# lib/design-system/tokens.ts

# Regenerate Tailwind theme
npm run build:theme
```

**Pros:**

- Design consistency
- Easy to apply across components

**Cons:**

- Only covers design tokens, not component logic

---

## Recommended Sync Frequency

| Update Type | Frequency | Trigger |
|-------------|-----------|---------|
| Security patches | Immediate | V0 security advisory |
| Bug fixes | Within 1 week | V0 release notes |
| Design system updates | Quarterly | Scheduled review |
| New components | As needed | Feature requirements |
| Major refactors | Case-by-case | Impact assessment |

---

## Sync Workflow

### Pre-Sync Checklist

- [ ] Review V0 changelog/release notes
- [ ] Identify changed files
- [ ] Check for conflicts with protected areas
- [ ] Create feature branch for sync
- [ ] Run existing tests

### Sync Process

1. **Fetch V0 Changes**

   ```bash
   git fetch v0-upstream
   git log main..v0-upstream/main --oneline
   ```

2. **Create Sync Branch**

   ```bash
   git checkout -b sync/v0-update-$(date +%Y%m%d)
   ```

3. **Compare Protected Areas**

   ```bash
   # Ensure no V0 changes touch protected areas
   git diff main...v0-upstream/main --name-only | grep -E '^(agents|mcp-servers|components/avinode)/'
   ```

4. **Apply Changes (Safe Areas Only)**

   ```bash
   # Cherry-pick or merge UI components
   git checkout v0-upstream/main -- components/ui/
   git checkout v0-upstream/main -- lib/design-system/
   ```

5. **Test**

   ```bash
   npm run test:unit
   npm run lint
   npm run build
   ```

6. **Create PR**

   ```bash
   gh pr create --title "sync: V0 UI updates $(date +%Y-%m-%d)" \
     --body "Synced UI components from V0 upstream"
   ```

### Post-Sync Checklist

- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Visual regression check (if available)
- [ ] Dark mode works correctly
- [ ] Protected areas unchanged
- [ ] Commit message references V0 version

---

## Conflict Resolution

### Common Conflicts

| Area | Resolution Strategy |
|------|---------------------|
| `tailwind.config.ts` | Merge manually, preserve Jetvision extensions |
| `app/globals.css` | Keep Jetvision CSS variables, add new V0 vars |
| `components/ui/` | Prefer V0 version unless customized |
| `lib/design-system/` | Merge token values, preserve structure |

### When to Reject V0 Changes

- Changes to protected areas
- Breaking changes to existing component APIs
- Removal of features we depend on
- Changes that conflict with Avinode workflow

---

## Tracking and Documentation

### Linear Issue Tracking

Create a Linear issue for each V0 sync:

- **Title:** `sync: V0 UI update vX.Y.Z`
- **Labels:** `infrastructure`, `design-system`
- **Description:** Link to V0 release notes, list of synced files

### Changelog

Maintain a sync log in this file:

| Date | V0 Version | Files Synced | Notes |
|------|------------|--------------|-------|
| 2025-12-18 | N/A | Initial strategy | Document created |

---

## Contact and Resources

### V0 Project Owner

- Contact method: TBD (needs to be established)
- Repo URL: TBD (needs to be provided)

### Related Documentation

- [abcucinalabs Fork Assessment](../analysis/ABCUCINALABS_FORK_ASSESSMENT.md)
- [Branch Conflict Analysis](../analysis/BRANCH_CONFLICT_ANALYSIS.md)
- [Design System Tokens](../../lib/design-system/tokens.ts)

---

## Next Steps

1. **Obtain V0 project repository URL** from project owner
2. **Add as upstream remote** using Option A strategy
3. **Perform initial sync assessment** to identify current divergence
4. **Establish regular sync schedule** based on V0 release cadence
5. **Create Linear tracking issue** for ongoing sync management
