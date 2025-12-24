# Changelog

All notable changes to the Jetvision AI Assistant project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed - 2025-10-26

#### Project Structure Reorganization
- **Documentation Consolidation**: Moved all root-level documentation to organized subdirectories
  - Created `docs/guides/` for user and developer guides
  - Moved `AGENTS.md`, `CLAUDE.md`, `CODE_REVIEW_SETUP.md` to `docs/guides/`
  - Moved `MULTI_AGENT_QUICKSTART.md` to `docs/guides/`
  - Moved `GET_STARTED_WITH_CODE_REVIEW.md` to `docs/guides/`
  - Moved `DATABASE_SCHEMA_DIAGRAM.md` to `docs/architecture/`
  - Moved `DATABASE_SCHEMA_AUDIT.md` to `docs/deployment/`
  - Moved `VERCEL_SETUP_QUICK.md` to `docs/deployment/`
  - Renamed `README_DATABASE.md` to `docs/guides/DATABASE.md`
  - Moved `SUPABASE_INVESTIGATION_SUMMARY.md` to `docs/deployment/`

- **Session Reports Organization**
  - Moved completion reports to `docs/sessions/`
  - Moved `MIGRATION_COMPLETE.md` to `docs/sessions/`
  - Moved `ONEK-49_COMPLETION_SUMMARY.md` to `docs/sessions/`

- **Scripts Consolidation**: Organized utility scripts into logical subdirectories
  - Created `scripts/database/` for database utilities
  - Moved `seed-database.ts` and `check-db-schema.ts` to `scripts/database/`
  - Created `scripts/linear/` for Linear integration scripts
  - Moved `link-issues-to-project.js` and `migrate-linear-issues.js` to `scripts/linear/`
  - Created `scripts/testing/` for test utilities
  - Moved `test-routes.sh` to `scripts/testing/`

- **Hooks Consolidation**
  - Moved `lib/hooks/use-rfp-realtime.ts` to top-level `hooks/` directory
  - Removed empty `lib/hooks/` directory
  - All custom React hooks now in single `hooks/` location

- **GitHub Templates Organization**
  - Created `.github/PULL_REQUEST_TEMPLATE/` directory
  - Moved `docs/PR_TEMPLATE_AUTH.md` to `.github/PULL_REQUEST_TEMPLATE/auth.md`
  - Moved `docs/PR_TEMPLATE_DATABASE.md` to `.github/PULL_REQUEST_TEMPLATE/database.md`
  - Moved `docs/PULL_REQUEST_TEMPLATE.md` to `.github/PULL_REQUEST_TEMPLATE/default.md`
  - Moved `CODE_REVIEW_CHECKLIST.md` to `.github/`

- **App Directory Cleanup**
  - Created `app/_archived/` for archived routes (Next.js convention for non-routable folders)
  - Moved `app/dashboard-archived/` to `app/_archived/dashboard/`
  - Moved `app/rfp-archived/` to `app/_archived/rfp/`

### Removed - 2025-10-26

- **Duplicate Files**
  - Removed `styles/` directory (duplicate of `app/globals.css`)
  - Removed all `.bak` backup files:
    - `app/api/clients/route.ts.bak`
    - `app/api/quotes/route.ts.bak`
    - `app/api/requests/route.ts.bak`
    - `app/api/workflows/route.ts.bak`
    - `tests/user-management.spec.ts.bak`
    - `__tests__/unit/api/requests/route.test.ts.bak`

### Added - 2025-10-26

- **Documentation**
  - Created comprehensive `docs/README.md` with full documentation index
  - Added `CHANGELOG.md` following Keep a Changelog format

- **Git Configuration**
  - Updated `.gitignore` to exclude backup files (`*.bak`, `*.backup`, `*~`)
  - Existing entries for test artifacts (`playwright-report/`, `test-results/`) retained

### Benefits

This reorganization provides:
- ✅ **Clean Root Directory**: Only essential config files remain at root level
- ✅ **Clear Documentation Hierarchy**: All docs in `/docs` with logical subdirectories
- ✅ **Next.js 14 Best Practices**: Follows official App Router conventions with `_archived` prefix
- ✅ **Improved Scalability**: Feature-based organization supports project growth
- ✅ **Better Developer Experience**: Clear navigation, no confusion about file locations
- ✅ **Enhanced Maintainability**: Archived content clearly separated with underscore prefix
- ✅ **CI/CD Ready**: All GitHub workflows and templates properly organized

---

## [0.2.0] - 2025-10-24

### Added
- RBAC (Role-Based Access Control) middleware implementation
- Clerk authentication integration with webhook sync
- User profile UI components

---

## [0.1.0] - 2025-10-20

### Added - Phase 1: Multi-Agent System Core
- **Agent Core System**
  - `BaseAgent` abstract class for all agent implementations
  - `AgentFactory` singleton for agent creation
  - `AgentRegistry` for centralized agent management
  - `AgentContext` for session and state management
  - Complete type definitions in `agents/core/types.ts`

- **Agent Coordination Layer**
  - `MessageBus` for event-driven agent-to-agent communication (EventEmitter-based)
  - `HandoffManager` for task delegation between agents
  - `TaskQueue` for async processing with BullMQ + Redis
  - `WorkflowStateMachine` for 11-state workflow management
  - 7 message types for comprehensive agent communication

- **Agent Implementations**
  - Scaffolding for 6 specialized agents:
    - `OrchestratorAgent` - RFP analysis and task delegation
    - `ClientDataAgent` - Client profile management
    - `FlightSearchAgent` - Flight search via Avinode
    - `ProposalAnalysisAgent` - Quote scoring and ranking
    - `CommunicationAgent` - Email generation and sending
    - `ErrorMonitorAgent` - Error monitoring and recovery

- **Testing Infrastructure**
  - Vitest configuration with 75% coverage thresholds
  - Test structure: unit, integration, e2e
  - Mock factories and test helpers
  - TypeScript path aliases for imports

- **Development Tools**
  - npm scripts for agent management (`agents:create`, `agents:list`)
  - MCP server scaffolding tools
  - Code review automation scripts
  - Git hooks with Husky (pre-commit, pre-push, commit-msg)

### Documentation
- Complete multi-agent system architecture guide (400+ lines)
- Agent creation guidelines with code style standards
- Multi-agent quickstart guide
- Implementation summary for Phase 1
- CLAUDE.md with comprehensive project guide

---

## [0.0.1] - 2025-10-15

### Added - Initial Project Setup
- Next.js 14 with App Router
- TypeScript configuration with strict mode
- Supabase integration for database
- Clerk authentication setup
- Initial database schema
- Basic UI components with shadcn/ui
- Tailwind CSS styling
- ESLint and Prettier configuration

### Infrastructure
- Vercel deployment configuration
- Environment variable setup
- Git repository initialization
- GitHub Actions workflows placeholder

---

## Notes

### Versioning Strategy
- **Major version (X.0.0)**: Breaking changes or major feature releases
- **Minor version (0.X.0)**: New features, backwards compatible
- **Patch version (0.0.X)**: Bug fixes and minor improvements

### Commit Message Convention
Following Conventional Commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Test additions or modifications
- `chore:` Build process or auxiliary tool changes
- `perf:` Performance improvements

### Release Process
1. Update CHANGELOG.md with changes since last release
2. Update version in package.json
3. Create git tag with version number
4. Push to main branch
5. Deploy to production via Vercel

---

**Project**: Jetvision AI Assistant
**Repository**: [GitHub URL]
**Maintainer**: Jetvision Team
