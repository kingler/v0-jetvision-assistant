import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';

export interface AvinodeMessageCardProps {
  messageType: 'REQUEST' | 'RESPONSE' | 'INFO' | 'CONFIRMATION';
  content: string;
  timestamp: string;
  sender?: string;
}

export function AvinodeMessageCard({
  messageType,
  content,
  timestamp,
  sender,
}: AvinodeMessageCardProps) {
  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'REQUEST':
        return 'default';
      case 'RESPONSE':
        return 'secondary';
      case 'INFO':
        return 'outline';
      case 'CONFIRMATION':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          💬 Communication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Message Type */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Message Type</span>
          <Badge variant={getBadgeVariant(messageType)}>{messageType}</Badge>
        </div>

        {/* Message Content */}
        <div className="rounded-lg border p-3 bg-muted/20">
          <div className="text-sm break-words overflow-wrap-anywhere">"{content}"</div>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground">
          Sent: {formatTimestamp(timestamp)}
        </div>

        {/* Sender (optional) */}
        {sender && (
          <div className="text-xs text-muted-foreground">
            From: <span className="font-medium">{sender}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
