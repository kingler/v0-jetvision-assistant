import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type FlightRequestStage =
  | 'understanding_request'
  | 'searching_aircraft'
  | 'requesting_quotes'
  | 'analyzing_options'
  | 'proposal_ready'
  | 'proposal_sent'
  | 'contract_generated'
  | 'contract_sent'
  | 'payment_pending'
  | 'closed_won';

const STAGE_CONFIG: Record<FlightRequestStage, { label: string; bgClass: string; textClass: string }> = {
  understanding_request: { label: 'Understanding Request', bgClass: 'bg-status-pending/10',         textClass: 'text-status-pending' },
  searching_aircraft:    { label: 'Searching Aircraft',    bgClass: 'bg-status-searching/10',       textClass: 'text-status-searching' },
  requesting_quotes:     { label: 'Requesting Quotes',     bgClass: 'bg-status-processing/10',      textClass: 'text-status-processing' },
  analyzing_options:     { label: 'Analyzing Options',     bgClass: 'bg-status-analyzing/10',       textClass: 'text-status-analyzing' },
  proposal_ready:        { label: 'Proposal Ready',        bgClass: 'bg-status-proposal-ready/10',  textClass: 'text-status-proposal-ready' },
  proposal_sent:         { label: 'Proposal Sent',         bgClass: 'bg-status-proposal-sent/10',   textClass: 'text-status-proposal-sent' },
  contract_generated:    { label: 'Contract Ready',        bgClass: 'bg-status-contract-ready/10',  textClass: 'text-status-contract-ready' },
  contract_sent:         { label: 'Contract Sent',         bgClass: 'bg-status-contract-sent/10',   textClass: 'text-status-contract-sent' },
  payment_pending:       { label: 'Payment Pending',       bgClass: 'bg-status-payment-pending/10', textClass: 'text-status-payment-pending' },
  closed_won:            { label: 'Closed Won',            bgClass: 'bg-status-closed-won/10',      textClass: 'text-status-closed-won' },
};

export const FLIGHT_REQUEST_STAGES: FlightRequestStage[] = [
  'understanding_request',
  'searching_aircraft',
  'requesting_quotes',
  'analyzing_options',
  'proposal_ready',
  'proposal_sent',
  'contract_generated',
  'contract_sent',
  'payment_pending',
  'closed_won',
];

export function FlightRequestStageBadge({ stage, label, className }: { stage: FlightRequestStage; label?: string; className?: string }) {
  const config = STAGE_CONFIG[stage];
  return (
    <Badge
      variant="outline"
      className={cn('rounded-full border-0 text-xs font-medium', config.bgClass, config.textClass, className)}
    >
      {label ?? config.label}
    </Badge>
  );
}
