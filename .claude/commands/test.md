# Run Quality Assurance Testing

You are executing **quality assurance testing** for the Prompt Builder project using the QA agent.

## Parameters:

- **Test Type** (optional): `unit`, `integration`, `e2e`, or `comprehensive` (default)
- Usage: `/test [test-type]`

## Actions to Execute:

1. **Activate QA Agent**: Execute `node scripts/multiagent_orchestrator.js coordinate --agent-type="qa" --task="test-execution"`
2. **Run Tests Based on Type**:

### Unit Testing (`/test unit`):

```bash
npm test
```

- Focus: Individual component and function testing
- Coverage: Aim for 90%+ coverage on new code
- Speed: Fast execution for development workflow

### Integration Testing (`/test integration`):

```bash
npm run test:integration
```

- Focus: API endpoints, database operations, service integration
- Coverage: Cross-component functionality
- Validation: Data flow and system integration

### End-to-End Testing (`/test e2e`):

```bash
npm run test:e2e
```

- Focus: Complete user workflows and features
- Coverage: User stories and acceptance criteria
- Browser: Cross-browser compatibility testing

### Comprehensive Testing (`/test` or `/test comprehensive`):

```bash
npm run test:all
```

- Focus: Complete test suite execution
- Coverage: All test types in sequence
- Validation: Full system validation

## Quality Gates:

- **Unit Tests**: Must pass with >90% coverage
- **Integration Tests**: All API endpoints and database operations
- **E2E Tests**: All user workflows complete successfully
- **Linting**: Code quality standards enforced
- **Type Checking**: TypeScript compilation without errors

## Success Indicators:

- ✅ All tests pass successfully
- 📊 Coverage metrics meet requirements
- 🔍 No linting or type errors
- 🤖 QA agent confirms quality standards

## If Tests Fail:

1. **Review Test Output**: Analyze specific failure messages
2. **Check Recent Changes**: Identify what code changes caused failures
3. **Fix Issues**: Address failing tests before proceeding
4. **Re-run Tests**: Verify fixes with `/test [type]`

## Integration with Development:

- Run `/test unit` frequently during feature development
- Run `/test integration` before creating pull requests
- Run `/test comprehensive` before merging to main branch
- Use with `/feature` command for TDD workflow
