/**
 * Mock Aircraft Database
 * Comprehensive database of aircraft for mock Avinode responses
 * ONEK-75: Aircraft Database
 */

export interface Aircraft {
  id: string;
  type: string;
  model: string;
  registration: string;
  capacity: number;
  yearBuilt: number;
  category: 'light' | 'midsize' | 'super-midsize' | 'heavy' | 'ultra-long-range';
  specifications: {
    maxRange: number; // nautical miles
    cruiseSpeed: number; // knots
    maxAltitude: number; // feet
    baggage: number; // cubic feet
  };
  pricing: {
    hourlyRateMin: number; // USD per hour
    hourlyRateMax: number; // USD per hour
    dailyMinimumHours: number;
  };
  amenities: string[];
  operatorId: string;
}

export interface Operator {
  id: string;
  name: string;
  rating: number; // 0-5
  location: string;
  certifications: string[];
  responseTime: number; // minutes
  fleetSize: number;
}

/**
 * Mock Operators Database
 */
export const MOCK_OPERATORS: Operator[] = [
  {
    id: 'OP-001',
    name: 'Executive Jets LLC',
    rating: 4.9,
    location: 'Teterboro, NJ (KTEB)',
    certifications: ['ARG/US Platinum', 'Wyvern Wingman', 'IS-BAO Stage III'],
    responseTime: 8,
    fleetSize: 45,
  },
  {
    id: 'OP-002',
    name: 'NetJets',
    rating: 4.8,
    location: 'Miami, FL (KOPF)',
    certifications: ['ARG/US Platinum', 'Wyvern Wingman'],
    responseTime: 8,
    fleetSize: 750,
  },
  {
    id: 'OP-003',
    name: 'Flexjet',
    rating: 4.9,
    location: 'Miami, FL (KOPF)',
    certifications: ['ARG/US Gold', 'Wyvern Wingman', 'IS-BAO Stage II'],
    responseTime: 12,
    fleetSize: 320,
  },
  {
    id: 'OP-004',
    name: 'VistaJet',
    rating: 4.9,
    location: 'Miami, FL (KOPF)',
    certifications: ['ARG/US Platinum', 'IS-BAO Stage III'],
    responseTime: 10,
    fleetSize: 360,
  },
  {
    id: 'OP-005',
    name: 'Wheels Up',
    rating: 4.6,
    location: 'Atlanta, GA (KPDK)',
    certifications: ['ARG/US Gold', 'Wyvern Wingman'],
    responseTime: 15,
    fleetSize: 280,
  },
  {
    id: 'OP-006',
    name: 'XOJet Aviation',
    rating: 4.8,
    location: 'Oakland, CA (KOAK)',
    certifications: ['ARG/US Gold', 'Wyvern Wingman', 'IS-BAO Stage II'],
    responseTime: 12,
    fleetSize: 120,
  },
  {
    id: 'OP-007',
    name: 'Clay Lacy Aviation',
    rating: 4.8,
    location: 'Van Nuys, CA (KVNY)',
    certifications: ['ARG/US Platinum', 'IS-BAO Stage III'],
    responseTime: 10,
    fleetSize: 65,
  },
  {
    id: 'OP-008',
    name: 'Sentient Jet',
    rating: 4.7,
    location: 'Boston, MA (KBED)',
    certifications: ['ARG/US Gold', 'Wyvern Wingman'],
    responseTime: 12,
    fleetSize: 180,
  },
  {
    id: 'OP-009',
    name: 'Jet Edge International',
    rating: 4.7,
    location: 'Santa Ana, CA (KSNA)',
    certifications: ['ARG/US Gold', 'Wyvern Wingman'],
    responseTime: 10,
    fleetSize: 85,
  },
  {
    id: 'OP-010',
    name: 'Air Charter Service',
    rating: 4.5,
    location: 'Houston, TX (KHOU)',
    certifications: ['ARG/US Gold'],
    responseTime: 15,
    fleetSize: 240,
  },
];

/**
 * Mock Aircraft Fleet Database - 24 Aircraft
 */
export const MOCK_AIRCRAFT: Aircraft[] = [
  // ========== LIGHT JETS (6 aircraft) ==========
  {
    id: 'AC-001',
    type: 'Citation CJ3+',
    model: 'Cessna Citation CJ3+',
    registration: 'N123CJ',
    capacity: 7,
    yearBuilt: 2022,
    category: 'light',
    specifications: {
      maxRange: 2040,
      cruiseSpeed: 416,
      maxAltitude: 45000,
      baggage: 65,
    },
    pricing: {
      hourlyRateMin: 2800,
      hourlyRateMax: 3400,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Refreshments', 'Entertainment System'],
    operatorId: 'OP-002',
  },
  {
    id: 'AC-002',
    type: 'Phenom 300E',
    model: 'Embraer Phenom 300E',
    registration: 'N456EM',
    capacity: 8,
    yearBuilt: 2023,
    category: 'light',
    specifications: {
      maxRange: 2010,
      cruiseSpeed: 464,
      maxAltitude: 45000,
      baggage: 74,
    },
    pricing: {
      hourlyRateMin: 2900,
      hourlyRateMax: 3500,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Refreshments', 'Entertainment System', 'Lavatory'],
    operatorId: 'OP-003',
  },
  {
    id: 'AC-003',
    type: 'Learjet 75 Liberty',
    model: 'Bombardier Learjet 75 Liberty',
    registration: 'N789LJ',
    capacity: 8,
    yearBuilt: 2021,
    category: 'light',
    specifications: {
      maxRange: 2080,
      cruiseSpeed: 465,
      maxAltitude: 51000,
      baggage: 65,
    },
    pricing: {
      hourlyRateMin: 2700,
      hourlyRateMax: 3300,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Catering', 'Entertainment System', 'Lavatory'],
    operatorId: 'OP-004',
  },
  {
    id: 'AC-004',
    type: 'HondaJet Elite S',
    model: 'HondaJet Elite S',
    registration: 'N321HJ',
    capacity: 6,
    yearBuilt: 2022,
    category: 'light',
    specifications: {
      maxRange: 1437,
      cruiseSpeed: 422,
      maxAltitude: 43000,
      baggage: 66,
    },
    pricing: {
      hourlyRateMin: 2400,
      hourlyRateMax: 2900,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Refreshments', 'Entertainment System'],
    operatorId: 'OP-009',
  },
  {
    id: 'AC-005',
    type: 'Citation M2',
    model: 'Cessna Citation M2',
    registration: 'N654CE',
    capacity: 7,
    yearBuilt: 2020,
    category: 'light',
    specifications: {
      maxRange: 1550,
      cruiseSpeed: 404,
      maxAltitude: 41000,
      baggage: 57,
    },
    pricing: {
      hourlyRateMin: 2200,
      hourlyRateMax: 2700,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Refreshments', 'Entertainment System'],
    operatorId: 'OP-006',
  },
  {
    id: 'AC-006',
    type: 'PC-24',
    model: 'Pilatus PC-24',
    registration: 'N987PC',
    capacity: 8,
    yearBuilt: 2021,
    category: 'light',
    specifications: {
      maxRange: 2000,
      cruiseSpeed: 440,
      maxAltitude: 45000,
      baggage: 90,
    },
    pricing: {
      hourlyRateMin: 2900,
      hourlyRateMax: 3400,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Catering', 'Entertainment System', 'Lavatory'],
    operatorId: 'OP-007',
  },

  // ========== MIDSIZE JETS (6 aircraft) ==========
  {
    id: 'AC-007',
    type: 'Hawker 800XP',
    model: 'Hawker 800XP',
    registration: 'N234HK',
    capacity: 8,
    yearBuilt: 2019,
    category: 'midsize',
    specifications: {
      maxRange: 2540,
      cruiseSpeed: 447,
      maxAltitude: 41000,
      baggage: 48,
    },
    pricing: {
      hourlyRateMin: 3800,
      hourlyRateMax: 4500,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Catering', 'Entertainment System', 'Lavatory'],
    operatorId: 'OP-010',
  },
  {
    id: 'AC-008',
    type: 'Citation XLS+',
    model: 'Cessna Citation XLS+',
    registration: 'N567CX',
    capacity: 9,
    yearBuilt: 2020,
    category: 'midsize',
    specifications: {
      maxRange: 2100,
      cruiseSpeed: 441,
      maxAltitude: 45000,
      baggage: 90,
    },
    pricing: {
      hourlyRateMin: 3600,
      hourlyRateMax: 4300,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Catering', 'Entertainment System', 'Lavatory'],
    operatorId: 'OP-002',
  },
  {
    id: 'AC-009',
    type: 'Learjet 60XR',
    model: 'Bombardier Learjet 60XR',
    registration: 'N890LR',
    capacity: 8,
    yearBuilt: 2018,
    category: 'midsize',
    specifications: {
      maxRange: 2405,
      cruiseSpeed: 466,
      maxAltitude: 51000,
      baggage: 48,
    },
    pricing: {
      hourlyRateMin: 3500,
      hourlyRateMax: 4200,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Catering', 'Entertainment System', 'Lavatory'],
    operatorId: 'OP-008',
  },
  {
    id: 'AC-010',
    type: 'Legacy 450',
    model: 'Embraer Legacy 450',
    registration: 'N123LG',
    capacity: 9,
    yearBuilt: 2021,
    category: 'midsize',
    specifications: {
      maxRange: 2900,
      cruiseSpeed: 464,
      maxAltitude: 43000,
      baggage: 150,
    },
    pricing: {
      hourlyRateMin: 4000,
      hourlyRateMax: 4800,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Premium Catering', 'Entertainment System', 'Full Lavatory'],
    operatorId: 'OP-003',
  },
  {
    id: 'AC-011',
    type: 'G150',
    model: 'Gulfstream G150',
    registration: 'N456GS',
    capacity: 8,
    yearBuilt: 2019,
    category: 'midsize',
    specifications: {
      maxRange: 3000,
      cruiseSpeed: 470,
      maxAltitude: 45000,
      baggage: 125,
    },
    pricing: {
      hourlyRateMin: 4200,
      hourlyRateMax: 5000,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Premium Catering', 'Entertainment System', 'Full Lavatory'],
    operatorId: 'OP-007',
  },
  {
    id: 'AC-012',
    type: 'Citation Latitude',
    model: 'Cessna Citation Latitude',
    registration: 'N789CL',
    capacity: 9,
    yearBuilt: 2022,
    category: 'midsize',
    specifications: {
      maxRange: 2700,
      cruiseSpeed: 446,
      maxAltitude: 45000,
      baggage: 127,
    },
    pricing: {
      hourlyRateMin: 3900,
      hourlyRateMax: 4600,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Premium Catering', 'Entertainment System', 'Full Lavatory'],
    operatorId: 'OP-006',
  },

  // ========== SUPER-MIDSIZE JETS (4 aircraft) ==========
  {
    id: 'AC-013',
    type: 'Challenger 350',
    model: 'Bombardier Challenger 350',
    registration: 'N345CH',
    capacity: 10,
    yearBuilt: 2021,
    category: 'super-midsize',
    specifications: {
      maxRange: 3200,
      cruiseSpeed: 470,
      maxAltitude: 45000,
      baggage: 106,
    },
    pricing: {
      hourlyRateMin: 5500,
      hourlyRateMax: 6800,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Premium Catering', 'Entertainment System', 'Full Lavatory', 'Stand-up Cabin'],
    operatorId: 'OP-002',
  },
  {
    id: 'AC-014',
    type: 'Citation Sovereign+',
    model: 'Cessna Citation Sovereign+',
    registration: 'N678CS',
    capacity: 9,
    yearBuilt: 2020,
    category: 'super-midsize',
    specifications: {
      maxRange: 3200,
      cruiseSpeed: 458,
      maxAltitude: 47000,
      baggage: 100,
    },
    pricing: {
      hourlyRateMin: 5200,
      hourlyRateMax: 6500,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Premium Catering', 'Entertainment System', 'Full Lavatory'],
    operatorId: 'OP-005',
  },
  {
    id: 'AC-015',
    type: 'Praetor 600',
    model: 'Embraer Praetor 600',
    registration: 'N901PR',
    capacity: 12,
    yearBuilt: 2022,
    category: 'super-midsize',
    specifications: {
      maxRange: 4018,
      cruiseSpeed: 466,
      maxAltitude: 45000,
      baggage: 155,
    },
    pricing: {
      hourlyRateMin: 5800,
      hourlyRateMax: 7000,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Premium Catering', 'Entertainment System', 'Full Lavatory', 'Stand-up Cabin'],
    operatorId: 'OP-004',
  },
  {
    id: 'AC-016',
    type: 'Citation X+',
    model: 'Cessna Citation X+',
    registration: 'N234CX',
    capacity: 10,
    yearBuilt: 2021,
    category: 'super-midsize',
    specifications: {
      maxRange: 3408,
      cruiseSpeed: 604,
      maxAltitude: 51000,
      baggage: 82,
    },
    pricing: {
      hourlyRateMin: 6200,
      hourlyRateMax: 7500,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Premium Catering', 'Entertainment System', 'Full Lavatory'],
    operatorId: 'OP-007',
  },

  // ========== HEAVY JETS (4 aircraft) ==========
  {
    id: 'AC-017',
    type: 'G450',
    model: 'Gulfstream G450',
    registration: 'N567GV',
    capacity: 14,
    yearBuilt: 2020,
    category: 'heavy',
    specifications: {
      maxRange: 4350,
      cruiseSpeed: 488,
      maxAltitude: 45000,
      baggage: 195,
    },
    pricing: {
      hourlyRateMin: 6500,
      hourlyRateMax: 7800,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Premium Catering', 'Entertainment System', 'Full Lavatory', 'Galley'],
    operatorId: 'OP-004',
  },
  {
    id: 'AC-018',
    type: 'Challenger 604',
    model: 'Bombardier Challenger 604',
    registration: 'N890CH',
    capacity: 12,
    yearBuilt: 2019,
    category: 'heavy',
    specifications: {
      maxRange: 4000,
      cruiseSpeed: 459,
      maxAltitude: 41000,
      baggage: 115,
    },
    pricing: {
      hourlyRateMin: 5800,
      hourlyRateMax: 7000,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Premium Catering', 'Entertainment System', 'Full Lavatory', 'Galley'],
    operatorId: 'OP-001',
  },
  {
    id: 'AC-019',
    type: 'Falcon 900EX',
    model: 'Dassault Falcon 900EX',
    registration: 'N123FA',
    capacity: 13,
    yearBuilt: 2021,
    category: 'heavy',
    specifications: {
      maxRange: 4750,
      cruiseSpeed: 482,
      maxAltitude: 51000,
      baggage: 127,
    },
    pricing: {
      hourlyRateMin: 6800,
      hourlyRateMax: 8200,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Premium Catering', 'Entertainment System', 'Full Lavatory', 'Galley'],
    operatorId: 'OP-002',
  },
  {
    id: 'AC-020',
    type: 'Legacy 600',
    model: 'Embraer Legacy 600',
    registration: 'N456LE',
    capacity: 13,
    yearBuilt: 2020,
    category: 'heavy',
    specifications: {
      maxRange: 3400,
      cruiseSpeed: 469,
      maxAltitude: 41000,
      baggage: 240,
    },
    pricing: {
      hourlyRateMin: 5200,
      hourlyRateMax: 6500,
      dailyMinimumHours: 2,
    },
    amenities: ['WiFi', 'Premium Catering', 'Entertainment System', 'Full Lavatory', 'Galley'],
    operatorId: 'OP-003',
  },

  // ========== ULTRA-LONG-RANGE JETS (4 aircraft) ==========
  {
    id: 'AC-021',
    type: 'G650ER',
    model: 'Gulfstream G650ER',
    registration: 'N789GX',
    capacity: 19,
    yearBuilt: 2023,
    category: 'ultra-long-range',
    specifications: {
      maxRange: 7500,
      cruiseSpeed: 516,
      maxAltitude: 51000,
      baggage: 195,
    },
    pricing: {
      hourlyRateMin: 10500,
      hourlyRateMax: 12500,
      dailyMinimumHours: 3,
    },
    amenities: ['WiFi', 'Premium Catering', 'Entertainment System', 'Full Lavatory', 'Galley', 'Bedroom'],
    operatorId: 'OP-004',
  },
  {
    id: 'AC-022',
    type: 'Global 7500',
    model: 'Bombardier Global 7500',
    registration: 'N012GL',
    capacity: 17,
    yearBuilt: 2022,
    category: 'ultra-long-range',
    specifications: {
      maxRange: 7700,
      cruiseSpeed: 516,
      maxAltitude: 51000,
      baggage: 195,
    },
    pricing: {
      hourlyRateMin: 11000,
      hourlyRateMax: 13000,
      dailyMinimumHours: 3,
    },
    amenities: ['WiFi', 'Premium Catering', 'Entertainment System', 'Full Lavatory', 'Galley', 'Bedroom', 'Shower'],
    operatorId: 'OP-007',
  },
  {
    id: 'AC-023',
    type: 'Falcon 8X',
    model: 'Dassault Falcon 8X',
    registration: 'N345FX',
    capacity: 16,
    yearBuilt: 2021,
    category: 'ultra-long-range',
    specifications: {
      maxRange: 6450,
      cruiseSpeed: 488,
      maxAltitude: 51000,
      baggage: 140,
    },
    pricing: {
      hourlyRateMin: 9500,
      hourlyRateMax: 11500,
      dailyMinimumHours: 3,
    },
    amenities: ['WiFi', 'Premium Catering', 'Entertainment System', 'Full Lavatory', 'Galley', 'Bedroom'],
    operatorId: 'OP-001',
  },
  {
    id: 'AC-024',
    type: 'Global 6500',
    model: 'Bombardier Global 6500',
    registration: 'N678GB',
    capacity: 17,
    yearBuilt: 2022,
    category: 'ultra-long-range',
    specifications: {
      maxRange: 6600,
      cruiseSpeed: 516,
      maxAltitude: 51000,
      baggage: 195,
    },
    pricing: {
      hourlyRateMin: 9000,
      hourlyRateMax: 10800,
      dailyMinimumHours: 3,
    },
    amenities: ['WiFi', 'Premium Catering', 'Entertainment System', 'Full Lavatory', 'Galley', 'Bedroom'],
    operatorId: 'OP-002',
  },
];

/**
 * Aircraft grouped by category
 */
export const AIRCRAFT_BY_CATEGORY = {
  light: MOCK_AIRCRAFT.filter((a) => a.category === 'light'),
  midsize: MOCK_AIRCRAFT.filter((a) => a.category === 'midsize'),
  'super-midsize': MOCK_AIRCRAFT.filter((a) => a.category === 'super-midsize'),
  heavy: MOCK_AIRCRAFT.filter((a) => a.category === 'heavy'),
  'ultra-long-range': MOCK_AIRCRAFT.filter((a) => a.category === 'ultra-long-range'),
};

/**
 * Get aircraft by ID
 */
export function getAircraftById(id: string): Aircraft | undefined {
  return MOCK_AIRCRAFT.find((ac) => ac.id === id);
}

/**
 * Get aircraft by operator
 */
export function getAircraftByOperator(operatorId: string): Aircraft[] {
  return MOCK_AIRCRAFT.filter((ac) => ac.operatorId === operatorId);
}

/**
 * Get operator by ID
 */
export function getOperatorById(operatorId: string): Operator | undefined {
  return MOCK_OPERATORS.find((op) => op.id === operatorId);
}

/**
 * Filter aircraft by capacity and range
 */
export function filterAircraft(minCapacity: number, minRange: number): Aircraft[] {
  return MOCK_AIRCRAFT.filter(
    (ac) => ac.capacity >= minCapacity && ac.specifications.maxRange >= minRange
  );
}

/**
 * Filter aircraft by hourly rate budget
 */
export function filterAircraftByBudget(maxHourlyRate: number): Aircraft[] {
  return MOCK_AIRCRAFT.filter((ac) => ac.pricing.hourlyRateMin <= maxHourlyRate);
}

/**
 * Get aircraft by category
 */
export function getAircraftByCategory(
  category: 'light' | 'midsize' | 'super-midsize' | 'heavy' | 'ultra-long-range'
): Aircraft[] {
  return AIRCRAFT_BY_CATEGORY[category];
}

/**
 * Get random aircraft matching criteria
 */
export function getRandomAircraft(
  minCapacity: number,
  minRange: number,
  count: number = 5
): Aircraft[] {
  const filtered = filterAircraft(minCapacity, minRange);
  const shuffled = filtered.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Database statistics
 */
export const DATABASE_STATS = {
  totalAircraft: MOCK_AIRCRAFT.length,
  byCategory: {
    light: AIRCRAFT_BY_CATEGORY.light.length,
    midsize: AIRCRAFT_BY_CATEGORY.midsize.length,
    'super-midsize': AIRCRAFT_BY_CATEGORY['super-midsize'].length,
    heavy: AIRCRAFT_BY_CATEGORY.heavy.length,
    'ultra-long-range': AIRCRAFT_BY_CATEGORY['ultra-long-range'].length,
  },
  totalOperators: MOCK_OPERATORS.length,
  avgOperatorRating: (
    MOCK_OPERATORS.reduce((sum, op) => sum + op.rating, 0) / MOCK_OPERATORS.length
  ).toFixed(2),
};
