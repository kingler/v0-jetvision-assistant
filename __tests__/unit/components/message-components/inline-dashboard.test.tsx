/**
 * Inline Dashboard Component Tests
 *
 * Tests for the comprehensive deal pipeline dashboard that displays
 * within chat message threads with analytics and hot opportunities.
 *
 * @vitest-environment jsdom
 */

import React from 'react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InlineDashboard } from '@/components/message-components/inline-dashboard'
import { DealPipelineTracker } from '@/components/message-components/deal-pipeline-tracker'
import { AnalyticsSummaryCard } from '@/components/message-components/analytics-summary-card'
import { HotOpportunities } from '@/components/message-components/hot-opportunities'
import type {
  DealPipelineStage,
  AnalyticsSummary,
  PerformanceMetricsData,
  HotOpportunity,
} from '@/components/message-components/types'

// Mock data for tests
const mockPipeline: DealPipelineStage[] = [
  { id: 'new', name: 'New Request', shortName: 'New', count: 3, value: 150000, status: 'completed', order: 1 },
  { id: 'rfp', name: 'RFP Sent', shortName: 'RFP', count: 4, value: 200000, status: 'completed', order: 2 },
  { id: 'quotes', name: 'Quotes Received', shortName: 'Quotes', count: 5, value: 280000, status: 'active', order: 3 },
  { id: 'proposal', name: 'Proposal Sent', shortName: 'Proposal', count: 1, value: 45000, status: 'pending', order: 4 },
  { id: 'booked', name: 'Booking Confirmed', shortName: 'Booked', count: 2, value: 120000, status: 'pending', order: 5 },
]

const mockAnalytics: AnalyticsSummary = {
  successRate: 72,
  conversionRate: 45,
  avgDealValue: 45000,
  avgTimeToClose: 4.2,
  totalDeals: 15,
  periodComparison: {
    successRateDelta: 5.2,
    conversionDelta: -2.1,
    valueDelta: 12.5,
    timeToCloseDelta: -0.5,
  },
}

const mockMetrics: PerformanceMetricsData = {
  activeRequests: 15,
  pendingQuotes: 8,
  hotOpportunities: 3,
  closedDealsValue: 850000,
  avgResponseTime: 4.5,
}

const mockHotOpportunities: HotOpportunity[] = [
  {
    id: 'hot-1',
    departureAirport: 'KJFK',
    arrivalAirport: 'EGLL',
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
    value: 125000,
    currency: 'USD',
    clientName: 'Acme Corp',
    urgencyLevel: 'critical',
  },
  {
    id: 'hot-2',
    departureAirport: 'KLAX',
    arrivalAirport: 'LFPG',
    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
    value: 98000,
    currency: 'USD',
    urgencyLevel: 'high',
  },
  {
    id: 'hot-3',
    departureAirport: 'KTEB',
    arrivalAirport: 'EGGW',
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
    value: 87000,
    currency: 'USD',
    clientName: 'Tech Industries',
    urgencyLevel: 'medium',
  },
]

describe('InlineDashboard', () => {
  describe('Rendering', () => {
    it('renders the dashboard title', () => {
      render(
        <InlineDashboard
          pipeline={mockPipeline}
          analytics={mockAnalytics}
          metrics={mockMetrics}
          hotOpportunities={mockHotOpportunities}
        />
      )

      expect(screen.getByText('Your Deal Pipeline')).toBeInTheDocument()
    })

    it('renders period selector buttons', () => {
      render(
        <InlineDashboard
          pipeline={mockPipeline}
          analytics={mockAnalytics}
          metrics={mockMetrics}
          hotOpportunities={mockHotOpportunities}
        />
      )

      expect(screen.getByText('7 Days')).toBeInTheDocument()
      // 30 Days appears twice (desktop button + mobile dropdown)
      expect(screen.getAllByText('30 Days').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('90 Days')).toBeInTheDocument()
      expect(screen.getByText('YTD')).toBeInTheDocument()
    })

    it('renders pipeline stages section', () => {
      render(
        <InlineDashboard
          pipeline={mockPipeline}
          analytics={mockAnalytics}
          metrics={mockMetrics}
          hotOpportunities={mockHotOpportunities}
        />
      )

      expect(screen.getByText('Pipeline Stages')).toBeInTheDocument()
    })

    it('renders analytics section', () => {
      render(
        <InlineDashboard
          pipeline={mockPipeline}
          analytics={mockAnalytics}
          metrics={mockMetrics}
          hotOpportunities={mockHotOpportunities}
        />
      )

      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })

    it('renders hot opportunities section', () => {
      render(
        <InlineDashboard
          pipeline={mockPipeline}
          analytics={mockAnalytics}
          metrics={mockMetrics}
          hotOpportunities={mockHotOpportunities}
        />
      )

      expect(screen.getByText('Hot Opportunities')).toBeInTheDocument()
    })

    it('renders quick stats footer', () => {
      render(
        <InlineDashboard
          pipeline={mockPipeline}
          analytics={mockAnalytics}
          metrics={mockMetrics}
          hotOpportunities={mockHotOpportunities}
        />
      )

      expect(screen.getByText('Active Requests')).toBeInTheDocument()
      expect(screen.getByText('Pending Quotes')).toBeInTheDocument()
      expect(screen.getByText('Avg Response')).toBeInTheDocument()
      expect(screen.getByText('Closed Value')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('calls onRefresh when refresh button is clicked', async () => {
      const onRefresh = vi.fn()

      render(
        <InlineDashboard
          pipeline={mockPipeline}
          analytics={mockAnalytics}
          metrics={mockMetrics}
          hotOpportunities={mockHotOpportunities}
          onRefresh={onRefresh}
        />
      )

      // Find the refresh button (it's the one without text, just the icon)
      const buttons = screen.getAllByRole('button')
      const refreshButton = buttons.find(btn =>
        btn.querySelector('svg.lucide-refresh-cw')
      )

      expect(refreshButton).toBeDefined()
      if (refreshButton) {
        fireEvent.click(refreshButton)
        expect(onRefresh).toHaveBeenCalled()
      }
    })

    it('calls onPeriodChange when period button is clicked', () => {
      const onPeriodChange = vi.fn()

      render(
        <InlineDashboard
          pipeline={mockPipeline}
          analytics={mockAnalytics}
          metrics={mockMetrics}
          hotOpportunities={mockHotOpportunities}
          onPeriodChange={onPeriodChange}
        />
      )

      const sevenDaysButton = screen.getByText('7 Days')
      fireEvent.click(sevenDaysButton)

      expect(onPeriodChange).toHaveBeenCalledWith('7d')
    })
  })

  describe('Date Range', () => {
    it('displays date range label when provided', () => {
      render(
        <InlineDashboard
          pipeline={mockPipeline}
          analytics={mockAnalytics}
          metrics={mockMetrics}
          hotOpportunities={mockHotOpportunities}
          dateRange={{
            start: '2025-01-01',
            end: '2025-01-31',
            label: 'January 2025',
          }}
        />
      )

      expect(screen.getByText('January 2025')).toBeInTheDocument()
    })
  })

  describe('Custom className', () => {
    it('applies custom className to container', () => {
      const { container } = render(
        <InlineDashboard
          pipeline={mockPipeline}
          analytics={mockAnalytics}
          metrics={mockMetrics}
          hotOpportunities={mockHotOpportunities}
          className="custom-class"
        />
      )

      const card = container.firstChild
      expect(card).toHaveClass('custom-class')
    })
  })
})

describe('DealPipelineTracker', () => {
  describe('Rendering', () => {
    it('renders all pipeline stages', () => {
      render(<DealPipelineTracker stages={mockPipeline} />)

      // Check short names are visible (desktop view)
      expect(screen.getByText('New')).toBeInTheDocument()
      expect(screen.getByText('RFP')).toBeInTheDocument()
      expect(screen.getByText('Quotes')).toBeInTheDocument()
      expect(screen.getByText('Proposal')).toBeInTheDocument()
      expect(screen.getByText('Booked')).toBeInTheDocument()
    })

    it('displays count badges for each stage', () => {
      render(<DealPipelineTracker stages={mockPipeline} />)

      // Each count appears twice (desktop and mobile views)
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Interactions', () => {
    it('calls onStageClick when a stage is clicked', () => {
      const onStageClick = vi.fn()

      render(<DealPipelineTracker stages={mockPipeline} onStageClick={onStageClick} />)

      const newStage = screen.getByText('New')
      fireEvent.click(newStage)

      expect(onStageClick).toHaveBeenCalledWith('new')
    })
  })
})

describe('AnalyticsSummaryCard', () => {
  describe('Rendering', () => {
    it('renders success rate', () => {
      render(<AnalyticsSummaryCard analytics={mockAnalytics} />)

      expect(screen.getByText('72%')).toBeInTheDocument()
      expect(screen.getByText('Success Rate')).toBeInTheDocument()
    })

    it('renders conversion rate', () => {
      render(<AnalyticsSummaryCard analytics={mockAnalytics} />)

      expect(screen.getByText('45%')).toBeInTheDocument()
      expect(screen.getByText('Conversion')).toBeInTheDocument()
    })

    it('renders average deal value', () => {
      render(<AnalyticsSummaryCard analytics={mockAnalytics} />)

      expect(screen.getByText('$45K')).toBeInTheDocument()
      expect(screen.getByText('Avg Value')).toBeInTheDocument()
    })

    it('renders time to close', () => {
      render(<AnalyticsSummaryCard analytics={mockAnalytics} />)

      expect(screen.getByText('4.2d')).toBeInTheDocument()
      expect(screen.getByText('Time to Close')).toBeInTheDocument()
    })

    it('displays total deals count', () => {
      render(<AnalyticsSummaryCard analytics={mockAnalytics} />)

      expect(screen.getByText('15 total deals')).toBeInTheDocument()
    })

    it('shows positive trend indicators', () => {
      render(<AnalyticsSummaryCard analytics={mockAnalytics} />)

      // Success rate has +5.2% delta
      expect(screen.getByText('+5.2%')).toBeInTheDocument()
    })

    it('shows negative trend indicators', () => {
      render(<AnalyticsSummaryCard analytics={mockAnalytics} />)

      // Conversion has -2.1% delta
      expect(screen.getByText('-2.1%')).toBeInTheDocument()
    })
  })
})

describe('HotOpportunities', () => {
  describe('Rendering', () => {
    it('renders hot opportunities title', () => {
      render(<HotOpportunities opportunities={mockHotOpportunities} />)

      expect(screen.getByText('Hot Opportunities')).toBeInTheDocument()
    })

    it('renders opportunity count badge', () => {
      render(<HotOpportunities opportunities={mockHotOpportunities} />)

      // Badge should show count of opportunities
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('renders airport routes for each opportunity', () => {
      render(<HotOpportunities opportunities={mockHotOpportunities} />)

      expect(screen.getByText('KJFK')).toBeInTheDocument()
      expect(screen.getByText('EGLL')).toBeInTheDocument()
      expect(screen.getByText('KLAX')).toBeInTheDocument()
      expect(screen.getByText('LFPG')).toBeInTheDocument()
      expect(screen.getByText('KTEB')).toBeInTheDocument()
      expect(screen.getByText('EGGW')).toBeInTheDocument()
    })

    it('renders opportunity values', () => {
      render(<HotOpportunities opportunities={mockHotOpportunities} />)

      expect(screen.getByText('$125,000')).toBeInTheDocument()
      expect(screen.getByText('$98,000')).toBeInTheDocument()
      expect(screen.getByText('$87,000')).toBeInTheDocument()
    })

    it('renders client names when available', () => {
      render(<HotOpportunities opportunities={mockHotOpportunities} />)

      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      expect(screen.getByText('Tech Industries')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('shows empty state message when no opportunities', () => {
      render(<HotOpportunities opportunities={[]} />)

      expect(screen.getByText('No hot opportunities at the moment')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('calls onViewOpportunity when opportunity is clicked', () => {
      const onViewOpportunity = vi.fn()

      render(
        <HotOpportunities
          opportunities={mockHotOpportunities}
          onViewOpportunity={onViewOpportunity}
        />
      )

      const firstOpportunity = screen.getByText('KJFK').closest('[class*="cursor-pointer"]')
      if (firstOpportunity) {
        fireEvent.click(firstOpportunity)
        expect(onViewOpportunity).toHaveBeenCalledWith('hot-1')
      }
    })

    it('shows View All button when more than maxDisplay', () => {
      const manyOpportunities = [
        ...mockHotOpportunities,
        {
          id: 'hot-4',
          departureAirport: 'KORD',
          arrivalAirport: 'KDEN',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          value: 65000,
          currency: 'USD',
          urgencyLevel: 'medium' as const,
        },
      ]

      render(
        <HotOpportunities
          opportunities={manyOpportunities}
          maxDisplay={3}
          onViewAll={() => {}}
        />
      )

      expect(screen.getByText('View All')).toBeInTheDocument()
      expect(screen.getByText('+1 more opportunities')).toBeInTheDocument()
    })
  })

  describe('Max Display', () => {
    it('respects maxDisplay prop', () => {
      render(
        <HotOpportunities
          opportunities={mockHotOpportunities}
          maxDisplay={2}
        />
      )

      // Should only show 2 opportunities
      expect(screen.getByText('KJFK')).toBeInTheDocument()
      expect(screen.getByText('KLAX')).toBeInTheDocument()
      expect(screen.queryByText('KTEB')).not.toBeInTheDocument()
    })
  })
})
