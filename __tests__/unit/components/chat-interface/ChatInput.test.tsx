/**
 * ChatInput Component Unit Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '@/components/chat-interface/components/ChatInput';

describe('ChatInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onSend: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render input with placeholder', () => {
    render(<ChatInput {...defaultProps} placeholder="Type a message..." />);

    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });

  it('should use default placeholder when not provided', () => {
    render(<ChatInput {...defaultProps} />);

    expect(
      screen.getByPlaceholderText('Message about this request...')
    ).toBeInTheDocument();
  });

  it('should display current value', () => {
    render(<ChatInput {...defaultProps} value="Hello world" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Hello world');
  });

  it('should call onChange when input changes', () => {
    const handleChange = vi.fn();
    render(<ChatInput {...defaultProps} onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New message' } });

    expect(handleChange).toHaveBeenCalledWith('New message');
  });

  describe('send button', () => {
    it('should be enabled when value is not empty', () => {
      render(<ChatInput {...defaultProps} value="Hello" />);

      const sendButton = screen.getByRole('button', { name: '' });
      expect(sendButton).not.toBeDisabled();
    });

    it('should be disabled when value is empty', () => {
      render(<ChatInput {...defaultProps} value="" />);

      const sendButton = screen.getByRole('button', { name: '' });
      expect(sendButton).toBeDisabled();
    });

    it('should be disabled when value is only whitespace', () => {
      render(<ChatInput {...defaultProps} value="   " />);

      const sendButton = screen.getByRole('button', { name: '' });
      expect(sendButton).toBeDisabled();
    });

    it('should be disabled when isProcessing is true', () => {
      render(<ChatInput {...defaultProps} value="Hello" isProcessing={true} />);

      const sendButton = screen.getByRole('button', { name: '' });
      expect(sendButton).toBeDisabled();
    });

    it('should call onSend when clicked', () => {
      const handleSend = vi.fn();
      render(<ChatInput {...defaultProps} value="Hello" onSend={handleSend} />);

      const sendButton = screen.getByRole('button', { name: '' });
      fireEvent.click(sendButton);

      expect(handleSend).toHaveBeenCalled();
    });
  });

  describe('keyboard handling', () => {
    it('should call onSend when Enter is pressed', () => {
      const handleSend = vi.fn();
      render(<ChatInput {...defaultProps} value="Hello" onSend={handleSend} />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

      expect(handleSend).toHaveBeenCalled();
    });

    it('should NOT call onSend when Shift+Enter is pressed', () => {
      const handleSend = vi.fn();
      render(<ChatInput {...defaultProps} value="Hello" onSend={handleSend} />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

      expect(handleSend).not.toHaveBeenCalled();
    });

    it('should NOT call onSend when Enter is pressed with empty input', () => {
      const handleSend = vi.fn();
      render(<ChatInput {...defaultProps} value="" onSend={handleSend} />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

      expect(handleSend).not.toHaveBeenCalled();
    });
  });

  describe('quick actions', () => {
    it('should render quick action buttons', () => {
      render(<ChatInput {...defaultProps} />);

      expect(screen.getByText('Update Details')).toBeInTheDocument();
      expect(screen.getByText('Alternative Options')).toBeInTheDocument();
      expect(screen.getByText('Check Status')).toBeInTheDocument();
    });

    it('should call onChange when quick action is clicked', () => {
      const handleChange = vi.fn();
      render(<ChatInput {...defaultProps} onChange={handleChange} />);

      fireEvent.click(screen.getByText('Update Details'));

      expect(handleChange).toHaveBeenCalledWith(
        'Can you update the passenger count?'
      );
    });

    it('should disable quick actions when processing', () => {
      render(<ChatInput {...defaultProps} isProcessing={true} />);

      const updateButton = screen.getByText('Update Details');
      expect(updateButton).toBeDisabled();
    });
  });

  describe('view workflow button', () => {
    it('should show View Workflow when showViewWorkflow is true', () => {
      const handleViewWorkflow = vi.fn();
      render(
        <ChatInput
          {...defaultProps}
          showViewWorkflow={true}
          onViewWorkflow={handleViewWorkflow}
        />
      );

      expect(screen.getByText('View Workflow')).toBeInTheDocument();
    });

    it('should not show View Workflow when showViewWorkflow is false', () => {
      render(<ChatInput {...defaultProps} showViewWorkflow={false} />);

      expect(screen.queryByText('View Workflow')).not.toBeInTheDocument();
    });

    it('should call onViewWorkflow when clicked', () => {
      const handleViewWorkflow = vi.fn();
      render(
        <ChatInput
          {...defaultProps}
          showViewWorkflow={true}
          onViewWorkflow={handleViewWorkflow}
        />
      );

      fireEvent.click(screen.getByText('View Workflow'));

      expect(handleViewWorkflow).toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should disable input when disabled prop is true', () => {
      render(<ChatInput {...defaultProps} disabled={true} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should disable input when isProcessing is true', () => {
      render(<ChatInput {...defaultProps} isProcessing={true} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });
});
