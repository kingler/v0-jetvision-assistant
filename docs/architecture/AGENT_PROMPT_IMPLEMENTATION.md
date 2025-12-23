# Agent LLM Prompt Implementation Guide

## Overview

This document explains how agents in the JetVision system use LLM prompts to perform their specialized tasks. The system implements a multi-agent architecture where each agent uses carefully crafted prompts to interact with OpenAI's models.

## Architecture

### Core Components

1. **BaseAgent** (`agents/core/base-agent.ts`) - Abstract foundation for all agents
2. **Agent Tools** (`agents/tools/`) - Specialized tools with their own prompts
3. **Agent Implementations** (`agents/implementations/`) - Specific agent types
4. **Chat API** (`app/api/chat/`) - Integration layer with user-facing prompts

## Prompt Architecture Layers

### Layer 1: BaseAgent System Prompts

All agents inherit from `BaseAgent`, which provides a default system prompt that can be overridden:

```typescript:agents/core/base-agent.ts
protected getSystemPrompt(): string {
  return (
    this.config.systemPrompt ||
    `You are ${this.name}, a specialized AI agent for the JetVision system.`
  )
}
```

**Key Features:**
- Customizable via `AgentConfig.systemPrompt`
- Override in subclasses for agent-specific prompts
- Used in all chat completion requests

### Layer 2: Agent-Specific Prompts

Each agent implementation can override `getSystemPrompt()` to provide specialized instructions:

**Example - OrchestratorAgent:**
- Handles conversational RFP creation
- Uses intent parsing and data extraction tools
- Coordinates multi-agent workflow

### Layer 3: Tool-Specific Prompts

Specialized tools like `DataExtractor`, `IntentParser`, and `QuestionGenerator` have their own detailed prompts:

**Example - DataExtractor:**
```typescript:agents/tools/data-extractor.ts
private buildSystemPrompt(): string {
  return `You are a data extraction expert for a private jet charter booking system.
  
Your task is to extract structured flight request data from natural language messages.

Fields to extract:
1. **departure**: Airport code (e.g., KTEB, LAX) or city name
2. **arrival**: Airport code or city name
3. **departureDate**: ISO 8601 date (YYYY-MM-DD)
...`
}
```

## Prompt Execution Flow

### 1. Agent Initialization

When an agent is created, it loads LLM configuration:

```typescript:agents/core/base-agent.ts
async initialize(): Promise<void> {
  // Load LLM configuration from database (admin-configured) with fallback to env vars
  try {
    const { getOpenAIClient } = await import('@/lib/config/llm-config')
    this.openai = await getOpenAIClient()
    console.log(`[${this.name}] Using database-configured LLM settings`)
  } catch (error) {
    // Fallback to environment variable
  }
  
  this._status = AgentStatus.IDLE
}
```

### 2. Prompt Execution Methods

BaseAgent provides two main methods for prompt execution:

#### Method A: `createResponse()` - For GPT-5 (Recommended)

Uses OpenAI's Responses API for GPT-5 models:

```typescript:agents/core/base-agent.ts
protected async createResponse(
  input: string,
  context?: AgentContext
): Promise<any> {
  const model = this.config.model || 'gpt-5'
  const isGPT5 = model.startsWith('gpt-5')

  if (isGPT5) {
    // Use Responses API
    const requestParams = {
      model,
      input,  // Direct input prompt
      reasoning: { effort: 'medium' },
      text: { verbosity: 'medium' },
      max_output_tokens: 4096,
      tools: this.getToolDefinitions(),
    }
    response = await this.openai.responses.create(requestParams)
  } else {
    // Fallback to Chat Completions
    // ...
  }
}
```

#### Method B: `createChatCompletionLegacy()` - For GPT-4 and earlier

Uses traditional chat completions with system/user message structure:

```typescript:agents/core/base-agent.ts
protected async createChatCompletionLegacy(
  messages: AgentMessage[],
  context?: AgentContext
): Promise<OpenAI.Chat.ChatCompletion> {
  const response = await this.openai.chat.completions.create({
    model: this.config.model || 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: this.getSystemPrompt(),  // Agent's system prompt
      },
      {
        role: 'user',
        content: input,  // User input or task description
      },
    ],
    tools: this.getToolDefinitions(),
    temperature: this.config.temperature ?? 0.7,
    max_tokens: this.config.maxTokens ?? 4096,
  })
}
```

## Agent Implementation Examples

### 1. OrchestratorAgent - Conversational RFP Creation

The OrchestratorAgent uses a conversational approach with multiple prompt-based tools:

**Flow:**
1. User sends message → `handleConversation()`
2. Parse intent → `IntentParser.parseIntent()` (uses LLM prompt)
3. Extract data → `DataExtractor.extractData()` (uses LLM prompt)
4. Generate questions → `QuestionGenerator.generateQuestion()` (uses LLM prompt)
5. Create RFP → Delegate to downstream agents

**Example Usage:**
```typescript:agents/implementations/orchestrator-agent.ts
// Extract data from user message
const extractionResult = await this.dataExtractor.extractData(
  userMessage,
  conversationState.extractedData,
  conversationState.conversationHistory
)
```

### 2. DataExtractor Tool - Structured Data Extraction

Uses a detailed system prompt to extract structured JSON data:

**System Prompt Structure:**
```
You are a data extraction expert for a private jet charter booking system.

Fields to extract:
1. departure: Airport code or city name
2. arrival: Airport code or city name
3. departureDate: ISO 8601 date (YYYY-MM-DD)
...

Respond in JSON format:
{
  "data": { ... },
  "confidence": 0.0-1.0,
  "fields_extracted": [...],
  "ambiguities": [...]
}
```

**User Prompt Construction:**
```typescript:agents/tools/data-extractor.ts
private buildUserPrompt(
  userMessage: string,
  existingData?: ExtractedRFPData,
  conversationHistory?: Array<{ role: string; content: string }>
): string {
  let prompt = '';

  // Include previously extracted data
  if (existingData && Object.keys(existingData).length > 0) {
    prompt += 'Previously extracted data:\n';
    prompt += JSON.stringify(existingData, null, 2);
    prompt += '\n\n';
  }

  // Include conversation context
  if (conversationHistory && conversationHistory.length > 0) {
    prompt += 'Recent conversation:\n';
    conversationHistory.slice(-3).forEach((msg) => {
      prompt += `${msg.role}: ${msg.content}\n`;
    });
  }

  prompt += `User's current message: "${userMessage}"\n\n`;
  prompt += 'Extract all flight request data from this message.';

  return prompt;
}
```

### 3. Chat API Integration - User-Facing Prompts

The chat API uses a comprehensive system prompt that defines the assistant's role and capabilities:

```typescript:app/api/chat/route.ts
const SYSTEM_PROMPT = `You are the JetVision AI Assistant, a professional private jet charter concierge.

CRITICAL WORKFLOW: When a user provides flight details, you MUST:
1. Call create_trip to create a trip container and get the deep link
2. Present the deep link prominently so the user can access Avinode marketplace
3. The deep link is ESSENTIAL - it's how users select flights and get quotes

Tool Usage Rules:
- Flight request with airports + date + passengers → Call create_trip
- User provides a Trip ID → Call get_rfq to retrieve quotes
...

Communication style:
- Professional yet warm and personable
- Clear and concise, avoiding jargon
- ALWAYS present the deep link prominently
`
```

**Intent-Based Prompt Enhancement:**
```typescript:app/api/chat/respond/route.ts
function buildSystemPrompt(intent?: string): string {
  const basePrompt = `You are Jetvision AI Assistant, a helpful agent for booking private jet flights.
  
Your capabilities:
- Create and manage RFPs (Request for Proposals)
- Search for available flights and aircraft
- Analyze and compare quotes from operators
...`

  const intentPrompts: Record<string, string> = {
    create_rfp: `\n\nCurrent task: Create a new RFP. Extract flight details...`,
    get_rfp_status: `\n\nCurrent task: Provide status update on an existing RFP...`,
    search_flights: `\n\nCurrent task: Search for available flights...`,
    get_quotes: `\n\nCurrent task: Analyze and compare quotes...`,
  }

  return basePrompt + (intent && intentPrompts[intent] ? intentPrompts[intent] : '')
}
```

## Tool Calling Integration

Agents use function calling to execute tools defined in their prompts:

### Tool Definition Structure

```typescript:agents/core/base-agent.ts
protected getToolDefinitions(): OpenAI.Chat.ChatCompletionTool[] {
  return Array.from(this.tools.values()).map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,  // Natural language description for LLM
      parameters: tool.parameters,    // JSON Schema
    },
  }))
}
```

### Tool Execution Flow

1. **LLM receives prompt** with tool definitions
2. **LLM decides** which tool to call based on user input
3. **Agent executes** the tool via `executeTool()`
4. **Tool result** is returned to LLM as context
5. **LLM generates** final response with tool results

**Example Tool Call:**
```typescript:agents/core/base-agent.ts
protected async executeTool(
  toolName: string,
  parameters: Record<string, unknown>
): Promise<unknown> {
  const tool = this.tools.get(toolName)
  if (!tool) {
    throw new Error(`Tool not found: ${toolName}`)
  }

  console.log(`[${this.name}] Executing tool: ${toolName}`)
  return await tool.handler(parameters)
}
```

## Prompt Configuration

### Model Selection

Prompts are executed using the configured model:

1. **Database Configuration** (admin-configured, preferred)
   - Loaded via `lib/config/llm-config.ts`
   - Supports multiple providers (OpenAI, Anthropic, etc.)
   - Encrypted API key storage

2. **Environment Variables** (fallback)
   - `OPENAI_API_KEY`
   - `OPENAI_DEFAULT_MODEL` (default: `gpt-4`)
   - `OPENAI_TEMPERATURE` (default: `0.7`)

3. **Agent Config** (per-agent override)
   ```typescript
   {
     model: 'gpt-4-turbo',
     temperature: 0.7,
     maxTokens: 8192,
     systemPrompt: 'Custom system prompt...',
   }
   ```

### Temperature and Parameters

Different tools use different temperature settings for optimal results:

- **DataExtractor**: `temperature: 0.2` (low, for accuracy)
- **IntentParser**: `temperature: 0.3` (low-medium, for consistency)
- **QuestionGenerator**: `temperature: 0.7` (medium, for natural language)
- **Chat API**: `temperature: 0.7` (medium, for conversational)

## Prompt Best Practices

### 1. Clear Role Definition
Always start with a clear role definition:
```
You are [role], a [specialization] for [system/purpose].
```

### 2. Structured Instructions
Use numbered lists and clear sections:
```
Your task is to [primary task].

Fields to extract:
1. **field1**: Description with examples
2. **field2**: Description with examples
```

### 3. Output Format Specification
For structured outputs, specify JSON schema:
```
Respond in JSON format:
{
  "field1": "type or null",
  "field2": number or null,
  ...
}
```

### 4. Context Inclusion
Include relevant context in prompts:
- Current date/time
- Previous conversation history
- Existing data to merge with
- Available tools and their purposes

### 5. Error Handling
Specify how to handle ambiguities:
```
Rules:
- Only include fields that are explicitly mentioned
- Use null for missing fields
- Flag ambiguous data in "ambiguities" array
```

## Prompt Template Examples

### Conversational Agent Prompt
```typescript
const systemPrompt = `You are ${agentName}, a specialized AI agent.

Your capabilities:
- Capability 1: Description
- Capability 2: Description

When handling requests:
1. First, [step 1]
2. Then, [step 2]
3. Finally, [step 3]

Communication style:
- Professional yet friendly
- Clear and concise
- Always provide actionable next steps
`
```

### Data Extraction Prompt
```typescript
const extractionPrompt = `You are a data extraction expert.

Extract the following fields from the user's message:

Required fields:
- field1: Description (format: example)
- field2: Description (format: example)

Optional fields:
- field3: Description

Rules:
- Normalize dates to ISO 8601 (YYYY-MM-DD)
- Normalize airport codes to ICAO format (4 letters)
- Use null for missing fields

Current date: ${new Date().toISOString().split('T')[0]}

Respond with JSON:
{
  "data": { ... },
  "confidence": 0.0-1.0,
  "fields_extracted": [...]
}
`
```

### Tool-Assisted Prompt
```typescript
const toolPrompt = `You are an assistant with access to the following tools:

Available tools:
- tool1: Description of what it does and when to use it
- tool2: Description of what it does and when to use it

Workflow:
1. Analyze the user's request
2. Determine which tool(s) to use
3. Call the tool(s) with appropriate parameters
4. Present the results clearly

When to use each tool:
- tool1: Use when [condition]
- tool2: Use when [condition]
`
```

## Testing and Debugging

### Logging Prompts

To debug prompt issues, enable logging:

```typescript
console.log('[Agent] System Prompt:', this.getSystemPrompt())
console.log('[Agent] User Input:', input)
console.log('[Agent] Full Messages:', messages)
```

### Validating Prompt Structure

Ensure prompts follow these guidelines:
- ✅ Clear role definition
- ✅ Specific task instructions
- ✅ Output format specification
- ✅ Context inclusion
- ✅ Error handling rules

## Performance Considerations

### Caching

- Prompts are constructed dynamically but don't need caching
- LLM responses can be cached for repeated queries
- Configuration is cached for 5 minutes (see `lib/config/llm-config.ts`)

### Token Management

- System prompts should be concise but complete
- Include only relevant conversation history (last 3-5 messages)
- Use tool calling to reduce prompt size

### Parallel Execution

- Multiple agents can execute prompts in parallel
- Tool calls are executed sequentially (as required by OpenAI API)
- Consider batching related operations

## Related Documentation

- [Multi-Agent System Architecture](../architecture/MULTI_AGENT_SYSTEM.md)
- [Agent Creation Guidelines](../AGENTS.md)
- [LLM Configuration Admin Guide](../admin/LLM_CONFIG_ADMIN_GUIDE.md)
- [BaseAgent API Reference](../agents/core/base-agent.ts)

