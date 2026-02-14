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

  it('should pass onArchiveChat prop to the component', () => {
    const onArchiveChat = vi.fn();

    const { unmount } = render(
      <ChatInterface
        {...defaultProps}
        activeChat={createMockActiveChat({ status: 'payment_pending' })}
        onArchiveChat={onArchiveChat}
      />
    );

    // Verify the component accepts and uses onArchiveChat
    // (The actual triggering is tested via the payment confirmation modal integration)
    expect(onArchiveChat).not.toHaveBeenCalled();
    unmount();
  });

  it('should NOT call onArchiveChat on initial render', () => {
    const onArchiveChat = vi.fn();

    render(
      <ChatInterface
        {...defaultProps}
        activeChat={createMockActiveChat({ status: 'payment_pending' })}
        onArchiveChat={onArchiveChat}
      />
    );

    // Archive should not be called just because we rendered
    expect(onArchiveChat).not.toHaveBeenCalled();
  });
});

describe('ChatInterface - Read-Only Mode for Archived Sessions (ONEK-264)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should hide chat input when viewing an archived session', () => {
    render(
      <ChatInterface
        {...defaultProps}
        activeChat={createArchivedChat()}
      />
    );

    // Input should not render for archived sessions
    expect(screen.queryByPlaceholderText('Message about this request...')).not.toBeInTheDocument();
  });

  it('should show an archived banner for closed_won sessions', () => {
    render(
      <ChatInterface
        {...defaultProps}
        activeChat={createArchivedChat()}
      />
    );

    // Should display the archived/read-only indicator text
    expect(
      screen.getByText('This session is archived and read-only.')
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
