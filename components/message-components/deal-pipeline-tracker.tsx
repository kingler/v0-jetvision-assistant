/**
 * Deal Pipeline Tracker Component
 *
 * Visual step-by-step pipeline showing deal stages with counts and progress.
 * Displays: New Request → RFP Sent → Quotes Received → Proposal Sent → Booking Confirmed
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import type { DealPipelineStage } from './types';

export interface DealPipelineTrackerProps {
  stages: DealPipelineStage[];
  onStageClick?: (stageId: string) => void;
  className?: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function DealPipelineTracker({
  stages,
  onStageClick,
  className,
}: DealPipelineTrackerProps) {
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop View - Horizontal Pipeline */}
      <div className="hidden sm:block">
        <div className="flex items-start justify-between relative">
          {/* Connection Line */}
          <div className="absolute top-4 left-8 right-8 h-0.5 bg-muted-foreground/20" />

          {sortedStages.map((stage, index) => {
            const isFirst = index === 0;
            const isLast = index === sortedStages.length - 1;

            return (
              <div
                key={stage.id}
                className={cn(
                  'flex flex-col items-center relative z-10',
                  'flex-1',
                  onStageClick && 'cursor-pointer hover:opacity-80 transition-opacity'
                )}
                onClick={() => onStageClick?.(stage.id)}
              >
                {/* Stage Icon */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    'border-2 bg-background',
                    stage.status === 'completed' && 'border-green-500 bg-green-500/10',
                    stage.status === 'active' && 'border-blue-500 bg-blue-500/10',
                    stage.status === 'pending' && 'border-muted-foreground/30 bg-muted/50'
                  )}
                >
                  {stage.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : stage.status === 'active' ? (
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/50" />
                  )}
                </div>

                {/* Stage Name */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center',
                    stage.status === 'completed' && 'text-green-600',
                    stage.status === 'active' && 'text-blue-600',
                    stage.status === 'pending' && 'text-muted-foreground'
                  )}
                >
                  {stage.shortName}
                </span>

                {/* Count Badge */}
                <Badge
                  variant={stage.status === 'active' ? 'default' : 'secondary'}
                  className={cn(
                    'mt-1 text-xs',
                    stage.status === 'completed' && 'bg-green-100 text-green-700 hover:bg-green-100',
                    stage.status === 'active' && 'bg-blue-100 text-blue-700 hover:bg-blue-100',
                    stage.status === 'pending' && 'bg-muted text-muted-foreground'
                  )}
                >
                  {stage.count}
                </Badge>

                {/* Value (if > 0) */}
                {stage.value > 0 && (
                  <span className="mt-1 text-[10px] text-muted-foreground">
                    {formatCurrency(stage.value)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile View - Vertical Pipeline */}
      <div className="sm:hidden space-y-2">
        {sortedStages.map((stage, index) => {
          const isLast = index === sortedStages.length - 1;

          return (
            <div
              key={stage.id}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg',
                stage.status === 'active' && 'bg-blue-500/5',
                onStageClick && 'cursor-pointer hover:bg-accent/50 transition-colors'
              )}
              onClick={() => onStageClick?.(stage.id)}
            >
              {/* Stage Icon with Line */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center',
                    'border-2',
                    stage.status === 'completed' && 'border-green-500 bg-green-500/10',
                    stage.status === 'active' && 'border-blue-500 bg-blue-500/10',
                    stage.status === 'pending' && 'border-muted-foreground/30 bg-muted/50'
                  )}
                >
                  {stage.status === 'completed' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : stage.status === 'active' ? (
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </div>
                {!isLast && (
                  <div className="w-0.5 h-4 bg-muted-foreground/20 mt-1" />
                )}
              </div>

              {/* Stage Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      stage.status === 'completed' && 'text-green-600',
                      stage.status === 'active' && 'text-blue-600',
                      stage.status === 'pending' && 'text-muted-foreground'
                    )}
                  >
                    {stage.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs',
                        stage.status === 'completed' && 'bg-green-100 text-green-700',
                        stage.status === 'active' && 'bg-blue-100 text-blue-700'
                      )}
                    >
                      {stage.count}
                    </Badge>
                    {stage.value > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(stage.value)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
