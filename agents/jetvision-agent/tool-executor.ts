/**
 * JetvisionAgent Tool Executor
 *
 * Unified tool execution layer that routes tool calls to the appropriate
 * MCP server:
 * - Avinode MCP (flight operations)
 * - Supabase MCP (database/CRM via mcp-helpers)
 * - Gmail MCP (email)
 */

import type { ToolName, ToolResult, AgentContext } from './types';
import { getToolCategory } from './tools';

// Import Supabase MCP helpers
import {
  queryTable,
  insertRow,
  updateRow,
  countRows,
  type QueryOptions,
} from '@/lib/supabase/mcp-helpers';

// Import Proposal Service for rich proposal operations
import {
  createProposalWithResolution,
  getProposalById,
  getProposalsByRequest,
  updateProposalSent,
  updateProposalStatus,
} from '@/lib/services/proposal-service';

// =============================================================================
// MCP SERVER INTERFACES
// =============================================================================

interface AvinodeMCPServer {
  callTool(name: string, params: Record<string, unknown>): Promise<unknown>;
  isConnected(): boolean;
}

interface GmailMCPServer {
  sendEmail(params: {
    to: string;
    subject: string;
    body_html: string;
    body_text?: string;
    cc?: string[];
    bcc?: string[];
  }): Promise<{ messageId: string; threadId: string }>;
  searchEmails?(params: {
    query: string;
    maxResults?: number;
    from?: string;
    to?: string;
    subject?: string;
    after?: string;
    before?: string;
  }): Promise<unknown[]>;
  getEmail?(params: { emailId: string }): Promise<unknown>;
}

// =============================================================================
// TOOL EXECUTOR CLASS
// =============================================================================

export class ToolExecutor {
  private avinodeMCP: AvinodeMCPServer | null = null;
  private gmailMCP: GmailMCPServer | null = null;
  private context: AgentContext;

  constructor(context: AgentContext) {
    this.context = context;
  }

  /**
   * Set the Avinode MCP server instance
   */
  setAvinodeMCP(mcp: AvinodeMCPServer): void {
    this.avinodeMCP = mcp;
  }

  /**
   * Set the Gmail MCP server instance
   */
  setGmailMCP(mcp: GmailMCPServer): void {
    this.gmailMCP = mcp;
  }

  /**
   * Execute a tool by name with parameters
   */
  async execute<T extends ToolName>(
    name: T,
    params: Record<string, unknown>
  ): Promise<ToolResult<T>> {
    const category = getToolCategory(name);

    try {
      let data: unknown;

      switch (category) {
        case 'avinode':
          data = await this.executeAvinodeTool(name, params);
          break;
        case 'database':
          data = await this.executeDatabaseTool(name, params);
          break;
        case 'gmail':
          data = await this.executeGmailTool(name, params);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        name,
        success: true,
        data: data as ToolResult<T>['data'],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[ToolExecutor] Error executing ${name}:`, errorMessage);

      return {
        name,
        success: false,
        error: errorMessage,
      };
    }
  }

  // ===========================================================================
  // AVINODE MCP TOOL EXECUTION
  // ===========================================================================

  private async executeAvinodeTool(
    name: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.avinodeMCP) {
      throw new Error('Avinode MCP server not connected');
    }

    // Route to Avinode MCP server
    const result = await this.avinodeMCP.callTool(name, params);
    return result;
  }

  // ===========================================================================
  // DATABASE (SUPABASE MCP) TOOL EXECUTION
  // ===========================================================================

  private async executeDatabaseTool(
    name: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    switch (name) {
      case 'get_client':
        return this.getClient(params);
      case 'list_clients':
        return this.listClients(params);
      case 'create_client':
        return this.createClient(params);
      case 'update_client':
        return this.updateClient(params);
      case 'get_request':
        return this.getRequest(params);
      case 'list_requests':
        return this.listRequests(params);
      case 'get_quotes':
        return this.getQuotes(params);
      case 'update_quote_status':
        return this.updateQuoteStatus(params);
      case 'get_operator':
        return this.getOperator(params);
      case 'list_preferred_operators':
        return this.listPreferredOperators(params);
      case 'create_proposal':
        return this.createProposal(params);
      case 'get_proposal':
        return this.getProposal(params);
      case 'generate_contract':
        return this.generateContract(params);
      case 'confirm_payment':
        return this.confirmPayment(params);
      default:
        throw new Error(`Unknown database tool: ${name}`);
    }
  }

  private async getClient(params: Record<string, unknown>): Promise<unknown> {
    const { client_id, email } = params;

    const filters: Record<string, unknown> = {
      iso_agent_id: this.context.isoAgentId,
    };

    if (client_id) {
      filters.id = client_id;
    } else if (email) {
      filters.email = email;
    } else {
      throw new Error('Either client_id or email is required');
    }

    const result = await queryTable('client_profiles', {
      filter: filters,
      limit: 1,
    });

    if (result.error) throw new Error(result.error);
    return result.data?.[0] || null;
  }

  private async listClients(params: Record<string, unknown>): Promise<{ clients: unknown[]; total: number }> {
    const { search, limit = 20 } = params;

    const options: QueryOptions = {
      filter: {
        iso_agent_id: this.context.isoAgentId,
        is_active: true,
      },
      orderBy: { column: 'updated_at', ascending: false },
      limit: limit as number,
    };

    // Note: For search functionality, we'd need to use a more complex query
    // The mcp-helpers don't support ILIKE directly, so for now we filter in memory
    const result = await queryTable('client_profiles', options);

    if (result.error) throw new Error(result.error);

    let clients = result.data || [];

    // Filter by search term if provided
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      clients = (clients as unknown[]).filter((c): c is Record<string, unknown> => {
        const client = c as Record<string, unknown>;
        return (
          (client.company_name as string)?.toLowerCase().includes(searchLower) ||
          (client.contact_name as string)?.toLowerCase().includes(searchLower) ||
          (client.email as string)?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Get count
    const countResult = await countRows('client_profiles', {
      iso_agent_id: this.context.isoAgentId,
      is_active: true,
    });

    return { clients, total: countResult.count || 0 };
  }

  private async createClient(params: Record<string, unknown>): Promise<unknown> {
    const result = await insertRow('client_profiles', {
      iso_agent_id: this.context.isoAgentId,
      company_name: params.company_name,
      contact_name: params.contact_name,
      email: params.email,
      phone: params.phone,
      notes: params.notes,
      preferences: params.preferences,
      is_active: true,
    });

    if (result.error) throw new Error(result.error);
    return result.data;
  }

  private async updateClient(params: Record<string, unknown>): Promise<unknown> {
    const { client_id, ...updates } = params;

    const result = await updateRow(
      'client_profiles',
      { id: client_id, iso_agent_id: this.context.isoAgentId },
      { ...updates, updated_at: new Date().toISOString() }
    );

    if (result.error) throw new Error(result.error);
    return result.data?.[0] || null;
  }

  private async getRequest(params: Record<string, unknown>): Promise<unknown> {
    const { request_id } = params;

    const result = await queryTable('requests', {
      filter: {
        id: request_id,
        iso_agent_id: this.context.isoAgentId,
      },
      limit: 1,
    });

    if (result.error) throw new Error(result.error);
    return result.data?.[0] || null;
  }

  private async listRequests(params: Record<string, unknown>): Promise<{ requests: unknown[]; total: number }> {
    const { status, client_id, limit = 20 } = params;

    const filter: Record<string, unknown> = {
      iso_agent_id: this.context.isoAgentId,
    };

    if (status) filter.status = status;
    if (client_id) filter.client_profile_id = client_id;

    const result = await queryTable('requests', {
      filter,
      orderBy: { column: 'created_at', ascending: false },
      limit: limit as number,
    });

    if (result.error) throw new Error(result.error);

    const countResult = await countRows('requests', filter);

    return { requests: result.data || [], total: countResult.count || 0 };
  }

  private async getQuotes(params: Record<string, unknown>): Promise<{ quotes: unknown[] }> {
    const { request_id } = params;

    const result = await queryTable('quotes', {
      filter: { request_id },
      orderBy: { column: 'total_price', ascending: true },
    });

    if (result.error) throw new Error(result.error);
    return { quotes: result.data || [] };
  }

  private async updateQuoteStatus(params: Record<string, unknown>): Promise<unknown> {
    const { quote_id, status, notes } = params;

    const result = await updateRow(
      'quotes',
      { id: quote_id },
      {
        status,
        analysis_notes: notes,
        updated_at: new Date().toISOString(),
      }
    );

    if (result.error) throw new Error(result.error);
    return result.data?.[0] || null;
  }

  private async getOperator(params: Record<string, unknown>): Promise<unknown> {
    const { operator_id, avinode_operator_id } = params;

    const filter: Record<string, unknown> = {};

    if (operator_id) {
      filter.id = operator_id;
    } else if (avinode_operator_id) {
      filter.avinode_operator_id = avinode_operator_id;
    } else {
      throw new Error('Either operator_id or avinode_operator_id is required');
    }

    // Note: operator_profiles table may not exist in VALID_TABLES
    // Fall back to a simple query approach
    const result = await queryTable('iso_agents', {
      filter,
      limit: 1,
    });

    if (result.error) throw new Error(result.error);
    return result.data?.[0] || null;
  }

  private async listPreferredOperators(params: Record<string, unknown>): Promise<{ operators: unknown[] }> {
    // Note: This would need a proper operator_profiles table
    // For now, return empty array as operators are managed via Avinode
    console.log('[ToolExecutor] listPreferredOperators called with:', params);
    return { operators: [] };
  }

  private async createProposal(params: Record<string, unknown>): Promise<unknown> {
    const { request_id, quote_id, title, margin_applied, trip_id, customer_email } = params;

    // Use proposal-service with automatic resolution of trip_id and customer_email
    const result = await createProposalWithResolution(
      {
        request_id: request_id as string | undefined,
        quote_id: quote_id as string | undefined,
        iso_agent_id: this.context.isoAgentId,
        title: (title as string) || 'Charter Flight Proposal',
        margin_applied: margin_applied as number | undefined,
        file_name: '', // Will be set when PDF is generated
        file_url: '',
      },
      trip_id as string | undefined,
      customer_email as string | undefined
    );

    if (!result) {
      throw new Error('Failed to create proposal - could not resolve request from trip_id');
    }

    console.log('[ToolExecutor] Created proposal via proposal-service:', result);
    return result;
  }

  private async getProposal(params: Record<string, unknown>): Promise<unknown> {
    const { proposal_id, request_id } = params;

    // Get by proposal ID
    if (proposal_id) {
      const proposal = await getProposalById(proposal_id as string);
      return proposal;
    }

    // Get all proposals for a request
    if (request_id) {
      const proposals = await getProposalsByRequest(request_id as string);
      return proposals;
    }

    throw new Error('Either proposal_id or request_id is required');
  }

  private async generateContract(params: Record<string, unknown>): Promise<unknown> {
    const { proposal_id, request_id } = params;

    if (!proposal_id || !request_id) {
      throw new Error('proposal_id and request_id are required');
    }

    // Fetch the proposal to get pricing and customer data
    const proposal = await getProposalById(proposal_id as string);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposal_id}`);
    }

    // Create contract record via service
    const { createContract } = await import('@/lib/services/contract-service');

    const contract = await createContract({
      request_id: request_id as string,
      iso_agent_id: this.context.isoAgentId,
      proposal_id: proposal_id as string,
      customer: {
        name: proposal.sent_to_name || 'Customer',
        email: proposal.sent_to_email || '',
      },
      flightDetails: {
        departureAirport: { icao: (proposal.metadata as Record<string, unknown>)?.departure_airport as string || '' },
        arrivalAirport: { icao: (proposal.metadata as Record<string, unknown>)?.arrival_airport as string || '' },
        departureDate: (proposal.metadata as Record<string, unknown>)?.departure_date as string || '',
        aircraftType: (proposal.metadata as Record<string, unknown>)?.aircraft_type as string || '',
        passengers: (proposal.metadata as Record<string, unknown>)?.passengers as number || 1,
      },
      pricing: {
        flightCost: proposal.total_amount || 0,
        federalExciseTax: 0,
        domesticSegmentFee: 0,
        subtotal: proposal.total_amount || 0,
        creditCardFeePercentage: 0,
        totalAmount: proposal.final_amount || proposal.total_amount || 0,
        currency: 'USD',
      },
    });

    return {
      contractId: contract.id,
      contractNumber: contract.contract_number,
      status: contract.status,
      message: `Contract ${contract.contract_number} created successfully`,
    };
  }

  private async confirmPayment(params: Record<string, unknown>): Promise<unknown> {
    const { contract_id, payment_amount, payment_method, payment_reference } = params;

    if (!contract_id || !payment_amount || !payment_method || !payment_reference) {
      throw new Error('contract_id, payment_amount, payment_method, and payment_reference are required');
    }

    const { updateContractPayment, completeContract } = await import('@/lib/services/contract-service');

    // Record payment
    const paymentResult = await updateContractPayment(contract_id as string, {
      payment_reference: payment_reference as string,
      payment_amount: payment_amount as number,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: payment_method as 'wire' | 'credit_card',
    });

    // Complete the contract
    const completed = await completeContract(contract_id as string);

    return {
      contractId: paymentResult.id,
      contractNumber: paymentResult.contract_number,
      status: completed.status,
      paymentReference: paymentResult.payment_reference,
      paymentAmount: paymentResult.payment_amount,
      message: `Payment of ${payment_amount} recorded. Contract ${paymentResult.contract_number} is now complete.`,
    };
  }

  // ===========================================================================
  // GMAIL MCP TOOL EXECUTION
  // ===========================================================================

  private async executeGmailTool(
    name: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    switch (name) {
      case 'send_email':
        return this.sendEmail(params);
      case 'prepare_proposal_email':
        return this.prepareProposalEmail(params);
      case 'send_proposal_email':
        return this.sendProposalEmail(params);
      case 'send_quote_email':
        return this.sendQuoteEmail(params);
      default:
        throw new Error(`Unknown Gmail tool: ${name}`);
    }
  }

  private async sendEmail(params: Record<string, unknown>): Promise<{ message_id: string; sent_at: string }> {
    if (!this.gmailMCP) {
      // Fallback: log the email (for development without Gmail MCP)
      console.log('[ToolExecutor] Gmail MCP not connected. Email would be sent:', params);
      return {
        message_id: `mock-${Date.now()}`,
        sent_at: new Date().toISOString(),
      };
    }

    const result = await this.gmailMCP.sendEmail({
      to: params.to as string,
      subject: params.subject as string,
      body_html: (params.body_html || params.body) as string,
      body_text: params.body_text as string | undefined,
      cc: params.cc ? (params.cc as string).split(',') : undefined,
    });

    return {
      message_id: result.messageId,
      sent_at: new Date().toISOString(),
    };
  }

  /**
   * Prepare a proposal email for user review (human-in-the-loop approval).
   * Returns email draft data without sending - user must approve via UI.
   */
  private async prepareProposalEmail(params: Record<string, unknown>): Promise<{
    status: 'pending_approval';
    proposal_id: string;
    proposal_number?: string;
    to: { email: string; name: string };
    subject: string;
    body: string;
    attachments: Array<{ name: string; url: string; size?: number }>;
    flight_details?: {
      departure_airport: string;
      arrival_airport: string;
      departure_date: string;
      passengers?: number;
    };
    pricing?: {
      subtotal: number;
      total: number;
      currency: string;
    };
    generated_at: string;
    request_id?: string;
  }> {
    const { proposal_id, to_email, to_name, custom_message, request_id } = params;

    // Get proposal details using proposal-service
    const proposal = await getProposalById(proposal_id as string);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposal_id}`);
    }

    // Get request details for context
    const request = await this.getRequest({ request_id: proposal.request_id }) as Record<string, unknown> | null;

    // Build email subject
    const subject = `Charter Flight Proposal: ${proposal.title || proposal.proposal_number}`;

    // Build email body
    const body = this.buildProposalEmailBody(
      proposal as unknown as Record<string, unknown>,
      request,
      to_name as string,
      custom_message as string
    );

    // Build attachments list (PDF proposal)
    const attachments: Array<{ name: string; url: string; size?: number }> = [];
    if (proposal.file_url) {
      attachments.push({
        name: proposal.file_name || 'proposal.pdf',
        url: proposal.file_url,
        size: proposal.file_size_bytes ?? undefined,
      });
    }

    // Build flight details from request
    const flight_details = request ? {
      departure_airport: (request.departure_airport as string) || 'TBD',
      arrival_airport: (request.arrival_airport as string) || 'TBD',
      departure_date: (request.departure_date as string) || 'TBD',
      passengers: request.passengers as number | undefined,
    } : undefined;

    // Build pricing from proposal
    const pricing = proposal.total_amount ? {
      subtotal: proposal.total_amount,
      total: proposal.final_amount || proposal.total_amount,
      currency: 'USD',
    } : undefined;

    const generated_at = new Date().toISOString();

    // Update proposal with draft email data for persistence
    try {
      await updateRow(
        'proposals',
        { id: proposal_id },
        {
          email_approval_status: 'pending',
          email_draft_subject: subject,
          email_draft_body: body,
          email_draft_generated_at: generated_at,
          updated_at: new Date().toISOString(),
        }
      );
      console.log('[ToolExecutor] Updated proposal with email draft:', proposal_id);
    } catch (updateError) {
      console.warn('[ToolExecutor] Could not update proposal with draft:', updateError);
      // Continue - the draft can still be shown to user
    }

    return {
      status: 'pending_approval',
      proposal_id: proposal_id as string,
      proposal_number: proposal.proposal_number,
      to: {
        email: to_email as string,
        name: to_name as string,
      },
      subject,
      body,
      attachments,
      flight_details,
      pricing,
      generated_at,
      request_id: (request_id as string) || proposal.request_id,
    };
  }

  private async sendProposalEmail(params: Record<string, unknown>): Promise<{
    message_id: string;
    proposal_url: string;
    sent_at: string;
    proposal_number: string;
  }> {
    const { proposal_id, to_email, to_name, custom_message } = params;

    // Get proposal details using proposal-service
    const proposal = await getProposalById(proposal_id as string);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposal_id}`);
    }

    // Get request details for context
    const request = await this.getRequest({ request_id: proposal.request_id }) as Record<string, unknown> | null;

    // Build email content
    const subject = `Charter Flight Proposal: ${proposal.title || proposal.proposal_number}`;
    const body = this.buildProposalEmailBody(
      proposal as unknown as Record<string, unknown>,
      request,
      to_name as string,
      custom_message as string
    );

    // Send email
    const emailResult = await this.sendEmail({
      to: to_email,
      subject,
      body_html: body,
    });

    // Update proposal status using proposal-service with full email metadata
    const updateResult = await updateProposalSent(proposal_id as string, {
      sent_to_email: to_email as string,
      sent_to_name: (to_name as string) || 'Customer',
      email_subject: subject,
      email_body: body,
      email_message_id: emailResult.message_id,
    });

    console.log('[ToolExecutor] Proposal sent via proposal-service:', updateResult);

    return {
      message_id: emailResult.message_id,
      proposal_url: proposal.file_url || '',
      sent_at: updateResult.sent_at || emailResult.sent_at,
      proposal_number: updateResult.proposal_number,
    };
  }

  private async sendQuoteEmail(params: Record<string, unknown>): Promise<{
    message_id: string;
    sent_at: string;
  }> {
    const { request_id, quote_ids, to_email, to_name, custom_message } = params;

    // Get quotes
    const quoteIdList = (quote_ids as string).split(',');
    const allQuotes = await this.getQuotes({ request_id });
    const quotes = (allQuotes.quotes as Record<string, unknown>[]).filter(
      (q) => quoteIdList.includes(q.id as string)
    );

    // Get request details
    const request = await this.getRequest({ request_id }) as Record<string, unknown> | null;

    // Build email content
    const subject = `Charter Flight Quotes: ${request?.departure_airport} to ${request?.arrival_airport}`;
    const body = this.buildQuoteEmailBody(quotes, request, to_name as string, custom_message as string);

    // Send email
    const emailResult = await this.sendEmail({
      to: to_email,
      subject,
      body_html: body,
    });

    return {
      message_id: emailResult.message_id,
      sent_at: emailResult.sent_at,
    };
  }

  // ===========================================================================
  // EMAIL TEMPLATE HELPERS
  // ===========================================================================

  private buildProposalEmailBody(
    proposal: Record<string, unknown>,
    request: Record<string, unknown> | null,
    recipientName: string,
    customMessage?: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Charter Flight Proposal</h2>
        <p>Dear ${recipientName},</p>
        ${customMessage ? `<p>${customMessage}</p>` : ''}
        <p>Please find attached your charter flight proposal for the following trip:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Route:</strong> ${request?.departure_airport || 'TBD'} → ${request?.arrival_airport || 'TBD'}</p>
          <p><strong>Date:</strong> ${request?.departure_date || 'TBD'}</p>
          <p><strong>Passengers:</strong> ${request?.passengers || 'TBD'}</p>
          ${proposal.total_amount ? `<p><strong>Total:</strong> $${(proposal.total_amount as number).toLocaleString()}</p>` : ''}
        </div>
        <p>
          <a href="${proposal.file_url}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Proposal
          </a>
        </p>
        <p>Please don't hesitate to reach out if you have any questions.</p>
        <p>Best regards,<br>Your Charter Team</p>
      </div>
    `;
  }

  private buildQuoteEmailBody(
    quotes: Record<string, unknown>[],
    request: Record<string, unknown> | null,
    recipientName: string,
    customMessage?: string
  ): string {
    const quoteRows = quotes
      .map(
        (q) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${q.operator_name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${q.aircraft_type}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">$${(q.total_price as number)?.toLocaleString() || 'TBD'}</td>
        </tr>
      `
      )
      .join('');

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Charter Flight Quotes</h2>
        <p>Dear ${recipientName},</p>
        ${customMessage ? `<p>${customMessage}</p>` : ''}
        <p>We have received the following quotes for your trip:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Route:</strong> ${request?.departure_airport || 'TBD'} → ${request?.arrival_airport || 'TBD'}</p>
          <p><strong>Date:</strong> ${request?.departure_date || 'TBD'}</p>
          <p><strong>Passengers:</strong> ${request?.passengers || 'TBD'}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #007bff; color: white;">
              <th style="padding: 10px; text-align: left;">Operator</th>
              <th style="padding: 10px; text-align: left;">Aircraft</th>
              <th style="padding: 10px; text-align: left;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${quoteRows}
          </tbody>
        </table>
        <p>Please let us know which option works best for you.</p>
        <p>Best regards,<br>Your Charter Team</p>
      </div>
    `;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createToolExecutor(context: AgentContext): ToolExecutor {
  return new ToolExecutor(context);
}
