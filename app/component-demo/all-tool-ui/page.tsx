'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, Menu, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { UIActionResult } from '@mcp-ui/server';

// ── Registry Components ──────────────────────────────────────────────
import { TripCreatedUI } from '@/components/mcp-ui/composites/TripCreatedUI';
import { RfqResultsUI } from '@/components/mcp-ui/composites/RfqResultsUI';
import { QuoteComparisonUI } from '@/components/mcp-ui/composites/QuoteComparisonUI';
import { EmailApprovalUI } from '@/components/mcp-ui/composites/EmailApprovalUI';
import {
  RfqQuoteDetailsCard,
  AvinodeConnectionStatus,
  AvinodeAuthStatus,
  TripDetailsCard,
  AvinodeMessageCard,
  FlightSearchProgress,
} from '@/components/avinode';
import {
  WorkflowStatus,
  ActionButtons,
  FormField,
  FileAttachment,
  ProgressIndicator,
  InlineDashboard,
} from '@/components/message-components';
import { ProposalPreview } from '@/components/message-components/proposal-preview';
import { PipelineDashboard } from '@/components/message-components/pipeline-dashboard';
import { OperatorChatInline } from '@/components/message-components/operator-chat-inline';
import { ProposalSentConfirmation } from '@/components/proposal/proposal-sent-confirmation';
import { ContractSentConfirmation } from '@/components/contract/contract-sent-confirmation';
import { PaymentConfirmedCard } from '@/components/contract/payment-confirmed-card';
import { ClosedWonConfirmation } from '@/components/contract/closed-won-confirmation';
import { FlightRequestStageBadge, FLIGHT_REQUEST_STAGES } from '@/components/flight-request-stage-badge';

/**
 * Unified demo page for ALL Tool UI Registry components.
 *
 * Displays every registered MCP UI component across all three trip types
 * (one-way, round-trip, multi-city) with grouped sidebar navigation,
 * IntersectionObserver active tracking, and keyboard shortcuts.
 *
 * Route: /component-demo/all-tool-ui
 * Public - no auth required.
 */

// =============================================================================
// TYPES
// =============================================================================

type TripType = 'one-way' | 'round-trip' | 'multi-city';

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
// COMPONENT GROUPS (10 lifecycle categories, 24 components)
// =============================================================================

const COMPONENT_GROUPS: ComponentGroup[] = [
  {
    label: 'System Status',
    items: [
      { id: 'connection-status', label: 'AvinodeConnectionStatus', number: 1 },
      { id: 'auth-status', label: 'AvinodeAuthStatus', number: 2 },
    ],
  },
  {
    label: 'Workflow & Progress',
    items: [
      { id: 'workflow-status', label: 'WorkflowStatus', number: 3 },
      { id: 'progress-indicator', label: 'ProgressIndicator', number: 4 },
    ],
  },
  {
    label: 'Trip Creation',
    items: [
      { id: 'create-trip', label: 'TripCreatedUI', number: 5 },
      { id: 'trip-details', label: 'TripDetailsCard', number: 6 },
      { id: 'flight-search-progress', label: 'FlightSearchProgress', number: 7 },
    ],
  },
  {
    label: 'User Input',
    items: [
      { id: 'action-buttons', label: 'ActionButtons', number: 8 },
      { id: 'form-field', label: 'FormField', number: 9 },
    ],
  },
  {
    label: 'Quotes & RFQs',
    items: [
      { id: 'get-rfq', label: 'RfqResultsUI', number: 10 },
      { id: 'get-quote', label: 'RfqQuoteDetailsCard', number: 11 },
      { id: 'avinode-message', label: 'AvinodeMessageCard', number: 12 },
    ],
  },
  {
    label: 'Communication',
    items: [
      { id: 'get-trip-messages', label: 'OperatorChatInline', number: 13 },
      { id: 'file-attachment', label: 'FileAttachment', number: 14 },
    ],
  },
  {
    label: 'Pipeline & Analytics',
    items: [
      { id: 'list-requests', label: 'PipelineDashboard', number: 15 },
      { id: 'inline-dashboard', label: 'InlineDashboard', number: 16 },
      { id: 'get-quotes', label: 'QuoteComparisonUI', number: 17 },
    ],
  },
  {
    label: 'Proposals',
    items: [
      { id: 'create-proposal', label: 'ProposalPreview', number: 18 },
      { id: 'prepare-email', label: 'EmailApprovalUI', number: 19 },
      { id: 'send-proposal-email', label: 'ProposalSentConfirmation', number: 20 },
    ],
  },
  {
    label: 'Contracts & Closing',
    items: [
      { id: 'book-flight', label: 'ContractSentConfirmation', number: 21 },
      { id: 'payment-confirmed', label: 'PaymentConfirmedCard', number: 22 },
      { id: 'closed-won', label: 'ClosedWonConfirmation', number: 23 },
    ],
  },
  {
    label: 'Status Badges',
    items: [
      { id: 'stage-badge', label: 'FlightRequestStageBadge', number: 24 },
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
// SECTION WRAPPER (Enhanced)
// =============================================================================

function DemoSection({
  id,
  toolName,
  component,
  description,
  dataDependencies,
  category,
  componentNumber,
  children,
}: {
  id: string;
  toolName: string;
  component: string;
  description: string;
  dataDependencies: string[];
  category: string;
  componentNumber: number;
  children: React.ReactNode;
}) {
  const [depsOpen, setDepsOpen] = useState(false);

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
              <code className="text-xs bg-info-bg text-info px-2 py-0.5 rounded">
                {toolName}
              </code>
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                {category}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>

            {dataDependencies.length > 0 && (
              <button
                type="button"
                className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setDepsOpen(!depsOpen)}
              >
                <ChevronRight
                  className={`size-3.5 transition-transform duration-150 ${depsOpen ? 'rotate-90' : ''}`}
                />
                Data Dependencies ({dataDependencies.length})
              </button>
            )}
            {depsOpen && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {dataDependencies.map((dep) => (
                  <span key={dep} className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {dep}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="pl-0 sm:pl-10 space-y-6">{children}</div>
      <hr className="my-10 border-border" />
    </section>
  );
}

function TripTypeLabel({ type }: { type: string }) {
  const colors: Record<string, string> = {
    'One-Way': 'bg-muted text-muted-foreground',
    'Round-Trip': 'bg-info-bg text-info',
    'Multi-City': 'bg-status-searching/15 text-status-searching',
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

// Static timestamps for demo data to prevent SSR/client hydration mismatches
const DEMO_NOW = '2026-02-14T12:00:00.000Z';
const DEMO_EXPIRES_60D = new Date('2026-04-15T12:00:00.000Z');
const DEMO_EXPIRES_5D = new Date('2026-02-19T12:00:00.000Z');
const DEMO_HOT_2H = '2026-02-14T14:00:00.000Z';
const DEMO_HOT_8H = '2026-02-14T20:00:00.000Z';
const DEMO_HOT_24H = '2026-02-15T12:00:00.000Z';

// =============================================================================
// HELPER: find category for a section ID
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
// PAGE COMPONENT
// =============================================================================

export default function AllToolUIDemoPage() {
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [tripFilter, setTripFilter] = useState<'all' | TripType>('all');
  const [activeSection, setActiveSection] = useState<string>('connection-status');
  const [mobileNav, setMobileNav] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileNav(false);
  };

  const filterLabel = tripFilter === 'all'
    ? 'All Trip Types'
    : tripFilter.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="h-screen flex flex-col bg-muted dark:bg-background text-foreground overflow-hidden">
      <ActionLog lastAction={lastAction} />

      {/* ── Header (compact, no inline TOC) ──────────────────────────── */}
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
                Tool UI Registry — All Components
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[10px]">j</kbd>
                /
                <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[10px]">k</kbd>
                to navigate
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              24 registered MCP UI components across one-way, round-trip, and multi-city trip types
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mt-2">
          {/* Trip type filter tabs */}
          <div data-testid="trip-filter" className="w-full sm:w-auto overflow-x-auto">
            <Tabs value={tripFilter} onValueChange={(v) => setTripFilter(v as 'all' | TripType)}>
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="all" data-testid="btn-all" className="text-xs sm:text-sm">All Trip Types</TabsTrigger>
                <TabsTrigger value="one-way" data-testid="btn-one-way" className="text-xs sm:text-sm">One Way</TabsTrigger>
                <TabsTrigger value="round-trip" data-testid="btn-round-trip" className="text-xs sm:text-sm">Round Trip</TabsTrigger>
                <TabsTrigger value="multi-city" data-testid="btn-multi-city" className="text-xs sm:text-sm">Multi City</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Summary */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground flex-none">
            <span>24 components</span>
            {tripFilter !== 'all' && (
              <>
                <span>&middot;</span>
                <span>Showing: {filterLabel}</span>
                <button
                  className="text-primary hover:underline"
                  onClick={() => setTripFilter('all')}
                >
                  Show All
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Body: sidebar + main ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile nav overlay */}
        {!isDesktop && mobileNav && (
          <button
            className="fixed inset-0 z-20 bg-black/30"
            onClick={() => setMobileNav(false)}
            aria-label="Close navigation"
          />
        )}

        {/* ── Sidebar nav ──────────────────────────────────────────── */}
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

        {/* ── Main content (scrollable) ────────────────────────────── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-2">

            {/* ================================================================
                1. AvinodeConnectionStatus — test_connection
               ================================================================ */}
            <DemoSection
              id="connection-status"
              toolName="test_connection"
              component="AvinodeConnectionStatus"
              description="System-level connection test result. Shows success/failure state with message and timestamp."
              dataDependencies={['result.success', 'result.message', 'result.timestamp']}
              category={getCategoryForId('connection-status')}
              componentNumber={getNumberForId('connection-status')}
            >
              <div className="space-y-4">
                <h3 className="text-sm font-medium mb-2">Success</h3>
                <AvinodeConnectionStatus
                  success={true}
                  message="Connected to Avinode API v2. Sandbox environment ready."
                  timestamp={DEMO_NOW}
                />
                <h3 className="text-sm font-medium mb-2 mt-4">Failure</h3>
                <AvinodeConnectionStatus
                  success={false}
                  message="Unable to reach Avinode API. Check credentials and network."
                  timestamp={DEMO_NOW}
                />
              </div>
            </DemoSection>

            {/* ================================================================
                2. AvinodeAuthStatus — auth_status
               ================================================================ */}
            <DemoSection
              id="auth-status"
              toolName="auth_status"
              component="AvinodeAuthStatus"
              description="Authentication status card showing method, environment, validity, and token expiration."
              dataDependencies={['result.method', 'result.environment', 'result.baseUrl', 'result.expiresAt', 'result.isValid']}
              category={getCategoryForId('auth-status')}
              componentNumber={getNumberForId('auth-status')}
            >
              <div className="space-y-4">
                <h3 className="text-sm font-medium mb-2">Sandbox (Valid)</h3>
                <AvinodeAuthStatus
                  method="bearer"
                  environment="sandbox"
                  baseUrl="https://sandbox.avinode.com/api/v2"
                  expiresAt={DEMO_EXPIRES_60D}
                  isValid={true}
                />
                <h3 className="text-sm font-medium mb-2 mt-4">Production (Expiring Soon)</h3>
                <AvinodeAuthStatus
                  method="api_key"
                  environment="production"
                  baseUrl="https://api.avinode.com/api/v2"
                  expiresAt={DEMO_EXPIRES_5D}
                  isValid={true}
                />
              </div>
            </DemoSection>

            {/* ================================================================
                3. WorkflowStatus — workflow stages
               ================================================================ */}
            <DemoSection
              id="workflow-status"
              toolName="workflow_status"
              component="WorkflowStatus"
              description="Displays the current workflow stage with progress indicator and step details."
              dataDependencies={['stage', 'progress', 'message', 'details[]']}
              category={getCategoryForId('workflow-status')}
              componentNumber={getNumberForId('workflow-status')}
            >
              <div className="space-y-4">
                <h3 className="text-sm font-medium mb-2">Analyzing (25%)</h3>
                <WorkflowStatus
                  stage="analyzing"
                  progress={25}
                  message="Parsing flight request parameters..."
                  details={[
                    { label: 'Route', value: 'KTEB → KMIA', status: 'completed' },
                    { label: 'Date', value: '2026-03-15', status: 'completed' },
                    { label: 'Passengers', value: 3, status: 'in_progress' },
                    { label: 'Preferences', value: 'Pending', status: 'pending' },
                  ]}
                />
                <h3 className="text-sm font-medium mb-2 mt-4">Searching (50%)</h3>
                <WorkflowStatus
                  stage="searching"
                  progress={50}
                  message="Querying Avinode for available aircraft..."
                  details={[
                    { label: 'Operators contacted', value: 12, status: 'completed' },
                    { label: 'Quotes received', value: '3 / 12', status: 'in_progress' },
                  ]}
                />
                <h3 className="text-sm font-medium mb-2 mt-4">Awaiting Quotes (70%)</h3>
                <WorkflowStatus
                  stage="awaiting_quotes"
                  progress={70}
                  message="Waiting for operator responses..."
                  details={[
                    { label: 'Quotes in', value: '5 / 8', status: 'in_progress' },
                    { label: 'Best price', value: '$43,800', status: 'completed' },
                  ]}
                />
                <h3 className="text-sm font-medium mb-2 mt-4">Completed (100%)</h3>
                <WorkflowStatus
                  stage="completed"
                  progress={100}
                  message="All quotes received and analyzed."
                  details={[
                    { label: 'Total quotes', value: 8, status: 'completed' },
                    { label: 'Recommended', value: 'Prime Jet, LLC', status: 'completed' },
                  ]}
                />
              </div>
            </DemoSection>

            {/* ================================================================
                4. ProgressIndicator — processing states
               ================================================================ */}
            <DemoSection
              id="progress-indicator"
              toolName="progress_indicator"
              component="ProgressIndicator"
              description="Loading/processing state with spinner, bar, or dots variants. Supports cancellation."
              dataDependencies={['message', 'progress', 'variant', 'cancellable']}
              category={getCategoryForId('progress-indicator')}
              componentNumber={getNumberForId('progress-indicator')}
            >
              <div className="space-y-4">
                <h3 className="text-sm font-medium mb-2">Spinner</h3>
                <ProgressIndicator
                  message="Connecting to Avinode API..."
                  variant="spinner"
                />
                <h3 className="text-sm font-medium mb-2 mt-4">Bar (65%)</h3>
                <ProgressIndicator
                  message="Generating proposal PDF..."
                  progress={65}
                  variant="bar"
                />
                <h3 className="text-sm font-medium mb-2 mt-4">Dots (cancellable)</h3>
                <ProgressIndicator
                  message="Waiting for operator response..."
                  variant="dots"
                  cancellable={true}
                  onCancel={() => setLastAction('[ProgressIndicator] Cancel clicked')}
                />
              </div>
            </DemoSection>

            {/* ================================================================
                5. TripCreatedUI — create_trip
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
              category={getCategoryForId('create-trip')}
              componentNumber={getNumberForId('create-trip')}
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
                6. TripDetailsCard — trip details
               ================================================================ */}
            <DemoSection
              id="trip-details"
              toolName="get_trip_details"
              component="TripDetailsCard"
              description="Detailed trip card with route visualization, status badge, buyer info, and copy-to-clipboard."
              dataDependencies={['tripId', 'departureAirport', 'arrivalAirport', 'departureDate', 'passengers', 'status', 'buyer']}
              category={getCategoryForId('trip-details')}
              componentNumber={getNumberForId('trip-details')}
            >
              {show('one-way') && (
                <div data-testid="trip-details-one-way">
                  <TripTypeLabel type="One-Way" />
                  <TripDetailsCard
                    tripId="atrip-OW-001"
                    departureAirport={AIRPORTS.KTEB}
                    arrivalAirport={AIRPORTS.KMIA}
                    departureDate="2026-03-15"
                    departureTime="10:00"
                    timezone="EST"
                    passengers={3}
                    status="active"
                    buyer={{ company: 'Acme Corp', contact: 'John Smith' }}
                    onCopyTripId={() => setLastAction('[TripDetailsCard] Copy trip ID: atrip-OW-001')}
                  />
                </div>
              )}
              {show('round-trip') && (
                <div data-testid="trip-details-round-trip">
                  <TripTypeLabel type="Round-Trip" />
                  <TripDetailsCard
                    tripId="atrip-RT-002"
                    departureAirport={AIRPORTS.KTEB}
                    arrivalAirport={AIRPORTS.KVNY}
                    departureDate="2026-04-05"
                    departureTime="08:00"
                    timezone="EST"
                    passengers={6}
                    status="pending"
                    buyer={{ company: 'GlobalCorp', contact: 'Sarah Johnson' }}
                    onCopyTripId={() => setLastAction('[TripDetailsCard] Copy trip ID: atrip-RT-002')}
                  />
                </div>
              )}
              {show('multi-city') && (
                <div data-testid="trip-details-multi-city">
                  <TripTypeLabel type="Multi-City" />
                  <TripDetailsCard
                    tripId="atrip-MC-003"
                    departureAirport={AIRPORTS.KTEB}
                    arrivalAirport={AIRPORTS.EGLL}
                    departureDate="2026-03-20"
                    passengers={5}
                    status="active"
                    buyer={{ company: 'InvestCo', contact: 'Michael Chen' }}
                    onCopyTripId={() => setLastAction('[TripDetailsCard] Copy trip ID: atrip-MC-003')}
                  />
                </div>
              )}
            </DemoSection>

            {/* ================================================================
                7. FlightSearchProgress — flight search workflow
               ================================================================ */}
            <DemoSection
              id="flight-search-progress"
              toolName="search_flights"
              component="FlightSearchProgress"
              description="4-step workflow: create trip → search Avinode → enter trip ID → send proposal. Uses renderMode='steps-1-2' to show steps 1-2 only."
              dataDependencies={['currentStep', 'flightRequest', 'deepLink', 'tripId', 'renderMode']}
              category={getCategoryForId('flight-search-progress')}
              componentNumber={getNumberForId('flight-search-progress')}
            >
              {show('one-way') && (
                <div data-testid="flight-search-one-way">
                  <TripTypeLabel type="One-Way" />
                  <FlightSearchProgress
                    currentStep={2}
                    isTripCreated={true}
                    flightRequest={{
                      departureAirport: { icao: 'KTEB', name: 'Teterboro Airport', city: 'Teterboro', state: 'NJ' },
                      arrivalAirport: { icao: 'KMIA', name: 'Miami International', city: 'Miami', state: 'FL' },
                      departureDate: '2026-03-15',
                      passengers: 3,
                      tripType: 'one_way',
                    }}
                    deepLink="https://sandbox.avinode.com/marketplace/mvc/search#preSearch"
                    renderMode="steps-1-2"
                    onDeepLinkClick={() => setLastAction('[FlightSearchProgress] Deep link clicked')}
                    onCopyDeepLink={() => setLastAction('[FlightSearchProgress] Deep link copied')}
                  />
                </div>
              )}
              {show('round-trip') && (
                <div data-testid="flight-search-round-trip">
                  <TripTypeLabel type="Round-Trip" />
                  <FlightSearchProgress
                    currentStep={1}
                    isTripCreated={true}
                    flightRequest={{
                      departureAirport: { icao: 'KTEB', name: 'Teterboro Airport', city: 'Teterboro', state: 'NJ' },
                      arrivalAirport: { icao: 'KVNY', name: 'Van Nuys Airport', city: 'Van Nuys', state: 'CA' },
                      departureDate: '2026-04-05',
                      passengers: 6,
                      tripType: 'round_trip',
                      returnDate: '2026-04-08',
                    }}
                    renderMode="steps-1-2"
                  />
                </div>
              )}
            </DemoSection>

            {/* ================================================================
                8. ActionButtons — inline actions
               ================================================================ */}
            <DemoSection
              id="action-buttons"
              toolName="action_buttons"
              component="ActionButtons"
              description="Inline quick-reply action buttons with horizontal, vertical, and grid layouts."
              dataDependencies={['actions[]', 'layout', 'onAction']}
              category={getCategoryForId('action-buttons')}
              componentNumber={getNumberForId('action-buttons')}
            >
              <div className="space-y-4">
                <h3 className="text-sm font-medium mb-2">Horizontal</h3>
                <ActionButtons
                  actions={[
                    { id: 'accept', label: 'Accept Quote', value: 'accept', variant: 'primary' },
                    { id: 'counter', label: 'Counter Offer', value: 'counter', variant: 'secondary' },
                    { id: 'decline', label: 'Decline', value: 'decline', variant: 'outline' },
                  ]}
                  layout="horizontal"
                  onAction={(id, val) => setLastAction(`[ActionButtons/horizontal] ${id}: ${val}`)}
                />
                <h3 className="text-sm font-medium mb-2 mt-4">Vertical</h3>
                <ActionButtons
                  actions={[
                    { id: 'view-proposal', label: 'View Proposal', value: 'view', variant: 'primary' },
                    { id: 'edit-margin', label: 'Edit Margin', value: 'edit', variant: 'secondary' },
                    { id: 'send-email', label: 'Send to Client', value: 'send', variant: 'outline' },
                  ]}
                  layout="vertical"
                  onAction={(id, val) => setLastAction(`[ActionButtons/vertical] ${id}: ${val}`)}
                />
                <h3 className="text-sm font-medium mb-2 mt-4">Grid</h3>
                <ActionButtons
                  actions={[
                    { id: 'g650', label: 'Gulfstream G650', value: 'g650', variant: 'outline' },
                    { id: 'global7500', label: 'Global 7500', value: 'global7500', variant: 'outline' },
                    { id: 'falcon8x', label: 'Falcon 8X', value: 'falcon8x', variant: 'outline' },
                    { id: 'challenger350', label: 'Challenger 350', value: 'challenger350', variant: 'outline' },
                    { id: 'citation-x', label: 'Citation X+', value: 'citation-x', variant: 'outline' },
                    { id: 'legacy500', label: 'Legacy 500', value: 'legacy500', variant: 'outline' },
                  ]}
                  layout="grid"
                  onAction={(id, val) => setLastAction(`[ActionButtons/grid] ${id}: ${val}`)}
                />
              </div>
            </DemoSection>

            {/* ================================================================
                9. FormField — inline form inputs
               ================================================================ */}
            <DemoSection
              id="form-field"
              toolName="form_field"
              component="FormField"
              description="Inline form field within chat messages. Supports text, number, select, date, and textarea types."
              dataDependencies={['field.name', 'field.label', 'field.type', 'field.options[]', 'field.validation']}
              category={getCategoryForId('form-field')}
              componentNumber={getNumberForId('form-field')}
            >
              <div className="space-y-4">
                <h3 className="text-sm font-medium mb-2">Number (Passengers)</h3>
                <FormField
                  field={{
                    name: 'passengers',
                    label: 'Number of Passengers',
                    type: 'number',
                    placeholder: 'Enter passenger count',
                    required: true,
                    validation: { min: 1, max: 19 },
                  }}
                  onSubmit={(name, val) => setLastAction(`[FormField/number] ${name}: ${val}`)}
                />
                <h3 className="text-sm font-medium mb-2 mt-4">Select (Aircraft Category)</h3>
                <FormField
                  field={{
                    name: 'aircraft_category',
                    label: 'Preferred Aircraft Category',
                    type: 'select',
                    placeholder: 'Select category',
                    options: [
                      { label: 'Light Jet', value: 'light' },
                      { label: 'Midsize Jet', value: 'midsize' },
                      { label: 'Super Midsize', value: 'super_mid' },
                      { label: 'Heavy Jet', value: 'heavy' },
                      { label: 'Ultra Long Range', value: 'ultra_long' },
                    ],
                  }}
                  onSubmit={(name, val) => setLastAction(`[FormField/select] ${name}: ${val}`)}
                />
                <h3 className="text-sm font-medium mb-2 mt-4">Date (Departure)</h3>
                <FormField
                  field={{
                    name: 'departure_date',
                    label: 'Departure Date',
                    type: 'date',
                    required: true,
                  }}
                  onSubmit={(name, val) => setLastAction(`[FormField/date] ${name}: ${val}`)}
                />
                <h3 className="text-sm font-medium mb-2 mt-4">Textarea (Special Requirements)</h3>
                <FormField
                  field={{
                    name: 'special_requirements',
                    label: 'Special Requirements',
                    type: 'textarea',
                    placeholder: 'Catering, pets, medical equipment, etc.',
                    validation: { maxLength: 500 },
                  }}
                  onSubmit={(name, val) => setLastAction(`[FormField/textarea] ${name}: ${val}`)}
                />
              </div>
            </DemoSection>

            {/* ================================================================
                10. RfqResultsUI — get_rfq
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
              category={getCategoryForId('get-rfq')}
              componentNumber={getNumberForId('get-rfq')}
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
                    lastUpdated: DEMO_NOW,
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
                    lastUpdated: DEMO_NOW,
                    aircraftCategory: 'Heavy Jet',
                  },
                ] as any}
                onAction={onAction('get_rfq')}
              />
            </DemoSection>

            {/* ================================================================
                11. RfqQuoteDetailsCard — get_quote
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
              category={getCategoryForId('get-quote')}
              componentNumber={getNumberForId('get-quote')}
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
                12. AvinodeMessageCard — trip communication
               ================================================================ */}
            <DemoSection
              id="avinode-message"
              toolName="send_trip_message / get_trip_messages"
              component="AvinodeMessageCard"
              description="Individual Avinode communication card. Supports REQUEST, RESPONSE, CONFIRMATION, and INFO message types."
              dataDependencies={['messageType', 'content', 'timestamp', 'sender']}
              category={getCategoryForId('avinode-message')}
              componentNumber={getNumberForId('avinode-message')}
            >
              <div className="space-y-4">
                <h3 className="text-sm font-medium mb-2">REQUEST</h3>
                <AvinodeMessageCard
                  messageType="REQUEST"
                  content="We need a G650 or similar heavy jet for 6 passengers, KTEB to KMIA on March 15. Pet-friendly cabin required."
                  timestamp="2026-03-10T09:00:00Z"
                  sender="Jetvision Charter"
                />
                <h3 className="text-sm font-medium mb-2 mt-4">RESPONSE</h3>
                <AvinodeMessageCard
                  messageType="RESPONSE"
                  content="We can offer our Gulfstream G650 (N650PJ) at $47,500. Available for your requested date. Pets welcome on board."
                  timestamp="2026-03-10T11:30:00Z"
                  sender="Prime Jet, LLC"
                />
                <h3 className="text-sm font-medium mb-2 mt-4">CONFIRMATION</h3>
                <AvinodeMessageCard
                  messageType="CONFIRMATION"
                  content="Booking confirmed for KTEB → KMIA on March 15, 2026. Gulfstream G650, 6 passengers. Contract #CONTRACT-2026-001."
                  timestamp="2026-03-12T14:00:00Z"
                  sender="System"
                />
                <h3 className="text-sm font-medium mb-2 mt-4">INFO</h3>
                <AvinodeMessageCard
                  messageType="INFO"
                  content="Operator has updated their availability. New departure window: 08:00–12:00 EST."
                  timestamp="2026-03-11T16:45:00Z"
                />
              </div>
            </DemoSection>

            {/* ================================================================
               13. OperatorChatInline — get_trip_messages
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
              category={getCategoryForId('get-trip-messages')}
              componentNumber={getNumberForId('get-trip-messages')}
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
                14. FileAttachment — file uploads
               ================================================================ */}
            <DemoSection
              id="file-attachment"
              toolName="file_attachment"
              component="FileAttachment"
              description="Attached file display with icon, size, preview, and download actions. Supports images, PDFs, spreadsheets."
              dataDependencies={['file.id', 'file.name', 'file.type', 'file.size', 'file.url']}
              category={getCategoryForId('file-attachment')}
              componentNumber={getNumberForId('file-attachment')}
            >
              <div className="space-y-4">
                <h3 className="text-sm font-medium mb-2">PDF</h3>
                <FileAttachment
                  file={{
                    id: 'file-pdf-001',
                    name: 'Proposal-KTEB-KMIA-2026.pdf',
                    type: 'application/pdf',
                    size: 245000,
                    url: '#',
                  }}
                  onDownload={(id) => setLastAction(`[FileAttachment] Download: ${id}`)}
                  onPreview={(id) => setLastAction(`[FileAttachment] Preview: ${id}`)}
                />
                <h3 className="text-sm font-medium mb-2 mt-4">Image</h3>
                <FileAttachment
                  file={{
                    id: 'file-img-002',
                    name: 'aircraft-interior-G650.jpg',
                    type: 'image/jpeg',
                    size: 1850000,
                    url: '#',
                  }}
                  onDownload={(id) => setLastAction(`[FileAttachment] Download: ${id}`)}
                  onPreview={(id) => setLastAction(`[FileAttachment] Preview: ${id}`)}
                />
                <h3 className="text-sm font-medium mb-2 mt-4">Spreadsheet</h3>
                <FileAttachment
                  file={{
                    id: 'file-xls-003',
                    name: 'Q1-2026-Flight-Requests.xlsx',
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    size: 87500,
                    url: '#',
                  }}
                  onDownload={(id) => setLastAction(`[FileAttachment] Download: ${id}`)}
                />
              </div>
            </DemoSection>

            {/* ================================================================
               15. PipelineDashboard — list_requests
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
              category={getCategoryForId('list-requests')}
              componentNumber={getNumberForId('list-requests')}
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
                16. InlineDashboard — comprehensive pipeline view
               ================================================================ */}
            <DemoSection
              id="inline-dashboard"
              toolName="get_dashboard"
              component="InlineDashboard"
              description="Comprehensive inline dashboard with deal pipeline tracker, analytics summary, hot opportunities, and performance metrics."
              dataDependencies={['pipeline[]', 'analytics', 'metrics', 'hotOpportunities[]', 'dateRange']}
              category={getCategoryForId('inline-dashboard')}
              componentNumber={getNumberForId('inline-dashboard')}
            >
              <InlineDashboard
                pipeline={[
                  { id: 'stage-1', name: 'New Requests', shortName: 'New', count: 8, value: 425000, status: 'completed', order: 1 },
                  { id: 'stage-2', name: 'Searching', shortName: 'Search', count: 5, value: 310000, status: 'completed', order: 2 },
                  { id: 'stage-3', name: 'Quoting', shortName: 'Quote', count: 3, value: 198000, status: 'active', order: 3 },
                  { id: 'stage-4', name: 'Proposal Sent', shortName: 'Sent', count: 2, value: 145000, status: 'pending', order: 4 },
                  { id: 'stage-5', name: 'Closed Won', shortName: 'Won', count: 1, value: 92500, status: 'pending', order: 5 },
                ]}
                analytics={{
                  successRate: 78.5,
                  conversionRate: 34.2,
                  avgDealValue: 87500,
                  avgTimeToClose: 72,
                  totalDeals: 24,
                  periodComparison: {
                    successRateDelta: 5.2,
                    conversionDelta: -2.1,
                    valueDelta: 12.8,
                    timeToCloseDelta: -8.5,
                  },
                }}
                metrics={{
                  activeRequests: 12,
                  pendingQuotes: 5,
                  hotOpportunities: 3,
                  closedDealsValue: 1250000,
                  avgResponseTime: 4.5,
                }}
                hotOpportunities={[
                  { id: 'hot-1', departureAirport: 'KTEB', arrivalAirport: 'KMIA', expiresAt: DEMO_HOT_2H, value: 47500, currency: 'USD', clientName: 'John Smith', urgencyLevel: 'critical' },
                  { id: 'hot-2', departureAirport: 'KVNY', arrivalAirport: 'EGLL', expiresAt: DEMO_HOT_8H, value: 125000, currency: 'USD', clientName: 'Sarah Johnson', urgencyLevel: 'high' },
                  { id: 'hot-3', departureAirport: 'KMIA', arrivalAirport: 'LSZH', expiresAt: DEMO_HOT_24H, value: 98000, currency: 'USD', clientName: 'Michael Chen', urgencyLevel: 'medium' },
                ]}
                dateRange={{ start: '2026-01-01', end: '2026-02-14', label: 'January 1 – February 14, 2026' }}
                onViewRequest={(id) => setLastAction(`[InlineDashboard] View request: ${id}`)}
                onRefresh={() => setLastAction('[InlineDashboard] Refresh')}
                onPeriodChange={(period) => setLastAction(`[InlineDashboard] Period: ${period}`)}
                onViewAllOpportunities={() => setLastAction('[InlineDashboard] View all opportunities')}
              />
            </DemoSection>

            {/* ================================================================
               17. QuoteComparisonUI — get_quotes
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
              category={getCategoryForId('get-quotes')}
              componentNumber={getNumberForId('get-quotes')}
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
               18. ProposalPreview — create_proposal / get_proposal
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
              category={getCategoryForId('create-proposal')}
              componentNumber={getNumberForId('create-proposal')}
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
               19. EmailApprovalUI — prepare_proposal_email
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
              category={getCategoryForId('prepare-email')}
              componentNumber={getNumberForId('prepare-email')}
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
                    generatedAt={DEMO_NOW}
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
                    generatedAt={DEMO_NOW}
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
                    generatedAt={DEMO_NOW}
                    requestId="req-003"
                    onAction={onAction('email/multi-city')}
                  />
                </div>
              )}
            </DemoSection>

            {/* ================================================================
               20. ProposalSentConfirmation — send_proposal_email
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
              category={getCategoryForId('send-proposal-email')}
              componentNumber={getNumberForId('send-proposal-email')}
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
               21. ContractSentConfirmation — book_flight
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
              category={getCategoryForId('book-flight')}
              componentNumber={getNumberForId('book-flight')}
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

            {/* ================================================================
                22. PaymentConfirmedCard — mark_payment
               ================================================================ */}
            <DemoSection
              id="payment-confirmed"
              toolName="mark_payment"
              component="PaymentConfirmedCard"
              description="Payment confirmation card showing amount, method, reference, and timestamp."
              dataDependencies={['contractId', 'contractNumber', 'paymentAmount', 'paymentMethod', 'paymentReference', 'paidAt', 'currency']}
              category={getCategoryForId('payment-confirmed')}
              componentNumber={getNumberForId('payment-confirmed')}
            >
              {show('one-way') && (
                <div data-testid="payment-one-way">
                  <TripTypeLabel type="One-Way" />
                  <PaymentConfirmedCard
                    contractId="contract-001"
                    contractNumber="CONTRACT-2026-001"
                    paymentAmount={45000}
                    paymentMethod="wire"
                    paymentReference="WIRE-2026-03-14-001"
                    paidAt="2026-03-14T16:30:00Z"
                    currency="USD"
                  />
                </div>
              )}
              {show('round-trip') && (
                <div data-testid="payment-round-trip">
                  <TripTypeLabel type="Round-Trip" />
                  <PaymentConfirmedCard
                    contractId="contract-002"
                    contractNumber="CONTRACT-2026-002"
                    paymentAmount={92500}
                    paymentMethod="credit_card"
                    paymentReference="CC-4242-2026-04-02"
                    paidAt="2026-04-02T10:15:00Z"
                    currency="USD"
                  />
                </div>
              )}
              {show('multi-city') && (
                <div data-testid="payment-multi-city">
                  <TripTypeLabel type="Multi-City" />
                  <PaymentConfirmedCard
                    contractId="contract-003"
                    contractNumber="CONTRACT-2026-003"
                    paymentAmount={185000}
                    paymentMethod="wire"
                    paymentReference="WIRE-2026-03-18-003"
                    paidAt="2026-03-18T09:00:00Z"
                    currency="USD"
                  />
                </div>
              )}
            </DemoSection>

            {/* ================================================================
                23. ClosedWonConfirmation — deal lifecycle
               ================================================================ */}
            <DemoSection
              id="closed-won"
              toolName="close_deal"
              component="ClosedWonConfirmation"
              description="Deal closure card with contract details, deal value, and lifecycle timeline (proposal → contract → payment)."
              dataDependencies={['contractNumber', 'customerName', 'flightRoute', 'dealValue', 'currency', 'proposalSentAt', 'contractSentAt', 'paymentReceivedAt']}
              category={getCategoryForId('closed-won')}
              componentNumber={getNumberForId('closed-won')}
            >
              {show('one-way') && (
                <div data-testid="closed-won-one-way">
                  <TripTypeLabel type="One-Way" />
                  <ClosedWonConfirmation
                    contractNumber="CONTRACT-2026-001"
                    customerName="John Smith"
                    flightRoute="KTEB → KMIA"
                    dealValue={45000}
                    currency="USD"
                    proposalSentAt="2026-03-10T09:00:00Z"
                    contractSentAt="2026-03-12T14:00:00Z"
                    paymentReceivedAt="2026-03-14T16:30:00Z"
                  />
                </div>
              )}
              {show('round-trip') && (
                <div data-testid="closed-won-round-trip">
                  <TripTypeLabel type="Round-Trip" />
                  <ClosedWonConfirmation
                    contractNumber="CONTRACT-2026-002"
                    customerName="Sarah Johnson"
                    flightRoute="KTEB ⇄ KVNY"
                    dealValue={92500}
                    currency="USD"
                    proposalSentAt="2026-03-25T10:00:00Z"
                    contractSentAt="2026-03-28T11:00:00Z"
                    paymentReceivedAt="2026-04-02T10:15:00Z"
                  />
                </div>
              )}
              {show('multi-city') && (
                <div data-testid="closed-won-multi-city">
                  <TripTypeLabel type="Multi-City" />
                  <ClosedWonConfirmation
                    contractNumber="CONTRACT-2026-003"
                    customerName="Michael Chen"
                    flightRoute="KTEB → EGLL → LFPB → KTEB"
                    dealValue={185000}
                    currency="USD"
                    proposalSentAt="2026-03-08T15:00:00Z"
                    contractSentAt="2026-03-14T09:00:00Z"
                    paymentReceivedAt="2026-03-18T09:00:00Z"
                  />
                </div>
              )}
            </DemoSection>

            {/* ================================================================
                24. FlightRequestStageBadge — flight request lifecycle stages
               ================================================================ */}
            <DemoSection
              id="stage-badge"
              toolName="flight_request_stage"
              component="FlightRequestStageBadge"
              description="Color-coded badge for each of the 10 flight request lifecycle stages. Uses design-system status tokens."
              dataDependencies={['stage']}
              category={getCategoryForId('stage-badge')}
              componentNumber={getNumberForId('stage-badge')}
            >
              <div className="flex flex-wrap gap-2">
                {FLIGHT_REQUEST_STAGES.map((stage) => (
                  <FlightRequestStageBadge key={stage} stage={stage} />
                ))}
              </div>
            </DemoSection>

          </div>
        </div>
      </div>
    </div>
  );
}
