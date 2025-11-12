/**
 * ChatKit Workflow Configuration
 *
 * This configuration defines the OpenAI Agent Builder workflow that connects
 * all 6 specialized agents in the Jetvision Multi-Agent System.
 *
 * IMPORTANT: This is a DESIGN/SPECIFICATION file for manual configuration
 * in the OpenAI Agent Builder dashboard. It cannot be programmatically created.
 *
 * To use this configuration:
 * 1. Visit https://platform.openai.com/playground/agents
 * 2. Create a new workflow using the specifications below
 * 3. Configure each agent with the specified tools and parameters
 * 4. Set up handoff rules as defined in HANDOFF_RULES
 * 5. Copy the generated workflow ID to CHATKIT_WORKFLOW_ID in .env.local
 *
 * Reference: Linear Issue ONEK-86
 * Architecture: /docs/architecture/MULTI_AGENT_SYSTEM.md
 * Integration Plan: /.cursor/plans/mcp-1006bb35.plan.md
 */

import { AgentType } from '@agents/core/types';

/**
 * Workflow Metadata
 */
export const WORKFLOW_METADATA = {
  name: 'Jetvision RFP Processing Workflow',
  description:
    'Multi-agent workflow for processing charter flight RFPs from analysis to proposal delivery',
  version: '1.0.0',
  createdAt: '2025-11-01',
  estimatedDuration: '5-15 minutes per RFP',
} as const;

/**
 * Agent Configuration for OpenAI Agent Builder
 *
 * Each agent configuration includes:
 * - Basic metadata (name, description, model)
 * - GPT-5 Responses API parameters (reasoning effort, verbosity)
 * - Assigned MCP tools
 * - System prompt instructions
 * - Handoff capabilities
 */
export const AGENT_CONFIGURATIONS = {
  /**
   * 1. ORCHESTRATOR AGENT
   *
   * Role: Entry point and coordinator
   * Responsibilities:
   * - Analyze incoming RFP requests
   * - Validate required data
   * - Create workflow state machine
   * - Delegate tasks to specialized agents
   * - Monitor overall progress
   */
  [AgentType.ORCHESTRATOR]: {
    name: 'RFP Orchestrator',
    description:
      'Analyzes RFPs, determines priority, and coordinates the workflow by delegating to specialized agents',
    model: 'gpt-5',

    // GPT-5 Configuration
    reasoning: {
      effort: 'medium', // Complex reasoning for workflow coordination
    },
    text: {
      verbosity: 'medium', // Balanced explanations
    },
    maxOutputTokens: 4096,

    // Assigned Tools
    tools: [
      // Supabase MCP - Read workflow state and request data
      'supabase_query', // Query iso_requests, iso_workflows tables
      'supabase_insert', // Create workflow records
      'supabase_update', // Update workflow state

      // Internal coordination (via MessageBus, not MCP)
      // - Create workflow state machine
      // - Publish TASK_CREATED messages
      // - Hand off to ClientDataAgent and FlightSearchAgent
    ],

    // System Prompt
    systemPrompt: `You are the RFP Orchestrator for Jetvision, a charter flight broker.

Your responsibilities:
1. Analyze incoming RFP requests for charter flights
2. Extract and validate: departure/arrival airports, dates, passenger count, client info
3. Determine urgency based on departure date:
   - ≤1 day: urgent
   - ≤3 days: high
   - ≤7 days: normal
   - >7 days: low
4. Create workflow state machine (CREATED → ANALYZING)
5. Delegate tasks:
   - If client name provided: Hand off to ClientDataAgent
   - Always: Hand off to FlightSearchAgent after client data (or immediately if no client)

Key behaviors:
- Always validate required fields before proceeding
- Calculate urgency to prioritize requests
- Create structured task payloads for downstream agents
- Track workflow state in Supabase
- Provide clear handoff reasons

Output format: Structured JSON with analysis, tasks, and next steps.`,

    // Handoff Configuration
    canHandoffTo: [AgentType.CLIENT_DATA, AgentType.FLIGHT_SEARCH, AgentType.ERROR_MONITOR],
  },

  /**
   * 2. CLIENT DATA AGENT
   *
   * Role: Client profile management
   * Responsibilities:
   * - Fetch client data from Google Sheets
   * - Identify preferences and history
   * - Enrich request context
   * - Hand off to FlightSearchAgent
   */
  [AgentType.CLIENT_DATA]: {
    name: 'Client Data Manager',
    description:
      'Fetches client profiles from Google Sheets including preferences, history, and VIP status',
    model: 'gpt-5-mini', // Simpler task, use mini for speed

    // GPT-5 Configuration
    reasoning: {
      effort: 'minimal', // Straightforward data retrieval
    },
    text: {
      verbosity: 'low', // Concise responses
    },
    maxOutputTokens: 2048,

    // Assigned Tools
    tools: [
      // Google Sheets MCP - Client database access
      'list_clients', // List all clients
      'search_client', // Search by name/email
      'get_client_details', // Get full client profile
      'read_sheet', // Read specific ranges

      // Supabase MCP - Cache client data
      'supabase_query', // Check cached client data
      'supabase_insert', // Cache new client records
      'supabase_update', // Update client cache
    ],

    // System Prompt
    systemPrompt: `You are the Client Data Manager for Jetvision.

Your responsibilities:
1. Receive client name/email from OrchestratorAgent
2. Search for client in Google Sheets database
3. Extract client profile:
   - Contact information
   - Flight preferences (aircraft types, amenities)
   - Budget range
   - VIP status
   - Past bookings history
   - Special requirements
4. Enrich request context with client data
5. Hand off to FlightSearchAgent with complete context

Key behaviors:
- If client not found, proceed with basic information only
- Prioritize VIP clients (note in metadata)
- Extract aircraft preferences to inform search
- Identify budget constraints
- Note any special requirements (pets, wheelchairs, etc.)

Output format: Client profile object with preferences and history.`,

    // Handoff Configuration
    canHandoffTo: [AgentType.FLIGHT_SEARCH, AgentType.ERROR_MONITOR],
  },

  /**
   * 3. FLIGHT SEARCH AGENT
   *
   * Role: Flight search and RFP creation
   * Responsibilities:
   * - Search flights via Avinode API
   * - Search empty legs for cost savings
   * - Create RFP with selected operators
   * - Monitor RFP status
   * - Hand off to ProposalAnalysisAgent when quotes received
   */
  [AgentType.FLIGHT_SEARCH]: {
    name: 'Flight Search Specialist',
    description:
      'Searches charter flights via Avinode, creates RFPs, and monitors incoming quotes',
    model: 'gpt-5',

    // GPT-5 Configuration
    reasoning: {
      effort: 'low', // Structured API interactions
    },
    text: {
      verbosity: 'medium', // Explain search results
    },
    maxOutputTokens: 6144,

    // Assigned Tools
    tools: [
      // Avinode MCP - Flight search and RFP management
      'search_flights', // Search available flights
      'search_empty_legs', // Search discounted empty legs
      'create_rfp', // Create RFP with operators
      'get_rfp_status', // Check RFP status and quotes
      'create_watch', // Monitor for new availability
      'search_airports', // Validate airport codes

      // Supabase MCP - Store search results and RFP data
      'supabase_insert', // Save flight options
      'supabase_update', // Update RFP status
      'supabase_query', // Retrieve flight data
    ],

    // System Prompt
    systemPrompt: `You are the Flight Search Specialist for Jetvision.

Your responsibilities:
1. Receive flight search parameters from previous agent
2. Search for flights using Avinode API:
   - Primary search: Regular charter flights
   - Secondary search: Empty legs (30-75% savings)
3. Apply filters based on client preferences:
   - Aircraft type preferences
   - Budget constraints
   - Operator ratings (minimum 4.0/5.0)
   - Passenger capacity
4. Create RFP with top operators (minimum 3, maximum 10)
5. Store RFP ID and monitor for quotes
6. Transition workflow state to AWAITING_QUOTES
7. Hand off to ProposalAnalysisAgent once quotes received

Key behaviors:
- Always search empty legs first (significant cost savings)
- Respect client aircraft preferences
- Only include operators with safety ratings ≥4.0
- Create detailed RFP with all trip requirements
- Store all flight options in Supabase for analysis
- Wait for minimum 3 quotes before proceeding (timeout: 24 hours)

Output format: RFP details with flight options and quote count.`,

    // Handoff Configuration
    canHandoffTo: [AgentType.PROPOSAL_ANALYSIS, AgentType.ERROR_MONITOR],
  },

  /**
   * 4. PROPOSAL ANALYSIS AGENT
   *
   * Role: Quote scoring and ranking
   * Responsibilities:
   * - Retrieve all quotes from Avinode
   * - Score quotes on multiple dimensions
   * - Rank proposals by total score
   * - Select top 3 options
   * - Hand off to CommunicationAgent
   */
  [AgentType.PROPOSAL_ANALYSIS]: {
    name: 'Proposal Analysis Expert',
    description: 'Scores and ranks flight quotes using multi-dimensional analysis and AI scoring',
    model: 'gpt-5',

    // GPT-5 Configuration
    reasoning: {
      effort: 'medium', // Complex scoring algorithm
    },
    text: {
      verbosity: 'medium', // Explain scoring rationale
    },
    maxOutputTokens: 8192,

    // Assigned Tools
    tools: [
      // Avinode MCP - Retrieve quotes
      'get_rfp_status', // Get all quotes for RFP

      // Supabase MCP - Analyze and store scores
      'supabase_query', // Retrieve quote data
      'supabase_insert', // Save analysis results
      'supabase_update', // Update quote scores
    ],

    // System Prompt
    systemPrompt: `You are the Proposal Analysis Expert for Jetvision.

Your responsibilities:
1. Receive RFP ID from FlightSearchAgent
2. Retrieve all quotes via Avinode API
3. Score each quote on 4 dimensions (0-100 each):

   a) Price Score (30% weight):
      - Compare to budget and market average
      - Reward competitive pricing
      - Penalize outliers

   b) Safety Score (35% weight):
      - Operator safety rating
      - Aircraft age and maintenance
      - Certifications and compliance
      - Incident history

   c) Speed Score (15% weight):
      - Total trip time
      - Aircraft cruise speed
      - Minimal layovers

   d) Comfort Score (20% weight):
      - Aircraft amenities
      - Cabin size and configuration
      - Passenger capacity vs actual count
      - Catering and entertainment options

4. Calculate weighted total score (0-100)
5. Rank all quotes by total score
6. Select top 3 options
7. Generate comparison summary
8. Store analysis in Supabase
9. Hand off to CommunicationAgent with top selections

Key behaviors:
- Always score all received quotes
- Apply client preferences as bonus points
- Flag VIP clients for premium options
- Include cost-saving opportunities (empty legs)
- Provide detailed scoring breakdown
- Explain why top 3 were selected

Output format: Ranked quotes with scores and selection rationale.`,

    // Handoff Configuration
    canHandoffTo: [AgentType.COMMUNICATION, AgentType.ERROR_MONITOR],
  },

  /**
   * 5. COMMUNICATION AGENT
   *
   * Role: Email generation and delivery
   * Responsibilities:
   * - Generate personalized email to client
   * - Format top 3 flight proposals
   * - Create PDF summary
   * - Send email via Gmail
   * - Update workflow to COMPLETED
   */
  [AgentType.COMMUNICATION]: {
    name: 'Communication Manager',
    description:
      'Generates personalized emails with flight proposals and sends via Gmail with PDF attachments',
    model: 'gpt-5',

    // GPT-5 Configuration
    reasoning: {
      effort: 'low', // Email template generation
    },
    text: {
      verbosity: 'high', // Rich, professional email content
    },
    maxOutputTokens: 8192,

    // Assigned Tools
    tools: [
      // Gmail MCP - Email delivery
      'send_email', // Send email with proposals
      'create_draft', // Create draft for review
      'get_email', // Verify sent email

      // Supabase MCP - Retrieve proposal data
      'supabase_query', // Get client info and proposals
      'supabase_update', // Mark as sent
    ],

    // System Prompt
    systemPrompt: `You are the Communication Manager for Jetvision.

Your responsibilities:
1. Receive top 3 ranked proposals from ProposalAnalysisAgent
2. Retrieve client profile and preferences
3. Generate personalized email:
   - Professional greeting with client name
   - Trip summary (route, dates, passengers)
   - Top 3 flight options with:
     * Aircraft type and operator
     * Price (total and per passenger)
     * Flight time and routing
     * Key amenities
     * AI score and reasoning
   - Empty leg savings highlighted (if applicable)
   - VIP benefits noted (if applicable)
   - Clear call-to-action (reply to book)
   - Professional signature
4. Format email with:
   - Clean HTML formatting
   - Flight cards with images
   - Price comparison table
   - Terms and conditions
5. Send email via Gmail MCP
6. Update workflow state to COMPLETED
7. Log email delivery in Supabase

Key behaviors:
- Personalize based on client history
- Highlight cost savings (empty legs)
- Emphasize VIP status and benefits
- Use professional, warm tone
- Include all relevant flight details
- Provide clear booking instructions
- Attach PDF summary of proposals

Email structure:
- Subject: "Your Charter Flight Options: [Route] - [Date]"
- Greeting: Personalized with client name
- Introduction: Trip summary
- Body: Top 3 options with details
- Conclusion: Next steps and contact info
- Signature: Jetvision team with contact

Output format: Email sent confirmation with message ID.`,

    // Handoff Configuration
    canHandoffTo: [AgentType.ERROR_MONITOR],
  },

  /**
   * 6. ERROR MONITOR AGENT
   *
   * Role: Error handling and recovery
   * Responsibilities:
   * - Monitor for errors across all agents
   * - Implement retry logic
   * - Escalate critical failures
   * - Update workflow state to FAILED if unrecoverable
   * - Log errors to Supabase and Sentry
   */
  [AgentType.ERROR_MONITOR]: {
    name: 'Error Monitor',
    description:
      'Monitors agent execution, handles errors, implements retries, and escalates critical failures',
    model: 'gpt-5-mini', // Lightweight monitoring

    // GPT-5 Configuration
    reasoning: {
      effort: 'minimal', // Structured error handling
    },
    text: {
      verbosity: 'low', // Concise error reports
    },
    maxOutputTokens: 2048,

    // Assigned Tools
    tools: [
      // Supabase MCP - Error logging
      'supabase_insert', // Log errors
      'supabase_update', // Update workflow state
      'supabase_query', // Check retry counts

      // Gmail MCP - Error notifications
      'send_email', // Send error alerts to admins
    ],

    // System Prompt
    systemPrompt: `You are the Error Monitor for Jetvision.

Your responsibilities:
1. Monitor MessageBus for TASK_FAILED and ERROR messages
2. Analyze error context:
   - Error type and message
   - Failed agent and task
   - Retry count
   - Workflow state
3. Implement retry logic:
   - Transient errors (API timeouts): Retry up to 3 times
   - Rate limits: Exponential backoff
   - Invalid data: No retry, escalate
   - External service down: Retry with delay
4. Update workflow state based on error:
   - Recoverable: Keep in progress, retry
   - Unrecoverable: Transition to FAILED
5. Log all errors to Supabase
6. Send alerts for critical failures:
   - Multiple retry failures
   - Data validation errors
   - External service outages
   - Workflow timeouts (>24 hours)

Error handling rules:
- Max retries: 3 per task
- Retry delay: Exponential backoff (1s, 2s, 4s)
- Critical errors: Immediate admin notification
- Log all errors with full context
- Update workflow state appropriately

Escalation criteria:
- 3 failed retries on same task
- Data validation errors
- External service down >1 hour
- Workflow stuck >24 hours
- Security-related errors

Output format: Error report with classification and action taken.`,

    // Handoff Configuration
    canHandoffTo: [], // Terminal agent, no handoffs
  },
} as const;

/**
 * Agent Handoff Rules
 *
 * Defines valid handoff paths between agents based on workflow states.
 * These rules are enforced by the HandoffManager and WorkflowStateMachine.
 */
export const HANDOFF_RULES = {
  /**
   * Orchestrator Agent Handoffs
   */
  [AgentType.ORCHESTRATOR]: {
    // After analyzing RFP
    ANALYZING_COMPLETE: [
      {
        to: AgentType.CLIENT_DATA,
        condition: 'Client name/email provided in RFP',
        reason: 'Fetch client profile and preferences',
        priority: 'high',
      },
      {
        to: AgentType.FLIGHT_SEARCH,
        condition: 'No client name OR after client data fetched',
        reason: 'Search for available flights',
        priority: 'normal',
      },
      {
        to: AgentType.ERROR_MONITOR,
        condition: 'Validation errors or missing required data',
        reason: 'Handle data validation errors',
        priority: 'urgent',
      },
    ],
  },

  /**
   * Client Data Agent Handoffs
   */
  [AgentType.CLIENT_DATA]: {
    // After fetching client profile
    CLIENT_DATA_COMPLETE: [
      {
        to: AgentType.FLIGHT_SEARCH,
        condition: 'Client data retrieved (or not found)',
        reason: 'Proceed with flight search using client preferences',
        priority: 'normal',
      },
      {
        to: AgentType.ERROR_MONITOR,
        condition: 'Google Sheets API errors',
        reason: 'Handle external service errors',
        priority: 'high',
      },
    ],
  },

  /**
   * Flight Search Agent Handoffs
   */
  [AgentType.FLIGHT_SEARCH]: {
    // After creating RFP and receiving quotes
    QUOTES_RECEIVED: [
      {
        to: AgentType.PROPOSAL_ANALYSIS,
        condition: 'Minimum 3 quotes received',
        reason: 'Analyze and rank flight proposals',
        priority: 'normal',
      },
      {
        to: AgentType.ERROR_MONITOR,
        condition: 'Avinode API errors OR no quotes after 24 hours',
        reason: 'Handle search failures or timeout',
        priority: 'high',
      },
    ],
  },

  /**
   * Proposal Analysis Agent Handoffs
   */
  [AgentType.PROPOSAL_ANALYSIS]: {
    // After scoring and ranking proposals
    ANALYSIS_COMPLETE: [
      {
        to: AgentType.COMMUNICATION,
        condition: 'Top 3 proposals selected',
        reason: 'Generate and send email with proposals',
        priority: 'normal',
      },
      {
        to: AgentType.ERROR_MONITOR,
        condition: 'Insufficient quotes to analyze',
        reason: 'Handle insufficient data errors',
        priority: 'high',
      },
    ],
  },

  /**
   * Communication Agent Handoffs
   */
  [AgentType.COMMUNICATION]: {
    // After sending email
    EMAIL_SENT: [
      {
        to: AgentType.ERROR_MONITOR,
        condition: 'Gmail API errors',
        reason: 'Handle email delivery failures',
        priority: 'urgent',
      },
    ],
    // Note: CommunicationAgent typically ends the workflow (COMPLETED state)
  },

  /**
   * Error Monitor Agent Handoffs
   */
  [AgentType.ERROR_MONITOR]: {
    // Error monitor can retry failed tasks by handing back to original agent
    ERROR_RETRY: [
      {
        to: AgentType.CLIENT_DATA,
        condition: 'Recoverable Google Sheets error',
        reason: 'Retry client data fetch',
        priority: 'high',
      },
      {
        to: AgentType.FLIGHT_SEARCH,
        condition: 'Recoverable Avinode error',
        reason: 'Retry flight search',
        priority: 'high',
      },
      {
        to: AgentType.PROPOSAL_ANALYSIS,
        condition: 'Recoverable analysis error',
        reason: 'Retry proposal analysis',
        priority: 'normal',
      },
      {
        to: AgentType.COMMUNICATION,
        condition: 'Recoverable Gmail error',
        reason: 'Retry email sending',
        priority: 'urgent',
      },
    ],
  },
} as const;

/**
 * Workflow State Transitions
 *
 * Maps workflow states to responsible agents.
 * Reference: agents/coordination/state-machine.ts
 */
export const WORKFLOW_STATE_AGENTS = {
  CREATED: AgentType.ORCHESTRATOR,
  ANALYZING: AgentType.ORCHESTRATOR,
  FETCHING_CLIENT_DATA: AgentType.CLIENT_DATA,
  SEARCHING_FLIGHTS: AgentType.FLIGHT_SEARCH,
  AWAITING_QUOTES: AgentType.FLIGHT_SEARCH, // Monitoring state
  ANALYZING_PROPOSALS: AgentType.PROPOSAL_ANALYSIS,
  GENERATING_EMAIL: AgentType.COMMUNICATION,
  SENDING_PROPOSAL: AgentType.COMMUNICATION,
  COMPLETED: null, // Terminal state
  FAILED: AgentType.ERROR_MONITOR,
  CANCELLED: null, // Terminal state
} as const;

/**
 * Tool Access Matrix
 *
 * Complete mapping of which agents can access which MCP tools.
 * Used for validation and security scoping.
 */
export const TOOL_ACCESS_MATRIX = {
  // Avinode MCP Tools
  search_flights: [AgentType.FLIGHT_SEARCH],
  search_empty_legs: [AgentType.FLIGHT_SEARCH],
  create_rfp: [AgentType.FLIGHT_SEARCH],
  get_rfp_status: [AgentType.FLIGHT_SEARCH, AgentType.PROPOSAL_ANALYSIS],
  create_watch: [AgentType.FLIGHT_SEARCH],
  search_airports: [AgentType.FLIGHT_SEARCH],

  // Google Sheets MCP Tools
  list_clients: [AgentType.CLIENT_DATA],
  search_client: [AgentType.CLIENT_DATA],
  get_client_details: [AgentType.CLIENT_DATA],
  read_sheet: [AgentType.CLIENT_DATA],

  // Gmail MCP Tools
  send_email: [AgentType.COMMUNICATION, AgentType.ERROR_MONITOR],
  create_draft: [AgentType.COMMUNICATION],
  get_email: [AgentType.COMMUNICATION],

  // Supabase MCP Tools (shared across agents)
  supabase_query: [
    AgentType.ORCHESTRATOR,
    AgentType.CLIENT_DATA,
    AgentType.FLIGHT_SEARCH,
    AgentType.PROPOSAL_ANALYSIS,
    AgentType.COMMUNICATION,
    AgentType.ERROR_MONITOR,
  ],
  supabase_insert: [
    AgentType.ORCHESTRATOR,
    AgentType.CLIENT_DATA,
    AgentType.FLIGHT_SEARCH,
    AgentType.PROPOSAL_ANALYSIS,
    AgentType.ERROR_MONITOR,
  ],
  supabase_update: [
    AgentType.ORCHESTRATOR,
    AgentType.CLIENT_DATA,
    AgentType.FLIGHT_SEARCH,
    AgentType.PROPOSAL_ANALYSIS,
    AgentType.COMMUNICATION,
    AgentType.ERROR_MONITOR,
  ],
  supabase_delete: [], // No agents should delete data
  supabase_rpc: [AgentType.PROPOSAL_ANALYSIS], // Custom scoring functions
} as const;

/**
 * Workflow Timeout Configuration
 *
 * Maximum time allowed for each workflow state before escalation.
 */
export const WORKFLOW_TIMEOUTS = {
  CREATED: 60000, // 1 minute
  ANALYZING: 120000, // 2 minutes
  FETCHING_CLIENT_DATA: 300000, // 5 minutes (Google Sheets API)
  SEARCHING_FLIGHTS: 600000, // 10 minutes (Avinode search)
  AWAITING_QUOTES: 86400000, // 24 hours (operators respond)
  ANALYZING_PROPOSALS: 300000, // 5 minutes
  GENERATING_EMAIL: 180000, // 3 minutes
  SENDING_PROPOSAL: 120000, // 2 minutes
  COMPLETED: 0, // Terminal
  FAILED: 0, // Terminal
  CANCELLED: 0, // Terminal
} as const;

/**
 * Validate tool access for an agent
 */
export function canAgentAccessTool(agentType: AgentType, toolName: string): boolean {
  const allowedAgents = TOOL_ACCESS_MATRIX[toolName as keyof typeof TOOL_ACCESS_MATRIX];
  return allowedAgents?.includes(agentType) ?? false;
}

/**
 * Get all tools accessible by an agent
 */
export function getAgentTools(agentType: AgentType): string[] {
  return Object.entries(TOOL_ACCESS_MATRIX)
    .filter(([, agents]) => agents.includes(agentType))
    .map(([toolName]) => toolName);
}

/**
 * Get valid handoff targets for an agent
 */
export function getValidHandoffTargets(fromAgent: AgentType, state: string): AgentType[] {
  const rules = HANDOFF_RULES[fromAgent]?.[state as keyof typeof HANDOFF_RULES[typeof fromAgent]];
  if (!rules) return [];

  return rules.map((rule) => rule.to);
}

/**
 * Type Exports
 */
export type AgentConfiguration = (typeof AGENT_CONFIGURATIONS)[keyof typeof AGENT_CONFIGURATIONS];
export type HandoffRule = {
  to: AgentType;
  condition: string;
  reason: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
};
