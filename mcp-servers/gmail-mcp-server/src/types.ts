/**
 * Gmail MCP Server Types
 */

export interface SendEmailParams {
  to: string;
  from?: string;
  subject: string;
  body_html: string;
  body_text?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string;
  contentType: string;
  encoding?: 'base64' | 'utf8';
}

export interface SearchEmailsParams {
  query: string;
  maxResults?: number;
  labelIds?: string[];
  from?: string;
  to?: string;
  subject?: string;
  after?: string;
  before?: string;
}

export interface GetEmailParams {
  emailId: string;
}

export interface Email {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  snippet: string;
  date: string;
  labels: string[];
  attachments?: {
    filename: string;
    mimeType: string;
    size: number;
  }[];
}

export interface SendEmailResult {
  success: boolean;
  messageId: string;
  threadId: string;
  labelIds: string[];
}
