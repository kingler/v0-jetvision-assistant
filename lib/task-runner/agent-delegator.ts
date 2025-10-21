/**
 * Agent Delegation System
 *
 * Helps delegate work to specialized Claude Code agents with proper prompts
 * and context about tasks being executed.
 *
 * This is a PROMPT GENERATION system - it doesn't invoke agents automatically,
 * but generates the right prompts for humans to use with Claude Code.
 */

import { Task, TaskExecutionPlan, TaskStep } from './task-orchestrator'
import fs from 'fs/promises'

// ============================================
// Agent Type Definitions
// ============================================

export enum AgentType {
  BACKEND = 'backend-developer-tank',
  FRONTEND = 'frontend-developer-mouse',
  ARCHITECT = 'system-architect',
  SECURITY = 'security-engineer',
  QA = 'qa-engineer-seraph',
  DEVOPS = 'devops-engineer-link',
  INTEGRATION = 'integration-specialist',
  TECH_RESEARCH = 'tech-researcher-keymaker',
  UX = 'ux-designer-trinity',
}

// ============================================
// Prompt Templates
// ============================================

export class AgentDelegator {
  /**
   * Generates a comprehensive prompt for an agent to work on a specific task
   */
  static async generateTaskPrompt(
    task: Task,
    agentType: AgentType,
    phase: 'red' | 'green' | 'blue'
  ): Promise<string> {
    const taskContent = await fs.readFile(task.filepath, 'utf-8')

    const phaseInstructions = {
      red: 'RED PHASE - Write Failing Tests: Write comprehensive tests that currently fail. Follow the TDD approach outlined in the task file.',
      green: 'GREEN PHASE - Implement Feature: Write the minimal code needed to make all tests pass. Follow the implementation steps in the task file.',
      blue: 'BLUE PHASE - Refactor: Improve code quality, extract reusable functions, add documentation while keeping all tests passing.',
    }

    let prompt = `I need help with ${task.id}: ${task.title}\n\n`
    prompt += `## Current Phase: ${phase.toUpperCase()}\n`
    prompt += `${phaseInstructions[phase]}\n\n`
    prompt += `## Task Details\n`
    prompt += `- Priority: ${task.priority}\n`
    prompt += `- Estimated Time: ${task.estimatedHours} hours\n`
    prompt += `- Status: ${task.status}\n\n`

    if (task.dependencies.length > 0) {
      prompt += `## Dependencies (must be completed first)\n`
      task.dependencies.forEach(dep => {
        prompt += `- ${dep}\n`
      })
      prompt += '\n'
    }

    prompt += `## Your Role as ${agentType}\n`
    prompt += this.getAgentRoleDescription(agentType) + '\n\n'

    prompt += `## Full Task File\n`
    prompt += `The complete task specification is at: \`${task.filepath}\`\n\n`
    prompt += `Please read the task file and ${phase === 'red' ? 'write tests' : phase === 'green' ? 'implement the feature' : 'refactor the code'} according to the specifications.\n\n`

    prompt += `## Requirements\n`
    prompt += `1. Follow the TDD approach defined in the task file\n`
    prompt += `2. Use TypeScript with strict mode\n`
    prompt += `3. Follow coding guidelines in docs/AGENTS.md\n`
    prompt += `4. Achieve >75% code coverage\n`
    prompt += `5. Write meaningful commit messages\n`
    prompt += `6. ${phase === 'red' ? 'Tests should fail initially' : phase === 'green' ? 'All tests should pass' : 'Tests should still pass after refactoring'}\n\n`

    prompt += `## Git Workflow\n`
    prompt += `Branch: feature/TASK-${String(task.number).padStart(3, '0')}-${this.titleToSlug(task.title)}\n`
    prompt += `Commit format: ${phase}(scope): description\n\n`

    prompt += `Please help me complete the ${phase} phase of this task.`

    return prompt
  }

  /**
   * Generates prompt for a specific implementation step
   */
  static async generateStepPrompt(
    task: Task,
    step: TaskStep,
    plan: TaskExecutionPlan
  ): Promise<string> {
    let prompt = `I need help with a specific step of ${task.id}: ${task.title}\n\n`

    prompt += `## Current Step (${plan.currentStep + 1}/${plan.steps.length})\n`
    prompt += `${step.description}\n\n`

    prompt += `## Step Details\n`
    prompt += `- Type: ${step.type}\n`
    prompt += `- Estimated Time: ${step.estimatedMinutes} minutes\n`
    prompt += `- Requires Approval: ${step.requiresApproval ? 'Yes' : 'No'}\n\n`

    if (step.agentType) {
      prompt += `## Recommended Agent\n`
      prompt += `This step should be handled by: ${step.agentType}\n\n`
      prompt += this.getAgentRoleDescription(step.agentType as AgentType) + '\n\n'
    }

    prompt += `## Full Task Context\n`
    prompt += `Full task file: \`${task.filepath}\`\n\n`

    prompt += `## What I Need\n`
    if (step.type === 'automated') {
      prompt += `This is an automated step. Please execute the commands or provide the script to run.\n`
    } else if (step.type === 'agent-assisted') {
      prompt += `This requires your expertise. Please implement this step following:\n`
      prompt += `1. The task file specifications\n`
      prompt += `2. TDD approach (tests first)\n`
      prompt += `3. Coding guidelines in docs/AGENTS.md\n`
      prompt += `4. Git workflow in docs/GIT_WORKFLOW.md\n`
    } else {
      prompt += `This is a manual step that requires human judgment. Please guide me through what to do.\n`
    }

    return prompt
  }

  /**
   * Generates prompt for code review
   */
  static generateReviewPrompt(task: Task, prUrl?: string): string {
    let prompt = `I need a code review for ${task.id}: ${task.title}\n\n`

    if (prUrl) {
      prompt += `## Pull Request\n${prUrl}\n\n`
    }

    prompt += `## Review Checklist\n`
    prompt += `Please review based on the checklist in the task file at: \`${task.filepath}\`\n\n`

    prompt += `Specifically check:\n`
    prompt += `1. **Functionality**: Does it meet all acceptance criteria?\n`
    prompt += `2. **Code Quality**: Follows project guidelines?\n`
    prompt += `3. **Testing**: Tests comprehensive and passing?\n`
    prompt += `4. **Security**: No vulnerabilities introduced?\n`
    prompt += `5. **Performance**: Meets performance requirements?\n`
    prompt += `6. **Documentation**: Code comments and docs updated?\n\n`

    prompt += `Please provide:\n`
    prompt += `- List of issues found (if any)\n`
    prompt += `- Suggestions for improvement\n`
    prompt += `- Approval status (approved / request changes / comment)\n`

    return prompt
  }

  /**
   * Generates prompt for security review
   */
  static generateSecurityReviewPrompt(task: Task): string {
    let prompt = `I need a security review for ${task.id}: ${task.title}\n\n`

    prompt += `## Security Checklist\n`
    prompt += `Please review for:\n\n`
    prompt += `1. **Authentication/Authorization**: Proper access controls?\n`
    prompt += `2. **Input Validation**: All inputs validated and sanitized?\n`
    prompt += `3. **Secrets Management**: No hardcoded API keys or secrets?\n`
    prompt += `4. **SQL Injection**: Parameterized queries used?\n`
    prompt += `5. **XSS Protection**: Proper output escaping?\n`
    prompt += `6. **CSRF Protection**: Tokens implemented where needed?\n`
    prompt += `7. **Rate Limiting**: API endpoints rate-limited?\n`
    prompt += `8. **Error Handling**: No sensitive info in error messages?\n\n`

    prompt += `Task file: \`${task.filepath}\`\n\n`

    prompt += `Please identify any security concerns and provide remediation recommendations.`

    return prompt
  }

  /**
   * Generates prompt for test creation (RED phase)
   */
  static async generateTestCreationPrompt(
    task: Task,
    testType: 'unit' | 'integration' | 'e2e'
  ): Promise<string> {
    const taskContent = await fs.readFile(task.filepath, 'utf-8')

    let prompt = `I need help writing ${testType} tests for ${task.id}: ${task.title}\n\n`

    prompt += `## Test Type: ${testType.toUpperCase()}\n\n`

    if (testType === 'unit') {
      prompt += `Unit tests should:\n`
      prompt += `- Test individual functions/methods in isolation\n`
      prompt += `- Use mocks for dependencies\n`
      prompt += `- Be fast and independent\n`
      prompt += `- Target: >85% coverage for business logic\n\n`
    } else if (testType === 'integration') {
      prompt += `Integration tests should:\n`
      prompt += `- Test interactions between components\n`
      prompt += `- Use real database (test environment)\n`
      prompt += `- Test API endpoints end-to-end\n`
      prompt += `- Target: >80% coverage for integration points\n\n`
    } else {
      prompt += `E2E tests should:\n`
      prompt += `- Test complete user workflows\n`
      prompt += `- Use Playwright for browser automation\n`
      prompt += `- Cover happy paths and error scenarios\n`
      prompt += `- Verify user-facing functionality\n\n`
    }

    prompt += `## Task File\n`
    prompt += `Full specifications at: \`${task.filepath}\`\n\n`

    prompt += `## Testing Requirements from Task\n`
    prompt += this.extractTestingRequirements(taskContent) + '\n\n'

    prompt += `## Framework\n`
    prompt += `- Unit/Integration: Vitest\n`
    prompt += `- E2E: Playwright\n`
    prompt += `- Coverage tool: c8\n\n`

    prompt += `Please write comprehensive ${testType} tests following TDD Red phase - tests should FAIL initially.`

    return prompt
  }

  /**
   * Generates prompt for performance optimization
   */
  static generatePerformancePrompt(task: Task, metrics: string): string {
    let prompt = `I need help optimizing performance for ${task.id}: ${task.title}\n\n`

    prompt += `## Current Performance Metrics\n`
    prompt += `\`\`\`\n${metrics}\n\`\`\`\n\n`

    prompt += `## Performance Requirements from Task\n`
    prompt += `Check the task file for specific performance targets: \`${task.filepath}\`\n\n`

    prompt += `## Areas to Investigate\n`
    prompt += `1. Database query optimization\n`
    prompt += `2. N+1 query problems\n`
    prompt += `3. Unnecessary re-renders (React)\n`
    prompt += `4. Large bundle sizes\n`
    prompt += `5. Slow API calls\n`
    prompt += `6. Memory leaks\n\n`

    prompt += `Please analyze the performance and suggest optimizations.`

    return prompt
  }

  /**
   * Gets role description for an agent type
   */
  private static getAgentRoleDescription(agentType: AgentType): string {
    const descriptions = {
      [AgentType.BACKEND]: `As the backend developer, you should focus on:
- API endpoint implementation
- Database schema and queries
- Business logic and data validation
- Server-side error handling
- Integration with external services`,

      [AgentType.FRONTEND]: `As the frontend developer, you should focus on:
- React component implementation
- UI/UX implementation
- State management
- Client-side validation
- Responsive design`,

      [AgentType.ARCHITECT]: `As the system architect, you should focus on:
- System design and architecture decisions
- Component interaction patterns
- Scalability and performance considerations
- Technical specifications
- Architecture documentation`,

      [AgentType.SECURITY]: `As the security engineer, you should focus on:
- Security vulnerability assessment
- Authentication and authorization
- Input validation and sanitization
- Secrets management
- Security best practices`,

      [AgentType.QA]: `As the QA engineer, you should focus on:
- Test strategy and planning
- Test case design
- Test automation
- Coverage analysis
- Bug reporting and verification`,

      [AgentType.DEVOPS]: `As the DevOps engineer, you should focus on:
- CI/CD pipeline setup
- Deployment automation
- Infrastructure as code
- Monitoring and alerting
- Incident response`,

      [AgentType.INTEGRATION]: `As the integration specialist, you should focus on:
- API integration design
- Data transformation
- Error handling for external services
- Integration testing
- Service communication patterns`,

      [AgentType.TECH_RESEARCH]: `As the tech researcher, you should focus on:
- Technology evaluation
- Best practices research
- Library and framework comparison
- Proof of concept implementation
- Technical documentation`,

      [AgentType.UX]: `As the UX designer, you should focus on:
- User experience design
- User flow optimization
- Accessibility requirements
- Usability testing
- Design system consistency`,
    }

    return descriptions[agentType] || 'Please help with this task using your expertise.'
  }

  /**
   * Extracts testing requirements from task content
   */
  private static extractTestingRequirements(taskContent: string): string {
    const testSection = taskContent.match(/## 7\. Testing Requirements(.+?)(?=## 8\.|$)/s)
    if (!testSection) return 'No specific testing requirements found in task file.'

    // Extract key points
    const requirements = testSection[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim())
      .join('\n')

    return requirements || 'See task file for testing requirements.'
  }

  /**
   * Converts title to slug
   */
  private static titleToSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  // ============================================
  // Agent Selection Logic
  // ============================================

  /**
   * Recommends which agent should handle a task based on content analysis
   */
  static recommendAgent(task: Task, stepDescription?: string): AgentType {
    const content = stepDescription || task.title

    // Priority order for matching
    const patterns: [RegExp, AgentType][] = [
      [/security|auth|encryption|vulnerability|XSS|SQL injection/i, AgentType.SECURITY],
      [/test|QA|coverage|vitest|playwright/i, AgentType.QA],
      [/backend|API|database|server|supabase|postgres/i, AgentType.BACKEND],
      [/frontend|UI|component|react|tailwind|shadcn/i, AgentType.FRONTEND],
      [/architecture|design|system|pattern/i, AgentType.ARCHITECT],
      [/deploy|CI\/CD|vercel|docker|infrastructure/i, AgentType.DEVOPS],
      [/integration|webhook|external API|MCP/i, AgentType.INTEGRATION],
      [/research|evaluate|compare|proof of concept/i, AgentType.TECH_RESEARCH],
      [/UX|user experience|usability|accessibility/i, AgentType.UX],
    ]

    for (const [pattern, agentType] of patterns) {
      if (pattern.test(content)) {
        return agentType
      }
    }

    // Default to backend for most tasks
    return AgentType.BACKEND
  }

  /**
   * Recommends multiple agents for a complex task
   */
  static recommendAgents(task: Task): AgentType[] {
    const agents = new Set<AgentType>()

    // Always include QA for test-driven development
    agents.add(AgentType.QA)

    // Analyze task title and description
    const content = task.title.toLowerCase()

    if (content.includes('auth') || content.includes('security')) {
      agents.add(AgentType.SECURITY)
      agents.add(AgentType.BACKEND)
    }

    if (content.includes('database') || content.includes('schema')) {
      agents.add(AgentType.BACKEND)
      agents.add(AgentType.ARCHITECT)
    }

    if (content.includes('ui') || content.includes('component') || content.includes('frontend')) {
      agents.add(AgentType.FRONTEND)
      agents.add(AgentType.UX)
    }

    if (content.includes('deploy') || content.includes('ci/cd')) {
      agents.add(AgentType.DEVOPS)
    }

    if (content.includes('integration') || content.includes('api') || content.includes('mcp')) {
      agents.add(AgentType.INTEGRATION)
    }

    // If no specific agents identified, use backend
    if (agents.size === 1) {
      agents.add(AgentType.BACKEND)
    }

    return Array.from(agents)
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Formats a prompt for easy copy-paste into Claude Code
 */
export function formatPromptForClaude(prompt: string): string {
  return `\n${'='.repeat(70)}\n${prompt}\n${'='.repeat(70)}\n`
}

/**
 * Saves a prompt to a file for reference
 */
export async function savePromptToFile(
  task: Task,
  phase: string,
  prompt: string
): Promise<string> {
  const filename = `${task.id}-${phase}-prompt.txt`
  const filepath = `/tmp/${filename}`

  await fs.writeFile(filepath, prompt, 'utf-8')
  return filepath
}
