'use client';

import React, { useState } from 'react';
import { FlightSearchProgress, type SelectedFlight } from '@/components/avinode/flight-search-progress';
import { Button } from '@/components/ui/button';

// Sample selected flights data matching the design
const sampleFlights: SelectedFlight[] = [
  {
    id: 'flight-1',
    aircraftType: 'Gulfstream G650',
    aircraftCategory: 'Heavy jet',
    yearOfMake: 1992,
    operatorName: 'Prime Jet, LLC',
    operatorEmail: 'keqmrm@gwhyicn.com',
    price: 37036,
    currency: 'USD',
    passengerCapacity: 13,
    hasMedical: false,
    hasPackage: false,
    petsAllowed: true,
    smokingAllowed: true,
    hasWifi: true,
    rfqStatus: 'unanswered',
  },
  {
    id: 'flight-2',
    aircraftType: 'Bombardier Global 7500',
    aircraftCategory: 'Heavy jet',
    yearOfMake: 1992,
    operatorName: 'Prime Jet, LLC',
    operatorEmail: 'keqmrm@gwhyicn.com',
    price: 37036,
    currency: 'USD',
    passengerCapacity: 13,
    hasMedical: false,
    hasPackage: false,
    petsAllowed: true,
    smokingAllowed: true,
    hasWifi: true,
    rfqStatus: 'unanswered',
  },
  {
    id: 'flight-3',
    aircraftType: 'Dassault Falcon 8X',
    aircraftCategory: 'Heavy jet',
    yearOfMake: 1992,
    operatorName: 'Prime Jet, LLC',
    operatorEmail: 'keqmrm@gwhyicn.com',
    price: 37036,
    currency: 'USD',
    passengerCapacity: 13,
    hasMedical: false,
    hasPackage: false,
    petsAllowed: true,
    smokingAllowed: true,
    hasWifi: true,
    rfqStatus: 'unanswered',
  },
];

/**
 * Demo page to showcase the FlightSearchProgress component
 * across all 4 workflow states for UX review and screenshots.
 */
export default function FlightSearchProgressDemo() {
  const [currentStep, setCurrentStep] = useState(1);
  const [tripIdSubmitted, setTripIdSubmitted] = useState(false);
  const [isTripIdLoading, setIsTripIdLoading] = useState(false);
  const [tripIdError, setTripIdError] = useState<string | undefined>();
  const [tripId, setTripId] = useState<string | undefined>();
  const [showFlights, setShowFlights] = useState(false);

  const flightRequest = {
    departureAirport: {
      icao: 'KTEB',
      name: 'Teterboro Airport',
      city: 'Teterboro, NJ',
    },
    arrivalAirport: {
      icao: 'KPBI',
      name: 'Palm Beach International Airport',
      city: 'West Palm Beach, FL',
    },
    departureDate: '2025-12-25',
    passengers: 6,
    requestId: 'REQ-2025-001234',
    aircraftPreferences: 'Light Jet or Midsize Jet',
    specialRequirements: 'Pet-friendly, Catering required',
  };

  const deepLink = 'https://sandbox.avinode.com/marketplace/mvc/search#preSearch';

  const handleTripIdSubmit = async (submittedTripId: string): Promise<void> => {
    setIsTripIdLoading(true);
    setTripIdError(undefined);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (submittedTripId.toLowerCase().includes('error')) {
      setTripIdError('Invalid Trip ID. Please check and try again.');
      setIsTripIdLoading(false);
      return;
    }

    setTripId(submittedTripId);
    setTripIdSubmitted(true);
    setIsTripIdLoading(false);
    setCurrentStep(4);
  };

  const resetDemo = () => {
    setCurrentStep(1);
    setTripIdSubmitted(false);
    setIsTripIdLoading(false);
    setTripIdError(undefined);
    setTripId(undefined);
    setShowFlights(false);
  };

  const handleViewChat = (flightId: string) => {
    console.log('View chat for flight:', flightId);
    alert(`Opening chat for flight: ${flightId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Mock Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-4 z-10">
        <div className="space-y-4">
          <h2 className="font-bold text-lg">Jetvision</h2>
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="font-medium text-sm">Active Request</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">KTEB → KPBI</p>
              <p className="text-xs text-gray-500">Dec 25, 2025</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="font-medium text-sm text-gray-600">Previous Request</p>
              <p className="text-xs text-gray-500">KLAX → KJFK</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="font-medium text-sm text-gray-600">Previous Request</p>
              <p className="text-xs text-gray-500">KSFO → KORD</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              FlightSearchProgress Component Demo
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              4-Step Workflow: Request → Select Flight & RFQ → Retrieve Flight Details → Send Proposal
            </p>
          </div>

          {/* Step Controls */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4">Workflow Step Control</h2>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={currentStep === 1 ? 'default' : 'outline'}
                onClick={() => { resetDemo(); setCurrentStep(1); }}
              >
                Step 1: Request
              </Button>
              <Button
                variant={currentStep === 2 ? 'default' : 'outline'}
                onClick={() => { resetDemo(); setCurrentStep(2); }}
              >
                Step 2: Select Flight
              </Button>
              <Button
                variant={currentStep === 3 ? 'default' : 'outline'}
                onClick={() => { resetDemo(); setCurrentStep(3); }}
              >
                Step 3: Enter TripID
              </Button>
              <Button
                variant={currentStep === 4 && !showFlights ? 'default' : 'outline'}
                onClick={() => {
                  setTripId('trp987654321');
                  setTripIdSubmitted(true);
                  setShowFlights(false);
                  setCurrentStep(4);
                }}
              >
                Step 4: Processing
              </Button>
              <Button
                variant={showFlights ? 'default' : 'outline'}
                onClick={() => {
                  setTripId('trp987654321');
                  setTripIdSubmitted(true);
                  setShowFlights(true);
                  setCurrentStep(4);
                }}
              >
                Step 4: With Flights
              </Button>
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Current: Step {currentStep} | Trip ID Submitted: {tripIdSubmitted ? 'Yes' : 'No'} | Show Flights: {showFlights ? 'Yes' : 'No'}
            </p>
          </div>

          {/* Component Demo */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <FlightSearchProgress
              currentStep={currentStep}
              flightRequest={flightRequest}
              deepLink={currentStep >= 2 ? deepLink : undefined}
              tripId={tripId}
              isTripIdLoading={isTripIdLoading}
              tripIdError={tripIdError}
              tripIdSubmitted={tripIdSubmitted}
              selectedFlights={showFlights ? sampleFlights : []}
              onTripIdSubmit={handleTripIdSubmit}
              onDeepLinkClick={() => console.log('Deep link clicked')}
              onCopyDeepLink={() => console.log('Deep link copied')}
              onViewChat={handleViewChat}
            />
          </div>

          {/* Step Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border ${currentStep === 1 ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
              <h3 className="font-semibold">Step 1: Create Trip Request</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Automatic - Displays flight details (departure/arrival airports, date, passengers, aircraft preferences, special requirements)
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${currentStep === 2 ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
              <h3 className="font-semibold">Step 2: Select Flight & RFQ</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manual - Instructions for searching and selecting flights in Avinode marketplace with airport codes
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${currentStep === 3 ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
              <h3 className="font-semibold">Step 3: Retrieve Flight Details</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manual User Action - User enters Trip ID from Avinode after completing RFQ in marketplace
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${currentStep === 4 ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
              <h3 className="font-semibold">Step 4: Send Proposal</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Automatic - Displays selected flights with details sent to operators. Progress stepper hides when flights are shown.
              </p>
            </div>
          </div>

          {/* Error State Demo */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4">Error State Demo</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              To test the error state, go to Step 3 and enter &quot;error&quot; as the Trip ID
            </p>
            <Button
              variant="destructive"
              onClick={() => {
                resetDemo();
                setCurrentStep(3);
                setTripIdError('Invalid Trip ID. Please check and try again.');
              }}
            >
              Show Error State
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
