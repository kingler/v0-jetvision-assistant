/**
 * Workflow Status Component
 *
 * Displays the current workflow stage with progress indicator
 * and optional details about each step.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { WorkflowStatusComponent } from './types';

export interface WorkflowStatusProps {
  stage: WorkflowStatusComponent['stage'];
  progress: number;
  message?: string;
  details?: WorkflowStatusComponent['details'];
  className?: string;
}

const stageConfig = {
  analyzing: {
    label: 'Analyzing Request',
    icon: Loader2,
    color: 'text-status-proposal-sent',
    bgColor: 'bg-status-proposal-sent/10',
  },
  searching: {
    label: 'Searching Aircraft',
    icon: Loader2,
    color: 'text-status-processing',
    bgColor: 'bg-status-processing/10',
  },
  awaiting_quotes: {
    label: 'Awaiting Quotes',
    icon: Clock,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  analyzing_proposals: {
    label: 'Analyzing Proposals',
    icon: Loader2,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  failed: {
    label: 'Failed',
    icon: AlertCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
};

const detailStatusConfig = {
  pending: { icon: Clock, color: 'text-text-placeholder' },
  in_progress: { icon: Loader2, color: 'text-status-processing' },
  completed: { icon: CheckCircle, color: 'text-success' },
  failed: { icon: AlertCircle, color: 'text-destructive' },
};

export function WorkflowStatus({ stage, progress, message, details, className }: WorkflowStatusProps) {
  const config = stageConfig[stage];
  const Icon = config.icon;
  const isAnimated = ['analyzing', 'searching', 'analyzing_proposals'].includes(stage);

  return (
    <Card className={`${className || ''}`}>
      <CardContent className="pt-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color} ${isAnimated ? 'animate-spin' : ''}`} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold">{config.label}</h4>
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
          </div>
          <Badge variant={stage === 'failed' ? 'destructive' : 'secondary'}>
            {progress}%
          </Badge>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="h-2" />

        {/* Details */}
        {details && details.length > 0 && (
          <div className="space-y-2 pt-2">
            {details.map((detail, index) => {
              const DetailIcon = detail.status ? detailStatusConfig[detail.status].icon : null;
              const detailColor = detail.status ? detailStatusConfig[detail.status].color : 'text-muted-foreground';

              return (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm py-1 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {DetailIcon && (
                      <DetailIcon
                        className={`h-4 w-4 ${detailColor} ${
                          detail.status === 'in_progress' ? 'animate-spin' : ''
                        }`}
                      />
                    )}
                    <span className="text-muted-foreground">{detail.label}</span>
                  </div>
                  <span className="font-medium">{detail.value}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
