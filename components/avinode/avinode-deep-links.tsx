import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Search, Eye, X } from 'lucide-react';

export interface AvinodeDeepLinksProps {
  links: {
    searchInAvinode: {
      href: string;
      description: string;
    };
    viewInAvinode: {
      href: string;
      description: string;
    };
    cancel: {
      href: string;
      description: string;
    };
  };
  onLinkClick?: (linkType: 'search' | 'view' | 'cancel') => void;
}

export function AvinodeDeepLinks({ links, onLinkClick }: AvinodeDeepLinksProps) {
  const truncateUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  const handleLinkClick = (linkType: 'search' | 'view' | 'cancel') => {
    if (onLinkClick) {
      onLinkClick(linkType);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base md:text-lg font-semibold">Avinode Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search Link - Primary Action */}
        <a
          href={links.searchInAvinode.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleLinkClick('search')}
          className="flex items-start gap-3 rounded-lg border border-primary/50 bg-primary/5 p-3 md:p-4 transition-colors hover:bg-primary/50 min-h-[44px]"
        >
          <Search className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm md:text-base font-medium">Search in Avinode</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              {links.searchInAvinode.description}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {truncateUrl(links.searchInAvinode.href)}
            </p>
          </div>
        </a>

        {/* View Link */}
        <a
          href={links.viewInAvinode.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleLinkClick('view')}
          className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-primary/50"
        >
          <Eye className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">View Trip</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {links.viewInAvinode.description}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {truncateUrl(links.viewInAvinode.href)}
            </p>
          </div>
        </a>

        {/* Cancel Link - Destructive */}
        <a
          href={links.cancel.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleLinkClick('cancel')}
          className="flex items-start gap-3 rounded-lg border border-destructive/30 p-4 transition-colors hover:bg-primary/50"
        >
          <X className="h-5 w-5 mt-0.5 text-destructive flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-destructive">Cancel Trip</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {links.cancel.description}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {truncateUrl(links.cancel.href)}
            </p>
          </div>
        </a>

        {/* Instructional Text */}
        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            💡 Click any link above to open in Avinode. Actions will open in a new tab.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
