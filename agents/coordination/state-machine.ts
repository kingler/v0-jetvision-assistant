/**
 * Workflow State Machine
 * Manages workflow state transitions
 */

/**
 * Workflow State
 */
export enum WorkflowState {
  CREATED = 'created',
  ANALYZING = 'analyzing',
  FETCHING_CLIENT_DATA = 'fetching_client_data',
  SEARCHING_FLIGHTS = 'searching_flights',
  AWAITING_QUOTES = 'awaiting_quotes',
  ANALYZING_PROPOSALS = 'analyzing_proposals',
  GENERATING_EMAIL = 'generating_email',
  SENDING_PROPOSAL = 'sending_proposal',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * State Transition
 */
export interface StateTransition {
  from: WorkflowState
  to: WorkflowState
  timestamp: Date
  triggeredBy?: string
  metadata?: Record<string, unknown>
}

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  [WorkflowState.CREATED]: [WorkflowState.ANALYZING, WorkflowState.CANCELLED],
  [WorkflowState.ANALYZING]: [
    WorkflowState.FETCHING_CLIENT_DATA,
    WorkflowState.FAILED,
    WorkflowState.CANCELLED,
  ],
  [WorkflowState.FETCHING_CLIENT_DATA]: [
    WorkflowState.SEARCHING_FLIGHTS,
    WorkflowState.FAILED,
    WorkflowState.CANCELLED,
  ],
  [WorkflowState.SEARCHING_FLIGHTS]: [
    WorkflowState.AWAITING_QUOTES,
    WorkflowState.FAILED,
    WorkflowState.CANCELLED,
  ],
  [WorkflowState.AWAITING_QUOTES]: [
    WorkflowState.ANALYZING_PROPOSALS,
    WorkflowState.FAILED,
    WorkflowState.CANCELLED,
  ],
  [WorkflowState.ANALYZING_PROPOSALS]: [
    WorkflowState.GENERATING_EMAIL,
    WorkflowState.FAILED,
    WorkflowState.CANCELLED,
  ],
  [WorkflowState.GENERATING_EMAIL]: [
    WorkflowState.SENDING_PROPOSAL,
    WorkflowState.FAILED,
    WorkflowState.CANCELLED,
  ],
  [WorkflowState.SENDING_PROPOSAL]: [
    WorkflowState.COMPLETED,
    WorkflowState.FAILED,
    WorkflowState.CANCELLED,
  ],
  [WorkflowState.COMPLETED]: [], // Terminal state
  [WorkflowState.FAILED]: [], // Terminal state
  [WorkflowState.CANCELLED]: [], // Terminal state
}

/**
 * Workflow State Machine
 */
export class WorkflowStateMachine {
  private currentState: WorkflowState
  private history: StateTransition[] = []
  private readonly workflowId: string

  constructor(workflowId: string, initialState: WorkflowState = WorkflowState.CREATED) {
    this.workflowId = workflowId
    this.currentState = initialState
    this.history.push({
      from: initialState,
      to: initialState,
      timestamp: new Date(),
      metadata: { initialized: true },
    })
  }

  /**
   * Get current state
   */
  getState(): WorkflowState {
    return this.currentState
  }

  /**
   * Check if transition is valid
   */
  canTransition(to: WorkflowState): boolean {
    const validTransitions = VALID_TRANSITIONS[this.currentState] || []
    return validTransitions.includes(to)
  }

  /**
   * Transition to new state
   */
  transition(
    to: WorkflowState,
    triggeredBy?: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.canTransition(to)) {
      throw new Error(
        `Invalid state transition: ${this.currentState} -> ${to}\n` +
          `Valid transitions from ${this.currentState}: ${VALID_TRANSITIONS[this.currentState].join(', ')}`
      )
    }

    const transition: StateTransition = {
      from: this.currentState,
      to,
      timestamp: new Date(),
      triggeredBy,
      metadata,
    }

    this.currentState = to
    this.history.push(transition)

    console.log(
      `[StateMachine:${this.workflowId}] Transitioned: ${transition.from} -> ${transition.to}` +
        (triggeredBy ? ` (by ${triggeredBy})` : '')
    )
  }

  /**
   * Get transition history
   */
  getHistory(): StateTransition[] {
    return [...this.history]
  }

  /**
   * Check if workflow is in terminal state
   */
  isTerminal(): boolean {
    return [
      WorkflowState.COMPLETED,
      WorkflowState.FAILED,
      WorkflowState.CANCELLED,
    ].includes(this.currentState)
  }

  /**
   * Check if workflow is in progress
   */
  isInProgress(): boolean {
    return !this.isTerminal() && this.currentState !== WorkflowState.CREATED
  }

  /**
   * Get workflow duration
   */
  getDuration(): number {
    if (this.history.length === 0) return 0

    const start = this.history[0].timestamp
    const end = this.history[this.history.length - 1].timestamp

    return end.getTime() - start.getTime()
  }

  /**
   * Get time in each state
   */
  getStateTimings(): Record<WorkflowState, number> {
    const timings: Partial<Record<WorkflowState, number>> = {}

    for (let i = 0; i < this.history.length - 1; i++) {
      const current = this.history[i]
      const next = this.history[i + 1]
      const duration = next.timestamp.getTime() - current.timestamp.getTime()

      timings[current.to] = (timings[current.to] || 0) + duration
    }

    return timings as Record<WorkflowState, number>
  }

  /**
   * Serialize state machine
   */
  toJSON(): {
    workflowId: string
    currentState: WorkflowState
    isTerminal: boolean
    duration: number
    history: StateTransition[]
  } {
    return {
      workflowId: this.workflowId,
      currentState: this.currentState,
      isTerminal: this.isTerminal(),
      duration: this.getDuration(),
      history: this.getHistory(),
    }
  }

  /**
   * Restore state machine from JSON
   */
  static fromJSON(data: ReturnType<WorkflowStateMachine['toJSON']>): WorkflowStateMachine {
    const machine = new WorkflowStateMachine(data.workflowId, data.history[0].to)
    machine.currentState = data.currentState
    machine.history = data.history
    return machine
  }
}

/**
 * Workflow State Manager
 * Manages multiple workflow state machines
 */
export class WorkflowStateManager {
  private static instance: WorkflowStateManager
  private machines: Map<string, WorkflowStateMachine> = new Map()

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): WorkflowStateManager {
    if (!WorkflowStateManager.instance) {
      WorkflowStateManager.instance = new WorkflowStateManager()
    }
    return WorkflowStateManager.instance
  }

  /**
   * Create new workflow
   */
  createWorkflow(workflowId: string): WorkflowStateMachine {
    if (this.machines.has(workflowId)) {
      throw new Error(`Workflow already exists: ${workflowId}`)
    }

    const machine = new WorkflowStateMachine(workflowId)
    this.machines.set(workflowId, machine)

    console.log(`[WorkflowManager] Created workflow: ${workflowId}`)

    return machine
  }

  /**
   * Get workflow state machine
   */
  getWorkflow(workflowId: string): WorkflowStateMachine | undefined {
    return this.machines.get(workflowId)
  }

  /**
   * Delete workflow
   */
  deleteWorkflow(workflowId: string): boolean {
    const deleted = this.machines.delete(workflowId)
    if (deleted) {
      console.log(`[WorkflowManager] Deleted workflow: ${workflowId}`)
    }
    return deleted
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): WorkflowStateMachine[] {
    return Array.from(this.machines.values())
  }

  /**
   * Get workflows by state
   */
  getWorkflowsByState(state: WorkflowState): WorkflowStateMachine[] {
    return Array.from(this.machines.values()).filter(
      (machine) => machine.getState() === state
    )
  }

  /**
   * Clean up completed workflows
   */
  cleanupCompleted(olderThan: number = 3600000): number {
    // 1 hour
    let cleaned = 0
    const now = Date.now()

    for (const [id, machine] of this.machines.entries()) {
      if (machine.isTerminal() && machine.getDuration() < now - olderThan) {
        this.machines.delete(id)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`[WorkflowManager] Cleaned up ${cleaned} completed workflows`)
    }

    return cleaned
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number
    byState: Record<WorkflowState, number>
    inProgress: number
    completed: number
  } {
    const byState: Partial<Record<WorkflowState, number>> = {}
    let inProgress = 0
    let completed = 0

    for (const machine of this.machines.values()) {
      const state = machine.getState()
      byState[state] = (byState[state] || 0) + 1

      if (machine.isInProgress()) inProgress++
      if (machine.isTerminal()) completed++
    }

    return {
      total: this.machines.size,
      byState: byState as Record<WorkflowState, number>,
      inProgress,
      completed,
    }
  }

  /**
   * Reset manager (useful for testing)
   */
  reset(): void {
    this.machines.clear()
  }
}

/**
 * Singleton instance
 */
export const workflowManager = WorkflowStateManager.getInstance()
