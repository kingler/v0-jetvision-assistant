/**
 * MessageBubble Component Stories
 *
 * Demonstrates the MessageBubble component for chat interfaces.
 * Part of the Jetvision Design System.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { MessageBubble } from '@/components/message-bubble';
import type { MessageComponent } from '@/components/message-components/types';

/**
 * MessageBubble displays chat messages with role-based styling,
 * timestamps, status indicators, and threading support.
 */
const meta: Meta<typeof MessageBubble> = {
  title: 'Chat/MessageBubble',
  component: MessageBubble,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A chat message component with support for user/agent roles, timestamps, and message status.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    role: {
      control: 'select',
      options: ['user', 'agent', 'system'],
      description: 'Message sender role',
    },
    showTimestamp: {
      control: 'boolean',
      description: 'Show timestamp below message',
    },
    status: {
      control: 'select',
      options: ['sending', 'sent', 'delivered', 'failed', undefined],
      description: 'Message delivery status (user messages only)',
    },
    isLoading: {
      control: 'boolean',
      description: 'Show loading skeleton',
    },
  },
};

export default meta;
type Story = StoryObj<typeof MessageBubble>;

// Helper to create text components
const textComponent = (content: string): MessageComponent => ({
  type: 'text',
  content,
});

// =============================================================================
// BASIC EXAMPLES
// =============================================================================

/** User message */
export const UserMessage: Story = {
  args: {
    id: 'msg-1',
    role: 'user',
    timestamp: new Date(),
    components: [textComponent('I need to book a flight from New York to Los Angeles for next Friday.')],
    showTimestamp: true,
  },
};

/** Agent message */
export const AgentMessage: Story = {
  args: {
    id: 'msg-2',
    role: 'agent',
    timestamp: new Date(),
    components: [
      textComponent(
        "I'd be happy to help you book a flight from New York to Los Angeles! Let me search for available options for next Friday. Could you please confirm the number of passengers?"
      ),
    ],
    showTimestamp: true,
    author: 'Jetvision Assistant',
  },
};

/** System message */
export const SystemMessage: Story = {
  args: {
    id: 'msg-3',
    role: 'system',
    timestamp: new Date(),
    components: [textComponent('Agent is searching for available flights...')],
  },
};

// =============================================================================
// MESSAGE STATUS
// =============================================================================

/** Message being sent */
export const Sending: Story = {
  args: {
    id: 'msg-4',
    role: 'user',
    timestamp: new Date(),
    components: [textComponent('Booking the Citation XLS for January 25th.')],
    status: 'sending',
    showTimestamp: true,
  },
};

/** Message sent */
export const Sent: Story = {
  args: {
    id: 'msg-5',
    role: 'user',
    timestamp: new Date(),
    components: [textComponent('Yes, 6 passengers total.')],
    status: 'sent',
    showTimestamp: true,
  },
};

/** Message delivered */
export const Delivered: Story = {
  args: {
    id: 'msg-6',
    role: 'user',
    timestamp: new Date(),
    components: [textComponent('Please proceed with the quote.')],
    status: 'delivered',
    showTimestamp: true,
  },
};

/** Failed message */
export const Failed: Story = {
  args: {
    id: 'msg-7',
    role: 'user',
    timestamp: new Date(),
    components: [textComponent('Confirm the booking')],
    status: 'failed',
    error: 'Network error. Please check your connection.',
    showTimestamp: true,
    onRetry: (id) => console.log('Retry:', id),
  },
};

// =============================================================================
// LOADING & STATES
// =============================================================================

/** Loading skeleton */
export const Loading: Story = {
  args: {
    id: 'msg-loading',
    role: 'agent',
    timestamp: new Date(),
    components: [],
    isLoading: true,
  },
};

/** Error state */
export const ErrorState: Story = {
  args: {
    id: 'msg-error',
    role: 'user',
    timestamp: new Date(),
    components: [textComponent('Send this message')],
    error: 'Failed to send message. The server is temporarily unavailable.',
    onRetry: (id) => console.log('Retry:', id),
  },
};

// =============================================================================
// THREADING
// =============================================================================

/** Message with reply */
export const WithReply: Story = {
  args: {
    id: 'msg-reply',
    role: 'user',
    timestamp: new Date(),
    components: [textComponent('Yes, that works for me. Please confirm the booking.')],
    replyTo: {
      id: 'msg-original',
      preview: 'The total cost for the Citation XLS flight would be $42,500...',
      author: 'Jetvision Assistant',
    },
    showTimestamp: true,
  },
};

// =============================================================================
// CONVERSATION EXAMPLE
// =============================================================================

/** Full conversation example */
export const Conversation: Story = {
  render: () => (
    <div className="max-w-2xl space-y-4">
      <MessageBubble
        id="conv-1"
        role="user"
        timestamp={new Date(Date.now() - 300000)}
        components={[
          textComponent('I need to charter a jet from Miami to London for 8 passengers.'),
        ]}
        showTimestamp
        status="delivered"
      />
      <MessageBubble
        id="conv-2"
        role="agent"
        timestamp={new Date(Date.now() - 240000)}
        components={[
          textComponent(
            "I'd be happy to help you arrange a transatlantic charter! For 8 passengers traveling from Miami to London, I recommend considering a heavy jet like the Gulfstream G650 or Bombardier Global 7500. When would you like to depart?"
          ),
        ]}
        showTimestamp
        author="Jetvision Assistant"
      />
      <MessageBubble
        id="conv-3"
        role="user"
        timestamp={new Date(Date.now() - 180000)}
        components={[textComponent('February 15th, morning departure preferred.')]}
        showTimestamp
        status="delivered"
      />
      <MessageBubble
        id="conv-4"
        role="system"
        timestamp={new Date(Date.now() - 120000)}
        components={[textComponent('Searching available aircraft...')]}
      />
      <MessageBubble
        id="conv-5"
        role="agent"
        timestamp={new Date(Date.now() - 60000)}
        components={[
          textComponent(
            "I found several options for your February 15th Miami to London flight:\n\n1. **Gulfstream G650** - Available, $185,000\n2. **Global 7500** - Available, $195,000\n3. **Falcon 8X** - Available, $175,000\n\nAll prices include crew, fuel, and standard catering. Would you like more details on any of these options?"
          ),
        ]}
        showTimestamp
        author="Jetvision Assistant"
      />
    </div>
  ),
};
