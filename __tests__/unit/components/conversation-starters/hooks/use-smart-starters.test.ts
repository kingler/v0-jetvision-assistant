/**
 * Tests for useSmartStarters hook
 *
 * TDD: RED phase - write tests first
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useSmartStarters } from "@/components/conversation-starters/hooks/use-smart-starters"
import type { UserContext, SmartStartersResult } from "@/components/conversation-starters/hooks/use-smart-starters"
import { DEFAULT_STARTERS } from "@/components/conversation-starters/default-starters"

// Mock analytics
const mockTrackEvent = vi.fn()
vi.mock("@/lib/analytics", () => ({
  trackEvent: (name: string, data: unknown) => mockTrackEvent(name, data),
}))

describe("useSmartStarters", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("default behavior", () => {
    it("should return default starters when no context is provided", () => {
      const { result } = renderHook(() => useSmartStarters())

      expect(result.current.starters).toHaveLength(DEFAULT_STARTERS.length)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it("should return starters sorted by priority within categories", () => {
      const { result } = renderHook(() => useSmartStarters())

      const flightStarters = result.current.starters.filter(
        (s) => s.category === "flight"
      )
      expect(flightStarters[0].id).toBe("new-flight-request")
      expect(flightStarters[1].id).toBe("active-requests")
    })

    it("should include all default starter properties", () => {
      const { result } = renderHook(() => useSmartStarters())

      const firstStarter = result.current.starters[0]
      expect(firstStarter).toHaveProperty("id")
      expect(firstStarter).toHaveProperty("title")
      expect(firstStarter).toHaveProperty("description")
      expect(firstStarter).toHaveProperty("icon")
      expect(firstStarter).toHaveProperty("category")
      expect(firstStarter).toHaveProperty("action")
    })
  })

  describe("with active requests context", () => {
    it("should add badge count to active-requests starter", () => {
      const context: UserContext = {
        activeRequestCount: 3,
      }

      const { result } = renderHook(() => useSmartStarters(context))

      const activeRequestsStarter = result.current.starters.find(
        (s) => s.id === "active-requests"
      )
      expect(activeRequestsStarter?.badge).toBe(3)
    })

    it("should prioritize active-requests when user has pending requests", () => {
      const context: UserContext = {
        activeRequestCount: 5,
      }

      const { result } = renderHook(() => useSmartStarters(context))

      const flightStarters = result.current.starters.filter(
        (s) => s.category === "flight"
      )
      // When there are active requests, active-requests should come first
      expect(flightStarters[0].id).toBe("active-requests")
    })

    it("should not show badge when activeRequestCount is 0", () => {
      const context: UserContext = {
        activeRequestCount: 0,
      }

      const { result } = renderHook(() => useSmartStarters(context))

      const activeRequestsStarter = result.current.starters.find(
        (s) => s.id === "active-requests"
      )
      expect(activeRequestsStarter?.badge).toBeUndefined()
    })
  })

  describe("with pending quotes context", () => {
    it("should handle pending quotes context gracefully when show-deals starter not in defaults", () => {
      const context: UserContext = {
        pendingQuotesCount: 7,
      }

      const { result } = renderHook(() => useSmartStarters(context))

      // show-deals not in DEFAULT_STARTERS, so no starter gets the badge
      const dealsStarter = result.current.starters.find(
        (s) => s.id === "show-deals"
      )
      expect(dealsStarter).toBeUndefined()
    })

    it("should maintain starter order when no deals category exists", () => {
      const context: UserContext = {
        pendingQuotesCount: 3,
      }

      const { result } = renderHook(() => useSmartStarters(context))

      // No deals starters exist, all starters are flight category
      const dealsIndex = result.current.starters.findIndex(
        (s) => s.category === "deals"
      )
      expect(dealsIndex).toBe(-1)
    })
  })

  describe("with hot opportunities context", () => {
    it("should handle hot opportunities context gracefully when starter not in defaults", () => {
      const context: UserContext = {
        hotOpportunitiesCount: 2,
      }

      const { result } = renderHook(() => useSmartStarters(context))

      // hot-opportunities not in DEFAULT_STARTERS
      const hotOppsStarter = result.current.starters.find(
        (s) => s.id === "hot-opportunities"
      )
      expect(hotOppsStarter).toBeUndefined()
    })

    it("should not crash with hot opportunities context when starter not in defaults", () => {
      const context: UserContext = {
        hotOpportunitiesCount: 5,
      }

      const { result } = renderHook(() => useSmartStarters(context))

      // Hook should still return all default starters
      expect(result.current.starters).toHaveLength(DEFAULT_STARTERS.length)
      expect(result.current.error).toBeNull()
    })
  })

  describe("priority logic", () => {
    it("should maintain flight starter order when no deals starters exist", () => {
      const context: UserContext = {
        pendingQuotesCount: 5,
        activeRequestCount: 0,
      }

      const { result } = renderHook(() => useSmartStarters(context))

      // No deals starters exist in current defaults
      const firstDealIndex = result.current.starters.findIndex(
        (s) => s.category === "deals"
      )
      expect(firstDealIndex).toBe(-1)

      // Flight starters should still be present
      const flightStarters = result.current.starters.filter(
        (s) => s.category === "flight"
      )
      expect(flightStarters.length).toBeGreaterThan(0)
    })

    it("should show new-flight-request first when no active requests or quotes", () => {
      const context: UserContext = {
        activeRequestCount: 0,
        pendingQuotesCount: 0,
        hotOpportunitiesCount: 0,
      }

      const { result } = renderHook(() => useSmartStarters(context))

      // First flight starter should be new-flight-request
      const flightStarters = result.current.starters.filter(
        (s) => s.category === "flight"
      )
      expect(flightStarters[0].id).toBe("new-flight-request")
    })

    it("should combine multiple context factors correctly", () => {
      const context: UserContext = {
        activeRequestCount: 2,
        pendingQuotesCount: 3,
        hotOpportunitiesCount: 1,
      }

      const { result } = renderHook(() => useSmartStarters(context))

      // Only active-requests badge should be applied (show-deals and hot-opportunities not in defaults)
      const activeRequests = result.current.starters.find(
        (s) => s.id === "active-requests"
      )
      expect(activeRequests?.badge).toBe(2)

      // Non-existent starters should not appear
      expect(result.current.starters.find((s) => s.id === "show-deals")).toBeUndefined()
      expect(result.current.starters.find((s) => s.id === "hot-opportunities")).toBeUndefined()
    })
  })

  describe("disabled state", () => {
    it("should disable new-flight-request when user is at request limit", () => {
      const context: UserContext = {
        activeRequestCount: 10,
        isAtRequestLimit: true,
      }

      const { result } = renderHook(() => useSmartStarters(context))

      const newFlightStarter = result.current.starters.find(
        (s) => s.id === "new-flight-request"
      )
      expect(newFlightStarter?.disabled).toBe(true)
    })

    it("should not disable starters by default", () => {
      const { result } = renderHook(() => useSmartStarters())

      const allEnabled = result.current.starters.every((s) => !s.disabled)
      expect(allEnabled).toBe(true)
    })
  })

  describe("caching behavior", () => {
    it("should return same starters reference when context hasn't changed", () => {
      const context: UserContext = {
        activeRequestCount: 3,
      }

      const { result, rerender } = renderHook(
        ({ ctx }) => useSmartStarters(ctx),
        { initialProps: { ctx: context } }
      )

      const firstStarters = result.current.starters

      rerender({ ctx: context })

      // Should maintain referential equality for performance
      expect(result.current.starters).toBe(firstStarters)
    })

    it("should update starters when context changes", () => {
      const { result, rerender } = renderHook(
        ({ ctx }) => useSmartStarters(ctx),
        { initialProps: { ctx: { activeRequestCount: 1 } } }
      )

      const firstBadge = result.current.starters.find(
        (s) => s.id === "active-requests"
      )?.badge

      rerender({ ctx: { activeRequestCount: 5 } })

      const secondBadge = result.current.starters.find(
        (s) => s.id === "active-requests"
      )?.badge

      expect(firstBadge).toBe(1)
      expect(secondBadge).toBe(5)
    })
  })

  describe("analytics tracking", () => {
    it("should fire analytics event when context changes", async () => {
      const context: UserContext = {
        activeRequestCount: 3,
        pendingQuotesCount: 2,
      }

      renderHook(() => useSmartStarters(context))

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          "smart_starters_context_updated",
          expect.objectContaining({
            activeRequestCount: 3,
            pendingQuotesCount: 2,
          })
        )
      })
    })

    it("should not fire analytics on initial render with empty context", () => {
      renderHook(() => useSmartStarters())

      // Should not track when there's no meaningful context
      expect(mockTrackEvent).not.toHaveBeenCalled()
    })
  })

  describe("error handling", () => {
    it("should fall back to default starters on error", () => {
      // Even with invalid context, should return defaults
      const context: UserContext = {
        activeRequestCount: -1, // Invalid
      }

      const { result } = renderHook(() => useSmartStarters(context))

      // Should still return starters
      expect(result.current.starters.length).toBeGreaterThan(0)
      expect(result.current.error).toBeNull()
    })

    it("should handle undefined context gracefully", () => {
      const { result } = renderHook(() => useSmartStarters(undefined))

      expect(result.current.starters).toHaveLength(DEFAULT_STARTERS.length)
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe("performance", () => {
    it("should process context in under 100ms", () => {
      const context: UserContext = {
        activeRequestCount: 100,
        pendingQuotesCount: 50,
        hotOpportunitiesCount: 25,
      }

      const startTime = performance.now()
      renderHook(() => useSmartStarters(context))
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe("return type structure", () => {
    it("should return SmartStartersResult with all expected properties", () => {
      const { result } = renderHook(() => useSmartStarters())

      const returnValue: SmartStartersResult = result.current

      expect(returnValue).toHaveProperty("starters")
      expect(returnValue).toHaveProperty("isLoading")
      expect(returnValue).toHaveProperty("error")
      expect(returnValue).toHaveProperty("refresh")
      expect(typeof returnValue.refresh).toBe("function")
    })

    it("should have refresh function that triggers recalculation", async () => {
      const { result } = renderHook(() =>
        useSmartStarters({ activeRequestCount: 1 })
      )

      const initialStarters = result.current.starters

      // Call refresh
      result.current.refresh()

      await waitFor(() => {
        // Starters should be recalculated (may or may not be same reference)
        expect(result.current.starters).toBeDefined()
      })
    })
  })
})
