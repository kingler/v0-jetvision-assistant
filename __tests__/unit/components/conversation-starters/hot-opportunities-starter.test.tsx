/**
 * HotOpportunitiesStarter Tests
 *
 * TDD tests for the hot opportunities conversation starter component.
 * Tests hot criteria logic, priority scoring, and urgency display.
 *
 * @vitest-environment jsdom
 * @module __tests__/unit/components/conversation-starters/hot-opportunities-starter
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock scrollIntoView for Radix UI Select component
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})
import {
  HotOpportunitiesStarter,
  isHotOpportunity,
  calculatePriorityScore,
  HOT_VALUE_THRESHOLD,
  type HotDeal,
  type HotOpportunitiesStarterProps,
} from '@/components/conversation-starters/hot-opportunities-starter'

// Mock deal data
const createMockHotDeal = (overrides: Partial<HotDeal> = {}): HotDeal => ({
  id: 'deal-1',
  clientName: 'Acme Corp',
  route: { from: 'KTEB', to: 'KLAS' },
  aircraft: 'Citation X',
  operator: 'NetJets',
  value: 85000,
  currency: 'USD',
  status: 'active',
  quoteCount: 2,
  createdAt: '2026-01-10T10:00:00Z',
  updatedAt: '2026-01-10T12:00:00Z',
  expiresAt: undefined,
  requestId: 'req-1',
  // Hot-specific fields
  expiresWithin24Hours: false,
  clientViewed: false,
  priorityScore: 0,
  hotReasons: [],
  ...overrides,
})

// Create deals with various hot criteria
const createHotDeals = (): HotDeal[] => [
  // Expiring soon - highest priority
  createMockHotDeal({
    id: 'expiring-deal',
    clientName: 'Urgent Client',
    value: 50000,
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
    expiresWithin24Hours: true,
    priorityScore: 40,
    hotReasons: ['Expires within 24 hours'],
  }),
  // High value deal
  createMockHotDeal({
    id: 'high-value-deal',
    clientName: 'VIP Client',
    value: 150000,
    priorityScore: 30,
    hotReasons: ['High value deal'],
  }),
  // Multiple quotes
  createMockHotDeal({
    id: 'multi-quote-deal',
    clientName: 'Popular Route',
    quoteCount: 5,
    value: 60000,
    priorityScore: 20,
    hotReasons: ['Multiple operator quotes'],
  }),
  // Client viewed
  createMockHotDeal({
    id: 'viewed-deal',
    clientName: 'Engaged Client',
    value: 45000,
    clientViewed: true,
    priorityScore: 10,
    hotReasons: ['Client recently viewed'],
  }),
  // Not hot - no criteria met
  createMockHotDeal({
    id: 'normal-deal',
    clientName: 'Normal Client',
    value: 30000,
    quoteCount: 1,
    priorityScore: 0,
    hotReasons: [],
  }),
]

const defaultProps: HotOpportunitiesStarterProps = {
  deals: createHotDeals(),
  onViewDeal: vi.fn(),
  onRefresh: vi.fn(),
  onClose: vi.fn(),
}

describe('HotOpportunitiesStarter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // Rendering Tests
  // ============================================================================
  describe('Rendering', () => {
    it('should render the hot opportunities container', () => {
      render(<HotOpportunitiesStarter {...defaultProps} />)
      expect(screen.getByTestId('hot-opportunities-container')).toBeInTheDocument()
    })

    it('should display the hot opportunities title with flame icon', () => {
      render(<HotOpportunitiesStarter {...defaultProps} />)
      expect(screen.getByText('Hot Opportunities')).toBeInTheDocument()
      expect(screen.getByTestId('flame-icon')).toBeInTheDocument()
    })

    it('should show the count of hot deals in badge', () => {
      const hotDeals = createHotDeals().filter(d => d.priorityScore > 0)
      render(<HotOpportunitiesStarter {...defaultProps} deals={hotDeals} />)
      expect(screen.getByText(`${hotDeals.length} hot`)).toBeInTheDocument()
    })

    it('should render refresh and close buttons', () => {
      render(<HotOpportunitiesStarter {...defaultProps} />)
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
    })

    it('should render deals as a list with listitem role', () => {
      render(<HotOpportunitiesStarter {...defaultProps} />)
      const list = screen.getByRole('list')
      expect(list).toBeInTheDocument()
      const items = within(list).getAllByRole('listitem')
      expect(items.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // Hot Criteria Logic Tests
  // ============================================================================
  describe('Hot Criteria Logic', () => {
    describe('isHotOpportunity', () => {
      it('should return true for deals expiring within 24 hours', () => {
        const deal = createMockHotDeal({ expiresWithin24Hours: true })
        expect(isHotOpportunity(deal)).toBe(true)
      })

      it('should return true for high value deals above threshold', () => {
        const deal = createMockHotDeal({ value: HOT_VALUE_THRESHOLD + 1 })
        expect(isHotOpportunity(deal)).toBe(true)
      })

      it('should return true for deals with 3+ quotes', () => {
        const deal = createMockHotDeal({ quoteCount: 3 })
        expect(isHotOpportunity(deal)).toBe(true)
      })

      it('should return true for client-viewed deals', () => {
        const deal = createMockHotDeal({ clientViewed: true })
        expect(isHotOpportunity(deal)).toBe(true)
      })

      it('should return false for deals with no hot criteria', () => {
        const deal = createMockHotDeal({
          value: 30000,
          quoteCount: 1,
          expiresWithin24Hours: false,
          clientViewed: false,
        })
        expect(isHotOpportunity(deal)).toBe(false)
      })

      it('should return true for deals with multiple hot criteria', () => {
        const deal = createMockHotDeal({
          value: HOT_VALUE_THRESHOLD + 1,
          quoteCount: 5,
          expiresWithin24Hours: true,
          clientViewed: true,
        })
        expect(isHotOpportunity(deal)).toBe(true)
      })
    })

    describe('calculatePriorityScore', () => {
      it('should add 40 points for expiring within 24 hours', () => {
        const deal = createMockHotDeal({ expiresWithin24Hours: true })
        expect(calculatePriorityScore(deal)).toBeGreaterThanOrEqual(40)
      })

      it('should add 30 points for high value deals', () => {
        const deal = createMockHotDeal({ value: HOT_VALUE_THRESHOLD + 1 })
        expect(calculatePriorityScore(deal)).toBeGreaterThanOrEqual(30)
      })

      it('should add 20 points for 3+ quotes', () => {
        const deal = createMockHotDeal({ quoteCount: 3 })
        expect(calculatePriorityScore(deal)).toBeGreaterThanOrEqual(20)
      })

      it('should add 10 points for client viewed', () => {
        const deal = createMockHotDeal({ clientViewed: true })
        expect(calculatePriorityScore(deal)).toBeGreaterThanOrEqual(10)
      })

      it('should return 0 for deals with no hot criteria', () => {
        const deal = createMockHotDeal({
          value: 30000,
          quoteCount: 1,
          expiresWithin24Hours: false,
          clientViewed: false,
        })
        expect(calculatePriorityScore(deal)).toBe(0)
      })

      it('should accumulate points for multiple criteria', () => {
        const deal = createMockHotDeal({
          value: HOT_VALUE_THRESHOLD + 1,
          quoteCount: 5,
          expiresWithin24Hours: true,
          clientViewed: true,
        })
        // 40 + 30 + 20 + 10 = 100
        expect(calculatePriorityScore(deal)).toBe(100)
      })
    })
  })

  // ============================================================================
  // Priority Score Display Tests
  // ============================================================================
  describe('Priority Score Display', () => {
    it('should display priority score badge on hot deals', () => {
      const hotDeals = createHotDeals().filter(d => d.priorityScore > 0)
      render(<HotOpportunitiesStarter {...defaultProps} deals={hotDeals} />)
      
      const expiringSoon = screen.getByTestId('deal-card-expiring-deal')
      expect(within(expiringSoon).getByTestId('priority-score')).toHaveTextContent('40')
    })

    it('should show urgency level indicator based on score', () => {
      const hotDeals = createHotDeals().filter(d => d.priorityScore > 0)
      render(<HotOpportunitiesStarter {...defaultProps} deals={hotDeals} />)
      
      // High urgency (score >= 40)
      const expiringSoon = screen.getByTestId('deal-card-expiring-deal')
      expect(within(expiringSoon).getByTestId('urgency-indicator')).toHaveClass('urgency-high')
    })

    it('should display hot reasons as tags', () => {
      const hotDeals = createHotDeals().filter(d => d.priorityScore > 0)
      render(<HotOpportunitiesStarter {...defaultProps} deals={hotDeals} />)
      
      expect(screen.getByText('Expires within 24 hours')).toBeInTheDocument()
      expect(screen.getByText('High value deal')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Flame Icon Styling Tests
  // ============================================================================
  describe('Flame Icon Styling', () => {
    it('should show animated flame for deals expiring soon', () => {
      const hotDeals = [createMockHotDeal({ 
        id: 'expiring',
        expiresWithin24Hours: true, 
        priorityScore: 40 
      })]
      render(<HotOpportunitiesStarter {...defaultProps} deals={hotDeals} />)
      
      const flameIcon = screen.getByTestId('deal-flame-expiring')
      expect(flameIcon).toHaveClass('animate-pulse')
    })

    it('should show static flame for high priority non-expiring deals', () => {
      const hotDeals = [createMockHotDeal({ 
        id: 'high-value',
        value: 150000, 
        priorityScore: 30 
      })]
      render(<HotOpportunitiesStarter {...defaultProps} deals={hotDeals} />)
      
      const flameIcon = screen.getByTestId('deal-flame-high-value')
      expect(flameIcon).not.toHaveClass('animate-pulse')
    })

    it('should color flame based on urgency level', () => {
      const hotDeals = createHotDeals().filter(d => d.priorityScore > 0)
      render(<HotOpportunitiesStarter {...defaultProps} deals={hotDeals} />)
      
      // High urgency = orange/red flame
      const expiringSoon = screen.getByTestId('deal-flame-expiring-deal')
      expect(expiringSoon).toHaveClass('text-orange-500')
    })
  })

  // ============================================================================
  // Sorting Tests
  // ============================================================================
  describe('Urgency Sorting', () => {
    it('should sort deals by priority score descending by default', () => {
      render(<HotOpportunitiesStarter {...defaultProps} />)
      
      const list = screen.getByRole('list')
      const items = within(list).getAllByRole('listitem')
      
      // First item should be the expiring deal (highest priority)
      expect(items[0]).toHaveAttribute('data-testid', 'deal-card-expiring-deal')
    })

    it('should allow sorting by expiration time', () => {
      render(<HotOpportunitiesStarter {...defaultProps} showSorting />)
      
      const sortSelect = screen.getByLabelText(/sort by/i)
      fireEvent.change(sortSelect, { target: { value: 'expiration' } })
      
      // Expiring deals should come first
      const list = screen.getByRole('list')
      const items = within(list).getAllByRole('listitem')
      expect(items[0]).toHaveAttribute('data-testid', 'deal-card-expiring-deal')
    })

    it('should render sorting controls when showSorting is true', () => {
      render(<HotOpportunitiesStarter {...defaultProps} showSorting />)

      // Verify sort control is rendered
      const sortTrigger = screen.getByLabelText(/sort by/i)
      expect(sortTrigger).toBeInTheDocument()
    })

    it('should sort deals by value correctly with custom data', () => {
      // Create deals with different values to verify sorting order
      const valueDeals: HotDeal[] = [
        createMockHotDeal({ id: 'low-value', value: 50000, priorityScore: 10 }),
        createMockHotDeal({ id: 'high-value', value: 200000, priorityScore: 30 }),
        createMockHotDeal({ id: 'mid-value', value: 100000, priorityScore: 20 }),
      ]

      // Default priority sorting places high-value first (score 30 > 20 > 10)
      render(<HotOpportunitiesStarter {...defaultProps} deals={valueDeals} />)

      const list = screen.getByRole('list')
      const items = within(list).getAllByRole('listitem')

      // With priority sorting: high-value (30) > mid-value (20) > low-value (10)
      expect(items[0]).toHaveAttribute('data-testid', 'deal-card-high-value')
    })
  })

  // ============================================================================
  // Filtering Tests
  // ============================================================================
  describe('Hot Deals Filtering', () => {
    it('should only show hot deals by default (priorityScore > 0)', () => {
      render(<HotOpportunitiesStarter {...defaultProps} />)
      
      // Should not show normal deal
      expect(screen.queryByTestId('deal-card-normal-deal')).not.toBeInTheDocument()
      
      // Should show hot deals
      expect(screen.getByTestId('deal-card-expiring-deal')).toBeInTheDocument()
    })

    it('should render filter controls when showFilters is true', () => {
      render(<HotOpportunitiesStarter {...defaultProps} showFilters />)

      // Verify filter control is rendered
      const filterTrigger = screen.getByLabelText(/filter by reason/i)
      expect(filterTrigger).toBeInTheDocument()
    })

    it('should only show hot deals by default (filter logic)', () => {
      // Create a mix of hot and non-hot deals
      const mixedDeals: HotDeal[] = [
        createMockHotDeal({ id: 'hot-deal', expiresWithin24Hours: true, priorityScore: 40 }),
        createMockHotDeal({ id: 'not-hot-deal', priorityScore: 0 }), // No hot criteria, score 0
      ]

      render(<HotOpportunitiesStarter {...defaultProps} deals={mixedDeals} showFilters />)

      // Hot deal should be visible, non-hot deal should not
      expect(screen.getByTestId('deal-card-hot-deal')).toBeInTheDocument()
      expect(screen.queryByTestId('deal-card-not-hot-deal')).not.toBeInTheDocument()
    })

    it('should show all hot deals when "all" filter is selected', () => {
      render(<HotOpportunitiesStarter {...defaultProps} showFilters />)
      
      const filterSelect = screen.getByLabelText(/filter by reason/i)
      fireEvent.change(filterSelect, { target: { value: 'all' } })
      
      const hotDeals = createHotDeals().filter(d => d.priorityScore > 0)
      hotDeals.forEach(deal => {
        expect(screen.getByTestId(`deal-card-${deal.id}`)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // User Interactions Tests
  // ============================================================================
  describe('User Interactions', () => {
    it('should call onViewDeal when clicking a deal card', () => {
      const onViewDeal = vi.fn()
      render(<HotOpportunitiesStarter {...defaultProps} onViewDeal={onViewDeal} />)
      
      const dealCard = screen.getByTestId('deal-card-expiring-deal')
      fireEvent.click(dealCard)
      
      expect(onViewDeal).toHaveBeenCalledWith('expiring-deal')
    })

    it('should call onRefresh when clicking refresh button', () => {
      const onRefresh = vi.fn()
      render(<HotOpportunitiesStarter {...defaultProps} onRefresh={onRefresh} />)
      
      const refreshBtn = screen.getByRole('button', { name: /refresh/i })
      fireEvent.click(refreshBtn)
      
      expect(onRefresh).toHaveBeenCalledOnce()
    })

    it('should call onClose when clicking close button', () => {
      const onClose = vi.fn()
      render(<HotOpportunitiesStarter {...defaultProps} onClose={onClose} />)
      
      const closeBtn = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeBtn)
      
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('should call onViewDeal when clicking View Details button', () => {
      const onViewDeal = vi.fn()
      render(<HotOpportunitiesStarter {...defaultProps} onViewDeal={onViewDeal} />)
      
      const viewButtons = screen.getAllByRole('button', { name: /view details/i })
      fireEvent.click(viewButtons[0])
      
      expect(onViewDeal).toHaveBeenCalled()
    })

    it('should call onDismiss when dismissing a hot deal', () => {
      const onDismiss = vi.fn()
      render(<HotOpportunitiesStarter {...defaultProps} onDismiss={onDismiss} />)
      
      const dismissBtn = screen.getAllByRole('button', { name: /dismiss/i })[0]
      fireEvent.click(dismissBtn)
      
      expect(onDismiss).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Empty State Tests
  // ============================================================================
  describe('Empty State', () => {
    it('should show empty state when no hot deals', () => {
      render(<HotOpportunitiesStarter {...defaultProps} deals={[]} />)
      
      expect(screen.getByText(/no hot opportunities/i)).toBeInTheDocument()
    })

    it('should show celebration message when all deals handled', () => {
      render(<HotOpportunitiesStarter {...defaultProps} deals={[]} />)
      
      expect(screen.getByText(/you.*re all caught up/i)).toBeInTheDocument()
    })

    it('should show link to view all deals in empty state', () => {
      const onViewAllDeals = vi.fn()
      render(<HotOpportunitiesStarter {...defaultProps} deals={[]} onViewAllDeals={onViewAllDeals} />)
      
      const viewAllBtn = screen.getByRole('button', { name: /view all deals/i })
      fireEvent.click(viewAllBtn)
      
      expect(onViewAllDeals).toHaveBeenCalledOnce()
    })
  })

  // ============================================================================
  // Loading State Tests
  // ============================================================================
  describe('Loading State', () => {
    it('should show loading skeletons when loading', () => {
      render(<HotOpportunitiesStarter {...defaultProps} deals={[]} isLoading />)
      
      expect(screen.getByTestId('hot-opportunities-loading')).toBeInTheDocument()
      expect(screen.getAllByTestId('deal-skeleton')).toHaveLength(3)
    })

    it('should disable refresh button while loading', () => {
      render(<HotOpportunitiesStarter {...defaultProps} isLoading />)
      
      const refreshBtn = screen.getByRole('button', { name: /refresh/i })
      expect(refreshBtn).toBeDisabled()
    })

    it('should show spinner in refresh button while loading', () => {
      render(<HotOpportunitiesStarter {...defaultProps} isLoading />)
      
      const refreshBtn = screen.getByRole('button', { name: /refresh/i })
      expect(within(refreshBtn).getByTestId('loading-spinner')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Error State Tests
  // ============================================================================
  describe('Error State', () => {
    it('should display error message when error prop is set', () => {
      render(<HotOpportunitiesStarter {...defaultProps} error="Failed to load hot deals" />)
      
      expect(screen.getByText('Failed to load hot deals')).toBeInTheDocument()
    })

    it('should show retry button in error state', () => {
      const onRefresh = vi.fn()
      render(<HotOpportunitiesStarter {...defaultProps} error="Error" onRefresh={onRefresh} />)
      
      const retryBtn = screen.getByRole('button', { name: /retry/i })
      fireEvent.click(retryBtn)
      
      expect(onRefresh).toHaveBeenCalledOnce()
    })

    it('should show error icon in error state', () => {
      render(<HotOpportunitiesStarter {...defaultProps} error="Error" />)
      
      expect(screen.getByTestId('error-icon')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Notification Preference Tests
  // ============================================================================
  describe('Notification Preferences', () => {
    it('should show notification toggle when enabled', () => {
      render(<HotOpportunitiesStarter {...defaultProps} showNotificationToggle />)
      
      expect(screen.getByRole('switch', { name: /notifications/i })).toBeInTheDocument()
    })

    it('should call onNotificationToggle when toggling notifications', () => {
      const onNotificationToggle = vi.fn()
      render(
        <HotOpportunitiesStarter 
          {...defaultProps} 
          showNotificationToggle 
          onNotificationToggle={onNotificationToggle}
          notificationsEnabled={false}
        />
      )
      
      const toggle = screen.getByRole('switch', { name: /notifications/i })
      fireEvent.click(toggle)
      
      expect(onNotificationToggle).toHaveBeenCalledWith(true)
    })

    it('should show enabled state when notifications are on', () => {
      render(
        <HotOpportunitiesStarter 
          {...defaultProps} 
          showNotificationToggle 
          notificationsEnabled
        />
      )
      
      const toggle = screen.getByRole('switch', { name: /notifications/i })
      expect(toggle).toBeChecked()
    })
  })

  // ============================================================================
  // Time Display Tests
  // ============================================================================
  describe('Time Display', () => {
    it('should show countdown for expiring deals', () => {
      const hotDeals = [createMockHotDeal({
        id: 'expiring',
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
        expiresWithin24Hours: true,
        priorityScore: 40
      })]
      render(<HotOpportunitiesStarter {...defaultProps} deals={hotDeals} />)

      // Countdown should show hours remaining (could be 5 or 6 depending on timing)
      const countdown = screen.getByTestId('countdown-expiring')
      expect(countdown).toHaveTextContent(/\d+\s*hours?\s*remaining/i)
    })

    it('should show "Expires soon" badge for deals expiring within 6 hours', () => {
      const hotDeals = [createMockHotDeal({ 
        id: 'urgent',
        expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours
        expiresWithin24Hours: true, 
        priorityScore: 40 
      })]
      render(<HotOpportunitiesStarter {...defaultProps} deals={hotDeals} />)
      
      expect(screen.getByText(/expires soon/i)).toBeInTheDocument()
    })

    it('should format relative time correctly', () => {
      const hotDeals = [createMockHotDeal({
        id: 'later',
        expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(), // 20 hours
        expiresWithin24Hours: true,
        priorityScore: 40
      })]
      render(<HotOpportunitiesStarter {...defaultProps} deals={hotDeals} />)

      // Countdown should show hours remaining (could be 19 or 20 depending on timing)
      const countdown = screen.getByTestId('countdown-later')
      expect(countdown).toHaveTextContent(/\d+\s*hours?\s*remaining/i)
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================
  describe('Accessibility', () => {
    it('should have proper ARIA labels on deal cards', () => {
      render(<HotOpportunitiesStarter {...defaultProps} />)
      
      const dealCard = screen.getByTestId('deal-card-expiring-deal')
      expect(dealCard).toHaveAttribute('aria-label')
    })

    it('should announce new hot deals to screen readers', () => {
      render(<HotOpportunitiesStarter {...defaultProps} />)
      
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    })

    it('should be keyboard navigable', () => {
      render(<HotOpportunitiesStarter {...defaultProps} />)
      
      const dealCards = screen.getAllByRole('listitem')
      dealCards.forEach(card => {
        expect(card).toHaveAttribute('tabindex', '0')
      })
    })

    it('should support Enter key to view deal details', () => {
      const onViewDeal = vi.fn()
      render(<HotOpportunitiesStarter {...defaultProps} onViewDeal={onViewDeal} />)
      
      const dealCard = screen.getByTestId('deal-card-expiring-deal')
      fireEvent.keyDown(dealCard, { key: 'Enter' })
      
      expect(onViewDeal).toHaveBeenCalledWith('expiring-deal')
    })

    it('should have focus trap in modal mode', () => {
      render(<HotOpportunitiesStarter {...defaultProps} modal />)
      
      const container = screen.getByTestId('hot-opportunities-container')
      expect(container).toHaveAttribute('role', 'dialog')
      expect(container).toHaveAttribute('aria-modal', 'true')
    })
  })

  // ============================================================================
  // Compact Mode Tests
  // ============================================================================
  describe('Compact Mode', () => {
    it('should render in compact mode when prop is set', () => {
      render(<HotOpportunitiesStarter {...defaultProps} compact />)
      
      const container = screen.getByTestId('hot-opportunities-container')
      expect(container).toHaveClass('compact')
    })

    it('should show abbreviated route in compact mode', () => {
      render(<HotOpportunitiesStarter {...defaultProps} compact />)

      // Should show TEB → LAS instead of KTEB → KLAS (multiple deal cards have routes)
      const routes = screen.getAllByText(/TEB.*→.*LAS/)
      expect(routes.length).toBeGreaterThan(0)
      // Full ICAO codes should not appear
      expect(screen.queryByText(/KTEB.*→.*KLAS/)).not.toBeInTheDocument()
    })

    it('should hide extended deal info in compact mode', () => {
      render(<HotOpportunitiesStarter {...defaultProps} compact />)
      
      // Hot reasons should be hidden in compact mode
      expect(screen.queryByText('Expires within 24 hours')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Max Display Tests
  // ============================================================================
  describe('Max Display Limit', () => {
    it('should limit displayed deals when maxDisplay is set', () => {
      render(<HotOpportunitiesStarter {...defaultProps} maxDisplay={2} />)
      
      const list = screen.getByRole('list')
      const items = within(list).getAllByRole('listitem')
      expect(items).toHaveLength(2)
    })

    it('should show "View more" link when more deals available', () => {
      render(<HotOpportunitiesStarter {...defaultProps} maxDisplay={2} />)
      
      expect(screen.getByText(/view more/i)).toBeInTheDocument()
    })

    it('should show total count when limited', () => {
      const hotDeals = createHotDeals().filter(d => d.priorityScore > 0)
      render(<HotOpportunitiesStarter {...defaultProps} deals={hotDeals} maxDisplay={2} />)
      
      expect(screen.getByText(new RegExp(`${hotDeals.length}.*total`))).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Real-time Connection Tests
  // ============================================================================
  describe('Connection Status', () => {
    it('should show connection status indicator when provided', () => {
      render(<HotOpportunitiesStarter {...defaultProps} connectionStatus="connected" />)
      
      expect(screen.getByTestId('connection-status')).toBeInTheDocument()
      expect(screen.getByText('Live')).toBeInTheDocument()
    })

    it('should show connecting status with spinner', () => {
      render(<HotOpportunitiesStarter {...defaultProps} connectionStatus="connecting" />)
      
      expect(screen.getByText('Connecting')).toBeInTheDocument()
    })

    it('should show disconnected status', () => {
      render(<HotOpportunitiesStarter {...defaultProps} connectionStatus="disconnected" />)
      
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Summary Stats Tests
  // ============================================================================
  describe('Summary Stats', () => {
    it('should show total hot deals value', () => {
      render(<HotOpportunitiesStarter {...defaultProps} />)
      
      expect(screen.getByTestId('hot-value-summary')).toBeInTheDocument()
    })

    it('should show expiring deals count', () => {
      render(<HotOpportunitiesStarter {...defaultProps} />)
      
      expect(screen.getByTestId('expiring-count')).toHaveTextContent('1')
    })

    it('should show average deal value', () => {
      render(<HotOpportunitiesStarter {...defaultProps} />)
      
      expect(screen.getByTestId('avg-value')).toBeInTheDocument()
    })
  })
})
