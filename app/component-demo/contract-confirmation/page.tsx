'use client';

import React, { useState } from 'react';
import { ContractSentConfirmation } from '@/components/contract/contract-sent-confirmation';
import { Button } from '@/components/ui/button';

/**
 * Demo page for ONEK-207 Rich Contract Card + ONEK-146 Round-Trip support.
 * Public route - no auth required.
 */

export default function ContractConfirmationDemo() {
  const [activeView, setActiveView] = useState<'all' | 'one-way' | 'round-trip' | 'multi-city' | 'statuses'>('all');
  const [paymentMarked, setPaymentMarked] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold" data-testid="demo-title">
            ONEK-207: Contract Sent Confirmation Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Rich Contract Card variations: One-Way, Round-Trip, Multi-City, status badges
          </p>
        </div>

        {/* View Controls */}
        <div className="flex flex-wrap gap-2 justify-center" data-testid="view-controls">
          <Button variant={activeView === 'all' ? 'default' : 'outline'} onClick={() => setActiveView('all')} data-testid="btn-show-all">Show All</Button>
          <Button variant={activeView === 'one-way' ? 'default' : 'outline'} onClick={() => setActiveView('one-way')} data-testid="btn-one-way">One-Way</Button>
          <Button variant={activeView === 'round-trip' ? 'default' : 'outline'} onClick={() => setActiveView('round-trip')} data-testid="btn-round-trip">Round-Trip</Button>
          <Button variant={activeView === 'multi-city' ? 'default' : 'outline'} onClick={() => setActiveView('multi-city')} data-testid="btn-multi-city">Multi-City</Button>
          <Button variant={activeView === 'statuses' ? 'default' : 'outline'} onClick={() => setActiveView('statuses')} data-testid="btn-statuses">Status Badges</Button>
        </div>

        {/* ONE-WAY CONTRACT */}
        {(activeView === 'all' || activeView === 'one-way') && (
          <section data-testid="section-one-way">
            <h2 className="text-xl font-semibold mb-4">One-Way Contract (Sent)</h2>
            <ContractSentConfirmation
              contractId="contract-001"
              contractNumber="CONTRACT-2026-001"
              customerName="John Smith"
              customerEmail="john@example.com"
              flightRoute="KTEB → KMIA"
              departureDate="2026-03-15"
              totalAmount={45000}
              currency="USD"
              pdfUrl="https://example.com/contract-001.pdf"
              status="sent"
              onMarkPayment={() => setPaymentMarked(true)}
            />
          </section>
        )}

        {/* ROUND-TRIP CONTRACT (ONEK-146) */}
        {(activeView === 'all' || activeView === 'round-trip') && (
          <section data-testid="section-round-trip">
            <h2 className="text-xl font-semibold mb-4">Round-Trip Contract (Sent)</h2>
            <ContractSentConfirmation
              contractId="contract-002"
              contractNumber="CONTRACT-2026-002"
              customerName="Sarah Johnson"
              customerEmail="sarah@acme.com"
              flightRoute="KTEB → KVNY"
              departureDate="2026-04-05"
              totalAmount={92500}
              currency="USD"
              pdfUrl="https://example.com/contract-002.pdf"
              status="sent"
              tripType="round_trip"
              returnDate="2026-04-08"
              onMarkPayment={() => setPaymentMarked(true)}
            />
          </section>
        )}

        {/* MULTI-CITY CONTRACT */}
        {(activeView === 'all' || activeView === 'multi-city') && (
          <section data-testid="section-multi-city">
            <h2 className="text-xl font-semibold mb-4">Multi-City Contract (Signed)</h2>
            <ContractSentConfirmation
              contractId="contract-003"
              contractNumber="CONTRACT-2026-003"
              customerName="Michael Chen"
              customerEmail="michael@globalcorp.com"
              flightRoute="KTEB → EGLL → LFPB → KTEB"
              departureDate="2026-03-20"
              totalAmount={185000}
              currency="USD"
              pdfUrl="https://example.com/contract-003.pdf"
              status="signed"
              tripType="multi_city"
              segments={[
                { departureAirport: 'KTEB', arrivalAirport: 'EGLL', departureDate: '2026-03-20' },
                { departureAirport: 'EGLL', arrivalAirport: 'LFPB', departureDate: '2026-03-23' },
                { departureAirport: 'LFPB', arrivalAirport: 'KTEB', departureDate: '2026-03-26' },
              ]}
              onMarkPayment={() => setPaymentMarked(true)}
            />
          </section>
        )}

        {/* STATUS VARIATIONS */}
        {(activeView === 'all' || activeView === 'statuses') && (
          <section data-testid="section-statuses">
            <h2 className="text-xl font-semibold mb-4">Status Badge Variations</h2>
            <div className="space-y-4">
              {/* Draft - no PDF, no Mark Payment */}
              <div data-testid="status-draft">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Draft (no PDF, no actions)</h3>
                <ContractSentConfirmation
                  contractId="contract-draft"
                  contractNumber="CONTRACT-2026-DRAFT"
                  customerName="Draft Customer"
                  customerEmail="draft@example.com"
                  flightRoute="KJFK → KLAX"
                  departureDate="2026-05-01"
                  totalAmount={55000}
                  currency="USD"
                  status="draft"
                />
              </div>

              {/* Payment Pending */}
              <div data-testid="status-payment-pending">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Awaiting Payment</h3>
                <ContractSentConfirmation
                  contractId="contract-pending"
                  contractNumber="CONTRACT-2026-PEND"
                  customerName="Pending Client"
                  customerEmail="pending@example.com"
                  flightRoute="KSFO → KORD"
                  departureDate="2026-06-10"
                  totalAmount={67500}
                  currency="USD"
                  pdfUrl="https://example.com/contract-pending.pdf"
                  status="payment_pending"
                  onMarkPayment={() => setPaymentMarked(true)}
                />
              </div>

              {/* Paid */}
              <div data-testid="status-paid">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Paid (no Mark Payment button)</h3>
                <ContractSentConfirmation
                  contractId="contract-paid"
                  contractNumber="CONTRACT-2026-PAID"
                  customerName="Paid Client"
                  customerEmail="paid@example.com"
                  flightRoute="KBOS → KDFW"
                  departureDate="2026-07-20"
                  totalAmount={43200}
                  currency="USD"
                  pdfUrl="https://example.com/contract-paid.pdf"
                  status="paid"
                />
              </div>

              {/* Completed */}
              <div data-testid="status-completed">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Completed</h3>
                <ContractSentConfirmation
                  contractId="contract-complete"
                  contractNumber="CONTRACT-2026-COMP"
                  customerName="Complete Client"
                  customerEmail="complete@example.com"
                  flightRoute="KLAS → KDEN"
                  departureDate="2026-08-15"
                  totalAmount={31000}
                  currency="EUR"
                  pdfUrl="https://example.com/contract-complete.pdf"
                  status="completed"
                />
              </div>
            </div>
          </section>
        )}

        {/* Payment notification */}
        {paymentMarked && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg" data-testid="payment-toast">
            Payment marked! (demo only)
            <Button variant="ghost" size="sm" className="ml-2 text-white" onClick={() => setPaymentMarked(false)}>Dismiss</Button>
          </div>
        )}
      </div>
    </div>
  );
}
