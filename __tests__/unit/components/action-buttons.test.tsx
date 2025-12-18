/**
 * Action Buttons Component Tests
 *
 * Comprehensive tests for ActionButton and ActionButtons components.
 * Tests keyboard navigation, visual states, layouts, and accessibility.
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActionButtons } from '@/components/message-components/action-buttons';
import { ActionButton } from '@/components/message-components/action-button';
import type { ActionButtonsComponent } from '@/components/message-components/types';

describe('ActionButton', () => {
  let mockOnClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnClick = vi.fn();
  });

  describe('Rendering', () => {
    it('should render button with label', () => {
      render(
        <ActionButton
          id="test-action"
          label="Test Action"
          value="test"
          onClick={mockOnClick}
        />
      );
      expect(screen.getByText('Test Action')).toBeInTheDocument();
    });

    it('should render button with icon', () => {
      render(
        <ActionButton
          id="test-action"
          label="Test Action"
          value="test"
          icon={<span data-testid="test-icon">🚀</span>}
          onClick={mockOnClick}
        />
      );
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByText('Test Action')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ActionButton
          id="test-action"
          label="Test Action"
          value="test"
          onClick={mockOnClick}
          className="custom-class"
        />
      );
      const button = container.querySelector('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Visual States', () => {
    it('should render default variant', () => {
      const { container } = render(
        <ActionButton
          id="test-action"
          label="Default"
          value="test"
          onClick={mockOnClick}
        />
      );
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
    });

    it('should render primary variant', () => {
      const { container } = render(
        <ActionButton
          id="test-action"
          label="Primary"
          value="test"
          variant="primary"
          onClick={mockOnClick}
        />
      );
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
    });

    it('should render secondary variant', () => {
      const { container } = render(
        <ActionButton
          id="test-action"
          label="Secondary"
          value="test"
          variant="secondary"
          onClick={mockOnClick}
        />
      );
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
    });

    it('should render outline variant', () => {
      const { container } = render(
        <ActionButton
          id="test-action"
          label="Outline"
          value="test"
          variant="outline"
          onClick={mockOnClick}
        />
      );
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
    });

    it('should render ghost variant', () => {
      const { container } = render(
        <ActionButton
          id="test-action"
          label="Ghost"
          value="test"
          variant="ghost"
          onClick={mockOnClick}
        />
      );
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
    });

    it('should render disabled state', () => {
      render(
        <ActionButton
          id="test-action"
          label="Disabled"
          value="test"
          disabled={true}
          onClick={mockOnClick}
        />
      );
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should not call onClick when disabled', () => {
      render(
        <ActionButton
          id="test-action"
          label="Disabled"
          value="test"
          disabled={true}
          onClick={mockOnClick}
        />
      );
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Interaction', () => {
    it('should call onClick with id and value when clicked', () => {
      render(
        <ActionButton
          id="test-action"
          label="Click Me"
          value="test-value"
          onClick={mockOnClick}
        />
      );
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockOnClick).toHaveBeenCalledWith('test-action', 'test-value');
    });

    it('should handle numeric value', () => {
      render(
        <ActionButton
          id="test-action"
          label="Click Me"
          value={42}
          onClick={mockOnClick}
        />
      );
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockOnClick).toHaveBeenCalledWith('test-action', 42);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should trigger onClick on Enter key press', () => {
      render(
        <ActionButton
          id="test-action"
          label="Test Action"
          value="test"
          onClick={mockOnClick}
        />
      );
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      expect(mockOnClick).toHaveBeenCalledWith('test-action', 'test');
    });

    it('should trigger onClick on Space key press', () => {
      render(
        <ActionButton
          id="test-action"
          label="Test Action"
          value="test"
          onClick={mockOnClick}
        />
      );
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });
      expect(mockOnClick).toHaveBeenCalledWith('test-action', 'test');
    });

    it('should not trigger onClick on other keys', () => {
      render(
        <ActionButton
          id="test-action"
          label="Test Action"
          value="test"
          onClick={mockOnClick}
        />
      );
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'a', code: 'KeyA' });
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should not trigger onClick on keyboard when disabled', () => {
      render(
        <ActionButton
          id="test-action"
          label="Test Action"
          value="test"
          disabled={true}
          onClick={mockOnClick}
        />
      );
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper role', () => {
      render(
        <ActionButton
          id="test-action"
          label="Test Action"
          value="test"
          onClick={mockOnClick}
        />
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should be focusable', () => {
      render(
        <ActionButton
          id="test-action"
          label="Test Action"
          value="test"
          onClick={mockOnClick}
        />
      );
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should not be focusable when disabled', () => {
      render(
        <ActionButton
          id="test-action"
          label="Test Action"
          value="test"
          disabled={true}
          onClick={mockOnClick}
        />
      );
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should have aria-disabled when disabled', () => {
      render(
        <ActionButton
          id="test-action"
          label="Test Action"
          value="test"
          disabled={true}
          onClick={mockOnClick}
        />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });
});

describe('ActionButtons', () => {
  let mockOnAction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnAction = vi.fn();
  });

  const sampleActions: ActionButtonsComponent['actions'] = [
    { id: 'action-1', label: '1-2 passengers', value: '1-2' },
    { id: 'action-2', label: '3-5 passengers', value: '3-5' },
    { id: 'action-3', label: '6+ passengers', value: '6+' },
  ];

  describe('Rendering', () => {
    it('should render all action buttons', () => {
      render(<ActionButtons actions={sampleActions} onAction={mockOnAction} />);
      expect(screen.getByText('1-2 passengers')).toBeInTheDocument();
      expect(screen.getByText('3-5 passengers')).toBeInTheDocument();
      expect(screen.getByText('6+ passengers')).toBeInTheDocument();
    });

    it('should render with icons', () => {
      const actionsWithIcons: ActionButtonsComponent['actions'] = [
        { id: 'action-1', label: 'Option 1', value: '1', icon: <span data-testid="icon-1">🚀</span> },
        { id: 'action-2', label: 'Option 2', value: '2', icon: <span data-testid="icon-2">✈️</span> },
      ];
      render(<ActionButtons actions={actionsWithIcons} onAction={mockOnAction} />);
      expect(screen.getByTestId('icon-1')).toBeInTheDocument();
      expect(screen.getByTestId('icon-2')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ActionButtons
          actions={sampleActions}
          onAction={mockOnAction}
          className="custom-wrapper"
        />
      );
      expect(container.querySelector('.custom-wrapper')).toBeInTheDocument();
    });

    it('should render disabled buttons', () => {
      const actionsWithDisabled: ActionButtonsComponent['actions'] = [
        { id: 'action-1', label: 'Enabled', value: '1', disabled: false },
        { id: 'action-2', label: 'Disabled', value: '2', disabled: true },
      ];
      render(<ActionButtons actions={actionsWithDisabled} onAction={mockOnAction} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).not.toBeDisabled();
      expect(buttons[1]).toBeDisabled();
    });
  });

  describe('Layouts', () => {
    it('should render horizontal layout by default', () => {
      const { container } = render(
        <ActionButtons actions={sampleActions} onAction={mockOnAction} />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex', 'flex-wrap', 'gap-2');
    });

    it('should render horizontal layout explicitly', () => {
      const { container } = render(
        <ActionButtons
          actions={sampleActions}
          layout="horizontal"
          onAction={mockOnAction}
        />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex', 'flex-wrap', 'gap-2');
    });

    it('should render vertical layout', () => {
      const { container } = render(
        <ActionButtons
          actions={sampleActions}
          layout="vertical"
          onAction={mockOnAction}
        />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex', 'flex-col', 'gap-2');
    });

    it('should render grid layout', () => {
      const { container } = render(
        <ActionButtons
          actions={sampleActions}
          layout="grid"
          onAction={mockOnAction}
        />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-3', 'gap-2');
    });

    it('should apply full width to buttons in grid layout', () => {
      const { container } = render(
        <ActionButtons
          actions={sampleActions}
          layout="grid"
          onAction={mockOnAction}
        />
      );
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('w-full');
      });
    });

    it('should not apply full width to buttons in horizontal layout', () => {
      const { container } = render(
        <ActionButtons
          actions={sampleActions}
          layout="horizontal"
          onAction={mockOnAction}
        />
      );
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button).not.toHaveClass('w-full');
      });
    });
  });

  describe('Interaction', () => {
    it('should call onAction when button is clicked', () => {
      render(<ActionButtons actions={sampleActions} onAction={mockOnAction} />);
      const button = screen.getByText('1-2 passengers');
      fireEvent.click(button);
      expect(mockOnAction).toHaveBeenCalledWith('action-1', '1-2');
    });

    it('should call onAction with numeric value', () => {
      const actions: ActionButtonsComponent['actions'] = [
        { id: 'action-1', label: 'Option 1', value: 42 },
      ];
      render(<ActionButtons actions={actions} onAction={mockOnAction} />);
      const button = screen.getByText('Option 1');
      fireEvent.click(button);
      expect(mockOnAction).toHaveBeenCalledWith('action-1', 42);
    });

    it('should not call onAction when button is disabled', () => {
      const actions: ActionButtonsComponent['actions'] = [
        { id: 'action-1', label: 'Disabled', value: '1', disabled: true },
      ];
      render(<ActionButtons actions={actions} onAction={mockOnAction} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockOnAction).not.toHaveBeenCalled();
    });

    it('should handle missing onAction gracefully', () => {
      render(<ActionButtons actions={sampleActions} />);
      const button = screen.getByText('1-2 passengers');
      expect(() => fireEvent.click(button)).not.toThrow();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support Tab navigation between buttons', () => {
      render(<ActionButtons actions={sampleActions} onAction={mockOnAction} />);
      const buttons = screen.getAllByRole('button');

      buttons[0].focus();
      expect(buttons[0]).toHaveFocus();

      // Simulate Tab key
      fireEvent.keyDown(buttons[0], { key: 'Tab', code: 'Tab' });
      buttons[1].focus();
      expect(buttons[1]).toHaveFocus();
    });

    it('should trigger action on Enter key', () => {
      render(<ActionButtons actions={sampleActions} onAction={mockOnAction} />);
      const button = screen.getByText('1-2 passengers');
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      expect(mockOnAction).toHaveBeenCalledWith('action-1', '1-2');
    });

    it('should trigger action on Space key', () => {
      render(<ActionButtons actions={sampleActions} onAction={mockOnAction} />);
      const button = screen.getByText('3-5 passengers');
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });
      expect(mockOnAction).toHaveBeenCalledWith('action-2', '3-5');
    });

    it('should skip disabled buttons in tab order', () => {
      const actions: ActionButtonsComponent['actions'] = [
        { id: 'action-1', label: 'Enabled', value: '1', disabled: false },
        { id: 'action-2', label: 'Disabled', value: '2', disabled: true },
        { id: 'action-3', label: 'Enabled 2', value: '3', disabled: false },
      ];
      render(<ActionButtons actions={actions} onAction={mockOnAction} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons[1]).toBeDisabled();
    });
  });

  describe('Button Variants', () => {
    it('should render primary variant buttons', () => {
      const actions: ActionButtonsComponent['actions'] = [
        { id: 'action-1', label: 'Primary', value: '1', variant: 'primary' },
      ];
      render(<ActionButtons actions={actions} onAction={mockOnAction} />);
      expect(screen.getByText('Primary')).toBeInTheDocument();
    });

    it('should render secondary variant buttons', () => {
      const actions: ActionButtonsComponent['actions'] = [
        { id: 'action-1', label: 'Secondary', value: '1', variant: 'secondary' },
      ];
      render(<ActionButtons actions={actions} onAction={mockOnAction} />);
      expect(screen.getByText('Secondary')).toBeInTheDocument();
    });

    it('should render outline variant buttons by default', () => {
      const actions: ActionButtonsComponent['actions'] = [
        { id: 'action-1', label: 'Outline', value: '1' },
      ];
      render(<ActionButtons actions={actions} onAction={mockOnAction} />);
      expect(screen.getByText('Outline')).toBeInTheDocument();
    });

    it('should render ghost variant buttons', () => {
      const actions: ActionButtonsComponent['actions'] = [
        { id: 'action-1', label: 'Ghost', value: '1', variant: 'ghost' },
      ];
      render(<ActionButtons actions={actions} onAction={mockOnAction} />);
      expect(screen.getByText('Ghost')).toBeInTheDocument();
    });

    it('should render mixed variant buttons', () => {
      const actions: ActionButtonsComponent['actions'] = [
        { id: 'action-1', label: 'Primary', value: '1', variant: 'primary' },
        { id: 'action-2', label: 'Secondary', value: '2', variant: 'secondary' },
        { id: 'action-3', label: 'Outline', value: '3', variant: 'outline' },
      ];
      render(<ActionButtons actions={actions} onAction={mockOnAction} />);
      expect(screen.getByText('Primary')).toBeInTheDocument();
      expect(screen.getByText('Secondary')).toBeInTheDocument();
      expect(screen.getByText('Outline')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      render(<ActionButtons actions={sampleActions} onAction={mockOnAction} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });

    it('should maintain focus order in horizontal layout', () => {
      render(<ActionButtons actions={sampleActions} layout="horizontal" onAction={mockOnAction} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
      // Buttons should be in DOM order for natural tab flow
      expect(buttons[0]).toHaveTextContent('1-2 passengers');
      expect(buttons[1]).toHaveTextContent('3-5 passengers');
      expect(buttons[2]).toHaveTextContent('6+ passengers');
    });

    it('should maintain focus order in vertical layout', () => {
      render(<ActionButtons actions={sampleActions} layout="vertical" onAction={mockOnAction} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
      // Buttons should be in DOM order for natural tab flow
      expect(buttons[0]).toHaveTextContent('1-2 passengers');
      expect(buttons[1]).toHaveTextContent('3-5 passengers');
      expect(buttons[2]).toHaveTextContent('6+ passengers');
    });

    it('should maintain focus order in grid layout', () => {
      render(<ActionButtons actions={sampleActions} layout="grid" onAction={mockOnAction} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
      // Grid should still maintain natural DOM order for tab flow
      expect(buttons[0]).toHaveTextContent('1-2 passengers');
      expect(buttons[1]).toHaveTextContent('3-5 passengers');
      expect(buttons[2]).toHaveTextContent('6+ passengers');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty actions array', () => {
      const { container } = render(<ActionButtons actions={[]} onAction={mockOnAction} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toBeInTheDocument();
      expect(wrapper.children).toHaveLength(0);
    });

    it('should handle single action', () => {
      const actions: ActionButtonsComponent['actions'] = [
        { id: 'action-1', label: 'Single', value: '1' },
      ];
      render(<ActionButtons actions={actions} onAction={mockOnAction} />);
      expect(screen.getByText('Single')).toBeInTheDocument();
    });

    it('should handle many actions in grid layout', () => {
      const manyActions: ActionButtonsComponent['actions'] = Array.from({ length: 12 }, (_, i) => ({
        id: `action-${i}`,
        label: `Option ${i + 1}`,
        value: `${i + 1}`,
      }));
      render(<ActionButtons actions={manyActions} layout="grid" onAction={mockOnAction} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(12);
    });

    it('should handle long button labels', () => {
      const actions: ActionButtonsComponent['actions'] = [
        { id: 'action-1', label: 'This is a very long button label that might wrap', value: '1' },
      ];
      render(<ActionButtons actions={actions} onAction={mockOnAction} />);
      expect(screen.getByText('This is a very long button label that might wrap')).toBeInTheDocument();
    });

    it('should handle special characters in labels', () => {
      const actions: ActionButtonsComponent['actions'] = [
        { id: 'action-1', label: 'Option & Value < 100', value: '1' },
      ];
      render(<ActionButtons actions={actions} onAction={mockOnAction} />);
      expect(screen.getByText('Option & Value < 100')).toBeInTheDocument();
    });
  });
});
