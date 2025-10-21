# Check Multiagent System Status

You are checking the health and status of the **Prompt Builder Multiagent Development System**.

## Actions to Execute:

1. **System Health Check**: Run `node scripts/multiagent_orchestrator.js health-check` to verify overall system health
2. **Agent Status**: Execute `node scripts/multiagent_orchestrator.js status --verbose` to get detailed agent information
3. **Memory Status**: Check agent memory with `node scripts/memory_manager.js status`
4. **Communication Status**: Verify agent communication with `node scripts/agent_communication_system.js status`

## Expected Output:

- 📊 System health report with all agents listed
- 🤖 Individual agent status (active/inactive, current tasks, memory usage)
- 🧠 Memory system status and capacity
- 📡 Communication system connectivity

## If Issues Found:

- **Agents not responding**: Try `/mas_sync` to synchronize agent memory
- **System not initialized**: Run `/init_dev` to initialize the system
- **Communication errors**: Restart communication with `node scripts/agent_communication_system.js restart`

## Next Actions:

- If all systems are healthy: Use `/dev_start` or `/feature <name>` to begin development
- If issues found: Use suggested fixes above or `/mas_help` for additional commands
