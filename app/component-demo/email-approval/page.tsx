'use client';

import React, { useState } from 'react';
import { EmailApprovalUI } from '@/components/mcp-ui/composites/EmailApprovalUI';
import { Button } from '@/components/ui/button';
import type { UIActionResult } from '@mcp-ui/server';

/**
 * Demo page for EmailApprovalUI across all three trip types.
 * Public route - no auth required.
 */

// Shared email body template
const buildEmailBody = (name: string, route: string) =>
  `Dear ${name},\n\nPlease find attached your charter flight proposal for ${route}.\n\nWe have secured competitive pricing from our network of vetted operators. The attached PDF includes full flight details, aircraft specifications, and pricing breakdown.\n\nPlease review at your convenience and let us know if you have any questions or would like to proceed.\n\nBest regards,\nYour Charter Team`;

export default function EmailApprovalDemo() {
  const [activeView, setActiveView] = useState<
    'all' | 'one-way' | 'round-trip' | 'multi-city' | 'edge-cases'
  >('all');
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleAction = (label: string) => (action: UIActionResult) => {
    const detail =
      action.type === 'tool'
        ? `tool:${action.payload.toolName}`
        : action.type === 'notify'
          ? `notify:${action.payload.message}`
          : action.type;
    setLastAction(`[${label}] ${detail}`);
    console.log(`[${label}] Action:`, action);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold" data-testid="demo-title">
            EmailApprovalUI Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Human-in-the-loop email approval for One-Way, Round-Trip, and Multi-City proposals
          </p>
        </div>

        {/* View Controls */}
        <div className="flex flex-wrap gap-2 justify-center" data-testid="view-controls">
          <Button
            variant={activeView === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveView('all')}
            data-testid="btn-show-all"
          >
            Show All
          </Button>
          <Button
            variant={activeView === 'one-way' ? 'default' : 'outline'}
            onClick={() => setActiveView('one-way')}
            data-testid="btn-one-way"
          >
            One-Way
          </Button>
          <Button
            variant={activeView === 'round-trip' ? 'default' : 'outline'}
            onClick={() => setActiveView('round-trip')}
            data-testid="btn-round-trip"
          >
            Round-Trip
          </Button>
          <Button
            variant={activeView === 'multi-city' ? 'default' : 'outline'}
            onClick={() => setActiveView('multi-city')}
            data-testid="btn-multi-city"
          >
            Multi-City
          </Button>
          <Button
            variant={activeView === 'edge-cases' ? 'default' : 'outline'}
            onClick={() => setActiveView('edge-cases')}
            data-testid="btn-edge-cases"
          >
            Edge Cases
          </Button>
        </div>

        {/* Action log */}
        {lastAction && (
          <div
            className="bg-gray-100 dark:bg-gray-800 text-sm font-mono px-4 py-2 rounded-lg"
            data-testid="action-log"
          >
            Last action: {lastAction}
          </div>
        )}

        {/* ONE-WAY EMAIL */}
        {(activeView === 'all' || activeView === 'one-way') && (
          <section data-testid="section-one-way">
            <h2 className="text-xl font-semibold mb-4">One-Way Proposal Email</h2>
            <EmailApprovalUI
              proposalId="prop-oneway-001"
              proposalNumber="PROP-2026-0042"
              to={{ email: 'john.smith@acme.com', name: 'John Smith' }}
              subject="Charter Flight Proposal: KTEB to KMIA - March 15, 2026"
              body={buildEmailBody('John', 'KTEB to KMIA on March 15, 2026')}
              attachments={[
                {
                  name: 'Proposal-KTEB-KMIA-2026-03-15.pdf',
                  url: 'https://example.com/proposal-oneway.pdf',
                  size: 245000,
                },
              ]}
              flightDetails={{
                departureAirport: 'KTEB',
                arrivalAirport: 'KMIA',
                departureDate: '2026-03-15',
                passengers: 3,
                tripType: 'one_way',
              }}
              pricing={{ subtotal: 42000, total: 45000, currency: 'USD' }}
              generatedAt="2026-02-26T12:00:00.000Z"
              requestId="req-001"
              onAction={handleAction('one-way')}
            />
          </section>
        )}

        {/* ROUND-TRIP EMAIL */}
        {(activeView === 'all' || activeView === 'round-trip') && (
          <section data-testid="section-round-trip">
            <h2 className="text-xl font-semibold mb-4">Round-Trip Proposal Email</h2>
            <EmailApprovalUI
              proposalId="prop-roundtrip-002"
              proposalNumber="PROP-2026-0078"
              to={{ email: 'sarah@globalcorp.com', name: 'Sarah Johnson' }}
              subject="Charter Flight Proposal: KTEB ⇄ KVNY Round-Trip - April 5-8, 2026"
              body={buildEmailBody(
                'Sarah',
                'a round-trip from KTEB to KVNY departing April 5 and returning April 8, 2026'
              )}
              attachments={[
                {
                  name: 'Proposal-KTEB-KVNY-RT-2026-04-05.pdf',
                  url: 'https://example.com/proposal-roundtrip.pdf',
                  size: 312000,
                },
              ]}
              flightDetails={{
                departureAirport: 'KTEB',
                arrivalAirport: 'KVNY',
                departureDate: '2026-04-05',
                passengers: 6,
                tripType: 'round_trip',
                returnDate: '2026-04-08',
              }}
              pricing={{ subtotal: 88000, total: 92500, currency: 'USD' }}
              generatedAt="2026-02-26T12:00:00.000Z"
              requestId="req-002"
              onAction={handleAction('round-trip')}
            />
          </section>
        )}

        {/* MULTI-CITY EMAIL (3 legs) */}
        {(activeView === 'all' || activeView === 'multi-city') && (
          <section data-testid="section-multi-city-3leg">
            <h2 className="text-xl font-semibold mb-4">Multi-City Proposal Email (3 Legs)</h2>
            <EmailApprovalUI
              proposalId="prop-multicity-003"
              proposalNumber="PROP-2026-0115"
              to={{ email: 'michael@investment-group.com', name: 'Michael Chen' }}
              subject="Charter Flight Proposal: Multi-City KTEB → EGLL → LFPB → KTEB"
              body={buildEmailBody(
                'Michael',
                'a multi-city itinerary: Teterboro → London → Paris → Teterboro (March 20-26, 2026)'
              )}
              attachments={[
                {
                  name: 'Proposal-Multi-KTEB-EGLL-LFPB-KTEB.pdf',
                  url: 'https://example.com/proposal-multicity-3.pdf',
                  size: 487000,
                },
              ]}
              flightDetails={{
                departureAirport: 'KTEB',
                arrivalAirport: 'KTEB',
                departureDate: '2026-03-20',
                passengers: 5,
                tripType: 'multi_city',
                segments: [
                  { departureAirport: 'KTEB', arrivalAirport: 'EGLL', date: '2026-03-20' },
                  { departureAirport: 'EGLL', arrivalAirport: 'LFPB', date: '2026-03-23' },
                  { departureAirport: 'LFPB', arrivalAirport: 'KTEB', date: '2026-03-26' },
                ],
              }}
              pricing={{ subtotal: 175000, total: 185000, currency: 'USD' }}
              generatedAt="2026-02-26T12:00:00.000Z"
              requestId="req-003"
              onAction={handleAction('multi-city-3')}
            />
          </section>
        )}

        {/* MULTI-CITY EMAIL (4 legs) */}
        {(activeView === 'all' || activeView === 'multi-city') && (
          <section data-testid="section-multi-city-4leg">
            <h2 className="text-xl font-semibold mb-4">Multi-City Proposal Email (4 Legs)</h2>
            <EmailApprovalUI
              proposalId="prop-multicity-004"
              proposalNumber="PROP-2026-0133"
              to={{ email: 'emma@luxury-travel.com', name: 'Emma Williams' }}
              subject="Charter Flight Proposal: Multi-City European Tour"
              body={buildEmailBody(
                'Emma',
                'a 4-leg European tour: Teterboro → London → Zurich → Paris → Teterboro (April 1-10, 2026)'
              )}
              attachments={[
                {
                  name: 'Proposal-Euro-Tour-2026-04.pdf',
                  url: 'https://example.com/proposal-multicity-4.pdf',
                  size: 523000,
                },
              ]}
              flightDetails={{
                departureAirport: 'KTEB',
                arrivalAirport: 'KTEB',
                departureDate: '2026-04-01',
                passengers: 4,
                tripType: 'multi_city',
                segments: [
                  { departureAirport: 'KTEB', arrivalAirport: 'EGLL', date: '2026-04-01' },
                  { departureAirport: 'EGLL', arrivalAirport: 'LSZH', date: '2026-04-04' },
                  { departureAirport: 'LSZH', arrivalAirport: 'LFPG', date: '2026-04-07' },
                  { departureAirport: 'LFPG', arrivalAirport: 'KTEB', date: '2026-04-10' },
                ],
              }}
              pricing={{ subtotal: 232000, total: 245000, currency: 'EUR' }}
              generatedAt="2026-02-26T12:00:00.000Z"
              requestId="req-004"
              onAction={handleAction('multi-city-4')}
            />
          </section>
        )}

        {/* EDGE CASES */}
        {(activeView === 'all' || activeView === 'edge-cases') && (
          <section data-testid="section-edge-cases" className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Edge Cases</h2>

            {/* No flight details */}
            <div data-testid="edge-no-flight-details">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                No flight details or pricing
              </h3>
              <EmailApprovalUI
                proposalId="prop-edge-001"
                to={{ email: 'test@example.com', name: 'Test User' }}
                subject="Charter Flight Proposal"
                body="Dear Test User,\n\nPlease find attached your charter flight proposal.\n\nBest regards,\nYour Charter Team"
                attachments={[
                  { name: 'proposal-draft.pdf', url: 'https://example.com/draft.pdf' },
                ]}
                onAction={handleAction('edge-no-details')}
              />
            </div>

            {/* No attachments */}
            <div data-testid="edge-no-attachments">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                No attachments (round-trip)
              </h3>
              <EmailApprovalUI
                proposalId="prop-edge-002"
                proposalNumber="PROP-2026-DRAFT"
                to={{ email: 'nopdf@example.com', name: 'Draft Client' }}
                subject="Charter Flight Proposal: KBOS ⇄ KDFW"
                body={buildEmailBody('Draft Client', 'KBOS ⇄ KDFW round-trip')}
                attachments={[]}
                flightDetails={{
                  departureAirport: 'KBOS',
                  arrivalAirport: 'KDFW',
                  departureDate: '2026-06-15',
                  passengers: 2,
                  tripType: 'round_trip',
                  returnDate: '2026-06-18',
                }}
                pricing={{ subtotal: 55000, total: 58000, currency: 'USD' }}
                onAction={handleAction('edge-no-attachments')}
              />
            </div>

            {/* Multiple attachments */}
            <div data-testid="edge-multiple-attachments">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Multiple attachments (multi-city)
              </h3>
              <EmailApprovalUI
                proposalId="prop-edge-003"
                proposalNumber="PROP-2026-0200"
                to={{ email: 'vip@example.com', name: 'VIP Client' }}
                subject="Charter Flight Proposal: Multi-City with Supporting Documents"
                body={buildEmailBody(
                  'VIP Client',
                  'a multi-city itinerary with supporting aircraft specifications'
                )}
                attachments={[
                  {
                    name: 'Proposal-VIP-Multi-City.pdf',
                    url: 'https://example.com/proposal-vip.pdf',
                    size: 890000,
                  },
                  {
                    name: 'Aircraft-Spec-G650.pdf',
                    url: 'https://example.com/spec-g650.pdf',
                    size: 1200000,
                  },
                  {
                    name: 'Insurance-Certificate.pdf',
                    url: 'https://example.com/insurance.pdf',
                    size: 340000,
                  },
                ]}
                flightDetails={{
                  departureAirport: 'KTEB',
                  arrivalAirport: 'KTEB',
                  departureDate: '2026-05-01',
                  passengers: 8,
                  tripType: 'multi_city',
                  segments: [
                    { departureAirport: 'KTEB', arrivalAirport: 'KLAS', date: '2026-05-01' },
                    { departureAirport: 'KLAS', arrivalAirport: 'KSFO', date: '2026-05-03' },
                    { departureAirport: 'KSFO', arrivalAirport: 'KTEB', date: '2026-05-06' },
                  ],
                }}
                pricing={{ subtotal: 125000, total: 132000, currency: 'USD' }}
                generatedAt="2026-02-26T12:00:00.000Z"
                onAction={handleAction('edge-multi-attach')}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
