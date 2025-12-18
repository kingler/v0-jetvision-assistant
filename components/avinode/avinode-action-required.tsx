import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowStatus } from './types';

export interface AvinodeActionRequiredProps {
  tripId: string;
  searchLink: string;
  viewLink?: string;
  status: WorkflowStatus;
  instructions?: string[];
  onSearchClick?: () => void;
  onCopyLink?: () => void;
}

interface StepIndicatorProps {
  status: WorkflowStatus;
}

/**
 * Step Indicator Component
 * Visual representation of the 3-step workflow: Request → Select → Quotes
 */
function StepIndicator({ status }: StepIndicatorProps) {
  const getStepState = (stepNumber: number): 'completed' | 'current' | 'pending' => {
    const statusStepMap: Record<WorkflowStatus, number> = {
      pending: 1,
      searching: 2,
      selected: 2,
      quotes_received: 3,
    };

    const currentStep = statusStepMap[status];

    if (stepNumber < currentStep) {
      return 'completed';
    }
    if (stepNumber === currentStep) {
      return 'current';
    }
    return 'pending';
  };

  const steps = [
    { number: 1, label: 'Request Created', icon: '①' },
    { number: 2, label: 'Select in Avinode', icon: '②' },
    { number: 3, label: 'Quotes', icon: '③' },
  ];

  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => {
        const state = getStepState(step.number);
        const isLast = index === steps.length - 1;
        const isCompleted = state === 'completed';
        const isCurrent = state === 'current';
        const isQuotesReceived = status === 'quotes_received' && step.number === 3;

        return (
          <React.Fragment key={step.number}>
            {/* Step */}
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full font-semibold text-lg transition-all',
                  {
                    'bg-primary text-primary-foreground': isCompleted || isCurrent,
                    'bg-success text-white': isQuotesReceived,
                    'bg-muted text-muted-foreground': state === 'pending',
                  }
                )}
              >
                {step.icon}
              </div>
              <span
                className={cn('text-xs font-medium text-center max-w-20', {
                  'text-primary': isCompleted || isCurrent,
                  'text-success': isQuotesReceived,
                  'text-muted-foreground': state === 'pending',
                })}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Arrow */}
            {!isLast && (
              <div className="flex-1 flex items-center justify-center mx-2">
                <div
                  className={cn('h-0.5 w-full transition-all', {
                    'bg-primary': getStepState(step.number + 1) !== 'pending',
                    'bg-muted': getStepState(step.number + 1) === 'pending',
                  })}
                />
                <span
                  className={cn('text-sm mx-1', {
                    'text-primary': getStepState(step.number + 1) !== 'pending',
                    'text-muted-foreground': getStepState(step.number + 1) === 'pending',
                  })}
                >
                  →
                </span>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * AvinodeActionRequired Component
 * Prominent workflow guide component with step indicator and clear CTAs
 *
 * Displays a 3-step progress indicator and action buttons for Avinode workflow:
 * ① Request Created → ② Select in Avinode → ③ Quotes
 */
export function AvinodeActionRequired({
  tripId,
  searchLink,
  viewLink,
  status,
  instructions,
  onSearchClick,
  onCopyLink,
}: AvinodeActionRequiredProps) {
  const defaultInstructions = [
    'Open the Avinode marketplace using the button below',
    'Review and select the aircraft that best fits your requirements',
    'Return here to see quotes from operators',
  ];

  const displayInstructions = instructions || defaultInstructions;

  const getStatusMessage = (currentStatus: WorkflowStatus): string => {
    const messages: Record<WorkflowStatus, string> = {
      pending: 'Your request has been created and is ready for review in Avinode.',
      searching: 'Searching for available aircraft on Avinode marketplace...',
      selected: 'Aircraft selected. Waiting for operator quotes...',
      quotes_received: 'Great news! Quotes have been received from operators.',
    };

    return messages[currentStatus];
  };

  const handleOpenAvinode = () => {
    const link = status === 'quotes_received' && viewLink ? viewLink : searchLink;
    window.open(link, '_blank', 'noopener,noreferrer');
    onSearchClick?.();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(searchLink);
      onCopyLink?.();
    } catch {
      // Clipboard API may fail in some browsers/contexts - fail silently
      // Parent component can handle via onCopyLink callback if needed
    }
  };

  return (
    <Card className="border-2 border-primary/20 dark:border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-primary" />
          Action Required: Complete in Avinode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step Indicator */}
        <StepIndicator status={status} />

        {/* Trip ID Display */}
        <div className="rounded-lg bg-muted/50 dark:bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Avinode Trip ID
              </span>
              <p className="font-mono text-sm font-medium mt-1">{tripId}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
        </div>

        {/* Status Message */}
        <div className="rounded-lg border border-border dark:border-input p-4 bg-background dark:bg-input/30">
          <p className="text-sm text-foreground">{getStatusMessage(status)}</p>
        </div>

        {/* Instructions */}
        <div>
          <h3 className="font-semibold text-sm mb-3">Next Steps:</h3>
          <ol className="space-y-2 list-decimal list-inside">
            {displayInstructions.map((instruction, index) => (
              <li key={index} className="text-sm text-muted-foreground">
                {instruction}
              </li>
            ))}
          </ol>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            className="flex-1"
            onClick={handleOpenAvinode}
            aria-label="Open Avinode"
          >
            <ExternalLink className="h-4 w-4" />
            Open Avinode
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleCopyLink}
            aria-label="Copy Link"
          >
            <Copy className="h-4 w-4" />
            Copy Link
          </Button>
        </div>

        {/* Tip */}
        <div className="flex gap-3 rounded-lg bg-accent/10 dark:bg-accent/5 p-4 border border-accent/20">
          <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-accent mb-1">Tip</p>
            <p className="text-sm text-muted-foreground">
              Keep this tab open while you work in Avinode. We&apos;ll automatically
              update when quotes are received.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
