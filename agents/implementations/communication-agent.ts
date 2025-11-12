/**
 * Communication Agent Implementation
 *
 * Generates and sends proposal emails to clients.
 * Formats flight quotes and sends via Gmail MCP server.
 */

import { BaseAgent } from '../core/base-agent';
import type {
  AgentContext,
  AgentResult,
  AgentConfig,
} from '../core/types';
import { AgentType, AgentStatus } from '../core/types';

interface ClientData {
  clientName: string;
  email?: string;
  company?: string;
}

interface Quote {
  quoteId: string;
  operator: string;
  aircraftType: string;
  price: number;
  departureTime: string;
  arrivalTime?: string;
  score?: number;
  rank?: number;
}

interface Recommendation {
  quoteId: string;
  rank: number;
  score: number;
  reasoning: string;
}

interface RFPData {
  departure: string;
  arrival: string;
  departureDate: string;
  passengers: number;
}

interface EmailContent {
  subject: string;
  body: string;
}

/**
 * CommunicationAgent
 * Generates and sends proposal emails
 */
export class CommunicationAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      type: AgentType.COMMUNICATION,
    });
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    await super.initialize();
    console.log(`[${this.name}] CommunicationAgent initialized`);
  }

  /**
   * Execute the agent
   * Generates and sends proposal email
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    this._status = AgentStatus.RUNNING;

    try {
      // Extract and validate data
      const clientData = this.extractClientData(context);
      const recommendation = this.extractRecommendation(context);
      const quotes = this.extractQuotes(context);
      const rfpData = this.extractRFPData(context);

      this.validateClientData(clientData);
      this.validateRecommendation(recommendation);
      this.validateQuotes(quotes);

      // Generate email content
      // After validation, we know these are defined
      const emailContent = this.generateEmailContent(
        clientData,
        recommendation!,
        quotes!,
        rfpData
      );

      // Send email via Gmail MCP
      const emailResult = await this.sendEmail(
        clientData.email!,
        emailContent
      );

      // Update metrics
      this.metrics.totalExecutions++;
      this.metrics.successfulExecutions++;
      this._status = AgentStatus.COMPLETED;

      const executionTime = Date.now() - startTime;
      this.updateAverageExecutionTime(executionTime);

      return {
        success: true,
        data: {
          emailContent,
          emailSent: true,
          emailId: emailResult.emailId,
          recipient: clientData.email,
          sentAt: emailResult.sentAt,
          requestId: context.requestId,
          sessionId: context.sessionId,
        },
        metadata: {
          executionTime,
          toolCalls: this.metrics.toolCallsCount,
        },
      };
    } catch (error) {
      // Handle errors
      this.metrics.totalExecutions++;
      this.metrics.failedExecutions++;
      this._status = AgentStatus.ERROR;

      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: error as Error,
        metadata: {
          executionTime,
        },
      };
    }
  }

  /**
   * Extract client data from context
   */
  private extractClientData(context: AgentContext): ClientData {
    return (context.metadata?.clientData as ClientData) || {};
  }

  /**
   * Extract recommendation from context
   */
  private extractRecommendation(context: AgentContext): Recommendation | undefined {
    return context.metadata?.recommendation as Recommendation | undefined;
  }

  /**
   * Extract quotes from context
   */
  private extractQuotes(context: AgentContext): Quote[] | undefined {
    return context.metadata?.analyzedQuotes as Quote[] | undefined;
  }

  /**
   * Extract RFP data from context
   */
  private extractRFPData(context: AgentContext): RFPData | undefined {
    return context.metadata?.rfpData as RFPData | undefined;
  }

  /**
   * Validate client data
   */
  private validateClientData(clientData: ClientData): void {
    if (!clientData || !clientData.email) {
      throw new Error('Missing required field: client email');
    }
  }

  /**
   * Validate recommendation
   */
  private validateRecommendation(recommendation: Recommendation | undefined): void {
    if (!recommendation) {
      throw new Error('Missing required field: recommendation');
    }
  }

  /**
   * Validate quotes
   */
  private validateQuotes(quotes: Quote[] | undefined): void {
    if (!quotes || !Array.isArray(quotes)) {
      throw new Error('Missing required field: quotes');
    }
  }

  /**
   * Generate email content
   */
  private generateEmailContent(
    clientData: ClientData,
    recommendation: Recommendation,
    quotes: Quote[],
    rfpData?: RFPData
  ): EmailContent {
    const subject = this.generateSubject(rfpData);
    const body = this.generateBody(clientData, recommendation, quotes, rfpData);

    return {
      subject,
      body,
    };
  }

  /**
   * Generate email subject
   */
  private generateSubject(rfpData?: RFPData): string {
    if (rfpData) {
      return `Flight Proposal: ${rfpData.departure} to ${rfpData.arrival}`;
    }
    return 'Your Flight Proposal is Ready';
  }

  /**
   * Generate email body
   */
  private generateBody(
    clientData: ClientData,
    recommendation: Recommendation,
    quotes: Quote[],
    rfpData?: RFPData
  ): string {
    const topQuote = quotes.find((q) => q.quoteId === recommendation.quoteId);

    let html = '<html><body style="font-family: Arial, sans-serif; color: #333;">';

    // Greeting
    html += `<h2>Dear ${clientData.clientName},</h2>`;
    html += '<p>We are pleased to present the flight options for your upcoming trip.</p>';

    // Flight Details
    if (rfpData) {
      html += '<div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">';
      html += '<h3>Flight Details</h3>';
      html += `<p><strong>Route:</strong> ${rfpData.departure} to ${rfpData.arrival}</p>`;
      html += `<p><strong>Date:</strong> ${this.formatDate(rfpData.departureDate)}</p>`;
      html += `<p><strong>Passengers:</strong> ${rfpData.passengers}</p>`;
      html += '</div>';
    }

    // Our Recommendation
    html += '<h3 style="color: #0066cc;">Our Recommendation</h3>';
    if (topQuote) {
      html += '<div style="border: 2px solid #0066cc; padding: 20px; margin: 20px 0;">';
      html += `<h4>${topQuote.operator}</h4>`;
      html += `<p><strong>Aircraft:</strong> ${this.formatAircraftType(topQuote.aircraftType)}</p>`;
      html += `<p><strong>Price:</strong> ${this.formatPrice(topQuote.price)}</p>`;
      html += `<p><strong>Departure:</strong> ${this.formatTime(topQuote.departureTime)}</p>`;
      if (topQuote.arrivalTime) {
        html += `<p><strong>Arrival:</strong> ${this.formatTime(topQuote.arrivalTime)}</p>`;
      }
      html += `<p style="margin-top: 15px;"><em>${recommendation.reasoning}</em></p>`;
      html += '</div>';
    }

    // Other Options
    const otherQuotes = quotes.filter((q) => q.quoteId !== recommendation.quoteId);
    if (otherQuotes.length > 0) {
      html += '<h3>Additional Options</h3>';
      otherQuotes.forEach((quote) => {
        html += '<div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0;">';
        html += `<h4>${quote.operator}</h4>`;
        html += `<p><strong>Aircraft:</strong> ${this.formatAircraftType(quote.aircraftType)}</p>`;
        html += `<p><strong>Price:</strong> ${this.formatPrice(quote.price)}</p>`;
        html += `<p><strong>Departure:</strong> ${this.formatTime(quote.departureTime)}</p>`;
        html += '</div>';
      });
    }

    // Call to Action
    html += '<div style="margin-top: 30px;">';
    html += '<p><strong>Ready to book?</strong> Reply to this email or contact us directly to confirm your reservation.</p>';
    html += '<p>We look forward to serving you!</p>';
    html += '</div>';

    // Signature
    html += '<div style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px;">';
    html += '<p>Best regards,<br>';
    html += '<strong>Jetvision Charter Services</strong></p>';
    html += '<p style="font-size: 12px; color: #666;">';
    html += 'For questions or assistance, please contact our team.';
    html += '</p>';
    html += '</div>';

    html += '</body></html>';

    return html;
  }

  /**
   * Format price as currency
   */
  private formatPrice(price: number): string {
    return `$${price.toLocaleString('en-US')}`;
  }

  /**
   * Format aircraft type
   */
  private formatAircraftType(type: string): string {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format date
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Format time
   */
  private formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Send email via Gmail MCP
   * Mock implementation - production would use Gmail MCP server
   */
  private async sendEmail(
    recipient: string,
    content: EmailContent
  ): Promise<{ emailId: string; sentAt: Date }> {
    // Increment tool calls metric
    this.metrics.toolCallsCount++;

    // Mock email sending
    const emailId = `email-${Date.now()}`;
    const sentAt = new Date();

    // In production, would call Gmail MCP server:
    // await gmailMCP.callTool('send_email', {
    //   to: recipient,
    //   subject: content.subject,
    //   body: content.body,
    //   isHtml: true,
    // });

    return {
      emailId,
      sentAt,
    };
  }

  /**
   * Update average execution time
   */
  private updateAverageExecutionTime(executionTime: number): void {
    const totalExecutions = this.metrics.totalExecutions;
    const currentAverage = this.metrics.averageExecutionTime;

    this.metrics.averageExecutionTime =
      (currentAverage * (totalExecutions - 1) + executionTime) / totalExecutions;
  }
}
