/**
 * Contract PDF Template
 *
 * React PDF template for generating charter flight service agreements.
 * Matches the Jetvision contract format with 14 pages:
 * - Page 1: Quote summary (client, aircraft, amenities, itinerary, pricing)
 * - Pages 2-12: Terms and conditions (12 sections)
 * - Page 13: Payment instructions (wire transfer, check)
 * - Page 14: Credit card authorization form
 *
 * @see https://react-pdf.org/
 * @see docs/plans/2026-01-28-book-flight-contract-generation.md
 */

/* eslint-disable jsx-a11y/alt-text -- react-pdf Image component doesn't support alt prop */

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
import type { ContractData, ContractAmenities, ContractItineraryLeg } from '@/lib/types/contract';

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Page styles
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
    lineHeight: 1.4,
  },
  pageWithFooter: {
    paddingBottom: 80,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 50,
    objectFit: 'contain',
  },
  headerRight: {
    textAlign: 'right',
    fontSize: 8,
    color: '#666666',
  },

  // Cover page styles
  coverTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  coverSection: {
    marginBottom: 16,
  },
  preparedFor: {
    fontSize: 10,
    marginBottom: 2,
  },
  clientName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  quoteInfo: {
    fontSize: 10,
    marginBottom: 2,
  },
  quoteNumber: {
    fontFamily: 'Helvetica-Bold',
  },

  // Aircraft info
  aircraftRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  aircraftLabel: {
    width: 80,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  aircraftValue: {
    flex: 1,
    fontSize: 9,
  },

  // Amenities
  amenitiesLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    marginBottom: 4,
  },
  amenitiesText: {
    fontSize: 9,
    color: '#333333',
  },

  // Itinerary table
  tableContainer: {
    marginBottom: 16,
  },
  tableTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  localTimesNote: {
    fontSize: 8,
    color: '#666666',
    fontStyle: 'italic',
  },
  table: {
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingVertical: 4,
  },
  tableCell: {
    fontSize: 8,
    paddingHorizontal: 4,
  },
  tableCellHeader: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 4,
  },
  colDate: { width: '12%' },
  colEtd: { width: '8%' },
  colDepart: { width: '30%' },
  colPax: { width: '8%' },
  colEte: { width: '8%' },
  colNm: { width: '8%' },

  // Quote/Pricing table
  quoteTable: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#cccccc',
    width: '60%',
  },
  quoteRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingVertical: 4,
  },
  quoteRowTotal: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 6,
  },
  quoteItem: {
    flex: 1,
    fontSize: 9,
    paddingHorizontal: 8,
  },
  quoteRate: {
    width: '30%',
    fontSize: 9,
    paddingHorizontal: 8,
  },
  quoteAmount: {
    width: '25%',
    fontSize: 9,
    paddingHorizontal: 8,
    textAlign: 'right',
  },
  quoteTotalLabel: {
    flex: 1,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 8,
  },
  quoteTotalAmount: {
    width: '25%',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 8,
    textAlign: 'right',
  },

  // Signature line on cover
  signatureLine: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 4,
    width: '50%',
  },
  signatureLabel: {
    fontSize: 8,
    color: '#666666',
  },
  signatureDate: {
    fontSize: 8,
    color: '#666666',
    marginTop: 8,
  },

  // Terms and conditions styles
  termsTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionNumber: {
    fontFamily: 'Helvetica-Bold',
  },
  paragraph: {
    fontSize: 9,
    marginBottom: 8,
    textAlign: 'justify',
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 16,
  },
  bullet: {
    width: 12,
    fontSize: 9,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
  },
  subSection: {
    marginBottom: 8,
  },
  subSectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },

  // Checkbox styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: '#000000',
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 9,
  },

  // Signature page styles
  witnessSection: {
    marginTop: 30,
    marginBottom: 30,
  },
  witnessText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 20,
  },
  signatureBlock: {
    marginBottom: 30,
  },
  signatureBlockTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 16,
  },
  signatureRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  signatureField: {
    flex: 1,
  },
  signatureFieldLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    marginBottom: 4,
    height: 20,
  },
  signatureFieldLabel: {
    fontSize: 8,
    color: '#666666',
  },

  // Credit Card Authorization styles
  ccAuthTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  ccAuthIntro: {
    fontSize: 9,
    marginBottom: 16,
  },
  ccAuthStatement: {
    fontSize: 9,
    marginBottom: 24,
  },
  ccFormRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  ccFormField: {
    flex: 1,
    marginRight: 16,
  },
  ccFormFieldHalf: {
    width: '48%',
    marginRight: 16,
  },
  ccFormFieldLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    marginBottom: 4,
    height: 16,
  },
  ccFormFieldLabel: {
    fontSize: 8,
    color: '#666666',
  },
  ccNote: {
    fontSize: 9,
    fontStyle: 'italic',
    marginTop: 16,
    marginBottom: 24,
  },
  ccDisclaimer: {
    fontSize: 8,
    color: '#666666',
    marginTop: 24,
  },

  // Payment Instructions styles
  paymentInstructionsTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'uppercase' as const,
  },
  paymentSectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    marginTop: 16,
    textTransform: 'uppercase' as const,
    color: '#333333',
  },
  paymentInfoRow: {
    flexDirection: 'row' as const,
    marginBottom: 8,
  },
  paymentInfoLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    width: 140,
    color: '#555555',
  },
  paymentInfoValue: {
    fontSize: 9,
    flex: 1,
    color: '#000000',
  },
  paymentDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    marginTop: 16,
    marginBottom: 16,
  },
  paymentNote: {
    fontSize: 8,
    color: '#666666',
    marginTop: 12,
    fontStyle: 'italic' as const,
  },

  // Footer styles
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#666666',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    paddingTop: 8,
  },
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDate(dateString: string): string {
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
      });
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    });
  } catch {
    return dateString;
  }
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatAmenities(amenities: ContractAmenities): string {
  const items: string[] = [];
  if (amenities.pets) items.push('Pets allowed');
  if (amenities.wifi) items.push('In-on air conditioning');
  if (amenities.lavatory) items.push('Enclosed lavatory');
  if (amenities.galley) items.push('Ice bin');
  if (amenities.leatherSeats) items.push('Leather seats');
  if (amenities.airConditioning) items.push('Lavatory');
  return items.join(', ') || 'Standard amenities';
}

// =============================================================================
// COVER PAGE COMPONENT
// =============================================================================

function CoverPage({ data }: { data: ContractData }) {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'jetvision-logo.png');

  // Build itinerary leg from flight details
  const itineraryLeg: ContractItineraryLeg = {
    date: data.flightDetails.departureDate,
    etd: data.flightDetails.departureTime || '21:00',
    eta: '21:54', // Would be calculated from duration
    departAirport: data.flightDetails.departureAirport,
    arriveAirport: data.flightDetails.arrivalAirport,
    pax: data.flightDetails.passengers,
    ete: data.flightDetails.flightDuration || '0:54',
    nm: data.flightDetails.distanceNm || 147,
  };

  return (
    <Page size="LETTER" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Image src={logoPath} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text>Dan Kramer</Text>
          <Text>P: 8183078957</Text>
          <Text>dan@jetvisiongroup.com</Text>
          <Text> </Text>
          <Text>15303 Ventura Blvd. Suite 250</Text>
          <Text>Sherman Oaks, CA 91403, United States</Text>
        </View>
      </View>

      {/* Prepared For */}
      <View style={styles.coverSection}>
        <Text style={styles.preparedFor}>Prepared for</Text>
        <Text style={styles.clientName}>{data.customer.name}</Text>
      </View>

      {/* Quote Info */}
      <View style={styles.coverSection}>
        <Text style={styles.quoteInfo}>
          <Text style={styles.quoteNumber}>Quote {data.contractNumber}</Text>
        </Text>
        <Text style={styles.quoteInfo}>
          <Text style={styles.quoteNumber}>DATE:</Text> {formatDate(data.generatedAt)}
        </Text>
      </View>

      {/* Aircraft Info */}
      <View style={styles.coverSection}>
        <View style={styles.aircraftRow}>
          <Text style={styles.aircraftLabel}>AIRCRAFT:</Text>
          <Text style={styles.aircraftValue}>{data.flightDetails.aircraftModel || data.flightDetails.aircraftType}</Text>
        </View>
        <View style={styles.aircraftRow}>
          <Text style={styles.aircraftLabel}>AMENITIES:</Text>
          <Text style={styles.aircraftValue}>{formatAmenities(data.amenities)}</Text>
        </View>
      </View>

      {/* Itinerary Table */}
      <View style={styles.tableContainer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={styles.tableTitle}>Itinerary</Text>
          <Text style={styles.localTimesNote}>(local times)</Text>
        </View>
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, styles.colDate]}>DATE</Text>
            <Text style={[styles.tableCellHeader, styles.colEtd]}>ETD / ETA</Text>
            <Text style={[styles.tableCellHeader, styles.colDepart]}>DEPART / ARRIVE</Text>
            <Text style={[styles.tableCellHeader, styles.colPax]}>PAX</Text>
            <Text style={[styles.tableCellHeader, styles.colEte]}>ETE</Text>
            <Text style={[styles.tableCellHeader, styles.colNm]}>NM</Text>
          </View>
          {/* Data Row */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colDate]}>{formatDate(itineraryLeg.date)}</Text>
            <View style={styles.colEtd}>
              <Text style={styles.tableCell}>{itineraryLeg.etd}</Text>
              <Text style={styles.tableCell}>{itineraryLeg.eta}</Text>
            </View>
            <View style={styles.colDepart}>
              <Text style={styles.tableCell}>
                {itineraryLeg.departAirport.city || itineraryLeg.departAirport.name}, {itineraryLeg.departAirport.icao}
              </Text>
              <Text style={styles.tableCell}>
                {itineraryLeg.arriveAirport.city || itineraryLeg.arriveAirport.name}, {itineraryLeg.arriveAirport.icao}
              </Text>
            </View>
            <Text style={[styles.tableCell, styles.colPax]}>{itineraryLeg.pax}</Text>
            <Text style={[styles.tableCell, styles.colEte]}>{itineraryLeg.ete}</Text>
            <Text style={[styles.tableCell, styles.colNm]}>{itineraryLeg.nm}</Text>
          </View>
        </View>
      </View>

      {/* Quote/Pricing Table */}
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>Quote</Text>
        <View style={styles.quoteTable}>
          {/* Header */}
          <View style={[styles.quoteRow, { backgroundColor: '#f5f5f5' }]}>
            <Text style={[styles.quoteItem, { fontFamily: 'Helvetica-Bold' }]}>ITEM</Text>
            <Text style={[styles.quoteRate, { fontFamily: 'Helvetica-Bold' }]}>RATE</Text>
            <Text style={[styles.quoteAmount, { fontFamily: 'Helvetica-Bold' }]}>AMOUNT</Text>
          </View>
          {/* Flight Cost */}
          <View style={styles.quoteRow}>
            <Text style={styles.quoteItem}>Flight Cost</Text>
            <Text style={styles.quoteRate}>1 @ {formatCurrency(data.pricing.flightCost)}/trip</Text>
            <Text style={styles.quoteAmount}>{formatCurrency(data.pricing.flightCost)}</Text>
          </View>
          {/* Federal Excise Tax */}
          {data.pricing.federalExciseTax > 0 && (
            <View style={styles.quoteRow}>
              <Text style={styles.quoteItem}>US Federal Excise Tax</Text>
              <Text style={styles.quoteRate}>{formatCurrency(data.pricing.flightCost)} @ 7.50%</Text>
              <Text style={styles.quoteAmount}>{formatCurrency(data.pricing.federalExciseTax)}</Text>
            </View>
          )}
          {/* Domestic Segment Fee */}
          {data.pricing.domesticSegmentFee > 0 && (
            <View style={styles.quoteRow}>
              <Text style={styles.quoteItem}>US Domestic Segment Fee</Text>
              <Text style={styles.quoteRate}>{data.flightDetails.passengers} @ $5.20/pax leg</Text>
              <Text style={styles.quoteAmount}>{formatCurrency(data.pricing.domesticSegmentFee)}</Text>
            </View>
          )}
          {/* Total */}
          <View style={styles.quoteRowTotal}>
            <Text style={styles.quoteTotalLabel}>Total:</Text>
            <Text style={styles.quoteRate}></Text>
            <Text style={styles.quoteTotalAmount}>{formatCurrency(data.pricing.totalAmount)}</Text>
          </View>
        </View>
      </View>

      {/* Signature Line */}
      <View style={styles.signatureLine}>
        <Text style={styles.signatureLabel}>Signature</Text>
        <Text style={styles.signatureDate}>Date</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Reference #{data.contractNumber}</Text>
        <Text>Jetvision LLC</Text>
        <Text>Page 1 of 14</Text>
      </View>
    </Page>
  );
}

// =============================================================================
// TERMS AND CONDITIONS PAGES
// =============================================================================

function TermsPage1({ data }: { data: ContractData }) {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'jetvision-logo.png');

  return (
    <Page size="LETTER" style={[styles.page, styles.pageWithFooter]}>
      {/* Header */}
      <View style={[styles.header, { justifyContent: 'flex-end' }]}>
        <Image src={logoPath} style={[styles.logo, { width: 80, height: 35 }]} />
      </View>

      <Text style={styles.termsTitle}>TERMS AND CONDITIONS</Text>

      <Text style={styles.paragraph}>
        JETVISION LLC AIR CHARTER SERVICES AGREEMENT
      </Text>

      <Text style={styles.paragraph}>
        This Air Charter Services Agreement ("Agreement") is entered into as of [_____________] (the
        "Effective Date") by and between Jetvision LLC, a Delaware limited liability company with its principal
        place of business at 15303 Ventura Blvd, Sherman Oaks, California 91403 ("Jetvision" or "Broker"), and
        _______________ ("Client").
      </Text>

      <Text style={styles.paragraph}>
        Jetvision and Client are collectively referred to as the "Parties" and individually as a "Party."
      </Text>

      <Text style={styles.paragraph}>
        WHEREAS, Jetvision is a private aviation brokerage firm that arranges private air charter services by
        facilitating agreements with third-party air carriers licensed to operate aircraft under applicable aviation
        regulations;
      </Text>

      <Text style={styles.paragraph}>
        WHEREAS, Client engages Jetvision to arrange private air charter services on Client's behalf, subject to
        the terms and conditions herein, which are designed to protect Jetvision's interests;
      </Text>

      <Text style={styles.paragraph}>
        NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, the
        Parties agree as follows:
      </Text>

      {/* Payment Method Checkboxes */}
      <View style={{ marginTop: 16, marginBottom: 16 }}>
        <View style={styles.checkboxContainer}>
          <View style={styles.checkbox} />
          <Text style={styles.checkboxLabel}>Pay by Wire</Text>
        </View>
        <View style={styles.checkboxContainer}>
          <View style={styles.checkbox} />
          <Text style={styles.checkboxLabel}>Credit Card</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>1. SERVICES AND UNDERSTANDING</Text>

      <Text style={styles.paragraph}>
        1.1 Brokerage Services. Jetvision shall act exclusively as a broker to arrange private air charter services
        ("Charter Services") for Client by facilitating agreements with third-party air carriers ("Operators") that
        licensed to operate aircraft under applicable regulations, including but not limited to 14 CFR Part 91 of
        the Federal Aviation Administration ("FAA") or equivalent international authorities. Jetvision's services
        are limited to the arrangement of Charter Services, and upon booking and, where applicable, payment
        confirmation, Jetvision acts as Client's agent solely for arranging Charter Services and has no other
        authority.
      </Text>

      <Text style={styles.paragraph}>
        1.2 No Operational Control. Jetvision is not an air carrier, does not own, operate, maintain, or control
        aircraft, and has no operational control over Charter Services. All Charter Services are performed by
        Operators, who are solely responsible for aircraft operation, safety, maintenance, crew management,
        and compliance with all applicable laws, regulations, and safety standards, including but not limited to
        FAA, Transportation Security Administration ("TSA"), U.S. Customs and Border Protection ("CBP"), and
        international aviation regulations. Jetvision shall not be liable for any aspect of the Charter Services,
        including performance, safety, or compliance.
      </Text>

      <Text style={styles.paragraph}>
        1.3 Booking Confirmation. For each Charter Service, Jetvision shall issue a booking confirmation
        specifying the flight itinerary, aircraft type, total cost, payment terms, passenger requirements,
        cancellation policies, and other relevant details. The booking confirmation, together with this
        Agreement, constitutes the entire agreement between Jetvision and Client for the Charter Services.
        Client's acceptance of the booking confirmation, whether by signature, payment, or performance, binds
        Client to all terms herein and therein. Jetvision reserves the right to modify booking confirmation terms
        at its sole discretion, with notice to Client, and Client's continued engagement constitutes acceptance of
        such modifications.
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Reference #{data.contractNumber}</Text>
        <Text>Jetvision LLC</Text>
        <Text>Page 2 of 14</Text>
      </View>
    </Page>
  );
}

function TermsPage2({ data }: { data: ContractData }) {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'jetvision-logo.png');

  return (
    <Page size="LETTER" style={[styles.page, styles.pageWithFooter]}>
      <View style={[styles.header, { justifyContent: 'flex-end' }]}>
        <Image src={logoPath} style={[styles.logo, { width: 80, height: 35 }]} />
      </View>

      <Text style={styles.paragraph}>
        1.4 Operator Selection. Jetvision shall select Operators at its sole discretion based on their licensing,
        safety ratings, and suitability. Client acknowledges that Jetvision relies on Operators' representations
        regarding compliance with applicable laws and regulations and has no obligation to independently verify
        such compliance. Jetvision is not liable for Operator actions, omissions, or non-compliance.
      </Text>

      <Text style={styles.paragraph}>
        1.5 No Operator Agreement Disclosure. Client acknowledges that Jetvision's agreements with Operators
        are confidential and not disclosed to Client. Client shall interact solely with Jetvision regarding Charter
        Services and shall not contact Operators directly unless expressly authorized by Jetvision in writing. Any
        unauthorized contact shall constitute a material breach of this Agreement, entitling Jetvision to cancel
        the Charter Services and impose a 100% cancellation fee.
      </Text>

      <Text style={styles.sectionTitle}>2. CLIENT OBLIGATIONS</Text>

      <Text style={styles.paragraph}>
        2.1 Accurate and Timely Information. Client shall provide Jetvision with complete, accurate, and timely
        information, including but not limited to:
      </Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(a)</Text>
        <Text style={styles.bulletText}>Full passenger manifests, including names, dates of birth, nationalities, and contact details;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(b)</Text>
        <Text style={styles.bulletText}>Passport copies with valid visas for all Passengers, including necessary entry/exit permits;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(c)</Text>
        <Text style={styles.bulletText}>Documentation for pets, including health certificates, vaccinations, and travel approvals from relevant authorities (e.g., UK DEFRA for pet travel to/from the UK);</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(d)</Text>
        <Text style={styles.bulletText}>Baggage details, including dimensions, weight, and contents (e.g., sports equipment, hazardous materials), with prior notification of excess or oversized items;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(e)</Text>
        <Text style={styles.bulletText}>Special requests (e.g., catering, ground transportation, VIP handling).</Text>
      </View>

      <Text style={styles.paragraph}>
        Such information must be submitted to Jetvision via email to [insert email] no later than 24 hours after
        signing the booking confirmation, or 3 hours if the scheduled departure is within 72 hours. Failure to
        provide complete, accurate, or timely information, or providing improper documentation, shall entitle
        Jetvision to cancel the Charter Services without liability, and Client shall remain liable for a 100%
        cancellation fee plus any non-refunded third-party costs, fines, or penalties incurred by Jetvision or the
        Operator.
      </Text>

      <Text style={styles.paragraph}>
        2.2 Compliance with Laws and Requirements. Client and all passengers ("Passengers") shall strictly
        comply with all applicable laws, regulations, and Operator requirements, including but not limited to:
      </Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(a)</Text>
        <Text style={styles.bulletText}>FAA, TSA, CBP, and international aviation regulations;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(b)</Text>
        <Text style={styles.bulletText}>Immigration, customs, and health regulations of all departure, transit, and destination countries;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(c)</Text>
        <Text style={styles.bulletText}>Prohibitions on hazardous materials as defined in 49 CFR Parts 171-180 and IATA Dangerous Goods Regulations.</Text>
      </View>

      <Text style={styles.paragraph}>Client is solely responsible for:</Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(a)</Text>
        <Text style={styles.bulletText}>Obtaining and presenting all necessary travel documents, visas, permits, health certifications (e.g., vaccination records), and pet approvals;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(b)</Text>
        <Text style={styles.bulletText}>Ensuring Passengers arrive at least one (1) hour prior to the scheduled departure time and comply with all check-in, boarding, and security procedures;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(c)</Text>
        <Text style={styles.bulletText}>Ensuring compliance with slot, parking, and permit requirements at regulated airports (e.g., London Luton EGEW).</Text>
      </View>

      <Text style={styles.paragraph}>
        Non-compliance shall entitle Jetvision to cancel the Charter Services without liability, and Client shall
        remain liable for a 100% cancellation fee plus any fines, penalties, repatriation costs, or other expenses
        incurred by Jetvision or the Operator.
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Reference #{data.contractNumber}</Text>
        <Text>Jetvision LLC</Text>
        <Text>Page 3 of 14</Text>
      </View>
    </Page>
  );
}

function TermsPage3({ data }: { data: ContractData }) {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'jetvision-logo.png');

  return (
    <Page size="LETTER" style={[styles.page, styles.pageWithFooter]}>
      <View style={[styles.header, { justifyContent: 'flex-end' }]}>
        <Image src={logoPath} style={[styles.logo, { width: 80, height: 35 }]} />
      </View>

      <Text style={styles.paragraph}>
        2.3 Payment Obligations. Client shall pay Jetvision all amounts specified in the booking confirmation, in
        cleared funds by the due date, which shall be no later than one (1) business day prior to the flight date.
        If the due date is not a business day, payment shall be received on the preceding business day.
        Payments shall be made in U.S. dollars to the bank account specified by Jetvision, with all transfer fees
        borne by Client, without setoff or deduction.
      </Text>

      <Text style={styles.paragraph}>
        2.4 Credit Card Payments. Credit card payments shall incur a 5% processing fee. If a credit card institute
        or bank refuses to honor payment, Jetvision shall charge Client a processing fee of USD 750, in addition
        to any charges imposed by the credit card institute or bank.
      </Text>

      <Text style={styles.paragraph}>
        2.5 Late Payments: Late payments shall accrue interest at a rate of 1.5% per month (18% per annum, pro
        rata) from the due date until received. If payment is not received within five (5) business days after a
        written reminder, Jetvision may cancel the Charter Services without liability, and Client shall remain
        liable for a 100% cancellation fee plus all collection costs, including reasonable attorneys' fees and court
        costs.
      </Text>

      <Text style={styles.paragraph}>
        2.6 Passenger Conduct. Client and Passengers shall comply with all instructions of the Operator's crew
        and third-party service providers. Jetvision or the Operator may deny boarding or remove any Passenger
        for conduct deemed unsafe, unlawful, disruptive, or in violation of this Agreement, including but not
        limited to:
      </Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(a)</Text>
        <Text style={styles.bulletText}>Intoxication or substance abuse;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(b)</Text>
        <Text style={styles.bulletText}>Harassment, threats, or violence against crew, Passengers, or third parties;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(c)</Text>
        <Text style={styles.bulletText}>Refusal to comply with safety, security, or health protocols (e.g., temperature checks, mask mandates);</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(d)</Text>
        <Text style={styles.bulletText}>Violation of applicable laws or regulations.</Text>
      </View>

      <Text style={styles.paragraph}>
        Client shall be liable for a 100% cancellation fee and any damages, costs, or expenses (e.g., cleaning,
        repairs, legal fees) resulting from such conduct.
      </Text>

      <Text style={styles.paragraph}>
        2.7 Due Diligence. Jetvision may conduct due diligence on Client and Passengers to ensure compliance
        with applicable laws, including but not limited to sanctions, anti-money laundering, anti-corruption, and
        no-fly list regulations. Client shall provide any additional information or documentation requested by
        Jetvision within 24 hours. Failure to comply shall entitle Jetvision to cancel the Charter Services without
        liability, and Client shall remain liable for a 100% cancellation fee.
      </Text>

      <Text style={styles.paragraph}>2.8 Health, Safety, and Baggage Requirements:</Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(a)</Text>
        <Text style={styles.bulletText}>Health Restrictions: Client shall ensure Passengers are medically fit to travel and comply with health regulations (e.g., vaccination requirements, quarantine rules). Expectant mothers beyond 35 weeks of pregnancy or within 4 weeks of delivery shall not travel without a medical certificate, and Jetvision may deny boarding at its discretion. Newborns under 7 days old are not recommended to travel.</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(b)</Text>
        <Text style={styles.bulletText}>Pet Travel: Pets may be transported only if Jetvision and the Operator are notified at booking and approve in writing. Client shall provide all required pet documentation (e.g., health certificates, import permits) and comply with destination country requirements (e.g., UK DEFRA-approved routes). Non-compliance shall result in denied boarding and a 100% cancellation fee.</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(c)</Text>
        <Text style={styles.bulletText}>Baggage Restrictions: Passenger baggage is limited by weight and size as determined by the Operator, based on aircraft type and EASA/FAA standards. Excess or oversized baggage must be declared at booking, including dimensions and weight. Jetvision or the Operator may refuse baggage deemed unsafe, excessive, or non-compliant with 49 CFR Parts 171-180 or IATA Dangerous Goods Regulations, including but not limited to:</Text>
      </View>

      <View style={[styles.bulletPoint, { paddingLeft: 32 }]}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>Explosives, flammable gases, or liquids (e.g., fireworks, propane, gasoline);</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Reference #{data.contractNumber}</Text>
        <Text>Jetvision LLC</Text>
        <Text>Page 4 of 14</Text>
      </View>
    </Page>
  );
}

function TermsPage4({ data }: { data: ContractData }) {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'jetvision-logo.png');

  return (
    <Page size="LETTER" style={[styles.page, styles.pageWithFooter]}>
      <View style={[styles.header, { justifyContent: 'flex-end' }]}>
        <Image src={logoPath} style={[styles.logo, { width: 80, height: 35 }]} />
      </View>

      <View style={[styles.bulletPoint, { paddingLeft: 32 }]}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>Toxic or infectious substances (e.g., poisons, infected blood);</Text>
      </View>
      <View style={[styles.bulletPoint, { paddingLeft: 32 }]}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>Lithium-ion batteries exceeding 160 watt-hours or defective devices;</Text>
      </View>
      <View style={[styles.bulletPoint, { paddingLeft: 32 }]}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>Weapons, including firearms, knives, or blunt instruments, unless pre-approved and secured per TSA regulations.</Text>
      </View>

      <Text style={styles.paragraph}>
        Client shall be liable for any costs (e.g., fines, disposal) resulting from non-compliant baggage. Hand
        baggage is limited to liquids in 1-liter transparent containers with a 1-liter transparent, re-sealable bag. per EU
        Regulation 1546/2006 or equivalent.
      </Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(d)</Text>
        <Text style={styles.bulletText}>Pilot-in-Command Authority: The Operator's Pilot-in-Command has full authority over all flight decisions for health, safety, or regulatory reasons, including Passenger behavior, health conditions, or baggage issues. Client and Passengers shall comply with all pilot instructions, and non-compliance shall result in a 100% cancellation fee and liability for all resulting costs.</Text>
      </View>

      <Text style={styles.sectionTitle}>3. PAYMENT TERMS</Text>

      <Text style={styles.paragraph}>
        3.1 Total Cost. Client shall pay Jetvision the total cost for the Charter Services and any additional costs
        (e.g., special catering, ground transportation, de-icing, pet approval, VIP handling) that may be billed
        post-flight unless pre-determined, as specified in the booking confirmation. All costs are exclusive of
        taxes, which Client shall pay in full.
      </Text>

      <Text style={styles.paragraph}>3.2 Included and Excluded Costs:</Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(a)</Text>
        <Text style={styles.bulletText}>Included Costs: The total cost includes aircraft rental, standard crew, fuel, standard navigation and landing fees, and applicable taxes and surcharges, as determined by the Operator.</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(b)</Text>
        <Text style={styles.bulletText}>Excluded Costs: The following are not included and shall be charged separately post-flight:</Text>
      </View>

      <View style={[styles.bulletPoint, { paddingLeft: 32 }]}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>SATCOM or in-flight WiFi (billed separately if requested only);</Text>
      </View>
      <View style={[styles.bulletPoint, { paddingLeft: 32 }]}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>Special catering requests (e.g., gourmet, premium wines, custom menus);</Text>
      </View>
      <View style={[styles.bulletPoint, { paddingLeft: 32 }]}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>VIP terminal access, special handling, helicopter, or limousine services;</Text>
      </View>
      <View style={[styles.bulletPoint, { paddingLeft: 32 }]}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>Cabotage or special permit fees;</Text>
      </View>
      <View style={[styles.bulletPoint, { paddingLeft: 32 }]}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>Additional crew or specialty cabin crew (e.g., interpreters, medical staff);</Text>
      </View>
      <View style={[styles.bulletPoint, { paddingLeft: 32 }]}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>Concierge services requested by Client;</Text>
      </View>
      <View style={[styles.bulletPoint, { paddingLeft: 32 }]}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>Costs arising from Client or Passenger non-compliance (e.g., fines, repatriation).</Text>
      </View>

      <Text style={styles.paragraph}>
        Jetvision shall invoice Client for excluded costs, which shall be paid within seven (7) days of receipt.
      </Text>

      <Text style={styles.paragraph}>
        3.3 Payment Due Date. All payments are due upon booking, or as specified in the booking confirmation.
        If the due date is not a business day, payment shall be received on the preceding business day.
      </Text>

      <Text style={styles.paragraph}>3.4 Credit Card Payments. As specified in Section 2.5.</Text>

      <Text style={styles.paragraph}>3.5 Late Payments. As specified in Section 2.6.</Text>

      <Text style={styles.paragraph}>
        3.6 Payment Allocation and Offset. Jetvision may, at its sole discretion, allocate any payment received
        from Client to offset or settle any sums owed by Client to Jetvision under this Agreement or any other
        contract, including outstanding debts, interest, or penalties. Client shall remain liable for the full amount
        due under this Agreement and shall pay any additional sums required to cover the allocated amount
        within seven (7) days of Jetvision's demand.
      </Text>

      <Text style={styles.sectionTitle}>4. CANCELLATION AND REFUNDS</Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Reference #{data.contractNumber}</Text>
        <Text>Jetvision LLC</Text>
        <Text>Page 5 of 14</Text>
      </View>
    </Page>
  );
}

function TermsPage5({ data }: { data: ContractData }) {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'jetvision-logo.png');

  return (
    <Page size="LETTER" style={[styles.page, styles.pageWithFooter]}>
      <View style={[styles.header, { justifyContent: 'flex-end' }]}>
        <Image src={logoPath} style={[styles.logo, { width: 80, height: 35 }]} />
      </View>

      <Text style={styles.paragraph}>
        4.1 Client Cancellation. Client may cancel a booking by providing written notice to Jetvision. Cancellation
        fees, based on the total cost specified in the booking confirmation, shall apply as follows:
      </Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>More than 168 hours (7 days) prior to departure: 10% of the total cost.</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>168 to 72 hours prior: 50% of the total cost.</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>72 to 24 hours prior: 75% of the total cost.</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>Less than 24 hours prior (including no-show): 100% of the total cost.</Text>
      </View>

      <Text style={styles.paragraph}>
        Charter Services designated as "One-Way" or "Empty Leg Flights" are subject to a 100% cancellation fee
        from the time of booking. Client shall also reimburse Jetvision for all non-refunded third-party costs
        (e.g., handling, catering), expenses, and penalties.
      </Text>

      <Text style={styles.paragraph}>
        4.2 Operator Cancellation. If an Operator cancels a Charter Service, Jetvision shall use commercially
        reasonable efforts to arrange alternative Charter Services or obtain a refund of amounts paid by Client,
        and any non-refunded third-party costs. Client shall not be liable for any losses, damages, or
        expenses arising from Operator cancellation.
      </Text>

      <Text style={styles.paragraph}>
        4.3 No Refunds for Client Non-Compliance. No refunds shall be issued if Charter Services are cancelled
        due to Client's or Passengers' failure to comply with this Agreement, including but not limited to
        providing inaccurate information, failing to meet regulatory requirements, or engaging in prohibited
        conduct.
      </Text>

      <Text style={styles.paragraph}>
        4.4 Jetvision's Right to Cancel. Jetvision may cancel Charter Services at its sole discretion, without
        liability, if:
      </Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(a)</Text>
        <Text style={styles.bulletText}>Client fails to make payment by the due date;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(b)</Text>
        <Text style={styles.bulletText}>Client or Passengers fail to provide required information or documentation within specified timelines;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(c)</Text>
        <Text style={styles.bulletText}>Client or Passengers violate applicable laws, regulations, or this Agreement;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(d)</Text>
        <Text style={styles.bulletText}>Due diligence reveals issues preventing the performance of the Charter Services (e.g., sanctions, no-fly status);</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(e)</Text>
        <Text style={styles.bulletText}>Operational, safety, or regulatory issues arise, as determined by Jetvision or the Operator, including but not limited to slot unavailability, permit denials, or Force Majeure Events.</Text>
      </View>

      <Text style={styles.paragraph}>
        In such cases, Client shall remain liable for a 100% cancellation fee plus any non-refunded third-party
        costs.
      </Text>

      <Text style={styles.sectionTitle}>5. AIRCRAFT SUBSTITUTION AND FLIGHT CHANGES</Text>

      <Text style={styles.paragraph}>
        5.1 Aircraft Substitution. If the Operator cannot provide the specified aircraft due to mechanical,
        operational, or other reasons, Jetvision may arrange alternative transportation with a comparable or
        superior aircraft at its sole discretion. If substitute aircraft incurs additional costs, Jetvision shall
        provide a revised booking confirmation. Client may terminate the booking within three (3) hours of
        receiving the revised confirmation by written notice to Jetvision, subject to a 100% cancellation fee for
        completed flight segments and applicable fees for remaining segments. For multi-leg
        Charter Services, termination shall apply only to future legs, and Jetvision shall brokerage a pro rata portion
        of the total cost for yet unmanned legs.
        If Client does not terminate within three (3) hours, Client is deemed to accept the substitute aircraft and
        associated costs.
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Reference #{data.contractNumber}</Text>
        <Text>Jetvision LLC</Text>
        <Text>Page 6 of 14</Text>
      </View>
    </Page>
  );
}

function TermsPage6({ data }: { data: ContractData }) {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'jetvision-logo.png');

  return (
    <Page size="LETTER" style={[styles.page, styles.pageWithFooter]}>
      <View style={[styles.header, { justifyContent: 'flex-end' }]}>
        <Image src={logoPath} style={[styles.logo, { width: 80, height: 35 }]} />
      </View>

      <Text style={styles.paragraph}>
        5.2 Flight Changes. Flight times, routes, airports, or aircraft are subject to change due to
        operational, regulatory, safety, or other factors, including but not limited to slot restrictions, weather,
        air traffic control, permit denials, or Operator decisions. Jetvision shall notify Client of changes but is not
        liable for any losses, damages, or expenses arising therefrom. Client's sole remedy is to cancel the
        booking, subject to applicable cancellation fees per Section 4.1.
      </Text>

      <Text style={styles.sectionTitle}>6. FORCE MAJEURE</Text>

      <Text style={styles.paragraph}>
        6.1 No Liability for Force Majeure. Jetvision shall not be liable for any failure, delay, or non-performance
        of its obligations under this Agreement due to events beyond its reasonable control ("Force Majeure
        Events"), including but not limited to:
      </Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(a)</Text>
        <Text style={styles.bulletText}>Acts of God (e.g., hurricanes, earthquakes, floods, volcanic eruptions);</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(b)</Text>
        <Text style={styles.bulletText}>War, terrorism, hijacking, sabotage, or civil unrest;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(c)</Text>
        <Text style={styles.bulletText}>Strikes, lockouts, or labor disputes;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(d)</Text>
        <Text style={styles.bulletText}>Government actions, including travel bans, sanctions, or regulatory restrictions;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(e)</Text>
        <Text style={styles.bulletText}>Pandemics, epidemics, or quarantines;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(f)</Text>
        <Text style={styles.bulletText}>Adverse weather conditions;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(g)</Text>
        <Text style={styles.bulletText}>Operator actions or omissions, including cancellations, mechanical issues, or crew unavailability;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(h)</Text>
        <Text style={styles.bulletText}>Airport or air traffic control restrictions including slot or parking denials;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(i)</Text>
        <Text style={styles.bulletText}>Any fines, penalties, or damages resulting from Client's or Passengers' non-compliance or from actions of third-party service providers.</Text>
      </View>

      <Text style={styles.paragraph}>
        This indemnity applies regardless of whether the claim is caused by negligence, except to the extent
        caused by Jetvision's willful misconduct.
      </Text>

      <Text style={styles.paragraph}>
        6.2 Cancellation Due to Force Majeure. If a Force Majeure Event prevents the performance of Charter
        Services, Jetvision may cancel the booking without liability, and Client shall be liable for any Jetvision's
        brokerage fee and any non-refunded third-party costs. Any remaining amounts paid by Client shall be
        refunded, less such fees and costs, within thirty (30) days of cancellation.
      </Text>

      <Text style={styles.sectionTitle}>7. LIMITATION OF LIABILITY</Text>

      <Text style={styles.paragraph}>
        7.1 Complete Disclaimer of Liability for Charter Services. Jetvision, as a broker, has no operational
        control over Charter Services and is not responsible for their performance, safety, quality, compliance,
        or any associated risks. To the fullest extent permitted by law, Jetvision, its officers, directors,
        employees, agents, affiliates, and subcontractors (collectively, "Jetvision Parties") shall not be liable for
        any direct, indirect, incidental, special, consequential, punitive, or exemplary damages, losses, injuries,
        deaths, delays, or expenses resulting from Client's or any third-party's use of the Charter Services,
        regardless of cause. Jetvision shall not be liable, except as expressly set forth in this Agreement, for:
      </Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(a)</Text>
        <Text style={styles.bulletText}>The Charter Services, including but not limited to flight delays, cancellations, diversions, accidents, mechanical failures, luggage loss, personal injury, property damage, or death;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(b)</Text>
        <Text style={styles.bulletText}>The actions, omissions, negligence, or non-compliance of Operators, their crew, or any third-party service providers (e.g., catering, ground transportation, VIP handling);</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(c)</Text>
        <Text style={styles.bulletText}>Client's or Passengers' non-compliance with immigration, customs, aviation, or other regulations;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(d)</Text>
        <Text style={styles.bulletText}>Any other cause, whether foreseeable or unforeseeable, regardless of the legal theory (e.g., contract, tort, strict liability, or otherwise). Even if advised of the possibility of such damages. This exclusion applies regardless of the cause or circumstances, including but not limited to Operator actions, Force Majeure Events, or Client/Passenger conduct.</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Reference #{data.contractNumber}</Text>
        <Text>Jetvision LLC</Text>
        <Text>Page 7 of 14</Text>
      </View>
    </Page>
  );
}

function TermsPage7({ data }: { data: ContractData }) {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'jetvision-logo.png');

  return (
    <Page size="LETTER" style={[styles.page, styles.pageWithFooter]}>
      <View style={[styles.header, { justifyContent: 'flex-end' }]}>
        <Image src={logoPath} style={[styles.logo, { width: 80, height: 35 }]} />
      </View>

      <Text style={styles.paragraph}>
        This disclaimer applies even if Jetvision has been advised of the possibility of such Losses and regardless
        of whether such Losses are caused by Jetvision's negligence, except to the extent caused by Jetvision's
        willful misconduct.
      </Text>

      <Text style={styles.paragraph}>
        7.2 Exclusion of Consequential Damages. IN NO EVENT SHALL JETVISION PARTIES BE LIABLE FOR ANY
        INDIRECT, SPECIAL, INCIDENTAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING
        BUT NOT LIMITED TO LOSS OF PROFITS, LOSS OF REVENUE, LOSS OF USE, LOSS OF OPPORTUNITY, LOSS
        OF GOODWILL, OR COSTS OF ALTERNATIVE TRAVEL, ACCOMMODATIONS, OR BUSINESS INTERRUPTION,
        WHETHER ARISING IN CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE, EVEN IF ADVISED OF THE
        POSSIBILITY OF SUCH DAMAGES. THIS EXCLUSION APPLIES REGARDLESS OF THE CAUSE OR
        CIRCUMSTANCES, INCLUDING BUT NOT LIMITED TO OPERATOR ACTIONS, FORCE MAJEURE EVENTS, OR
        CLIENT/PASSENGER CONDUCT.
      </Text>

      <Text style={styles.paragraph}>
        7.3 Absolute Cap on Liability. To the fullest extent permitted by law, Jetvision's total aggregate liability
        under or in connection with this Agreement, whether in contract, tort, strict liability, negligence,
        statutory liability, or otherwise, shall not exceed the brokerage fee actually paid by Client to Jetvision for
        the specific Charter Service giving rise to the claim, regardless of the number, nature, or severity of
        claims. This cap is absolute and applies to all claims, whether brought by Client, Passengers, or third
        parties, and includes all damages, costs, and expenses (e.g., legal fees, penalties).
      </Text>

      <Text style={styles.paragraph}>
        7.4 No Liability for Third-Party Services. Jetvision may arrange ancillary services (e.g., catering, ground
        transportation, VIP handling) at Client's request. Jetvision Parties shall not be liable for any Losses
        arising from the performance, non-performance, quality, safety, or compliance of such services, which
        are provided by third parties under separate terms. Client assumes all risks associated with third-party
        services.
      </Text>

      <Text style={styles.paragraph}>
        7.5 No Duty to Mitigate or Provide Alternatives. Jetvision has no obligation to mitigate any Losses
        incurred by Client or Passengers, including but not limited to arranging alternative transportation,
        refunding Operator charges, or providing accommodations, beyond the efforts specified in Sections 4.2
        and 5.1. Jetvision shall not be liable for any costs or expenses incurred by Client in securing alternative
        arrangements.
      </Text>

      <Text style={styles.paragraph}>
        7.6 Waiver of Warranties. JETVISION EXPRESSLY DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED,
        STATUTORY OR OTHERWISE, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
        FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COMPLIANCE WITH LAWS OR
        REGULATIONS, WITH RESPECT TO THE CHARTER SERVICES, AIRCRAFT, OPERATORS, OR THIRD-PARTY
        SERVICES. ALL CHARTER SERVICES ARE ARRANGED "AS IS," AND CLIENT ASSUMES ALL RISKS ASSOCIATED
        WITH THEIR USE.
      </Text>

      <Text style={styles.paragraph}>7.7 Client Acknowledgment of Risk Allocation. Client acknowledges and agrees that:</Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(a)</Text>
        <Text style={styles.bulletText}>Jetvision's role is limited to arranging Charter Services as a broker, and all operational risks are borne by the Operator and Client;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(b)</Text>
        <Text style={styles.bulletText}>The limitations and exclusions in this Section 7 are a fundamental part of the bargain between the Parties and reflect a fair allocation of risk, given Jetvision's limited role and fees;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(c)</Text>
        <Text style={styles.bulletText}>Client has had the opportunity to review this Agreement with legal counsel and accepts these terms knowingly and voluntarily;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(d)</Text>
        <Text style={styles.bulletText}>Client shall maintain adequate insurance (e.g., travel, liability) to cover any Losses not covered by Jetvision or the Operator.</Text>
      </View>

      <Text style={styles.paragraph}>
        7.8 No Liability for Statutory Claims. To the extent permitted by law, Jetvision Parties shall not be liable
        for any claims arising under statutory provisions, including but not limited to the California Consumer
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Reference #{data.contractNumber}</Text>
        <Text>Jetvision LLC</Text>
        <Text>Page 8 of 14</Text>
      </View>
    </Page>
  );
}

function TermsPage8({ data }: { data: ContractData }) {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'jetvision-logo.png');

  return (
    <Page size="LETTER" style={[styles.page, styles.pageWithFooter]}>
      <View style={[styles.header, { justifyContent: 'flex-end' }]}>
        <Image src={logoPath} style={[styles.logo, { width: 80, height: 35 }]} />
      </View>

      <Text style={styles.paragraph}>
        Protection Act, the Federal Aviation Act, or any consumer protection laws, unless such liability cannot be
        waived by contract, and Jetvision may assign any rights to assert such claims against Jetvision to the
        maximum extent permitted by law.
      </Text>

      <Text style={styles.paragraph}>
        7.9 Survival and Enforceability. The limitations and exclusions in this Section 7 shall survive the
        termination or expiration of this Agreement and any Charter Services. If any provision is found to be
        unenforceable, the remaining provisions shall remain in full force and effect, and the
        unenforceable part shall be reformed by the minimum extent necessary to achieve Jetvision's intended
        protection.
      </Text>

      <Text style={styles.sectionTitle}>8. INDEMNIFICATION</Text>

      <Text style={styles.paragraph}>
        8.1 Client Indemnity. Client shall indemnify, defend, and hold harmless Jetvision, its officers, directors,
        employees, agents, affiliates, and subcontractors (each an "Indemnitee") from and against any and all
        claims, demands, suits, judgments, losses, fines, liabilities, and expenses
        (including reasonable attorneys' fees and court costs) arising from or related to:
      </Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(a)</Text>
        <Text style={styles.bulletText}>Client's or Passengers' breach of this Agreement;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(b)</Text>
        <Text style={styles.bulletText}>Client or Passengers' failure to comply with applicable laws, regulations, or Operator requirements;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(c)</Text>
        <Text style={styles.bulletText}>Any damage or loss caused by Client or Passengers to the aircraft, Operator property, or third-party property;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(d)</Text>
        <Text style={styles.bulletText}>Any inaccurate, incomplete, or untimely information provided by Client to Jetvision;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(e)</Text>
        <Text style={styles.bulletText}>Any fines, penalties, or costs (e.g., repatriation, legal fees, detention resulting from Client's or Passengers' actions, omissions, or use of Charter Services;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(f)</Text>
        <Text style={styles.bulletText}>Any claims by Passengers, third parties, or governmental authorities arising from or related to Client's or Passengers' non-compliance with immigration, customs, aviation, or other regulations.</Text>
      </View>

      <Text style={styles.paragraph}>
        This indemnity applies regardless of whether the claim is caused by negligence, except to the extent
        caused by Jetvision's willful misconduct.
      </Text>

      <Text style={styles.paragraph}>
        8.2 Survival. The indemnification obligations under this Section 8 shall survive the termination or
        expiration of this Agreement.
      </Text>

      <Text style={styles.sectionTitle}>9. REGULATORY COMPLIANCE</Text>

      <Text style={styles.paragraph}>9.1 Client Representations. Client represents and warrants that:</Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(a)</Text>
        <Text style={styles.bulletText}>It has full authority to enter into this Agreement and bind itself and its Passengers to its terms;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(b)</Text>
        <Text style={styles.bulletText}>All funds paid to Jetvision are derived from lawful sources and do not violate anti-money laundering, anti-corruption, or sanctions laws, including but not limited to the U.S. Foreign Corrupt Practices Act, the UK Bribery Act 2010, and U.S. Office of Foreign Assets Control ("OFAC") regulations;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(c)</Text>
        <Text style={styles.bulletText}>Neither Client nor any Passenger is a Designated Party (i.e., listed on OFAC, UN, or EU sanctions lists as a Specially Designated National, terrorist, proliferator of weapons of mass destruction, narcotics trafficker, or similar designation) or subject to any economic or trade sanctions, travel bans, or no-fly lists;</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Reference #{data.contractNumber}</Text>
        <Text>Jetvision LLC</Text>
        <Text>Page 9 of 14</Text>
      </View>
    </Page>
  );
}

function TermsPage9({ data }: { data: ContractData }) {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'jetvision-logo.png');

  return (
    <Page size="LETTER" style={[styles.page, styles.pageWithFooter]}>
      <View style={[styles.header, { justifyContent: 'flex-end' }]}>
        <Image src={logoPath} style={[styles.logo, { width: 80, height: 35 }]} />
      </View>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(f)</Text>
        <Text style={styles.bulletText}>No Passenger has been convicted of a criminal offense related to human rights violations, terrorism, fraud, theft, bribery, corruption, money laundering, or terrorist financing;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(g)</Text>
        <Text style={styles.bulletText}>Client and Passengers shall not engage in prohibited conduct, including but not limited to:</Text>
      </View>

      <View style={[styles.bulletPoint, { paddingLeft: 32 }]}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>Offering Charter Services for remuneration or commercial use (e.g., photography, filming) without Jetvision's prior written consent;</Text>
      </View>
      <View style={[styles.bulletPoint, { paddingLeft: 32 }]}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>Violating insurance requirements or applicable laws;</Text>
      </View>
      <View style={[styles.bulletPoint, { paddingLeft: 32 }]}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>Engaging in harassment, discrimination, or violence against Jetvision, Operator, or third-party personnel;</Text>
      </View>
      <View style={[styles.bulletPoint, { paddingLeft: 32 }]}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>Attempting to place mortgages, liens, or encumbrances on the aircraft.</Text>
      </View>

      <Text style={styles.paragraph}>
        Any violation shall entitle Jetvision to terminate this Agreement and impose a 100% cancellation fee,
        with Client liable for all resulting damages and costs.
      </Text>

      <Text style={styles.paragraph}>
        9.2 Due Diligence. Client shall promptly provide any information or documentation requested by
        Jetvision to conduct due diligence or comply with applicable laws, including certifications of compliance
        with Section 9.1. Jetvision may refuse to arrange Charter Services if Client or any Passenger fails to
        satisfy due diligence requirements, without liability, and Client shall remain liable for a 100%
        cancellation fee.
      </Text>

      <Text style={styles.paragraph}>
        9.3 Sanctions and Fund Freezing. If Jetvision is required by applicable sanctions laws or regulations (e.g.,
        OFAC) to block or freeze funds received from Client, Jetvision may do so without liability and shall deal
        with such funds as prescribed by law or relevant authorities. Jetvision may terminate this Agreement
        immediately without liability if Client or any Passenger becomes a Designated Party or violates sanctions
        laws, and Client shall remain liable for all fees, costs, and indemnification obligations.
      </Text>

      <Text style={styles.paragraph}>
        9.4 Breach of Representations. Any breach of Section 9.1 shall constitute a material breach, entitling
        Jetvision to terminate this Agreement immediately without liability, and Client shall remain liable for a
        100% cancellation fee, all costs incurred, and indemnification obligations.
      </Text>

      <Text style={styles.sectionTitle}>10. DATA PROTECTION AND CONFIDENTIALITY</Text>

      <Text style={styles.paragraph}>
        10.1 Personal Data. Client consents to Jetvision collecting, processing, and sharing personal data of
        Client and Passengers (e.g., names, passport details, contact information, health certifications), including
        sensitive personal data (e.g., medical conditions, biometric data), as necessary to arrange Charter
        Services, in accordance with Jetvision's Privacy Policy [insert link or reference]. Client represents and
        warrants that:
      </Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(a)</Text>
        <Text style={styles.bulletText}>It has the authority to provide such data on behalf of Passengers;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(b)</Text>
        <Text style={styles.bulletText}>Passengers have been informed of Jetvision's Privacy Policy and consent to the processing of their personal data, including sensitive data;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(c)</Text>
        <Text style={styles.bulletText}>Client will indemnify Jetvision for any claims arising from failure to obtain such consent. Jetvision may share personal data with Operators, third-party service providers, or authorities as required to perform Charter Services or comply with applicable laws, including the California Consumer Privacy Act ("CCPA") and, if applicable, the General Data Protection Regulation ("GDPR").</Text>
      </View>

      <Text style={styles.paragraph}>
        10.2 Confidential Information. Each Party shall maintain the confidentiality of the other Party's
        confidential information, including Jetvision's agreements with Operators, pricing, booking processes,
        and proprietary data, and shall not disclose it to third parties except:
      </Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(a)</Text>
        <Text style={styles.bulletText}>As required to arrange Charter Services or ancillary services;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(b)</Text>
        <Text style={styles.bulletText}>Pursuant to legal or regulatory requirements;</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Reference #{data.contractNumber}</Text>
        <Text>Jetvision LLC</Text>
        <Text>Page 10 of 14</Text>
      </View>
    </Page>
  );
}

function TermsPage10({ data }: { data: ContractData }) {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'jetvision-logo.png');

  return (
    <Page size="LETTER" style={[styles.page, styles.pageWithFooter]}>
      <View style={[styles.header, { justifyContent: 'flex-end' }]}>
        <Image src={logoPath} style={[styles.logo, { width: 80, height: 35 }]} />
      </View>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(c)</Text>
        <Text style={styles.bulletText}>To Jetvision's auditors, legal advisors, bankers, or affiliates;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(d)</Text>
        <Text style={styles.bulletText}>To protect Jetvision's rights, property, or safety.</Text>
      </View>

      <Text style={styles.paragraph}>
        Confidential information does not include personal data, which is governed by Section 10.1. Client shall
        not disclose any information related to Charter Services to third parties without Jetvision's prior written
        consent. Any breach of this Section shall entitle Jetvision to terminate this Agreement and seek
        damages.
      </Text>

      <Text style={styles.paragraph}>
        10.3 Survival. The obligations under this Section 10 shall survive the termination or expiration of this
        Agreement.
      </Text>

      <Text style={styles.sectionTitle}>11. GOVERNING LAW AND DISPUTE RESOLUTION</Text>

      <Text style={styles.paragraph}>
        11.1 Governing Law. This Agreement shall be governed by and construed in accordance with the laws of
        the State of California, without regard to its conflict of laws principles, except where preempted by
        federal aviation law (e.g., the Federal Aviation Act).
      </Text>

      <Text style={styles.paragraph}>
        11.2 Arbitration. Any dispute, controversy, or claim arising out of or relating to this Agreement, including
        its formation, interpretation, or breach, shall be resolved exclusively by binding arbitration under the
        Commercial Arbitration Rules of the American Arbitration Association ("AAA"). The arbitration shall be
        conducted in Los Angeles, California, by a single arbitrator, and the language shall be English. The
        arbitrator's decision shall be final and binding, and judgment may be entered thereon in any court of
        competent jurisdiction. Each Party shall bear its own costs and attorneys' fees, except that the arbitrator
        may award costs and fees in cases of frivolous claims or bad faith.
      </Text>

      <Text style={styles.paragraph}>
        11.3 No Class Actions. All disputes shall be resolved on an individual basis. Client expressly waives any
        right to participate in or pursue class, collective, or representative actions against Jetvision.
      </Text>

      <Text style={styles.paragraph}>
        11.4 Jurisdiction. Subject to Section 11.2, the Parties submit to the exclusive jurisdiction of the state and
        federal courts located in Los Angeles County, California, for any actions to enforce an arbitration award
        or for matters not subject to arbitration (e.g., emergency injunctive relief). Jetvision reserves the right to
        bring proceedings against Client in any other competent jurisdiction, whether or not proceedings are
        pending in California.
      </Text>

      <Text style={styles.paragraph}>
        11.5 Survival. This Section 11 shall survive the termination or expiration of this Agreement.
      </Text>

      <Text style={styles.sectionTitle}>12. MISCELLANEOUS</Text>

      <Text style={styles.paragraph}>
        12.1 Entire Agreement. This Agreement, together with any booking confirmations issued by Jetvision,
        constitutes the entire agreement between the Parties and supersedes all prior or contemporaneous
        agreements, understandings, or representations, whether written or oral. No terms, conditions, or
        warranties not expressly stated herein shall be binding on Jetvision.
      </Text>

      <Text style={styles.paragraph}>
        12.2 Amendments. No amendment to this Agreement shall be effective unless in writing and signed by
        both Parties. Jetvision's issuance of a booking confirmation with modified terms shall not constitute an
        amendment unless expressly agreed by both Parties.
      </Text>

      <Text style={styles.paragraph}>
        12.3 Severability. If any provision of this Agreement is found to be invalid, illegal, or unenforceable, the
        remaining provisions shall remain in full force and effect, and the invalid provision shall be reformed to
        the minimum extent necessary to make it enforceable.
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Reference #{data.contractNumber}</Text>
        <Text>Jetvision LLC</Text>
        <Text>Page 11 of 14</Text>
      </View>
    </Page>
  );
}

function TermsPage11({ data }: { data: ContractData }) {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'jetvision-logo.png');

  return (
    <Page size="LETTER" style={[styles.page, styles.pageWithFooter]}>
      <View style={[styles.header, { justifyContent: 'flex-end' }]}>
        <Image src={logoPath} style={[styles.logo, { width: 80, height: 35 }]} />
      </View>

      <Text style={styles.paragraph}>
        12.4 Assignment. Client may not assign, transfer, or delegate any rights or obligations under this
        Agreement without Jetvision's prior written consent. Jetvision may assign this Agreement to an affiliate,
        successor, or third party without Client's consent.
      </Text>

      <Text style={styles.paragraph}>
        12.5 Notices. All notices under this Agreement shall be in writing and delivered by email to [insert Jetvision
        email] or courier to the addresses specified above or to such other address as a
        Party may designate in writing. Notices are deemed received upon confirmation of delivery by email or
        courier.
      </Text>

      <Text style={styles.paragraph}>
        12.6 Third-Party Beneficiaries. There are no third-party beneficiaries to this Agreement, including
        Operators or Passengers.
      </Text>

      <Text style={styles.paragraph}>
        12.7 Waiver. No waiver of any provision of this Agreement shall be effective unless in writing and signed
        by Jetvision. No waiver shall constitute a continuing waiver of any subsequent breach.
      </Text>

      <Text style={styles.paragraph}>
        12.8 Time of Essence. Time is of the essence for all Client obligations under this Agreement, including
        payment, information submission, and compliance deadlines.
      </Text>

      <Text style={styles.paragraph}>
        12.9 Force of Agreement. Any provision of this Agreement that shall be effective unless in writing and signed by
        Jetvision. No waiver shall constitute a continuing waiver of any subsequent breach.
      </Text>

      <Text style={styles.paragraph}>
        12.10 Aircraft Usage Restrictions. Client shall use Charter Services solely for personal or business travel
        of Client and Passengers and shall not:
      </Text>

      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(a)</Text>
        <Text style={styles.bulletText}>Offer or provide transportation for remuneration or commercial purposes (e.g., photography, filming) without Jetvision's prior written consent;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(b)</Text>
        <Text style={styles.bulletText}>Use Charter Service's in violation of applicable laws, sanctions, or insurance requirements;</Text>
      </View>
      <View style={styles.bulletPoint}>
        <Text style={styles.bullet}>(c)</Text>
        <Text style={styles.bulletText}>Cause, permit, or allow any mortgage, lien, pledge, or encumbrance to be placed on the aircraft.</Text>
      </View>

      <Text style={styles.paragraph}>
        Any violation shall entitle Jetvision to terminate this Agreement and impose a 100% cancellation fee,
        with Client liable for all resulting damages and costs.
      </Text>

      <Text style={styles.paragraph}>
        12.11 Currency Conversion. If any payment or cost involves currency conversion, Jetvision shall use a
        commercially accepted exchange rate at its sole discretion, and Client shall bear all associated fees.
      </Text>

      <Text style={styles.paragraph}>
        12.12 Cumulative Remedies. Jetvision's rights and remedies under this Agreement are cumulative and
        not exclusive. The exercise of any remedy shall not preclude the exercise of any other remedy available
        at law or in equity.
      </Text>

      {/* Signature Section */}
      <View style={styles.witnessSection}>
        <Text style={styles.witnessText}>
          IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {/* Jetvision Signature */}
        <View style={[styles.signatureBlock, { width: '45%' }]}>
          <Text style={styles.signatureBlockTitle}>JETVISION LLC</Text>
          <View style={styles.signatureField}>
            <View style={styles.signatureFieldLine} />
            <Text style={styles.signatureFieldLabel}>Signature:</Text>
          </View>
          <View style={styles.signatureField}>
            <View style={styles.signatureFieldLine} />
            <Text style={styles.signatureFieldLabel}>Name:</Text>
          </View>
          <View style={styles.signatureField}>
            <View style={styles.signatureFieldLine} />
            <Text style={styles.signatureFieldLabel}>Date:</Text>
          </View>
        </View>

        {/* Client Signature */}
        <View style={[styles.signatureBlock, { width: '45%' }]}>
          <Text style={styles.signatureBlockTitle}>CLIENT</Text>
          <View style={styles.signatureField}>
            <View style={styles.signatureFieldLine} />
            <Text style={styles.signatureFieldLabel}>Signature:</Text>
          </View>
          <View style={styles.signatureField}>
            <View style={styles.signatureFieldLine} />
            <Text style={styles.signatureFieldLabel}>Name:</Text>
          </View>
          <View style={styles.signatureField}>
            <View style={styles.signatureFieldLine} />
            <Text style={styles.signatureFieldLabel}>Date:</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Reference #{data.contractNumber}</Text>
        <Text>Jetvision LLC</Text>
        <Text>Page 12 of 14</Text>
      </View>
    </Page>
  );
}

// =============================================================================
// PAYMENT INSTRUCTIONS PAGE
// =============================================================================

function PaymentInstructionsPage({ data }: { data: ContractData }) {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'jetvision-logo.png');
  const totalAmount = data.pricing.totalAmount || 0;
  const currency = data.pricing.currency || 'USD';

  return (
    <Page size="LETTER" style={[styles.page, styles.pageWithFooter]}>
      {/* Header with logo */}
      <View style={[styles.header, { justifyContent: 'flex-end', marginBottom: 30 }]}>
        <Image src={logoPath} style={[styles.logo, { width: 100, height: 45 }]} />
      </View>

      <Text style={styles.paymentInstructionsTitle}>PAYMENT INSTRUCTIONS</Text>

      <Text style={styles.ccAuthIntro}>
        Please remit payment using one of the methods below. Reference your contract number
        on all payments to ensure proper crediting.
      </Text>

      {/* Wire Transfer Section */}
      <Text style={styles.paymentSectionTitle}>Wire Transfer</Text>
      <View style={styles.paymentInfoRow}>
        <Text style={styles.paymentInfoLabel}>Bank Name:</Text>
        <Text style={styles.paymentInfoValue}>[Bank Name]</Text>
      </View>
      <View style={styles.paymentInfoRow}>
        <Text style={styles.paymentInfoLabel}>Routing Number (ABA):</Text>
        <Text style={styles.paymentInfoValue}>[Routing Number]</Text>
      </View>
      <View style={styles.paymentInfoRow}>
        <Text style={styles.paymentInfoLabel}>Account Number:</Text>
        <Text style={styles.paymentInfoValue}>[Account Number]</Text>
      </View>
      <View style={styles.paymentInfoRow}>
        <Text style={styles.paymentInfoLabel}>Account Name:</Text>
        <Text style={styles.paymentInfoValue}>Jetvision LLC</Text>
      </View>
      <View style={styles.paymentInfoRow}>
        <Text style={styles.paymentInfoLabel}>SWIFT Code (Intl):</Text>
        <Text style={styles.paymentInfoValue}>[SWIFT Code]</Text>
      </View>
      <View style={styles.paymentInfoRow}>
        <Text style={styles.paymentInfoLabel}>Reference:</Text>
        <Text style={styles.paymentInfoValue}>Contract #{data.contractNumber}</Text>
      </View>

      <View style={styles.paymentDivider} />

      {/* Check Payment Section */}
      <Text style={styles.paymentSectionTitle}>Check Payment</Text>
      <View style={styles.paymentInfoRow}>
        <Text style={styles.paymentInfoLabel}>Payable To:</Text>
        <Text style={styles.paymentInfoValue}>Jetvision LLC</Text>
      </View>
      <View style={styles.paymentInfoRow}>
        <Text style={styles.paymentInfoLabel}>Mailing Address:</Text>
        <Text style={styles.paymentInfoValue}>[Company Address]</Text>
      </View>
      <View style={styles.paymentInfoRow}>
        <Text style={styles.paymentInfoLabel}>Memo / Reference:</Text>
        <Text style={styles.paymentInfoValue}>Contract #{data.contractNumber}</Text>
      </View>

      <View style={styles.paymentDivider} />

      {/* Payment Amount Due */}
      <Text style={styles.paymentSectionTitle}>Payment Amount Due</Text>
      <View style={styles.paymentInfoRow}>
        <Text style={styles.paymentInfoLabel}>Total Amount:</Text>
        <Text style={[styles.paymentInfoValue, { fontFamily: 'Helvetica-Bold', fontSize: 12 }]}>
          {currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>
      <View style={styles.paymentInfoRow}>
        <Text style={styles.paymentInfoLabel}>Contract Reference:</Text>
        <Text style={styles.paymentInfoValue}>{data.contractNumber}</Text>
      </View>
      {data.quoteValidUntil && (
        <View style={styles.paymentInfoRow}>
          <Text style={styles.paymentInfoLabel}>Payment Due By:</Text>
          <Text style={styles.paymentInfoValue}>{data.quoteValidUntil}</Text>
        </View>
      )}

      <Text style={styles.paymentNote}>
        All payments must be received in full before the scheduled departure. For questions
        regarding payment, please contact your Jetvision representative.
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Reference #{data.contractNumber}</Text>
        <Text>Jetvision LLC</Text>
        <Text>Page 13 of 14</Text>
      </View>
    </Page>
  );
}

// =============================================================================
// CREDIT CARD AUTHORIZATION PAGE
// =============================================================================

function CreditCardAuthPage({ data }: { data: ContractData }) {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'jetvision-logo.png');

  return (
    <Page size="LETTER" style={[styles.page, styles.pageWithFooter]}>
      {/* Header with logo */}
      <View style={[styles.header, { justifyContent: 'flex-end', marginBottom: 30 }]}>
        <Image src={logoPath} style={[styles.logo, { width: 100, height: 45 }]} />
      </View>

      <Text style={styles.ccAuthTitle}>CREDIT CARD AUTHORIZATION</Text>

      <Text style={styles.ccAuthIntro}>
        Please complete the information below to authorize Jetvision LLC to charge your credit card for the
        flight services arranged on your behalf.
      </Text>

      <Text style={styles.ccAuthStatement}>
        I hereby authorize Jetvision LLC to charge the credit card listed below for the total cost of the trip,
        including any applicable taxes, fees, incidentals, and cancellation charges as outlined in the Agreement.
        If payment is not received by other means, Jetvision is authorized to collect via this card.
      </Text>

      {/* Form Fields */}
      <View style={styles.ccFormRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.ccFormFieldLine} />
          <Text style={styles.ccFormFieldLabel}>Name on Credit Card:</Text>
        </View>
      </View>

      <View style={styles.ccFormRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.ccFormFieldLine} />
          <Text style={styles.ccFormFieldLabel}>Credit Card Type:</Text>
        </View>
      </View>

      <View style={styles.ccFormRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.ccFormFieldLine} />
          <Text style={styles.ccFormFieldLabel}>Credit Card Number:</Text>
        </View>
      </View>

      <View style={styles.ccFormRow}>
        <View style={styles.ccFormFieldHalf}>
          <View style={styles.ccFormFieldLine} />
          <Text style={styles.ccFormFieldLabel}>Expiration Date (MM/YY):</Text>
        </View>
        <View style={styles.ccFormFieldHalf}>
          <View style={styles.ccFormFieldLine} />
          <Text style={styles.ccFormFieldLabel}>Security Code (CVV):</Text>
        </View>
      </View>

      <View style={styles.ccFormRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.ccFormFieldLine} />
          <Text style={styles.ccFormFieldLabel}>Billing Address:</Text>
        </View>
      </View>

      <View style={styles.ccFormRow}>
        <View style={{ width: '50%' }}>
          <View style={styles.ccFormFieldLine} />
          <Text style={styles.ccFormFieldLabel}>City:</Text>
        </View>
        <View style={{ width: '20%', marginLeft: 16 }}>
          <View style={styles.ccFormFieldLine} />
          <Text style={styles.ccFormFieldLabel}>State:</Text>
        </View>
        <View style={{ width: '25%', marginLeft: 16 }}>
          <View style={styles.ccFormFieldLine} />
          <Text style={styles.ccFormFieldLabel}>ZIP Code:</Text>
        </View>
      </View>

      <View style={styles.ccFormRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.ccFormFieldLine} />
          <Text style={styles.ccFormFieldLabel}>Authorized Amount (USD): $</Text>
        </View>
      </View>

      <Text style={styles.ccNote}>
        Note: Total contract amount + 5% Credit Card Fee.
      </Text>

      <View style={styles.ccFormRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.ccFormFieldLine} />
          <Text style={styles.ccFormFieldLabel}>Cardholder Signature:</Text>
        </View>
      </View>

      <View style={styles.ccFormRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.ccFormFieldLine} />
          <Text style={styles.ccFormFieldLabel}>Date:</Text>
        </View>
      </View>

      <Text style={styles.ccDisclaimer}>
        Please include a legible copy of the cardholder's government-issued ID and front and back of the credit
        card.
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Reference #{data.contractNumber}</Text>
        <Text>Jetvision LLC</Text>
        <Text>Page 14 of 14</Text>
      </View>
    </Page>
  );
}

// =============================================================================
// MAIN DOCUMENT COMPONENT
// =============================================================================

export function ContractDocument({ data }: { data: ContractData }) {
  return (
    <Document>
      {/* Page 1: Cover/Quote Summary */}
      <CoverPage data={data} />

      {/* Pages 2-12: Terms and Conditions */}
      <TermsPage1 data={data} />
      <TermsPage2 data={data} />
      <TermsPage3 data={data} />
      <TermsPage4 data={data} />
      <TermsPage5 data={data} />
      <TermsPage6 data={data} />
      <TermsPage7 data={data} />
      <TermsPage8 data={data} />
      <TermsPage9 data={data} />
      <TermsPage10 data={data} />
      <TermsPage11 data={data} />

      {/* Page 13: Payment Instructions */}
      <PaymentInstructionsPage data={data} />

      {/* Page 14: Credit Card Authorization */}
      <CreditCardAuthPage data={data} />
    </Document>
  );
}

export default ContractDocument;
