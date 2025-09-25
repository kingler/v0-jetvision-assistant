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

export const mockOperators: Operator[] = [
  {
    id: "1",
    name: "Executive Jets LLC",
    aircraft: "Gulfstream G200",
    basePrice: 25000,
    availability: "confirmed",
    responseTime: 8,
    specifications: {
      capacity: 8,
      range: 3400,
      speed: 540,
      category: "heavy",
    },
    location: "Teterboro, NJ",
    rating: 4.9,
  },
  {
    id: "2",
    name: "NetJets",
    aircraft: "Challenger 350",
    basePrice: 18000,
    availability: "confirmed",
    responseTime: 8,
    specifications: {
      capacity: 10,
      range: 3200,
      speed: 470,
      category: "midsize",
    },
    location: "Miami, FL",
    rating: 4.8,
  },
  {
    id: "3",
    name: "Flexjet",
    aircraft: "Citation X",
    basePrice: 19500,
    availability: "confirmed",
    responseTime: 12,
    specifications: {
      capacity: 8,
      range: 3460,
      speed: 604,
      category: "midsize",
    },
    location: "Miami, FL",
    rating: 4.9,
  },
  {
    id: "4",
    name: "Vista Global",
    aircraft: "Learjet 75",
    basePrice: 16500,
    availability: "pending",
    responseTime: 15,
    specifications: {
      capacity: 8,
      range: 2040,
      speed: 465,
      category: "midsize",
    },
    location: "Miami, FL",
    rating: 4.7,
  },
  {
    id: "5",
    name: "Wheels Up",
    aircraft: "Hawker 900XP",
    basePrice: 17000,
    availability: "pending",
    responseTime: 15,
    specifications: {
      capacity: 8,
      range: 2930,
      speed: 450,
      category: "midsize",
    },
    location: "Miami, FL",
    rating: 4.6,
  },
  {
    id: "6",
    name: "XOJET",
    aircraft: "Citation Excel",
    basePrice: 15500,
    availability: "pending",
    responseTime: 15,
    specifications: {
      capacity: 8,
      range: 2100,
      speed: 441,
      category: "midsize",
    },
    location: "Miami, FL",
    rating: 4.8,
  },
  {
    id: "7",
    name: "West Coast Aviation",
    aircraft: "Citation CJ3+",
    basePrice: 8500,
    availability: "confirmed",
    responseTime: 10,
    specifications: {
      capacity: 6,
      range: 300,
      speed: 450,
      category: "light",
    },
    location: "Los Angeles, CA",
    rating: 4.7,
  },
]

export const mockRoutes: FlightRoute[] = [
  {
    departure: "Teterboro",
    arrival: "Van Nuys",
    departureCode: "TEB",
    arrivalCode: "VNY",
    distance: 2445,
  },
  {
    departure: "Miami",
    arrival: "Aspen",
    departureCode: "MIA",
    arrivalCode: "ASE",
    distance: 1650,
  },
  {
    departure: "Van Nuys",
    arrival: "Dallas Love Field",
    departureCode: "VNY",
    arrivalCode: "DAL",
    distance: 1240,
  },
  {
    departure: "Los Angeles",
    arrival: "San Francisco",
    departureCode: "LAX",
    arrivalCode: "SFO",
    distance: 300,
  },
]

export const getOperatorsForRoute = (route: FlightRoute, passengers: number): Operator[] => {
  return mockOperators
    .filter((op) => op.specifications.capacity >= passengers)
    .filter((op) => op.specifications.range >= route.distance)
    .sort((a, b) => a.basePrice - b.basePrice)
}

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

export const useCaseChats = [
  {
    id: "1",
    route: "TEB → VNY",
    passengers: 6,
    date: "October 15, 2025",
    status: "proposal_ready",
    currentStep: 5,
    totalSteps: 5,
    aircraft: "Gulfstream G200",
    operator: "Executive Jets LLC",
    basePrice: 25000,
    totalPrice: 32500,
    margin: 7500,
    messages: [
      {
        id: "1",
        type: "user",
        content: "I need a flight from Teterboro to Van Nuys for 6 passengers on October 15th",
        timestamp: new Date("2025-10-10T10:00:00"),
      },
      {
        id: "2",
        type: "agent",
        content:
          "Great news! I've completed your flight search from Teterboro (TEB) to Van Nuys (VNY) and have your proposal ready.",
        timestamp: new Date("2025-10-10T10:30:00"),
        showWorkflow: true,
        showProposal: true,
      },
    ],
  },
  {
    id: "2",
    route: "MIA → ASE",
    passengers: 4,
    date: "November 20, 2025",
    status: "requesting_quotes",
    currentStep: 3,
    totalSteps: 5,
    quotesReceived: 2,
    quotesTotal: 5,
    messages: [
      {
        id: "1",
        type: "user",
        content: "I need a flight from Miami to Aspen for 4 passengers on November 20th",
        timestamp: new Date("2025-11-15T14:00:00"),
      },
      {
        id: "2",
        type: "agent",
        content:
          "I'm currently requesting quotes for your Miami (MIA) to Aspen (ASE) flight. This typically takes 15-30 minutes.",
        timestamp: new Date("2025-11-15T14:05:00"),
        showWorkflow: true,
        showQuoteStatus: true,
      },
    ],
  },
  {
    id: "3",
    route: "VNY → DAL",
    passengers: 3,
    date: "December 8, 2025",
    status: "understanding_request",
    currentStep: 1,
    totalSteps: 5,
    messages: [
      {
        id: "1",
        type: "user",
        content: "I need a flight from Van Nuys to Dallas for next Friday",
        timestamp: new Date("2025-12-03T09:00:00"),
      },
      {
        id: "2",
        type: "agent",
        content:
          "I'll help you arrange a flight from Van Nuys (VNY) to Dallas. Let me gather some additional details to find the perfect aircraft.\n\nWhich Dallas airport would you prefer?\n- Dallas Love Field (DAL) - Closer to downtown\n- DFW International (DFW) - More options",
        timestamp: new Date("2025-12-03T09:01:00"),
        showWorkflow: true,
      },
      {
        id: "3",
        type: "user",
        content: "Dallas Love Field",
        timestamp: new Date("2025-12-03T09:02:00"),
      },
      {
        id: "4",
        type: "agent",
        content:
          "Got it. What size aircraft would you prefer?\n- Light Jet (4-6 seats, economical)\n- Midsize Jet (7-8 seats, more comfort)\n- Super-midsize (9-10 seats, premium experience)",
        timestamp: new Date("2025-12-03T09:02:30"),
      },
      {
        id: "5",
        type: "user",
        content: "3 passengers",
        timestamp: new Date("2025-12-03T09:03:00"),
      },
      {
        id: "6",
        type: "agent",
        content:
          "Got it. What size aircraft would you prefer?\n- Light Jet (4-6 seats, economical)\n- Midsize Jet (7-8 seats, more comfort)\n- Super-midsize (9-10 seats, premium experience)",
        timestamp: new Date("2025-12-03T09:03:30"),
      },
    ],
  },
  {
    id: "4",
    route: "LAX → SFO",
    passengers: 2,
    date: "January 12, 2026",
    status: "proposal_ready",
    currentStep: 5,
    totalSteps: 5,
    aircraft: "Citation CJ3+",
    operator: "West Coast Aviation",
    basePrice: 8500,
    totalPrice: 11200,
    margin: 2700,
    customer: {
      name: "Kham L.",
      isReturning: true,
      preferences: {
        catering: "Taco Bell",
        groundTransport: "Stretch Limo pickup",
      },
    },
    messages: [
      {
        id: "1",
        type: "user",
        content:
          "Hi, I need to book another flight from LAX to SFO for 2 passengers on January 12th. This is for Kham L.",
        timestamp: new Date("2026-01-08T11:00:00"),
      },
      {
        id: "2",
        type: "agent",
        content:
          "I see this booking is for Kham L. - let me pull up his customer profile... Perfect! I found his preferences: Taco Bell catering and stretch limo ground transport. I'll make sure to include these in the proposal.",
        timestamp: new Date("2026-01-08T11:01:00"),
        showCustomerPreferences: true,
      },
      {
        id: "3",
        type: "agent",
        content:
          "I'm now searching for available light jets for the LAX to SFO route. This should only take a few minutes given the short distance.",
        timestamp: new Date("2026-01-08T11:02:00"),
        showWorkflow: true,
      },
      {
        id: "4",
        type: "agent",
        content:
          "Excellent! I've found a Citation CJ3+ that's perfect for this route. The proposal includes Kham's preferred Taco Bell catering and stretch limo pickup at SFO.",
        timestamp: new Date("2026-01-08T11:15:00"),
        showWorkflow: true,
        showProposal: true,
        showCustomerPreferences: true,
      },
    ],
  },
]
