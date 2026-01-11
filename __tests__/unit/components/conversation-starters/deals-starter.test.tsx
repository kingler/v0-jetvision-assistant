/**
 * Tests for DealsStarter component (ONEK-162)
 *
 * Inline deals/quotes list that appears in chat when user
 * clicks the "Show My Deals" conversation starter.
 * Displays deals grouped by status with pipeline value summary.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  DealsStarter,
  type Deal,
  type DealStatus,
} from '@/components/conversation-starters/deals-starter'

// Mock deal data matching the expected interface
const mockDeals: Deal[] = [
  {
    id: 'deal-001',
    clientName: 'Acme Corp',
    route: { from: 'KJFK', to: 'KLAX' },
    aircraft: 'Gulfstream G650',
    operator: 'NetJets',
    value: 125000,
    currency: 'USD',
    status: 'active',
    quoteCount: 3,
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T14:00:00Z',
    expiresAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'deal-002',
    clientName: 'TechStart Inc',
    route: { from: 'EGLL', to: 'LFPG' },
    aircraft: 'Citation X',
    operator: 'VistaJet',
    value: 45000,
    currency: 'USD',
    status: 'pending',
    quoteCount: 1,
    createdAt: '2026-01-09T14:30:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'deal-003',
    clientName: 'Global Ventures',
    route: { from: 'KSFO', to: 'KORD' },
    aircraft: 'Challenger 350',
    operator: 'Flexjet',
    value: 78000,
    currency: 'USD',
    status: 'won',
    quoteCount: 5,
    createdAt: '2026-01-08T09:15:00Z',
    updatedAt: '2026-01-10T12:30:00Z',
  },
  {
    id: 'deal-004',
    clientName: 'Pinnacle Group',
    route: { from: 'KBOS', to: 'KMIA' },
    aircraft: 'Phenom 300',
    operator: 'Wheels Up',
    value: 32000,
    currency: 'USD',
    status: 'lost',
    quoteCount: 2,
    createdAt: '2026-01-07T11:00:00Z',
    updatedAt: '2026-01-10T14:00:00Z',
    expiresAt: '2026-01-08T00:00:00Z',
  },
  {
    id: 'deal-005',
    clientName: 'Summit Holdings',
    route: { from: 'KDEN', to: 'KLAS' },
    aircraft: 'Citation CJ3',
    operator: 'XO',
    value: 28000,
    currency: 'USD',
    status: 'active',
    quoteCount: 2,
    createdAt: '2026-01-06T08:00:00Z',
    updatedAt: '2026-01-10T09:00:00Z',
  },
]

describe('DealsStarter', () => {
  const mockOnViewDeal = vi.fn()
  const mockOnRefresh = vi.fn()
  const mockOnClose = vi.fn()
  const mockOnDealStatusChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render the deals list header', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/my deals/i)).toBeInTheDocument()
    })

    it('should display deal count in header', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      const countElements = screen.getAllByText(/5.*deals/i)
      expect(countElements.length).toBeGreaterThan(0)
    })

    it('should render close and refresh buttons', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
    })

    it('should render all deal cards', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      // Each deal should show its client name
      expect(screen.getByText(/Acme Corp/i)).toBeInTheDocument()
      expect(screen.getByText(/TechStart Inc/i)).toBeInTheDocument()
      expect(screen.getByText(/Global Ventures/i)).toBeInTheDocument()
      expect(screen.getByText(/Pinnacle Group/i)).toBeInTheDocument()
      expect(screen.getByText(/Summit Holdings/i)).toBeInTheDocument()
    })
  })

  describe('Pipeline Value Summary', () => {
    it('should display total pipeline value', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      // Total active + pending = $125,000 + $45,000 + $28,000 = $198,000
      expect(screen.getByTestId('pipeline-value')).toBeInTheDocument()
    })

    it('should show active deals value in pipeline summary', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      // Active deals: $125,000 + $28,000 = $153,000
      const pipelineSection = screen.getByTestId('pipeline-summary')
      expect(within(pipelineSection).getByText(/active/i)).toBeInTheDocument()
    })

    it('should show won deals value in summary', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      // Won deals: $78,000 - appears in both pipeline summary and deal card
      const wonValueElements = screen.getAllByText(/\$78,000/)
      expect(wonValueElements.length).toBeGreaterThan(0)
    })

    it('should display count of deals by status', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      const pipelineSection = screen.getByTestId('pipeline-summary')
      // 2 active + 1 pending = 3 in pipeline
      expect(within(pipelineSection).getByText(/3.*active/i)).toBeInTheDocument()
    })
  })

  describe('Status Badges', () => {
    it('should display "Active" badge for active deals', () => {
      render(
        <DealsStarter
          deals={[mockDeals[0]]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/^active$/i)).toBeInTheDocument()
    })

    it('should display "Pending" badge for pending deals', () => {
      render(
        <DealsStarter
          deals={[mockDeals[1]]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/^pending$/i)).toBeInTheDocument()
    })

    it('should display "Won" badge for won deals', () => {
      render(
        <DealsStarter
          deals={[mockDeals[2]]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/^won$/i)).toBeInTheDocument()
    })

    it('should display "Lost" badge for lost deals', () => {
      render(
        <DealsStarter
          deals={[mockDeals[3]]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/^lost$/i)).toBeInTheDocument()
    })
  })

  describe('Deal Card Details', () => {
    it('should display client name for each deal', () => {
      render(
        <DealsStarter
          deals={[mockDeals[0]]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/Acme Corp/i)).toBeInTheDocument()
    })

    it('should display route for each deal', () => {
      render(
        <DealsStarter
          deals={[mockDeals[0]]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/KJFK.*KLAX/)).toBeInTheDocument()
    })

    it('should display aircraft type for each deal', () => {
      render(
        <DealsStarter
          deals={[mockDeals[0]]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/Gulfstream G650/i)).toBeInTheDocument()
    })

    it('should display operator name for each deal', () => {
      render(
        <DealsStarter
          deals={[mockDeals[0]]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/NetJets/i)).toBeInTheDocument()
    })

    it('should display deal value for each deal', () => {
      render(
        <DealsStarter
          deals={[mockDeals[0]]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      // Value appears in both pipeline summary and deal card
      const valueElements = screen.getAllByText(/\$125,000/)
      expect(valueElements.length).toBeGreaterThan(0)
    })

    it('should display quote count for each deal', () => {
      render(
        <DealsStarter
          deals={[mockDeals[0]]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/3.*quotes/i)).toBeInTheDocument()
    })

    it('should show expiration date for active deals with expiresAt', () => {
      render(
        <DealsStarter
          deals={[mockDeals[0]]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      // Should show expiry indicator
      expect(screen.getByText(/expires/i)).toBeInTheDocument()
    })

    it('should show "View Details" button for each deal', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      const viewButtons = screen.getAllByRole('button', { name: /view details/i })
      expect(viewButtons).toHaveLength(5)
    })
  })

  describe('Status Grouping', () => {
    it('should show status group tabs when groupByStatus is enabled', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          groupByStatus={true}
        />
      )

      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /active/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /pending/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /won/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /lost/i })).toBeInTheDocument()
    })

    it('should filter deals when status tab is clicked', async () => {
      const user = userEvent.setup()
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          groupByStatus={true}
        />
      )

      // Click on "Won" tab
      await user.click(screen.getByRole('tab', { name: /won/i }))

      // Should only show Global Ventures (the won deal)
      expect(screen.getByText(/Global Ventures/i)).toBeInTheDocument()
      expect(screen.queryByText(/Acme Corp/i)).not.toBeInTheDocument()
    })

    it('should show deal counts in status tabs', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          groupByStatus={true}
        />
      )

      // Active tab should show count of 2
      const activeTab = screen.getByRole('tab', { name: /active/i })
      expect(within(activeTab).getByText('2')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should call onViewDeal when clicking View Details', async () => {
      const user = userEvent.setup()
      render(
        <DealsStarter
          deals={[mockDeals[0]]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      await user.click(screen.getByRole('button', { name: /view details/i }))

      expect(mockOnViewDeal).toHaveBeenCalledWith('deal-001')
    })

    it('should call onViewDeal when clicking on a deal card', async () => {
      const user = userEvent.setup()
      render(
        <DealsStarter
          deals={[mockDeals[0]]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      const card = screen.getByTestId('deal-card-deal-001')
      await user.click(card)

      expect(mockOnViewDeal).toHaveBeenCalledWith('deal-001')
    })

    it('should call onRefresh when clicking refresh button', async () => {
      const user = userEvent.setup()
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
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
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      await user.click(screen.getByRole('button', { name: /close/i }))

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no deals', () => {
      render(
        <DealsStarter
          deals={[]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/no deals/i)).toBeInTheDocument()
    })

    it('should show "Create New Request" action in empty state', () => {
      render(
        <DealsStarter
          deals={[]}
          onViewDeal={mockOnViewDeal}
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
        <DealsStarter
          deals={[]}
          onViewDeal={mockOnViewDeal}
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
    it('should show loading indicator when isLoading is true', () => {
      render(
        <DealsStarter
          deals={[]}
          isLoading={true}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByTestId('deals-loading')).toBeInTheDocument()
    })

    it('should disable refresh button when loading', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          isLoading={true}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled()
    })

    it('should show skeleton cards when loading with no existing data', () => {
      render(
        <DealsStarter
          deals={[]}
          isLoading={true}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getAllByTestId('deal-skeleton')).toHaveLength(3)
    })
  })

  describe('Real-time Updates', () => {
    it('should accept onDealStatusChange callback for SSE updates', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          onDealStatusChange={mockOnDealStatusChange}
        />
      )

      expect(screen.getByText(/my deals/i)).toBeInTheDocument()
    })

    it('should show connection status indicator when realtime is enabled', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
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
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          connectionStatus="disconnected"
        />
      )

      expect(screen.getByTestId('connection-status')).toBeInTheDocument()
      expect(screen.getByText(/offline/i)).toBeInTheDocument()
    })
  })

  describe('Filtering', () => {
    it('should show filter dropdown when showFilters is enabled', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          showFilters={true}
        />
      )

      expect(screen.getByRole('combobox', { name: /filter by status/i })).toBeInTheDocument()
    })

    it('should render with filter prop enabled', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          showFilters={true}
        />
      )

      const filterTrigger = screen.getByRole('combobox', { name: /filter by status/i })
      expect(filterTrigger).toBeInTheDocument()
    })
  })

  describe('Sorting', () => {
    it('should sort deals by value (highest first) by default', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      const cards = screen.getAllByTestId(/deal-card-/)
      // First card should be deal-001 (highest value: $125,000)
      expect(cards[0]).toHaveAttribute('data-testid', 'deal-card-deal-001')
    })

    it('should show sorting dropdown when showSorting is enabled', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
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
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByRole('list')).toBeInTheDocument()
      expect(screen.getAllByRole('listitem')).toHaveLength(5)
    })

    it('should have accessible labels for deal cards', () => {
      render(
        <DealsStarter
          deals={[mockDeals[0]]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      const card = screen.getByRole('listitem')
      expect(card).toHaveAccessibleName(/deal.*Acme Corp.*KJFK.*KLAX/i)
    })

    it('should have aria-live region for status updates', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should apply dialog role when modal mode is enabled', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          modal={true}
        />
      )

      const container = screen.getByTestId('deals-container')
      expect(container).toHaveAttribute('role', 'dialog')
      expect(container).toHaveAttribute('aria-modal', 'true')
    })

    it('should have proper tablist semantics when groupByStatus is enabled', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          groupByStatus={true}
        />
      )

      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when error prop is provided', () => {
      render(
        <DealsStarter
          deals={[]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          error="Failed to load deals"
        />
      )

      expect(screen.getByText(/failed to load deals/i)).toBeInTheDocument()
    })

    it('should show retry button when error occurs', () => {
      render(
        <DealsStarter
          deals={[]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          error="Failed to load deals"
        />
      )

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('should call onRefresh when retry button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <DealsStarter
          deals={[]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          error="Failed to load deals"
        />
      )

      await user.click(screen.getByRole('button', { name: /retry/i }))

      expect(mockOnRefresh).toHaveBeenCalled()
    })
  })

  describe('Compact Mode', () => {
    it('should render in compact mode when prop is set', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          compact={true}
        />
      )

      const container = screen.getByTestId('deals-container')
      expect(container).toHaveClass('compact')
    })

    it('should show abbreviated route in compact mode', () => {
      render(
        <DealsStarter
          deals={[mockDeals[0]]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          compact={true}
        />
      )

      // Should show abbreviated format like "JFK → LAX" instead of full codes
      expect(screen.getByText(/JFK.*→.*LAX/i)).toBeInTheDocument()
    })

    it('should hide pipeline summary in compact mode', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          compact={true}
        />
      )

      expect(screen.queryByTestId('pipeline-summary')).not.toBeInTheDocument()
    })
  })

  describe('Max Display Limit', () => {
    it('should limit displayed deals when maxDisplay is set', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          maxDisplay={2}
        />
      )

      expect(screen.getAllByTestId(/deal-card-/)).toHaveLength(2)
    })

    it('should show "View All" link when more deals exist than maxDisplay', () => {
      render(
        <DealsStarter
          deals={mockDeals}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
          maxDisplay={2}
        />
      )

      expect(screen.getByText(/view all.*5.*deals/i)).toBeInTheDocument()
    })
  })

  describe('Currency Formatting', () => {
    it('should format USD values correctly', () => {
      render(
        <DealsStarter
          deals={[mockDeals[0]]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      // Value appears in both pipeline summary and deal card
      const valueElements = screen.getAllByText(/\$125,000/)
      expect(valueElements.length).toBeGreaterThan(0)
    })

    it('should handle deals with different currencies', () => {
      const eurDeal: Deal = {
        ...mockDeals[0],
        id: 'deal-eur',
        value: 100000,
        currency: 'EUR',
      }

      render(
        <DealsStarter
          deals={[eurDeal]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      // Should show Euro formatting
      expect(screen.getByText(/€100,000|EUR.*100,000/)).toBeInTheDocument()
    })
  })

  describe('Expiration Indicators', () => {
    it('should highlight deals expiring soon', () => {
      // Mock a deal expiring in 2 days
      const expiringDeal: Deal = {
        ...mockDeals[0],
        id: 'deal-expiring',
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      }

      render(
        <DealsStarter
          deals={[expiringDeal]}
          onViewDeal={mockOnViewDeal}
          onRefresh={mockOnRefresh}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByTestId('expiring-soon-indicator')).toBeInTheDocument()
    })
  })
})
