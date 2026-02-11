'use client';

import React, { useState } from 'react';
import { ProposalSentConfirmation } from '@/components/proposal/proposal-sent-confirmation';
import { Button } from '@/components/ui/button';

/**
 * Demo page for ProposalSentConfirmation across all three trip types.
 * Public route - no auth required.
 */

export default function ProposalSentConfirmationDemo() {
  const [activeView, setActiveView] = useState<
    'all' | 'one-way' | 'round-trip' | 'multi-city' | 'edge-cases'
  >('all');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold" data-testid="demo-title">
            ProposalSentConfirmation Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Proposal sent confirmation cards for One-Way, Round-Trip, and Multi-City trips
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

        {/* ONE-WAY PROPOSAL */}
        {(activeView === 'all' || activeView === 'one-way') && (
          <section data-testid="section-one-way">
            <h2 className="text-xl font-semibold mb-4">One-Way Proposal Sent</h2>
            <ProposalSentConfirmation
              flightDetails={{
                departureAirport: 'KTEB',
                arrivalAirport: 'KMIA',
                departureDate: '2026-03-15',
              }}
              client={{
                name: 'John Smith',
                email: 'john.smith@acme.com',
              }}
              pdfUrl="https://example.com/proposal-oneway-001.pdf"
              fileName="Proposal-KTEB-KMIA-2026-03-15.pdf"
              proposalId="prop-oneway-001"
              pricing={{
                total: 45000,
                currency: 'USD',
              }}
              onGenerateContract={() => console.log('Generate contract: one-way')}
            />
          </section>
        )}

        {/* ROUND-TRIP PROPOSAL */}
        {(activeView === 'all' || activeView === 'round-trip') && (
          <section data-testid="section-round-trip">
            <h2 className="text-xl font-semibold mb-4">Round-Trip Proposal Sent</h2>
            <ProposalSentConfirmation
              flightDetails={{
                departureAirport: 'KTEB',
                arrivalAirport: 'KVNY',
                departureDate: '2026-04-05',
                tripType: 'round_trip',
                returnDate: '2026-04-08',
              }}
              client={{
                name: 'Sarah Johnson',
                email: 'sarah@globalcorp.com',
              }}
              pdfUrl="https://example.com/proposal-roundtrip-002.pdf"
              fileName="Proposal-KTEB-KVNY-RT-2026-04-05.pdf"
              proposalId="prop-roundtrip-002"
              pricing={{
                total: 92500,
                currency: 'USD',
                outboundCost: 46000,
                returnCost: 46500,
              }}
              onGenerateContract={() => console.log('Generate contract: round-trip')}
            />
          </section>
        )}

        {/* MULTI-CITY PROPOSAL (3 legs) */}
        {(activeView === 'all' || activeView === 'multi-city') && (
          <section data-testid="section-multi-city-3leg">
            <h2 className="text-xl font-semibold mb-4">Multi-City Proposal Sent (3 Legs)</h2>
            <ProposalSentConfirmation
              flightDetails={{
                departureAirport: 'KTEB',
                arrivalAirport: 'KTEB',
                departureDate: '2026-03-20',
                tripType: 'multi_city',
                segments: [
                  { departureAirport: 'KTEB', arrivalAirport: 'EGLL', departureDate: '2026-03-20' },
                  { departureAirport: 'EGLL', arrivalAirport: 'LFPB', departureDate: '2026-03-23' },
                  { departureAirport: 'LFPB', arrivalAirport: 'KTEB', departureDate: '2026-03-26' },
                ],
              }}
              client={{
                name: 'Michael Chen',
                email: 'michael@investment-group.com',
              }}
              pdfUrl="https://example.com/proposal-multicity-003.pdf"
              fileName="Proposal-Multi-KTEB-EGLL-LFPB-KTEB.pdf"
              proposalId="prop-multicity-003"
              pricing={{
                total: 185000,
                currency: 'USD',
              }}
              onGenerateContract={() => console.log('Generate contract: multi-city')}
            />
          </section>
        )}

        {/* MULTI-CITY PROPOSAL (4 legs) */}
        {(activeView === 'all' || activeView === 'multi-city') && (
          <section data-testid="section-multi-city-4leg">
            <h2 className="text-xl font-semibold mb-4">Multi-City Proposal Sent (4 Legs)</h2>
            <ProposalSentConfirmation
              flightDetails={{
                departureAirport: 'KTEB',
                arrivalAirport: 'KTEB',
                departureDate: '2026-04-01',
                tripType: 'multi_city',
                segments: [
                  { departureAirport: 'KTEB', arrivalAirport: 'EGLL', departureDate: '2026-04-01' },
                  { departureAirport: 'EGLL', arrivalAirport: 'LSZH', departureDate: '2026-04-04' },
                  { departureAirport: 'LSZH', arrivalAirport: 'LFPG', departureDate: '2026-04-07' },
                  { departureAirport: 'LFPG', arrivalAirport: 'KTEB', departureDate: '2026-04-10' },
                ],
              }}
              client={{
                name: 'Emma Williams',
                email: 'emma@luxury-travel.com',
              }}
              pdfUrl="https://example.com/proposal-multicity-004.pdf"
              fileName="Proposal-Multi-KTEB-EGLL-LSZH-LFPG-KTEB.pdf"
              proposalId="prop-multicity-004"
              pricing={{
                total: 245000,
                currency: 'EUR',
              }}
              onGenerateContract={() => console.log('Generate contract: multi-city 4-leg')}
            />
          </section>
        )}

        {/* EDGE CASES */}
        {(activeView === 'all' || activeView === 'edge-cases') && (
          <section data-testid="section-edge-cases" className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Edge Cases</h2>

            {/* No pricing */}
            <div data-testid="edge-no-pricing">
              <h3 className="text-sm font-medium text-gray-500 mb-2">No pricing (one-way)</h3>
              <ProposalSentConfirmation
                flightDetails={{
                  departureAirport: 'KJFK',
                  arrivalAirport: 'KLAX',
                  departureDate: '2026-05-10',
                }}
                client={{
                  name: 'Alex Turner',
                  email: 'alex@example.com',
                }}
                pdfUrl="https://example.com/proposal-no-price.pdf"
              />
            </div>

            {/* With edit margin callback */}
            <div data-testid="edge-with-margin">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                With Edit Margin + Generate Contract (round-trip)
              </h3>
              <ProposalSentConfirmation
                flightDetails={{
                  departureAirport: 'KBOS',
                  arrivalAirport: 'KDFW',
                  departureDate: '2026-06-15',
                  tripType: 'round_trip',
                  returnDate: '2026-06-18',
                }}
                client={{
                  name: 'Maria Garcia',
                  email: 'maria@startup.io',
                }}
                pdfUrl="https://example.com/proposal-margin.pdf"
                proposalId="prop-margin-001"
                pricing={{
                  total: 67500,
                  currency: 'USD',
                  outboundCost: 33000,
                  returnCost: 34500,
                }}
                onEditMargin={() => console.log('Edit margin clicked')}
                onGenerateContract={() => console.log('Generate contract clicked')}
              />
            </div>

            {/* No PDF URL */}
            <div data-testid="edge-no-pdf">
              <h3 className="text-sm font-medium text-gray-500 mb-2">No PDF URL</h3>
              <ProposalSentConfirmation
                flightDetails={{
                  departureAirport: 'KSFO',
                  arrivalAirport: 'KORD',
                  departureDate: '2026-07-01',
                }}
                client={{
                  name: 'David Kim',
                  email: 'david@techco.com',
                }}
                pdfUrl=""
                pricing={{
                  total: 38000,
                  currency: 'USD',
                }}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
