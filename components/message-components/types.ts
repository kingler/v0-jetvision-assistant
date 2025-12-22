/**
 * Message Component Types
 *
 * Type definitions for all message components that can be rendered
 * inline within chat messages in the unified chat interface.
 *
 * Core types (AirportInfo, TripStatus, QuoteStatus, etc.) are imported
 * from the centralized '@/lib/types/quotes' module.
 */

import { ReactNode } from 'react';
import type {
  AirportInfo,
  TripStatus,
  QuoteStatus,
  AuthMethod,
  EnvironmentType,
  AvinodeMessageType,
} from '@/lib/types/quotes';

/**
 * Base message component interface
 */
export interface BaseMessageComponent {
  id?: string;
  className?: string;
}

/**
 * Text message component
 */
export interface TextComponent extends BaseMessageComponent {
  type: 'text';
  content: string;
  markdown?: boolean;
}

/**
 * Quote card component - displays a single flight quote
 */
export interface QuoteCardComponent extends BaseMessageComponent {
  type: 'quote_card';
  quote: {
    id: string;
    operatorName: string;
    aircraftType: string;
    price: number;
    departureTime: string;
    arrivalTime: string;
    flightDuration: string;
    operatorRating?: number;
    isRecommended?: boolean;
    isSelected?: boolean;
  };
  onSelect?: (quoteId: string) => void;
  onViewDetails?: (quoteId: string) => void;
}

/**
 * Quote comparison component - displays multiple quotes side by side
 */
export interface QuoteComparisonComponent extends BaseMessageComponent {
  type: 'quote_comparison';
  quotes: Array<{
    id: string;
    operatorName: string;
    aircraftType: string;
    price: number;
    departureTime: string;
    arrivalTime: string;
    flightDuration: string;
    score?: number;
    isRecommended?: boolean;
  }>;
  onSelectQuote?: (quoteId: string) => void;
  onCompare?: () => void;
}

/**
 * Workflow status component - shows current workflow stage
 */
export interface WorkflowStatusComponent extends BaseMessageComponent {
  type: 'workflow_status';
  stage: 'analyzing' | 'searching' | 'awaiting_quotes' | 'analyzing_proposals' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  details?: Array<{
    label: string;
    value: string | number;
    status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  }>;
}

/**
 * Proposal preview component - displays proposal summary
 */
export interface ProposalPreviewComponent extends BaseMessageComponent {
  type: 'proposal_preview';
  proposal: {
    id: string;
    title: string;
    flightDetails: {
      route: string;
      date: string;
      passengers: number;
    };
    selectedQuote: {
      operatorName: string;
      aircraftType: string;
      price: number;
    };
    summary?: string;
  };
  onDownload?: (proposalId: string) => void;
  onView?: (proposalId: string) => void;
  onAccept?: (proposalId: string) => void;
}

/**
 * Action buttons component - inline quick reply buttons
 */
export interface ActionButtonsComponent extends BaseMessageComponent {
  type: 'action_buttons';
  actions: Array<{
    id: string;
    label: string;
    value: string | number;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    icon?: ReactNode;
    disabled?: boolean;
  }>;
  layout?: 'horizontal' | 'vertical' | 'grid';
  onAction?: (actionId: string, value: string | number) => void;
}

/**
 * Form field component - inline form input
 */
export interface FormFieldComponent extends BaseMessageComponent {
  type: 'form_field';
  field: {
    name: string;
    label: string;
    placeholder?: string;
    type: 'text' | 'number' | 'date' | 'select' | 'textarea';
    value?: string | number;
    options?: Array<{ label: string; value: string | number }>;
    required?: boolean;
    validation?: {
      pattern?: string;
      min?: number;
      max?: number;
      minLength?: number;
      maxLength?: number;
    };
  };
  onSubmit?: (name: string, value: string | number) => void;
  onChange?: (name: string, value: string | number) => void;
}

/**
 * File attachment component - displays attached files
 */
export interface FileAttachmentComponent extends BaseMessageComponent {
  type: 'file_attachment';
  file: {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    thumbnail?: string;
  };
  onDownload?: (fileId: string) => void;
  onPreview?: (fileId: string) => void;
}

/**
 * Progress indicator component - shows loading/processing state
 */
export interface ProgressIndicatorComponent extends BaseMessageComponent {
  type: 'progress_indicator';
  message: string;
  progress?: number; // 0-100, undefined for indeterminate
  variant?: 'spinner' | 'bar' | 'dots';
  cancellable?: boolean;
  onCancel?: () => void;
}

/**
 * Avinode Connection Status component - displays API connection success/failure
 */
export interface AvinodeConnectionStatusComponent extends BaseMessageComponent {
  type: 'avinode_connection_status';
  success: boolean;
  message: string;
  timestamp: string;
}

/**
 * Avinode Trip Summary component - displays trip overview
 */
export interface AvinodeTripSummaryComponent extends BaseMessageComponent {
  type: 'avinode_trip_summary';
  tripId: string;
  departureAirport: AirportInfo & { name: string; city: string };
  arrivalAirport: AirportInfo & { name: string; city: string };
  departureDate: string;
  passengers: number;
  status: TripStatus;
  onCopyTripId?: () => void;
}

/**
 * Avinode Deep Links component - displays action links to Avinode
 */
export interface AvinodeDeepLinksComponent extends BaseMessageComponent {
  type: 'avinode_deep_links';
  links: {
    searchInAvinode: {
      href: string;
      description: string;
    };
    viewInAvinode: {
      href: string;
      description: string;
    };
    cancel: {
      href: string;
      description: string;
    };
  };
  onLinkClick?: (linkType: 'search' | 'view' | 'cancel') => void;
}

/**
 * Avinode Auth Status component - displays authentication info
 */
export interface AvinodeAuthStatusComponent extends BaseMessageComponent {
  type: 'avinode_auth_status';
  method: AuthMethod;
  environment: EnvironmentType;
  baseUrl: string;
  expiresAt?: Date;
  isValid: boolean;
}

/**
 * Avinode RFQ Quote Details component - displays RFQ and quote information
 */
export interface AvinodeRfqQuoteDetailsComponent extends BaseMessageComponent {
  type: 'avinode_rfq_quote_details';
  rfqId: string;
  quoteId: string;
  operator: {
    name: string;
    rating?: number;
  };
  aircraft: {
    type: string;
    tail: string;
    category: string;
    maxPassengers: number;
  };
  price: {
    amount: number;
    currency: string;
  };
  flightDetails: {
    flightTimeMinutes: number;
    distanceNm: number;
  };
  status: QuoteStatus;
  statusDescription?: string;
}

/**
 * Avinode Trip Details component - extended trip information
 */
export interface AvinodeTripDetailsComponent extends BaseMessageComponent {
  type: 'avinode_trip_details';
  tripId: string;
  displayTripId?: string;
  departureAirport: AirportInfo & { name: string; city: string };
  arrivalAirport: AirportInfo & { name: string; city: string };
  departureDate: string;
  departureTime?: string;
  timezone?: string;
  passengers: number;
  status: TripStatus;
  buyer?: {
    company: string;
    contact: string;
  };
  onCopyTripId?: () => void;
}

/**
 * Avinode Message component - displays communication log
 */
export interface AvinodeMessageComponent extends BaseMessageComponent {
  type: 'avinode_message';
  messageType: AvinodeMessageType;
  content: string;
  timestamp: string;
  sender?: string;
}

/**
 * Union type of all message components
 */
export type MessageComponent =
  | TextComponent
  | QuoteCardComponent
  | QuoteComparisonComponent
  | WorkflowStatusComponent
  | ProposalPreviewComponent
  | ActionButtonsComponent
  | FormFieldComponent
  | FileAttachmentComponent
  | ProgressIndicatorComponent
  | AvinodeConnectionStatusComponent
  | AvinodeTripSummaryComponent
  | AvinodeDeepLinksComponent
  | AvinodeAuthStatusComponent
  | AvinodeRfqQuoteDetailsComponent
  | AvinodeTripDetailsComponent
  | AvinodeMessageComponent;

/**
 * Message component props
 */
export interface MessageComponentProps {
  component: MessageComponent;
  onAction?: (action: string, data: any) => void;
}

/**
 * Type guard to check component type
 */
export function isComponentType<T extends MessageComponent['type']>(
  component: MessageComponent,
  type: T
): component is Extract<MessageComponent, { type: T }> {
  return component.type === type;
}
