/**
 * useWebhookSubscription - Supabase Realtime Webhook Events
 *
 * Subscribes to Avinode webhook events via Supabase realtime.
 * Handles quote responses and operator messages in real-time.
 *
 * Extracted from: components/chat-interface.tsx (lines 325-465)
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { RealtimeChannel } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Webhook event payload from Avinode
 */
export interface WebhookEventPayload {
  quoteId?: string;
  quote_id?: string;
  messageId?: string;
  message?: string;
  content?: string;
  timestamp?: string;
  senderName?: string;
}

/**
 * Webhook event from the database
 */
export interface WebhookEvent {
  id: string;
  event_type: string;
  payload?: WebhookEventPayload;
  trip_id?: string;
  request_id?: string;
  created_at?: string;
}

/**
 * Operator message structure
 */
export interface OperatorMessage {
  id: string;
  type: 'REQUEST' | 'RESPONSE' | 'INFO' | 'CONFIRMATION';
  content: string;
  timestamp: string;
  sender: string;
}

/**
 * Options for the webhook subscription hook
 */
export interface UseWebhookSubscriptionOptions {
  /** Avinode trip ID to subscribe to */
  tripId?: string;
  /** Request ID to subscribe to (alternative to tripId) */
  requestId?: string;
  /** Unique chat ID for channel naming */
  chatId: string;
  /** Whether subscription is enabled */
  enabled?: boolean;
  /** Callback when a new quote is received */
  onQuoteReceived?: (quoteId: string) => void;
  /** Callback when an operator message is received */
  onMessageReceived?: (quoteId: string, message: OperatorMessage) => void;
  /** Callback when any webhook event is received */
  onEvent?: (event: WebhookEvent) => void;
  /** Callback when subscription status changes */
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

/**
 * Return type for the webhook subscription hook
 */
export interface UseWebhookSubscriptionReturn {
  /** Whether the subscription is active */
  isConnected: boolean;
  /** Manually reconnect the subscription */
  reconnect: () => void;
  /** Manually disconnect the subscription */
  disconnect: () => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Subscribe to Avinode webhook events via Supabase realtime.
 *
 * @example
 * ```tsx
 * const { isConnected } = useWebhookSubscription({
 *   tripId: activeChat.tripId,
 *   chatId: activeChat.id,
 *   onQuoteReceived: (quoteId) => {
 *     // Refresh RFQs when new quote arrives
 *     loadRFQs(tripId);
 *   },
 *   onMessageReceived: (quoteId, message) => {
 *     // Add message to operator messages
 *     updateOperatorMessages(quoteId, message);
 *   },
 * });
 * ```
 */
export function useWebhookSubscription(
  options: UseWebhookSubscriptionOptions
): UseWebhookSubscriptionReturn {
  const {
    tripId,
    requestId,
    chatId,
    enabled = true,
    onQuoteReceived,
    onMessageReceived,
    onEvent,
    onStatusChange,
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isConnectedRef = useRef(false);

  // Create Supabase client once for the hook lifecycle
  const supabase = useMemo(() => createClientComponentClient(), []);

  /**
   * Handle incoming webhook event
   */
  const handleWebhookEvent = useCallback(
    (event: WebhookEvent) => {
      const eventType = event.event_type;
      const payload = event.payload || {};
      const quoteId = payload.quoteId || payload.quote_id;

      // Notify generic event handler
      onEvent?.(event);

      // Handle specific event types
      switch (eventType) {
        case 'TripRequestSellerResponse':
          // New quote received from operator
          if (quoteId) {
            onQuoteReceived?.(quoteId);
          }
          break;

        case 'TripChatSeller':
        case 'TripChatMine':
          // Operator message or confirmation of our message
          if (quoteId) {
            const message: OperatorMessage = {
              id: payload.messageId || `msg-${Date.now()}`,
              type: eventType === 'TripChatMine' ? 'REQUEST' : 'RESPONSE',
              content: payload.message || payload.content || '',
              timestamp: payload.timestamp || new Date().toISOString(),
              sender: eventType === 'TripChatMine' ? 'You' : payload.senderName || 'Operator',
            };
            onMessageReceived?.(quoteId, message);
          }
          break;

        default:
          // Log unknown event types for debugging
          console.log('[useWebhookSubscription] Unhandled event type:', eventType, payload);
      }
    },
    [onQuoteReceived, onMessageReceived, onEvent]
  );

  /**
   * Set up the subscription
   */
  const setupSubscription = useCallback(() => {
    // Need either tripId or requestId to subscribe
    if (!tripId && !requestId) {
      return;
    }

    // Don't set up if disabled
    if (!enabled) {
      return;
    }

    const filterField = tripId ? 'trip_id' : 'request_id';
    const filterValue = tripId || requestId;

    onStatusChange?.('connecting');

    const channel = supabase
      .channel(`webhook_events_${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'avinode_webhook_events',
          filter: `${filterField}=eq.${filterValue}`,
        },
        (payload) => {
          console.log('[useWebhookSubscription] Webhook event received:', payload);
          handleWebhookEvent(payload.new as WebhookEvent);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isConnectedRef.current = true;
          onStatusChange?.('connected');
          console.log('[useWebhookSubscription] Connected to channel:', `webhook_events_${chatId}`);
        } else if (status === 'CHANNEL_ERROR') {
          isConnectedRef.current = false;
          onStatusChange?.('error');
          console.error('[useWebhookSubscription] Channel error');
        } else if (status === 'CLOSED') {
          isConnectedRef.current = false;
          onStatusChange?.('disconnected');
        }
      });

    channelRef.current = channel;
  }, [tripId, requestId, chatId, enabled, handleWebhookEvent, onStatusChange, supabase]);

  /**
   * Clean up subscription
   */
  const cleanupSubscription = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isConnectedRef.current = false;
      onStatusChange?.('disconnected');
    }
  }, [supabase, onStatusChange]);

  /**
   * Reconnect the subscription
   */
  const reconnect = useCallback(() => {
    cleanupSubscription();
    setupSubscription();
  }, [cleanupSubscription, setupSubscription]);

  /**
   * Disconnect the subscription
   */
  const disconnect = useCallback(() => {
    cleanupSubscription();
  }, [cleanupSubscription]);

  // Set up subscription on mount and when dependencies change
  useEffect(() => {
    setupSubscription();

    return () => {
      cleanupSubscription();
    };
  }, [setupSubscription, cleanupSubscription]);

  return {
    isConnected: isConnectedRef.current,
    reconnect,
    disconnect,
  };
}

export type UseWebhookSubscriptionReturn_Type = ReturnType<typeof useWebhookSubscription>;
