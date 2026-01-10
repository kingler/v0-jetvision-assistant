/**
 * Prompt Templates
 *
 * Reusable prompt sections and templates for agent prompts.
 * These templates can be composed to build comprehensive prompts.
 *
 * @see ONEK-143 - Enhance Agent System Prompts with Chat Messaging & Booking Tools
 */

/**
 * Response format templates for different agent types
 */
export const RESPONSE_FORMATS = {
  /**
   * Standard response format for task-oriented agents
   */
  STANDARD: `## Response Format
- Summarize actions taken
- Present next steps clearly
- Include relevant IDs and references
- Offer follow-up assistance`,

  /**
   * Conversational response format
   */
  CONVERSATIONAL: `## Response Format
- Conversational, helpful tone
- Clear status updates
- Actionable next steps
- Reference relevant context from history`,

  /**
   * Technical response format for data-oriented responses
   */
  TECHNICAL: `## Response Format
- Structured data presentation
- Clear metrics and measurements
- Detailed explanations when needed
- Error context if applicable`,

  /**
   * Email response format
   */
  EMAIL: `## Response Format
- Professional, warm tone
- Clear and concise messaging
- All relevant details included
- Mobile-friendly formatting`,
};

/**
 * Tool usage guideline templates
 */
export const TOOL_GUIDELINES = {
  /**
   * Avinode MCP tools
   */
  AVINODE: `## Avinode Tools
- search_flights: Search for available charter flights
- create_trip: Create trip container and get deep link
- get_rfq: Retrieve RFQ details and quotes
- get_quote: Get specific quote details
- cancel_trip: Cancel an active trip
- send_trip_message: Send message to operators
- get_trip_messages: Retrieve conversation history
- get_message: Get specific message by ID`,

  /**
   * Booking tools
   */
  BOOKING: `## Booking Tools
- book_flight: Create booking request for accepted quote
- decline_quote: Decline an RFQ with reason
- get_booking_status: Check booking status
- generate_quote_pdf: Download quote as PDF`,

  /**
   * Gmail MCP tools
   */
  GMAIL: `## Gmail Tools
- send_email: Send email with optional attachments
- create_draft: Create email draft for review
- get_email: Retrieve email details
- list_emails: List recent emails`,

  /**
   * Database tools
   */
  DATABASE: `## Database Tools
- get_client_profile: Fetch client profile
- update_request_status: Update request status
- store_quote: Store quote in database
- log_activity: Log agent activity`,
};

/**
 * Workflow guideline templates
 */
export const WORKFLOW_TEMPLATES = {
  /**
   * Flight booking workflow
   */
  FLIGHT_BOOKING: `## Flight Booking Workflow
1. User provides flight requirements
2. Create trip in Avinode (get deep link)
3. Present deep link for operator selection
4. Monitor for incoming quotes
5. Score and rank quotes
6. Present recommendations to user
7. Handle booking request
8. Send confirmation email`,

  /**
   * Operator communication workflow
   */
  OPERATOR_COMMUNICATION: `## Operator Communication Workflow
1. Identify communication need
2. Retrieve message history if exists
3. Compose professional message
4. Send via send_trip_message
5. Monitor for operator response
6. Update user on communication status`,

  /**
   * Proposal generation workflow
   */
  PROPOSAL_GENERATION: `## Proposal Generation Workflow
1. Gather quote details
2. Retrieve client preferences
3. Score and rank quotes
4. Generate PDF proposal
5. Compose proposal email
6. Attach PDF and send
7. Log email in database`,

  /**
   * Webhook event handling workflow
   */
  WEBHOOK_HANDLING: `## Webhook Event Handling
1. Receive webhook event
2. Parse event type and payload
3. Store event in database
4. Route to appropriate agent
5. Execute agent action
6. Notify user if needed
7. Update workflow state`,
};

/**
 * Error handling templates
 */
export const ERROR_HANDLING = {
  /**
   * Retry strategy
   */
  RETRY_STRATEGY: `## Retry Strategy
- Use exponential backoff: 1s, 2s, 4s, 8s
- Maximum 3 retry attempts
- Log each retry attempt
- Different strategies per error type`,

  /**
   * Error categories
   */
  ERROR_CATEGORIES: `## Error Categories
- API Errors: External service failures (retry)
- Validation Errors: Invalid input data (no retry)
- Timeout Errors: Operation timeouts (retry with longer timeout)
- Authentication Errors: Auth failures (refresh and retry)
- Rate Limit Errors: API rate limiting (wait and retry)`,

  /**
   * Error response format
   */
  ERROR_RESPONSE: `## Error Response Format
- Clear error message
- Error classification
- Suggested resolution
- Alternative actions if available`,
};

/**
 * Security and compliance templates
 */
export const SECURITY_TEMPLATES = {
  /**
   * Data handling guidelines
   */
  DATA_HANDLING: `## Data Security
- Only access authorized data
- Log all data access
- Respect privacy settings
- Handle sensitive data appropriately
- Never expose credentials in responses`,

  /**
   * Authentication guidelines
   */
  AUTHENTICATION: `## Authentication
- Validate user identity before sensitive operations
- Check authorization for data access
- Refresh tokens when needed
- Report authentication failures`,
};

/**
 * Communication tone templates
 */
export const TONE_TEMPLATES = {
  /**
   * Professional business tone
   */
  PROFESSIONAL: `## Communication Tone
- Professional and courteous
- Clear and concise
- Action-oriented
- Respect user's time`,

  /**
   * Friendly conversational tone
   */
  FRIENDLY: `## Communication Tone
- Warm and approachable
- Helpful and supportive
- Patient with clarifications
- Encouraging`,

  /**
   * Technical informative tone
   */
  TECHNICAL: `## Communication Tone
- Precise and accurate
- Detailed when needed
- Avoid unnecessary jargon
- Provide context for technical terms`,
};

/**
 * Compose multiple templates into a single prompt section
 *
 * @param templates - Array of template strings to compose
 * @returns Combined template string
 */
export function composeTemplates(...templates: string[]): string {
  return templates.join('\n\n');
}

/**
 * Create a section with title and content
 *
 * @param title - Section title
 * @param content - Section content
 * @returns Formatted section string
 */
export function createSection(title: string, content: string): string {
  return `## ${title}\n${content}`;
}

/**
 * Create a numbered list
 *
 * @param items - Array of list items
 * @returns Formatted numbered list
 */
export function createNumberedList(items: string[]): string {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

/**
 * Create a bullet list
 *
 * @param items - Array of list items
 * @returns Formatted bullet list
 */
export function createBulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

/**
 * Create a tool documentation entry
 *
 * @param name - Tool name
 * @param description - Tool description
 * @param usage - Optional usage example
 * @returns Formatted tool documentation
 */
export function createToolDoc(name: string, description: string, usage?: string): string {
  let doc = `- ${name}: ${description}`;
  if (usage) {
    doc += `\n  Usage: ${usage}`;
  }
  return doc;
}

/**
 * Create a workflow step
 *
 * @param step - Step number
 * @param action - Action description
 * @param details - Optional additional details
 * @returns Formatted workflow step
 */
export function createWorkflowStep(step: number, action: string, details?: string): string {
  let stepStr = `${step}. ${action}`;
  if (details) {
    stepStr += `\n   ${details}`;
  }
  return stepStr;
}

/**
 * Predefined prompt sections for common use cases
 */
export const PROMPT_SECTIONS = {
  // Avinode integration
  AVINODE_INTEGRATION: composeTemplates(
    TOOL_GUIDELINES.AVINODE,
    TOOL_GUIDELINES.BOOKING
  ),

  // Full communication setup
  COMMUNICATION_SETUP: composeTemplates(
    TOOL_GUIDELINES.GMAIL,
    TONE_TEMPLATES.PROFESSIONAL,
    RESPONSE_FORMATS.EMAIL
  ),

  // Error handling setup
  ERROR_HANDLING_SETUP: composeTemplates(
    ERROR_HANDLING.RETRY_STRATEGY,
    ERROR_HANDLING.ERROR_CATEGORIES,
    ERROR_HANDLING.ERROR_RESPONSE
  ),

  // Security compliance
  SECURITY_COMPLIANCE: composeTemplates(
    SECURITY_TEMPLATES.DATA_HANDLING,
    SECURITY_TEMPLATES.AUTHENTICATION
  ),
};
