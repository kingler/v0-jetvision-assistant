/**
 * Onboarding Commission Contract PDF Template
 *
 * React PDF template for generating employment commission contracts
 * for ISO agent onboarding. This is DISTINCT from flight charter contracts.
 *
 * @see lib/pdf/onboarding-contract-generator.ts
 * @see lib/pdf/contract-template.tsx (flight contracts — different document)
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

// =============================================================================
// TYPES
// =============================================================================

export interface OnboardingContractData {
  agentName: string;
  agentEmail: string;
  agentAddress: string;
  agentCity: string;
  agentState: string;
  agentZipCode: string;
  agentDateOfBirth: string;
  commissionPercentage: number;
  contractDate: string;
  contractId: string;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
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
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666666',
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginTop: 18,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 10,
    marginBottom: 8,
    textAlign: 'justify',
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 150,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  infoValue: {
    flex: 1,
    fontSize: 10,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 16,
  },
  bullet: {
    width: 12,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
  },
  signatureSection: {
    marginTop: 40,
  },
  signatureBlock: {
    marginBottom: 24,
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
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
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
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// =============================================================================
// DOCUMENT COMPONENT
// =============================================================================

export function OnboardingContractDocument({ data }: { data: OnboardingContractData }) {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'jetvision-logo.png');

  return (
    <Document>
      {/* Page 1: Contract Terms */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoPath} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text>Jetvision LLC</Text>
            <Text>15303 Ventura Blvd. Suite 250</Text>
            <Text>Sherman Oaks, CA 91403</Text>
          </View>
        </View>

        <Text style={styles.title}>Independent Sales Agent Agreement</Text>
        <Text style={styles.subtitle}>
          Commission-Based Employment Contract — {formatDate(data.contractDate)}
        </Text>

        {/* Agent Identification */}
        <Text style={styles.sectionTitle}>1. PARTIES</Text>
        <Text style={styles.paragraph}>
          This Independent Sales Agent Agreement (&quot;Agreement&quot;) is entered into as of{' '}
          {formatDate(data.contractDate)} by and between:
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Company:</Text>
          <Text style={styles.infoValue}>Jetvision LLC, a Delaware limited liability company</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Agent:</Text>
          <Text style={styles.infoValue}>{data.agentName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{data.agentEmail}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address:</Text>
          <Text style={styles.infoValue}>
            {data.agentAddress}, {data.agentCity}, {data.agentState} {data.agentZipCode}
          </Text>
        </View>
        <View style={[styles.infoRow, { marginBottom: 12 }]}>
          <Text style={styles.infoLabel}>Date of Birth:</Text>
          <Text style={styles.infoValue}>{formatDate(data.agentDateOfBirth)}</Text>
        </View>

        {/* Commission Structure */}
        <Text style={styles.sectionTitle}>2. COMMISSION STRUCTURE</Text>
        <Text style={styles.paragraph}>
          Agent shall receive a commission of{' '}
          <Text style={styles.bold}>{data.commissionPercentage}%</Text> of the net brokerage
          fee earned by Jetvision LLC on each charter flight transaction originated and closed by
          Agent, subject to the following terms:
        </Text>

        <View style={styles.bulletPoint}>
          <Text style={styles.bullet}>(a)</Text>
          <Text style={styles.bulletText}>
            Commission is calculated on the net brokerage fee (the difference between the
            price charged to the client and the cost from the operator), not on gross
            transaction value.
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Text style={styles.bullet}>(b)</Text>
          <Text style={styles.bulletText}>
            Commission is payable only after Jetvision LLC receives full payment from the client.
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Text style={styles.bullet}>(c)</Text>
          <Text style={styles.bulletText}>
            Payment schedule: monthly, within 30 days of month-end for all qualifying
            transactions completed in that month.
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Text style={styles.bullet}>(d)</Text>
          <Text style={styles.bulletText}>
            No commission is payable on cancelled transactions, refunded bookings, or
            transactions where the client does not pay in full.
          </Text>
        </View>

        {/* Scope of Services */}
        <Text style={styles.sectionTitle}>3. SCOPE OF SERVICES</Text>
        <Text style={styles.paragraph}>
          Agent is engaged to perform the following services on behalf of Jetvision LLC:
        </Text>

        <View style={styles.bulletPoint}>
          <Text style={styles.bullet}>(a)</Text>
          <Text style={styles.bulletText}>
            Identify and acquire new clients for private charter flight services
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Text style={styles.bullet}>(b)</Text>
          <Text style={styles.bulletText}>
            Facilitate charter flight bookings using Jetvision&apos;s booking platform and tools
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Text style={styles.bullet}>(c)</Text>
          <Text style={styles.bulletText}>
            Maintain professional relationships with clients throughout the booking process
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Text style={styles.bullet}>(d)</Text>
          <Text style={styles.bulletText}>
            Comply with all applicable aviation regulations and Jetvision&apos;s operating procedures
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>Contract #{data.contractId}</Text>
          <Text>Jetvision LLC — Confidential</Text>
          <Text>Page 1 of 2</Text>
        </View>
      </Page>

      {/* Page 2: Additional Terms + Signature */}
      <Page size="LETTER" style={styles.page}>
        <View style={[styles.header, { justifyContent: 'flex-end' }]}>
          <Image src={logoPath} style={[styles.logo, { width: 80, height: 35 }]} />
        </View>

        {/* Confidentiality */}
        <Text style={styles.sectionTitle}>4. CONFIDENTIALITY</Text>
        <Text style={styles.paragraph}>
          Agent shall maintain strict confidentiality regarding Jetvision LLC&apos;s business
          operations, client information, pricing structures, operator relationships, and any
          proprietary data disclosed during the term of this Agreement. This obligation
          survives termination.
        </Text>

        {/* Term and Termination */}
        <Text style={styles.sectionTitle}>5. TERM AND TERMINATION</Text>
        <Text style={styles.paragraph}>
          This Agreement shall commence on the date of execution and continue until
          terminated by either party with 30 days&apos; written notice. Upon termination, Agent
          shall receive commissions on all transactions originated prior to the termination
          date for which payment is subsequently received by Jetvision LLC within 90 days of
          termination.
        </Text>

        {/* Independent Contractor */}
        <Text style={styles.sectionTitle}>6. INDEPENDENT CONTRACTOR STATUS</Text>
        <Text style={styles.paragraph}>
          Agent is an independent contractor, not an employee of Jetvision LLC. Agent is
          responsible for their own taxes, insurance, and business expenses. Jetvision LLC
          will not withhold taxes or provide employee benefits. Agent may engage in other
          business activities that do not conflict with obligations under this Agreement.
        </Text>

        {/* Governing Law */}
        <Text style={styles.sectionTitle}>7. GOVERNING LAW</Text>
        <Text style={styles.paragraph}>
          This Agreement shall be governed by and construed in accordance with the laws of
          the State of California. Any disputes shall be resolved through binding arbitration
          in Los Angeles, California under the rules of the American Arbitration Association.
        </Text>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <Text style={[styles.paragraph, styles.bold]}>
            IN WITNESS WHEREOF, the parties have executed this Agreement as of the date set
            forth above.
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }}>
            <View style={[styles.signatureBlock, { width: '45%' }]}>
              <Text style={[styles.signatureFieldLabel, { marginBottom: 8, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' }]}>
                JETVISION LLC
              </Text>
              <View style={styles.signatureFieldLine} />
              <Text style={styles.signatureFieldLabel}>Authorized Signature</Text>
              <View style={[styles.signatureFieldLine, { marginTop: 12 }]} />
              <Text style={styles.signatureFieldLabel}>Name / Title</Text>
              <View style={[styles.signatureFieldLine, { marginTop: 12 }]} />
              <Text style={styles.signatureFieldLabel}>Date</Text>
            </View>

            <View style={[styles.signatureBlock, { width: '45%' }]}>
              <Text style={[styles.signatureFieldLabel, { marginBottom: 8, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' }]}>
                AGENT
              </Text>
              <View style={styles.signatureFieldLine} />
              <Text style={styles.signatureFieldLabel}>Signature</Text>
              <View style={[styles.signatureFieldLine, { marginTop: 12 }]} />
              <Text style={styles.signatureFieldLabel}>Name: {data.agentName}</Text>
              <View style={[styles.signatureFieldLine, { marginTop: 12 }]} />
              <Text style={styles.signatureFieldLabel}>Date</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Contract #{data.contractId}</Text>
          <Text>Jetvision LLC — Confidential</Text>
          <Text>Page 2 of 2</Text>
        </View>
      </Page>
    </Document>
  );
}

export default OnboardingContractDocument;
