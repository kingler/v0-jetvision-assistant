/**
 * Pipeline Dashboard Component
 *
 * Displays the sales pipeline with stats and recent requests
 * inline within the chat message thread.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Plane,
  Users,
  Clock,
  CheckCircle,
  FileText,
  Activity,
  RefreshCw,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import { PipelineDashboardComponent } from './types';

export interface PipelineDashboardProps {
  stats: PipelineDashboardComponent['stats'];
  requests: PipelineDashboardComponent['requests'];
  onViewRequest?: (requestId: string) => void;
  onRefresh?: () => void;
  className?: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  in_progress: { label: 'In Progress', variant: 'default' },
  awaiting_quotes: { label: 'Awaiting Quotes', variant: 'outline' },
  completed: { label: 'Completed', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
};

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  } catch {
    return dateString;
  }
}

export function PipelineDashboard({
  stats,
  requests,
  onViewRequest,
  onRefresh,
  className,
}: PipelineDashboardProps) {
  const statCards = [
    {
      label: 'Total Requests',
      value: stats.totalRequests,
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Pending',
      value: stats.pendingRequests,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Completed',
      value: stats.completedRequests,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Total Quotes',
      value: stats.totalQuotes,
      icon: FileText,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Active Workflows',
      value: stats.activeWorkflows,
      icon: Activity,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
    },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plane className="h-5 w-5" />
            Your Pipeline
          </CardTitle>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex flex-col items-center p-3 rounded-lg border bg-card"
              >
                <div className={`p-2 rounded-full ${stat.bgColor} mb-2`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-xs text-muted-foreground text-center">
                  {stat.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Recent Requests */}
        {requests.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">
              Recent Requests
            </h4>
            <div className="space-y-2">
              {requests.map((request) => {
                const statusInfo = statusConfig[request.status] || {
                  label: request.status,
                  variant: 'secondary' as const,
                };

                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center gap-1 font-medium">
                        <span className="text-sm">{request.departureAirport}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-sm">{request.arrivalAirport}</span>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(request.departureDate)}</span>
                      </div>
                      <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{request.passengers}</span>
                      </div>
                      {request.clientName && (
                        <span className="hidden lg:block text-sm text-muted-foreground truncate max-w-[150px]">
                          {request.clientName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      {onViewRequest && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewRequest(request.id)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Plane className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No requests yet. Start by creating a new flight request!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
