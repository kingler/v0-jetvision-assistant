/**
 * RFP Conversational Flow API
 *
 * Handles conversational RFP data gathering using the RFPFlow state machine.
 * Provides progressive disclosure with contextual questions and validation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { RFPFlow } from '@/lib/conversation';
import type { RFPData } from '@/lib/conversation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ProcessRequest {
  sessionId: string;
  userMessage: string;
  flowState?: string; // Serialized RFPFlow state
}

interface ProcessResponse {
  success: boolean;
  message: string;
  question?: string;
  suggestions?: string[];
  isComplete: boolean;
  rfpData?: RFPData;
  missingFields?: string[];
  completedFields?: string[];
  flowState: string; // Serialized state for next request
  error?: string;
}

/**
 * POST /api/rfp/process
 * Process user input in conversational RFP flow
 */
export async function POST(request: NextRequest): Promise<NextResponse<ProcessResponse>> {
  try {
    const body: ProcessRequest = await request.json();
    const { sessionId, userMessage, flowState } = body;

    // Validate required fields
    if (!sessionId || !userMessage) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: sessionId and userMessage',
          isComplete: false,
          flowState: flowState || '',
          error: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    // Restore or create RFP flow
    let flow: RFPFlow;
    if (flowState) {
      try {
        flow = RFPFlow.deserialize(flowState);
      } catch (error) {
        // If deserialization fails, start fresh
        console.warn(`Failed to deserialize flow state for session ${sessionId}:`, error);
        flow = new RFPFlow();
      }
    } else {
      flow = new RFPFlow();
    }

    // Process user input
    const result = flow.processInput(userMessage);

    // If validation failed, return error with suggestions
    if (!result.valid) {
      return NextResponse.json({
        success: false,
        message: result.error || 'Invalid input',
        suggestions: result.suggestions,
        isComplete: false,
        flowState: flow.serialize(),
        error: 'VALIDATION_ERROR',
      });
    }

    // Check if RFP is complete
    const isComplete = flow.isComplete();
    const rfpData = flow.getData();
    const missingFields = flow.getMissingFields();
    const completedFields = flow.getCompletedFields();

    // If complete, return full RFP data
    if (isComplete) {
      return NextResponse.json({
        success: true,
        message: 'RFP data collection complete! We have all the information needed.',
        isComplete: true,
        rfpData: flow.exportRFPData(),
        completedFields,
        flowState: flow.serialize(),
      });
    }

    // Get next question
    const question = flow.getCurrentQuestion();

    return NextResponse.json({
      success: true,
      message: 'Input processed successfully',
      question,
      isComplete: false,
      rfpData,
      missingFields,
      completedFields,
      flowState: flow.serialize(),
    });
  } catch (error) {
    console.error('Error processing RFP flow:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        isComplete: false,
        flowState: '',
        error: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rfp/process
 * Get initial greeting and first question
 */
export async function GET(): Promise<NextResponse<ProcessResponse>> {
  const flow = new RFPFlow();

  return NextResponse.json({
    success: true,
    message: 'Welcome! Let\'s gather the details for your flight request.',
    question: flow.getCurrentQuestion(),
    isComplete: false,
    missingFields: flow.getMissingFields(),
    completedFields: flow.getCompletedFields(),
    flowState: flow.serialize(),
  });
}
