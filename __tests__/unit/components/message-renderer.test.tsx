/**
 * Message Renderer Component Tests
 *
 * Tests for the MessageRenderer component and all message component types.
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageRenderer } from '@/components/message-components/message-renderer';
import type {
  MessageComponent,
  TextComponent,
  QuoteCardComponent,
  QuoteComparisonComponent,
  WorkflowStatusComponent,
  ProposalPreviewComponent,
  ActionButtonsComponent,
  FormFieldComponent,
  FileAttachmentComponent,
  ProgressIndicatorComponent,
} from '@/components/message-components/types';

describe('MessageRenderer', () => {
  let mockOnAction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnAction = vi.fn();
  });

  describe('TextComponent', () => {
    it('should render plain text', () => {
      const component: TextComponent = {
        type: 'text',
        content: 'Hello, World!',
        markdown: false,
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);
      expect(screen.getByText('Hello, World!')).toBeInTheDocument();
    });

    it('should render markdown text', () => {
      const component: TextComponent = {
        type: 'text',
        content: '# Heading\n\nSome **bold** text',
        markdown: true,
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);
      expect(screen.getByText('Heading')).toBeInTheDocument();
    });
  });

  describe('QuoteCardComponent', () => {
    it('should render quote card with all details', () => {
      const component: QuoteCardComponent = {
        type: 'quote_card',
        quote: {
          id: 'quote-1',
          operatorName: 'JetFly Inc',
          aircraftType: 'Gulfstream G650',
          price: 45000,
          departureTime: '10:00 AM',
          arrivalTime: '2:00 PM',
          flightDuration: '4h 0m',
          operatorRating: 4.8,
          isRecommended: true,
        },
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);
      expect(screen.getByText('JetFly Inc')).toBeInTheDocument();
      expect(screen.getByText('Gulfstream G650')).toBeInTheDocument();
      expect(screen.getByText('$45,000')).toBeInTheDocument();
      expect(screen.getByText('Recommended')).toBeInTheDocument();
    });

    it('should call onAction when select button is clicked', () => {
      const component: QuoteCardComponent = {
        type: 'quote_card',
        quote: {
          id: 'quote-1',
          operatorName: 'JetFly Inc',
          aircraftType: 'Gulfstream G650',
          price: 45000,
          departureTime: '10:00 AM',
          arrivalTime: '2:00 PM',
          flightDuration: '4h 0m',
        },
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);

      const selectButton = screen.getByText('Select');
      fireEvent.click(selectButton);

      expect(mockOnAction).toHaveBeenCalledWith('select_quote', { quoteId: 'quote-1' });
    });
  });

  describe('QuoteComparisonComponent', () => {
    it('should render multiple quotes', () => {
      const component: QuoteComparisonComponent = {
        type: 'quote_comparison',
        quotes: [
          {
            id: 'quote-1',
            operatorName: 'JetFly Inc',
            aircraftType: 'Gulfstream G650',
            price: 45000,
            departureTime: '10:00 AM',
            arrivalTime: '2:00 PM',
            flightDuration: '4h 0m',
          },
          {
            id: 'quote-2',
            operatorName: 'SkyJet',
            aircraftType: 'Bombardier Global 7500',
            price: 42000,
            departureTime: '11:00 AM',
            arrivalTime: '3:00 PM',
            flightDuration: '4h 0m',
          },
        ],
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);
      expect(screen.getByText('JetFly Inc')).toBeInTheDocument();
      expect(screen.getByText('SkyJet')).toBeInTheDocument();
      expect(screen.getByText(/Price range:/i)).toBeInTheDocument();
    });
  });

  describe('WorkflowStatusComponent', () => {
    it('should render workflow status', () => {
      const component: WorkflowStatusComponent = {
        type: 'workflow_status',
        stage: 'searching',
        progress: 50,
        message: 'Finding the best aircraft for your trip...',
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);
      expect(screen.getByText('Searching Aircraft')).toBeInTheDocument();
      expect(screen.getByText('Finding the best aircraft for your trip...')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should render workflow details', () => {
      const component: WorkflowStatusComponent = {
        type: 'workflow_status',
        stage: 'analyzing_proposals',
        progress: 75,
        details: [
          { label: 'Quotes received', value: '12', status: 'completed' },
          { label: 'Analyzing pricing', value: 'In progress', status: 'in_progress' },
        ],
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);
      expect(screen.getByText('Quotes received')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Analyzing pricing')).toBeInTheDocument();
    });
  });

  describe('ProposalPreviewComponent', () => {
    it('should render proposal preview', () => {
      const component: ProposalPreviewComponent = {
        type: 'proposal_preview',
        proposal: {
          id: 'proposal-1',
          title: 'New York to London Flight Proposal',
          flightDetails: {
            route: 'JFK → LHR',
            date: 'Dec 15, 2024',
            passengers: 8,
          },
          selectedQuote: {
            operatorName: 'JetFly Inc',
            aircraftType: 'Gulfstream G650',
            price: 45000,
          },
        },
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);
      expect(screen.getByText('New York to London Flight Proposal')).toBeInTheDocument();
      expect(screen.getByText('JFK → LHR')).toBeInTheDocument();
      expect(screen.getByText('Dec 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('$45,000')).toBeInTheDocument();
    });

    it('should call onAction when download button is clicked', () => {
      const component: ProposalPreviewComponent = {
        type: 'proposal_preview',
        proposal: {
          id: 'proposal-1',
          title: 'Flight Proposal',
          flightDetails: {
            route: 'JFK → LHR',
            date: 'Dec 15, 2024',
            passengers: 8,
          },
          selectedQuote: {
            operatorName: 'JetFly Inc',
            aircraftType: 'Gulfstream G650',
            price: 45000,
          },
        },
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);

      const downloadButton = screen.getByText('Download PDF');
      fireEvent.click(downloadButton);

      expect(mockOnAction).toHaveBeenCalledWith('download_proposal', { proposalId: 'proposal-1' });
    });
  });

  describe('ActionButtonsComponent', () => {
    it('should render action buttons', () => {
      const component: ActionButtonsComponent = {
        type: 'action_buttons',
        actions: [
          { id: 'action-1', label: '1-2 passengers', value: '1-2' },
          { id: 'action-2', label: '3-5 passengers', value: '3-5' },
          { id: 'action-3', label: '6+ passengers', value: '6+' },
        ],
        layout: 'horizontal',
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);
      expect(screen.getByText('1-2 passengers')).toBeInTheDocument();
      expect(screen.getByText('3-5 passengers')).toBeInTheDocument();
      expect(screen.getByText('6+ passengers')).toBeInTheDocument();
    });

    it('should call onAction when button is clicked', () => {
      const component: ActionButtonsComponent = {
        type: 'action_buttons',
        actions: [
          { id: 'action-1', label: '1-2 passengers', value: '1-2' },
        ],
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);

      const button = screen.getByText('1-2 passengers');
      fireEvent.click(button);

      expect(mockOnAction).toHaveBeenCalledWith('button_action', { actionId: 'action-1', value: '1-2' });
    });
  });

  describe('FormFieldComponent', () => {
    it('should render text input field', () => {
      const component: FormFieldComponent = {
        type: 'form_field',
        field: {
          name: 'departure_city',
          label: 'Departure City',
          type: 'text',
          placeholder: 'e.g., New York',
          required: true,
        },
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);
      expect(screen.getByLabelText(/Departure City/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., New York')).toBeInTheDocument();
    });

    it('should render select field with options', () => {
      const component: FormFieldComponent = {
        type: 'form_field',
        field: {
          name: 'passengers',
          label: 'Number of Passengers',
          type: 'select',
          options: [
            { label: '1-2', value: '1-2' },
            { label: '3-5', value: '3-5' },
          ],
        },
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);
      expect(screen.getByText('Number of Passengers')).toBeInTheDocument();
    });
  });

  describe('FileAttachmentComponent', () => {
    it('should render file attachment', () => {
      const component: FileAttachmentComponent = {
        type: 'file_attachment',
        file: {
          id: 'file-1',
          name: 'proposal.pdf',
          type: 'application/pdf',
          size: 1024000,
          url: 'https://example.com/proposal.pdf',
        },
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);
      expect(screen.getByText('proposal.pdf')).toBeInTheDocument();
      expect(screen.getByText(/1000\.0\s*KB/)).toBeInTheDocument();
      const pdfElements = screen.getAllByText(/pdf/i);
      expect(pdfElements.length).toBeGreaterThan(0);
    });

    it('should call onAction when download button is clicked', () => {
      const component: FileAttachmentComponent = {
        type: 'file_attachment',
        file: {
          id: 'file-1',
          name: 'proposal.pdf',
          type: 'application/pdf',
          size: 1024000,
          url: 'https://example.com/proposal.pdf',
        },
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);

      const downloadButton = screen.getByText('Download');
      fireEvent.click(downloadButton);

      expect(mockOnAction).toHaveBeenCalledWith('download_file', { fileId: 'file-1' });
    });
  });

  describe('ProgressIndicatorComponent', () => {
    it('should render spinner variant', () => {
      const component: ProgressIndicatorComponent = {
        type: 'progress_indicator',
        message: 'Processing your request...',
        variant: 'spinner',
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);
      expect(screen.getByText('Processing your request...')).toBeInTheDocument();
    });

    it('should render bar variant with progress', () => {
      const component: ProgressIndicatorComponent = {
        type: 'progress_indicator',
        message: 'Uploading file...',
        progress: 65,
        variant: 'bar',
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);
      expect(screen.getByText('Uploading file...')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('should render cancel button when cancellable', () => {
      const mockOnCancel = vi.fn();
      const component: ProgressIndicatorComponent = {
        type: 'progress_indicator',
        message: 'Processing...',
        cancellable: true,
        onCancel: mockOnCancel,
      };

      render(<MessageRenderer component={component} onAction={mockOnAction} />);

      const cancelButton = screen.getByRole('button');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should render error message for unknown component type', () => {
      const component = {
        type: 'unknown_type',
      } as any;

      render(<MessageRenderer component={component} onAction={mockOnAction} />);
      expect(screen.getByText(/Unknown component type/)).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const component: TextComponent = {
        type: 'text',
        content: 'Test',
        className: 'custom-class',
      };

      const { container } = render(
        <MessageRenderer component={component} onAction={mockOnAction} className="wrapper-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
      expect(container.querySelector('.wrapper-class')).toBeInTheDocument();
    });
  });
});
