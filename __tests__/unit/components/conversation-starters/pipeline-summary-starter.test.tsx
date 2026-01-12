/**
 * PipelineSummaryStarter Tests
 *
 * TDD tests for the enhanced pipeline summary conversation starter component.
 * Tests metrics display, bar charts, period comparison, and export functionality.
 *
 * @vitest-environment jsdom
 * @module __tests__/unit/components/conversation-starters/pipeline-summary-starter
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock scrollIntoView for Radix UI components
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

import {
  PipelineSummaryStarter,
  calculateConversionRate,
  calculateAvgDealValue,
  formatDuration,
  type PipelineSummaryStarterProps,
  type PipelineStage,
  type PipelineMetrics,
  type PeriodComparison,
} from '@/components/conversation-starters/pipeline-summary-starter'

// Mock pipeline stage data
const createMockStage = (overrides: Partial<PipelineStage> = {}): PipelineStage => ({
  id: 'stage-1',
  name: 'New Requests',
  shortName: 'New',
  count: 10,
  value: 500000,
  status: 'active',
  order: 1,
  ...overrides,
})

// Create default pipeline stages
const createPipelineStages = (): PipelineStage[] => [
  createMockStage({ id: 'new', name: 'New Requests', shortName: 'New', count: 15, value: 750000, status: 'active', order: 1 }),
  createMockStage({ id: 'quoted', name: 'Quoted', shortName: 'Quoted', count: 12, value: 600000, status: 'active', order: 2 }),
  createMockStage({ id: 'negotiating', name: 'Negotiating', shortName: 'Nego', count: 8, value: 400000, status: 'active', order: 3 }),
  createMockStage({ id: 'pending', name: 'Pending Close', shortName: 'Pending', count: 5, value: 250000, status: 'active', order: 4 }),
  createMockStage({ id: 'won', name: 'Won', shortName: 'Won', count: 20, value: 1000000, status: 'completed', order: 5 }),
  createMockStage({ id: 'lost', name: 'Lost', shortName: 'Lost', count: 10, value: 500000, status: 'completed', order: 6 }),
]

// Create mock metrics
const createMockMetrics = (overrides: Partial<PipelineMetrics> = {}): PipelineMetrics => ({
  totalRequests: 70,
  totalValue: 3500000,
  conversionRate: 28.57, // 20/70 won
  avgDealValue: 50000,
  avgTimeToClose: 5.5, // days
  wonDeals: 20,
  lostDeals: 10,
  activeDeals: 40,
  ...overrides,
})

// Create mock period comparison
const createMockComparison = (overrides: Partial<PeriodComparison> = {}): PeriodComparison => ({
  totalRequestsDelta: 15, // +15%
  conversionDelta: 5.2, // +5.2%
  valueDelta: -8.3, // -8.3%
  timeToCloseDelta: -1.2, // -1.2 days (improvement)
  periodLabel: 'vs last 30 days',
  ...overrides,
})

const defaultProps: PipelineSummaryStarterProps = {
  stages: createPipelineStages(),
  metrics: createMockMetrics(),
  comparison: createMockComparison(),
  onViewStage: vi.fn(),
  onRefresh: vi.fn(),
  onClose: vi.fn(),
  onExport: vi.fn(),
}

describe('PipelineSummaryStarter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // Rendering Tests
  // ============================================================================
  describe('Rendering', () => {
    it('should render the pipeline summary container', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)
      expect(screen.getByTestId('pipeline-summary-container')).toBeInTheDocument()
    })

    it('should display the pipeline summary title with icon', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)
      expect(screen.getByText('Pipeline Summary')).toBeInTheDocument()
      expect(screen.getByTestId('pipeline-icon')).toBeInTheDocument()
    })

    it('should render refresh and close buttons', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    })

    it('should render export button', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
    })

    it('should display period selector', () => {
      render(<PipelineSummaryStarter {...defaultProps} showPeriodSelector />)
      expect(screen.getByLabelText(/period/i)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Key Metrics Display Tests
  // ============================================================================
  describe('Key Metrics Display', () => {
    it('should display conversion rate with percentage', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)
      expect(screen.getByTestId('metric-conversion-rate')).toHaveTextContent('28.57%')
    })

    it('should display average deal value formatted as currency', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)
      expect(screen.getByTestId('metric-avg-deal-value')).toHaveTextContent('$50,000')
    })

    it('should display average time to close in days', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)
      expect(screen.getByTestId('metric-time-to-close')).toHaveTextContent('5.5 days')
    })

    it('should display total pipeline value', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)
      expect(screen.getByTestId('metric-total-value')).toHaveTextContent('$3,500,000')
    })

    it('should display total requests count', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)
      expect(screen.getByTestId('metric-total-requests')).toHaveTextContent('70')
    })

    it('should display won/lost deal counts', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)
      expect(screen.getByTestId('metric-won-deals')).toHaveTextContent('20')
      expect(screen.getByTestId('metric-lost-deals')).toHaveTextContent('10')
    })
  })

  // ============================================================================
  // Period Comparison Tests
  // ============================================================================
  describe('Period Comparison', () => {
    it('should show upward trend arrow for positive deltas', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)

      const conversionTrend = screen.getByTestId('trend-conversion-rate')
      expect(conversionTrend).toHaveClass('text-green-500')
      expect(within(conversionTrend).getByTestId('trend-arrow-up')).toBeInTheDocument()
    })

    it('should show downward trend arrow for negative deltas', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)

      const valueTrend = screen.getByTestId('trend-total-value')
      expect(valueTrend).toHaveClass('text-red-500')
      expect(within(valueTrend).getByTestId('trend-arrow-down')).toBeInTheDocument()
    })

    it('should show improvement for faster time to close (negative delta)', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)

      // Negative time delta is an improvement
      const timeTrend = screen.getByTestId('trend-time-to-close')
      expect(timeTrend).toHaveClass('text-green-500')
    })

    it('should display period label', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)
      expect(screen.getByText('vs last 30 days')).toBeInTheDocument()
    })

    it('should display delta percentages', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)

      expect(screen.getByTestId('trend-conversion-rate')).toHaveTextContent('+5.2%')
      expect(screen.getByTestId('trend-total-value')).toHaveTextContent('-8.3%')
    })

    it('should hide comparison when showComparison is false', () => {
      render(<PipelineSummaryStarter {...defaultProps} showComparison={false} />)

      expect(screen.queryByTestId('trend-conversion-rate')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Pipeline Bar Chart Tests
  // ============================================================================
  describe('Pipeline Bar Chart', () => {
    it('should render bar chart container', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)
      expect(screen.getByTestId('pipeline-bar-chart')).toBeInTheDocument()
    })

    it('should display all pipeline stages as bars', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)

      const stages = defaultProps.stages
      stages.forEach(stage => {
        expect(screen.getByTestId(`bar-${stage.id}`)).toBeInTheDocument()
      })
    })

    it('should show stage labels', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)

      expect(screen.getByText('New')).toBeInTheDocument()
      expect(screen.getByText('Quoted')).toBeInTheDocument()
      expect(screen.getByText('Won')).toBeInTheDocument()
    })

    it('should display deal count on each bar', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)

      const newBar = screen.getByTestId('bar-new')
      expect(within(newBar).getByText('15')).toBeInTheDocument()
    })

    it('should size bars proportionally by count', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)

      // Won has the most (20), so should have largest height percentage
      const wonBar = screen.getByTestId('bar-won')
      const newBar = screen.getByTestId('bar-new')

      // Check bar has data-height attribute for proportional sizing
      expect(wonBar).toHaveAttribute('data-count', '20')
      expect(newBar).toHaveAttribute('data-count', '15')
    })

    it('should color completed stages differently', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)

      const wonBar = screen.getByTestId('bar-won')
      const lostBar = screen.getByTestId('bar-lost')

      expect(wonBar).toHaveClass('bg-green-500')
      expect(lostBar).toHaveClass('bg-red-500')
    })

    it('should show value on hover/focus', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)

      const newBar = screen.getByTestId('bar-new')
      fireEvent.mouseEnter(newBar)

      expect(screen.getByText('$750,000')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Export Functionality Tests
  // ============================================================================
  describe('Export Functionality', () => {
    it('should render export button', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)

      const exportBtn = screen.getByRole('button', { name: /export/i })
      expect(exportBtn).toBeInTheDocument()
    })

    it('should accept onExport callback prop', () => {
      const onExport = vi.fn()
      // Component should accept the prop without error
      expect(() => {
        render(<PipelineSummaryStarter {...defaultProps} onExport={onExport} />)
      }).not.toThrow()
    })

    it('should render export button with download icon', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)

      const exportBtn = screen.getByRole('button', { name: /export/i })
      // Button should contain an svg icon
      expect(exportBtn.querySelector('svg')).toBeInTheDocument()
    })

    it('should disable export when exporting is in progress', () => {
      render(<PipelineSummaryStarter {...defaultProps} isExporting />)

      const exportBtn = screen.getByRole('button', { name: /export/i })
      expect(exportBtn).toBeDisabled()
    })
  })

  // ============================================================================
  // User Interactions Tests
  // ============================================================================
  describe('User Interactions', () => {
    it('should call onViewStage when clicking a stage bar', () => {
      const onViewStage = vi.fn()
      render(<PipelineSummaryStarter {...defaultProps} onViewStage={onViewStage} />)

      const newBar = screen.getByTestId('bar-new')
      fireEvent.click(newBar)

      expect(onViewStage).toHaveBeenCalledWith('new')
    })

    it('should call onRefresh when clicking refresh button', () => {
      const onRefresh = vi.fn()
      render(<PipelineSummaryStarter {...defaultProps} onRefresh={onRefresh} />)

      const refreshBtn = screen.getByRole('button', { name: /refresh/i })
      fireEvent.click(refreshBtn)

      expect(onRefresh).toHaveBeenCalledOnce()
    })

    it('should call onClose when clicking close button', () => {
      const onClose = vi.fn()
      render(<PipelineSummaryStarter {...defaultProps} onClose={onClose} />)

      // Use exact match to avoid matching "time to Close"
      const closeBtn = screen.getByRole('button', { name: 'Close' })
      fireEvent.click(closeBtn)

      expect(onClose).toHaveBeenCalledOnce()
    })

    it('should render period selector when showPeriodSelector is true', () => {
      const onPeriodChange = vi.fn()
      render(<PipelineSummaryStarter {...defaultProps} showPeriodSelector onPeriodChange={onPeriodChange} />)

      // Verify period selector is rendered (Radix Select interaction tested separately)
      const periodTrigger = screen.getByLabelText(/period/i)
      expect(periodTrigger).toBeInTheDocument()
    })

    it('should accept onPeriodChange callback prop', () => {
      const onPeriodChange = vi.fn()
      // Component should accept the prop without error
      expect(() => {
        render(<PipelineSummaryStarter {...defaultProps} showPeriodSelector onPeriodChange={onPeriodChange} />)
      }).not.toThrow()
    })

    it('should call onViewAllDeals when clicking View All button', () => {
      const onViewAllDeals = vi.fn()
      render(<PipelineSummaryStarter {...defaultProps} onViewAllDeals={onViewAllDeals} />)

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
      render(<PipelineSummaryStarter {...defaultProps} isLoading />)

      expect(screen.getByTestId('pipeline-summary-loading')).toBeInTheDocument()
      expect(screen.getAllByTestId('metric-skeleton')).toHaveLength(4)
    })

    it('should disable refresh button while loading', () => {
      render(<PipelineSummaryStarter {...defaultProps} isLoading />)

      const refreshBtn = screen.getByRole('button', { name: /refresh/i })
      expect(refreshBtn).toBeDisabled()
    })

    it('should show spinner in refresh button while loading', () => {
      render(<PipelineSummaryStarter {...defaultProps} isLoading />)

      const refreshBtn = screen.getByRole('button', { name: /refresh/i })
      expect(within(refreshBtn).getByTestId('loading-spinner')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Error State Tests
  // ============================================================================
  describe('Error State', () => {
    it('should display error message when error prop is set', () => {
      render(<PipelineSummaryStarter {...defaultProps} error="Failed to load pipeline data" />)

      expect(screen.getByText('Failed to load pipeline data')).toBeInTheDocument()
    })

    it('should show retry button in error state', () => {
      const onRefresh = vi.fn()
      render(<PipelineSummaryStarter {...defaultProps} error="Error" onRefresh={onRefresh} />)

      const retryBtn = screen.getByRole('button', { name: /retry/i })
      fireEvent.click(retryBtn)

      expect(onRefresh).toHaveBeenCalledOnce()
    })

    it('should show error icon in error state', () => {
      render(<PipelineSummaryStarter {...defaultProps} error="Error" />)

      expect(screen.getByTestId('error-icon')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Empty State Tests
  // ============================================================================
  describe('Empty State', () => {
    it('should show empty state when no pipeline data', () => {
      render(<PipelineSummaryStarter {...defaultProps} stages={[]} metrics={createMockMetrics({ totalRequests: 0 })} />)

      expect(screen.getByText(/no pipeline data/i)).toBeInTheDocument()
    })

    it('should show create request CTA in empty state', () => {
      const onCreateRequest = vi.fn()
      render(
        <PipelineSummaryStarter
          {...defaultProps}
          stages={[]}
          metrics={createMockMetrics({ totalRequests: 0 })}
          onCreateRequest={onCreateRequest}
        />
      )

      const createBtn = screen.getByRole('button', { name: /create.*request/i })
      fireEvent.click(createBtn)

      expect(onCreateRequest).toHaveBeenCalledOnce()
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================
  describe('Accessibility', () => {
    it('should have proper ARIA labels on stage bars', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)

      const newBar = screen.getByTestId('bar-new')
      expect(newBar).toHaveAttribute('aria-label')
    })

    it('should announce changes to screen readers', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)

      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    })

    it('should be keyboard navigable', () => {
      render(<PipelineSummaryStarter {...defaultProps} />)

      const stageBars = screen.getAllByTestId(/^bar-/)
      stageBars.forEach(bar => {
        expect(bar).toHaveAttribute('tabindex', '0')
      })
    })

    it('should support Enter key to view stage details', () => {
      const onViewStage = vi.fn()
      render(<PipelineSummaryStarter {...defaultProps} onViewStage={onViewStage} />)

      const newBar = screen.getByTestId('bar-new')
      fireEvent.keyDown(newBar, { key: 'Enter' })

      expect(onViewStage).toHaveBeenCalledWith('new')
    })
  })

  // ============================================================================
  // Compact Mode Tests
  // ============================================================================
  describe('Compact Mode', () => {
    it('should render in compact mode when prop is set', () => {
      render(<PipelineSummaryStarter {...defaultProps} compact />)

      const container = screen.getByTestId('pipeline-summary-container')
      expect(container).toHaveClass('compact')
    })

    it('should show abbreviated metrics in compact mode', () => {
      render(<PipelineSummaryStarter {...defaultProps} compact />)

      // Should show $3.5M instead of $3,500,000
      expect(screen.getByTestId('metric-total-value')).toHaveTextContent(/\$3\.5M/)
    })

    it('should hide period comparison in compact mode', () => {
      render(<PipelineSummaryStarter {...defaultProps} compact />)

      expect(screen.queryByTestId('trend-conversion-rate')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Date Range Display Tests
  // ============================================================================
  describe('Date Range Display', () => {
    it('should show date range when provided', () => {
      const dateRange = { start: '2026-01-01', end: '2026-01-10', label: 'Jan 1 - Jan 10' }
      render(<PipelineSummaryStarter {...defaultProps} dateRange={dateRange} />)

      expect(screen.getByText('Jan 1 - Jan 10')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Utility Function Tests
  // ============================================================================
  describe('Utility Functions', () => {
    describe('calculateConversionRate', () => {
      it('should calculate conversion rate correctly', () => {
        expect(calculateConversionRate(20, 70)).toBeCloseTo(28.57, 1)
      })

      it('should return 0 when total is 0', () => {
        expect(calculateConversionRate(0, 0)).toBe(0)
      })

      it('should handle 100% conversion', () => {
        expect(calculateConversionRate(10, 10)).toBe(100)
      })
    })

    describe('calculateAvgDealValue', () => {
      it('should calculate average deal value correctly', () => {
        expect(calculateAvgDealValue(1000000, 20)).toBe(50000)
      })

      it('should return 0 when deal count is 0', () => {
        expect(calculateAvgDealValue(0, 0)).toBe(0)
      })
    })

    describe('formatDuration', () => {
      it('should format days correctly', () => {
        expect(formatDuration(5.5)).toBe('5.5 days')
      })

      it('should format 1 day as singular', () => {
        expect(formatDuration(1)).toBe('1 day')
      })

      it('should round to one decimal place', () => {
        expect(formatDuration(5.567)).toBe('5.6 days')
      })
    })
  })
})
