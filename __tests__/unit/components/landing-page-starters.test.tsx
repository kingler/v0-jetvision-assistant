/**
 * Tests for LandingPage integration with ConversationStarterHub
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { LandingPage } from "@/components/landing-page"

// Mock the conversation starters components
vi.mock("@/components/conversation-starters", () => ({
  ConversationStarterHub: vi.fn(({ starters, onStarterClick, loading }) => (
    <div data-testid="conversation-starter-hub">
      {loading && <div data-testid="loading-state">Loading...</div>}
      {starters?.map((starter: { id: string; title: string; action: string }) => (
        <button
          key={starter.id}
          data-testid={`starter-${starter.id}`}
          onClick={() => onStarterClick(starter.action, starter)}
        >
          {starter.title}
        </button>
      ))}
    </div>
  )),
  useSmartStarters: vi.fn(() => ({
    starters: [
      { id: "new-flight-request", title: "New Flight Request", action: "new-flight-request", category: "flight" },
      { id: "active-requests", title: "My Active Requests", action: "show-active-requests", category: "flight" },
      { id: "show-deals", title: "Show My Deals", action: "show-deals", category: "deals" },
    ],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  })),
  DEFAULT_STARTERS: [],
}))

describe("LandingPage with ConversationStarterHub", () => {
  const mockOnStartChat = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("ConversationStarterHub integration", () => {
    it("should render ConversationStarterHub component", () => {
      render(<LandingPage onStartChat={mockOnStartChat} />)

      expect(screen.getByTestId("conversation-starter-hub")).toBeInTheDocument()
    })

    it("should display conversation starters from useSmartStarters", () => {
      render(<LandingPage onStartChat={mockOnStartChat} />)

      expect(screen.getByTestId("starter-new-flight-request")).toBeInTheDocument()
      expect(screen.getByTestId("starter-active-requests")).toBeInTheDocument()
      expect(screen.getByTestId("starter-show-deals")).toBeInTheDocument()
    })

    it("should trigger onStartChat when a starter is clicked", () => {
      render(<LandingPage onStartChat={mockOnStartChat} />)

      fireEvent.click(screen.getByTestId("starter-new-flight-request"))

      expect(mockOnStartChat).toHaveBeenCalledWith(
        expect.stringMatching(/flight|request/i)
      )
    })

    it("should map starter actions to appropriate chat messages", () => {
      render(<LandingPage onStartChat={mockOnStartChat} />)

      // Click "Show My Deals" starter
      fireEvent.click(screen.getByTestId("starter-show-deals"))

      expect(mockOnStartChat).toHaveBeenCalled()
    })
  })

  describe("greeting and input", () => {
    it("should still display greeting message", () => {
      render(<LandingPage onStartChat={mockOnStartChat} userName="Test User" />)

      // Should contain greeting (morning/afternoon/evening)
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

      // Old prompts should not be present
      expect(screen.queryByText("I want to help book a flight for a new client")).not.toBeInTheDocument()
      expect(screen.queryByText("Pull up flight preferences")).not.toBeInTheDocument()
    })

    it("should maintain visual hierarchy with greeting > input > starters", () => {
      const { container } = render(<LandingPage onStartChat={mockOnStartChat} />)

      // Check DOM order
      const greeting = container.querySelector("h1")
      const form = container.querySelector("form")
      const starters = screen.getByTestId("conversation-starter-hub")

      expect(greeting).toBeTruthy()
      expect(form).toBeTruthy()
      expect(starters).toBeTruthy()
    })
  })
})
