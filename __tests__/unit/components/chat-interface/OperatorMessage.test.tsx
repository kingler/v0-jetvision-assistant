/**
 * OperatorMessage Component Unit Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OperatorMessage } from '@/components/chat-interface/components/OperatorMessage';

describe('OperatorMessage', () => {
  const defaultProps = {
    content: 'Thank you for your request',
    timestamp: new Date('2026-01-31T10:30:00'),
  };

  it('should render message content', () => {
    render(<OperatorMessage {...defaultProps} />);

    expect(screen.getByText('Thank you for your request')).toBeInTheDocument();
  });

  it('should display operator name', () => {
    render(<OperatorMessage {...defaultProps} operatorName="NetJets" />);

    expect(screen.getByText('NetJets')).toBeInTheDocument();
  });

  it('should display default operator name when not provided', () => {
    render(<OperatorMessage {...defaultProps} />);

    expect(screen.getByText('Operator')).toBeInTheDocument();
  });

  it('should display operator initial in avatar', () => {
    render(<OperatorMessage {...defaultProps} operatorName="NetJets" />);

    expect(screen.getByText('N')).toBeInTheDocument();
  });

  it('should apply amber styling', () => {
    const { container } = render(<OperatorMessage {...defaultProps} />);

    const bubble = container.querySelector('.bg-amber-50');
    expect(bubble).toBeInTheDocument();
  });

  it('should align to the left', () => {
    const { container } = render(<OperatorMessage {...defaultProps} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('justify-start');
  });

  it('should display timestamp', () => {
    render(<OperatorMessage {...defaultProps} />);

    // formatMessageTimestamp shows date+time for non-today dates
    expect(screen.getByText(/10:30 AM/)).toBeInTheDocument();
  });

  describe('message type badges', () => {
    it('should show "Quote Response" badge for RESPONSE type', () => {
      render(<OperatorMessage {...defaultProps} messageType="RESPONSE" />);

      expect(screen.getByText('Quote Response')).toBeInTheDocument();
    });

    it('should show "Your Request" badge for REQUEST type', () => {
      render(<OperatorMessage {...defaultProps} messageType="REQUEST" />);

      expect(screen.getByText('Your Request')).toBeInTheDocument();
    });

    it('should show "Information" badge for INFO type', () => {
      render(<OperatorMessage {...defaultProps} messageType="INFO" />);

      expect(screen.getByText('Information')).toBeInTheDocument();
    });

    it('should show "Confirmed" badge for CONFIRMATION type', () => {
      render(<OperatorMessage {...defaultProps} messageType="CONFIRMATION" />);

      expect(screen.getByText('Confirmed')).toBeInTheDocument();
    });

    it('should not show badge when no type', () => {
      render(<OperatorMessage {...defaultProps} />);

      expect(screen.queryByText('Quote Response')).not.toBeInTheDocument();
      expect(screen.queryByText('Your Request')).not.toBeInTheDocument();
    });
  });

  describe('View Thread button', () => {
    it('should show View Thread button when quoteId and onViewThread provided', () => {
      const handleViewThread = vi.fn();
      render(
        <OperatorMessage
          {...defaultProps}
          quoteId="quote-123"
          onViewThread={handleViewThread}
        />
      );

      expect(screen.getByText('View Thread')).toBeInTheDocument();
    });

    it('should call onViewThread with quoteId when clicked', () => {
      const handleViewThread = vi.fn();
      render(
        <OperatorMessage
          {...defaultProps}
          quoteId="quote-123"
          onViewThread={handleViewThread}
        />
      );

      fireEvent.click(screen.getByText('View Thread'));
      expect(handleViewThread).toHaveBeenCalledWith('quote-123');
    });

    it('should not show View Thread when quoteId is missing', () => {
      const handleViewThread = vi.fn();
      render(
        <OperatorMessage {...defaultProps} onViewThread={handleViewThread} />
      );

      expect(screen.queryByText('View Thread')).not.toBeInTheDocument();
    });

    it('should not show View Thread when onViewThread is missing', () => {
      render(<OperatorMessage {...defaultProps} quoteId="quote-123" />);

      expect(screen.queryByText('View Thread')).not.toBeInTheDocument();
    });
  });

  it('should apply custom className', () => {
    const { container } = render(
      <OperatorMessage {...defaultProps} className="custom-class" />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-class');
  });
});
