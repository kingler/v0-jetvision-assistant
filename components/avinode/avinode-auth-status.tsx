import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';

export interface AvinodeAuthStatusProps {
  method: 'bearer' | 'api_key';
  environment: 'sandbox' | 'production';
  baseUrl: string;
  expiresAt?: Date;
  isValid: boolean;
}

export function AvinodeAuthStatus({
  method,
  environment,
  baseUrl,
  expiresAt,
  isValid,
}: AvinodeAuthStatusProps) {
  const getMethodLabel = (method: string) => {
    return method === 'bearer' ? 'Bearer Token' : 'API Key';
  };

  const getEnvironmentLabel = (env: string) => {
    return env.charAt(0).toUpperCase() + env.slice(1);
  };

  const getEnvironmentVariant = (env: string) => {
    return env === 'sandbox' ? 'secondary' : 'default';
  };

  const formatExpirationDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysUntilExpiration = (date: Date) => {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationWarningClass = (daysRemaining: number) => {
    if (daysRemaining < 7) {
      return 'text-destructive font-semibold';
    } else if (daysRemaining < 30) {
      return 'text-warning font-semibold';
    }
    return 'text-muted-foreground';
  };

  const daysRemaining = expiresAt ? getDaysUntilExpiration(expiresAt) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Authentication Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Method Row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Method</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">{getMethodLabel(method)}</span>
            <span className={isValid ? 'text-success' : 'text-destructive'}>
              {isValid ? '✓ Valid' : '✗ Invalid'}
            </span>
          </div>
        </div>

        {/* Environment Row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Environment</span>
          <div className="flex items-center gap-2">
            <Badge variant={getEnvironmentVariant(environment)}>
              {getEnvironmentLabel(environment)}
            </Badge>
            <span className="text-xs text-muted-foreground">({baseUrl})</span>
          </div>
        </div>

        {/* Expiration Row */}
        {expiresAt && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Expires</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{formatExpirationDate(expiresAt)}</span>
              {daysRemaining !== null && (
                <span className={getExpirationWarningClass(daysRemaining)}>
                  [{daysRemaining} days]
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
