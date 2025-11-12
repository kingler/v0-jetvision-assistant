/**
 * Progress Indicator Component
 *
 * Displays loading/processing state with optional progress bar,
 * message, and cancellation support.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { ProgressIndicatorComponent } from './types';

export interface ProgressIndicatorProps {
  message: string;
  progress?: number;
  variant?: ProgressIndicatorComponent['variant'];
  cancellable?: boolean;
  onCancel?: () => void;
  className?: string;
}

export function ProgressIndicator({
  message,
  progress,
  variant = 'spinner',
  cancellable = false,
  onCancel,
  className,
}: ProgressIndicatorProps) {
  const renderIndicator = () => {
    switch (variant) {
      case 'bar':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{message}</p>
              {progress !== undefined && (
                <span className="text-sm font-medium">{Math.round(progress)}%</span>
              )}
            </div>
            <Progress
              value={progress !== undefined ? progress : undefined}
              className="h-2"
            />
          </div>
        );

      case 'dots':
        return (
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-sm text-muted-foreground">{message}</p>
            {progress !== undefined && (
              <span className="text-sm font-medium ml-auto">{Math.round(progress)}%</span>
            )}
          </div>
        );

      case 'spinner':
      default:
        return (
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground flex-1">{message}</p>
            {progress !== undefined && (
              <span className="text-sm font-medium">{Math.round(progress)}%</span>
            )}
          </div>
        );
    }
  };

  return (
    <Card className={`${className || ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            {renderIndicator()}
          </div>
          {cancellable && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
