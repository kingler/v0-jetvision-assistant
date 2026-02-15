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

const STAGE_CONFIG: Record<FlightRequestStage, { label: string; bg: string; text: string }> = {
  understanding_request: { label: 'Understanding Request', bg: 'oklch(0.65 0.02 250 / 0.10)', text: 'oklch(0.40 0.03 250)' },
  searching_aircraft:    { label: 'Searching Aircraft',    bg: 'oklch(0.55 0.15 300 / 0.10)', text: 'oklch(0.38 0.18 300)' },
  requesting_quotes:     { label: 'Requesting Quotes',     bg: 'oklch(0.65 0.15 200 / 0.10)', text: 'oklch(0.42 0.18 200)' },
  analyzing_options:     { label: 'Analyzing Options',     bg: 'oklch(0.65 0.18 55 / 0.10)',  text: 'oklch(0.42 0.20 55)' },
  proposal_ready:        { label: 'Proposal Ready',        bg: 'oklch(0.60 0.18 155 / 0.10)', text: 'oklch(0.38 0.20 155)' },
  proposal_sent:         { label: 'Proposal Sent',         bg: 'oklch(0.60 0.15 240 / 0.10)', text: 'oklch(0.38 0.18 240)' },
  contract_generated:    { label: 'Contract Ready',        bg: 'oklch(0.55 0.18 240 / 0.10)', text: 'oklch(0.35 0.20 240)' },
  contract_sent:         { label: 'Contract Sent',         bg: 'oklch(0.55 0.15 280 / 0.10)', text: 'oklch(0.35 0.18 280)' },
  payment_pending:       { label: 'Payment Pending',       bg: 'oklch(0.70 0.18 75 / 0.10)',  text: 'oklch(0.42 0.20 75)' },
  closed_won:            { label: 'Closed Won',            bg: 'oklch(0.55 0.18 155 / 0.10)', text: 'oklch(0.35 0.20 155)' },
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
      className={cn('rounded-full border-0 text-xs font-medium', className)}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {label ?? config.label}
    </Badge>
  );
}
