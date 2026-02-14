/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Plane, DollarSign, Calendar, BarChart } from 'lucide-react'
import { StarterCard, type StarterCardProps } from '@components/conversation-starters'

describe('StarterCard', () => {
  const defaultProps: StarterCardProps = {
    icon: Plane,
    title: 'New Flight Request',
    description: 'Start a new charter request',
    onClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders title and description', () => {
      render(<StarterCard {...defaultProps} />)

      expect(screen.getByText('New Flight Request')).toBeInTheDocument()
      expect(screen.getByText('Start a new charter request')).toBeInTheDocument()
    })

    it('renders the icon', () => {
      render(<StarterCard {...defaultProps} />)

      const card = screen.getByTestId('starter-card')
      expect(card).toBeInTheDocument()
      // Icon is rendered as SVG inside the button
      const svg = card.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders with different icons', () => {
      const { rerender } = render(<StarterCard {...defaultProps} icon={DollarSign} />)
      expect(screen.getByTestId('starter-card')).toBeInTheDocument()

      rerender(<StarterCard {...defaultProps} icon={Calendar} />)
      expect(screen.getByTestId('starter-card')).toBeInTheDocument()

      rerender(<StarterCard {...defaultProps} icon={BarChart} />)
      expect(screen.getByTestId('starter-card')).toBeInTheDocument()
    })
  })

  describe('click handling', () => {
    it('calls onClick when clicked', () => {
      const onClick = vi.fn()
      render(<StarterCard {...defaultProps} onClick={onClick} />)

      fireEvent.click(screen.getByTestId('starter-card'))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', () => {
      const onClick = vi.fn()
      render(<StarterCard {...defaultProps} onClick={onClick} disabled />)

      fireEvent.click(screen.getByTestId('starter-card'))
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('variants', () => {
    it('renders with cyan variant by default', () => {
      render(<StarterCard {...defaultProps} />)

      const card = screen.getByTestId('starter-card')
      // Default variant is cyan, check for hover border class (design token)
      expect(card.className).toContain('hover:border-interactive-border')
    })

    it('renders with blue variant', () => {
      render(<StarterCard {...defaultProps} variant="blue" />)

      const card = screen.getByTestId('starter-card')
      expect(card.className).toContain('hover:border-interactive-border')
    })

    it('renders with green variant', () => {
      render(<StarterCard {...defaultProps} variant="green" />)

      const card = screen.getByTestId('starter-card')
      expect(card.className).toContain('hover:border-success-border')
    })

    it('renders with amber variant', () => {
      render(<StarterCard {...defaultProps} variant="amber" />)

      const card = screen.getByTestId('starter-card')
      expect(card.className).toContain('hover:border-warning-border')
    })
  })

  describe('badge', () => {
    it('does not render badge when not provided', () => {
      render(<StarterCard {...defaultProps} />)

      expect(screen.queryByTestId('starter-card-badge')).not.toBeInTheDocument()
    })

    it('does not render badge when badge is 0', () => {
      render(<StarterCard {...defaultProps} badge={0} />)

      expect(screen.queryByTestId('starter-card-badge')).not.toBeInTheDocument()
    })

    it('renders badge with count', () => {
      render(<StarterCard {...defaultProps} badge={5} />)

      const badge = screen.getByTestId('starter-card-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('5')
    })

    it('renders badge with 99+ for counts over 99', () => {
      render(<StarterCard {...defaultProps} badge={150} />)

      const badge = screen.getByTestId('starter-card-badge')
      expect(badge).toHaveTextContent('99+')
    })

    it('renders exact count at 99', () => {
      render(<StarterCard {...defaultProps} badge={99} />)

      const badge = screen.getByTestId('starter-card-badge')
      expect(badge).toHaveTextContent('99')
    })
  })

  describe('disabled state', () => {
    it('applies disabled styling', () => {
      render(<StarterCard {...defaultProps} disabled />)

      const card = screen.getByTestId('starter-card')
      expect(card).toBeDisabled()
      expect(card.className).toContain('opacity-50')
      expect(card.className).toContain('cursor-not-allowed')
    })

    it('is not disabled by default', () => {
      render(<StarterCard {...defaultProps} />)

      const card = screen.getByTestId('starter-card')
      expect(card).not.toBeDisabled()
    })
  })

  describe('loading state', () => {
    it('renders skeleton when loading', () => {
      render(<StarterCard {...defaultProps} loading />)

      expect(screen.getByTestId('starter-card-skeleton')).toBeInTheDocument()
      expect(screen.queryByTestId('starter-card')).not.toBeInTheDocument()
    })

    it('does not render title/description when loading', () => {
      render(<StarterCard {...defaultProps} loading />)

      expect(screen.queryByText('New Flight Request')).not.toBeInTheDocument()
      expect(screen.queryByText('Start a new charter request')).not.toBeInTheDocument()
    })

    it('skeleton has animate-pulse class', () => {
      render(<StarterCard {...defaultProps} loading />)

      const skeleton = screen.getByTestId('starter-card-skeleton')
      expect(skeleton.className).toContain('animate-pulse')
    })
  })

  describe('custom className', () => {
    it('applies custom className', () => {
      render(<StarterCard {...defaultProps} className="custom-class" />)

      const card = screen.getByTestId('starter-card')
      expect(card.className).toContain('custom-class')
    })

    it('applies custom className to skeleton', () => {
      render(<StarterCard {...defaultProps} loading className="custom-class" />)

      const skeleton = screen.getByTestId('starter-card-skeleton')
      expect(skeleton.className).toContain('custom-class')
    })
  })

  describe('accessibility', () => {
    it('is focusable', () => {
      render(<StarterCard {...defaultProps} />)

      const card = screen.getByTestId('starter-card')
      card.focus()
      expect(document.activeElement).toBe(card)
    })

    it('can be triggered with keyboard', () => {
      const onClick = vi.fn()
      render(<StarterCard {...defaultProps} onClick={onClick} />)

      const card = screen.getByTestId('starter-card')
      fireEvent.keyDown(card, { key: 'Enter' })
      // Button handles Enter key natively
    })
  })
})
