/**
 * Tests for ActiveRequestsStarter component (ONEK-161)
 *
 * Inline active requests list that appears in chat when user
 * clicks the "View Active Requests" conversation starter.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActiveRequestsStarter, type ActiveRequest } from '@/components/conversation-starters/active-requests-starter'

// Mock request data matching the database schema
const mockRequests: ActiveRequest[] = [
  {
    id: 'req-001',
    status: 'pending',
    departureAirport: 'KJFK',
    arrivalAirport: 'KLAX',
    departureDate: '2026-02-15',
    passengers: 4,
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z',
    quotesReceived: 0,
    quotesExpected: 5,
  },
  {
    id: 'req-002',
    status: 'awaiting_quotes',
    departureAirport: 'EGLL',
    arrivalAirport: 'LFPG',
    departureDate: '2026-02-20',
    passengers: 2,
    createdAt: '2026-01-09T14:30:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
    quotesReceived: 2,
    quotesExpected: 8,
  },
  {
    id: 'req-003',
    status: 'quotes_received',
    departureAirport: 'KSFO',
    arrivalAirport: 'KORD',
    departureDate: '2026-02-18',
    passengers: 6,
    createdAt: '2026-01-08T09:15:00Z',
    updatedAt: '2026-01-10T12:30:00Z',
    quotesReceived: 5,
    quotesExpected: 5,
  },
  {
    id: 'req-004',
    status: 'booked',
    departureAirport: 'KBOS',
    arrivalAirport: 'KMIA',
    departureDate: '2026-02-25',
    passengers: 3,
    createdAt: '2026-01-07T11:00:00Z',
    updatedAt: '2026-01-10T14:00:00Z',
    quotesReceived: 4,
    quotesExpected: 4,
    bookedOperator: 'NetJets',
    bookedPrice: 45000,
  },
]

describe('ActiveRequestsStarter', () => {
  const mockOnViewRequest = vi.fn()
  const mockOnRefresh = vi.fn()
  const mockOnClose = vi.fn()
  const mockOnRequestStatusChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render the active requests list header', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/active requests/i)).toBeInTheDocument()
    })

    it('should display request count in header', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      // Use getAllByText since the count appears in multiple places
      const countElements = screen.getAllByText(/4.*requests/i)
      expect(countElements.length).toBeGreaterThan(0)
    })

    it('should render close and refresh buttons', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
    })

    it('should render all request cards', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      // Each request should show its route
      expect(screen.getByText(/KJFK.*KLAX/)).toBeInTheDocument()
      expect(screen.getByText(/EGLL.*LFPG/)).toBeInTheDocument()
      expect(screen.getByText(/KSFO.*KORD/)).toBeInTheDocument()
      expect(screen.getByText(/KBOS.*KMIA/)).toBeInTheDocument()
    })
  })

  describe('Status Badges', () => {
    it('should display "Pending" badge for pending requests', () => {
      render(
        <ActiveRequestsStarter
          requests={[mockRequests[0]]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/pending/i)).toBeInTheDocument()
    })

    it('should display "Awaiting Quotes" badge for awaiting_quotes requests', () => {
      render(
        <ActiveRequestsStarter
          requests={[mockRequests[1]]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/awaiting quotes/i)).toBeInTheDocument()
    })

    it('should display "Quotes Received" badge for quotes_received requests', () => {
      render(
        <ActiveRequestsStarter
          requests={[mockRequests[2]]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/quotes received/i)).toBeInTheDocument()
    })

    it('should display "Booked" badge for booked requests', () => {
      render(
        <ActiveRequestsStarter
          requests={[mockRequests[3]]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/booked/i)).toBeInTheDocument()
    })

    it('should show quote progress for awaiting_quotes status', () => {
      render(
        <ActiveRequestsStarter
          requests={[mockRequests[1]]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      // Should show "2 of 8 quotes"
      expect(screen.getByText(/2.*of.*8/i)).toBeInTheDocument()
    })
  })

  describe('Request Card Details', () => {
    it('should display departure date for each request', () => {
      render(
        <ActiveRequestsStarter
          requests={[mockRequests[0]]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      // Date should be displayed in some format (Feb 15 or similar)
      // Use more flexible matching since date format may vary
      const card = screen.getByTestId('request-card-req-001')
      expect(card).toHaveTextContent(/Feb|15|2026/i)
    })

    it('should display passenger count for each request', () => {
      render(
        <ActiveRequestsStarter
          requests={[mockRequests[0]]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/4 passengers/i)).toBeInTheDocument()
    })

    it('should display booked operator and price for booked requests', () => {
      render(
        <ActiveRequestsStarter
          requests={[mockRequests[3]]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/NetJets/i)).toBeInTheDocument()
      expect(screen.getByText(/\$45,000/i)).toBeInTheDocument()
    })

    it('should show "View Details" button for each request', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      const viewButtons = screen.getAllByRole('button', { name: /view details/i })
      expect(viewButtons).toHaveLength(4)
    })
  })

  describe('User Interactions', () => {
    it('should call onViewRequest when clicking View Details', async () => {
      const user = userEvent.setup()
      render(
        <ActiveRequestsStarter
          requests={[mockRequests[0]]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      await user.click(screen.getByRole('button', { name: /view details/i }))

      expect(mockOnViewRequest).toHaveBeenCalledWith('req-001')
    })

    it('should call onViewRequest when clicking on a request card', async () => {
      const user = userEvent.setup()
      render(
        <ActiveRequestsStarter
          requests={[mockRequests[0]]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      // Click on the card itself (not the button)
      const card = screen.getByTestId('request-card-req-001')
      await user.click(card)

      expect(mockOnViewRequest).toHaveBeenCalledWith('req-001')
    })

    it('should call onRefresh when clicking refresh button', async () => {
      const user = userEvent.setup()
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      await user.click(screen.getByRole('button', { name: /refresh/i }))

      expect(mockOnRefresh).toHaveBeenCalled()
    })

    it('should call onClose when clicking close button', async () => {
      const user = userEvent.setup()
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      await user.click(screen.getByRole('button', { name: /close/i }))

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no requests', () => {
      render(
        <ActiveRequestsStarter
          requests={[]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/no active requests/i)).toBeInTheDocument()
    })

    it('should show "Create New Request" action in empty state', () => {
      render(
        <ActiveRequestsStarter
          requests={[]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          onCreateRequest={() => {}}
        />
      )

      expect(screen.getByRole('button', { name: /create.*request/i })).toBeInTheDocument()
    })

    it('should call onCreateRequest when clicking create button in empty state', async () => {
      const mockOnCreateRequest = vi.fn()
      const user = userEvent.setup()

      render(
        <ActiveRequestsStarter
          requests={[]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          onCreateRequest={mockOnCreateRequest}
        />
      )

      await user.click(screen.getByRole('button', { name: /create.*request/i }))

      expect(mockOnCreateRequest).toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(
        <ActiveRequestsStarter
          requests={[]}
          isLoading={true}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByTestId('requests-loading')).toBeInTheDocument()
    })

    it('should disable refresh button when loading', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          isLoading={true}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled()
    })

    it('should show skeleton cards when loading with no existing data', () => {
      render(
        <ActiveRequestsStarter
          requests={[]}
          isLoading={true}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getAllByTestId('request-skeleton')).toHaveLength(3)
    })
  })

  describe('Real-time Updates', () => {
    it('should accept onRequestStatusChange callback for SSE updates', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          onRequestStatusChange={mockOnRequestStatusChange}
        />
      )

      // Component should render without errors when callback is provided
      expect(screen.getByText(/active requests/i)).toBeInTheDocument()
    })

    it('should show connection status indicator when realtime is enabled', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          connectionStatus="connected"
        />
      )

      expect(screen.getByTestId('connection-status')).toBeInTheDocument()
      expect(screen.getByText(/live/i)).toBeInTheDocument()
    })

    it('should show disconnected status when connection is lost', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          connectionStatus="disconnected"
        />
      )

      expect(screen.getByTestId('connection-status')).toBeInTheDocument()
      expect(screen.getByText(/offline/i)).toBeInTheDocument()
    })

    it('should show connecting status during reconnection', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          connectionStatus="connecting"
        />
      )

      expect(screen.getByTestId('connection-status')).toBeInTheDocument()
      expect(screen.getByText(/connecting/i)).toBeInTheDocument()
    })
  })

  describe('Filtering', () => {
    it('should show filter dropdown for status filtering', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          showFilters={true}
        />
      )

      expect(screen.getByRole('combobox', { name: /filter by status/i })).toBeInTheDocument()
    })

    // Note: Radix Select interactions don't work well in jsdom due to hasPointerCapture
    // These tests verify the component renders correctly but skip actual interaction
    it('should render with filter prop enabled', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          showFilters={true}
        />
      )

      // Verify filter trigger is rendered
      const filterTrigger = screen.getByRole('combobox', { name: /filter by status/i })
      expect(filterTrigger).toBeInTheDocument()
    })
  })

  describe('Sorting', () => {
    it('should sort requests by date (newest first) by default', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      const cards = screen.getAllByTestId(/request-card-/)
      // First card should be req-001 (created most recently)
      expect(cards[0]).toHaveAttribute('data-testid', 'request-card-req-001')
    })

    // Note: Radix Select interactions don't work well in jsdom due to hasPointerCapture
    it('should show sorting dropdown when showSorting is enabled', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          showSorting={true}
        />
      )

      expect(screen.getByRole('combobox', { name: /sort by/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper list semantics', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByRole('list')).toBeInTheDocument()
      expect(screen.getAllByRole('listitem')).toHaveLength(4)
    })

    it('should have accessible labels for request cards', () => {
      render(
        <ActiveRequestsStarter
          requests={[mockRequests[0]]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      const card = screen.getByRole('listitem')
      expect(card).toHaveAccessibleName(/flight request.*KJFK.*KLAX/i)
    })

    it('should have aria-live region for status updates', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should apply dialog role when modal mode is enabled', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          modal={true}
        />
      )

      // Check that modal attributes are applied to the container
      const container = screen.getByTestId('active-requests-container')
      expect(container).toHaveAttribute('role', 'dialog')
      expect(container).toHaveAttribute('aria-modal', 'true')
    })
  })

  describe('Error Handling', () => {
    it('should display error message when error prop is provided', () => {
      render(
        <ActiveRequestsStarter
          requests={[]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          error="Failed to load requests"
        />
      )

      expect(screen.getByText(/failed to load requests/i)).toBeInTheDocument()
    })

    it('should show retry button when error occurs', () => {
      render(
        <ActiveRequestsStarter
          requests={[]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          error="Failed to load requests"
        />
      )

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('should call onRefresh when retry button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ActiveRequestsStarter
          requests={[]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          error="Failed to load requests"
        />
      )

      await user.click(screen.getByRole('button', { name: /retry/i }))

      expect(mockOnRefresh).toHaveBeenCalled()
    })
  })

  describe('Compact Mode', () => {
    it('should render in compact mode when prop is set', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          compact={true}
        />
      )

      const container = screen.getByTestId('active-requests-container')
      expect(container).toHaveClass('compact')
    })

    it('should show abbreviated route in compact mode', () => {
      render(
        <ActiveRequestsStarter
          requests={[mockRequests[0]]}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          compact={true}
        />
      )

      // Should show abbreviated format like "JFK → LAX" instead of full codes
      expect(screen.getByText(/JFK.*→.*LAX/i)).toBeInTheDocument()
    })
  })

  describe('Max Display Limit', () => {
    it('should limit displayed requests when maxDisplay is set', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          maxDisplay={2}
        />
      )

      expect(screen.getAllByTestId(/request-card-/)).toHaveLength(2)
    })

    it('should show "View All" link when more requests exist than maxDisplay', () => {
      render(
        <ActiveRequestsStarter
          requests={mockRequests}
          onViewRequest={mockOnViewRequest}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          maxDisplay={2}
        />
      )

      expect(screen.getByText(/view all.*4.*requests/i)).toBeInTheDocument()
    })
  })
})
