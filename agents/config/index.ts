/**
 * Agent Configuration Module
 *
 * Barrel exports for agent configuration, prompts, and templates.
 *
 * @see ONEK-143 - Enhance Agent System Prompts with Chat Messaging & Booking Tools
 */

// System prompts
export {
  AGENT_SYSTEM_PROMPTS,
  FLIGHT_SEARCH_PROMPT,
  COMMUNICATION_PROMPT,
  ORCHESTRATOR_PROMPT,
  PROPOSAL_ANALYSIS_PROMPT,
  CLIENT_DATA_PROMPT,
  ERROR_MONITOR_PROMPT,
  getSystemPrompt,
  hasSystemPrompt,
} from './system-prompts';

// Prompt builder
export {
  buildPrompt,
  buildFlightSearchPrompt,
  buildCommunicationPrompt,
  buildOrchestratorPrompt,
  appendContextSection,
  composeModifiers,
  contextModifier,
  attentionModifier,
  noteModifier,
} from './prompt-builder';

export type {
  FlightSearchContext,
  CommunicationContext,
  OrchestratorContext,
  PromptContext,
  PromptModifier,
} from './prompt-builder';

// Prompt templates
export {
  RESPONSE_FORMATS,
  TOOL_GUIDELINES,
  WORKFLOW_TEMPLATES,
  ERROR_HANDLING,
  SECURITY_TEMPLATES,
  TONE_TEMPLATES,
  PROMPT_SECTIONS,
  composeTemplates,
  createSection,
  createNumberedList,
  createBulletList,
  createToolDoc,
  createWorkflowStep,
} from './prompt-templates';
