'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { UIActionResult } from '@mcp-ui/server';

// ── Registry Components ──────────────────────────────────────────────
import { TripCreatedUI } from '@/components/mcp-ui/composites/TripCreatedUI';
import { RfqResultsUI } from '@/components/mcp-ui/composites/RfqResultsUI';
import { QuoteComparisonUI } from '@/components/mcp-ui/composites/QuoteComparisonUI';
import { EmailApprovalUI } from '@/components/mcp-ui/composites/EmailApprovalUI';
import { RfqQuoteDetailsCard } from '@/components/avinode';
import { ProposalPreview } from '@/components/message-components/proposal-preview';
import { PipelineDashboard } from '@/components/message-components/pipeline-dashboard';
import { OperatorChatInline } from '@/components/message-components/operator-chat-inline';
import { ProposalSentConfirmation } from '@/components/proposal/proposal-sent-confirmation';
import { ContractSentConfirmation } from '@/components/contract/contract-sent-confirmation';

/**
 * Unified demo page for ALL Tool UI Registry components.
 *
 * Displays every registered MCP UI component across all three trip types
 * (one-way, round-trip, multi-city) with titles, descriptions,
 * and data-dependency documentation.
 *
 * Route: /component-demo/all-tool-ui
 * Public - no auth required.
 */

// =============================================================================
// TYPES
// =============================================================================

type TripType = 'one-way' | 'round-trip' | 'multi-city';

// =============================================================================
// ACTION HANDLER
// =============================================================================

function ActionLog({ lastAction }: { lastAction: string | null }) {
  if (!lastAction) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-foreground text-background text-xs font-mono px-4 py-2 rounded-lg shadow-xl max-w-md truncate" data-testid="action-log">
      {lastAction}
    </div>
  );
}

// =============================================================================
// SECTION WRAPPER
// =============================================================================

function DemoSection({
  id,
  toolName,
  component,
  description,
  dataDependencies,
  children,
}: {
  id: string;
  toolName: string;
  component: string;
  description: string;
  dataDependencies: string[];
  children: React.ReactNode;
}) {
  return (
    <section id={id} data-testid={`section-${id}`} className="scroll-mt-24">
      <div className="mb-4 space-y-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold text-foreground">{component}</h2>
          <code className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
            {toolName}
          </code>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {dataDependencies.map((dep) => (
            <span key={dep} className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {dep}
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-6">{children}</div>
      <hr className="my-10 border-border" />
    </section>
  );
}

function TripTypeLabel({ type }: { type: string }) {
  const colors: Record<string, string> = {
    'One-Way': 'bg-muted text-muted-foreground',
    'Round-Trip': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    'Multi-City': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  };
  return (
    <h3 className="text-sm font-medium mb-2">
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] || ''}`}>
        {type}
      </span>
    </h3>
  );
}

// =============================================================================
// DEMO DATA
// =============================================================================

const AIRPORTS = {
  KTEB: { icao: 'KTEB', name: 'Teterboro Airport', city: 'Teterboro, NJ' },
  KVNY: { icao: 'KVNY', name: 'Van Nuys Airport', city: 'Van Nuys, CA' },
  KMIA: { icao: 'KMIA', name: 'Miami International', city: 'Miami, FL' },
  EGLL: { icao: 'EGLL', name: 'Heathrow Airport', city: 'London' },
  LFPB: { icao: 'LFPB', name: 'Paris Le Bourget', city: 'Paris' },
  LSZH: { icao: 'LSZH', name: 'Zurich Airport', city: 'Zurich' },
};

const MULTI_SEGMENTS_3 = [
  { departureAirport: AIRPORTS.KTEB, arrivalAirport: AIRPORTS.EGLL, departureDate: '2026-03-20', passengers: 5 },
  { departureAirport: AIRPORTS.EGLL, arrivalAirport: AIRPORTS.LFPB, departureDate: '2026-03-23', passengers: 5 },
  { departureAirport: AIRPORTS.LFPB, arrivalAirport: AIRPORTS.KTEB, departureDate: '2026-03-26', passengers: 5 },
];

const buildEmailBody = (name: string, route: string) =>
  `Dear ${name},\n\nPlease find attached your charter flight proposal for ${route}.\n\nWe have secured competitive pricing from our network of vetted operators. The attached PDF includes full flight details, aircraft specifications, and pricing breakdown.\n\nPlease review at your convenience.\n\nBest regards,\nYour Charter Team`;

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function AllToolUIDemoPage() {
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [tripFilter, setTripFilter] = useState<'all' | TripType>('all');

  // Override the app layout's overflow-hidden so this demo page can scroll
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const main = document.getElementById('main-content');
    html.style.overflow = 'auto';
    body.style.overflow = 'auto';
    if (main) main.style.overflow = 'auto';
    return () => {
      html.style.overflow = '';
      body.style.overflow = '';
      if (main) main.style.overflow = '';
    };
  }, []);

  const onAction = (label: string) => (action: UIActionResult) => {
    const detail =
      action.type === 'tool'
        ? `tool:${action.payload.toolName}`
        : action.type === 'notify'
          ? `notify:${action.payload.message}`
          : action.type === 'prompt'
            ? `prompt:${action.payload.prompt.slice(0, 40)}...`
            : action.type;
    setLastAction(`[${label}] ${detail}`);
    console.log(`[${label}]`, action);
  };

  const show = (type: TripType) => tripFilter === 'all' || tripFilter === type;

  // Table of contents
  const TOC = [
    { id: 'create-trip', label: '1. TripCreatedUI' },
    { id: 'get-rfq', label: '2. RfqResultsUI' },
    { id: 'get-quote', label: '3. RfqQuoteDetailsCard' },
    { id: 'get-trip-messages', label: '4. OperatorChatInline' },
    { id: 'list-requests', label: '5. PipelineDashboard' },
    { id: 'get-quotes', label: '6. QuoteComparisonUI' },
    { id: 'create-proposal', label: '7. ProposalPreview' },
    { id: 'prepare-email', label: '8. EmailApprovalUI' },
    { id: 'send-proposal-email', label: '9. ProposalSentConfirmation' },
    { id: 'book-flight', label: '10. ContractSentConfirmation' },
  ];

  return (
    <div className="min-h-screen bg-muted dark:bg-background">
      <ActionLog lastAction={lastAction} />

      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground" data-testid="demo-title">
            Tool UI Registry — All Components
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            11 registered MCP UI components across one-way, round-trip, and multi-city trip types
          </p>

          {/* Trip type filter */}
          <div className="flex flex-wrap gap-2 mt-3" data-testid="trip-filter">
            {(['all', 'one-way', 'round-trip', 'multi-city'] as const).map((t) => (
              <Button
                key={t}
                variant={tripFilter === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTripFilter(t)}
                data-testid={`btn-${t}`}
              >
                {t === 'all' ? 'All Trip Types' : t.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Button>
            ))}
          </div>

          {/* TOC */}
          <nav className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
            {TOC.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="hover:text-foreground hover:underline">
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-2">

        {/* ================================================================
            1. TripCreatedUI — create_trip
           ================================================================ */}
        <DemoSection
          id="create-trip"
          toolName="create_trip"
          component="TripCreatedUI"
          description="Displayed after a trip is created in Avinode. Shows trip summary card with route visualization and deep link buttons."
          dataDependencies={[
            'result.trip_id',
            'result.deep_link',
            'result.trip_type',
            'result.segments[]',
            'input.departure_airport',
            'input.arrival_airport',
            'input.departure_date',
            'input.passengers',
            'input.return_date (round-trip)',
          ]}
        >
          {show('one-way') && (
            <div data-testid="create-trip-one-way">
              <TripTypeLabel type="One-Way" />
              <TripCreatedUI
                tripId="atrip-OW-001"
                deepLink="https://sandbox.avinode.com/marketplace/mvc/search#preSearch"
                departureAirport={AIRPORTS.KTEB}
                arrivalAirport={AIRPORTS.KMIA}
                departureDate="2026-03-15"
                passengers={3}
                tripType="single_leg"
                onAction={onAction('create_trip/one-way')}
              />
            </div>
          )}
          {show('round-trip') && (
            <div data-testid="create-trip-round-trip">
              <TripTypeLabel type="Round-Trip" />
              <TripCreatedUI
                tripId="atrip-RT-002"
                deepLink="https://sandbox.avinode.com/marketplace/mvc/search#preSearch"
                departureAirport={AIRPORTS.KTEB}
                arrivalAirport={AIRPORTS.KVNY}
                departureDate="2026-04-05"
                passengers={6}
                tripType="round_trip"
                returnDate="2026-04-08"
                onAction={onAction('create_trip/round-trip')}
              />
            </div>
          )}
          {show('multi-city') && (
            <div data-testid="create-trip-multi-city">
              <TripTypeLabel type="Multi-City" />
              <TripCreatedUI
                tripId="atrip-MC-003"
                deepLink="https://sandbox.avinode.com/marketplace/mvc/search#preSearch"
                departureAirport={AIRPORTS.KTEB}
                arrivalAirport={AIRPORTS.KTEB}
                departureDate="2026-03-20"
                passengers={5}
                tripType="multi_city"
                segments={MULTI_SEGMENTS_3}
                onAction={onAction('create_trip/multi-city')}
              />
            </div>
          )}
        </DemoSection>

        {/* ================================================================
            2. RfqResultsUI — get_rfq
           ================================================================ */}
        <DemoSection
          id="get-rfq"
          toolName="get_rfq"
          component="RfqResultsUI"
          description="Lists flight quotes received from operators after RFQs are sent. Each card shows operator, aircraft, price, and actions."
          dataDependencies={[
            'result.flights[] (RFQFlight[])',
            'flight.id',
            'flight.quoteId',
            'flight.operatorName',
            'flight.aircraftType',
            'flight.price',
            'flight.rfqStatus',
          ]}
        >
          <RfqResultsUI
            flights={[
              {
                id: 'rfq-flight-1',
                quoteId: 'aquote-001',
                departureAirport: AIRPORTS.KTEB,
                arrivalAirport: AIRPORTS.KMIA,
                departureDate: '2026-03-15',
                departureTime: '10:00',
                flightDuration: '4h 30m',
                aircraftType: 'Gulfstream G650',
                aircraftModel: 'G650',
                passengerCapacity: 13,
                operatorName: 'Prime Jet, LLC',
                operatorRating: 4.8,
                totalPrice: 47500,
                currency: 'USD',
                amenities: { wifi: true, pets: true, smoking: false, galley: true, lavatory: true, medical: true },
                rfqStatus: 'quoted' as const,
                lastUpdated: new Date().toISOString(),
                aircraftCategory: 'Heavy Jet',
              },
              {
                id: 'rfq-flight-2',
                quoteId: 'aquote-002',
                departureAirport: AIRPORTS.KTEB,
                arrivalAirport: AIRPORTS.KMIA,
                departureDate: '2026-03-15',
                departureTime: '11:00',
                flightDuration: '4h 20m',
                aircraftType: 'Bombardier Global 7500',
                aircraftModel: 'Global 7500',
                passengerCapacity: 17,
                operatorName: 'Atlas Air Charter',
                operatorRating: 4.5,
                totalPrice: 52000,
                currency: 'USD',
                amenities: { wifi: true, pets: false, smoking: false, galley: true, lavatory: true, medical: false },
                rfqStatus: 'quoted' as const,
                lastUpdated: new Date().toISOString(),
                aircraftCategory: 'Heavy Jet',
              },
            ] as any}
            onAction={onAction('get_rfq')}
          />
        </DemoSection>

        {/* ================================================================
            3. RfqQuoteDetailsCard — get_quote
           ================================================================ */}
        <DemoSection
          id="get-quote"
          toolName="get_quote"
          component="RfqQuoteDetailsCard"
          description="Detailed view of a single operator quote with aircraft specs, pricing, and flight time."
          dataDependencies={[
            'result.rfqId / result.rfq_id',
            'result.quoteId / result.quote_id',
            'result.operatorName',
            'result.aircraftType',
            'result.totalPrice',
            'result.currency',
            'result.flightTimeMinutes',
            'result.passengerCapacity',
            'result.rfqStatus',
          ]}
        >
          <RfqQuoteDetailsCard
            rfqId="arfq-001"
            quoteId="aquote-001"
            operator={{ name: 'Prime Jet, LLC', rating: 4.8 }}
            aircraft={{ type: 'Gulfstream G650', tail: 'N650PJ', category: 'Heavy Jet', maxPassengers: 13 }}
            price={{ amount: 47500, currency: 'USD' }}
            flightDetails={{ flightTimeMinutes: 270, distanceNm: 1200 }}
            status="quoted"
            statusDescription="Quote received from operator"
          />
        </DemoSection>

        {/* ================================================================
            4. OperatorChatInline — get_trip_messages
           ================================================================ */}
        <DemoSection
          id="get-trip-messages"
          toolName="get_trip_messages"
          component="OperatorChatInline"
          description="Inline operator message thread displayed within the chat. Shows conversation history with reply and full-thread actions."
          dataDependencies={[
            'input.request_id / input.trip_id',
            'result.messages[]',
            'message.id',
            'message.content',
            'message.sentAt',
            'message.senderType (seller/buyer)',
            'message.senderName',
          ]}
        >
          <OperatorChatInline
            flightContext={{ quoteId: 'aquote-001', operatorName: 'Prime Jet, LLC' }}
            messages={[
              { id: 'msg-1', content: 'We can accommodate 6 passengers on the G650. What catering preferences do you have?', timestamp: '2026-03-10T14:30:00Z', type: 'RESPONSE', sender: 'Prime Jet, LLC' },
              { id: 'msg-2', content: 'Light catering for 6 — fruit, sandwiches, and beverages. Also need pet-friendly cabin.', timestamp: '2026-03-10T15:05:00Z', type: 'REQUEST', sender: 'You' },
              { id: 'msg-3', content: 'Pets are welcome on this aircraft. Catering noted. We will include a pet blanket and water bowl.', timestamp: '2026-03-10T15:45:00Z', type: 'RESPONSE', sender: 'Prime Jet, LLC' },
            ]}
            onViewFullThread={(quoteId) => console.log('View thread:', quoteId)}
            onReply={(quoteId) => console.log('Reply to:', quoteId)}
          />
        </DemoSection>

        {/* ================================================================
            5. PipelineDashboard — list_requests
           ================================================================ */}
        <DemoSection
          id="list-requests"
          toolName="list_requests"
          component="PipelineDashboard"
          description="Dashboard showing all active flight requests with pipeline stats. Supports filtering and drill-down."
          dataDependencies={[
            'result.requests[]',
            'result.total',
            'request.id',
            'request.departure_airport',
            'request.arrival_airport',
            'request.departure_date',
            'request.passengers',
            'request.status',
            'request.client_name',
          ]}
        >
          <PipelineDashboard
            stats={{
              totalRequests: 5,
              pendingRequests: 2,
              completedRequests: 1,
              totalQuotes: 8,
              activeWorkflows: 2,
            }}
            requests={[
              { id: 'req-001', departureAirport: 'KTEB', arrivalAirport: 'KMIA', departureDate: '2026-03-15', passengers: 3, status: 'awaiting_quotes', createdAt: '2026-03-01T10:00:00Z', clientName: 'John Smith' },
              { id: 'req-002', departureAirport: 'KTEB', arrivalAirport: 'KVNY', departureDate: '2026-04-05', passengers: 6, status: 'pending', createdAt: '2026-03-05T09:00:00Z', clientName: 'Sarah Johnson' },
              { id: 'req-003', departureAirport: 'KTEB', arrivalAirport: 'KTEB', departureDate: '2026-03-20', passengers: 5, status: 'completed', createdAt: '2026-02-28T14:00:00Z', clientName: 'Michael Chen' },
            ]}
            onViewRequest={(id) => console.log('View request:', id)}
            onRefresh={() => console.log('Refresh pipeline')}
          />
        </DemoSection>

        {/* ================================================================
            6. QuoteComparisonUI — get_quotes
           ================================================================ */}
        <DemoSection
          id="get-quotes"
          toolName="get_quotes"
          component="QuoteComparisonUI"
          description="Side-by-side comparison table of multiple operator quotes. Selecting a quote triggers create_proposal."
          dataDependencies={[
            'result.quotes[]',
            'quote.id',
            'quote.operator_name',
            'quote.aircraft_type',
            'quote.total_price',
            'quote.departure_time',
            'quote.arrival_time',
            'quote.flight_duration',
            'quote.score (optional)',
            'quote.isRecommended (optional)',
          ]}
        >
          <QuoteComparisonUI
            quotes={[
              { id: 'q-1', operatorName: 'Prime Jet, LLC', aircraftType: 'Gulfstream G650', price: 47500, departureTime: '10:00', arrivalTime: '14:30', flightDuration: '4h 30m', score: 92, isRecommended: true },
              { id: 'q-2', operatorName: 'Atlas Air Charter', aircraftType: 'Global 7500', price: 52000, departureTime: '11:00', arrivalTime: '15:20', flightDuration: '4h 20m', score: 87 },
              { id: 'q-3', operatorName: 'SkyVIP Aviation', aircraftType: 'Falcon 8X', price: 43800, departureTime: '09:00', arrivalTime: '13:45', flightDuration: '4h 45m', score: 78 },
            ]}
            onAction={onAction('get_quotes')}
          />
        </DemoSection>

        {/* ================================================================
            7. ProposalPreview — create_proposal / get_proposal
           ================================================================ */}
        <DemoSection
          id="create-proposal"
          toolName="create_proposal / get_proposal"
          component="ProposalPreview"
          description="Preview card for a generated proposal document. Shows flight details, selected quote, and send actions."
          dataDependencies={[
            'result.id / result.proposal_id',
            'result.title / result.proposal_number',
            'result.departure_airport',
            'result.arrival_airport',
            'result.departure_date',
            'result.passengers',
            'result.operator_name',
            'result.aircraft_type',
            'result.total_amount',
            'result.file_url',
            'result.trip_type (optional)',
            'result.segments[] (optional)',
          ]}
        >
          <ProposalPreview
            proposal={{
              id: 'prop-001',
              title: 'Charter Flight Proposal',
              flightDetails: { route: 'KTEB → KMIA', date: '2026-03-15', passengers: 3 },
              selectedQuote: { operatorName: 'Prime Jet, LLC', aircraftType: 'Gulfstream G650', price: 47500 },
            }}
            onView={(id) => console.log('View proposal:', id)}
            onAccept={(id) => console.log('Accept proposal:', id)}
          />
        </DemoSection>

        {/* ================================================================
            8. EmailApprovalUI — prepare_proposal_email
           ================================================================ */}
        <DemoSection
          id="prepare-email"
          toolName="prepare_proposal_email"
          component="EmailApprovalUI"
          description="Human-in-the-loop email review before sending. User can edit subject/body, review attachments, and approve or cancel. Sending triggers send_proposal_email tool."
          dataDependencies={[
            'result.proposal_id',
            'result.proposal_number',
            'result.to { email, name }',
            'result.subject',
            'result.body',
            'result.attachments[]',
            'result.flight_details { departureAirport, arrivalAirport, departureDate, passengers, tripType, returnDate, segments[] }',
            'result.pricing { subtotal, total, currency }',
            'result.generated_at',
            'result.request_id',
          ]}
        >
          {show('one-way') && (
            <div data-testid="email-one-way">
              <TripTypeLabel type="One-Way" />
              <EmailApprovalUI
                proposalId="prop-ow-001"
                proposalNumber="PROP-2026-0042"
                to={{ email: 'john@acme.com', name: 'John Smith' }}
                subject="Charter Flight Proposal: KTEB to KMIA - March 15, 2026"
                body={buildEmailBody('John', 'KTEB to KMIA on March 15, 2026')}
                attachments={[{ name: 'Proposal-KTEB-KMIA.pdf', url: '#', size: 245000 }]}
                flightDetails={{ departureAirport: 'KTEB', arrivalAirport: 'KMIA', departureDate: '2026-03-15', passengers: 3, tripType: 'one_way' }}
                pricing={{ subtotal: 42000, total: 45000, currency: 'USD' }}
                generatedAt={new Date().toISOString()}
                requestId="req-001"
                onAction={onAction('email/one-way')}
              />
            </div>
          )}
          {show('round-trip') && (
            <div data-testid="email-round-trip">
              <TripTypeLabel type="Round-Trip" />
              <EmailApprovalUI
                proposalId="prop-rt-002"
                proposalNumber="PROP-2026-0078"
                to={{ email: 'sarah@globalcorp.com', name: 'Sarah Johnson' }}
                subject="Charter Flight Proposal: KTEB ⇄ KVNY Round-Trip"
                body={buildEmailBody('Sarah', 'a round-trip KTEB ⇄ KVNY departing April 5 and returning April 8')}
                attachments={[{ name: 'Proposal-KTEB-KVNY-RT.pdf', url: '#', size: 312000 }]}
                flightDetails={{ departureAirport: 'KTEB', arrivalAirport: 'KVNY', departureDate: '2026-04-05', passengers: 6, tripType: 'round_trip', returnDate: '2026-04-08' }}
                pricing={{ subtotal: 88000, total: 92500, currency: 'USD' }}
                generatedAt={new Date().toISOString()}
                requestId="req-002"
                onAction={onAction('email/round-trip')}
              />
            </div>
          )}
          {show('multi-city') && (
            <div data-testid="email-multi-city">
              <TripTypeLabel type="Multi-City" />
              <EmailApprovalUI
                proposalId="prop-mc-003"
                proposalNumber="PROP-2026-0115"
                to={{ email: 'michael@invest.com', name: 'Michael Chen' }}
                subject="Charter Flight Proposal: Multi-City KTEB → EGLL → LFPB → KTEB"
                body={buildEmailBody('Michael', 'a multi-city itinerary: Teterboro → London → Paris → Teterboro')}
                attachments={[{ name: 'Proposal-Multi-City.pdf', url: '#', size: 487000 }]}
                flightDetails={{
                  departureAirport: 'KTEB', arrivalAirport: 'KTEB', departureDate: '2026-03-20', passengers: 5, tripType: 'multi_city',
                  segments: [
                    { departureAirport: 'KTEB', arrivalAirport: 'EGLL', date: '2026-03-20' },
                    { departureAirport: 'EGLL', arrivalAirport: 'LFPB', date: '2026-03-23' },
                    { departureAirport: 'LFPB', arrivalAirport: 'KTEB', date: '2026-03-26' },
                  ],
                }}
                pricing={{ subtotal: 175000, total: 185000, currency: 'USD' }}
                generatedAt={new Date().toISOString()}
                requestId="req-003"
                onAction={onAction('email/multi-city')}
              />
            </div>
          )}
        </DemoSection>

        {/* ================================================================
            9. ProposalSentConfirmation — send_proposal_email
           ================================================================ */}
        <DemoSection
          id="send-proposal-email"
          toolName="send_proposal_email"
          component="ProposalSentConfirmation"
          description="Confirmation card after proposal email is sent. Shows flight summary, client info, PDF link, and next-step actions (Edit Margin, Generate Contract)."
          dataDependencies={[
            'result.departure_airport',
            'result.arrival_airport',
            'result.departure_date',
            'result.trip_type (optional)',
            'result.return_date (optional)',
            'result.segments[] (optional)',
            'result.customer_name / result.client_name',
            'result.customer_email / result.client_email',
            'result.pdf_url / result.file_url',
            'result.file_name',
            'result.proposal_id',
            'result.total_amount / result.pricing',
          ]}
        >
          {show('one-way') && (
            <div data-testid="proposal-sent-one-way">
              <TripTypeLabel type="One-Way" />
              <ProposalSentConfirmation
                flightDetails={{ departureAirport: 'KTEB', arrivalAirport: 'KMIA', departureDate: '2026-03-15' }}
                client={{ name: 'John Smith', email: 'john@acme.com' }}
                pdfUrl="https://example.com/proposal-ow.pdf"
                fileName="Proposal-KTEB-KMIA.pdf"
                proposalId="prop-ow-001"
                pricing={{ total: 45000, currency: 'USD' }}
                onGenerateContract={() => console.log('Generate contract: one-way')}
              />
            </div>
          )}
          {show('round-trip') && (
            <div data-testid="proposal-sent-round-trip">
              <TripTypeLabel type="Round-Trip" />
              <ProposalSentConfirmation
                flightDetails={{ departureAirport: 'KTEB', arrivalAirport: 'KVNY', departureDate: '2026-04-05', tripType: 'round_trip', returnDate: '2026-04-08' }}
                client={{ name: 'Sarah Johnson', email: 'sarah@globalcorp.com' }}
                pdfUrl="https://example.com/proposal-rt.pdf"
                fileName="Proposal-KTEB-KVNY-RT.pdf"
                proposalId="prop-rt-002"
                pricing={{ total: 92500, currency: 'USD', outboundCost: 46000, returnCost: 46500 }}
                onEditMargin={() => console.log('Edit margin')}
                onGenerateContract={() => console.log('Generate contract: round-trip')}
              />
            </div>
          )}
          {show('multi-city') && (
            <div data-testid="proposal-sent-multi-city">
              <TripTypeLabel type="Multi-City" />
              <ProposalSentConfirmation
                flightDetails={{
                  departureAirport: 'KTEB', arrivalAirport: 'KTEB', departureDate: '2026-03-20', tripType: 'multi_city',
                  segments: [
                    { departureAirport: 'KTEB', arrivalAirport: 'EGLL', departureDate: '2026-03-20' },
                    { departureAirport: 'EGLL', arrivalAirport: 'LFPB', departureDate: '2026-03-23' },
                    { departureAirport: 'LFPB', arrivalAirport: 'KTEB', departureDate: '2026-03-26' },
                  ],
                }}
                client={{ name: 'Michael Chen', email: 'michael@invest.com' }}
                pdfUrl="https://example.com/proposal-mc.pdf"
                fileName="Proposal-Multi-City.pdf"
                proposalId="prop-mc-003"
                pricing={{ total: 185000, currency: 'USD' }}
                onGenerateContract={() => console.log('Generate contract: multi-city')}
              />
            </div>
          )}
        </DemoSection>

        {/* ================================================================
            10. ContractSentConfirmation — book_flight
           ================================================================ */}
        <DemoSection
          id="book-flight"
          toolName="book_flight / generate_contract"
          component="ContractSentConfirmation"
          description="Contract generation confirmation with status badges (draft → sent → signed → payment_pending → paid → completed). Shows route, pricing, PDF link, and Mark Payment action."
          dataDependencies={[
            'result.contract_id / result.contractId',
            'result.contract_number / result.contractNumber',
            'result.customer_name / result.customerName',
            'result.customer_email / result.customerEmail',
            'result.flight_route / result.flightRoute',
            'result.departure_date / result.departureDate',
            'result.total_amount / result.totalAmount',
            'result.currency',
            'result.pdf_url / result.pdfUrl',
            'result.status',
            'result.trip_type (optional)',
            'result.return_date (optional)',
            'result.segments[] (optional)',
          ]}
        >
          {show('one-way') && (
            <div data-testid="contract-one-way">
              <TripTypeLabel type="One-Way" />
              <ContractSentConfirmation
                contractId="contract-001"
                contractNumber="CONTRACT-2026-001"
                customerName="John Smith"
                customerEmail="john@acme.com"
                flightRoute="KTEB → KMIA"
                departureDate="2026-03-15"
                totalAmount={45000}
                currency="USD"
                pdfUrl="https://example.com/contract-ow.pdf"
                status="sent"
                onMarkPayment={() => console.log('Mark payment: one-way')}
              />
            </div>
          )}
          {show('round-trip') && (
            <div data-testid="contract-round-trip">
              <TripTypeLabel type="Round-Trip" />
              <ContractSentConfirmation
                contractId="contract-002"
                contractNumber="CONTRACT-2026-002"
                customerName="Sarah Johnson"
                customerEmail="sarah@globalcorp.com"
                flightRoute="KTEB → KVNY"
                departureDate="2026-04-05"
                totalAmount={92500}
                currency="USD"
                pdfUrl="https://example.com/contract-rt.pdf"
                status="sent"
                tripType="round_trip"
                returnDate="2026-04-08"
                onMarkPayment={() => console.log('Mark payment: round-trip')}
              />
            </div>
          )}
          {show('multi-city') && (
            <div data-testid="contract-multi-city">
              <TripTypeLabel type="Multi-City" />
              <ContractSentConfirmation
                contractId="contract-003"
                contractNumber="CONTRACT-2026-003"
                customerName="Michael Chen"
                customerEmail="michael@invest.com"
                flightRoute="KTEB → EGLL → LFPB → KTEB"
                departureDate="2026-03-20"
                totalAmount={185000}
                currency="USD"
                pdfUrl="https://example.com/contract-mc.pdf"
                status="signed"
                tripType="multi_city"
                segments={[
                  { departureAirport: 'KTEB', arrivalAirport: 'EGLL', departureDate: '2026-03-20' },
                  { departureAirport: 'EGLL', arrivalAirport: 'LFPB', departureDate: '2026-03-23' },
                  { departureAirport: 'LFPB', arrivalAirport: 'KTEB', departureDate: '2026-03-26' },
                ]}
                onMarkPayment={() => console.log('Mark payment: multi-city')}
              />
            </div>
          )}
        </DemoSection>

      </main>
    </div>
  );
}
