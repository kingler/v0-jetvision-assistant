# Communication Manager Agent Implementation

**Task ID**: TASK-016
**Created**: 2025-10-20
**Assigned To**: AI/ML Engineer / Backend Developer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 8 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement the Communication Manager Agent using OpenAI GPT-4/5 to compose personalized proposal emails, integrate with Gmail MCP for email delivery, implement email template generation with client data, handle PDF proposal attachments, and track email delivery status.

### User Story
**As an** ISO agent
**I want** the system to automatically generate and send professional proposal emails
**So that** I can deliver proposals to clients quickly with consistent quality and personalization

### Business Value
The Communication Manager Agent completes the automation loop by delivering proposals to clients via professional, personalized emails. It ensures consistent branding, proper formatting, and timely delivery while tracking email status. This agent directly impacts customer experience and quote acceptance rates.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL implement Communication Manager as OpenAI Assistant
- Use OpenAI GPT-4/5 for email composition
- Generate personalized content based on client data
- Apply professional tone and formatting
- Support email templates with variable substitution

**FR-2**: System SHALL integrate with Gmail MCP
- Send emails via Gmail API
- Support HTML email formatting
- Handle PDF attachments
- Track delivery status and message IDs

**FR-3**: System SHALL generate email templates
- Personalized greeting with client name
- Flight details summary (route, date, passengers)
- Top 3 proposal options with prices
- Call-to-action for booking confirmation
- ISO agent signature and branding

**FR-4**: System SHALL handle PDF attachments
- Attach generated PDF proposals
- Support multiple attachments
- Validate file size limits (<25MB)
- Handle attachment errors gracefully

**FR-5**: System SHALL track email delivery
- Store message ID from Gmail API
- Track delivery status (sent, delivered, bounced)
- Record sent timestamp
- Link emails to requests in database

**FR-6**: System SHALL support email customization
- Configurable email subject line
- CC and BCC recipient support
- Custom sender name and reply-to
- Email signature management

### Acceptance Criteria

- [ ] **AC-1**: Communication Manager implemented as OpenAI Assistant
- [ ] **AC-2**: Gmail MCP integration sends emails successfully
- [ ] **AC-3**: Email templates are professional and personalized
- [ ] **AC-4**: PDF attachments are included correctly
- [ ] **AC-5**: Email delivery tracking works
- [ ] **AC-6**: All customization options functional
- [ ] **AC-7**: Unit tests achieve >75% coverage
- [ ] **AC-8**: Integration tests verify Gmail connectivity
- [ ] **AC-9**: Email generation completes in <10 seconds
- [ ] **AC-10**: Code review approved

### Non-Functional Requirements

- **Performance**: Email composition <5s, delivery <10s
- **Reliability**: 99% successful email delivery
- **Security**: OAuth 2.0 for Gmail access, no credential exposure
- **Formatting**: HTML emails render correctly across email clients

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/agents/communication-manager.test.ts
__tests__/integration/agents/email-delivery.test.ts
```

**Example Test**:
```typescript
// __tests__/unit/agents/communication-manager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CommunicationManagerAgent } from '@/lib/agents/communication-manager'

describe('CommunicationManagerAgent', () => {
  let agent: CommunicationManagerAgent

  beforeEach(() => {
    agent = new CommunicationManagerAgent({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      supabase: createClient(),
      mcpServerPath: './mcp-servers/gmail'
    })
  })

  describe('Email Composition', () => {
    it('should generate personalized email', async () => {
      const email = await agent.composeProposalEmail({
        client_name: 'John Doe',
        client_email: 'john.doe@example.com',
        route: 'KTEB → KVNY',
        passengers: 6,
        departure_date: '2025-11-15',
        proposals: [
          { aircraft_type: 'Citation XLS', total_price: 28750, rationale: 'Best value' }
        ]
      })

      expect(email).toHaveProperty('subject')
      expect(email).toHaveProperty('body')
      expect(email.body).toContain('John Doe')
      expect(email.body).toContain('Citation XLS')
    })

    it('should include all proposal details', async () => {
      const email = await agent.composeProposalEmail({
        client_name: 'Jane Smith',
        proposals: [
          { aircraft_type: 'Citation XLS', total_price: 28750 },
          { aircraft_type: 'Phenom 300', total_price: 22000 },
          { aircraft_type: 'G280', total_price: 38500 }
        ]
      })

      expect(email.body).toContain('Citation XLS')
      expect(email.body).toContain('Phenom 300')
      expect(email.body).toContain('G280')
    })

    it('should apply professional formatting', async () => {
      const email = await agent.composeProposalEmail({
        client_name: 'John Doe',
        proposals: []
      })

      expect(email.body).toContain('<html>')
      expect(email.body).toContain('<body>')
      expect(email.format).toBe('html')
    })

    it('should include call-to-action', async () => {
      const email = await agent.composeProposalEmail({
        client_name: 'John Doe',
        proposals: []
      })

      expect(email.body.toLowerCase()).toMatch(/confirm|book|reply|contact/)
    })
  })

  describe('Email Delivery', () => {
    it('should send email via Gmail MCP', async () => {
      const result = await agent.sendEmail({
        to: 'client@example.com',
        subject: 'Your Flight Proposal',
        body: '<h1>Proposal</h1>',
        attachments: []
      })

      expect(result).toHaveProperty('message_id')
      expect(result).toHaveProperty('status', 'sent')
    })

    it('should handle PDF attachments', async () => {
      const result = await agent.sendEmail({
        to: 'client@example.com',
        subject: 'Your Flight Proposal',
        body: '<h1>Proposal</h1>',
        attachments: [
          { filename: 'proposal.pdf', path: '/tmp/proposal.pdf' }
        ]
      })

      expect(result.status).toBe('sent')
    })

    it('should support CC and BCC', async () => {
      const result = await agent.sendEmail({
        to: 'client@example.com',
        cc: ['manager@company.com'],
        bcc: ['archive@company.com'],
        subject: 'Proposal',
        body: 'Content'
      })

      expect(result.status).toBe('sent')
    })

    it('should track delivery in database', async () => {
      const result = await agent.sendProposal({
        request_id: 'req-123',
        client_email: 'client@example.com',
        proposals: []
      })

      const { data } = await agent.supabase
        .from('communications')
        .select()
        .eq('request_id', 'req-123')
        .single()

      expect(data).toBeTruthy()
      expect(data.message_id).toBe(result.message_id)
    })
  })

  describe('Error Handling', () => {
    it('should handle Gmail API errors', async () => {
      vi.spyOn(agent, 'executeMCPTool').mockRejectedValue(
        new Error('Gmail API error')
      )

      await expect(
        agent.sendEmail({
          to: 'client@example.com',
          subject: 'Test',
          body: 'Test'
        })
      ).rejects.toThrow('Gmail API error')
    })

    it('should retry on transient failures', async () => {
      let attempts = 0
      vi.spyOn(agent, 'executeMCPTool').mockImplementation(async () => {
        attempts++
        if (attempts < 3) throw new Error('Transient error')
        return { message_id: 'msg-123' }
      })

      await agent.sendEmail({
        to: 'client@example.com',
        subject: 'Test',
        body: 'Test'
      })

      expect(attempts).toBe(3)
    })
  })
})
```

### Step 2: Implement Minimal Code (Green Phase)

```typescript
// lib/agents/communication-manager.ts
import OpenAI from 'openai'
import { SupabaseClient } from '@supabase/supabase-js'
import { MCPClient } from '@/lib/mcp/client'

interface CommunicationManagerConfig {
  openaiApiKey: string
  supabase: SupabaseClient
  mcpServerPath: string
}

export class CommunicationManagerAgent {
  private openai: OpenAI
  private supabase: SupabaseClient
  private mcpClient: MCPClient

  constructor(config: CommunicationManagerConfig) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey })
    this.supabase = config.supabase
    this.mcpClient = new MCPClient({
      serverPath: config.mcpServerPath,
      serverName: 'gmail'
    })
  }

  /**
   * Compose personalized proposal email
   */
  async composeProposalEmail(data: any): Promise<any> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a professional aviation proposal email writer.
          Compose a personalized, concise, professional email presenting flight proposals.
          Use HTML formatting. Include client name, flight details, and top 3 options.
          End with clear call-to-action. Return JSON with 'subject' and 'body'.`
        },
        {
          role: 'user',
          content: JSON.stringify(data)
        }
      ],
      response_format: { type: 'json_object' }
    })

    return {
      ...JSON.parse(completion.choices[0].message.content!),
      format: 'html'
    }
  }

  /**
   * Send email via Gmail MCP
   */
  async sendEmail(params: {
    to: string
    subject: string
    body: string
    cc?: string[]
    bcc?: string[]
    attachments?: any[]
  }): Promise<any> {
    const result = await this.executeMCPTool('send_email', {
      to: params.to,
      subject: params.subject,
      body: params.body,
      cc: params.cc,
      bcc: params.bcc,
      attachments: params.attachments,
      format: 'html'
    })

    return {
      message_id: result.message_id,
      status: 'sent'
    }
  }

  /**
   * Send complete proposal with email composition and delivery
   */
  async sendProposal(data: {
    request_id: string
    client_email: string
    client_name?: string
    proposals: any[]
    pdf_path?: string
  }): Promise<any> {
    // Compose email
    const email = await this.composeProposalEmail({
      client_name: data.client_name,
      client_email: data.client_email,
      proposals: data.proposals
    })

    // Prepare attachments
    const attachments = data.pdf_path
      ? [{ filename: 'proposal.pdf', path: data.pdf_path }]
      : []

    // Send email
    const result = await this.sendEmail({
      to: data.client_email,
      subject: email.subject,
      body: email.body,
      attachments
    })

    // Track in database
    await this.supabase
      .from('communications')
      .insert({
        request_id: data.request_id,
        type: 'email',
        recipient: data.client_email,
        subject: email.subject,
        body: email.body,
        message_id: result.message_id,
        status: 'sent',
        sent_at: new Date().toISOString()
      })

    return result
  }

  /**
   * Execute MCP tool
   */
  async executeMCPTool(toolName: string, params: any): Promise<any> {
    return await this.mcpClient.executeTool(toolName, params)
  }

  /**
   * Shutdown agent
   */
  async shutdown(): Promise<void> {
    await this.mcpClient.close()
  }
}
```

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] Review PRD.md section on Proposal Delivery (FR-7)
- [ ] TASK-009 (Gmail MCP) completed
- [ ] TASK-012 (Agent Tools) completed
- [ ] TASK-019 (PDF Generation) completed
- [ ] Gmail OAuth configured

### Step-by-Step Implementation

**Step 1**: Create Agent Core
- Implement CommunicationManagerAgent class
- Add email composition logic
- Integrate Gmail MCP

**Step 2**: Implement Email Templates
- Design HTML email template
- Add personalization logic
- Format proposal data

**Step 3**: Add Attachment Handling
- Integrate PDF attachment logic
- Validate file sizes
- Handle errors

**Step 4**: Implement Delivery Tracking
- Store email metadata in database
- Track message IDs
- Update communication status

**Step 5**: Write Tests and Create API

---

## 5-11. STANDARD SECTIONS

(Following same structure as previous tasks)

**Dependencies**:
- TASK-009: Gmail MCP Server Implementation
- TASK-012: Agent Tools & Helper Functions
- TASK-019: PDF Generation Service

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
