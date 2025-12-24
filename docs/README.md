# Jetvision AI Assistant Documentation

Welcome to the comprehensive documentation for the Jetvision AI Assistant project. This documentation is organized by category to help you quickly find the information you need.

## Quick Start

- [Getting Started](GETTING_STARTED.md) - Setup and installation guide
- [Multi-Agent Quickstart](guides/MULTI_AGENT_QUICKSTART.md) - 5-minute agent system setup
- [Development Prerequisites](DEVELOPMENT_PREREQUISITES.md) - Required tools and dependencies
- [Prerequisites Checklist](PREREQUISITES_CHECKLIST.md) - Pre-flight checklist

## Core Guides

### Development
- [Claude Code Guide](guides/CLAUDE.md) - Complete guide to using Claude Code with this project
- [Agents Guide](guides/AGENTS.md) - Creating and managing AI agents
- [Code Review](guides/CODE_REVIEW_SETUP.md) - Setting up code review workflows
- [Get Started with Code Review](guides/GET_STARTED_WITH_CODE_REVIEW.md) - Quick code review guide
- [Git Workflow](GIT_WORKFLOW.md) - Git branching and commit conventions
- [Testing Guidelines](TESTING_GUIDELINES.md) - Testing standards and practices

### Database & Backend
- [Database Guide](guides/DATABASE.md) - Database schema and operations
- [Deploy Database](DEPLOY_DATABASE.md) - Database deployment instructions
- [Supabase Investigation](deployment/SUPABASE_INVESTIGATION_SUMMARY.md) - Supabase setup analysis

### Authentication
- [Authentication Implementation](AUTHENTICATION_IMPLEMENTATION.md) - Auth system implementation
- [Authentication Final Setup](AUTHENTICATION_FINAL_SETUP.md) - Production auth setup
- [Clerk-Supabase Sync](CLERK_SUPABASE_SYNC.md) - User sync between Clerk and Supabase
- [Clerk Webhook Setup](CLERK_WEBHOOK_SETUP_GUIDE.md) - Setting up Clerk webhooks

## Architecture

### System Design
- [System Architecture](SYSTEM_ARCHITECTURE.md) - High-level system overview
- [Multi-Agent System](architecture/MULTI_AGENT_SYSTEM.md) - Detailed multi-agent architecture (400+ lines)
- [MCP Server Architecture](architecture/MCP_SERVER_ARCHITECTURE.md) - Model Context Protocol servers
- [Implementation Summary](architecture/IMPLEMENTATION_SUMMARY.md) - Phase 1 completion summary
- [Database Schema Diagram](architecture/DATABASE_SCHEMA_DIAGRAM.md) - Visual database schema

### Technical Specifications
- [Business Requirements Document (BRD)](BRD.md) - Business requirements
- [Product Requirements Document (PRD)](PRD.md) - Product specifications
- [Agent Tools](AGENT_TOOLS.md) - Available tools for agents
- [Implementation Plan](IMPLEMENTATION_PLAN.md) - Development roadmap

## Deployment

- [Vercel Deployment Instructions](VERCEL_DEPLOYMENT_INSTRUCTIONS.md) - Deploy to Vercel
- [Vercel Quick Setup](deployment/VERCEL_SETUP_QUICK.md) - Quick deployment guide
- [Database Schema Audit](deployment/DATABASE_SCHEMA_AUDIT.md) - Schema validation
- [Deployment Status](deployment/DEPLOYMENT_STATUS.md) - Current deployment state
- [Verify Deployment Script](deployment/verify-deployment.mjs) - Automated verification

## Implementation Guides

### Feature Implementation
- [Avinode API Setup](implementation/AVINODE-API-SETUP.md) - Avinode integration
- [Quote Comparison (DES-113)](implementation/DES-113-QUOTE-COMPARISON.md) - Quote comparison feature
- [Quote Data Integration](implementation/QUOTE-DATA-INTEGRATION.md) - Quote data handling
- [Workflow-Avinode Integration](implementation/WORKFLOW-AVINODE-INTEGRATION.md) - Workflow integration

### Integrations
- [Chat Agent Integration](CHAT_AGENT_INTEGRATION.md) - Chat interface integration
- [GPT-5 ChatKit Integration](GPT5_CHATKIT_INTEGRATION.md) - ChatKit setup

## Project Management

- [Project Structure](project-management/PROJECT_STRUCTURE.md) - Codebase organization
- [Agent Execution and Tasks](project-management/AGENT_EXECUTION_AND_TASKS.md) - Task automation
- [Task Automation System](project-management/TASK_AUTOMATION_SYSTEM.md) - Automated task management
- [Project Schedule Overview](PROJECT_SCHEDULE_OVERVIEW.md) - Timeline overview
- [Project Timeline Visual](PROJECT_TIMELINE_VISUAL.md) - Visual timeline
- [Project Schedule README](PROJECT_SCHEDULE_README.md) - Schedule documentation

## Phase Documentation

- [Phase 2 Completion](PHASE-2-COMPLETION.md) - Phase 2 summary
- [Phase 5 Completion Summary](phases/PHASE5_COMPLETION_SUMMARY.md) - Phase 5 summary
- [Phase 5 Final Status](phases/PHASE5_FINAL_STATUS.md) - Phase 5 final state
- [Week 4 Tasks Summary](WEEK4_TASKS_SUMMARY.md) - Week 4 progress

## Session Reports

- [Session Summary](sessions/SESSION_SUMMARY.md) - General session notes
- [Task 007 Session Summary](sessions/TASK-007-SESSION-SUMMARY.md) - Specific task session
- [Migration Complete](sessions/MIGRATION_COMPLETE.md) - Migration completion report
- [ONEK-49 Completion Summary](sessions/ONEK-49_COMPLETION_SUMMARY.md) - Task ONEK-49 summary

## Testing

- [Testing Guidelines](TESTING_GUIDELINES.md) - Test standards and practices
- [Test Fixing Progress](testing/TEST_FIXING_PROGRESS.md) - Test suite status

## Subagents & Tools

- [Subagents Overview](subagents/README.md) - Specialized subagents
- [Subagent Guides](subagents/guides/) - Individual subagent documentation
- [Technology Stack](subagents/technology-stack/) - Technology decisions

## Original Requirements

- [Requirements PDF](Jetvision AI Assistant Requirements.pdf) - Original requirements document
- [Requirements Text](requirements_text.txt) - Text version of requirements
- [Original UI Design](ORIGINAL_UI_DESIGN.md) - Initial UI specifications
- [Avinode Questionnaire Answers](AVINODE_QUESTIONNARY_ANSWERS.md) - Full questionnaire
- [Avinode Questionnaire Answers (Short)](AVINODE_QUESTIONARY_ANSWERS_Shorter.md) - Abbreviated version

## Collaboration

- [Merge Instructions for Owner](MERGE_INSTRUCTIONS_FOR_OWNER.md) - Merge guide
- [Message to Owner](MESSAGE_TO_OWNER.md) - Project handoff notes
- [Quick Merge Guide](QUICK_MERGE_GUIDE.md) - Fast merge instructions

## GitHub Templates & Checklists

Located in `.github/`:
- [Code Review Checklist](../.github/CODE_REVIEW_CHECKLIST.md) - Pre-PR checklist
- [Pull Request Template (Default)](../.github/PULL_REQUEST_TEMPLATE/default.md) - Standard PR template
- [Pull Request Template (Auth)](../.github/PULL_REQUEST_TEMPLATE/auth.md) - Auth-specific PRs
- [Pull Request Template (Database)](../.github/PULL_REQUEST_TEMPLATE/database.md) - Database PRs

---

## Documentation Structure

```
docs/
├── README.md (this file)
├── architecture/        # System architecture documents
├── deployment/          # Deployment and infrastructure docs
├── diagrams/            # Architecture diagrams and flowcharts (NEW)
├── git/                 # Git workflow and branch management (NEW)
├── guides/              # Developer and user guides
├── implementation/      # Feature implementation guides
├── migrations/          # Migration guides and procedures (NEW)
├── phases/              # Phase completion reports
├── project-management/  # Project structure and automation
├── sessions/            # Development session notes
├── subagents/          # Subagent documentation
├── testing/            # Testing documentation
└── troubleshooting/    # Problem resolution guides (NEW)
```

## Contributing to Documentation

When adding new documentation:

1. Place it in the appropriate subdirectory
2. Use descriptive filenames in kebab-case
3. Add an entry to this README.md
4. Include a table of contents for documents >100 lines
5. Link to related documents
6. Keep the CHANGELOG.md updated

---

## New Documentation Directories (Added 2025-11-14)

- **diagrams/** - Architecture diagrams and visual documentation (includes Avinode diagram)
- **troubleshooting/** - Problem resolution guides and debugging documentation
- **migrations/** - Migration guides and procedures
- **git/** - Git workflow and branch management documentation

---

**Last Updated**: 2025-11-14
**Project**: Jetvision AI Assistant
**Architecture**: Multi-Agent System with OpenAI Agent SDK + MCP
**Stack**: Next.js 14, TypeScript, Supabase, BullMQ + Redis
