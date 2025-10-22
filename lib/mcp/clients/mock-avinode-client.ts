/**
 * Mock Avinode Client
 *
 * Provides realistic mock data for development and testing.
 * Simulates API delays and behaviors without requiring real API credentials.
 */

export class MockAvinodeClient {
  /**
   * Search for available flights/aircraft
   */
  async searchFlights(params: any) {
    // Simulate API delay
    await this.delay(500, 2000);

    const { departure_airport, arrival_airport, passengers, aircraft_category } = params;

    // Generate mock aircraft
    const allAircraft = this.generateMockAircraft();

    // Filter by category if specified
    let filtered = aircraft_category
      ? allAircraft.filter((a) => a.category === aircraft_category)
      : allAircraft;

    // Filter by capacity (aircraft must fit all passengers)
    filtered = filtered.filter((a) => a.capacity >= passengers);

    // Return 3-5 random aircraft
    const count = Math.floor(Math.random() * 3) + 3; // 3-5
    const shuffled = filtered.sort(() => Math.random() - 0.5);

    return {
      aircraft: shuffled.slice(0, count),
      total: count,
      query: { departure_airport, arrival_airport, passengers },
    };
  }

  /**
   * Create RFP and distribute to operators
   */
  async createRFP(params: any) {
    await this.delay(800, 1500);

    const rfpId = `RFP-${Date.now()}`;

    return {
      rfp_id: rfpId,
      status: 'created',
      operators_notified: params.operator_ids.length,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Get RFP status
   */
  async getQuoteStatus(rfpId: string) {
    await this.delay(300, 800);

    if (!rfpId.startsWith('RFP-')) {
      throw new Error('RFP not found');
    }

    const totalOperators = 5;
    const responded = Math.floor(Math.random() * (totalOperators + 1)); // 0-5

    return {
      rfp_id: rfpId,
      total_operators: totalOperators,
      responded,
      pending: totalOperators - responded,
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      deadline: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
    };
  }

  /**
   * Get all quotes for an RFP
   */
  async getQuotes(rfpId: string) {
    await this.delay(500, 1200);

    if (!rfpId.startsWith('RFP-')) {
      throw new Error('RFP not found');
    }

    const quotes = this.generateMockQuotes(rfpId);

    return {
      rfp_id: rfpId,
      quotes,
      total: quotes.length,
    };
  }

  /**
   * Generate realistic mock aircraft data
   */
  private generateMockAircraft() {
    return [
      {
        id: 'AC-001',
        type: 'Citation X',
        category: 'midsize',
        capacity: 8,
        range: 3242,
        speed: 604,
        operator: {
          id: 'OP-001',
          name: 'Executive Jet Management',
          rating: 4.8,
        },
      },
      {
        id: 'AC-002',
        type: 'Gulfstream G550',
        category: 'heavy',
        capacity: 14,
        range: 6750,
        speed: 562,
        operator: {
          id: 'OP-002',
          name: 'NetJets',
          rating: 4.9,
        },
      },
      {
        id: 'AC-003',
        type: 'Challenger 350',
        category: 'midsize',
        capacity: 9,
        range: 3200,
        speed: 541,
        operator: {
          id: 'OP-003',
          name: 'VistaJet',
          rating: 4.7,
        },
      },
      {
        id: 'AC-004',
        type: 'Phenom 300',
        category: 'light',
        capacity: 7,
        range: 1971,
        speed: 464,
        operator: {
          id: 'OP-004',
          name: 'Flexjet',
          rating: 4.6,
        },
      },
      {
        id: 'AC-005',
        type: 'Global 7500',
        category: 'ultra-long-range',
        capacity: 17,
        range: 7700,
        speed: 590,
        operator: {
          id: 'OP-005',
          name: 'Bombardier Business Aircraft',
          rating: 4.8,
        },
      },
      {
        id: 'AC-006',
        type: 'Falcon 2000',
        category: 'midsize',
        capacity: 10,
        range: 3350,
        speed: 528,
        operator: {
          id: 'OP-006',
          name: 'Dassault Aviation',
          rating: 4.7,
        },
      },
      {
        id: 'AC-007',
        type: 'Citation CJ4',
        category: 'light',
        capacity: 6,
        range: 2165,
        speed: 453,
        operator: {
          id: 'OP-007',
          name: 'Textron Aviation',
          rating: 4.5,
        },
      },
    ];
  }

  /**
   * Generate mock quotes for an RFP
   */
  private generateMockQuotes(rfpId: string) {
    const count = Math.floor(Math.random() * 3) + 2; // 2-4 quotes

    const operators = [
      'Executive Jet Management',
      'NetJets',
      'VistaJet',
      'Flexjet',
      'Bombardier Business Aircraft',
    ];

    const aircraft = [
      'Citation X',
      'Gulfstream G550',
      'Challenger 350',
      'Phenom 300',
      'Global 7500',
    ];

    return Array.from({ length: count }, (_, i) => ({
      quote_id: `QT-${Date.now()}-${i}`,
      rfp_id: rfpId,
      operator_id: `OP-00${i + 1}`,
      operator_name: operators[i] || `Operator ${i + 1}`,
      aircraft_type: aircraft[i] || `Aircraft Type ${i + 1}`,
      base_price: Math.floor(Math.random() * 50000) + 30000, // $30k-$80k
      response_time: Math.floor(Math.random() * 120) + 10, // 10-130 minutes
      created_at: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Within last hour
    }));
  }

  /**
   * Simulate API delay
   */
  private delay(min: number, max: number): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
