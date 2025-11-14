/**
 * RFP Flow State Tracker
 *
 * Manages the conversational flow for gathering RFP (Request for Proposal) data.
 * Implements progressive disclosure with 5 steps:
 * 1. Route (departure + arrival)
 * 2. Date (departure + optional return)
 * 3. Passengers (count)
 * 4. Aircraft Preference (optional)
 * 5. Budget/Special Requirements (optional)
 */

import { IntentExtractor } from './intent-extractor';
import { FieldValidator } from './field-validator';

export type RFPStep = 'route' | 'date' | 'passengers' | 'aircraft' | 'budget';

export interface RFPData {
  departure?: string;
  arrival?: string;
  departureDate?: string;
  returnDate?: string;
  passengers?: number;
  aircraftType?: string;
  budget?: number;
  specialRequirements?: string;
}

export interface ProcessResult {
  valid: boolean;
  error?: string;
  clarification?: string;
  suggestions?: string[];
}

interface RFPFlowState {
  currentStep: RFPStep;
  data: RFPData;
  history: RFPStep[];
}

/**
 * RFPFlow
 * Manages the progressive disclosure conversation flow for RFP data gathering
 */
export class RFPFlow {
  private state: RFPFlowState;
  private intentExtractor: IntentExtractor;
  private fieldValidator: FieldValidator;

  private readonly steps: RFPStep[] = ['route', 'date', 'passengers', 'aircraft', 'budget'];

  private readonly questions: Record<RFPStep, (data: RFPData) => string> = {
    route: () =>
      "Where would you like to fly? Please provide the departure and arrival cities or airport codes.",
    date: (data) =>
      `Great! Flying from ${data.departure} to ${data.arrival}. When would you like to depart? Include a return date if this is a round trip.`,
    passengers: (data) =>
      `Perfect. How many passengers will be traveling?`,
    aircraft: (data) =>
      `Got it, ${data.passengers} passenger${data.passengers === 1 ? '' : 's'}. Do you have a preference for aircraft type? (e.g., light jet, midsize, heavy jet) You can skip this if you'd like.`,
    budget: (data) =>
      `Almost done! Do you have a budget in mind or any special requirements? (Optional, you can skip)`,
  };

  constructor() {
    this.state = {
      currentStep: 'route',
      data: {},
      history: [],
    };
    this.intentExtractor = new IntentExtractor();
    this.fieldValidator = new FieldValidator();
  }

  /**
   * Get current step in the flow
   */
  getCurrentStep(): RFPStep {
    return this.state.currentStep;
  }

  /**
   * Get current RFP data
   */
  getData(): RFPData {
    return { ...this.state.data };
  }

  /**
   * Get contextual question for current step
   */
  getCurrentQuestion(): string {
    return this.questions[this.state.currentStep](this.state.data);
  }

  /**
   * Process user input for current step
   */
  processInput(input: string): ProcessResult {
    // Handle skip command for optional fields
    if (input.toLowerCase().trim() === 'skip') {
      if (this.state.currentStep === 'aircraft' || this.state.currentStep === 'budget') {
        this.advanceStep();
        return { valid: true };
      }
    }

    // Extract data based on current step
    const extracted = this.extractDataForStep(input);

    // Validate extracted data
    const validation = this.validateStep(extracted);
    if (!validation.valid) {
      return validation;
    }

    // Update state with extracted data
    this.updateData(extracted);

    // Advance to next step
    this.advanceStep();

    return { valid: true };
  }

  /**
   * Extract data from input based on current step
   */
  private extractDataForStep(input: string): Partial<RFPData> {
    switch (this.state.currentStep) {
      case 'route':
        return this.intentExtractor.extractRoute(input);

      case 'date':
        return this.intentExtractor.extractDates(input);

      case 'passengers':
        return this.intentExtractor.extractPassengers(input);

      case 'aircraft':
        return this.intentExtractor.extractAircraftType(input);

      case 'budget':
        return this.intentExtractor.extractBudget(input);

      default:
        return {};
    }
  }

  /**
   * Validate data for current step
   */
  private validateStep(data: Partial<RFPData>): ProcessResult {
    switch (this.state.currentStep) {
      case 'route':
        return this.fieldValidator.validateRoute(data);

      case 'date':
        return this.fieldValidator.validateDates(data);

      case 'passengers':
        return this.fieldValidator.validatePassengers(data);

      case 'aircraft':
        // Aircraft is optional, always valid
        return { valid: true };

      case 'budget':
        // Budget is optional, always valid
        return { valid: true };

      default:
        return { valid: false, error: 'Unknown step' };
    }
  }

  /**
   * Update RFP data
   */
  private updateData(data: Partial<RFPData>): void {
    this.state.data = {
      ...this.state.data,
      ...data,
    };
  }

  /**
   * Advance to next step
   */
  private advanceStep(): void {
    this.state.history.push(this.state.currentStep);

    const currentIndex = this.steps.indexOf(this.state.currentStep);
    if (currentIndex < this.steps.length - 1) {
      this.state.currentStep = this.steps[currentIndex + 1];
    }
  }

  /**
   * Go back to previous step
   */
  goBack(): void {
    if (this.state.history.length === 0) {
      return;
    }

    const previousStep = this.state.history.pop()!;
    this.state.currentStep = previousStep;
  }

  /**
   * Check if flow is complete
   */
  isComplete(): boolean {
    return (
      this.state.currentStep === 'budget' &&
      this.state.history.includes('budget')
    );
  }

  /**
   * Get list of missing required fields
   */
  getMissingFields(): string[] {
    const missing: string[] = [];

    if (!this.state.data.departure) missing.push('departure');
    if (!this.state.data.arrival) missing.push('arrival');
    if (!this.state.data.departureDate) missing.push('departureDate');
    if (!this.state.data.passengers) missing.push('passengers');

    return missing;
  }

  /**
   * Get list of completed fields
   */
  getCompletedFields(): string[] {
    const completed: string[] = [];

    if (this.state.data.departure) completed.push('departure');
    if (this.state.data.arrival) completed.push('arrival');
    if (this.state.data.departureDate) completed.push('departureDate');
    if (this.state.data.returnDate) completed.push('returnDate');
    if (this.state.data.passengers) completed.push('passengers');
    if (this.state.data.aircraftType) completed.push('aircraftType');
    if (this.state.data.budget) completed.push('budget');
    if (this.state.data.specialRequirements) completed.push('specialRequirements');

    return completed;
  }

  /**
   * Export complete RFP data for agent processing
   */
  exportRFPData(): RFPData {
    return { ...this.state.data };
  }

  /**
   * Serialize flow state for session storage
   */
  serialize(): string {
    return JSON.stringify(this.state);
  }

  /**
   * Deserialize flow state from session storage
   */
  static deserialize(serialized: string): RFPFlow {
    const flow = new RFPFlow();
    const state = JSON.parse(serialized);
    flow.state = state;
    return flow;
  }
}
