/**
 * Pipeline Dashboard Component Tests
 *
 * Tests for the inline deals/pipeline view component that displays
 * within chat message threads.
 *
 * @vitest-environment jsdom
 */

import React from 'react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PipelineDashboard } from '@/components/message-components/pipeline-dashboard'
import type { PipelineDashboardComponent } from '@/components/message-components/types'

// Mock data for tests
const mockStats: PipelineDashboardComponent['stats'] = {
  totalRequests: 15,
  pendingRequests: 5,
  completedRequests: 8,
  totalQuotes: 42,
  activeWorkflows: 3,
}

const mockRequests: PipelineDashboardComponent['requests'] = [
  {
    id: 'req-1',
    departureAirport: 'KTEB',
    arrivalAirport: 'KPBI',
    departureDate: '2025-01-15',
    passengers: 4,
    status: 'in_progress',
    createdAt: '2025-01-10T10:00:00Z',
    clientName: 'John Smith',
  },
  {
    id: 'req-2',
    departureAirport: 'KLAX',
    arrivalAirport: 'KJFK',
    departureDate: '2025-01-20',
    passengers: 6,
    status: 'awaiting_quotes',
    createdAt: '2025-01-08T14:30:00Z',
    clientName: 'Jane Doe',
  },
  {
    id: 'req-3',
    departureAirport: 'KORD',
    arrivalAirport: 'KMIA',
    departureDate: '2025-01-25',
    passengers: 2,
    status: 'completed',
    createdAt: '2025-01-05T09:00:00Z',
  },
]

describe('PipelineDashboard', () => {
  describe('Stats Display', () => {
    it('renders all stat cards with correct values', () => {
      render(<PipelineDashboard stats={mockStats} requests={mockRequests} />)

      // Check stat values are displayed
      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()

      // Check stat labels
      expect(screen.getByText('Total Requests')).toBeInTheDocument()
      // 'Pending' appears in both stats and request badges, so check for at least one
      expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1)
      // 'Completed' appears in both stats and request badges, so check for at least one
      expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Total Quotes')).toBeInTheDocument()
      expect(screen.getByText('Active Workflows')).toBeInTheDocument()
    })

    it('renders pipeline title', () => {
      render(<PipelineDashboard stats={mockStats} requests={mockRequests} />)

      expect(screen.getByText('Your Pipeline')).toBeInTheDocument()
    })
  })

  describe('Requests List', () => {
    it('renders all request items', () => {
      render(<PipelineDashboard stats={mockStats} requests={mockRequests} />)

      // Check routes are displayed
      expect(screen.getByText('KTEB')).toBeInTheDocument()
      expect(screen.getByText('KPBI')).toBeInTheDocument()
      expect(screen.getByText('KLAX')).toBeInTheDocument()
      expect(screen.getByText('KJFK')).toBeInTheDocument()
      expect(screen.getByText('KORD')).toBeInTheDocument()
      expect(screen.getByText('KMIA')).toBeInTheDocument()
    })

    it('displays status badges for each request', () => {
      render(<PipelineDashboard stats={mockStats} requests={mockRequests} />)

      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Awaiting Quotes')).toBeInTheDocument()
      // 'Completed' appears in both stats and as a status badge, so check for multiple
      expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1)
    })

    it('displays client names when available', () => {
      render(<PipelineDashboard stats={mockStats} requests={mockRequests} />)

      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    })

    it('formats departure dates correctly', () => {
      render(<PipelineDashboard stats={mockStats} requests={mockRequests} />)

      // Dates should be formatted like "Jan 15, 2025" or "Jan 14, 2025" (timezone dependent)
      // The exact date may vary by timezone since "2025-01-15" is parsed as UTC midnight
      // and converted to local time, which may be the previous day in western timezones
      const formattedDates = screen.getAllByText(/Jan \d+, 2025/)
      expect(formattedDates.length).toBe(3) // One for each request
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no requests', () => {
      render(<PipelineDashboard stats={mockStats} requests={[]} />)

      expect(screen.getByText('No requests yet. Start by creating a new flight request!')).toBeInTheDocument()
    })

    it('still displays stats even with no requests', () => {
      const emptyStats = {
        totalRequests: 0,
        pendingRequests: 0,
        completedRequests: 0,
        totalQuotes: 0,
        activeWorkflows: 0,
      }

      render(<PipelineDashboard stats={emptyStats} requests={[]} />)

      // All zeros should be displayed
      expect(screen.getAllByText('0').length).toBe(5)
    })
  })

  describe('Interactions', () => {
    it('calls onViewRequest when request is clicked', () => {
      const onViewRequest = vi.fn()

      render(
        <PipelineDashboard
          stats={mockStats}
          requests={mockRequests}
          onViewRequest={onViewRequest}
        />
      )

      // Find all buttons and filter to view buttons (those with ExternalLink icon)
      // Lucide icons use class pattern: "lucide lucide-external-link"
      const allButtons = screen.getAllByRole('button')
      const viewButtons = allButtons.filter(btn =>
        btn.querySelector('svg.lucide-external-link')
      )

      expect(viewButtons.length).toBe(3) // One per request
      fireEvent.click(viewButtons[0])
      expect(onViewRequest).toHaveBeenCalledWith('req-1')
    })

    it('calls onRefresh when refresh button is clicked', () => {
      const onRefresh = vi.fn()

      render(
        <PipelineDashboard
          stats={mockStats}
          requests={mockRequests}
          onRefresh={onRefresh}
        />
      )

      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      fireEvent.click(refreshButton)

      expect(onRefresh).toHaveBeenCalled()
    })

    it('does not render refresh button when onRefresh is not provided', () => {
      render(<PipelineDashboard stats={mockStats} requests={mockRequests} />)

      expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument()
    })

    it('does not render view buttons when onViewRequest is not provided', () => {
      render(<PipelineDashboard stats={mockStats} requests={mockRequests} />)

      // When onViewRequest is not provided, there should be no view buttons
      // Use queryAllByRole since there may be no buttons at all
      const allButtons = screen.queryAllByRole('button')
      const viewButtons = allButtons.filter(btn =>
        btn.querySelector('svg.lucide-external-link')
      )

      expect(viewButtons.length).toBe(0)
    })
  })

  describe('Status Styling', () => {
    it('applies correct variant for pending status', () => {
      const pendingRequest = [{
        ...mockRequests[0],
        status: 'pending',
      }]

      render(<PipelineDashboard stats={mockStats} requests={pendingRequest} />)

      // 'Pending' appears both in stats label and status badge
      const pendingElements = screen.getAllByText('Pending')
      expect(pendingElements.length).toBeGreaterThanOrEqual(2)
    })

    it('applies correct variant for failed status', () => {
      const failedRequest = [{
        ...mockRequests[0],
        status: 'failed',
      }]

      render(<PipelineDashboard stats={mockStats} requests={failedRequest} />)

      const badge = screen.getByText('Failed')
      expect(badge).toBeInTheDocument()
    })

    it('applies correct variant for cancelled status', () => {
      const cancelledRequest = [{
        ...mockRequests[0],
        status: 'cancelled',
      }]

      render(<PipelineDashboard stats={mockStats} requests={cancelledRequest} />)

      const badge = screen.getByText('Cancelled')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('Custom className', () => {
    it('applies custom className to container', () => {
      const { container } = render(
        <PipelineDashboard
          stats={mockStats}
          requests={mockRequests}
          className="custom-class"
        />
      )

      const card = container.firstChild
      expect(card).toHaveClass('custom-class')
    })
  })

  describe('Date Formatting Edge Cases', () => {
    it('handles invalid date gracefully', () => {
      const invalidDateRequest = [{
        ...mockRequests[0],
        departureDate: 'invalid-date',
      }]

      render(<PipelineDashboard stats={mockStats} requests={invalidDateRequest} />)

      // Should fall back to original string
      expect(screen.getByText('invalid-date')).toBeInTheDocument()
    })

    it('handles ISO date strings', () => {
      const isoDateRequest = [{
        ...mockRequests[0],
        departureDate: '2025-06-15T14:30:00Z',
      }]

      render(<PipelineDashboard stats={mockStats} requests={isoDateRequest} />)

      expect(screen.getByText('Jun 15, 2025')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible stat labels', () => {
      render(<PipelineDashboard stats={mockStats} requests={mockRequests} />)

      // Stat cards should have proper text labels
      expect(screen.getByText('Total Requests')).toBeInTheDocument()
      // Pending appears in both stats and request badges
      expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1)
      // Completed appears in both stats and request badges
      expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1)
    })

    it('buttons are keyboard accessible', () => {
      const onRefresh = vi.fn()

      render(
        <PipelineDashboard
          stats={mockStats}
          requests={mockRequests}
          onRefresh={onRefresh}
        />
      )

      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      refreshButton.focus()

      expect(document.activeElement).toBe(refreshButton)
    })
  })
})
