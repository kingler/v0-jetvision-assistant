/**
 * PDF Proposal Template
 *
 * React PDF template for generating charter flight proposals.
 * Used in Step 4 of the RFP workflow to create professional PDF documents.
 *
 * @see https://react-pdf.org/
 * @see docs/plans/2025-12-22-rfq-workflow-steps-3-4-design.md
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import path from 'path';
import type { RFQFlight } from '@/lib/mcp/clients/avinode-client';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Trip type for proposal categorization
 * - 'one_way': Single direction flight
 * - 'round_trip': Outbound + return flight
 */
export type TripType = 'one_way' | 'round_trip';

/**
 * Airport information structure
 */
export interface ProposalAirport {
  icao: string;
  name?: string;
  city?: string;
}

export interface ProposalData {
  proposalId: string;
  generatedAt: string;
  customer: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
  };
  tripDetails: {
    /**
     * Type of trip - one_way or round_trip
     * Default: 'one_way' for backward compatibility
     */
    tripType?: TripType;
    departureAirport: ProposalAirport;
    arrivalAirport: ProposalAirport;
    departureDate: string;
    departureTime?: string;
    /**
     * Return date for round-trip proposals (ISO format)
     * Only applicable when tripType is 'round_trip'
     */
    returnDate?: string;
    /**
     * Return departure time for round-trip proposals
     * Only applicable when tripType is 'round_trip'
     */
    returnTime?: string;
    /**
     * Return arrival airport for round-trip proposals
     * Defaults to original departure airport if not specified
     * Only applicable when tripType is 'round_trip'
     */
    returnAirport?: ProposalAirport;
    passengers: number;
    tripId?: string;
  };
  selectedFlights: RFQFlight[];
  pricing: {
    subtotal: number;
    jetvisionFee: number;
    taxes: number;
    total: number;
    currency: string;
    /**
     * Cost breakdown for outbound leg (round-trip only)
     */
    outboundCost?: number;
    /**
     * Cost breakdown for return leg (round-trip only)
     */
    returnCost?: number;
  };
  quoteValidUntil: string;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#0066cc',
  },
  logoContainer: {
    marginBottom: 4,
  },
  logo: {
    width: 140,
    height: 70,
    objectFit: 'contain',
  },
  logoTagline: {
    fontSize: 9,
    color: '#666666',
    marginTop: 4,
  },
  documentTitle: {
    textAlign: 'right',
  },
  titleText: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  proposalMeta: {
    fontSize: 9,
    color: '#666666',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0066cc',
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 120,
    fontFamily: 'Helvetica-Bold',
    color: '#4a4a4a',
  },
  value: {
    flex: 1,
    color: '#1a1a1a',
  },
  flightCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  flightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  routeText: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  priceText: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0066cc',
  },
  flightDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailItem: {
    width: '48%',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 8,
    color: '#666666',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 10,
    color: '#1a1a1a',
  },
  amenitiesRow: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  amenityBadge: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    fontSize: 8,
    color: '#2e7d32',
  },
  pricingTable: {
    marginTop: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 16,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  pricingTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#0066cc',
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0066cc',
  },
  termsSection: {
    backgroundColor: '#fff3cd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 20,
  },
  termsTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#856404',
    marginBottom: 6,
  },
  termsText: {
    fontSize: 9,
    color: '#856404',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 2,
  },
  ctaSection: {
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
    padding: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  ctaTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0066cc',
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 10,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  // Round-trip specific styles
  legHeader: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0066cc',
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  legBadge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    backgroundColor: '#0066cc',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    marginBottom: 4,
  },
  returnLegBadge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    backgroundColor: '#6c757d',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    marginBottom: 4,
  },
  sectionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginVertical: 16,
  },
  tripTypeBadge: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0066cc',
    backgroundColor: '#e3f2fd',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  pricingSubtotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingLeft: 12,
    color: '#666666',
    fontSize: 9,
  },
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatPrice(amount: number, currency: string): string {
  return `$${amount.toLocaleString('en-US')} ${currency}`;
}

function formatDate(dateString: string): string {
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateString;
  }
}

function getAmenityLabels(amenities: RFQFlight['amenities']): string[] {
  const labels: string[] = [];
  if (amenities.wifi) labels.push('WiFi');
  if (amenities.pets) labels.push('Pets Allowed');
  if (amenities.galley) labels.push('Full Galley');
  if (amenities.lavatory) labels.push('Lavatory');
  if (amenities.medical) labels.push('Medical Equipment');
  return labels;
}

/**
 * Formats airport display name with fallback order: name -> city -> icao -> ''
 * Prevents "undefined" from appearing in PDF when airport name/city are missing
 *
 * @param airport - Airport object with optional name, city, and required icao
 * @returns Display name for the airport, or empty string if all fields are missing
 */
function formatAirportName(airport: {
  name?: string;
  city?: string;
  icao: string;
}): string {
  return airport.name || airport.city || airport.icao || '';
}

// =============================================================================
// COMPONENTS
// =============================================================================

interface FlightCardProps {
  flight: RFQFlight;
  index: number;
  /** Optional leg label for round-trip proposals (e.g., "Outbound", "Return") */
  legLabel?: string;
}

function FlightCard({ flight, index, legLabel }: FlightCardProps) {
  const amenityLabels = getAmenityLabels(flight.amenities);
  const isReturn = legLabel === 'Return' || flight.legType === 'return';

  return (
    <View style={styles.flightCard}>
      {/* Leg badge for round-trip */}
      {legLabel && (
        <Text style={isReturn ? styles.returnLegBadge : styles.legBadge}>
          {legLabel}
        </Text>
      )}
      <View style={styles.flightHeader}>
        <View>
          <Text style={styles.routeText}>
            Option {index + 1}: {flight.departureAirport.icao} → {flight.arrivalAirport.icao}
          </Text>
          <Text style={{ fontSize: 9, color: '#666666', marginTop: 2 }}>
            {formatAirportName(flight.departureAirport)} →{' '}
            {formatAirportName(flight.arrivalAirport)}
          </Text>
        </View>
        <Text style={styles.priceText}>
          {formatPrice(flight.totalPrice, flight.currency)}
        </Text>
      </View>

      <View style={styles.flightDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Aircraft</Text>
          <Text style={styles.detailValue}>{flight.aircraftModel}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.detailValue}>{flight.aircraftType}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Tail Number</Text>
          <Text style={styles.detailValue}>{flight.tailNumber || 'On Assignment'}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Year</Text>
          <Text style={styles.detailValue}>{flight.yearOfManufacture || 'N/A'}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Capacity</Text>
          <Text style={styles.detailValue}>{flight.passengerCapacity} passengers</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Flight Duration</Text>
          <Text style={styles.detailValue}>{flight.flightDuration}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Operator</Text>
          <Text style={styles.detailValue}>{flight.operatorName}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Operator Rating</Text>
          <Text style={styles.detailValue}>
            {flight.operatorRating ? `${flight.operatorRating}/5.0` : 'N/A'}
          </Text>
        </View>
      </View>

      {amenityLabels.length > 0 && (
        <View style={styles.amenitiesRow}>
          {amenityLabels.map((label) => (
            <Text key={label} style={styles.amenityBadge}>
              {label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// =============================================================================
// SECTION COMPONENTS
// =============================================================================

/**
 * Trip Details Section - displays route, dates, and trip type
 * Handles both one-way and round-trip display formats
 */
function TripDetailsSection({ tripDetails }: { tripDetails: ProposalData['tripDetails'] }) {
  const isRoundTrip = tripDetails.tripType === 'round_trip';
  const returnAirport = tripDetails.returnAirport || tripDetails.departureAirport;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Trip Details</Text>

      {/* Trip Type Badge */}
      <Text style={styles.tripTypeBadge}>
        {isRoundTrip ? 'Round-Trip' : 'One-Way'}
      </Text>

      {/* Route Display */}
      <View style={styles.row}>
        <Text style={styles.label}>Route:</Text>
        <Text style={styles.value}>
          {tripDetails.departureAirport.icao} ({formatAirportName(tripDetails.departureAirport)})
          {' → '}
          {tripDetails.arrivalAirport.icao} ({formatAirportName(tripDetails.arrivalAirport)})
          {isRoundTrip && (
            <Text>
              {' → '}
              {returnAirport.icao} ({formatAirportName(returnAirport)})
            </Text>
          )}
        </Text>
      </View>

      {/* Outbound Date */}
      <View style={styles.row}>
        <Text style={styles.label}>
          {isRoundTrip ? 'Outbound:' : 'Departure Date:'}
        </Text>
        <Text style={styles.value}>
          {formatDate(tripDetails.departureDate)}
          {tripDetails.departureTime && ` at ${tripDetails.departureTime}`}
        </Text>
      </View>

      {/* Return Date (if round-trip) */}
      {isRoundTrip && tripDetails.returnDate && (
        <View style={styles.row}>
          <Text style={styles.label}>Return:</Text>
          <Text style={styles.value}>
            {formatDate(tripDetails.returnDate)}
            {tripDetails.returnTime && ` at ${tripDetails.returnTime}`}
          </Text>
        </View>
      )}

      {/* Passengers */}
      <View style={styles.row}>
        <Text style={styles.label}>Passengers:</Text>
        <Text style={styles.value}>{tripDetails.passengers}</Text>
      </View>

      {/* Reference ID */}
      {tripDetails.tripId && (
        <View style={styles.row}>
          <Text style={styles.label}>Reference ID:</Text>
          <Text style={styles.value}>{tripDetails.tripId}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Flight Options Section - displays flight cards grouped by leg type
 * For round-trip, shows outbound flights first, then return flights
 */
function FlightOptionsSection({
  selectedFlights,
  tripType,
}: {
  selectedFlights: RFQFlight[];
  tripType?: TripType;
}) {
  const isRoundTrip = tripType === 'round_trip';

  // Separate flights by leg type
  const outboundFlights = selectedFlights.filter(
    (f) => f.legType === 'outbound' || f.legSequence === 1 || (!f.legType && f.legSequence !== 2)
  );
  const returnFlights = selectedFlights.filter(
    (f) => f.legType === 'return' || f.legSequence === 2
  );

  return (
    <View style={styles.section}>
      {/* Outbound Flights */}
      <Text style={styles.sectionTitle}>
        {isRoundTrip ? 'Outbound Flight Options' : 'Selected Flight Options'}
      </Text>
      {outboundFlights.map((flight, index) => (
        <FlightCard
          key={flight.id}
          flight={flight}
          index={index}
          legLabel={isRoundTrip ? 'Outbound' : undefined}
        />
      ))}

      {/* Return Flights (if round-trip) */}
      {isRoundTrip && returnFlights.length > 0 && (
        <>
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionTitle}>Return Flight Options</Text>
          {returnFlights.map((flight, index) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              index={index}
              legLabel="Return"
            />
          ))}
        </>
      )}
    </View>
  );
}

/**
 * Pricing Section - displays pricing breakdown with optional per-leg costs
 * For round-trip, shows outbound and return costs separately
 */
function PricingSection({
  pricing,
  tripType,
}: {
  pricing: ProposalData['pricing'];
  tripType?: TripType;
}) {
  const isRoundTrip = tripType === 'round_trip';
  const showLegBreakdown = isRoundTrip && pricing.outboundCost !== undefined && pricing.returnCost !== undefined;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pricing Summary</Text>
      <View style={styles.pricingTable}>
        {/* Per-leg breakdown for round-trip */}
        {showLegBreakdown && (
          <>
            <View style={styles.pricingRow}>
              <Text>Charter Cost</Text>
              <Text>{formatPrice(pricing.subtotal, pricing.currency)}</Text>
            </View>
            <View style={styles.pricingSubtotal}>
              <Text>Outbound Leg</Text>
              <Text>{formatPrice(pricing.outboundCost!, pricing.currency)}</Text>
            </View>
            <View style={styles.pricingSubtotal}>
              <Text>Return Leg</Text>
              <Text>{formatPrice(pricing.returnCost!, pricing.currency)}</Text>
            </View>
          </>
        )}

        {/* Standard breakdown for one-way */}
        {!showLegBreakdown && (
          <View style={styles.pricingRow}>
            <Text>Charter Cost</Text>
            <Text>{formatPrice(pricing.subtotal, pricing.currency)}</Text>
          </View>
        )}

        <View style={styles.pricingRow}>
          <Text>Jetvision Service Fee</Text>
          <Text>{formatPrice(pricing.jetvisionFee, pricing.currency)}</Text>
        </View>
        <View style={styles.pricingRow}>
          <Text>Taxes & Fees</Text>
          <Text>{formatPrice(pricing.taxes, pricing.currency)}</Text>
        </View>
        <View style={styles.pricingTotal}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {formatPrice(pricing.total, pricing.currency)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// =============================================================================
// MAIN DOCUMENT COMPONENT
// =============================================================================

export function ProposalDocument({ data }: { data: ProposalData }) {
  // Construct absolute path to logo image for React PDF
  // React PDF requires absolute file paths when running on the server
  const logoPath = path.join(process.cwd(), 'public', 'images', 'jetvision-logo.png');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              src={logoPath}
              style={styles.logo}
            />
            <Text style={styles.logoTagline}>Private Aviation Solutions</Text>
          </View>
          <View style={styles.documentTitle}>
            <Text style={styles.titleText}>Charter Flight Proposal</Text>
            <Text style={styles.proposalMeta}>
              Proposal #{data.proposalId}
            </Text>
            <Text style={styles.proposalMeta}>
              Generated: {formatDateTime(data.generatedAt)}
            </Text>
          </View>
        </View>

        {/* Customer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{data.customer.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{data.customer.email}</Text>
          </View>
          {data.customer.company && (
            <View style={styles.row}>
              <Text style={styles.label}>Company:</Text>
              <Text style={styles.value}>{data.customer.company}</Text>
            </View>
          )}
          {data.customer.phone && (
            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{data.customer.phone}</Text>
            </View>
          )}
        </View>

        {/* Trip Details Section */}
        <TripDetailsSection tripDetails={data.tripDetails} />

        {/* Flight Options Section */}
        <FlightOptionsSection
          selectedFlights={data.selectedFlights}
          tripType={data.tripDetails.tripType}
        />

        {/* Pricing Summary */}
        <PricingSection
          pricing={data.pricing}
          tripType={data.tripDetails.tripType}
        />

        {/* Terms & Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Important Information</Text>
          <Text style={styles.termsText}>
            • This quote is valid until {formatDate(data.quoteValidUntil)}{'\n'}
            • A 50% deposit is required to confirm booking{'\n'}
            • Remaining balance due 48 hours before departure{'\n'}
            • Cancellation within 72 hours may incur charges{'\n'}
            • All times are local to departure/arrival airports
          </Text>
        </View>

        {/* Call to Action */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to Book?</Text>
          <Text style={styles.ctaText}>
            Reply to this email or contact your Jetvision representative
          </Text>
          <Text style={styles.ctaText}>
            Phone: +1 (888) 555-JETS | Email: bookings@jetvision.com
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Jetvision Group | Private Aviation Solutions
          </Text>
          <Text style={styles.footerText}>
            This proposal is confidential and intended only for the named recipient.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export default ProposalDocument;
