// ---------------------------------------------------------------------------
// Self-Improving Agent -- Implicit Signal Capture
// ---------------------------------------------------------------------------
// Pure-logic signal detection layer.  No database or I/O dependencies.
// Persistence is handled separately by the signal-persistence service.
// ---------------------------------------------------------------------------

import { CORRECTION_PATTERNS } from './constants';
import type { AgentSignal, SignalType } from './types';

/** Ordered workflow stages for regression detection. */
const STAGE_ORDER = [
  'trip_created',
  'quotes_received',
  'proposal_ready',
  'proposal_sent',
  'contract_generated',
  'contract_sent',
  'payment_received',
  'closed_won',
  'deal_closed',
];

// ---- Local helper interfaces ------------------------------------------------

interface MessageForSignal {
  role: string;
  content: string;
  id?: string;
}

interface ToolResultForSignal {
  name: string;
  success: boolean;
  input?: Record<string, unknown>;
}

// ---- Public API -------------------------------------------------------------

/**
 * Detect correction signals from user messages.
 * Scans for patterns like "No, I meant...", "That's wrong", etc.
 */
export function detectCorrectionSignals(
  messages: MessageForSignal[],
  conversationId: string,
): AgentSignal[] {
  const signals: AgentSignal[] = [];

  for (let i = 1; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role !== 'user') continue;

    const isCorrection = CORRECTION_PATTERNS.some((pattern) =>
      pattern.test(msg.content),
    );

    if (isCorrection) {
      signals.push({
        conversation_id: conversationId,
        message_id: msg.id,
        signal_type: 'correction',
        signal_strength: computeSignalStrength('correction'),
        metadata: {
          user_message: msg.content.slice(0, 200),
          previous_assistant_message: messages[i - 1]?.content?.slice(0, 200),
        },
      });
    }
  }

  return signals;
}

/**
 * Detect tool retry signals -- same tool called twice with different params
 * within a single turn.
 */
export function detectToolRetrySignals(
  toolResults: ToolResultForSignal[],
  conversationId: string,
): AgentSignal[] {
  const signals: AgentSignal[] = [];
  const toolCalls = new Map<string, Record<string, unknown>>();

  for (const tr of toolResults) {
    const prevInput = toolCalls.get(tr.name);
    if (prevInput) {
      const inputChanged =
        JSON.stringify(prevInput) !== JSON.stringify(tr.input);
      if (inputChanged) {
        signals.push({
          conversation_id: conversationId,
          signal_type: 'tool_retry',
          signal_strength: computeSignalStrength('tool_retry'),
          metadata: {
            tool_name: tr.name,
            first_input: prevInput,
            second_input: tr.input,
          },
        });
      }
    }
    toolCalls.set(tr.name, tr.input || {});
  }

  return signals;
}

/**
 * Detect workflow stage backtracking (regression).
 * Returns a signal if `previousStage` is further along than `currentStage`.
 */
export function detectWorkflowBacktrack(
  previousStage: string | undefined,
  currentStage: string | undefined,
  conversationId: string,
): AgentSignal | null {
  if (!previousStage || !currentStage) return null;

  const prevIdx = STAGE_ORDER.indexOf(previousStage);
  const currIdx = STAGE_ORDER.indexOf(currentStage);

  if (prevIdx === -1 || currIdx === -1) return null;
  if (currIdx >= prevIdx) return null; // forward or same = ok

  return {
    conversation_id: conversationId,
    signal_type: 'backtrack',
    signal_strength: computeSignalStrength('backtrack'),
    metadata: {
      from_stage: previousStage,
      to_stage: currentStage,
      stages_regressed: prevIdx - currIdx,
    },
  };
}

/**
 * Compute default signal strength for a given signal type.
 * Negative values indicate problems; positive values indicate success.
 */
export function computeSignalStrength(signalType: SignalType): number {
  switch (signalType) {
    case 'correction':
      return -0.7;
    case 'backtrack':
      return -0.8;
    case 'drop_off':
      return -0.5;
    case 'tool_retry':
      return -0.4;
    case 'slow_progression':
      return -0.3;
    case 'deal_closed':
      return 1.0;
    default:
      return 0;
  }
}
