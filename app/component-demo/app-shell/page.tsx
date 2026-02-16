'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, X, Plane, BarChart3, Flame, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ── App Shell Components ──────────────────────────────────────────────
import { ChatSidebar, type ChatSession } from '@/components/chat-sidebar';
import { FlightRequestCard } from '@/components/chat/flight-request-card';
import { GeneralChatCard } from '@/components/chat/general-chat-card';
import { DynamicChatHeader } from '@/components/chat/dynamic-chat-header';
import { ChatInput } from '@/components/chat-interface/components/ChatInput';
import { QuickActions } from '@/components/chat-interface/components/QuickActions';
import { LandingPage } from '@/components/landing-page';
import { StarterCard } from '@/components/conversation-starters/starter-card';
import { FlightRequestStarter, type Airport } from '@/components/conversation-starters/flight-request-starter';

// ── Modal & Dialog Components ───────────────────────────────────────────
import { BookFlightModal, type TripDetails } from '@/components/avinode/book-flight-modal';
import { PaymentConfirmationModal } from '@/components/contract/payment-confirmation-modal';
import { CustomerSelectionDialog } from '@/components/customer-selection-dialog';
import { MarginEditModal } from '@/components/proposal/margin-edit-modal';
import { QuoteDetailsDrawer, type QuoteDetails, type OperatorMessage } from '@/components/quote-details-drawer';
import { MarginSelectionCard } from '@/components/chat/margin-selection-card';

/**
 * App Shell Component Demo Page
 *
 * Displays every structural UI component that makes up the Jetvision Agent App.
 * Excludes MCP tool UI components (those are shown at /component-demo/all-tool-ui).
 *
 * Route: /component-demo/app-shell
 * Public - no auth required.
 */

// =============================================================================
// TYPES
// =============================================================================

interface ComponentGroupItem {
  id: string;
  label: string;
  number: number;
}

interface ComponentGroup {
  label: string;
  items: ComponentGroupItem[];
}

// =============================================================================
// COMPONENT GROUPS (8 categories, 16 components)
// =============================================================================

const COMPONENT_GROUPS: ComponentGroup[] = [
  {
    label: 'Navigation',
    items: [
      { id: 'chat-sidebar', label: 'ChatSidebar', number: 1 },
    ],
  },
  {
    label: 'Sidebar Cards',
    items: [
      { id: 'flight-request-card', label: 'FlightRequestCard', number: 2 },
      { id: 'general-chat-card', label: 'GeneralChatCard', number: 3 },
    ],
  },
  {
    label: 'Chat Header',
    items: [
      { id: 'dynamic-chat-header', label: 'DynamicChatHeader', number: 4 },
    ],
  },
  {
    label: 'Chat Input',
    items: [
      { id: 'chat-input', label: 'ChatInput', number: 5 },
      { id: 'quick-actions', label: 'QuickActions', number: 6 },
    ],
  },
  {
    label: 'Landing & Starters',
    items: [
      { id: 'landing-page', label: 'LandingPage', number: 7 },
      { id: 'starter-card', label: 'StarterCard', number: 8 },
      { id: 'flight-request-starter', label: 'FlightRequestStarter', number: 9 },
    ],
  },
  {
    label: 'Settings',
    items: [
      { id: 'settings-panel', label: 'SettingsDropdownMenu', number: 10 },
    ],
  },
  {
    label: 'Modals & Dialogs',
    items: [
      { id: 'book-flight-modal', label: 'BookFlightModal', number: 11 },
      { id: 'payment-confirmation-modal', label: 'PaymentConfirmationModal', number: 12 },
      { id: 'customer-selection-dialog', label: 'CustomerSelectionDialog', number: 13 },
      { id: 'margin-edit-modal', label: 'MarginEditModal', number: 14 },
    ],
  },
  {
    label: 'Drawers & Cards',
    items: [
      { id: 'quote-details-drawer', label: 'QuoteDetailsDrawer', number: 15 },
      { id: 'margin-selection-card', label: 'MarginSelectionCard', number: 16 },
    ],
  },
];

const ALL_SECTION_IDS = COMPONENT_GROUPS.flatMap((g) => g.items.map((i) => i.id));

// =============================================================================
// ACTION LOG
// =============================================================================

function ActionLog({ lastAction }: { lastAction: string | null }) {
  if (!lastAction) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-foreground text-background text-xs font-mono px-4 py-2 rounded-lg shadow-xl max-w-[calc(100vw-2rem)] sm:max-w-md break-words" data-testid="action-log">
      {lastAction}
    </div>
  );
}

// =============================================================================
// SECTION WRAPPER
// =============================================================================

function DemoSection({
  id,
  component,
  description,
  importPath,
  category,
  componentNumber,
  children,
}: {
  id: string;
  component: string;
  description: string;
  importPath: string;
  category: string;
  componentNumber: number;
  children: React.ReactNode;
}) {
  return (
    <section id={id} data-testid={`section-${id}`} className="scroll-mt-4">
      <div className="mb-4 space-y-2">
        <div className="flex items-start gap-3">
          <div className="flex-none size-7 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">{componentNumber}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">{component}</h2>
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                {category}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
            <code className="text-xs bg-info-bg text-info px-2 py-0.5 rounded mt-1 inline-block">
              {importPath}
            </code>
          </div>
        </div>
      </div>
      <div className="pl-0 sm:pl-10 space-y-6">{children}</div>
      <hr className="my-10 border-border" />
    </section>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function getCategoryForId(id: string): string {
  for (const group of COMPONENT_GROUPS) {
    if (group.items.some((item) => item.id === id)) {
      return group.label;
    }
  }
  return '';
}

function getNumberForId(id: string): number {
  for (const group of COMPONENT_GROUPS) {
    const item = group.items.find((i) => i.id === id);
    if (item) return item.number;
  }
  return 0;
}

// =============================================================================
// DEMO DATA
// =============================================================================

const NOW_ISO = '2026-02-14T12:00:00.000Z';

const makeSession = (overrides: Partial<ChatSession> & { id: string }): ChatSession => ({
  route: 'KTEB → KMIA',
  passengers: 3,
  date: '2026-03-15',
  status: 'requesting_quotes',
  currentStep: 3,
  totalSteps: 10,
  messages: [],
  ...overrides,
});

const DEMO_SESSIONS: ChatSession[] = [
  makeSession({
    id: 'demo-1',
    route: 'KTEB → KMIA',
    passengers: 3,
    date: '2026-03-15',
    status: 'requesting_quotes',
    currentStep: 3,
    totalSteps: 10,
    tripId: 'atrip-OW-001',
    deepLink: 'https://sandbox.avinode.com/marketplace/mvc/search#preSearch',
    generatedName: 'NYC to Miami Charter',
    quotesReceived: 2,
    quotesTotal: 5,
    rfqFlights: [
      { id: 'rfq-1', rfqStatus: 'quoted', totalPrice: 47500 } as any,
      { id: 'rfq-2', rfqStatus: 'outbound', totalPrice: 0 } as any,
    ],
    sessionStartedAt: '2026-02-14T10:00:00.000Z',
    messages: [
      { id: 'm1', type: 'user', content: 'I need a flight from Teterboro to Miami', timestamp: new Date('2026-02-14T10:00:00Z') },
      { id: 'm2', type: 'agent', content: 'I found several options for KTEB to KMIA.', timestamp: new Date('2026-02-14T10:01:00Z') },
    ],
  }),
  makeSession({
    id: 'demo-2',
    route: 'KTEB ⇄ KVNY',
    passengers: 6,
    date: '2026-04-05',
    status: 'proposal_sent',
    currentStep: 6,
    totalSteps: 10,
    tripId: 'atrip-RT-002',
    tripType: 'round_trip',
    returnDate: '2026-04-08',
    generatedName: 'NYC-LA Round Trip',
    aircraft: 'Gulfstream G650',
    operator: 'Prime Jet, LLC',
    sessionStartedAt: '2026-02-13T08:00:00.000Z',
    messages: [
      { id: 'm3', type: 'user', content: 'Round trip to Van Nuys for 6', timestamp: new Date('2026-02-13T08:00:00Z') },
    ],
  }),
  makeSession({
    id: 'demo-3',
    route: 'KTEB → EGLL → LFPB → KTEB',
    passengers: 5,
    date: '2026-03-20',
    status: 'closed_won',
    currentStep: 10,
    totalSteps: 10,
    tripId: 'atrip-MC-003',
    generatedName: 'European Multi-City Tour',
    sessionStartedAt: '2026-02-10T14:00:00.000Z',
    messages: [
      { id: 'm4', type: 'user', content: 'Multi-city trip to London and Paris', timestamp: new Date('2026-02-10T14:00:00Z') },
    ],
  }),
];

const DEMO_GENERAL_SESSION: ChatSession = makeSession({
  id: 'demo-general-1',
  conversationType: 'general',
  route: '',
  passengers: 0,
  date: '',
  status: 'understanding_request',
  currentStep: 1,
  totalSteps: 10,
  generatedName: 'What aircraft categories are available?',
  sessionStartedAt: '2026-02-14T09:30:00.000Z',
  messages: [
    { id: 'mg1', type: 'user', content: 'What aircraft categories are available for charter?', timestamp: new Date('2026-02-14T09:30:00Z') },
    { id: 'mg2', type: 'agent', content: 'We offer light jets, midsize, super midsize, heavy jets, and ultra long range aircraft.', timestamp: new Date('2026-02-14T09:31:00Z') },
  ],
});

const DEMO_ARCHIVED: ChatSession[] = [
  makeSession({
    id: 'demo-archived-1',
    route: 'KMIA → EGLL',
    passengers: 4,
    date: '2026-01-20',
    status: 'closed_won',
    currentStep: 10,
    totalSteps: 10,
    tripId: 'atrip-ARC-001',
    generatedName: 'Miami to London (Completed)',
    sessionStartedAt: '2026-01-15T10:00:00.000Z',
    messages: [
      { id: 'ma1', type: 'user', content: 'Flight from Miami to London', timestamp: new Date('2026-01-15T10:00:00Z') },
    ],
  }),
];

const DEMO_QUOTE_REQUESTS = [
  {
    id: 'qr-1',
    jetType: 'Gulfstream G650',
    operatorName: 'Prime Jet, LLC',
    status: 'received' as const,
    flightDuration: '4h 30m',
    price: 47500,
    currency: 'USD',
    departureAirport: 'KTEB',
    arrivalAirport: 'KMIA',
  },
  {
    id: 'qr-2',
    jetType: 'Global 7500',
    operatorName: 'Atlas Air Charter',
    status: 'pending' as const,
    departureAirport: 'KTEB',
    arrivalAirport: 'KMIA',
  },
];

const mockAirportSearch = async (query: string): Promise<Airport[]> => {
  const airports: Airport[] = [
    { icao: 'KTEB', iata: 'TEB', name: 'Teterboro Airport', city: 'Teterboro', country: 'US' },
    { icao: 'KMIA', iata: 'MIA', name: 'Miami International', city: 'Miami', country: 'US' },
    { icao: 'KLAX', iata: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'US' },
    { icao: 'KVNY', iata: 'VNY', name: 'Van Nuys Airport', city: 'Van Nuys', country: 'US' },
    { icao: 'EGLL', iata: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'GB' },
  ];
  return airports.filter(
    (a) =>
      a.icao.toLowerCase().includes(query.toLowerCase()) ||
      a.iata.toLowerCase().includes(query.toLowerCase()) ||
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.city.toLowerCase().includes(query.toLowerCase())
  );
};

// =============================================================================
// DEMO DATA — MODALS & DIALOGS
// =============================================================================

/** Mock RFQFlight for BookFlightModal (cast as any to avoid importing RFQFlight) */
const DEMO_FLIGHT_FOR_MODAL = {
  id: 'rfq-demo-1',
  quoteId: 'Q-2026-0042',
  departureAirport: { icao: 'KTEB', name: 'Teterboro Airport', city: 'Teterboro' },
  arrivalAirport: { icao: 'KMIA', name: 'Miami International', city: 'Miami' },
  departureDate: '2026-03-15',
  departureTime: '10:00',
  aircraftType: 'Gulfstream G650',
  aircraftModel: 'G650ER',
  tailNumber: 'N650GX',
  operatorName: 'Prime Jet, LLC',
  totalPrice: 47500,
  priceBreakdown: { basePrice: 47500 },
  currency: 'USD',
  flightDuration: '2h 45m',
  rfqStatus: 'quoted',
  amenities: { wifi: true, pets: false, smoking: false, galley: true, lavatory: true },
} as any;

const DEMO_CUSTOMER = {
  name: 'John Reynolds',
  email: 'john@globalventures.com',
  company: 'Global Ventures LLC',
  phone: '+1 (305) 555-0199',
};

const DEMO_TRIP_DETAILS: TripDetails = {
  departureAirport: { icao: 'KTEB', name: 'Teterboro Airport', city: 'Teterboro' },
  arrivalAirport: { icao: 'KMIA', name: 'Miami International', city: 'Miami' },
  departureDate: '2026-03-15',
  departureTime: '10:00',
  passengers: 3,
  tripId: 'atrip-OW-001',
};

/** Mock QuoteDetails for QuoteDetailsDrawer */
const DEMO_QUOTE_DETAIL: QuoteDetails = {
  id: 'quote-detail-1',
  rfqId: 'rfq-1',
  operator: { name: 'Prime Jet, LLC', rating: 4.8 },
  aircraft: {
    type: 'Gulfstream G650',
    tail: 'N650GX',
    category: 'Ultra Long Range',
    maxPassengers: 13,
  },
  price: { amount: 47500, currency: 'USD' },
  flightDetails: {
    flightTimeMinutes: 165,
    distanceNm: 1090,
    departureTime: '10:00 EST',
    arrivalTime: '12:45 EST',
    departureAirport: 'KTEB',
    arrivalAirport: 'KMIA',
  },
  status: 'quoted',
  validUntil: '2026-03-10T23:59:59Z',
};

/** Mock operator messages for QuoteDetailsDrawer */
const DEMO_OPERATOR_MESSAGES: OperatorMessage[] = [
  {
    id: 'msg-1',
    type: 'REQUEST',
    content: 'Request for charter flight KTEB → KMIA on March 15, 2026. 3 passengers, Gulfstream G650 or similar.',
    timestamp: '2026-02-14T10:00:00Z',
    sender: 'Jetvision',
  },
  {
    id: 'msg-2',
    type: 'RESPONSE',
    content: 'We have N650GX available for your date. G650ER, 2h 45m flight time. Quote: $47,500 all-in. Valid until March 10.',
    timestamp: '2026-02-14T10:30:00Z',
    sender: 'Prime Jet, LLC',
  },
  {
    id: 'msg-3',
    type: 'INFO',
    content: 'Aircraft has WiFi and full galley. Catering can be arranged.',
    timestamp: '2026-02-14T10:31:00Z',
    sender: 'Prime Jet, LLC',
  },
];

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function AppShellDemoPage() {
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('chat-sidebar');
  const [mobileNav, setMobileNav] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Demo state for interactive components
  const [chatInputValue, setChatInputValue] = useState('');
  const [demoActiveChatId, setDemoActiveChatId] = useState<string | null>('demo-1');

  // Modal open/close states
  const [bookFlightOpen, setBookFlightOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [marginEditOpen, setMarginEditOpen] = useState(false);
  const [quoteDrawerOpen, setQuoteDrawerOpen] = useState(false);

  // Track desktop breakpoint (lg = 1024px)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (e.matches) setMobileNav(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // IntersectionObserver for active section tracking
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { root: container, rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );
    for (const id of ALL_SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  // Keyboard navigation (j/k)
  const handleKeyNav = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'j' || e.key === 'k') {
      e.preventDefault();
      const idx = ALL_SECTION_IDS.indexOf(activeSection);
      if (idx === -1) return;
      const nextIdx = e.key === 'j'
        ? Math.min(idx + 1, ALL_SECTION_IDS.length - 1)
        : Math.max(idx - 1, 0);
      const nextId = ALL_SECTION_IDS[nextIdx];
      document.getElementById(nextId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeSection]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyNav);
    return () => document.removeEventListener('keydown', handleKeyNav);
  }, [handleKeyNav]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileNav(false);
  };

  return (
    <div className="h-screen flex flex-col bg-muted dark:bg-background text-foreground overflow-hidden">
      <ActionLog lastAction={lastAction} />

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex-none border-b border-border bg-card/80 backdrop-blur-sm z-10 px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          {!isDesktop && (
            <button
              className="p-2 -ml-2 hover:bg-muted rounded-lg"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label="Toggle navigation"
            >
              {mobileNav ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-foreground truncate" data-testid="demo-title">
                App Shell Components
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[10px]">j</kbd>
                /
                <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[10px]">k</kbd>
                to navigate
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              16 structural UI components that make up the Jetvision Agent App shell
            </p>
          </div>
        </div>
      </header>

      {/* ── Body: sidebar + main ─────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile nav overlay */}
        {!isDesktop && mobileNav && (
          <button
            className="fixed inset-0 z-20 bg-black/30"
            onClick={() => setMobileNav(false)}
            aria-label="Close navigation"
          />
        )}

        {/* ── Sidebar nav ──────────────────────────────────────── */}
        <nav
          className="w-56 border-r bg-card overflow-y-auto flex-none"
          style={
            isDesktop
              ? { position: 'static' as const }
              : { position: 'fixed' as const, top: 0, bottom: 0, left: mobileNav ? 0 : '-14rem', zIndex: 30, transition: 'left 200ms ease' }
          }
        >
          <div className="p-4 space-y-0">
            {COMPONENT_GROUPS.map((group, gi) => (
              <div key={group.label} className={gi > 0 ? 'mt-4 pt-4 border-t border-border' : ''}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(({ id, label, number }) => (
                    <button
                      key={id}
                      onClick={() => scrollToSection(id)}
                      className={`w-full flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md border transition-colors text-left ${
                        activeSection === id
                          ? 'bg-primary/10 text-primary font-medium border-primary/30'
                          : 'text-muted-foreground border-transparent hover:text-primary hover:bg-primary/5 hover:border-primary/20'
                      }`}
                    >
                      <span className="truncate">{label}</span>
                      <span className="text-[10px] text-muted-foreground ml-1 flex-none">{number}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* ── Main content (scrollable) ────────────────────────── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-2">

            {/* ================================================================
                1. ChatSidebar
               ================================================================ */}
            <DemoSection
              id="chat-sidebar"
              component="ChatSidebar"
              description="The main sidebar navigation with Active/Archive tabs, New button, and status legend footer. Contains FlightRequestCard and GeneralChatCard sub-components."
              importPath="components/chat-sidebar"
              category={getCategoryForId('chat-sidebar')}
              componentNumber={getNumberForId('chat-sidebar')}
            >
              <div className="border border-border rounded-lg overflow-hidden" style={{ maxHeight: '600px' }}>
                <ChatSidebar
                  chatSessions={[...DEMO_SESSIONS, DEMO_GENERAL_SESSION]}
                  activeChatId={demoActiveChatId}
                  onSelectChat={(id) => {
                    setDemoActiveChatId(id);
                    setLastAction(`[ChatSidebar] Selected: ${id}`);
                  }}
                  onNewChat={() => setLastAction('[ChatSidebar] New Chat clicked')}
                  onDeleteChat={(id) => setLastAction(`[ChatSidebar] Delete: ${id}`)}
                  onCancelChat={(id) => setLastAction(`[ChatSidebar] Cancel RFQ: ${id}`)}
                  onArchiveChat={(id) => setLastAction(`[ChatSidebar] Archive: ${id}`)}
                  archivedSessions={DEMO_ARCHIVED}
                  onLoadArchive={() => setLastAction('[ChatSidebar] Load Archive')}
                  isLoadingArchive={false}
                />
              </div>
            </DemoSection>

            {/* ================================================================
                2. FlightRequestCard
               ================================================================ */}
            <DemoSection
              id="flight-request-card"
              component="FlightRequestCard"
              description="Sidebar card for flight request sessions. Shows route, status badge, progress bar, RFQ count, workflow step, and dropdown actions (Cancel, Archive, Delete)."
              importPath="components/chat/flight-request-card"
              category={getCategoryForId('flight-request-card')}
              componentNumber={getNumberForId('flight-request-card')}
            >
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Active (Requesting Quotes)</h3>
                <div className="flex justify-center">
                  <FlightRequestCard
                    session={DEMO_SESSIONS[0]}
                    isActive={true}
                    onClick={() => setLastAction('[FlightRequestCard] Clicked: active')}
                    onDelete={(id) => setLastAction(`[FlightRequestCard] Delete: ${id}`)}
                    onCancel={(id) => setLastAction(`[FlightRequestCard] Cancel: ${id}`)}
                    onArchive={(id) => setLastAction(`[FlightRequestCard] Archive: ${id}`)}
                  />
                </div>

                <h3 className="text-sm font-medium mt-4">Proposal Sent (Inactive)</h3>
                <div className="flex justify-center">
                  <FlightRequestCard
                    session={DEMO_SESSIONS[1]}
                    isActive={false}
                    onClick={() => setLastAction('[FlightRequestCard] Clicked: proposal_sent')}
                    onDelete={(id) => setLastAction(`[FlightRequestCard] Delete: ${id}`)}
                    onArchive={(id) => setLastAction(`[FlightRequestCard] Archive: ${id}`)}
                  />
                </div>

                <h3 className="text-sm font-medium mt-4">Closed Won</h3>
                <div className="flex justify-center">
                  <FlightRequestCard
                    session={DEMO_SESSIONS[2]}
                    isActive={false}
                    onClick={() => setLastAction('[FlightRequestCard] Clicked: closed_won')}
                    onDelete={(id) => setLastAction(`[FlightRequestCard] Delete: ${id}`)}
                    onArchive={(id) => setLastAction(`[FlightRequestCard] Archive: ${id}`)}
                  />
                </div>
              </div>
            </DemoSection>

            {/* ================================================================
                3. GeneralChatCard
               ================================================================ */}
            <DemoSection
              id="general-chat-card"
              component="GeneralChatCard"
              description="Sidebar card for general conversations (non-flight-request). Shows title, message count, timestamp, and dropdown actions (Archive, Delete)."
              importPath="components/chat/general-chat-card"
              category={getCategoryForId('general-chat-card')}
              componentNumber={getNumberForId('general-chat-card')}
            >
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Active</h3>
                <div className="flex justify-center">
                  <GeneralChatCard
                    session={DEMO_GENERAL_SESSION}
                    isActive={true}
                    onClick={() => setLastAction('[GeneralChatCard] Clicked: active')}
                    onDelete={(id) => setLastAction(`[GeneralChatCard] Delete: ${id}`)}
                    onArchive={(id) => setLastAction(`[GeneralChatCard] Archive: ${id}`)}
                  />
                </div>

                <h3 className="text-sm font-medium mt-4">Inactive</h3>
                <div className="flex justify-center">
                  <GeneralChatCard
                    session={{
                      ...DEMO_GENERAL_SESSION,
                      id: 'demo-general-2',
                      generatedName: 'Pricing for peak season flights',
                      messages: [
                        { id: 'mg3', type: 'user', content: 'What are typical prices during holiday season?', timestamp: new Date('2026-02-12T16:00:00Z') },
                        { id: 'mg4', type: 'agent', content: 'Holiday pricing varies by route and aircraft.', timestamp: new Date('2026-02-12T16:01:00Z') },
                        { id: 'mg5', type: 'user', content: 'Can you give me a range for KTEB to KMIA?', timestamp: new Date('2026-02-12T16:02:00Z') },
                      ],
                    }}
                    isActive={false}
                    onClick={() => setLastAction('[GeneralChatCard] Clicked: inactive')}
                    onDelete={(id) => setLastAction(`[GeneralChatCard] Delete: ${id}`)}
                    onArchive={(id) => setLastAction(`[GeneralChatCard] Archive: ${id}`)}
                  />
                </div>
              </div>
            </DemoSection>

            {/* ================================================================
                4. DynamicChatHeader
               ================================================================ */}
            <DemoSection
              id="dynamic-chat-header"
              component="DynamicChatHeader"
              description="Context-sensitive header shown above the chat messages. Displays route summary, trip ID badge (with copy), status badge, and quote request list."
              importPath="components/chat/dynamic-chat-header"
              category={getCategoryForId('dynamic-chat-header')}
              componentNumber={getNumberForId('dynamic-chat-header')}
            >
              <div className="space-y-4 border border-border rounded-lg overflow-hidden">
                <h3 className="text-sm font-medium px-4 pt-4">With Trip ID + Quote Requests</h3>
                <DynamicChatHeader
                  activeChat={DEMO_SESSIONS[0]}
                  showTripId={true}
                  quoteRequests={DEMO_QUOTE_REQUESTS}
                  onViewQuoteDetails={(id) => setLastAction(`[DynamicChatHeader] View quote: ${id}`)}
                  onCopyTripId={() => setLastAction('[DynamicChatHeader] Trip ID copied')}
                />
              </div>

              <div className="space-y-4 border border-border rounded-lg overflow-hidden mt-4">
                <h3 className="text-sm font-medium px-4 pt-4">Proposal Sent (Round Trip)</h3>
                <DynamicChatHeader
                  activeChat={DEMO_SESSIONS[1]}
                  showTripId={true}
                  quoteRequests={[]}
                  onViewQuoteDetails={(id) => setLastAction(`[DynamicChatHeader] View quote: ${id}`)}
                  onCopyTripId={() => setLastAction('[DynamicChatHeader] Trip ID copied')}
                />
              </div>

              <div className="space-y-4 border border-border rounded-lg overflow-hidden mt-4">
                <h3 className="text-sm font-medium px-4 pt-4">Closed Won (Multi-City)</h3>
                <DynamicChatHeader
                  activeChat={DEMO_SESSIONS[2]}
                  showTripId={true}
                  quoteRequests={[]}
                  onViewQuoteDetails={(id) => setLastAction(`[DynamicChatHeader] View quote: ${id}`)}
                />
              </div>

              <div className="space-y-4 border border-border rounded-lg overflow-hidden mt-4">
                <h3 className="text-sm font-medium px-4 pt-4">No Chat Selected</h3>
                <DynamicChatHeader
                  activeChat={null}
                  showTripId={false}
                  onViewQuoteDetails={() => {}}
                />
              </div>
            </DemoSection>

            {/* ================================================================
                5. ChatInput
               ================================================================ */}
            <DemoSection
              id="chat-input"
              component="ChatInput"
              description="Main chat input with integrated quick actions, send button, and enter-to-send. Supports disabled/processing states and custom placeholders."
              importPath="components/chat-interface/components/ChatInput"
              category={getCategoryForId('chat-input')}
              componentNumber={getNumberForId('chat-input')}
            >
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Default (with Quick Actions)</h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <ChatInput
                    value={chatInputValue}
                    onChange={setChatInputValue}
                    onSend={() => {
                      setLastAction(`[ChatInput] Sent: ${chatInputValue}`);
                      setChatInputValue('');
                    }}
                    onViewWorkflow={() => setLastAction('[ChatInput] View Workflow')}
                    showViewWorkflow={true}
                    placeholder="Message about this request..."
                  />
                </div>

                <h3 className="text-sm font-medium mt-4">Processing State</h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <ChatInput
                    value=""
                    onChange={() => {}}
                    onSend={() => {}}
                    isProcessing={true}
                    placeholder="Waiting for response..."
                  />
                </div>

                <h3 className="text-sm font-medium mt-4">Disabled</h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <ChatInput
                    value=""
                    onChange={() => {}}
                    onSend={() => {}}
                    disabled={true}
                    placeholder="Select a chat to start..."
                  />
                </div>
              </div>
            </DemoSection>

            {/* ================================================================
                6. QuickActions
               ================================================================ */}
            <DemoSection
              id="quick-actions"
              component="QuickActions"
              description="Quick action buttons displayed above the chat input. Includes default actions (Update Details, Alternative Options, Check Status) and optional View Workflow button."
              importPath="components/chat-interface/components/QuickActions"
              category={getCategoryForId('quick-actions')}
              componentNumber={getNumberForId('quick-actions')}
            >
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Default Actions + View Workflow</h3>
                <div className="border border-border rounded-lg p-4">
                  <QuickActions
                    onSelect={(val) => setLastAction(`[QuickActions] Selected: ${val}`)}
                    onViewWorkflow={() => setLastAction('[QuickActions] View Workflow')}
                    showViewWorkflow={true}
                  />
                </div>

                <h3 className="text-sm font-medium mt-4">Custom Actions</h3>
                <div className="border border-border rounded-lg p-4">
                  <QuickActions
                    onSelect={(val) => setLastAction(`[QuickActions] Custom: ${val}`)}
                    actions={[
                      { label: 'Get Quote Details', value: 'Show me the details for the best quote' },
                      { label: 'Compare Operators', value: 'Compare all operator quotes side by side' },
                      { label: 'Send Proposal', value: 'Generate and send a proposal to the client' },
                    ]}
                  />
                </div>

                <h3 className="text-sm font-medium mt-4">Disabled</h3>
                <div className="border border-border rounded-lg p-4">
                  <QuickActions
                    onSelect={() => {}}
                    disabled={true}
                  />
                </div>
              </div>
            </DemoSection>

            {/* ================================================================
                7. LandingPage
               ================================================================ */}
            <DemoSection
              id="landing-page"
              component="LandingPage"
              description="Initial view shown when no chat is selected. Displays greeting, free-text input, and smart conversation starters (New Flight Request, Active Requests, Deals, Hot Opportunities)."
              importPath="components/landing-page"
              category={getCategoryForId('landing-page')}
              componentNumber={getNumberForId('landing-page')}
            >
              <div className="border border-border rounded-lg overflow-hidden bg-background" style={{ height: '600px' }}>
                <LandingPage
                  onStartChat={(msg) => setLastAction(`[LandingPage] Start chat: ${msg}`)}
                  userName="Demo User"
                  userContext={{
                    activeRequestCount: 3,
                    pendingQuotesCount: 5,
                    hotOpportunitiesCount: 2,
                  }}
                />
              </div>
            </DemoSection>

            {/* ================================================================
                8. StarterCard
               ================================================================ */}
            <DemoSection
              id="starter-card"
              component="StarterCard"
              description="Card-style conversation starter with icon, title, description, and optional badge count. Supports cyan, blue, green, and amber color variants plus loading skeleton."
              importPath="components/conversation-starters/starter-card"
              category={getCategoryForId('starter-card')}
              componentNumber={getNumberForId('starter-card')}
            >
              <div className="space-y-4 max-w-lg">
                <h3 className="text-sm font-medium">Cyan (Default)</h3>
                <StarterCard
                  icon={Plane}
                  title="New Flight Request"
                  description="Start a new charter flight request"
                  onClick={() => setLastAction('[StarterCard] New Flight Request')}
                  variant="cyan"
                />

                <h3 className="text-sm font-medium mt-4">Blue with Badge</h3>
                <StarterCard
                  icon={BarChart3}
                  title="Active Requests"
                  description="View and manage your flight requests"
                  onClick={() => setLastAction('[StarterCard] Active Requests')}
                  variant="blue"
                  badge={3}
                />

                <h3 className="text-sm font-medium mt-4">Green</h3>
                <StarterCard
                  icon={MessageSquare}
                  title="Current Deals"
                  description="Check on quotes and proposals"
                  onClick={() => setLastAction('[StarterCard] Current Deals')}
                  variant="green"
                  badge={5}
                />

                <h3 className="text-sm font-medium mt-4">Amber</h3>
                <StarterCard
                  icon={Flame}
                  title="Hot Opportunities"
                  description="Time-sensitive deals needing attention"
                  onClick={() => setLastAction('[StarterCard] Hot Opportunities')}
                  variant="amber"
                  badge={2}
                />

                <h3 className="text-sm font-medium mt-4">Disabled</h3>
                <StarterCard
                  icon={Plane}
                  title="Unavailable Action"
                  description="This action is currently disabled"
                  onClick={() => {}}
                  disabled={true}
                />

                <h3 className="text-sm font-medium mt-4">Loading Skeleton</h3>
                <StarterCard
                  icon={Plane}
                  title=""
                  description=""
                  onClick={() => {}}
                  loading={true}
                />
              </div>
            </DemoSection>

            {/* ================================================================
                9. FlightRequestStarter
               ================================================================ */}
            <DemoSection
              id="flight-request-starter"
              component="FlightRequestStarter"
              description="Inline flight request form with airport autocomplete, date picker, passenger count, and validation. Appears when user clicks 'New Flight Request' conversation starter."
              importPath="components/conversation-starters/flight-request-starter"
              category={getCategoryForId('flight-request-starter')}
              componentNumber={getNumberForId('flight-request-starter')}
            >
              <div className="flex justify-center">
                <FlightRequestStarter
                  onSubmit={(data) => {
                    setLastAction(`[FlightRequestStarter] Submit: ${data.departureAirport} → ${data.arrivalAirport}, ${data.passengers} pax, ${data.departureDate}`);
                  }}
                  onCancel={() => setLastAction('[FlightRequestStarter] Cancel')}
                  onAirportSearch={mockAirportSearch}
                  defaultValues={{
                    departureAirport: '',
                    arrivalAirport: '',
                    passengers: 3,
                  }}
                />
              </div>
            </DemoSection>

            {/* ================================================================
                10. SettingsDropdownMenu
               ================================================================ */}
            <DemoSection
              id="settings-panel"
              component="SettingsDropdownMenu"
              description="Admin-only settings dropdown menu in the header. Contains commission split configuration (slider 10-50%), tiered rates (Bronze/Silver/Gold/Platinum), and margin calculator preview. Requires admin role."
              importPath="components/settings-panel"
              category={getCategoryForId('settings-panel')}
              componentNumber={getNumberForId('settings-panel')}
            >
              <div className="border border-border rounded-lg p-6 bg-surface-secondary">
                <p className="text-sm text-muted-foreground mb-4">
                  The SettingsDropdownMenu is rendered in the AppHeader and is only visible to admin users.
                  It uses <code className="text-xs bg-info-bg text-info px-1.5 py-0.5 rounded">useUserRole()</code> to
                  check permissions and renders <code className="text-xs bg-info-bg text-info px-1.5 py-0.5 rounded">null</code> for
                  non-admin users.
                </p>
                <div className="bg-foreground rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-background/70">Header context:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Note: SettingsDropdownMenu requires Clerk auth context */}
                    <div className="px-3 py-1.5 rounded-lg border border-background/20 text-sm text-background/70">
                      Settings (admin-only, requires auth)
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium">Features:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Commission Split slider (10% - 50%)</li>
                    <li>Live commission breakdown preview</li>
                    <li>Tiered rates toggle (Bronze/Silver/Gold/Platinum)</li>
                    <li>Margin Calculator with operator cost / margin / total quote</li>
                    <li>Save Settings button</li>
                  </ul>
                </div>
              </div>
            </DemoSection>

            {/* ================================================================
                11. BookFlightModal
               ================================================================ */}
            <DemoSection
              id="book-flight-modal"
              component="BookFlightModal"
              description="Multi-step modal for contract generation workflow. Shows customer info, flight details, pricing summary (with FET 7.5% + segment fee), email review with editable subject/body, and 7 states: ready, generating, preview, email_review, sending, success, error."
              importPath="components/avinode/book-flight-modal"
              category={getCategoryForId('book-flight-modal')}
              componentNumber={getNumberForId('book-flight-modal')}
            >
              <div className="space-y-4">
                <Button onClick={() => setBookFlightOpen(true)}>
                  Open BookFlightModal
                </Button>
                <BookFlightModal
                  open={bookFlightOpen}
                  onClose={() => {
                    setBookFlightOpen(false);
                    setLastAction('[BookFlightModal] Closed');
                  }}
                  flight={DEMO_FLIGHT_FOR_MODAL}
                  customer={DEMO_CUSTOMER}
                  tripDetails={DEMO_TRIP_DETAILS}
                  requestId="req-demo-001"
                  onContractSent={(data) =>
                    setLastAction(`[BookFlightModal] Contract sent: ${data.contractNumber} to ${data.customerEmail}`)
                  }
                />
                <div className="border border-border rounded-lg p-4 bg-surface-secondary text-sm space-y-2">
                  <h4 className="font-medium">Modal States:</h4>
                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                    <li><strong>ready</strong> — Shows flight details + pricing + Cancel / Preview / Send buttons</li>
                    <li><strong>generating</strong> — Spinner while PDF is generated</li>
                    <li><strong>preview</strong> — PDF preview with Open PDF / Send Contract buttons</li>
                    <li><strong>email_review</strong> — Editable email subject + body before sending</li>
                    <li><strong>sending</strong> — Spinner while contract email is sent</li>
                    <li><strong>success</strong> — Green confirmation with contract number + PDF link</li>
                    <li><strong>error</strong> — Red error with retry option</li>
                  </ul>
                </div>
              </div>
            </DemoSection>

            {/* ================================================================
                12. PaymentConfirmationModal
               ================================================================ */}
            <DemoSection
              id="payment-confirmation-modal"
              component="PaymentConfirmationModal"
              description="Modal for recording a payment against a contract. Includes payment method selector (Wire, Credit Card, Check), amount input, reference number, and validation."
              importPath="components/contract/payment-confirmation-modal"
              category={getCategoryForId('payment-confirmation-modal')}
              componentNumber={getNumberForId('payment-confirmation-modal')}
            >
              <div className="space-y-4">
                <Button onClick={() => setPaymentModalOpen(true)}>
                  Open PaymentConfirmationModal
                </Button>
                <PaymentConfirmationModal
                  open={paymentModalOpen}
                  onClose={() => {
                    setPaymentModalOpen(false);
                    setLastAction('[PaymentConfirmationModal] Closed');
                  }}
                  contractId="contract-demo-001"
                  contractNumber="JV-2026-0042"
                  totalAmount={51543.60}
                  currency="USD"
                  onConfirm={(data) =>
                    setLastAction(`[PaymentConfirmationModal] Confirmed: ${data.paymentMethod} $${data.paymentAmount} ref=${data.paymentReference}`)
                  }
                />
                <div className="border border-border rounded-lg p-4 bg-surface-secondary text-sm space-y-2">
                  <h4 className="font-medium">Features:</h4>
                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Payment method: Wire Transfer, Credit Card, Check</li>
                    <li>Pre-filled total amount (editable for partial payments)</li>
                    <li>Reference number validation (required)</li>
                    <li>Submitting state with spinner</li>
                  </ul>
                </div>
              </div>
            </DemoSection>

            {/* ================================================================
                13. CustomerSelectionDialog
               ================================================================ */}
            <DemoSection
              id="customer-selection-dialog"
              component="CustomerSelectionDialog"
              description="Typeahead customer search dialog with keyboard navigation, create-new-customer mode, and Jetvision service charge selector (8/10/20% presets + custom). Used during the proposal generation workflow."
              importPath="components/customer-selection-dialog"
              category={getCategoryForId('customer-selection-dialog')}
              componentNumber={getNumberForId('customer-selection-dialog')}
            >
              <div className="space-y-4">
                <Button onClick={() => setCustomerDialogOpen(true)}>
                  Open CustomerSelectionDialog
                </Button>
                <CustomerSelectionDialog
                  open={customerDialogOpen}
                  onClose={() => {
                    setCustomerDialogOpen(false);
                    setLastAction('[CustomerSelectionDialog] Closed');
                  }}
                  onSelect={(customer, margin) =>
                    setLastAction(`[CustomerSelectionDialog] Selected: ${customer.company_name} (${customer.contact_name}) at ${margin ?? 'default'}%`)
                  }
                  showMarginSlider={true}
                />
                <div className="border border-border rounded-lg p-4 bg-surface-secondary text-sm space-y-2">
                  <h4 className="font-medium">Features:</h4>
                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Typeahead search with Arrow Up/Down + Enter keyboard navigation</li>
                    <li>Customer detail preview card on selection</li>
                    <li>&ldquo;Create New Customer&rdquo; mode with company/contact/email/phone form</li>
                    <li>Service charge presets: 8%, 10%, 20%, or custom input</li>
                    <li>Locked customer mode (for re-selection scenarios)</li>
                  </ul>
                  <p className="text-xs text-muted-foreground italic mt-2">
                    Note: Fetches client profiles from <code className="bg-info-bg text-info px-1 rounded">/api/clients</code>.
                    In this demo, you may see a loading or error state if the API is unavailable.
                  </p>
                </div>
              </div>
            </DemoSection>

            {/* ================================================================
                14. MarginEditModal
               ================================================================ */}
            <DemoSection
              id="margin-edit-modal"
              component="MarginEditModal"
              description="Edit service charge modal with preset buttons (8/10/20%) + custom input, live price preview, and two actions: Update Internal Only or Regenerate & Re-send to customer."
              importPath="components/proposal/margin-edit-modal"
              category={getCategoryForId('margin-edit-modal')}
              componentNumber={getNumberForId('margin-edit-modal')}
            >
              <div className="space-y-4">
                <Button onClick={() => setMarginEditOpen(true)}>
                  Open MarginEditModal
                </Button>
                <MarginEditModal
                  open={marginEditOpen}
                  onClose={() => {
                    setMarginEditOpen(false);
                    setLastAction('[MarginEditModal] Closed');
                  }}
                  proposalId="proposal-demo-001"
                  currentMargin={10}
                  baseAmount={47500}
                  currency="USD"
                  onUpdated={(newMargin, newFinal) =>
                    setLastAction(`[MarginEditModal] Updated internally: ${newMargin}% → $${newFinal}`)
                  }
                  onRegenerated={(data) =>
                    setLastAction(`[MarginEditModal] Regenerated proposal: ${data.proposalId}`)
                  }
                />
                <div className="border border-border rounded-lg p-4 bg-surface-secondary text-sm space-y-2">
                  <h4 className="font-medium">Features:</h4>
                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Preset margins: 8%, 10%, 20% quick-select buttons</li>
                    <li>Custom percentage input (0-100)</li>
                    <li>Live price preview: Base Amount + Charge = Total</li>
                    <li>Highlight changed values in blue</li>
                    <li>Two submit actions: &ldquo;Update Internal&rdquo; (PATCH) and &ldquo;Regenerate & Re-send&rdquo; (POST)</li>
                  </ul>
                </div>
              </div>
            </DemoSection>

            {/* ================================================================
                15. QuoteDetailsDrawer
               ================================================================ */}
            <DemoSection
              id="quote-details-drawer"
              component="QuoteDetailsDrawer"
              description="Responsive drawer/panel for viewing quote details. Renders as a bottom sheet on mobile (Vaul Drawer) and a right-side slide-in panel on desktop (Dialog). Shows operator info, aircraft, pricing, flight details, accept button, and operator conversation thread."
              importPath="components/quote-details-drawer"
              category={getCategoryForId('quote-details-drawer')}
              componentNumber={getNumberForId('quote-details-drawer')}
            >
              <div className="space-y-4">
                <Button onClick={() => setQuoteDrawerOpen(true)}>
                  Open QuoteDetailsDrawer
                </Button>
                <QuoteDetailsDrawer
                  isOpen={quoteDrawerOpen}
                  onClose={() => {
                    setQuoteDrawerOpen(false);
                    setLastAction('[QuoteDetailsDrawer] Closed');
                  }}
                  quote={DEMO_QUOTE_DETAIL}
                  messages={DEMO_OPERATOR_MESSAGES}
                  onSendMessage={(msg) =>
                    setLastAction(`[QuoteDetailsDrawer] Send message: ${msg}`)
                  }
                  onAcceptQuote={(id) =>
                    setLastAction(`[QuoteDetailsDrawer] Accept quote: ${id}`)
                  }
                />
                <div className="border border-border rounded-lg p-4 bg-surface-secondary text-sm space-y-2">
                  <h4 className="font-medium">Sections:</h4>
                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Operator info with star rating and status badge</li>
                    <li>Aircraft card with image placeholder, type, tail, category, max passengers</li>
                    <li>Price display with validity date</li>
                    <li>Flight details: duration, distance, departure/arrival times</li>
                    <li>Accept Quote button (shown when status is &ldquo;quoted&rdquo;)</li>
                    <li>Operator conversation thread with message type badges (Request/Response/Info/Confirmation)</li>
                    <li>Message input with Enter-to-send</li>
                  </ul>
                </div>
              </div>
            </DemoSection>

            {/* ================================================================
                16. MarginSelectionCard
               ================================================================ */}
            <DemoSection
              id="margin-selection-card"
              component="MarginSelectionCard"
              description="Compact read-only inline card shown in the chat thread after customer and service charge are selected. Displays customer name, company, email, margin percentage badge, and an optional Edit button to open MarginEditModal."
              importPath="components/chat/margin-selection-card"
              category={getCategoryForId('margin-selection-card')}
              componentNumber={getNumberForId('margin-selection-card')}
            >
              <div className="space-y-4 max-w-lg">
                <h3 className="text-sm font-medium">With Edit Button (10% preset)</h3>
                <MarginSelectionCard
                  customerName="John Reynolds"
                  customerEmail="john@globalventures.com"
                  companyName="Global Ventures LLC"
                  marginPercentage={10}
                  selectedAt="2026-02-14T10:15:00Z"
                  onEditMargin={() => setLastAction('[MarginSelectionCard] Edit margin clicked')}
                />

                <h3 className="text-sm font-medium mt-4">Custom Margin (12.5%) — No Edit</h3>
                <MarginSelectionCard
                  customerName="Sarah Chen"
                  customerEmail="sarah@luxairtravel.com"
                  companyName="LuxAir Travel"
                  marginPercentage={12.5}
                  selectedAt="2026-02-14T14:30:00Z"
                />

                <h3 className="text-sm font-medium mt-4">Preset Margin (20%)</h3>
                <MarginSelectionCard
                  customerName="Michael Torres"
                  customerEmail="m.torres@skyhighcorp.com"
                  companyName="SkyHigh Corp"
                  marginPercentage={20}
                  selectedAt="2026-02-13T09:00:00Z"
                  onEditMargin={() => setLastAction('[MarginSelectionCard] Edit margin (20%)')}
                />
              </div>
            </DemoSection>

          </div>
        </div>
      </div>
    </div>
  );
}
