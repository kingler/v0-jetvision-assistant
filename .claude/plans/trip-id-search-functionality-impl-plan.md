Trip ID Search Functionality Implementation Plan
Date: 2026-01-02 Feature: Auto-detect Trip IDs in chat and display RFQ data
Overview
Enable users to enter a Trip ID (e.g., B22E7Z or atrip-64956150) in the chat, automatically search Avinode for RFQ data, and display quotes using the existing RFQFlightsList component. Support session management to load existing flight requests or create new ones.
User Requirements Summary
Trip ID Formats: atrip-XXXXXXXX (Avinode) and B22E7Z (6-12 alphanumeric)
Auto-search: Immediately search when Trip ID detected (no confirmation)
Storage: Check Supabase requests table for existing flight requests
List Trips: "show me all my trips" - try Avinode API, fall back to database
Session Navigation: Switch to existing session or create new one
Critical Files to Modify
File	Purpose
app/api/chat/route.ts	Trip ID detection, database lookup, tool routing
lib/supabase/admin.ts	New database helper functions
lib/mcp/avinode-server.ts	Add list_trips MCP tool
lib/mcp/clients/avinode-client.ts	Add listTrips API method
components/chat-interface.tsx	Handle trip navigation, display RFQ data
app/page.tsx	Session navigation handler
components/chat/trip-list-card.tsx	New component for trip list display
Implementation Steps
Step 1: Database Helper Functions
File: lib/supabase/admin.ts Add three new functions after existing helpers (~line 100):

// 1. Find request by Trip ID
export async function findRequestByTripId(
  tripId: string,
  clerkUserId: string
): Promise<Database['public']['Tables']['requests']['Row'] | null>

// 2. List all trips for user
export async function listUserTrips(
  clerkUserId: string,
  options?: { limit?: number; status?: string }
): Promise<{ trips: Array<...>; total: number }>

// 3. Create/update request with Trip ID
export async function upsertRequestWithTripId(
  tripId: string,
  clerkUserId: string,
  flightData: { departure_airport, arrival_airport, departure_date, passengers, deep_link }
): Promise<Database['public']['Tables']['requests']['Row']>
Step 2: Enhanced Trip ID Detection
File: app/api/chat/route.ts (lines 613-648) Improve pattern matching:

// Current patterns (keep)
const avinodeTripIdPattern = /\batrip-\d{6,12}\b/i

// Enhanced generic pattern - more permissive
const genericTripIdPattern = /\b[A-Z0-9]{6,8}\b/gi  // 6-8 char alphanumeric

// Trip intent keywords (expand list)
const tripIdKeywords = [
  'trip id', 'tripid', 'trip:', 'trip #', 'trip number',
  'here is', "here's", 'my trip', 'search', 'lookup',
  'find', 'get rfq', 'get quotes', 'check trip'
]

// Auto-detect when:
// 1. Message is ONLY the ID (6-8 chars, no other words)
// 2. Message contains trip keywords + ID
// 3. Session already has tripId set (user is continuing)
Step 3: Database Lookup in Chat API
File: app/api/chat/route.ts (after line 648) Add database check when Trip ID detected:

if (detectedTripId) {
  // 1. Lookup existing request
  const existingRequest = await findRequestByTripId(detectedTripId, userId)

  if (existingRequest) {
    // 2. Include in response for session switching
    responseData.existing_request = existingRequest
    responseData.should_load_existing = true
  }

  // 3. Force get_rfq tool call
  toolChoice = 'required'
}
Step 4: Add list_trips MCP Tool
File: lib/mcp/avinode-server.ts Add to AVINODE_TOOLS array (~line 460):

{
  type: 'function',
  function: {
    name: 'list_trips',
    description: 'List all trips for the user. Returns from Avinode API if available, falls back to local database.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 20 },
        status: { type: 'string', enum: ['all', 'active', 'completed'] }
      }
    }
  }
}
Add to callTool switch:

case 'list_trips':
  return await this.listTripsWithFallback(params, userId)
File: lib/mcp/clients/avinode-client.ts Add listTrips method:

async listTrips(options?: { limit?: number }): Promise<{
  trips: Array<TripSummary>
  source: 'api' | 'database'
}>
Step 5: "Show me all my trips" Detection
File: app/api/chat/route.ts (~line 610) Add intent detection:

const wantsTrips = /\b(show|list|get|my)\b.*(trips?|flights?)/i.test(messageText) ||
                   /all\s+(my\s+)?trips/i.test(messageText)

if (wantsTrips) {
  // Force list_trips tool
  toolChoice = 'required'
  // Add system context to use list_trips
}
Step 6: Session Navigation Handler
File: app/page.tsx (~line 65) Add new handler:

const handleNavigateToTrip = useCallback((
  tripId: string,
  requestData: ExistingRequest
) => {
  // Check if session exists for this trip
  const existingSession = chatSessions.find(s => s.tripId === tripId)

  if (existingSession) {
    setActiveChatId(existingSession.id)
  } else {
    // Create new session from request data
    const newSession: ChatSession = {
      id: `trip-${Date.now()}`,
      route: `${requestData.departure_airport} → ${requestData.arrival_airport}`,
      passengers: requestData.passengers,
      date: requestData.departure_date,
      status: 'analyzing_options',
      currentStep: 3,
      tripId: tripId,
      tripIdSubmitted: true,
      databaseRequestId: requestData.id,
      messages: [],
    }
    setChatSessions([newSession, ...chatSessions])
    setActiveChatId(newSession.id)
  }
  setCurrentView('chat')
}, [chatSessions])
Pass to ChatInterface:

<ChatInterface
  // ...existing props
  onNavigateToTrip={handleNavigateToTrip}
/>
Step 7: ChatInterface Updates
File: components/chat-interface.tsx
Add prop type (~line 50):

interface ChatInterfaceProps {
  // ...existing
  onNavigateToTrip?: (tripId: string, requestData: any) => void
}
Handle SSE response with existing request (~line 1100):

if (data.existing_request && data.should_load_existing) {
  // Save current session
  onUpdateChat(activeChat.id, {
    messages: latestMessagesRef.current
  })
  // Navigate to existing trip
  onNavigateToTrip?.(data.trip_id, data.existing_request)
  return
}
When no existing request, create database record after get_rfq returns:

if (data.new_request_created) {
  // Update session with database ID
  onUpdateChat(activeChat.id, {
    databaseRequestId: data.request_id,
    tripId: data.trip_id
  })
}
Step 8: Trip List Display Component
New File: components/chat/trip-list-card.tsx

interface TripListCardProps {
  trips: Array<{
    trip_id: string
    route: string
    date: string
    passengers: number
    status: string
    quote_count?: number
  }>
  onSelectTrip: (tripId: string) => void
}

export function TripListCard({ trips, onSelectTrip }: TripListCardProps) {
  // Render clickable trip cards
}
Step 9: Update ChatSession Interface
File: components/chat-sidebar.tsx (~line 34) Add new fields:

export interface ChatSession {
  // ...existing fields

  /** Database request ID when linked to Supabase */
  databaseRequestId?: string

  /** Source of session data */
  loadedFromExisting?: boolean
}
Data Flow Diagram

User types "B22E7Z" in chat
         │
         ▼
┌─────────────────────────┐
│  Pattern Detection      │
│  (app/api/chat/route)   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Database Lookup        │
│  findRequestByTripId()  │
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
 EXISTS         NOT FOUND
    │               │
    ▼               ▼
Return          Call get_rfq
existing        Create new
request         request record
    │               │
    └───────┬───────┘
            │
            ▼
┌─────────────────────────┐
│  SSE Response           │
│  { rfq_data, request }  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  ChatInterface          │
│  Handle navigation      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Display RFQFlightsList │
│  in chat thread         │
└─────────────────────────┘
Testing Checklist
 Enter atrip-12345678 - auto-searches and displays RFQ data
 Enter B22E7Z - detected as Trip ID, searches Avinode
 Enter Trip ID that exists in database - loads existing session
 Enter new Trip ID - creates new database record
 Type "show me all my trips" - displays trip list
 Click trip in list - navigates to that session
 Session state preserved when switching
 RFQFlightsList displays correctly with quote data
Risk Mitigation
Avinode API Failures: Database fallback for list_trips
False Positive Detection: Require minimum 6 chars, prefer with context keywords
Session State Loss: Save to parent before navigation
Race Conditions: Use refs for latest state during async operations
