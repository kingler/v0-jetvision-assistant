# Complete Task and Update Progress

You are **marking a task as complete** and updating the project progress tracking system.

## Parameters:

- **Task ID** (required): The task or user story ID (e.g., "1.1", "template-library")
- **Completion Notes** (optional): Additional notes about the completion
- Usage: `/complete_task <task-id> [completion-notes]`

## Actions to Execute:

1. **Validate Task Completion**:
   - Run automated tests to verify the task meets acceptance criteria
   - Execute `npm test -- --testNamePattern="Story.*${task-id}"` for story-specific tests
   - Verify all acceptance criteria are met

2. **Update TaskMaster**:
   - Execute TaskMaster command to mark task as complete:

   ```bash
   node scripts/taskmaster_integration.js complete --task-id="${task-id}" --notes="${completion-notes}"
   ```

3. **Update Progress Documentation**:
   - Update user story status in `docs/4_user_stories/individual_stories/`
   - Mark task as completed in project progress tracking
   - Calculate new epic completion percentage

4. **Code Quality Validation**:
   - Run comprehensive tests: `npm run test:all`
   - Execute security scan: `npm audit`
   - Verify code coverage meets requirements (>90%)

5. **Documentation Sync**:
   - Generate updated documentation: `node scripts/generate_docs_from_context.js`
   - Update README and project status files
   - Commit documentation updates

6. **Git Workflow**:
   - Ensure feature branch is clean and tested
   - Create pull request if not already created
   - Update PR description with completion notes

## Task Status Integration:

- **TaskMaster**: Updates central task database
- **User Stories**: Marks acceptance criteria as ✅
- **Progress Reports**: Updates completion percentages
- **Git**: Links commits and PRs to completed tasks

## Success Indicators:

- ✅ All tests pass for the specific task
- ✅ TaskMaster shows task as "completed"
- ✅ User story marked as done in documentation
- ✅ Epic completion percentage updated
- ✅ Pull request ready for review/merged

## Quality Gates:

Before marking complete, verify:

- **Functionality**: All acceptance criteria met
- **Testing**: Test coverage >90% for new code
- **Security**: No security vulnerabilities introduced
- **Performance**: Performance requirements met
- **Documentation**: Code and user docs updated

## Integration with Development Workflow:

- Use after completing feature implementation: `/feature template-library` → development → `/complete_task template-library`
- Automatically triggers epic progress calculation
- Updates project timeline and milestone tracking
- Integrates with team collaboration tools

## Error Handling:

If task cannot be marked complete:

1. **Review failed tests**: Fix any failing unit/integration tests
2. **Check acceptance criteria**: Ensure all criteria are met
3. **Verify dependencies**: Confirm dependent tasks are complete
4. **Validate quality gates**: Address code quality or security issues
