/**
 * Action Buttons Component - Usage Examples
 *
 * This file demonstrates how to use the ActionButton and ActionButtons components
 * in the Jetvision unified chat interface.
 */

import React from 'react';
import { ActionButton, ActionButtons } from './index';

/**
 * Example 1: Basic Horizontal Layout
 *
 * Default layout for quick replies with 2-4 options.
 */
export function HorizontalActionButtonsExample(): React.ReactElement {
  const handleAction = (actionId: string, value: string | number): void => {
    console.log('Action triggered:', actionId, value);
  };

  return (
    <ActionButtons
      actions={[
        { id: 'passengers-1-2', label: '1-2 passengers', value: '1-2' },
        { id: 'passengers-3-5', label: '3-5 passengers', value: '3-5' },
        { id: 'passengers-6-plus', label: '6+ passengers', value: '6+' },
      ]}
      layout="horizontal"
      onAction={handleAction}
    />
  );
}

/**
 * Example 2: Vertical Layout
 *
 * Stacked buttons for longer labels or mobile layouts.
 */
export function VerticalActionButtonsExample(): React.ReactElement {
  const handleAction = (actionId: string, value: string | number): void => {
    console.log('Action triggered:', actionId, value);
  };

  return (
    <ActionButtons
      actions={[
        { id: 'option-1', label: 'Schedule a flight for tomorrow morning', value: 'tomorrow-morning' },
        { id: 'option-2', label: 'Get quotes for next week', value: 'next-week' },
        { id: 'option-3', label: 'Compare available aircraft', value: 'compare' },
      ]}
      layout="vertical"
      onAction={handleAction}
    />
  );
}

/**
 * Example 3: Grid Layout
 *
 * Grid layout for many options (e.g., date picker, aircraft selection).
 * Responsive: 2 columns on mobile, 3 columns on desktop.
 */
export function GridActionButtonsExample(): React.ReactElement {
  const handleAction = (actionId: string, value: string | number): void => {
    console.log('Action triggered:', actionId, value);
  };

  return (
    <ActionButtons
      actions={[
        { id: 'aircraft-1', label: 'Gulfstream G650', value: 'g650' },
        { id: 'aircraft-2', label: 'Bombardier Global 7500', value: 'global-7500' },
        { id: 'aircraft-3', label: 'Cessna Citation X', value: 'citation-x' },
        { id: 'aircraft-4', label: 'Embraer Phenom 300', value: 'phenom-300' },
        { id: 'aircraft-5', label: 'Dassault Falcon 8X', value: 'falcon-8x' },
        { id: 'aircraft-6', label: 'Learjet 75', value: 'learjet-75' },
      ]}
      layout="grid"
      onAction={handleAction}
    />
  );
}

/**
 * Example 4: Buttons with Icons
 *
 * Add visual icons to buttons for better recognition.
 */
export function IconActionButtonsExample(): React.ReactElement {
  const handleAction = (actionId: string, value: string | number): void => {
    console.log('Action triggered:', actionId, value);
  };

  return (
    <ActionButtons
      actions={[
        {
          id: 'search',
          label: 'Search Flights',
          value: 'search',
          icon: <span>🔍</span>,
          variant: 'primary',
        },
        {
          id: 'compare',
          label: 'Compare Quotes',
          value: 'compare',
          icon: <span>⚖️</span>,
          variant: 'secondary',
        },
        {
          id: 'history',
          label: 'View History',
          value: 'history',
          icon: <span>📋</span>,
          variant: 'outline',
        },
      ]}
      layout="horizontal"
      onAction={handleAction}
    />
  );
}

/**
 * Example 5: Different Button Variants
 *
 * Use variants to emphasize certain actions.
 */
export function VariantActionButtonsExample(): React.ReactElement {
  const handleAction = (actionId: string, value: string | number): void => {
    console.log('Action triggered:', actionId, value);
  };

  return (
    <ActionButtons
      actions={[
        { id: 'confirm', label: 'Confirm Booking', value: 'confirm', variant: 'primary' },
        { id: 'save', label: 'Save for Later', value: 'save', variant: 'secondary' },
        { id: 'modify', label: 'Modify Request', value: 'modify', variant: 'outline' },
        { id: 'cancel', label: 'Cancel', value: 'cancel', variant: 'ghost' },
      ]}
      layout="horizontal"
      onAction={handleAction}
    />
  );
}

/**
 * Example 6: Disabled Buttons
 *
 * Disable certain options based on state.
 */
export function DisabledActionButtonsExample(): React.ReactElement {
  const handleAction = (actionId: string, value: string | number): void => {
    console.log('Action triggered:', actionId, value);
  };

  return (
    <ActionButtons
      actions={[
        { id: 'available', label: 'Available Option', value: 'available', disabled: false },
        { id: 'sold-out', label: 'Sold Out', value: 'sold-out', disabled: true },
        { id: 'coming-soon', label: 'Coming Soon', value: 'coming-soon', disabled: true },
      ]}
      layout="horizontal"
      onAction={handleAction}
    />
  );
}

/**
 * Example 7: Numeric Values
 *
 * Use numeric values for selections (e.g., ratings, quantities).
 */
export function NumericActionButtonsExample(): React.ReactElement {
  const handleAction = (actionId: string, value: string | number): void => {
    console.log('Action triggered:', actionId, value);
  };

  return (
    <ActionButtons
      actions={[
        { id: 'qty-1', label: '1 Aircraft', value: 1 },
        { id: 'qty-2', label: '2 Aircraft', value: 2 },
        { id: 'qty-3', label: '3+ Aircraft', value: 3 },
      ]}
      layout="horizontal"
      onAction={handleAction}
    />
  );
}

/**
 * Example 8: Individual ActionButton
 *
 * Use ActionButton directly for custom layouts.
 */
export function IndividualActionButtonExample(): React.ReactElement {
  const handleClick = (id: string, value: string | number): void => {
    console.log('Button clicked:', id, value);
  };

  return (
    <div className="flex gap-4">
      <ActionButton
        id="accept"
        label="Accept Proposal"
        value="accept"
        variant="primary"
        onClick={handleClick}
      />
      <ActionButton
        id="reject"
        label="Reject"
        value="reject"
        variant="outline"
        onClick={handleClick}
      />
    </div>
  );
}

/**
 * Example 9: Integration with Chat Message
 *
 * Complete example of ActionButtons in a chat message context.
 */
export function ChatMessageExample(): React.ReactElement {
  const handleAction = (actionId: string, value: string | number): void => {
    console.log('User selected:', actionId, value);
    // In real implementation, this would send the response back to the agent
  };

  return (
    <div className="p-4 bg-card rounded-lg shadow-md">
      <div className="mb-4">
        <p className="text-foreground">
          How many passengers will be traveling?
        </p>
      </div>
      <ActionButtons
        actions={[
          { id: 'passengers-1-2', label: '1-2', value: '1-2' },
          { id: 'passengers-3-5', label: '3-5', value: '3-5' },
          { id: 'passengers-6-8', label: '6-8', value: '6-8' },
          { id: 'passengers-9-plus', label: '9+', value: '9+' },
        ]}
        layout="horizontal"
        onAction={handleAction}
      />
    </div>
  );
}
