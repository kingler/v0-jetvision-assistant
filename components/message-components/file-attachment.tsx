/**
 * File Attachment Component
 *
 * Displays an attached file with preview, download, and metadata.
 * Supports images, PDFs, and other document types.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Download,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FileCode,
  Video,
  Music,
  Archive,
} from 'lucide-react';
import { FileAttachmentComponent } from './types';

export interface FileAttachmentProps {
  file: FileAttachmentComponent['file'];
  onDownload?: (fileId: string) => void;
  onPreview?: (fileId: string) => void;
  className?: string;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return FileImage;
  if (type.startsWith('video/')) return Video;
  if (type.startsWith('audio/')) return Music;
  if (type.includes('pdf')) return FileText;
  if (type.includes('sheet') || type.includes('excel')) return FileSpreadsheet;
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return Archive;
  if (type.includes('json') || type.includes('xml') || type.includes('code')) return FileCode;
  return File;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const canPreview = (type: string): boolean => {
  return (
    type.startsWith('image/') ||
    type.includes('pdf') ||
    type.startsWith('video/') ||
    type.startsWith('audio/')
  );
};

export function FileAttachment({ file, onDownload, onPreview, className }: FileAttachmentProps) {
  const { id, name, type, size, url, thumbnail } = file;
  const FileIcon = getFileIcon(type);
  const showPreview = canPreview(type) && onPreview;

  return (
    <Card className={`${className || ''}`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Thumbnail or Icon */}
          <div className="flex-shrink-0">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={name}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded object-cover border"
              />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded bg-muted flex items-center justify-center border">
                <FileIcon className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate" title={name}>
              {name}
            </h4>
            <div className="flex items-center gap-2 mt-1 min-w-0">
              <span className="text-xs text-muted-foreground shrink-0">
                {formatFileSize(size)}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">•</span>
              <span className="text-xs text-muted-foreground uppercase truncate">
                {type.split('/')[1] || 'file'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              {showPreview && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => onPreview(id)}
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  Preview
                </Button>
              )}
              {onDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => onDownload(id)}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download
                </Button>
              )}
              {!showPreview && !onDownload && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Open File
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
