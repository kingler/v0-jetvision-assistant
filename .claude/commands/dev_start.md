# Start Development Session

You are starting a **Prompt Builder development session** with coordinated multiagent collaboration.

## Parameters:

- **Feature Name** (optional): Specify a feature name, defaults to "general-development"
- Usage: `/dev_start [feature-name]`

## Actions to Execute:

1. **Verify System Status**: First run `node scripts/multiagent_orchestrator.js health-check` to ensure system is ready
2. **Start Development Coordination**: Execute `node scripts/multiagent_orchestrator.js coordinate --session="dev-{feature-name}" --agents="development,system_architect,ux_ui"`
3. **Generate Development Context**: Run `node scripts/generate_docs_from_context.js --target="development_session"`
4. **Sync Agent Memory**: Execute `node scripts/multiagent_orchestrator.js sync-memory`
5. **Create Feature Branch**: If feature name provided, create git branch: `git checkout -b feature/{feature-name}`

## Agent Coordination:

- **Development Agent**: Activated for code implementation
- **System Architect Agent**: Provides architectural guidance
- **UX/UI Agent**: Ensures user experience standards

## Success Indicators:

- ✅ Development session started successfully
- 🤖 All three agents are coordinated and responsive
- 📝 Development context generated
- 🧠 Agent memory synchronized

## Next Steps:

- Use `/feature <name> [focus]` for specific feature development
- Use `/test [type]` to run quality assurance
- Use `/docs` to generate documentation as you develop

## Available Focus Areas for Features:

- `frontend`: UI/UX focused development
- `backend`: Database/API focused development
- `full-stack`: Complete feature implementation
