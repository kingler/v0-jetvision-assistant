# PDF Generation Service Implementation

**Task ID**: TASK-019
**Created**: 2025-10-20
**Assigned To**: Full Stack Developer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 8 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement a PDF generation service using jsPDF or Puppeteer to create professional flight proposals, develop a template system for consistent formatting, implement dynamic data population from quote data, apply JetVision branding and styling, and integrate with cloud storage (S3 or Supabase Storage) for PDF persistence.

### User Story
**As an** ISO agent
**I want** professional PDF proposals automatically generated for each flight request
**So that** I can send clients polished, branded proposals that enhance our company image

### Business Value
Professional PDF proposals differentiate JetVision from competitors by providing a consistent, high-quality customer experience. Well-designed proposals improve quote acceptance rates, build trust with clients, and reinforce brand identity. Automated generation eliminates manual document creation, saving hours per request.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL implement PDF generator using jsPDF or Puppeteer
- Choose optimal library (jsPDF for simple layouts, Puppeteer for complex)
- Generate multi-page PDFs (2-3 pages typical)
- Support embedded images (logos, aircraft photos)
- Ensure consistent page sizing (Letter/A4)

**FR-2**: System SHALL provide template system
- Header with JetVision branding and logo
- Flight details summary section
- Proposal options table (top 3 aircraft)
- Aircraft specifications and amenities
- Pricing breakdown with terms
- Footer with ISO agent contact info and legal disclaimers

**FR-3**: System SHALL populate templates with dynamic data
- Client name and contact info
- Flight route, date, passengers
- Aircraft details (type, capacity, range, speed)
- Pricing (base price, markup, total)
- Operator information and ratings
- Custom notes and special requirements

**FR-4**: System SHALL apply branding and styling
- JetVision logo and color scheme (Black, Cyan, Gray)
- Professional typography (consistent fonts and sizes)
- High-quality aircraft images (when available)
- Proper spacing, alignment, margins
- Page numbers and section headers

**FR-5**: System SHALL integrate with cloud storage
- Upload generated PDFs to Supabase Storage or AWS S3
- Generate signed URLs for secure access
- Set appropriate permissions (private, accessible via URL)
- Implement file naming convention (request_id_timestamp.pdf)
- Track storage URLs in database

**FR-6**: System SHALL support PDF customization
- Configurable markup display (show/hide)
- Optional sections (aircraft specs, operator details)
- Custom footer text per ISO agent
- Theme variations (professional, luxury, budget)

### Acceptance Criteria

- [ ] **AC-1**: PDF generator creates multi-page proposals
- [ ] **AC-2**: Template system produces professional layouts
- [ ] **AC-3**: Dynamic data populates correctly
- [ ] **AC-4**: Branding is consistent and professional
- [ ] **AC-5**: PDFs upload to cloud storage successfully
- [ ] **AC-6**: Customization options work as expected
- [ ] **AC-7**: Unit tests achieve >75% coverage
- [ ] **AC-8**: Integration tests verify end-to-end generation
- [ ] **AC-9**: PDF generation completes in <10 seconds
- [ ] **AC-10**: Generated PDFs are <5MB in size
- [ ] **AC-11**: Code review approved

### Non-Functional Requirements

- **Performance**: PDF generation <10s, file size <5MB
- **Quality**: 300 DPI images, crisp text rendering
- **Compatibility**: PDFs render correctly across all viewers
- **Storage**: Efficient file compression

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/services/pdf-generator.test.ts
__tests__/integration/services/pdf-generation-storage.test.ts
```

**Example Test**:
```typescript
// __tests__/unit/services/pdf-generator.test.ts
import { describe, it, expect } from 'vitest'
import { PDFGeneratorService } from '@/lib/services/pdf-generator'
import fs from 'fs'

describe('PDFGeneratorService', () => {
  let pdfService: PDFGeneratorService

  beforeEach(() => {
    pdfService = new PDFGeneratorService({
      storage: 'supabase',
      bucket: 'proposals'
    })
  })

  describe('PDF Generation', () => {
    it('should generate PDF from proposal data', async () => {
      const proposalData = {
        request_id: 'req-123',
        client_name: 'John Doe',
        client_email: 'john.doe@example.com',
        route: 'KTEB → KVNY',
        passengers: 6,
        departure_date: '2025-11-15',
        proposals: [
          {
            rank: 1,
            aircraft_type: 'Citation XLS',
            operator_name: 'Elite Aviation',
            total_price: 28750,
            rationale: 'Best value with excellent safety record'
          },
          {
            rank: 2,
            aircraft_type: 'Phenom 300',
            operator_name: 'Jet Charter Co',
            total_price: 22000,
            rationale: 'Most economical option'
          },
          {
            rank: 3,
            aircraft_type: 'Gulfstream G280',
            operator_name: 'Luxury Jets',
            total_price: 38500,
            rationale: 'Premium comfort and amenities'
          }
        ]
      }

      const result = await pdfService.generateProposal(proposalData)

      expect(result).toHaveProperty('pdf_path')
      expect(result).toHaveProperty('file_size')
      expect(result.file_size).toBeLessThan(5 * 1024 * 1024) // <5MB
    })

    it('should create multi-page PDF', async () => {
      const result = await pdfService.generateProposal(mockProposalData)

      const pdfBuffer = fs.readFileSync(result.pdf_path)
      const pageCount = await pdfService.getPageCount(pdfBuffer)

      expect(pageCount).toBeGreaterThanOrEqual(2)
    })

    it('should include JetVision branding', async () => {
      const result = await pdfService.generateProposal(mockProposalData)

      const pdfText = await pdfService.extractText(result.pdf_path)

      expect(pdfText).toContain('JetVision')
      // Verify logo image is embedded
      const hasLogo = await pdfService.hasEmbeddedImage(result.pdf_path, 'logo')
      expect(hasLogo).toBe(true)
    })

    it('should populate all proposal data', async () => {
      const result = await pdfService.generateProposal(mockProposalData)
      const pdfText = await pdfService.extractText(result.pdf_path)

      expect(pdfText).toContain('John Doe')
      expect(pdfText).toContain('KTEB → KVNY')
      expect(pdfText).toContain('Citation XLS')
      expect(pdfText).toContain('$28,750')
    })

    it('should format pricing correctly', async () => {
      const result = await pdfService.generateProposal(mockProposalData)
      const pdfText = await pdfService.extractText(result.pdf_path)

      // Check currency formatting
      expect(pdfText).toMatch(/\$\d{1,3}(,\d{3})*/)
    })
  })

  describe('Template System', () => {
    it('should use correct page layout', async () => {
      const result = await pdfService.generateProposal(mockProposalData)

      const pdfInfo = await pdfService.getPDFInfo(result.pdf_path)

      expect(pdfInfo.pageSize).toBe('Letter') // or A4
      expect(pdfInfo.orientation).toBe('portrait')
    })

    it('should include all required sections', async () => {
      const result = await pdfService.generateProposal(mockProposalData)
      const pdfText = await pdfService.extractText(result.pdf_path)

      const requiredSections = [
        'Flight Details',
        'Proposal Options',
        'Aircraft Specifications',
        'Pricing',
        'Contact Information'
      ]

      requiredSections.forEach(section => {
        expect(pdfText).toContain(section)
      })
    })

    it('should apply consistent styling', async () => {
      const result = await pdfService.generateProposal(mockProposalData)

      // Verify fonts, colors, spacing are consistent
      const styles = await pdfService.extractStyles(result.pdf_path)

      expect(styles.fonts).toContain('Helvetica')
      expect(styles.colors).toContain('#06B6D4') // Cyan brand color
    })
  })

  describe('Cloud Storage Integration', () => {
    it('should upload PDF to storage', async () => {
      const result = await pdfService.generateAndUpload(mockProposalData)

      expect(result).toHaveProperty('storage_url')
      expect(result).toHaveProperty('storage_path')
      expect(result.storage_url).toMatch(/^https?:\/\//)
    })

    it('should generate signed URL', async () => {
      const result = await pdfService.generateAndUpload(mockProposalData)

      expect(result.storage_url).toBeDefined()

      // Verify URL is accessible
      const response = await fetch(result.storage_url)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('application/pdf')
    })

    it('should use correct file naming', async () => {
      const result = await pdfService.generateAndUpload({
        ...mockProposalData,
        request_id: 'req-123'
      })

      expect(result.storage_path).toMatch(/^req-123_\d+\.pdf$/)
    })

    it('should store URL in database', async () => {
      const result = await pdfService.generateAndUpload({
        ...mockProposalData,
        request_id: 'req-123'
      })

      const { data } = await supabase
        .from('flight_requests')
        .select('pdf_url')
        .eq('id', 'req-123')
        .single()

      expect(data.pdf_url).toBe(result.storage_url)
    })
  })

  describe('Customization', () => {
    it('should support markup display toggle', async () => {
      const withMarkup = await pdfService.generateProposal({
        ...mockProposalData,
        show_markup: true
      })

      const withoutMarkup = await pdfService.generateProposal({
        ...mockProposalData,
        show_markup: false
      })

      const textWith = await pdfService.extractText(withMarkup.pdf_path)
      const textWithout = await pdfService.extractText(withoutMarkup.pdf_path)

      expect(textWith).toContain('Markup')
      expect(textWithout).not.toContain('Markup')
    })

    it('should apply custom footer', async () => {
      const result = await pdfService.generateProposal({
        ...mockProposalData,
        footer_text: 'Custom Footer - Contact: agent@jetvision.com'
      })

      const pdfText = await pdfService.extractText(result.pdf_path)

      expect(pdfText).toContain('agent@jetvision.com')
    })

    it('should support theme variations', async () => {
      const luxuryTheme = await pdfService.generateProposal({
        ...mockProposalData,
        theme: 'luxury'
      })

      // Verify luxury theme styling
      const styles = await pdfService.extractStyles(luxuryTheme.pdf_path)
      expect(styles.colors).toContain('#000000') // Gold accent for luxury
    })
  })

  describe('Performance', () => {
    it('should generate PDF in under 10 seconds', async () => {
      const start = Date.now()

      await pdfService.generateProposal(mockProposalData)

      const duration = Date.now() - start
      expect(duration).toBeLessThan(10000)
    })

    it('should compress PDF efficiently', async () => {
      const result = await pdfService.generateProposal(mockProposalData)

      const stats = fs.statSync(result.pdf_path)
      expect(stats.size).toBeLessThan(5 * 1024 * 1024) // <5MB
    })
  })

  describe('Error Handling', () => {
    it('should handle missing data gracefully', async () => {
      const incompleteData = {
        client_name: 'John Doe',
        // Missing other required fields
      }

      await expect(
        pdfService.generateProposal(incompleteData as any)
      ).rejects.toThrow('Missing required fields')
    })

    it('should handle storage upload failures', async () => {
      // Mock storage failure
      vi.spyOn(pdfService, 'uploadToStorage').mockRejectedValue(
        new Error('Upload failed')
      )

      await expect(
        pdfService.generateAndUpload(mockProposalData)
      ).rejects.toThrow('Upload failed')
    })
  })
})
```

### Step 2: Implement PDF Generator (Green Phase)

```typescript
// lib/services/pdf-generator.ts
import jsPDF from 'jspdf'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

interface PDFGeneratorConfig {
  storage: 'supabase' | 's3'
  bucket: string
}

interface ProposalData {
  request_id: string
  client_name: string
  client_email: string
  route: string
  passengers: number
  departure_date: string
  proposals: Array<{
    rank: number
    aircraft_type: string
    operator_name: string
    total_price: number
    rationale: string
    aircraft_specs?: any
  }>
  show_markup?: boolean
  footer_text?: string
  theme?: 'professional' | 'luxury' | 'budget'
}

export class PDFGeneratorService {
  private config: PDFGeneratorConfig
  private supabase: any

  constructor(config: PDFGeneratorConfig) {
    this.config = config

    if (config.storage === 'supabase') {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      )
    }
  }

  /**
   * Generate PDF proposal
   */
  async generateProposal(data: ProposalData): Promise<{
    pdf_path: string
    file_size: number
  }> {
    const doc = new jsPDF()

    // Page 1: Header and Flight Details
    this.addHeader(doc, data)
    this.addFlightDetails(doc, data)

    // Page 1: Top 3 Proposals
    this.addProposalOptions(doc, data.proposals)

    // Page 2: Detailed specifications
    doc.addPage()
    this.addAircraftSpecifications(doc, data.proposals)

    // Footer on all pages
    this.addFooter(doc, data)

    // Save to file
    const filename = `${data.request_id}_${Date.now()}.pdf`
    const filepath = path.join('/tmp', filename)

    doc.save(filepath)

    const stats = fs.statSync(filepath)

    return {
      pdf_path: filepath,
      file_size: stats.size
    }
  }

  /**
   * Generate and upload to cloud storage
   */
  async generateAndUpload(data: ProposalData): Promise<{
    storage_url: string
    storage_path: string
    pdf_path: string
  }> {
    const result = await this.generateProposal(data)

    const storagePath = `proposals/${data.request_id}_${Date.now()}.pdf`

    let storageUrl: string

    if (this.config.storage === 'supabase') {
      const pdfBuffer = fs.readFileSync(result.pdf_path)

      const { data: uploadData, error } = await this.supabase
        .storage
        .from(this.config.bucket)
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        })

      if (error) throw error

      // Get signed URL (valid for 1 year)
      const { data: urlData } = await this.supabase
        .storage
        .from(this.config.bucket)
        .createSignedUrl(storagePath, 31536000)

      storageUrl = urlData.signedUrl
    } else {
      // S3 upload logic
      throw new Error('S3 not implemented yet')
    }

    // Update database
    await this.supabase
      .from('flight_requests')
      .update({ pdf_url: storageUrl })
      .eq('id', data.request_id)

    return {
      storage_url: storageUrl,
      storage_path: storagePath,
      pdf_path: result.pdf_path
    }
  }

  /**
   * Add header with branding
   */
  private addHeader(doc: jsPDF, data: ProposalData): void {
    // Add logo
    // doc.addImage(logoImage, 'PNG', 10, 10, 50, 20)

    // Title
    doc.setFontSize(24)
    doc.setTextColor(0, 0, 0)
    doc.text('Flight Proposal', 70, 20)

    // Client name
    doc.setFontSize(14)
    doc.text(`Prepared for: ${data.client_name}`, 70, 30)

    // Date
    doc.setFontSize(10)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 70, 36)
  }

  /**
   * Add flight details section
   */
  private addFlightDetails(doc: jsPDF, data: ProposalData): void {
    let y = 50

    doc.setFontSize(16)
    doc.text('Flight Details', 10, y)
    y += 10

    doc.setFontSize(12)
    doc.text(`Route: ${data.route}`, 10, y)
    y += 6
    doc.text(`Passengers: ${data.passengers}`, 10, y)
    y += 6
    doc.text(`Departure Date: ${data.departure_date}`, 10, y)
    y += 10
  }

  /**
   * Add proposal options table
   */
  private addProposalOptions(doc: jsPDF, proposals: any[]): void {
    let y = 85

    doc.setFontSize(16)
    doc.text('Recommended Options', 10, y)
    y += 10

    proposals.forEach((proposal, index) => {
      doc.setFontSize(14)
      doc.text(`Option ${proposal.rank}: ${proposal.aircraft_type}`, 10, y)
      y += 6

      doc.setFontSize(11)
      doc.text(`Operator: ${proposal.operator_name}`, 10, y)
      y += 5
      doc.text(`Price: $${proposal.total_price.toLocaleString()}`, 10, y)
      y += 5
      doc.text(`${proposal.rationale}`, 10, y, { maxWidth: 180 })
      y += 10
    })
  }

  /**
   * Add aircraft specifications
   */
  private addAircraftSpecifications(doc: jsPDF, proposals: any[]): void {
    let y = 20

    doc.setFontSize(16)
    doc.text('Aircraft Specifications', 10, y)
    y += 10

    // Add specs for each aircraft
    proposals.forEach((proposal) => {
      doc.setFontSize(12)
      doc.text(proposal.aircraft_type, 10, y)
      y += 6

      if (proposal.aircraft_specs) {
        doc.setFontSize(10)
        doc.text(`Capacity: ${proposal.aircraft_specs.capacity} passengers`, 10, y)
        y += 5
        doc.text(`Range: ${proposal.aircraft_specs.range_nm} nm`, 10, y)
        y += 5
        doc.text(`Speed: ${proposal.aircraft_specs.speed_kts} kts`, 10, y)
        y += 10
      }
    })
  }

  /**
   * Add footer to all pages
   */
  private addFooter(doc: jsPDF, data: ProposalData): void {
    const pageCount = doc.getNumberOfPages()

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)

      // Footer text
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)

      const footerText = data.footer_text || 'JetVision - Premium Private Aviation'
      doc.text(footerText, 10, 285)

      // Page number
      doc.text(`Page ${i} of ${pageCount}`, 180, 285)
    }
  }

  /**
   * Upload to storage
   */
  async uploadToStorage(filepath: string, storagePath: string): Promise<string> {
    // Implementation depends on storage provider
    return ''
  }
}
```

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] Review PRD.md section on Proposal Generation (FR-7)
- [ ] TASK-002 (Database) completed
- [ ] TASK-005 (Supabase Client) completed
- [ ] Supabase Storage bucket created
- [ ] JetVision logo and branding assets available

### Step-by-Step Implementation

**Step 1**: Choose PDF Library
- Evaluate jsPDF vs Puppeteer
- Install chosen library
- Set up basic configuration

**Step 2**: Create Template System
- Design page layouts
- Create section components
- Apply styling and branding

**Step 3**: Implement Data Population
- Map proposal data to template
- Format currency and dates
- Handle missing data gracefully

**Step 4**: Add Cloud Storage Integration
- Set up Supabase Storage bucket
- Implement upload logic
- Generate signed URLs

**Step 5**: Add Customization Options
- Implement theme variations
- Add optional sections
- Support custom footer

**Step 6**: Write Tests and Optimize
- Unit tests for all methods
- Integration tests for storage
- Performance optimization

---

## 5-11. STANDARD SECTIONS

(Following same structure as previous tasks)

**Dependencies**:
- TASK-002: Supabase Database Schema Deployment
- TASK-005: Supabase Client Implementation

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
