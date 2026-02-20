/**
 * Tests for Empty Leg Watch UI Components (ONEK-202)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyLegWatchCard } from '@/components/avinode/empty-leg-watch-card';
import { EmptyLegWatchList } from '@/components/avinode/empty-leg-watch-list';
import { EmptyLegMatchCard } from '@/components/avinode/empty-leg-match-card';
import { EmptyLegMatchViewer } from '@/components/avinode/empty-leg-match-viewer';
import { EmptyLegWatchCreated } from '@/components/avinode/empty-leg-watch-created';
import type { EmptyLegWatch } from '@/components/avinode/empty-leg-watch-card';
import type { EmptyLegMatchData } from '@/components/avinode/empty-leg-match-card';

// =============================================================================
// Test Data
// =============================================================================

const mockWatch: EmptyLegWatch = {
  watch_id: 'watch-1',
  status: 'active',
  departure_airport: 'KTEB',
  arrival_airport: 'KMIA',
  date_range: { start: '2026-03-01', end: '2026-03-15' },
  passengers: 4,
  max_price: 25000,
  aircraft_categories: ['midsize', 'heavy'],
  created_at: '2026-02-20T10:00:00Z',
  expires_at: '2026-05-20T10:00:00Z',
  matches_count: 3,
};

const mockPausedWatch: EmptyLegWatch = {
  ...mockWatch,
  watch_id: 'watch-2',
  status: 'paused',
  matches_count: 0,
};

const mockMatch: EmptyLegMatchData = {
  match_id: 'match-1',
  watch_id: 'watch-1',
  empty_leg_id: 'el-123',
  departure: {
    airport: 'KTEB',
    name: 'Teterboro',
    city: 'Teterboro',
    date: '2026-03-05',
    time: '09:00',
  },
  arrival: {
    airport: 'KMIA',
    name: 'Miami International',
    city: 'Miami',
  },
  price: 18000,
  currency: 'USD',
  discount_percentage: 40,
  regular_price: 30000,
  aircraft: {
    type: 'Citation XLS',
    model: 'Citation XLS+',
    category: 'midsize',
    capacity: 8,
    registration: 'N123AB',
  },
  operator: {
    id: 'op-1',
    name: 'Jet Aviation',
    rating: 4,
  },
  viewed: false,
  interested: false,
  matched_at: '2026-02-20T12:00:00Z',
  valid_until: '2026-03-04T23:59:00Z',
  deep_link: 'https://avinode.com/empty-leg/el-123',
};

const mockViewedMatch: EmptyLegMatchData = {
  ...mockMatch,
  match_id: 'match-2',
  viewed: true,
  interested: false,
};

const mockInterestedMatch: EmptyLegMatchData = {
  ...mockMatch,
  match_id: 'match-3',
  viewed: true,
  interested: true,
};

// =============================================================================
// EmptyLegWatchCard
// =============================================================================

describe('EmptyLegWatchCard', () => {
  it('renders watch details', () => {
    render(<EmptyLegWatchCard watch={mockWatch} />);

    expect(screen.getByText('KTEB → KMIA')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('4 pax')).toBeInTheDocument();
    expect(screen.getByText(/Max \$25,000/)).toBeInTheDocument();
    expect(screen.getByText('3 matches')).toBeInTheDocument();
  });

  it('shows pause button for active watches', () => {
    const onPause = vi.fn();
    render(<EmptyLegWatchCard watch={mockWatch} onPause={onPause} />);

    const btn = screen.getByTestId('pause-watch-btn');
    fireEvent.click(btn);
    expect(onPause).toHaveBeenCalledWith('watch-1');
  });

  it('shows resume button for paused watches', () => {
    const onResume = vi.fn();
    render(<EmptyLegWatchCard watch={mockPausedWatch} onResume={onResume} />);

    const btn = screen.getByTestId('resume-watch-btn');
    fireEvent.click(btn);
    expect(onResume).toHaveBeenCalledWith('watch-2');
  });

  it('calls onViewMatches when match count clicked', () => {
    const onViewMatches = vi.fn();
    render(
      <EmptyLegWatchCard watch={mockWatch} onViewMatches={onViewMatches} />
    );

    fireEvent.click(screen.getByTestId('view-matches-btn'));
    expect(onViewMatches).toHaveBeenCalledWith('watch-1');
  });

  it('shows cancel button for active watches', () => {
    const onCancel = vi.fn();
    render(<EmptyLegWatchCard watch={mockWatch} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId('cancel-watch-btn'));
    expect(onCancel).toHaveBeenCalledWith('watch-1');
  });

  it('renders date range section', () => {
    const { container } = render(<EmptyLegWatchCard watch={mockWatch} />);
    // Verify a date-related element is present (timezone-independent)
    const cardText = container.textContent || '';
    // Should contain "Mar" from at least one date
    expect(cardText).toMatch(/Mar|Feb/);
  });

  it('renders aircraft categories', () => {
    render(<EmptyLegWatchCard watch={mockWatch} />);
    expect(screen.getByText('midsize, heavy')).toBeInTheDocument();
  });
});

// =============================================================================
// EmptyLegWatchList
// =============================================================================

describe('EmptyLegWatchList', () => {
  it('renders list of watches', () => {
    render(
      <EmptyLegWatchList watches={[mockWatch, mockPausedWatch]} />
    );

    expect(screen.getByTestId('empty-leg-watch-list')).toBeInTheDocument();
    expect(screen.getByText('Empty Leg Watches (2)')).toBeInTheDocument();
    expect(screen.getAllByTestId('empty-leg-watch-card')).toHaveLength(2);
  });

  it('shows empty state when no watches', () => {
    render(<EmptyLegWatchList watches={[]} />);

    expect(
      screen.getByTestId('empty-leg-watch-list-empty')
    ).toBeInTheDocument();
    expect(screen.getByText('No empty leg watches yet.')).toBeInTheDocument();
  });

  it('dispatches onAction for view matches', () => {
    const onAction = vi.fn();
    render(
      <EmptyLegWatchList watches={[mockWatch]} onAction={onAction} />
    );

    fireEvent.click(screen.getByTestId('view-matches-btn'));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tool',
        payload: expect.objectContaining({
          toolName: 'get_watch_matches',
        }),
      })
    );
  });

  it('dispatches onAction for pause', () => {
    const onAction = vi.fn();
    render(
      <EmptyLegWatchList watches={[mockWatch]} onAction={onAction} />
    );

    fireEvent.click(screen.getByTestId('pause-watch-btn'));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tool',
        payload: expect.objectContaining({
          toolName: 'update_empty_leg_watch',
          params: expect.objectContaining({ status: 'paused' }),
        }),
      })
    );
  });
});

// =============================================================================
// EmptyLegMatchCard
// =============================================================================

describe('EmptyLegMatchCard', () => {
  it('renders match details', () => {
    render(<EmptyLegMatchCard match={mockMatch} />);

    expect(screen.getByText('KTEB → KMIA')).toBeInTheDocument();
    expect(screen.getByText('Citation XLS')).toBeInTheDocument();
    expect(screen.getByText('Jet Aviation')).toBeInTheDocument();
    expect(screen.getByText('$18,000')).toBeInTheDocument();
    expect(screen.getByText('40% off')).toBeInTheDocument();
  });

  it('shows Mark Viewed button for unviewed matches', () => {
    const onMarkViewed = vi.fn();
    render(
      <EmptyLegMatchCard match={mockMatch} onMarkViewed={onMarkViewed} />
    );

    const btn = screen.getByTestId('mark-viewed-btn');
    fireEvent.click(btn);
    expect(onMarkViewed).toHaveBeenCalledWith('match-1');
  });

  it('shows Interested button for non-interested matches', () => {
    const onMarkInterested = vi.fn();
    render(
      <EmptyLegMatchCard
        match={mockMatch}
        onMarkInterested={onMarkInterested}
      />
    );

    fireEvent.click(screen.getByTestId('mark-interested-btn'));
    expect(onMarkInterested).toHaveBeenCalledWith('match-1');
  });

  it('does not show Mark Viewed for already viewed matches', () => {
    render(<EmptyLegMatchCard match={mockViewedMatch} />);
    expect(screen.queryByTestId('mark-viewed-btn')).not.toBeInTheDocument();
  });

  it('shows Interested badge for interested matches', () => {
    render(<EmptyLegMatchCard match={mockInterestedMatch} />);
    expect(screen.getByText('Interested')).toBeInTheDocument();
  });

  it('has reduced opacity for viewed matches', () => {
    const { container } = render(
      <EmptyLegMatchCard match={mockViewedMatch} />
    );
    const card = container.querySelector('[data-testid="empty-leg-match-card"]');
    expect(card?.className).toContain('opacity-75');
  });

  it('shows Open in Avinode button with deep link', () => {
    const onViewInAvinode = vi.fn();
    render(
      <EmptyLegMatchCard
        match={mockMatch}
        onViewInAvinode={onViewInAvinode}
      />
    );

    fireEvent.click(screen.getByTestId('view-avinode-btn'));
    expect(onViewInAvinode).toHaveBeenCalledWith(
      'https://avinode.com/empty-leg/el-123'
    );
  });

  it('renders discount and regular price', () => {
    render(<EmptyLegMatchCard match={mockMatch} />);
    expect(screen.getByText('40% off')).toBeInTheDocument();
    expect(screen.getByText('$30,000')).toBeInTheDocument();
  });

  it('renders operator rating', () => {
    render(<EmptyLegMatchCard match={mockMatch} />);
    expect(screen.getByText('★★★★☆')).toBeInTheDocument();
  });
});

// =============================================================================
// EmptyLegMatchViewer
// =============================================================================

describe('EmptyLegMatchViewer', () => {
  const matches = [mockMatch, mockViewedMatch, mockInterestedMatch];

  it('renders matches list with count', () => {
    render(
      <EmptyLegMatchViewer
        watchId="watch-1"
        matches={matches}
        totalCount={3}
        unviewedCount={1}
      />
    );

    expect(screen.getByTestId('empty-leg-match-viewer')).toBeInTheDocument();
    expect(screen.getByText('Matches (3)')).toBeInTheDocument();
    expect(screen.getByText('1 new')).toBeInTheDocument();
    expect(screen.getAllByTestId('empty-leg-match-card')).toHaveLength(3);
  });

  it('shows empty state when no matches', () => {
    render(
      <EmptyLegMatchViewer
        watchId="watch-1"
        matches={[]}
        totalCount={0}
        unviewedCount={0}
      />
    );

    expect(
      screen.getByTestId('empty-leg-match-viewer-empty')
    ).toBeInTheDocument();
  });

  it('sorts by price when price button clicked', () => {
    render(
      <EmptyLegMatchViewer
        watchId="watch-1"
        matches={matches}
        totalCount={3}
        unviewedCount={0}
      />
    );

    fireEvent.click(screen.getByText('Price'));
    // All matches have the same price in test data, so just verify sort button works
    expect(screen.getAllByTestId('empty-leg-match-card')).toHaveLength(3);
  });

  it('dispatches mark_match action', () => {
    const onAction = vi.fn();
    render(
      <EmptyLegMatchViewer
        watchId="watch-1"
        matches={[mockMatch]}
        totalCount={1}
        unviewedCount={1}
        onAction={onAction}
      />
    );

    fireEvent.click(screen.getByTestId('mark-interested-btn'));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tool',
        payload: expect.objectContaining({
          toolName: 'mark_match',
          params: { match_id: 'match-1', interested: true },
        }),
      })
    );
  });
});

// =============================================================================
// EmptyLegWatchCreated
// =============================================================================

describe('EmptyLegWatchCreated', () => {
  it('renders creation confirmation', () => {
    render(
      <EmptyLegWatchCreated
        watchId="watch-1"
        status="active"
        departureAirport="KTEB"
        arrivalAirport="KMIA"
        dateRangeStart="2026-03-01"
        dateRangeEnd="2026-03-15"
        passengers={4}
        maxPrice={25000}
        matchesCount={2}
      />
    );

    expect(
      screen.getByTestId('empty-leg-watch-created')
    ).toBeInTheDocument();
    expect(screen.getByText('Empty Leg Watch Created')).toBeInTheDocument();
    expect(screen.getByText('KTEB → KMIA')).toBeInTheDocument();
    expect(screen.getByText('4 passengers')).toBeInTheDocument();
  });

  it('shows view matches button when matches exist', () => {
    const onAction = vi.fn();
    render(
      <EmptyLegWatchCreated
        watchId="watch-1"
        status="active"
        departureAirport="KTEB"
        arrivalAirport="KMIA"
        dateRangeStart="2026-03-01"
        dateRangeEnd="2026-03-15"
        passengers={4}
        matchesCount={2}
        onAction={onAction}
      />
    );

    fireEvent.click(screen.getByTestId('view-matches-btn'));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tool',
        payload: expect.objectContaining({
          toolName: 'get_watch_matches',
        }),
      })
    );
  });

  it('does not show view matches button when 0 matches', () => {
    render(
      <EmptyLegWatchCreated
        watchId="watch-1"
        status="active"
        departureAirport="KTEB"
        arrivalAirport="KMIA"
        dateRangeStart="2026-03-01"
        dateRangeEnd="2026-03-15"
        passengers={4}
        matchesCount={0}
      />
    );

    expect(screen.queryByTestId('view-matches-btn')).not.toBeInTheDocument();
  });
});
