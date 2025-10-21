# PDF Generation - Agent Tool

**Technology**: @react-pdf/renderer
**Official Docs**: https://react-pdf.org/
**Version**: 1.0.0
**Last Updated**: October 20, 2025
**Integration**: MCP Server + Direct Agent Tool

---

## 📋 Overview

PDF Generation is implemented as both an MCP Server tool and a direct agent capability, allowing AI agents to generate professional PDF documents for proposals, quotes, and reports. The system uses React-PDF for server-side PDF rendering with TypeScript support.

### Why PDF Generation as Agent Tool?

- **Automated Proposals**: Agents can generate PDFs without human intervention
- **Consistent Branding**: Templates ensure professional, branded output
- **Multi-Channel Delivery**: PDFs can be downloaded, emailed, or viewed inline
- **Audit Trail**: All generated PDFs are logged and versioned
- **Client-Ready**: Production-quality documents ready for client delivery

---

## 🏗️ Architecture

### PDF Generation Flow

```mermaid
flowchart LR
    Agent[AI Agent] --> Tool[PDF Generation Tool]
    Tool --> Template[React-PDF Template]
    Template --> Renderer[@react-pdf/renderer]
    Renderer --> Buffer[PDF Buffer]
    Buffer --> Storage[(File Storage)]
    Buffer --> Email[Email Attachment]
    Buffer --> Download[Client Download]
    Storage --> Audit[Audit Log]
```

### Integration Methods

**Method 1: MCP Server** (Recommended for microservices)
```typescript
const pdf = await mcpClient.callTool('pdf-generator', 'generate_proposal', {
  proposalId: 'prop_123',
  format: 'branded'
})
```

**Method 2: Direct Function Call** (For same-process agents)
```typescript
import { generateProposalPDF } from '@/lib/pdf/generator'

const pdfBuffer = await generateProposalPDF(proposal, {
  template: 'branded',
  watermark: false
})
```

---

## 🛠️ Implementation

### Step 1: Install Dependencies

```bash
npm install @react-pdf/renderer
npm install --save-dev @types/react-pdf
```

### Step 2: PDF Template Structure

```
lib/pdf/
├── templates/
│   ├── proposal-template.tsx       # Main proposal PDF
│   ├── quote-comparison.tsx        # Quote comparison table
│   ├── invoice-template.tsx        # Billing invoice
│   └── components/
│       ├── header.tsx              # Reusable header
│       ├── footer.tsx              # Reusable footer
│       └── styles.ts               # Shared styles
├── generator.ts                    # PDF generation logic
├── types.ts                        # TypeScript types
└── utils/
    ├── formatters.ts               # Currency, date formatting
    └── validators.ts               # Data validation
```

### Step 3: Create PDF Template

```typescript
// lib/pdf/templates/proposal-template.tsx
import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import { ProposalData } from '../types'

// Register custom fonts
Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.ttf' },
    { src: '/fonts/Inter-Bold.ttf', fontWeight: 'bold' },
  ],
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2 solid #3b82f6',
  },
  logo: {
    width: 120,
    height: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: '1 solid #e5e7eb',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    color: '#6b7280',
  },
  value: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  priceBox: {
    backgroundColor: '#eff6ff',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTop: '2 solid #3b82f6',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e5e7eb',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
  },
  tableCol: {
    flex: 1,
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#9ca3af',
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10,
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    fontSize: 60,
    color: '#f3f4f6',
    opacity: 0.3,
  },
})

interface ProposalPDFProps {
  proposal: ProposalData
  options?: {
    watermark?: boolean
    internalView?: boolean
  }
}

export const ProposalPDF: React.FC<ProposalPDFProps> = ({
  proposal,
  options = {},
}) => {
  const { watermark = false, internalView = false } = options

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Image
              src="/images/jetvision-logo.png"
              style={styles.logo}
            />
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={{ fontSize: 10, color: '#6b7280' }}>
              Proposal ID: {proposal.id}
            </Text>
            <Text style={{ fontSize: 10, color: '#6b7280' }}>
              Date: {new Date(proposal.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Watermark */}
        {watermark && (
          <Text style={styles.watermark}>DRAFT</Text>
        )}

        {/* Title */}
        <View>
          <Text style={styles.title}>Private Jet Charter Proposal</Text>
          <Text style={styles.subtitle}>
            {proposal.client.name} | {proposal.route.departure} → {proposal.route.arrival}
          </Text>
        </View>

        {/* Flight Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Route:</Text>
            <Text style={styles.value}>
              {proposal.route.departure} ({proposal.route.departureCode}) → {proposal.route.arrival} ({proposal.route.arrivalCode})
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date & Time:</Text>
            <Text style={styles.value}>
              {new Date(proposal.flightDate).toLocaleString()}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Passengers:</Text>
            <Text style={styles.value}>{proposal.passengers}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Flight Duration:</Text>
            <Text style={styles.value}>{proposal.estimatedDuration}</Text>
          </View>
        </View>

        {/* Aircraft Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selected Aircraft</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Aircraft:</Text>
            <Text style={styles.value}>{proposal.aircraft.model}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Operator:</Text>
            <Text style={styles.value}>{proposal.operator.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Operator Rating:</Text>
            <Text style={styles.value}>
              {proposal.operator.rating}/5.0 ⭐
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Aircraft Capacity:</Text>
            <Text style={styles.value}>
              {proposal.aircraft.capacity} passengers
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Amenities:</Text>
            <Text style={styles.value}>
              {proposal.aircraft.amenities.join(', ')}
            </Text>
          </View>
        </View>

        {/* Pricing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <View style={styles.priceBox}>
            {internalView && (
              <>
                <View style={styles.priceRow}>
                  <Text style={styles.label}>Operator Base Price:</Text>
                  <Text style={styles.value}>
                    ${proposal.pricing.basePrice.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.label}>JetVision Margin (30%):</Text>
                  <Text style={styles.value}>
                    + ${proposal.pricing.margin.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.label}>Fuel Surcharge:</Text>
                  <Text style={styles.value}>
                    ${proposal.pricing.fuelSurcharge.toLocaleString()}
                  </Text>
                </View>
              </>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.label}>Taxes & Fees:</Text>
              <Text style={styles.value}>
                ${proposal.pricing.taxesAndFees.toLocaleString()}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Price:</Text>
              <Text style={styles.totalValue}>
                ${proposal.pricing.totalPrice.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Terms & Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          <Text style={{ fontSize: 9, lineHeight: 1.4, color: '#6b7280' }}>
            • Payment due 24 hours before departure
            • Cancellation: 50% refund if cancelled 48+ hours before departure
            • Price valid until {new Date(proposal.pricing.validUntil).toLocaleDateString()}
            • All times are in local timezone unless specified
            • Additional charges may apply for catering, ground transport, or special requests
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>JetVision Group | info@jetvision.com | +1 (555) 123-4567</Text>
          <Text>This proposal is confidential and intended solely for {proposal.client.name}</Text>
        </View>
      </Page>
    </Document>
  )
}
```

### Step 4: PDF Generator Service

```typescript
// lib/pdf/generator.ts
import { renderToBuffer, renderToStream } from '@react-pdf/renderer'
import { ProposalPDF } from './templates/proposal-template'
import { createClient } from '@/lib/supabase/server'
import type { ProposalData, PDFGenerationOptions } from './types'

export class PDFGenerator {
  private supabase = createClient()

  /**
   * Generate proposal PDF
   */
  async generateProposalPDF(
    proposalId: string,
    options: PDFGenerationOptions = {}
  ): Promise<Buffer> {
    // 1. Fetch proposal data
    const proposal = await this.fetchProposalData(proposalId)

    // 2. Validate data
    this.validateProposalData(proposal)

    // 3. Generate PDF
    const pdfDocument = (
      <ProposalPDF
        proposal={proposal}
        options={{
          watermark: options.watermark ?? false,
          internalView: options.internalView ?? false,
        }}
      />
    )

    const pdfBuffer = await renderToBuffer(pdfDocument)

    // 4. Save to storage (optional)
    if (options.saveToStorage) {
      await this.savePDFToStorage(proposalId, pdfBuffer, options)
    }

    // 5. Log generation
    await this.logPDFGeneration(proposalId, options)

    return pdfBuffer
  }

  /**
   * Generate PDF as stream (for large files)
   */
  async generateProposalPDFStream(
    proposalId: string,
    options: PDFGenerationOptions = {}
  ) {
    const proposal = await this.fetchProposalData(proposalId)
    const pdfDocument = <ProposalPDF proposal={proposal} options={options} />

    return renderToStream(pdfDocument)
  }

  /**
   * Fetch proposal data from database
   */
  private async fetchProposalData(proposalId: string): Promise<ProposalData> {
    const { data, error } = await this.supabase
      .from('proposals')
      .select(`
        *,
        request:requests(
          *,
          client:clients(*),
          iso_agent:users(*)
        ),
        quote:quotes(
          *,
          operator:operators(*),
          aircraft:aircraft(*)
        )
      `)
      .eq('id', proposalId)
      .single()

    if (error || !data) {
      throw new Error(`Proposal not found: ${proposalId}`)
    }

    return this.transformToProposalData(data)
  }

  /**
   * Transform database data to PDF template format
   */
  private transformToProposalData(data: any): ProposalData {
    return {
      id: data.id,
      createdAt: data.created_at,
      client: {
        name: data.request.client.full_name,
        email: data.request.client.email,
        company: data.request.client.company,
      },
      route: {
        departure: data.request.departure_airport_name,
        arrival: data.request.arrival_airport_name,
        departureCode: data.request.departure_airport,
        arrivalCode: data.request.arrival_airport,
      },
      flightDate: data.request.departure_date,
      passengers: data.request.passenger_count,
      estimatedDuration: data.quote.estimated_duration,
      aircraft: {
        model: data.quote.aircraft.model,
        type: data.quote.aircraft.type,
        capacity: data.quote.aircraft.capacity,
        amenities: data.quote.aircraft.amenities || [],
      },
      operator: {
        name: data.quote.operator.name,
        rating: data.quote.operator.rating,
      },
      pricing: {
        basePrice: parseFloat(data.quote.base_price),
        margin: parseFloat(data.margin || '0'),
        fuelSurcharge: parseFloat(data.quote.fuel_surcharge || '0'),
        taxesAndFees: parseFloat(data.quote.taxes_and_fees || '0'),
        totalPrice: parseFloat(data.total_price),
        validUntil: data.quote.valid_until,
      },
    }
  }

  /**
   * Validate proposal data before generating PDF
   */
  private validateProposalData(proposal: ProposalData): void {
    const required = [
      'id',
      'client',
      'route',
      'flightDate',
      'aircraft',
      'operator',
      'pricing',
    ]

    for (const field of required) {
      if (!proposal[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    if (proposal.pricing.totalPrice <= 0) {
      throw new Error('Invalid pricing: total price must be positive')
    }
  }

  /**
   * Save PDF to file storage
   */
  private async savePDFToStorage(
    proposalId: string,
    pdfBuffer: Buffer,
    options: PDFGenerationOptions
  ): Promise<string> {
    const filename = `proposal-${proposalId}-${Date.now()}.pdf`
    const path = `proposals/${proposalId}/${filename}`

    const { error } = await this.supabase.storage
      .from('documents')
      .upload(path, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (error) {
      throw new Error(`Failed to save PDF: ${error.message}`)
    }

    return path
  }

  /**
   * Log PDF generation for audit trail
   */
  private async logPDFGeneration(
    proposalId: string,
    options: PDFGenerationOptions
  ): Promise<void> {
    await this.supabase.from('pdf_generations').insert({
      proposal_id: proposalId,
      template: options.template || 'proposal',
      generated_at: new Date().toISOString(),
      watermark: options.watermark,
      internal_view: options.internalView,
      generated_by: options.generatedBy || 'system',
    })
  }
}

// Export singleton instance
export const pdfGenerator = new PDFGenerator()

// Export convenience functions
export const generateProposalPDF = (
  proposalId: string,
  options?: PDFGenerationOptions
) => pdfGenerator.generateProposalPDF(proposalId, options)

export const generateProposalPDFStream = (
  proposalId: string,
  options?: PDFGenerationOptions
) => pdfGenerator.generateProposalPDFStream(proposalId, options)
```

### Step 5: TypeScript Types

```typescript
// lib/pdf/types.ts
export interface ProposalData {
  id: string
  createdAt: string
  client: {
    name: string
    email: string
    company?: string
  }
  route: {
    departure: string
    arrival: string
    departureCode: string
    arrivalCode: string
  }
  flightDate: string
  passengers: number
  estimatedDuration: string
  aircraft: {
    model: string
    type: string
    capacity: number
    amenities: string[]
  }
  operator: {
    name: string
    rating: number
  }
  pricing: {
    basePrice: number
    margin: number
    fuelSurcharge: number
    taxesAndFees: number
    totalPrice: number
    validUntil: string
  }
}

export interface PDFGenerationOptions {
  template?: 'proposal' | 'invoice' | 'quote_comparison'
  watermark?: boolean
  internalView?: boolean // Show margin/commission
  saveToStorage?: boolean
  generatedBy?: string // User ID or 'system'
  format?: 'buffer' | 'stream'
}

export interface PDFMetadata {
  proposalId: string
  filename: string
  size: number
  generatedAt: string
  storagePath?: string
}
```

---

## 🔌 Agent Integration

### Communication Manager Agent Usage

```typescript
// lib/agents/communication-manager-agent.ts
import { generateProposalPDF } from '@/lib/pdf/generator'

export class CommunicationManagerAgent extends BaseAgent {
  async sendProposalEmail(requestId: string, proposalId: string) {
    // 1. Generate PDF
    const pdfBuffer = await generateProposalPDF(proposalId, {
      watermark: false,
      internalView: false, // Client view - no internal pricing
    })

    // 2. Send email with PDF attachment
    await this.callMCPTool('gmail', 'send_email', {
      to: client.email,
      subject: `Your Private Jet Proposal: ${route}`,
      body_html: emailContent,
      attachments: [
        {
          filename: `JetVision-Proposal-${proposalId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    // 3. Log sent proposal
    await this.logActivity(requestId, 'proposal_sent_with_pdf', {
      proposalId,
      clientEmail: client.email,
    })
  }
}
```

### As OpenAI Agent Tool

```typescript
// lib/agents/communication-manager-agent.ts
export class CommunicationManagerAgent extends BaseAgent {
  protected getAgentTools() {
    return [
      {
        type: 'function' as const,
        function: {
          name: 'generate_proposal_pdf',
          description: 'Generate a PDF document for a proposal',
          parameters: {
            type: 'object',
            properties: {
              proposalId: {
                type: 'string',
                description: 'The proposal ID to generate PDF for',
              },
              watermark: {
                type: 'boolean',
                description: 'Add DRAFT watermark',
                default: false,
              },
              internalView: {
                type: 'boolean',
                description: 'Show internal pricing (margin/commission)',
                default: false,
              },
            },
            required: ['proposalId'],
          },
        },
      },
    ]
  }

  protected async handleToolCall(toolName: string, args: any) {
    if (toolName === 'generate_proposal_pdf') {
      const pdfBuffer = await generateProposalPDF(args.proposalId, {
        watermark: args.watermark,
        internalView: args.internalView,
      })

      return {
        success: true,
        size: pdfBuffer.length,
        message: 'PDF generated successfully',
      }
    }
  }
}
```

---

## 🎯 API Endpoints

### Download PDF

```typescript
// app/api/proposals/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateProposalPDF } from '@/lib/pdf/generator'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check access permissions
    const hasAccess = await checkProposalAccess(params.id, userId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const watermark = searchParams.get('watermark') === 'true'
    const internal = searchParams.get('internal') === 'true'

    // Generate PDF
    const pdfBuffer = await generateProposalPDF(params.id, {
      watermark,
      internalView: internal,
      generatedBy: userId,
    })

    // Return PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="proposal-${params.id}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
```

### Preview PDF (Inline)

```typescript
// app/api/proposals/[id]/preview/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pdfBuffer = await generateProposalPDF(params.id, {
    watermark: true,
  })

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline', // Show in browser instead of download
    },
  })
}
```

---

## 🎯 Best Practices

### 1. Always Validate Data

```typescript
// ✅ GOOD: Validate before generating
const proposal = await fetchProposal(id)
if (!proposal.pricing || proposal.pricing.totalPrice <= 0) {
  throw new Error('Invalid pricing data')
}
const pdf = await generateProposalPDF(id)

// ❌ BAD: No validation
const pdf = await generateProposalPDF(id) // Might generate invalid PDF
```

### 2. Use Watermarks for Drafts

```typescript
// ✅ GOOD: Watermark for drafts
const isDraft = proposal.status === 'draft'
const pdf = await generateProposalPDF(id, { watermark: isDraft })

// ❌ BAD: No distinction between draft and final
const pdf = await generateProposalPDF(id)
```

### 3. Separate Internal and Client Views

```typescript
// ✅ GOOD: Control what client sees
const pdfForClient = await generateProposalPDF(id, {
  internalView: false, // Hide margin/commission
})

const pdfForISO = await generateProposalPDF(id, {
  internalView: true, // Show all pricing details
})

// ❌ BAD: Same PDF for everyone (exposes internal data)
const pdf = await generateProposalPDF(id)
```

### 4. Cache Generated PDFs

```typescript
// ✅ GOOD: Cache PDFs to avoid regeneration
const cacheKey = `pdf:${proposalId}:${version}`
let pdf = await redis.get(cacheKey)

if (!pdf) {
  pdf = await generateProposalPDF(proposalId)
  await redis.set(cacheKey, pdf, 'EX', 3600) // 1 hour cache
}

// ❌ BAD: Generate every time
const pdf = await generateProposalPDF(proposalId)
```

### 5. Stream Large PDFs

```typescript
// ✅ GOOD: Stream for large PDFs
const stream = await generateProposalPDFStream(proposalId)
return new NextResponse(stream)

// ❌ BAD: Buffer entire PDF in memory
const buffer = await generateProposalPDF(proposalId) // Could be 10+ MB
```

---

## 🧪 Testing

### Unit Tests

```typescript
// __tests__/lib/pdf/generator.test.ts
import { PDFGenerator } from '@/lib/pdf/generator'
import { renderToBuffer } from '@react-pdf/renderer'

jest.mock('@react-pdf/renderer')

describe('PDFGenerator', () => {
  let generator: PDFGenerator

  beforeEach(() => {
    generator = new PDFGenerator()
  })

  it('should generate proposal PDF', async () => {
    const mockPDF = Buffer.from('mock-pdf-data')
    ;(renderToBuffer as jest.Mock).mockResolvedValue(mockPDF)

    const result = await generator.generateProposalPDF('prop_123')

    expect(result).toEqual(mockPDF)
    expect(renderToBuffer).toHaveBeenCalled()
  })

  it('should throw error for missing proposal', async () => {
    await expect(
      generator.generateProposalPDF('invalid_id')
    ).rejects.toThrow('Proposal not found')
  })

  it('should add watermark when requested', async () => {
    await generator.generateProposalPDF('prop_123', { watermark: true })

    const callArgs = (renderToBuffer as jest.Mock).mock.calls[0][0]
    expect(callArgs.props.options.watermark).toBe(true)
  })
})
```

### Integration Tests

```typescript
// __tests__/api/proposals/pdf.test.ts
describe('GET /api/proposals/[id]/pdf', () => {
  it('should return PDF file', async () => {
    const response = await fetch('/api/proposals/prop_123/pdf', {
      headers: { Authorization: `Bearer ${testToken}` },
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')

    const buffer = await response.arrayBuffer()
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  it('should require authentication', async () => {
    const response = await fetch('/api/proposals/prop_123/pdf')

    expect(response.status).toBe(401)
  })
})
```

---

## ⚠️ Common Pitfalls

### 1. Missing Font Files

```typescript
// ❌ BAD: Font not registered
Font.register({
  family: 'Inter',
  src: '/fonts/Inter.ttf', // File doesn't exist
})

// ✅ GOOD: Verify fonts exist
import { existsSync } from 'fs'

const fontPath = '/fonts/Inter.ttf'
if (!existsSync(fontPath)) {
  console.warn(`Font not found: ${fontPath}`)
}

Font.register({
  family: 'Inter',
  src: fontPath,
})
```

### 2. Not Handling Large Images

```typescript
// ❌ BAD: Large image causes memory issues
<Image src="/large-image.jpg" /> // 10 MB image

// ✅ GOOD: Optimize images
<Image
  src="/optimized-image.jpg" // Compressed to <500 KB
  cache={false}
/>
```

### 3. Synchronous PDF Generation in API Routes

```typescript
// ❌ BAD: Blocks event loop
export async function GET(request: NextRequest) {
  const pdf = await generateProposalPDF(id) // Blocks for 2-3 seconds
  return new NextResponse(pdf)
}

// ✅ GOOD: Use background job for large PDFs
export async function GET(request: NextRequest) {
  const job = await pdfQueue.add('generate-pdf', { proposalId: id })

  return NextResponse.json({
    jobId: job.id,
    status: 'processing',
    checkUrl: `/api/jobs/${job.id}`,
  })
}
```

---

## 📚 Related Documentation

- [Official React-PDF Docs](https://react-pdf.org/)
- [Communication Manager Agent](../../agents/communication/README.md)
- [Proposal Analysis Agent](../../agents/proposal-analysis/README.md)
- [Best Practices](../../guides/best-practices.md)

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Oct 20, 2025 | Initial PDF generation documentation |

---

**Next Steps**: Implement PDF generation in Communication Manager Agent
