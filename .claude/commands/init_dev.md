# Initialize Multiagent Development System

You are initializing the **Prompt Builder Multiagent Development System**. This command will set up the complete AI-driven development environment with all 7 specialized agents.

## Actions to Execute:

1. **Verify Project Structure**: Ensure you're in the Prompt Builder project root with `package.json` present
2. **Install Multiagent Commands**: Execute `./install_mas_commands.sh` to install all multiagent system commands
3. **Load Commands**: Source the commands for immediate availability: `source ~/.mas_commands/load_mas.sh`
4. **Bootstrap System**: Run `node scripts/bootstrap_multiagent_system.js --project-name="Prompt Builder" --project-type="web-application" --agents="development,system_architect,ux_ui,database,api,qa,security"`
5. **Generate Documentation**: Execute `node scripts/generate_docs_from_context.js` to create initial documentation
6. **Initialize Memory**: Set up agent memory management with `node scripts/memory_manager.js init`
7. **Start Communication**: Initialize agent communication with `node scripts/agent_communication_system.js init`
8. **Health Check**: Verify system status with `node scripts/multiagent_orchestrator.js health-check`

## Success Indicators:

- ✅ All 7 agents (development, system_architect, ux_ui, database, api, qa, security) are active
- 🚀 System reports "Ready for collaborative development of Prompt Builder"
- 📊 Agent memory and communication systems are operational

## Next Steps:

After initialization, use `/mas_status` to verify system health and `/dev_start` to begin development sessions.
