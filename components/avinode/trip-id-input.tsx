'use client';

/**
 * TripIDInput Component
 *
 * A form component for users to submit the TripID they received from Avinode.
 * Includes client-side format validation, auto-uppercase transformation,
 * and real-time validation feedback.
 *
 * @example
 * ```tsx
 * <TripIDInput
 *   onSubmit={async (tripId) => {
 *     await submitTripId(tripId);
 *   }}
 *   isLoading={false}
 *   onCancel={() => setShowInput(false)}
 *   helpText="Check your email for the Trip ID"
 * />
 * ```
 */

import React, { useState, useCallback, useEffect, useRef, useId } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// Import shared type - single source of truth in types.ts
import type { TripIDInputProps } from './types';
export type { TripIDInputProps } from './types';

/**
 * Regular expression for Trip ID validation
 * - Must be 6-12 characters
 * - Alphanumeric only (A-Z, 0-9)
 * - Case insensitive (auto-uppercase)
 */
const TRIP_ID_REGEX = /^[A-Z0-9]{6,12}$/;

/**
 * Default help text for users
 */
const DEFAULT_HELP_TEXT =
  'You can find the Trip ID in the confirmation email from Avinode (6-12 alphanumeric characters).';

export function TripIDInput({
  onSubmit,
  isLoading = false,
  error,
  onCancel,
  helpText = DEFAULT_HELP_TEXT,
}: TripIDInputProps): React.ReactElement {
  const [value, setValue] = useState('');
  const [validationError, setValidationError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  /**
   * Validates the Trip ID format
   */
  const validateTripId = useCallback((tripId: string): boolean => {
    if (!tripId) {
      setValidationError('');
      return false;
    }

    if (tripId.length < 6 || tripId.length > 12) {
      setValidationError('Trip ID must be 6-12 characters.');
      return false;
    }

    if (!TRIP_ID_REGEX.test(tripId)) {
      setValidationError('Trip ID must contain only letters and numbers.');
      return false;
    }

    setValidationError('');
    return true;
  }, []);

  /**
   * Handles input changes with auto-uppercase and character filtering
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Auto-uppercase and remove non-alphanumeric characters
      const rawValue = e.target.value;
      const sanitized = rawValue.toUpperCase().replace(/[^A-Z0-9]/g, '');

      // Limit to 12 characters
      const truncated = sanitized.slice(0, 12);

      setValue(truncated);
      validateTripId(truncated);
    },
    [validateTripId],
  );

  /**
   * Handles form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateTripId(value) || isLoading) {
        return;
      }

      try {
        await onSubmit(value);
      } catch {
        // Error handling is the responsibility of the parent component
        // Errors are expected to be handled via the error prop or parent state
      }
    },
    [value, validateTripId, isLoading, onSubmit],
  );

  /**
   * Handles keyboard events (Escape to cancel)
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' && onCancel) {
        e.preventDefault();
        onCancel();
      }
    },
    [onCancel],
  );

  const isValid = value.length >= 6 && value.length <= 12 && TRIP_ID_REGEX.test(value);
  const showValidationError = value.length > 0 && !isValid;

  // Generate unique IDs for accessibility using React's useId hook
  // This ensures multiple TripIDInput instances don't have conflicting IDs
  const instanceId = useId();
  const inputId = `trip-id-input-${instanceId}`;
  const helpTextId = `trip-id-help-text-${instanceId}`;
  const errorId = `trip-id-error-${instanceId}`;
  const validationErrorId = `trip-id-validation-error-${instanceId}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      <div className="space-y-2">
        <Label htmlFor={inputId} className="text-sm font-medium">
          Avinode Trip ID
        </Label>
        <Input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter Trip ID (e.g., ABC123XYZ)"
          disabled={isLoading}
          aria-label="Avinode Trip ID"
          aria-invalid={showValidationError || !!error}
          aria-describedby={`${helpTextId} ${error ? errorId : ''} ${showValidationError ? validationErrorId : ''}`}
          className="font-mono text-base"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
      </div>

      {/* Help text */}
      <div id={helpTextId} className="text-sm text-muted-foreground">
        {helpText}
      </div>

      {/* Validation error */}
      {showValidationError && (
        <div id={validationErrorId} className="text-sm text-destructive flex items-start gap-2">
          <span className="text-destructive">⚠</span>
          <span>{validationError}</span>
        </div>
      )}

      {/* External error */}
      {error && (
        <div className="text-sm text-destructive flex items-start gap-2">
          <span className="text-destructive">✕</span>
          <span id={errorId} className="text-destructive">{error}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={!isValid || isLoading}
          className="flex-1"
          size="default"
          aria-label={isLoading ? 'Submitting Trip ID' : 'Submit Trip ID'}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" aria-hidden="true" />
              <span>Submit</span>
            </>
          )}
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            size="default"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
