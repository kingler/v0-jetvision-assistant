/**
 * @vitest-environment jsdom
 */

/**
 * Chat Interface Auto-Archive Tests (ONEK-257 / ONEK-261 / ONEK-264)
 *
 * Tests for:
 * - Auto-archive after payment confirmation (ONEK-261)
 * - Read-only mode for archived sessions (ONEK-264)
 *
 * @see components/chat-interface.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// =============================================================================
// MOCKS (must be before component import)
// =============================================================================

// Mock Supabase client (must come before ChatInterface import)
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  })),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(() => ({
    user: { id: 'user-123', fullName: 'Test User', imageUrl: '' },
    isLoaded: true,
  })),
  useAuth: vi.fn(() => ({
    isLoaded: true,
    userId: 'user-123',
  })),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock useMediaQuery / mobile hook
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

// Mock streaming hook
vi.mock('@/lib/chat/hooks/use-streaming-response', () => ({
  useStreamingResponse: vi.fn(() => ({
    isStreaming: false,
    streamingText: '',
    startStreaming: vi.fn(),
    stopStreaming: vi.fn(),
  })),
}));

// Mock Avinode quotes hook
vi.mock('@/hooks/use-avinode-quotes', () => ({
  useAvinodeQuotes: vi.fn(() => ({
    quotes: [],
    isLoading: false,
    refresh: vi.fn(),
  })),
}));

// Mock message persistence
vi.mock('@/lib/conversation/message-persistence', () => ({
  saveMessage: vi.fn().mockResolvedValue(undefined),
  loadMessages: vi.fn().mockResolvedValue([]),
}));

// Mock deduplication hook
vi.mock('@/lib/chat/hooks/use-message-deduplication', () => ({
  useMessageDeduplication: vi.fn(() => ({
    deduplicate: vi.fn((msgs: unknown[]) => msgs),
    markSeen: vi.fn(),
  })),
}));

import { ChatInterface } from '@/components/chat-interface';

// =============================================================================
// HELPERS
// =============================================================================

function createMockActiveChat(overrides: Record<string, unknown> = {}) {
  return {
    id: 'chat-123',
    conversationId: 'conv-123',
    requestId: 'req-123',
    route: 'KTEB → KLAX',
    passengers: 4,
    date: '2026-03-01',
    status: 'payment_pending' as const,
    currentStep: 5,
    totalSteps: 6,
    messages: [],
    ...overrides,
  };
}

function createArchivedChat() {
  return createMockActiveChat({
    id: 'chat-archived',
    status: 'closed_won' as const,
    currentStep: 6,
    messages: [
      {
        id: 'msg-1',
        type: 'agent',
        content: 'Deal closed! Payment confirmed.',
        timestamp: new Date('2026-02-01'),
        showClosedWon: true,
      },
    ],
  });
}

const defaultProps = {
  activeChat: createMockActiveChat(),
  isProcessing: false,
  onProcessingChange: vi.fn(),
  onUpdateChat: vi.fn(),
  onArchiveChat: vi.fn(),
  isLoading: false,
};

// =============================================================================
// TESTS
// =============================================================================

describe('ChatInterface - Auto-Archive After Payment (ONEK-261)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should call onArchiveChat after successful payment confirmation', async () => {
    const onArchiveChat = vi.fn();

    // Mock successful payment API call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        contract: { id: 'contract-123', status: 'completed' },
      }),
    });

    render(
      <ChatInterface
        {...defaultProps}
        activeChat={createMockActiveChat({
          status: 'payment_pending',
          tripId: 'trip-123',
          messages: [
            {
              id: 'msg-contract',
              type: 'agent',
              content: 'Contract sent',
              timestamp: new Date(),
              showContractSentConfirmation: true,
              contractSentData: {
                contractId: 'contract-123',
                contractNumber: 'JV-2026-001',
                totalAmount: 50000,
                currency: 'USD',
              },
            },
          ],
        })}
        onArchiveChat={onArchiveChat}
      />
    );

    // The handlePaymentConfirm should trigger onArchiveChat after success
    // This test will fail until we wire the auto-archive in handlePaymentConfirm
    await waitFor(() => {
      expect(onArchiveChat).toHaveBeenCalledWith('chat-123');
    }, { timeout: 5000 });
  });

  it('should NOT call onArchiveChat if payment fails', async () => {
    const onArchiveChat = vi.fn();

    // Mock failed payment API call
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Payment recording failed' }),
    });

    render(
      <ChatInterface
        {...defaultProps}
        activeChat={createMockActiveChat({ status: 'payment_pending' })}
        onArchiveChat={onArchiveChat}
      />
    );

    // Payment failed — should not archive
    await waitFor(() => {
      expect(onArchiveChat).not.toHaveBeenCalled();
    });
  });

  it('should update session status to closed_won before archiving', async () => {
    const onUpdateChat = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        contract: { id: 'contract-123', status: 'completed' },
      }),
    });

    render(
      <ChatInterface
        {...defaultProps}
        activeChat={createMockActiveChat({ status: 'payment_pending' })}
        onUpdateChat={onUpdateChat}
      />
    );

    // After payment, status should be updated to closed_won
    await waitFor(() => {
      const updateCalls = onUpdateChat.mock.calls;
      const statusUpdate = updateCalls.find(
        (call: unknown[]) => (call[1] as Record<string, unknown>)?.status === 'closed_won'
      );
      expect(statusUpdate).toBeTruthy();
    }, { timeout: 5000 });
  });
});

describe('ChatInterface - Read-Only Mode for Archived Sessions (ONEK-264)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should disable chat input when viewing an archived session', () => {
    render(
      <ChatInterface
        {...defaultProps}
        activeChat={createArchivedChat()}
      />
    );

    // The textarea/input should be disabled for archived sessions
    const input = screen.queryByRole('textbox') || screen.queryByPlaceholderText(/type|message/i);
    if (input) {
      expect(input).toBeDisabled();
    } else {
      // Input should not render at all for archived sessions
      expect(screen.queryByPlaceholderText(/type|message/i)).not.toBeInTheDocument();
    }
  });

  it('should show an archived banner for closed_won sessions', () => {
    render(
      <ChatInterface
        {...defaultProps}
        activeChat={createArchivedChat()}
      />
    );

    // Should display an archived/read-only indicator
    expect(
      screen.getByText(/archived|read.only|closed/i)
    ).toBeInTheDocument();
  });

  it('should hide send button for archived sessions', () => {
    render(
      <ChatInterface
        {...defaultProps}
        activeChat={createArchivedChat()}
      />
    );

    // Send button should not be visible
    const sendButton = screen.queryByRole('button', { name: /send/i });
    expect(sendButton).not.toBeInTheDocument();
  });

  it('should still display existing messages in archived sessions', () => {
    render(
      <ChatInterface
        {...defaultProps}
        activeChat={createArchivedChat()}
      />
    );

    // Messages should still render
    expect(screen.getByText(/deal closed|payment confirmed/i)).toBeInTheDocument();
  });
});
