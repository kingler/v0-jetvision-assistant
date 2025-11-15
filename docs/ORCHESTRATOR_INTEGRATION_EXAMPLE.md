## RFP Flow + OrchestratorAgent Integration Example

Complete example showing how to integrate the RFP conversational flow with the OrchestratorAgent in a chat interface.

### 1. Basic Integration in Chat Component

```typescript
'use client';

import { useState } from 'react';
import { useRFPOrchestrator, getStatusMessage } from '@/hooks/use-rfp-orchestrator';
import { RFPFlowCard } from '@/components/rfp-flow-card';
import { RFPWorkflowStatus } from '@/lib/services/rfp-orchestrator-service';
import type { AgentResult } from '@agents/core/types';

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  // Current user (from auth context)
  const userId = 'user-123';
  const sessionId = 'session-456';

  // Initialize RFP orchestrator
  const orchestrator = useRFPOrchestrator({
    sessionId,
    userId,
    autoStart: false, // Start on trigger phrase
    onWorkflowComplete: (result) => {
      addAgentMessage('✅ Your flight request has been processed! I\'ll send you the proposals shortly.');
      console.log('Workflow complete:', result);
    },
    onWorkflowError: (error) => {
      addAgentMessage(`❌ Error: ${error.message}`);
    },
    onStatusChange: (status) => {
      addAgentMessage(getStatusMessage(status));
    },
  });

  const { rfpFlow, workflowState, isExecuting } = orchestrator;

  // Add agent message
  const addAgentMessage = (content: string) => {
    setMessages(prev => [
      ...prev,
      { role: 'agent', content, timestamp: new Date() }
    ]);
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage, timestamp: new Date() }
    ]);

    // Check if RFP flow is active
    if (rfpFlow.state.isActive) {
      // Process through RFP flow
      const result = rfpFlow.processInput(userMessage);

      if (!result.valid) {
        // Show validation error
        addAgentMessage(`❌ ${result.error}`);

        if (result.suggestions && result.suggestions.length > 0) {
          addAgentMessage(`💡 Suggestions:\n${result.suggestions.join('\n')}`);
        }
        return;
      }

      // Show next question or trigger orchestrator
      if (rfpFlow.state.isComplete) {
        addAgentMessage('✅ Thank you! I have all the information I need.');
        addAgentMessage('🔄 Processing your flight request...');
        // Auto-executes via useEffect in hook
      } else {
        addAgentMessage(rfpFlow.state.currentQuestion);
      }
    } else {
      // Check if user wants to start RFP
      if (shouldStartRFP(userMessage)) {
        orchestrator.startWorkflow();
        addAgentMessage(rfpFlow.state.currentQuestion);
      } else {
        // Handle normal conversation
        addAgentMessage('How can I help you today?');
      }
    }
  };

  return (
    <div className="chat-container">
      {/* Chat Messages */}
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}

        {/* RFP Flow Progress Card */}
        {rfpFlow.state.isActive && (
          <RFPFlowCard
            state={rfpFlow.state}
            onGoBack={rfpFlow.goBack}
            showQuestion={false} // Already shown in messages
          />
        )}

        {/* Workflow Status */}
        {isExecuting && workflowState && (
          <div className="workflow-status">
            <span className="spinner" />
            {getStatusMessage(workflowState.status)}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type your message..."
          disabled={isExecuting}
        />
        <button onClick={handleSendMessage} disabled={isExecuting}>
          Send
        </button>
      </div>
    </div>
  );
}

// Detect trigger phrases for starting RFP
function shouldStartRFP(message: string): boolean {
  const triggers = [
    'new rfp',
    'flight request',
    'book a flight',
    'need a quote',
    'charter flight',
    'private jet',
    'i need to fly',
  ];

  const normalized = message.toLowerCase();
  return triggers.some(trigger => normalized.includes(trigger));
}
```

### 2. Advanced Integration with Status Monitoring

```typescript
'use client';

import { useRFPOrchestrator, useWorkflowStatusMonitor } from '@/hooks/use-rfp-orchestrator';
import { RFPWorkflowStatus } from '@/lib/services/rfp-orchestrator-service';

export function AdvancedChatInterface() {
  const { rfpFlow, workflowState, isExecuting, reset } = useRFPOrchestrator({
    sessionId: 'session-123',
    userId: 'user-456',
    autoStart: true,
    onWorkflowComplete: handleComplete,
    onStatusChange: handleStatusChange,
  });

  // Monitor workflow status (for live updates)
  const liveStatus = useWorkflowStatusMonitor('session-123');

  function handleStatusChange(status: RFPWorkflowStatus) {
    switch (status) {
      case RFPWorkflowStatus.SEARCHING:
        showNotification('🔍 Searching for available flights...');
        break;

      case RFPWorkflowStatus.AWAITING_QUOTES:
        showNotification('⏳ Waiting for operator quotes...');
        break;

      case RFPWorkflowStatus.ANALYZING:
        showNotification('📊 Analyzing proposals...');
        break;

      case RFPWorkflowStatus.COMPLETE:
        showNotification('✅ Proposal ready!');
        playSuccessSound();
        break;
    }
  }

  function handleComplete(result: AgentResult) {
    // Display results
    if (result.metadata?.proposalUrl) {
      window.open(result.metadata.proposalUrl, '_blank');
    }

    // Reset for next request
    setTimeout(() => {
      reset();
    }, 5000);
  }

  return (
    <div>
      {/* Progress Timeline */}
      <WorkflowTimeline status={liveStatus?.status} />

      {/* RFP Flow */}
      {rfpFlow.state.isActive && (
        <RFPFlowCard state={rfpFlow.state} onGoBack={rfpFlow.goBack} />
      )}

      {/* Results */}
      {workflowState?.status === RFPWorkflowStatus.COMPLETE && (
        <ProposalResults result={workflowState.agentResult} />
      )}
    </div>
  );
}
```

### 3. Workflow Status Timeline Component

```typescript
import { RFPWorkflowStatus } from '@/lib/services/rfp-orchestrator-service';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface WorkflowTimelineProps {
  status?: RFPWorkflowStatus;
}

export function WorkflowTimeline({ status }: WorkflowTimelineProps) {
  const steps = [
    { key: RFPWorkflowStatus.COLLECTING, label: 'Collecting Info' },
    { key: RFPWorkflowStatus.VALIDATING, label: 'Validating' },
    { key: RFPWorkflowStatus.PROCESSING, label: 'Processing' },
    { key: RFPWorkflowStatus.SEARCHING, label: 'Searching Flights' },
    { key: RFPWorkflowStatus.AWAITING_QUOTES, label: 'Awaiting Quotes' },
    { key: RFPWorkflowStatus.ANALYZING, label: 'Analyzing' },
    { key: RFPWorkflowStatus.GENERATING, label: 'Generating Email' },
    { key: RFPWorkflowStatus.COMPLETE, label: 'Complete' },
  ];

  const currentIndex = steps.findIndex(s => s.key === status);

  return (
    <div className="workflow-timeline">
      {steps.map((step, index) => {
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFailed = status === RFPWorkflowStatus.FAILED && isCurrent;

        return (
          <div key={step.key} className={`timeline-step ${isPast ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}>
            <div className="timeline-icon">
              {isFailed ? (
                <XCircle className="text-red-500" />
              ) : isPast ? (
                <CheckCircle className="text-green-500" />
              ) : isCurrent ? (
                <Clock className="text-blue-500 animate-pulse" />
              ) : (
                <div className="timeline-dot" />
              )}
            </div>
            <div className="timeline-label">{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}
```

### 4. Testing the Integration

```typescript
// __tests__/integration/rfp-orchestrator.test.tsx

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRFPOrchestrator } from '@/hooks/use-rfp-orchestrator';
import { RFPWorkflowStatus } from '@/lib/services/rfp-orchestrator-service';

describe('RFP Orchestrator Integration', () => {
  it('should complete full workflow', async () => {
    const onComplete = vi.fn();
    const onStatusChange = vi.fn();

    const { result } = renderHook(() =>
      useRFPOrchestrator({
        sessionId: 'test-session',
        userId: 'test-user',
        onWorkflowComplete: onComplete,
        onStatusChange,
      })
    );

    // Start workflow
    act(() => {
      result.current.startWorkflow();
    });

    expect(result.current.rfpFlow.state.isActive).toBe(true);

    // Step through RFP flow
    act(() => {
      result.current.rfpFlow.processInput('JFK to LAX');
      result.current.rfpFlow.processInput('Tomorrow');
      result.current.rfpFlow.processInput('5 passengers');
      result.current.rfpFlow.processInput('skip');
      result.current.rfpFlow.processInput('Budget $50,000');
    });

    // Should be complete
    expect(result.current.rfpFlow.state.isComplete).toBe(true);

    // Wait for orchestrator execution
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });

    // Check status transitions
    expect(onStatusChange).toHaveBeenCalledWith(RFPWorkflowStatus.VALIDATING);
    expect(onStatusChange).toHaveBeenCalledWith(RFPWorkflowStatus.PROCESSING);
  });

  it('should handle validation errors', async () => {
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useRFPOrchestrator({
        sessionId: 'test-session',
        userId: 'test-user',
        onWorkflowError: onError,
      })
    );

    act(() => {
      result.current.startWorkflow();
    });

    // Invalid input (missing arrival)
    act(() => {
      const processResult = result.current.rfpFlow.processInput('Just New York');
      expect(processResult.valid).toBe(false);
    });

    // Should still be on route step
    expect(result.current.rfpFlow.state.flow.getCurrentStep()).toBe('route');
  });
});
```

### 5. Error Handling

```typescript
function ChatWithErrorHandling() {
  const orchestrator = useRFPOrchestrator({
    sessionId: 'session-123',
    userId: 'user-456',
    onWorkflowError: (error) => {
      // Log error
      console.error('Workflow error:', error);

      // Show user-friendly message
      if (error.message.includes('Missing required fields')) {
        showError('Please provide all required information');
      } else if (error.message.includes('network')) {
        showError('Network error. Please try again.');
      } else {
        showError('An unexpected error occurred. Please contact support.');
      }

      // Reset workflow
      setTimeout(() => {
        orchestrator.reset();
      }, 3000);
    },
  });

  // Display error if exists
  if (orchestrator.error) {
    return (
      <div className="error-banner">
        <AlertTriangle className="text-red-500" />
        {orchestrator.error.message}
        <button onClick={orchestrator.reset}>Start Over</button>
      </div>
    );
  }

  return <ChatInterface orchestrator={orchestrator} />;
}
```

### 6. Summary

**Key Integration Points:**

1. **useRFPOrchestrator Hook**: Combines RFP flow with orchestrator execution
2. **Auto-execution**: Automatically triggers orchestrator when RFP is complete
3. **Status Monitoring**: Real-time workflow status updates
4. **Error Handling**: Comprehensive error handling at each stage
5. **Session Persistence**: Maintains state across page refreshes
6. **Workflow Callbacks**: onComplete, onError, onStatusChange for custom handling

**Workflow Sequence:**

1. User triggers RFP flow ("I need a flight")
2. Conversational data gathering (5 steps)
3. Auto-validation of collected data
4. OrchestratorAgent execution
5. Multi-agent workflow (ClientData → FlightSearch → ProposalAnalysis → Communication)
6. Status updates at each stage
7. Completion callback with results

**Benefits:**

- ✅ Seamless integration between UI and agent system
- ✅ Type-safe data flow
- ✅ Real-time status updates
- ✅ Comprehensive error handling
- ✅ Session persistence
- ✅ Easy to test
- ✅ Extensible for additional workflows
