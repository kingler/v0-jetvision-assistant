/**
 * Tests for FlightRequestStarter component (ONEK-160)
 *
 * Inline flight request form that appears in chat when user
 * clicks the "New Flight Request" conversation starter.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FlightRequestStarter } from '@/components/conversation-starters/flight-request-starter'

describe('FlightRequestStarter', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()
  const mockOnAirportSearch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnAirportSearch.mockResolvedValue([
      { icao: 'KJFK', iata: 'JFK', name: 'John F Kennedy Intl', city: 'New York', country: 'US' },
      { icao: 'KLAX', iata: 'LAX', name: 'Los Angeles Intl', city: 'Los Angeles', country: 'US' },
    ])
  })

  // Helper to get form elements
  const getFormElements = () => ({
    departureInput: screen.getByLabelText(/departure airport/i),
    arrivalInput: screen.getByLabelText(/arrival airport/i),
    dateInput: screen.getByLabelText(/departure date/i),
    passengersInput: screen.getByLabelText(/passengers/i),
    submitButton: screen.getByRole('button', { name: /search flights/i }),
    cancelButton: screen.getByRole('button', { name: /cancel/i }),
  })

  describe('Rendering', () => {
    it('should render the flight request form', () => {
      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
        />
      )

      expect(screen.getByText(/new flight request/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/departure airport/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/arrival airport/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/departure date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/passengers/i)).toBeInTheDocument()
    })

    it('should render submit and cancel buttons', () => {
      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
        />
      )

      expect(screen.getByRole('button', { name: /search flights/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should pre-populate with default values when provided', () => {
      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
          defaultValues={{
            departureAirport: 'KJFK',
            arrivalAirport: 'KLAX',
            departureDate: '2026-02-15',
            passengers: 4,
          }}
        />
      )

      expect(screen.getByDisplayValue('KJFK')).toBeInTheDocument()
      expect(screen.getByDisplayValue('KLAX')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2026-02-15')).toBeInTheDocument()
      expect(screen.getByDisplayValue('4')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should require departure airport', async () => {
      const user = userEvent.setup()
      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
        />
      )

      await user.click(screen.getByRole('button', { name: /search flights/i }))

      await waitFor(() => {
        expect(screen.getByText(/departure airport.*required/i)).toBeInTheDocument()
      })
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should require arrival airport', async () => {
      const user = userEvent.setup()
      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
        />
      )

      const { departureInput, submitButton } = getFormElements()
      await user.type(departureInput, 'KJFK')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/arrival.*required/i)).toBeInTheDocument()
      })
    })

    it('should require departure date', async () => {
      const user = userEvent.setup()
      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
        />
      )

      const { departureInput, arrivalInput, submitButton } = getFormElements()
      await user.type(departureInput, 'KJFK')
      await user.type(arrivalInput, 'KLAX')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/date.*required/i)).toBeInTheDocument()
      })
    })

    it('should validate airport code format (3-4 characters)', async () => {
      const user = userEvent.setup()
      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
        />
      )

      const { departureInput, submitButton } = getFormElements()
      await user.type(departureInput, 'AB')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/valid airport code/i)).toBeInTheDocument()
      })
    })

    it('should validate passenger count (1-20)', async () => {
      const user = userEvent.setup()
      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
        />
      )

      const { passengersInput, submitButton } = getFormElements()
      await user.clear(passengersInput)
      await user.type(passengersInput, '25')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/maximum.*20/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call onSubmit with form data when valid', async () => {
      const user = userEvent.setup()
      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
        />
      )

      const { departureInput, arrivalInput, dateInput, passengersInput, submitButton } = getFormElements()

      await user.type(departureInput, 'KJFK')
      await user.type(arrivalInput, 'KLAX')
      await user.clear(dateInput)
      await user.type(dateInput, '2026-02-15')
      await user.clear(passengersInput)
      await user.type(passengersInput, '4')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          departureAirport: 'KJFK',
          arrivalAirport: 'KLAX',
          departureDate: '2026-02-15',
          passengers: 4,
        })
      })
    })

    it('should disable submit button while submitting', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
          defaultValues={{
            departureAirport: 'KJFK',
            arrivalAirport: 'KLAX',
            departureDate: '2026-02-15',
            passengers: 4,
          }}
        />
      )

      await user.click(screen.getByRole('button', { name: /search flights/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /searching/i })).toBeDisabled()
      })
    })

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
        />
      )

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Airport Autocomplete', () => {
    it('should trigger airport search on departure input', async () => {
      const user = userEvent.setup()
      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
        />
      )

      const { departureInput } = getFormElements()
      await user.type(departureInput, 'JFK')

      await waitFor(() => {
        expect(mockOnAirportSearch).toHaveBeenCalledWith('JFK')
      })
    })

    it('should display airport suggestions', async () => {
      const user = userEvent.setup()
      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
        />
      )

      const { departureInput } = getFormElements()
      await user.type(departureInput, 'JFK')

      await waitFor(() => {
        expect(screen.getByText(/john f kennedy/i)).toBeInTheDocument()
      })
    })

    it('should select airport from suggestions', async () => {
      const user = userEvent.setup()
      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
        />
      )

      const { departureInput } = getFormElements()
      await user.type(departureInput, 'JFK')

      await waitFor(() => {
        expect(screen.getByText(/john f kennedy/i)).toBeInTheDocument()
      })

      await user.click(screen.getByText(/john f kennedy/i))

      expect(screen.getByDisplayValue('KJFK')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
        />
      )

      const { departureInput, arrivalInput, dateInput, passengersInput } = getFormElements()

      expect(departureInput).toHaveAttribute('id')
      expect(arrivalInput).toHaveAttribute('id')
      expect(dateInput).toHaveAttribute('id')
      expect(passengersInput).toHaveAttribute('id')
    })

    it('should indicate required fields', () => {
      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
        />
      )

      const { departureInput, arrivalInput, dateInput } = getFormElements()

      expect(departureInput).toHaveAttribute('required')
      expect(arrivalInput).toHaveAttribute('required')
      expect(dateInput).toHaveAttribute('required')
    })

    it('should have aria-describedby for error messages', async () => {
      const user = userEvent.setup()
      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
        />
      )

      await user.click(screen.getByRole('button', { name: /search flights/i }))

      await waitFor(() => {
        const departureInput = screen.getByLabelText(/departure airport/i)
        expect(departureInput).toHaveAttribute('aria-describedby')
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading indicator during airport search', async () => {
      const user = userEvent.setup()
      mockOnAirportSearch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

      render(
        <FlightRequestStarter
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onAirportSearch={mockOnAirportSearch}
        />
      )

      const { departureInput } = getFormElements()
      await user.type(departureInput, 'JFK')

      await waitFor(() => {
        expect(screen.getByTestId('airport-search-loading')).toBeInTheDocument()
      })
    })
  })
})
