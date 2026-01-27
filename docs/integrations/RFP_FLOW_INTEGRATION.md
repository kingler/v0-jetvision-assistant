# RFP Flow Integration Guide

This guide explains how to integrate the conversational RFP flow into the chat interface and connect it with the OrchestratorAgent.

## Components

### 1. Hook: `useRFPFlow`

Located in `hooks/use-rfq-flow.ts`

Manages RFP flow state and provides methods for interaction:

```typescript
import { useRFPFlow, useRFPFlowPersistence } from '@/hooks/use-rfq-flow';

function MyComponent() {
  const rfpFlow = useRFPFlow(autoActivate);

  // Persist to session storage
  useRFPFlowPersistence('session-id', rfpFlow);

  // Access state
  const { state, processInput, goBack, reset } = rfpFlow;

  // Process user input
  const result = processInput('JFK to LAX');
  if (!result.valid) {
    console.log(result.error, result.suggestions);
  }

  // Navigate
  goBack(); // Go to previous step
  reset();  // Start over

  // Export data when complete
  if (state.isComplete) {
    const rfpData = rfpFlow.exportData();
    // Send to OrchestratorAgent
  }
}
```

### 2. UI Component: `RFPFlowCard`

Located in `components/rfq-flow-card.tsx`

Displays RFP gathering progress and contextual questions:

```typescript
import { RFPFlowCard } from '@/components/rfq-flow-card';

<RFPFlowCard
  state={rfpFlow.state}
  onGoBack={rfpFlow.goBack}
  showQuestion={true}
  className="my-4"
/>
```

Features:
- Progress bar showing completion percentage
- Step indicators (route, date, passengers, aircraft, budget)
- Current contextual question display
- Collected data summary
- Missing required fields warning
- "Back" button for navigation

## Integration Steps

### Step 1: Add RFP Flow to Chat Interface

```typescript
// components/chat-interface.tsx

import { useRFPFlow, useRFPFlowPersistence } from '@/hooks/use-rfq-flow';
import { RFPFlowCard } from '@/components/rfq-flow-card';

export function ChatInterface({ activeChat, ... }: ChatInterfaceProps) {
  // Initialize RFP flow
  const rfpFlow = useRFPFlow(false); // Start inactive
  useRFPFlowPersistence(activeChat.id, rfpFlow);

  const handleSendMessage = async () => {
    const userMessage = inputValue.trim();

    // Check if RFP flow is active
    if (rfpFlow.state.isActive) {
      // Process through RFP flow
      const result = rfpFlow.processInput(userMessage);

      if (!result.valid) {
        // Show error and suggestions
        addAgentMessage(result.error, { suggestions: result.suggestions });
        return;
      }

      // Show next question or completion
      if (rfpFlow.state.isComplete) {
        // Export data and hand off to OrchestratorAgent
        const rfpData = rfpFlow.exportData();
        await sendToOrchestrator(rfpData);
        rfpFlow.deactivate();
      } else {
        // Show next question
        addAgentMessage(rfpFlow.state.currentQuestion);
      }
    } else {
      // Normal message handling or activate RFP flow
      if (shouldActivateRFP(userMessage)) {
        rfpFlow.activate();
        addAgentMessage(rfpFlow.state.currentQuestion);
      } else {
        // Process normally
      }
    }
  };

  return (
    <div>
      {/* Existing chat UI */}

      {/* Add RFP Flow Card */}
      {rfpFlow.state.isActive && (
        <RFPFlowCard
          state={rfpFlow.state}
          onGoBack={rfpFlow.goBack}
        />
      )}
    </div>
  );
}
```

### Step 2: Detect When to Activate RFP Flow

```typescript
function shouldActivateRFP(message: string): boolean {
  const triggers = [
    'new rfp',
    'flight request',
    'book a flight',
    'need a quote',
    'charter flight',
    'private jet',
  ];

  const normalized = message.toLowerCase();
  return triggers.some(trigger => normalized.includes(trigger));
}
```

### Step 3: Integration with OrchestratorAgent

When RFP flow completes, send data to OrchestratorAgent:

```typescript
async function sendToOrchestrator(rfpData: RFPData) {
  // Create agent context
  const context = {
    sessionId: activeChat.id,
    requestId: `rfp-${Date.now()}`,
    userId: currentUser.id,
    rfpData, // Include RFP data
  };

  // Execute orchestrator agent
  const orchestrator = await agentFactory.createAndInitialize({
    type: AgentType.ORCHESTRATOR,
    name: 'RFP Orchestrator',
  });

  const result = await orchestrator.execute(context);

  // Result will trigger workflow:
  // 1. ClientDataAgent - Fetch client profile
  // 2. FlightSearchAgent - Search flights via Avinode
  // 3. ProposalAnalysisAgent - Score and rank quotes
  // 4. CommunicationAgent - Generate and send email
}
```

### Step 4: Message Component Integration

Create a message component for RFP questions:

```typescript
// components/message-components/rfp-question.tsx

export function RFPQuestionMessage({ question, step, onGoBack }: Props) {
  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline">Step {step}/5</Badge>
        {step > 1 && (
          <Button variant="ghost" size="sm" onClick={onGoBack}>
            <ArrowLeft className="w-3 h-3 mr-1" />
            Back
          </Button>
        )}
      </div>
      <p className="text-sm text-blue-700 font-medium">{question}</p>
    </div>
  );
}
```

### Step 5: Error Handling and Validation

Display validation errors with suggestions:

```typescript
if (!result.valid) {
  const errorMessage = {
    type: 'agent',
    content: result.error,
    timestamp: new Date(),
    showSuggestions: true,
    suggestions: result.suggestions,
  };

  // Add to chat messages
  addMessage(errorMessage);
}
```

## Example Flow

1. **User**: "I need to book a private jet"
2. **Agent**: (Activates RFP flow) "Where would you like to fly? Please provide the departure and arrival cities or airport codes."
3. **User**: "From New York to Los Angeles"
4. **Agent**: "Great! Flying from New York to Los Angeles. When would you like to depart? Include a return date if this is a round trip."
5. **User**: "Tomorrow, returning in 3 days"
6. **Agent**: "Perfect. How many passengers will be traveling?"
7. **User**: "5 passengers"
8. **Agent**: "Got it, 5 passengers. Do you have a preference for aircraft type? (e.g., light jet, midsize, heavy jet) You can skip this if you'd like."
9. **User**: "skip"
10. **Agent**: "Almost done! Do you have a budget in mind or any special requirements? (Optional, you can skip)"
11. **User**: "Budget around $50,000, need WiFi"
12. **Agent**: "Thank you! I have all the information I need. Let me search for available flights..." (Hands off to OrchestratorAgent)

## Testing Integration

```typescript
// __tests__/integration/chat-rfq-flow.test.tsx

describe('Chat RFP Flow Integration', () => {
  it('should activate RFP flow on trigger phrase', () => {
    const { getByText, getByPlaceholderText } = render(<ChatInterface />);

    const input = getByPlaceholderText('Message...');
    fireEvent.change(input, { target: { value: 'I need a flight quote' } });
    fireEvent.click(getByText('Send'));

    expect(getByText(/Where would you like to fly/)).toBeInTheDocument();
  });

  it('should complete full RFP flow and hand off to orchestrator', async () => {
    const mockOrchestrator = vi.fn();
    const { getByPlaceholderText, getByText } = render(
      <ChatInterface onOrchestratorHandoff={mockOrchestrator} />
    );

    const input = getByPlaceholderText('Message...');

    // Step through flow
    sendMessage('I need a flight');
    sendMessage('JFK to LAX');
    sendMessage('Tomorrow');
    sendMessage('5 passengers');
    sendMessage('skip');
    sendMessage('Budget $50k');

    await waitFor(() => {
      expect(mockOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          departure: 'JFK',
          arrival: 'LAX',
          passengers: 5,
          budget: 50000,
        })
      );
    });
  });
});
```

## Best Practices

1. **Session Persistence**: Always use `useRFPFlowPersistence` to maintain state across page refreshes

2. **Error Handling**: Display validation errors with helpful suggestions

3. **Progressive Disclosure**: Only show RFP flow card when active

4. **Accessibility**: Ensure all step indicators and buttons are keyboard accessible

5. **Mobile Responsive**: RFP flow card should adapt to mobile viewports

6. **Agent Handoff**: Always export complete RFP data before handing off to OrchestratorAgent

7. **State Management**: Keep RFP flow state separate from chat message state

8. **Reset on Completion**: Deactivate or reset flow after successful handoff to OrchestratorAgent

## Next Steps

- [ ] Implement chat interface integration
- [ ] Create RFP question message component
- [ ] Add error suggestion UI
- [ ] Connect to OrchestratorAgent
- [ ] Add E2E tests for full workflow
- [ ] Add analytics tracking for completion rates
