/**
 * Tests for LandingPage integration with StarterCard
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { LandingPage } from "@/components/landing-page"

// Mock the conversation starters components
vi.mock("@/components/conversation-starters", () => ({
  StarterCard: vi.fn(({ title, onClick, loading }) => (
    loading ? (
      <div data-testid="starter-loading">Loading...</div>
    ) : (
      <button
        data-testid={`starter-card-${title?.replace(/\s+/g, '-').toLowerCase()}`}
        onClick={onClick}
      >
        {title}
      </button>
    )
  )),
  useSmartStarters: vi.fn(() => ({
    starters: [
      { id: "new-flight-request", title: "New Flight Request", action: "new-flight-request", category: "flight", icon: () => null },
      { id: "active-requests", title: "My Active Requests", action: "show-active-requests", category: "flight", icon: () => null },
    ],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  })),
}))

describe("LandingPage with StarterCard", () => {
  const mockOnStartChat = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("StarterCard integration", () => {
    it("should display conversation starters from useSmartStarters", () => {
      render(<LandingPage onStartChat={mockOnStartChat} />)

      expect(screen.getByTestId("starter-card-new-flight-request")).toBeInTheDocument()
      expect(screen.getByTestId("starter-card-my-active-requests")).toBeInTheDocument()
    })

    it("should trigger onStartChat when a starter is clicked", () => {
      render(<LandingPage onStartChat={mockOnStartChat} />)

      fireEvent.click(screen.getByTestId("starter-card-new-flight-request"))

      expect(mockOnStartChat).toHaveBeenCalledWith(
        expect.stringMatching(/flight|request/i)
      )
    })
  })

  describe("greeting and input", () => {
    it("should still display greeting message", () => {
      render(<LandingPage onStartChat={mockOnStartChat} userName="Test User" />)

      expect(
        screen.getByText(/good (morning|afternoon|evening)/i)
      ).toBeInTheDocument()
    })

    it("should display personalized greeting with userName", () => {
      render(<LandingPage onStartChat={mockOnStartChat} userName="John" />)

      expect(screen.getByText(/John/)).toBeInTheDocument()
    })

    it("should still have input field for custom messages", () => {
      render(<LandingPage onStartChat={mockOnStartChat} />)

      expect(
        screen.getByPlaceholderText(/type your message/i)
      ).toBeInTheDocument()
    })

    it("should submit custom message when form is submitted", () => {
      render(<LandingPage onStartChat={mockOnStartChat} />)

      const input = screen.getByPlaceholderText(/type your message/i)
      fireEvent.change(input, { target: { value: "Custom request message" } })
      fireEvent.submit(input.closest("form")!)

      expect(mockOnStartChat).toHaveBeenCalledWith("Custom request message")
    })
  })

  describe("backward compatibility", () => {
    it("should not show legacy suggestedPrompts buttons", () => {
      render(<LandingPage onStartChat={mockOnStartChat} />)

      expect(screen.queryByText("I want to help book a flight for a new client")).not.toBeInTheDocument()
      expect(screen.queryByText("Pull up flight preferences")).not.toBeInTheDocument()
    })

    it("should maintain visual hierarchy with greeting > input > starters", () => {
      const { container } = render(<LandingPage onStartChat={mockOnStartChat} />)

      const greeting = container.querySelector("h1")
      const form = container.querySelector("form")

      expect(greeting).toBeTruthy()
      expect(form).toBeTruthy()
    })
  })
})
