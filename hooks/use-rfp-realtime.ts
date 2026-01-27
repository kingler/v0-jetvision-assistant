/**
 * Supabase Real-time Hook for RFP Updates
 * Subscribe to RFP and quote changes for live dashboard updates
 */

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface RFPRealtimeUpdate {
  id: string
  status: string
  quoteCount: number
  updatedAt: Date
}

export interface QuoteRealtimeUpdate {
  id: string
  requestId: string
  operatorName: string
  price: number
  aiScore: number
  createdAt: Date
}

export function useRFPRealtime(requestId?: string) {
  const [rfpUpdates, setRfpUpdates] = useState<RFPRealtimeUpdate[]>([])
  const [quoteUpdates, setQuoteUpdates] = useState<QuoteRealtimeUpdate[]>([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    let channel: RealtimeChannel

    const subscribeToUpdates = async () => {
      // Subscribe to RFP table changes
      if (requestId) {
        // Subscribe to specific RFP
        channel = supabase
          .channel(`rfp-${requestId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'requests',
              filter: `id=eq.${requestId}`,
            },
            (payload) => {
              const update: RFPRealtimeUpdate = {
                id: payload.new.id,
                status: payload.new.status,
                quoteCount: payload.new.quote_count || 0,
                updatedAt: new Date(payload.new.updated_at),
              }
              setRfpUpdates((prev) => [...prev, update])
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'quotes',
              filter: `request_id=eq.${requestId}`,
            },
            (payload) => {
              const quote: QuoteRealtimeUpdate = {
                id: payload.new.id,
                requestId: payload.new.request_id,
                operatorName: payload.new.operator_name,
                price: payload.new.price,
                aiScore: payload.new.ai_score || 0,
                createdAt: new Date(payload.new.created_at),
              }
              setQuoteUpdates((prev) => [...prev, quote])
            }
          )
          .subscribe()
      } else {
        // Subscribe to all RFPs
        channel = supabase
          .channel('all-rfqs')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'requests',
            },
            (payload) => {
              if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                const update: RFPRealtimeUpdate = {
                  id: payload.new.id,
                  status: payload.new.status,
                  quoteCount: payload.new.quote_count || 0,
                  updatedAt: new Date(payload.new.updated_at),
                }
                setRfpUpdates((prev) => [...prev, update])
              }
            }
          )
          .subscribe()
      }
    }

    subscribeToUpdates()

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [requestId, supabase])

  return {
    rfpUpdates,
    quoteUpdates,
    clearUpdates: () => {
      setRfpUpdates([])
      setQuoteUpdates([])
    },
  }
}
