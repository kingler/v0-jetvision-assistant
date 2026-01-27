/**
 * Database Query Functions for Archived REPs
 * Handles all Supabase queries with RLS (Row Level Security)
 */

import { createClient } from '@/lib/supabase/server'
import type { ArchivedRFPSummary, ArchivedRFPDetail, QuoteData } from '@/lib/types/chat-agent'
import type { RequestStatus } from '@/lib/types/database'

/**
 * Archived REP Query Filters
 */
export interface ArchivedRFPFilters {
  statusFilter?: ('completed' | 'cancelled' | 'failed')[]
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

/**
 * Get paginated list of archived REPs for a user
 * @param userId - User ID from Clerk
 * @param filters - Optional filters
 * @returns List of archived REP summaries with pagination info
 */
export async function getArchivedRFPs(
  userId: string,
  filters: ArchivedRFPFilters = {}
): Promise<{ rfqs: ArchivedRFPSummary[]; totalCount: number; hasMore: boolean }> {
  const supabase = await createClient()

  const {
    statusFilter = ['completed', 'cancelled', 'failed'],
    startDate,
    endDate,
    limit = 10,
    offset = 0,
  } = filters

  // Build query
  let query = supabase
    .from('requests')
    .select(`
      id,
      departure_airport,
      arrival_airport,
      departure_date,
      passengers,
      status,
      updated_at,
      created_at,
      client_profiles!inner (
        id,
        contact_name,
        company_name
      ),
      quotes!left (
        id,
        operator_name,
        total_price,
        ranking,
        status
      ),
      workflow_states!inner (
        current_state,
        created_at,
        state_duration_ms
      )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .in('status', statusFilter as RequestStatus[])
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Apply date filters
  if (startDate) {
    query = query.gte('updated_at', startDate.toISOString())
  }
  if (endDate) {
    query = query.lte('updated_at', endDate.toISOString())
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[getArchivedRFPs] Error:', error)
    throw new Error(`Failed to fetch archived REPs: ${error.message}`)
  }

  // Transform to ArchivedRFPSummary
  const rfqs: ArchivedRFPSummary[] = (data || []).map((row: any) => {
    // Find selected/accepted quote
    const selectedQuote = row.quotes?.find((q: any) =>
      q.status === 'accepted' || q.ranking === 1
    )

    // Calculate total duration
    const totalDuration = row.workflow_states?.reduce(
      (sum: number, ws: any) => sum + (ws.state_duration_ms || 0),
      0
    ) || 0

    return {
      id: row.id,
      clientName: row.client_profiles?.contact_name || row.client_profiles?.company_name || 'Unknown',
      route: {
        departure: row.departure_airport,
        arrival: row.arrival_airport,
      },
      date: row.departure_date,
      passengers: row.passengers,
      status: row.status,
      completedAt: row.updated_at,
      duration: totalDuration,
      selectedOperator: selectedQuote?.operator_name,
      finalPrice: selectedQuote?.total_price,
    }
  })

  return {
    rfqs,
    totalCount: count || 0,
    hasMore: (offset + limit) < (count || 0),
  }
}

/**
 * Get complete archived REP details
 * @param rfpId - REP ID
 * @param userId - User ID (for RLS verification)
 * @returns Complete archived REP data
 */
export async function getArchivedRFPDetail(
  rfpId: string,
  userId: string
): Promise<ArchivedRFPDetail> {
  const supabase = await createClient()

  // Fetch request with all related data
  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      client_profiles!inner (
        id,
        contact_name,
        company_name,
        email,
        preferences
      ),
      quotes!left (
        id,
        operator_name,
        aircraft_type,
        base_price,
        total_price,
        score,
        ranking,
        status,
        aircraft_details,
        availability_confirmed,
        valid_until
      ),
      workflow_states!inner (
        current_state,
        state_entered_at,
        state_duration_ms,
        agent_id
      )
    `)
    .eq('id', rfpId)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('[getArchivedRFPDetail] Error:', error)
    throw new Error(`Failed to fetch archived REP detail: ${error.message}`)
  }

  if (!data) {
    throw new Error('Archived REP not found')
  }

  // Find selected quote
  const selectedQuote = data.quotes?.find((q: any) =>
    q.status === 'accepted' || q.ranking === 1
  )

  // Sort workflow states chronologically
  const workflowHistory = (data.workflow_states || [])
    .sort((a: any, b: any) =>
      new Date(a.state_entered_at).getTime() - new Date(b.state_entered_at).getTime()
    )
    .map((ws: any) => ({
      state: ws.current_state,
      enteredAt: ws.state_entered_at,
      duration: ws.state_duration_ms,
      agentId: ws.agent_id,
    }))

  // Calculate total duration
  const totalDuration = workflowHistory.reduce(
    (sum: number, ws: any) => sum + (ws.duration || 0),
    0
  )

  // Transform quotes to QuoteData format
  const allQuotes: QuoteData[] = (data.quotes || []).map((q: any) => ({
    id: q.id,
    operatorName: q.operator_name,
    operatorId: q.operator_id || '',
    aircraftType: q.aircraft_type,
    price: q.total_price,
    currency: 'USD',
    departureTime: '', // Would come from flight details
    arrivalTime: '',
    flightDuration: '',
    aiScore: q.score || 0,
    rank: q.ranking || 0,
    operatorRating: 0,
    isRecommended: q.ranking === 1,
    features: [],
    metadata: {
      basePrice: q.base_price,
      availabilityConfirmed: q.availability_confirmed,
      validUntil: q.valid_until,
      aircraftDetails: q.aircraft_details,
    },
  }))

  // Build detail object
  const detail: ArchivedRFPDetail = {
    id: data.id,
    clientName: data.client_profiles?.contact_name || data.client_profiles?.company_name || 'Unknown',
    route: {
      departure: data.departure_airport,
      arrival: data.arrival_airport,
    },
    date: data.departure_date,
    passengers: data.passengers,
    status: data.status,
    completedAt: data.updated_at,
    duration: totalDuration,
    selectedOperator: selectedQuote?.operator_name,
    finalPrice: selectedQuote?.total_price,

    request: {
      id: data.id,
      departureAirport: data.departure_airport,
      arrivalAirport: data.arrival_airport,
      departureDate: data.departure_date,
      returnDate: data.return_date,
      passengers: data.passengers,
      aircraftType: data.aircraft_type,
      budget: data.budget,
      specialRequirements: data.special_requirements,
    },

    client: {
      id: data.client_profiles.id,
      name: data.client_profiles.contact_name,
      email: data.client_profiles.email,
      company: data.client_profiles.company_name,
      isVIP: data.client_profiles.preferences?.isVIP || false,
      preferences: data.client_profiles.preferences,
    },

    selectedQuote: selectedQuote ? {
      id: selectedQuote.id,
      operatorName: selectedQuote.operator_name,
      aircraftType: selectedQuote.aircraft_type,
      basePrice: selectedQuote.base_price,
      totalPrice: selectedQuote.total_price,
      score: selectedQuote.score,
      ranking: selectedQuote.ranking,
    } : undefined,

    allQuotes,
    workflowHistory,

    // Proposal info would need to be fetched from proposals table if it exists
    // For now, we'll leave it undefined
    proposal: undefined,
  }

  return detail
}
