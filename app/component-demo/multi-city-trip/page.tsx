'use client';

import React, { useState } from 'react';
import { TripSummaryCard, type TripSegmentUI } from '@/components/avinode/trip-summary-card';
import { AvinodeDeepLinks } from '@/components/avinode/avinode-deep-links';
import { Button } from '@/components/ui/button';

/**
 * Demo page for ONEK-144 Multi-City Trip & Round-Trip UI components.
 * Used for E2E testing and visual verification.
 * Public route - no auth required.
 */

// ── Multi-City 3-leg trip data ──────────────────────────────────
const multiCitySegments: TripSegmentUI[] = [
  {
    departureAirport: { icao: 'KTEB', name: 'Teterboro Airport', city: 'Teterboro, NJ' },
    arrivalAirport: { icao: 'EGLL', name: 'Heathrow Airport', city: 'London' },
    departureDate: '2026-03-20',
    passengers: 5,
  },
  {
    departureAirport: { icao: 'EGLL', name: 'Heathrow Airport', city: 'London' },
    arrivalAirport: { icao: 'LFPB', name: 'Paris Le Bourget Airport', city: 'Paris' },
    departureDate: '2026-03-23',
    passengers: 5,
  },
  {
    departureAirport: { icao: 'LFPB', name: 'Paris Le Bourget Airport', city: 'Paris' },
    arrivalAirport: { icao: 'KTEB', name: 'Teterboro Airport', city: 'Teterboro, NJ' },
    departureDate: '2026-03-26',
    passengers: 5,
  },
];

// ── Multi-City 4-leg trip data ──────────────────────────────────
const fourLegSegments: TripSegmentUI[] = [
  {
    departureAirport: { icao: 'KTEB', name: 'Teterboro Airport', city: 'Teterboro, NJ' },
    arrivalAirport: { icao: 'EGLL', name: 'Heathrow Airport', city: 'London' },
    departureDate: '2026-04-01',
    passengers: 4,
  },
  {
    departureAirport: { icao: 'EGLL', name: 'Heathrow Airport', city: 'London' },
    arrivalAirport: { icao: 'LSZH', name: 'Zurich Airport', city: 'Zurich' },
    departureDate: '2026-04-04',
    passengers: 4,
  },
  {
    departureAirport: { icao: 'LSZH', name: 'Zurich Airport', city: 'Zurich' },
    arrivalAirport: { icao: 'LFPG', name: 'Charles de Gaulle Airport', city: 'Paris' },
    departureDate: '2026-04-07',
    passengers: 4,
  },
  {
    departureAirport: { icao: 'LFPG', name: 'Charles de Gaulle Airport', city: 'Paris' },
    arrivalAirport: { icao: 'KTEB', name: 'Teterboro Airport', city: 'Teterboro, NJ' },
    departureDate: '2026-04-10',
    passengers: 4,
  },
];

export default function MultiCityTripDemo() {
  const [activeView, setActiveView] = useState<'all' | 'multi-city' | 'round-trip' | 'one-way'>('all');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold" data-testid="demo-title">
            ONEK-144: Multi-City Trip Card Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Visual verification of trip cards for One-Way, Round-Trip, and Multi-City trips
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
        </div>

        {/* ── ONE-WAY TRIP ─────────────────────────────────── */}
        {(activeView === 'all' || activeView === 'one-way') && (
          <section data-testid="section-one-way">
            <h2 className="text-xl font-semibold mb-4">One-Way Trip</h2>
            <TripSummaryCard
              tripId="trp-oneway-001"
              departureAirport={{ icao: 'KTEB', name: 'Teterboro Airport', city: 'Teterboro, NJ' }}
              arrivalAirport={{ icao: 'KMIA', name: 'Miami International Airport', city: 'Miami, FL' }}
              departureDate="2026-03-15"
              passengers={3}
              status="active"
              tripType="single_leg"
              onCopyTripId={() => navigator.clipboard.writeText('trp-oneway-001')}
            />
          </section>
        )}

        {/* ── ROUND-TRIP ───────────────────────────────────── */}
        {(activeView === 'all' || activeView === 'round-trip') && (
          <section data-testid="section-round-trip">
            <h2 className="text-xl font-semibold mb-4">Round-Trip</h2>
            <TripSummaryCard
              tripId="trp-roundtrip-002"
              departureAirport={{ icao: 'KTEB', name: 'Teterboro Airport', city: 'Teterboro, NJ' }}
              arrivalAirport={{ icao: 'KVNY', name: 'Van Nuys Airport', city: 'Van Nuys, CA' }}
              departureDate="2026-04-05"
              passengers={6}
              status="active"
              tripType="round_trip"
              returnDate="2026-04-08"
              onCopyTripId={() => navigator.clipboard.writeText('trp-roundtrip-002')}
            />
          </section>
        )}

        {/* ── MULTI-CITY 3-LEG ─────────────────────────────── */}
        {(activeView === 'all' || activeView === 'multi-city') && (
          <section data-testid="section-multi-city-3leg">
            <h2 className="text-xl font-semibold mb-4">Multi-City (3 Legs)</h2>
            <TripSummaryCard
              tripId="trp-multicity-003"
              departureAirport={multiCitySegments[0].departureAirport}
              arrivalAirport={multiCitySegments[multiCitySegments.length - 1].arrivalAirport}
              departureDate={multiCitySegments[0].departureDate}
              passengers={5}
              status="active"
              tripType="multi_city"
              segments={multiCitySegments}
              onCopyTripId={() => navigator.clipboard.writeText('trp-multicity-003')}
            />
          </section>
        )}

        {/* ── MULTI-CITY 4-LEG ─────────────────────────────── */}
        {(activeView === 'all' || activeView === 'multi-city') && (
          <section data-testid="section-multi-city-4leg">
            <h2 className="text-xl font-semibold mb-4">Multi-City (4 Legs)</h2>
            <TripSummaryCard
              tripId="trp-multicity-004"
              departureAirport={fourLegSegments[0].departureAirport}
              arrivalAirport={fourLegSegments[fourLegSegments.length - 1].arrivalAirport}
              departureDate={fourLegSegments[0].departureDate}
              passengers={4}
              status="active"
              tripType="multi_city"
              segments={fourLegSegments}
              onCopyTripId={() => navigator.clipboard.writeText('trp-multicity-004')}
            />
          </section>
        )}

        {/* ── WITH DEEP LINKS ──────────────────────────────── */}
        {(activeView === 'all' || activeView === 'multi-city') && (
          <section data-testid="section-with-deep-links">
            <h2 className="text-xl font-semibold mb-4">Multi-City + Avinode Deep Links</h2>
            <div className="space-y-3">
              <TripSummaryCard
                tripId="trp-multicity-005"
                departureAirport={multiCitySegments[0].departureAirport}
                arrivalAirport={multiCitySegments[multiCitySegments.length - 1].arrivalAirport}
                departureDate={multiCitySegments[0].departureDate}
                passengers={5}
                status="active"
                tripType="multi_city"
                segments={multiCitySegments}
                onCopyTripId={() => navigator.clipboard.writeText('trp-multicity-005')}
              />
              <AvinodeDeepLinks
                links={{
                  searchInAvinode: {
                    href: 'https://sandbox.avinode.com/marketplace/mvc/search#preSearch',
                    description: 'Search and send RFQs to operators',
                  },
                  viewInAvinode: {
                    href: 'https://sandbox.avinode.com/marketplace/mvc/search#preSearch',
                    description: 'View trip details in Avinode',
                  },
                  cancel: {
                    href: '#cancel',
                    description: 'Cancel this trip',
                  },
                }}
                onLinkClick={(linkType) => console.log('Deep link clicked:', linkType)}
              />
            </div>
          </section>
        )}

        {/* ── EDGE CASES ──────────────────────────────────── */}
        {activeView === 'all' && (
          <section data-testid="section-edge-cases">
            <h2 className="text-xl font-semibold mb-4">Edge Cases</h2>

            {/* Multi-city with missing city name */}
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Airport without city name</h3>
              <TripSummaryCard
                tripId="trp-edge-001"
                departureAirport={{ icao: 'KTEB', name: 'Teterboro Airport', city: '' }}
                arrivalAirport={{ icao: 'EGGW', name: 'Luton Airport', city: '' }}
                departureDate="2026-05-01"
                passengers={2}
                status="pending"
                tripType="single_leg"
                onCopyTripId={() => {}}
              />
            </div>

            {/* Cancelled trip */}
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Cancelled multi-city trip</h3>
              <TripSummaryCard
                tripId="trp-edge-002"
                departureAirport={multiCitySegments[0].departureAirport}
                arrivalAirport={multiCitySegments[multiCitySegments.length - 1].arrivalAirport}
                departureDate={multiCitySegments[0].departureDate}
                passengers={5}
                status="cancelled"
                tripType="multi_city"
                segments={multiCitySegments}
                onCopyTripId={() => {}}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
