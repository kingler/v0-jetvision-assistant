/**
 * Types for aviation data
 * Note: Mock data has been removed. Use real data from Avinode API/webhooks.
 */

export interface Operator {
  id: string
  name: string
  aircraft: string
  basePrice: number
  availability: "confirmed" | "pending" | "unavailable"
  responseTime: number // in minutes
  specifications: {
    capacity: number
    range: number // in nautical miles
    speed: number // in mph
    category: "light" | "midsize" | "heavy" | "ultra-long-range"
  }
  location: string
  rating: number
}

export interface FlightRoute {
  departure: string
  arrival: string
  departureCode: string
  arrivalCode: string
  distance: number // in nautical miles
}

/**
 * Calculate final price with margin applied
 */
export const calculateQuoteWithMargin = (
  basePrice: number,
  marginType: "fixed" | "percentage",
  marginValue: number,
): number => {
  if (marginType === "fixed") {
    return basePrice + marginValue
  }
  return basePrice + (basePrice * marginValue) / 100
}

/**
 * Generate a proposal object from operator and route data
 */
export const generateProposal = (
  operator: Operator,
  route: FlightRoute,
  passengers: number,
  date: string,
  marginType: "fixed" | "percentage" = "fixed",
  marginValue = 5000,
) => {
  const totalPrice = calculateQuoteWithMargin(operator.basePrice, marginType, marginValue)
  const margin = totalPrice - operator.basePrice

  return {
    id: `proposal-${Date.now()}`,
    operator,
    route,
    passengers,
    date,
    basePrice: operator.basePrice,
    margin,
    totalPrice,
    createdAt: new Date(),
    status: "draft" as const,
  }
}

/**
 * Filter operators by route requirements
 */
export const filterOperatorsByRoute = (
  operators: Operator[],
  route: FlightRoute,
  passengers: number
): Operator[] => {
  return operators
    .filter((op) => op.specifications.capacity >= passengers)
    .filter((op) => op.specifications.range >= route.distance)
    .sort((a, b) => a.basePrice - b.basePrice)
}
