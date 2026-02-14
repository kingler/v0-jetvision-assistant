/**
 * FlightRequestStarter - Inline flight request form for chat
 *
 * Renders an inline form when user clicks the "New Flight Request"
 * conversation starter. Collects flight details and triggers trip creation.
 *
 * @module components/conversation-starters/flight-request-starter
 */
'use client'

import React, { useState, useCallback, useId, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plane, Calendar, Users, X, Loader2 } from 'lucide-react'

/**
 * Airport data returned from search
 */
export interface Airport {
  icao: string
  iata: string
  name: string
  city: string
  country: string
}

/**
 * Flight request form data
 */
export interface FlightRequestData {
  departureAirport: string
  arrivalAirport: string
  departureDate: string
  passengers: number
}

/**
 * Default values for pre-populating the form
 */
export interface FlightRequestDefaults {
  departureAirport?: string
  arrivalAirport?: string
  departureDate?: string
  passengers?: number
}

export interface FlightRequestStarterProps {
  /** Callback when form is submitted with valid data */
  onSubmit: (data: FlightRequestData) => void | Promise<void>
  /** Callback when cancel button is clicked */
  onCancel: () => void
  /** Callback to search for airports (triggers autocomplete) */
  onAirportSearch: (query: string) => Promise<Airport[]>
  /** Default values to pre-populate the form */
  defaultValues?: FlightRequestDefaults
}

/**
 * Form validation errors
 */
interface FormErrors {
  departureAirport?: string
  arrivalAirport?: string
  departureDate?: string
  passengers?: string
}

/**
 * FlightRequestStarter component
 *
 * Inline flight request form that appears in chat when user
 * clicks the "New Flight Request" conversation starter.
 */
export function FlightRequestStarter({
  onSubmit,
  onCancel,
  onAirportSearch,
  defaultValues,
}: FlightRequestStarterProps) {
  // Generate unique IDs for accessibility
  const idPrefix = useId()

  // Form state
  const [departureAirport, setDepartureAirport] = useState(defaultValues?.departureAirport || '')
  const [arrivalAirport, setArrivalAirport] = useState(defaultValues?.arrivalAirport || '')
  const [departureDate, setDepartureDate] = useState(defaultValues?.departureDate || '')
  const [passengers, setPassengers] = useState(defaultValues?.passengers?.toString() || '1')

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  // Autocomplete state
  const [departureSuggestions, setDepartureSuggestions] = useState<Airport[]>([])
  const [arrivalSuggestions, setArrivalSuggestions] = useState<Airport[]>([])
  const [showDepartureSuggestions, setShowDepartureSuggestions] = useState(false)
  const [showArrivalSuggestions, setShowArrivalSuggestions] = useState(false)
  const [isSearchingDeparture, setIsSearchingDeparture] = useState(false)
  const [isSearchingArrival, setIsSearchingArrival] = useState(false)

  // Refs for click outside handling
  const departureRef = useRef<HTMLDivElement>(null)
  const arrivalRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (departureRef.current && !departureRef.current.contains(event.target as Node)) {
        setShowDepartureSuggestions(false)
      }
      if (arrivalRef.current && !arrivalRef.current.contains(event.target as Node)) {
        setShowArrivalSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /**
   * Search for airports with debounce
   */
  const searchAirports = useCallback(async (
    query: string,
    setLoading: (loading: boolean) => void,
    setSuggestions: (airports: Airport[]) => void,
    setShow: (show: boolean) => void
  ) => {
    if (query.length < 2) {
      setSuggestions([])
      setShow(false)
      return
    }

    setLoading(true)
    try {
      const results = await onAirportSearch(query)
      setSuggestions(results)
      setShow(results.length > 0)
    } catch {
      setSuggestions([])
      setShow(false)
    } finally {
      setLoading(false)
    }
  }, [onAirportSearch])

  /**
   * Handle departure input change
   */
  const handleDepartureChange = useCallback((value: string) => {
    setDepartureAirport(value.toUpperCase())
    setErrors(prev => ({ ...prev, departureAirport: undefined }))
    searchAirports(value, setIsSearchingDeparture, setDepartureSuggestions, setShowDepartureSuggestions)
  }, [searchAirports])

  /**
   * Handle arrival input change
   */
  const handleArrivalChange = useCallback((value: string) => {
    setArrivalAirport(value.toUpperCase())
    setErrors(prev => ({ ...prev, arrivalAirport: undefined }))
    searchAirports(value, setIsSearchingArrival, setArrivalSuggestions, setShowArrivalSuggestions)
  }, [searchAirports])

  /**
   * Select airport from suggestions
   */
  const selectDepartureAirport = useCallback((airport: Airport) => {
    setDepartureAirport(airport.icao)
    setShowDepartureSuggestions(false)
    setErrors(prev => ({ ...prev, departureAirport: undefined }))
  }, [])

  const selectArrivalAirport = useCallback((airport: Airport) => {
    setArrivalAirport(airport.icao)
    setShowArrivalSuggestions(false)
    setErrors(prev => ({ ...prev, arrivalAirport: undefined }))
  }, [])

  /**
   * Validate form data
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    // Departure airport validation
    if (!departureAirport.trim()) {
      newErrors.departureAirport = 'Departure airport is required'
    } else if (departureAirport.length < 3 || departureAirport.length > 4) {
      newErrors.departureAirport = 'Please enter a valid airport code (3-4 characters)'
    }

    // Arrival airport validation
    if (!arrivalAirport.trim()) {
      newErrors.arrivalAirport = 'Arrival airport is required'
    } else if (arrivalAirport.length < 3 || arrivalAirport.length > 4) {
      newErrors.arrivalAirport = 'Please enter a valid airport code (3-4 characters)'
    }

    // Date validation
    if (!departureDate) {
      newErrors.departureDate = 'Departure date is required'
    }

    // Passengers validation
    const passengerCount = parseInt(passengers, 10)
    if (isNaN(passengerCount) || passengerCount < 1) {
      newErrors.passengers = 'At least 1 passenger required'
    } else if (passengerCount > 20) {
      newErrors.passengers = 'Maximum 20 passengers allowed'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [departureAirport, arrivalAirport, departureDate, passengers])

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        departureAirport,
        arrivalAirport,
        departureDate,
        passengers: parseInt(passengers, 10),
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [validateForm, onSubmit, departureAirport, arrivalAirport, departureDate, passengers])

  const departureInputId = `${idPrefix}-departure`
  const arrivalInputId = `${idPrefix}-arrival`
  const dateInputId = `${idPrefix}-date`
  const passengersInputId = `${idPrefix}-passengers`

  return (
    <Card className="w-full max-w-lg border-2 border-interactive-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 bg-interactive-bg rounded-lg flex items-center justify-center">
            <Plane className="w-4 h-4 text-interactive-text" />
          </div>
          New Flight Request
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Departure Airport */}
          <div ref={departureRef} className="relative">
            <Label htmlFor={departureInputId} className="flex items-center gap-1">
              Departure Airport
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative mt-1">
              <Input
                id={departureInputId}
                type="text"
                value={departureAirport}
                onChange={(e) => handleDepartureChange(e.target.value)}
                placeholder="KJFK or JFK"
                required
                aria-describedby={errors.departureAirport ? `${departureInputId}-error` : undefined}
                aria-invalid={!!errors.departureAirport}
                className={errors.departureAirport ? 'border-destructive' : ''}
              />
              {isSearchingDeparture && (
                <div data-testid="airport-search-loading" className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-text-placeholder" />
                </div>
              )}
            </div>
            {errors.departureAirport && (
              <p id={`${departureInputId}-error`} className="text-sm text-destructive mt-1">
                {errors.departureAirport}
              </p>
            )}
            {showDepartureSuggestions && departureSuggestions.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                {departureSuggestions.map((airport) => (
                  <li key={airport.icao}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-surface-tertiary text-sm"
                      onClick={() => selectDepartureAirport(airport)}
                    >
                      <span className="font-medium">{airport.icao}</span>
                      <span className="text-muted-foreground ml-2">
                        {airport.name} - {airport.city}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Arrival Airport */}
          <div ref={arrivalRef} className="relative">
            <Label htmlFor={arrivalInputId} className="flex items-center gap-1">
              Arrival Airport
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative mt-1">
              <Input
                id={arrivalInputId}
                type="text"
                value={arrivalAirport}
                onChange={(e) => handleArrivalChange(e.target.value)}
                placeholder="KLAX or LAX"
                required
                aria-describedby={errors.arrivalAirport ? `${arrivalInputId}-error` : undefined}
                aria-invalid={!!errors.arrivalAirport}
                className={errors.arrivalAirport ? 'border-destructive' : ''}
              />
              {isSearchingArrival && (
                <div data-testid="airport-search-loading" className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-text-placeholder" />
                </div>
              )}
            </div>
            {errors.arrivalAirport && (
              <p id={`${arrivalInputId}-error`} className="text-sm text-destructive mt-1">
                {errors.arrivalAirport}
              </p>
            )}
            {showArrivalSuggestions && arrivalSuggestions.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                {arrivalSuggestions.map((airport) => (
                  <li key={airport.icao}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-surface-tertiary text-sm"
                      onClick={() => selectArrivalAirport(airport)}
                    >
                      <span className="font-medium">{airport.icao}</span>
                      <span className="text-muted-foreground ml-2">
                        {airport.name} - {airport.city}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Departure Date */}
          <div>
            <Label htmlFor={dateInputId} className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Departure Date
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id={dateInputId}
              type="date"
              value={departureDate}
              onChange={(e) => {
                setDepartureDate(e.target.value)
                setErrors(prev => ({ ...prev, departureDate: undefined }))
              }}
              required
              aria-describedby={errors.departureDate ? `${dateInputId}-error` : undefined}
              aria-invalid={!!errors.departureDate}
              className={`mt-1 ${errors.departureDate ? 'border-destructive' : ''}`}
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.departureDate && (
              <p id={`${dateInputId}-error`} className="text-sm text-destructive mt-1">
                {errors.departureDate}
              </p>
            )}
          </div>

          {/* Passengers */}
          <div>
            <Label htmlFor={passengersInputId} className="flex items-center gap-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              Passengers
            </Label>
            <Input
              id={passengersInputId}
              type="number"
              value={passengers}
              onChange={(e) => {
                setPassengers(e.target.value)
                setErrors(prev => ({ ...prev, passengers: undefined }))
              }}
              min={1}
              max={20}
              aria-describedby={errors.passengers ? `${passengersInputId}-error` : undefined}
              aria-invalid={!!errors.passengers}
              className={`mt-1 ${errors.passengers ? 'border-destructive' : ''}`}
            />
            {errors.passengers && (
              <p id={`${passengersInputId}-error`} className="text-sm text-destructive mt-1">
                {errors.passengers}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                'Search Flights'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
