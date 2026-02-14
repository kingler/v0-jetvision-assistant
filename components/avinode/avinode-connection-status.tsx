import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

export interface AvinodeConnectionStatusProps {
  success: boolean;
  message: string;
  timestamp: string;
}

export function AvinodeConnectionStatus({
  success,
  message,
  timestamp,
}: AvinodeConnectionStatusProps) {
  const bgColor = success
    ? 'bg-success-bg'
    : 'bg-error-bg';

  const borderColor = success ? 'border-success-border' : 'border-error-border';
  const iconColor = success ? 'text-success' : 'text-destructive';
  const statusText = success ? 'SUCCESS' : 'FAILED';

  const Icon = success ? CheckCircle : XCircle;

  return (
    <div className={`${bgColor} ${borderColor} border-l-4 rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 space-y-2">
          <div className="text-base font-semibold">
            Avinode API Connection Test - {statusText}
          </div>
          <div className="text-sm">
            {message}
          </div>
          <div className="text-xs text-muted-foreground">
            Timestamp: {timestamp}
          </div>
        </div>
      </div>
    </div>
  );
}
