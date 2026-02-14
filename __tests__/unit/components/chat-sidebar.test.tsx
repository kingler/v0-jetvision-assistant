/**
 * @vitest-environment jsdom
 */

/**
 * Chat Sidebar Tests (ONEK-257 / ONEK-259 / ONEK-262 / ONEK-263)
 *
 * Tests for the Archive tab UI in the chat sidebar, including:
 * - Active/Archive tab rendering and switching
 * - Archived sessions display
 * - On-demand loading of archived sessions
 * - Read-only indicators for archived sessions
 *
 * @see components/chat-sidebar.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatSidebar } from '@/components/chat-sidebar';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() })),
  usePathname: vi.fn(() => '/'),
}));

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(() => ({
    user: { id: 'user-123', fullName: 'Test User', imageUrl: '' },
    isLoaded: true,
  })),
  UserButton: () => null,
}));

// =============================================================================
// HELPERS
// =============================================================================

function createMockSession(overrides: Record<string, unknown> = {}) {
  return {
    id: `session-${Math.random().toString(36).slice(2)}`,
    route: 'KTEB → KLAX',
    passengers: 4,
    date: '2026-03-01',
    status: 'requesting_quotes' as const,
    currentStep: 2,
    totalSteps: 6,
    tripId: `trp-${Math.random().toString(36).slice(2)}`,
    messages: [],
    ...overrides,
  };
}

function createArchivedSession(overrides: Record<string, unknown> = {}) {
  return createMockSession({
    status: 'closed_won' as const,
    currentStep: 6,
    ...overrides,
  });
}

const defaultProps = {
  chatSessions: [
    createMockSession({ id: 'active-1', route: 'KTEB → KLAX' }),
    createMockSession({ id: 'active-2', route: 'KORD → KMIA' }),
  ],
  activeChatId: 'active-1',
  onSelectChat: vi.fn(),
  onNewChat: vi.fn(),
  onDeleteChat: vi.fn(),
  onCancelChat: vi.fn(),
  onArchiveChat: vi.fn(),
};

// =============================================================================
// TESTS
// =============================================================================

describe('ChatSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Archive Tab UI (ONEK-262)', () => {
    it('should render Active and Archive tabs', () => {
      render(<ChatSidebar {...defaultProps} />);

      expect(screen.getByRole('tab', { name: /active/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /archive/i })).toBeInTheDocument();
    });

    it('should show Active tab as selected by default', () => {
      render(<ChatSidebar {...defaultProps} />);

      const activeTab = screen.getByRole('tab', { name: /active/i });
      expect(activeTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should show active sessions count on Active tab', () => {
      render(<ChatSidebar {...defaultProps} />);

      // Active tab should include count
      const activeTab = screen.getByRole('tab', { name: /active/i });
      expect(activeTab.textContent).toContain('2');
    });

    it('should switch to Archive tab when clicked', () => {
      render(<ChatSidebar {...defaultProps} />);

      const archiveTab = screen.getByRole('tab', { name: /archive/i });
      fireEvent.click(archiveTab);

      expect(archiveTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should show active sessions when Active tab is selected', () => {
      render(<ChatSidebar {...defaultProps} />);

      // Flight request cards should be rendered for active sessions
      expect(screen.getByText('KTEB → KLAX')).toBeInTheDocument();
      expect(screen.getByText('KORD → KMIA')).toBeInTheDocument();
    });

    it('should hide active sessions when Archive tab is selected', () => {
      render(<ChatSidebar {...defaultProps} />);

      const archiveTab = screen.getByRole('tab', { name: /archive/i });
      fireEvent.click(archiveTab);

      // Active sessions should not be visible
      expect(screen.queryByText('KTEB → KLAX')).not.toBeInTheDocument();
    });
  });

  describe('Archived Sessions Display (ONEK-263)', () => {
    it('should call onLoadArchive when Archive tab is first clicked', () => {
      const onLoadArchive = vi.fn();

      render(
        <ChatSidebar
          {...defaultProps}
          onLoadArchive={onLoadArchive}
          archivedSessions={[]}
          isLoadingArchive={false}
        />
      );

      const archiveTab = screen.getByRole('tab', { name: /archive/i });
      fireEvent.click(archiveTab);

      expect(onLoadArchive).toHaveBeenCalledTimes(1);
    });

    it('should show loading indicator while archived sessions are loading', () => {
      render(
        <ChatSidebar
          {...defaultProps}
          archivedSessions={[]}
          isLoadingArchive={true}
        />
      );

      // Switch to archive tab
      const archiveTab = screen.getByRole('tab', { name: /archive/i });
      fireEvent.click(archiveTab);

      // Should show loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render archived sessions when Archive tab is selected', () => {
      const archivedSessions = [
        createArchivedSession({ id: 'archived-1', route: 'KLAS → KSFO' }),
        createArchivedSession({ id: 'archived-2', route: 'KJFK → KLAX' }),
      ];

      render(
        <ChatSidebar
          {...defaultProps}
          archivedSessions={archivedSessions}
          onLoadArchive={vi.fn()}
          isLoadingArchive={false}
        />
      );

      const archiveTab = screen.getByRole('tab', { name: /archive/i });
      fireEvent.click(archiveTab);

      expect(screen.getByText('KLAS → KSFO')).toBeInTheDocument();
      expect(screen.getByText('KJFK → KLAX')).toBeInTheDocument();
    });

    it('should show empty state when no archived sessions exist', () => {
      render(
        <ChatSidebar
          {...defaultProps}
          archivedSessions={[]}
          isLoadingArchive={false}
        />
      );

      const archiveTab = screen.getByRole('tab', { name: /archive/i });
      fireEvent.click(archiveTab);

      expect(screen.getByText(/no archived/i)).toBeInTheDocument();
    });

    it('should allow selecting an archived session', () => {
      const onSelectChat = vi.fn();
      const archivedSessions = [
        createArchivedSession({ id: 'archived-1', route: 'KLAS → KSFO' }),
      ];

      render(
        <ChatSidebar
          {...defaultProps}
          onSelectChat={onSelectChat}
          archivedSessions={archivedSessions}
          onLoadArchive={vi.fn()}
          isLoadingArchive={false}
        />
      );

      // Switch to archive tab
      const archiveTab = screen.getByRole('tab', { name: /archive/i });
      fireEvent.click(archiveTab);

      // Click the archived session card (FlightRequestCard wraps content in a clickable div)
      const archivedItem = screen.getByText('KLAS → KSFO');
      fireEvent.click(archivedItem.closest('[class*="cursor-pointer"]') || archivedItem);

      expect(onSelectChat).toHaveBeenCalledWith('archived-1');
    });

    it('should show archived sessions count on Archive tab', () => {
      const archivedSessions = [
        createArchivedSession({ id: 'archived-1' }),
        createArchivedSession({ id: 'archived-2' }),
        createArchivedSession({ id: 'archived-3' }),
      ];

      render(
        <ChatSidebar
          {...defaultProps}
          archivedSessions={archivedSessions}
          isLoadingArchive={false}
        />
      );

      // Archive tab should show count
      const archiveTab = screen.getByRole('tab', { name: /archive/i });
      expect(archiveTab.textContent).toContain('3');
    });
  });
});
