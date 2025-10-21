# Feature Development Mode

You are starting **feature-specific development** for the Prompt Builder project with appropriate agent coordination.

## Parameters:

- **Feature Name** (required): Name of the feature to develop
- **Focus Area** (optional): `frontend`, `backend`, or `full-stack` (default)
- Usage: `/feature <feature-name> [focus-area]`

## Actions to Execute:

1. **Parse Parameters**: Extract feature name and focus area from command
2. **Determine Agent Team**: Based on focus area, coordinate appropriate agents:
   - **Frontend**: `development,ux_ui,qa`
   - **Backend**: `development,database,api,security,qa`
   - **Full-Stack**: `development,system_architect,ux_ui,database,api,qa,security`
3. **Start Coordinated Development**: Execute `node scripts/multiagent_orchestrator.js coordinate --feature="{feature-name}" --agents="{agent-list}"`
4. **Create Feature Branch**: `git checkout -b feature/{feature-name}`
5. **Load User Story Context**: If feature matches a user story, load the specific story file from `docs/4_user_stories/individual_stories/`

## Agent Coordination by Focus:

### Frontend Focus:

- **Development Agent**: React/TypeScript implementation
- **UX/UI Agent**: Design system compliance, accessibility
- **QA Agent**: Component testing, user experience validation

### Backend Focus:

- **Development Agent**: Core logic implementation
- **Database Agent**: Convex schema and data operations
- **API Agent**: Convex functions and mutations
- **Security Agent**: Data validation and access control
- **QA Agent**: Integration testing and validation

### Full-Stack Focus:

- **All Agents**: Complete feature implementation with full coordination

## User Story Integration:

If the feature name matches a user story pattern, automatically reference:

- Template Management: `template-library`, `template-creation`, `template-editing`, `template-export-import`, `template-variables`
- Chain Creation: `linear-chains`, `branching-chains`, `parallel-chains`, `iterative-chains`, `chain-testing`
- Agent System: `role-expertise`, `tools-capabilities`, `knowledge-access`, `memory-management`, `agent-integration`
- User Interface: `dashboard`, `navigation`, `template-browser`, `chain-visualizer`, `agent-builder`
- Testing: `prompt-testing`, `ab-testing`, `prompt-analytics`, `prompt-debugging`
- Enterprise: `user-management`, `team-collaboration`, `prompt-governance`, `enterprise-analytics`

## Success Indicators:

- ✅ Feature development session active
- 🤖 Appropriate agents coordinated for the focus area
- 🌿 Feature branch created
- 📋 User story context loaded (if applicable)

## Next Steps:

- Begin implementation following Test-Driven Development (TDD)
- Use `/test unit` frequently during development
- Use `/docs` to update documentation
- Use `/mas_status` to monitor agent coordination
