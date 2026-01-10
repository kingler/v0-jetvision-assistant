/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Plane, DollarSign, BarChart3, Flame, ListChecks } from 'lucide-react'
import {
  ConversationStarterHub,
  type ConversationStarter,
  DEFAULT_STARTERS,
  getDefaultStarters,
} from '@components/conversation-starters'

describe('ConversationStarterHub', () => {
  const mockOnClick = vi.fn()

  const testStarters: ConversationStarter[] = [
    {
      id: 'new-flight',
      title: 'New Flight Request',
      description: 'Start a new charter request',
      icon: Plane,
      category: 'flight',
      action: 'new-flight',
      priority: 1,
    },
    {
      id: 'active-requests',
      title: 'Active Requests',
      description: 'View pending requests',
      icon: ListChecks,
      category: 'flight',
      action: 'active-requests',
      priority: 2,
    },
    {
      id: 'show-deals',
      title: 'Show My Deals',
      description: 'View all deals',
      icon: DollarSign,
      category: 'deals',
      action: 'show-deals',
      priority: 1,
    },
    {
      id: 'pipeline',
      title: 'Pipeline Summary',
      description: 'Overview of pipeline',
      icon: BarChart3,
      category: 'pipeline',
      action: 'pipeline',
      priority: 1,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders all starters', () => {
      render(
        <ConversationStarterHub starters={testStarters} onStarterClick={mockOnClick} />
      )

      expect(screen.getByText('New Flight Request')).toBeInTheDocument()
      expect(screen.getByText('Active Requests')).toBeInTheDocument()
      expect(screen.getByText('Show My Deals')).toBeInTheDocument()
      expect(screen.getByText('Pipeline Summary')).toBeInTheDocument()
    })

    it('renders category headers by default', () => {
      render(
        <ConversationStarterHub starters={testStarters} onStarterClick={mockOnClick} />
      )

      expect(screen.getByText('Flight Requests')).toBeInTheDocument()
      expect(screen.getByText('Deals')).toBeInTheDocument()
      expect(screen.getByText('Pipeline')).toBeInTheDocument()
    })

    it('hides category headers when showCategoryHeaders is false', () => {
      render(
        <ConversationStarterHub
          starters={testStarters}
          onStarterClick={mockOnClick}
          showCategoryHeaders={false}
        />
      )

      expect(screen.queryByText('Flight Requests')).not.toBeInTheDocument()
      expect(screen.queryByText('Deals')).not.toBeInTheDocument()
      expect(screen.queryByText('Pipeline')).not.toBeInTheDocument()
    })

    it('renders starter descriptions', () => {
      render(
        <ConversationStarterHub starters={testStarters} onStarterClick={mockOnClick} />
      )

      expect(screen.getByText('Start a new charter request')).toBeInTheDocument()
      expect(screen.getByText('View pending requests')).toBeInTheDocument()
      expect(screen.getByText('View all deals')).toBeInTheDocument()
    })
  })

  describe('category grouping', () => {
    it('groups starters by category', () => {
      render(
        <ConversationStarterHub starters={testStarters} onStarterClick={mockOnClick} />
      )

      const flightCategory = screen.getByTestId('starter-category-flight')
      const dealsCategory = screen.getByTestId('starter-category-deals')
      const pipelineCategory = screen.getByTestId('starter-category-pipeline')

      expect(flightCategory).toBeInTheDocument()
      expect(dealsCategory).toBeInTheDocument()
      expect(pipelineCategory).toBeInTheDocument()
    })

    it('only renders categories with starters', () => {
      const flightOnlyStarters = testStarters.filter((s) => s.category === 'flight')

      render(
        <ConversationStarterHub starters={flightOnlyStarters} onStarterClick={mockOnClick} />
      )

      expect(screen.getByTestId('starter-category-flight')).toBeInTheDocument()
      expect(screen.queryByTestId('starter-category-deals')).not.toBeInTheDocument()
      expect(screen.queryByTestId('starter-category-pipeline')).not.toBeInTheDocument()
    })

    it('maintains category order (flight, deals, pipeline)', () => {
      render(
        <ConversationStarterHub starters={testStarters} onStarterClick={mockOnClick} />
      )

      const hub = screen.getByTestId('starter-hub')
      const categories = hub.querySelectorAll('[data-testid^="starter-category-"]')

      expect(categories[0]).toHaveAttribute('data-testid', 'starter-category-flight')
      expect(categories[1]).toHaveAttribute('data-testid', 'starter-category-deals')
      expect(categories[2]).toHaveAttribute('data-testid', 'starter-category-pipeline')
    })
  })

  describe('click handling', () => {
    it('calls onStarterClick with action and starter when clicked', () => {
      render(
        <ConversationStarterHub starters={testStarters} onStarterClick={mockOnClick} />
      )

      const newFlightCard = screen.getByText('New Flight Request').closest('button')
      fireEvent.click(newFlightCard!)

      expect(mockOnClick).toHaveBeenCalledTimes(1)
      expect(mockOnClick).toHaveBeenCalledWith('new-flight', expect.objectContaining({
        id: 'new-flight',
        title: 'New Flight Request',
        action: 'new-flight',
      }))
    })

    it('handles clicks on different starters', () => {
      render(
        <ConversationStarterHub starters={testStarters} onStarterClick={mockOnClick} />
      )

      const dealsCard = screen.getByText('Show My Deals').closest('button')
      fireEvent.click(dealsCard!)

      expect(mockOnClick).toHaveBeenCalledWith('show-deals', expect.objectContaining({
        id: 'show-deals',
        action: 'show-deals',
      }))
    })
  })

  describe('empty state', () => {
    it('renders empty state when no starters', () => {
      render(
        <ConversationStarterHub starters={[]} onStarterClick={mockOnClick} />
      )

      expect(screen.getByTestId('starter-hub-empty')).toBeInTheDocument()
      expect(screen.getByText('No conversation starters available')).toBeInTheDocument()
    })

    it('does not render hub container when empty', () => {
      render(
        <ConversationStarterHub starters={[]} onStarterClick={mockOnClick} />
      )

      expect(screen.queryByTestId('starter-hub')).not.toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('renders loading skeletons when loading', () => {
      render(
        <ConversationStarterHub
          starters={testStarters}
          onStarterClick={mockOnClick}
          loading
        />
      )

      expect(screen.getByTestId('starter-hub-loading')).toBeInTheDocument()
      expect(screen.queryByTestId('starter-hub')).not.toBeInTheDocument()
    })

    it('renders skeleton cards when loading', () => {
      render(
        <ConversationStarterHub
          starters={testStarters}
          onStarterClick={mockOnClick}
          loading
        />
      )

      const skeletons = screen.getAllByTestId('starter-card-skeleton')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('maxPerCategory', () => {
    it('limits starters per category when maxPerCategory is set', () => {
      render(
        <ConversationStarterHub
          starters={testStarters}
          onStarterClick={mockOnClick}
          maxPerCategory={1}
        />
      )

      // Flight category should only show 1 starter
      expect(screen.getByText('New Flight Request')).toBeInTheDocument()
      expect(screen.queryByText('Active Requests')).not.toBeInTheDocument()
    })

    it('shows all starters when maxPerCategory is 0', () => {
      render(
        <ConversationStarterHub
          starters={testStarters}
          onStarterClick={mockOnClick}
          maxPerCategory={0}
        />
      )

      expect(screen.getByText('New Flight Request')).toBeInTheDocument()
      expect(screen.getByText('Active Requests')).toBeInTheDocument()
    })
  })

  describe('priority ordering', () => {
    it('orders starters by priority within category', () => {
      const priorityStarters: ConversationStarter[] = [
        {
          id: 'low-priority',
          title: 'Low Priority',
          description: 'Description',
          icon: Plane,
          category: 'flight',
          action: 'low',
          priority: 10,
        },
        {
          id: 'high-priority',
          title: 'High Priority',
          description: 'Description',
          icon: Plane,
          category: 'flight',
          action: 'high',
          priority: 1,
        },
      ]

      render(
        <ConversationStarterHub starters={priorityStarters} onStarterClick={mockOnClick} />
      )

      const cards = screen.getAllByTestId('starter-card')
      expect(cards[0]).toHaveTextContent('High Priority')
      expect(cards[1]).toHaveTextContent('Low Priority')
    })
  })

  describe('badges', () => {
    it('passes badge to StarterCard', () => {
      const startersWithBadge: ConversationStarter[] = [
        {
          id: 'with-badge',
          title: 'With Badge',
          description: 'Has a badge',
          icon: Plane,
          category: 'flight',
          action: 'badge',
          badge: 5,
        },
      ]

      render(
        <ConversationStarterHub starters={startersWithBadge} onStarterClick={mockOnClick} />
      )

      expect(screen.getByTestId('starter-card-badge')).toHaveTextContent('5')
    })
  })

  describe('disabled starters', () => {
    it('passes disabled state to StarterCard', () => {
      const disabledStarters: ConversationStarter[] = [
        {
          id: 'disabled',
          title: 'Disabled Starter',
          description: 'This is disabled',
          icon: Plane,
          category: 'flight',
          action: 'disabled',
          disabled: true,
        },
      ]

      render(
        <ConversationStarterHub starters={disabledStarters} onStarterClick={mockOnClick} />
      )

      const card = screen.getByTestId('starter-card')
      expect(card).toBeDisabled()
    })
  })

  describe('custom className', () => {
    it('applies custom className to container', () => {
      render(
        <ConversationStarterHub
          starters={testStarters}
          onStarterClick={mockOnClick}
          className="custom-class"
        />
      )

      const hub = screen.getByTestId('starter-hub')
      expect(hub.className).toContain('custom-class')
    })
  })
})

describe('DEFAULT_STARTERS', () => {
  it('contains expected starters', () => {
    expect(DEFAULT_STARTERS.length).toBe(5)

    const ids = DEFAULT_STARTERS.map((s) => s.id)
    expect(ids).toContain('new-flight-request')
    expect(ids).toContain('active-requests')
    expect(ids).toContain('show-deals')
    expect(ids).toContain('hot-opportunities')
    expect(ids).toContain('pipeline-summary')
  })

  it('has correct categories', () => {
    const flightStarters = DEFAULT_STARTERS.filter((s) => s.category === 'flight')
    const dealStarters = DEFAULT_STARTERS.filter((s) => s.category === 'deals')
    const pipelineStarters = DEFAULT_STARTERS.filter((s) => s.category === 'pipeline')

    expect(flightStarters.length).toBe(2)
    expect(dealStarters.length).toBe(2)
    expect(pipelineStarters.length).toBe(1)
  })
})

describe('getDefaultStarters', () => {
  it('returns all starters by default', () => {
    const starters = getDefaultStarters()
    expect(starters.length).toBe(5)
  })

  it('filters by categories', () => {
    const starters = getDefaultStarters({ categories: ['flight'] })

    expect(starters.length).toBe(2)
    expect(starters.every((s) => s.category === 'flight')).toBe(true)
  })

  it('filters by multiple categories', () => {
    const starters = getDefaultStarters({ categories: ['flight', 'deals'] })

    expect(starters.length).toBe(4)
    expect(starters.every((s) => ['flight', 'deals'].includes(s.category))).toBe(true)
  })

  it('excludes starters by id', () => {
    const starters = getDefaultStarters({ excludeIds: ['new-flight-request', 'show-deals'] })

    expect(starters.length).toBe(3)
    expect(starters.find((s) => s.id === 'new-flight-request')).toBeUndefined()
    expect(starters.find((s) => s.id === 'show-deals')).toBeUndefined()
  })

  it('combines category and exclude filters', () => {
    const starters = getDefaultStarters({
      categories: ['flight'],
      excludeIds: ['new-flight-request'],
    })

    expect(starters.length).toBe(1)
    expect(starters[0].id).toBe('active-requests')
  })
})
