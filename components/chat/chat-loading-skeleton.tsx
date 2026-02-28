"use client"

import { ChatSkeletonTheme, Skeleton } from '@/components/ui/chat-skeleton'

/**
 * ChatLoadingSkeleton
 *
 * Skeleton placeholder that mimics the ChatInterface layout.
 * Shown immediately when a flight request card is clicked,
 * before messages finish loading from the API.
 */
export function ChatLoadingSkeleton() {
  return (
    <ChatSkeletonTheme>
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        {/* Message area skeleton */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4">
            <div className="space-y-4">
              {/* Agent message (left-aligned, wider) */}
              <div className="flex flex-col items-start space-y-2">
                <div className="flex items-center space-x-2">
                  <Skeleton circle width={27} height={27} />
                  <Skeleton width={100} height={12} />
                </div>
                <div className="max-w-[80%]">
                  <Skeleton count={2} />
                  <Skeleton width="60%" />
                </div>
              </div>

              {/* User message (right-aligned, shorter) */}
              <div className="flex flex-col items-end space-y-2">
                <div className="max-w-[60%]">
                  <Skeleton count={1} />
                </div>
              </div>

              {/* Agent message (left-aligned, wider) */}
              <div className="flex flex-col items-start space-y-2">
                <div className="flex items-center space-x-2">
                  <Skeleton circle width={27} height={27} />
                  <Skeleton width={100} height={12} />
                </div>
                <div className="max-w-[80%]">
                  <Skeleton count={3} />
                  <Skeleton width="45%" />
                </div>
              </div>

              {/* User message (right-aligned, shorter) */}
              <div className="flex flex-col items-end space-y-2">
                <div className="max-w-[50%]">
                  <Skeleton count={1} />
                </div>
              </div>

              {/* Agent message (left-aligned) */}
              <div className="flex flex-col items-start space-y-2">
                <div className="flex items-center space-x-2">
                  <Skeleton circle width={27} height={27} />
                  <Skeleton width={100} height={12} />
                </div>
                <div className="max-w-[75%]">
                  <Skeleton count={2} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input area skeleton */}
        <div className="border-t border-border p-4">
          <div className="max-w-4xl mx-auto flex items-center space-x-2">
            <Skeleton height={44} containerClassName="flex-1" />
            <Skeleton circle width={44} height={44} />
          </div>
        </div>
      </div>
    </ChatSkeletonTheme>
  )
}
