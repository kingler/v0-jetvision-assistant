/**
 * Onboarding Contract PDF Template
 *
 * React PDF template for generating ISO Agent employment commission contracts.
 * Used during the agent onboarding workflow to formalize the commission agreement.
 *
 * @see https://react-pdf.org/
 * @see lib/pdf/onboarding-contract-generator.ts
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

// =============================================================================
// TYPES
// =============================================================================

export interface OnboardingContractProps {
  agentName: string;
  agentEmail: string;
  agentAddress: string;
  agentDOB: string;
  commissionPercentage: number;
  effectiveDate: string;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  header: {
    textAlign: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginTop: 20,
    marginBottom: 8,
    color: '#003366',
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  partyRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  partyLabel: {
    width: 100,
    fontFamily: 'Helvetica-Bold',
  },
  partyValue: {
    flex: 1,
  },
  signatureBlock: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: '#cccccc',
    paddingTop: 20,
  },
  signatureLine: {
    marginTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    width: 250,
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 10,
    color: '#666666',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 9,
    color: '#999999',
  },
});

// =============================================================================
// DOCUMENT COMPONENT
// =============================================================================

export const OnboardingContractDocument: React.FC<OnboardingContractProps> = ({
  agentName,
  agentEmail,
  agentAddress,
  agentDOB,
  commissionPercentage,
  effectiveDate,
}) => (
  <Document>
    <Page size="LETTER" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ISO AGENT SERVICES AGREEMENT</Text>
        <Text style={styles.subtitle}>Jetvision Aviation Services LLC</Text>
      </View>

      {/* Effective Date */}
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Effective Date:</Text> {effectiveDate}
      </Text>

      {/* Parties */}
      <Text style={styles.sectionTitle}>1. PARTIES</Text>
      <Text style={styles.paragraph}>
        This ISO Agent Services Agreement (&quot;Agreement&quot;) is entered into by and between:
      </Text>
      <View style={styles.partyRow}>
        <Text style={styles.partyLabel}>Company:</Text>
        <Text style={styles.partyValue}>Jetvision Aviation Services LLC (&quot;Company&quot;)</Text>
      </View>
      <View style={styles.partyRow}>
        <Text style={styles.partyLabel}>Agent:</Text>
        <Text style={styles.partyValue}>{agentName} (&quot;Agent&quot;)</Text>
      </View>
      <View style={styles.partyRow}>
        <Text style={styles.partyLabel}>Email:</Text>
        <Text style={styles.partyValue}>{agentEmail}</Text>
      </View>
      <View style={styles.partyRow}>
        <Text style={styles.partyLabel}>Address:</Text>
        <Text style={styles.partyValue}>{agentAddress}</Text>
      </View>
      <View style={styles.partyRow}>
        <Text style={styles.partyLabel}>Date of Birth:</Text>
        <Text style={styles.partyValue}>{agentDOB}</Text>
      </View>

      {/* Commission Structure */}
      <Text style={styles.sectionTitle}>2. COMMISSION STRUCTURE</Text>
      <Text style={styles.paragraph}>
        Agent shall earn a commission of {commissionPercentage}% of the Company&apos;s booking margin
        (defined as 30% of the total charter flight booking value) for each completed booking
        originated by Agent. Commissions are calculated on confirmed, paid bookings only.
      </Text>

      {/* Scope of Services */}
      <Text style={styles.sectionTitle}>3. SCOPE OF SERVICES</Text>
      <Text style={styles.paragraph}>
        Agent agrees to perform the following services on behalf of the Company:
        (a) Client acquisition and relationship management for charter flight bookings;
        (b) Flight brokerage services including trip coordination and communication;
        (c) Maintaining professional standards in all client interactions;
        (d) Utilizing the Company&apos;s platform and tools for all booking activities.
      </Text>

      {/* Confidentiality */}
      <Text style={styles.sectionTitle}>4. CONFIDENTIALITY</Text>
      <Text style={styles.paragraph}>
        Agent agrees to maintain strict confidentiality regarding all Company proprietary
        information, including but not limited to: client lists, pricing structures, business
        strategies, operational procedures, and financial data. This obligation survives
        termination of this Agreement.
      </Text>

      {/* Term and Termination */}
      <Text style={styles.sectionTitle}>5. TERM AND TERMINATION</Text>
      <Text style={styles.paragraph}>
        This Agreement is effective as of the Effective Date and continues until terminated.
        Either party may terminate with 30 days written notice. The Company may terminate
        immediately for cause, including breach of confidentiality, fraud, or material
        violation of Company policies.
      </Text>

      {/* Independent Contractor */}
      <Text style={styles.sectionTitle}>6. INDEPENDENT CONTRACTOR STATUS</Text>
      <Text style={styles.paragraph}>
        Agent is an independent contractor, not an employee. Agent is responsible for all
        applicable taxes, insurance, and regulatory compliance. The Company does not provide
        benefits, withhold taxes, or maintain workers&apos; compensation coverage for Agent.
      </Text>

      {/* Governing Law */}
      <Text style={styles.sectionTitle}>7. GOVERNING LAW</Text>
      <Text style={styles.paragraph}>
        This Agreement shall be governed by and construed in accordance with the laws of the
        State of Florida. Any disputes arising under this Agreement shall be resolved through
        binding arbitration in Miami-Dade County, Florida.
      </Text>

      {/* Signature Block */}
      <View style={styles.signatureBlock}>
        <Text style={styles.sectionTitle}>8. AGREEMENT AND SIGNATURE</Text>
        <Text style={styles.paragraph}>
          By signing below, Agent acknowledges that they have read, understood, and agree to
          all terms and conditions set forth in this Agreement.
        </Text>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureLabel}>Agent Name: {agentName}</Text>
        <Text style={styles.signatureLabel}>Date: _______________</Text>
        <Text style={{ ...styles.signatureLabel, marginTop: 10 }}>
          Signed digitally via Jetvision platform
        </Text>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Jetvision Aviation Services LLC — ISO Agent Services Agreement — Confidential
      </Text>
    </Page>
  </Document>
);

export default OnboardingContractDocument;
