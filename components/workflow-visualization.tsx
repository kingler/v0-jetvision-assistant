"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, Loader2, Search, FileText, Calculator, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { OperatorResponses } from "./operator-responses"
import { ProposalPreview } from "./proposal-preview"
import { mockRoutes, getOperatorsForRoute, generateProposal } from "@/lib/mock-data"
import type { Operator } from "@/lib/mock-data"

export interface WorkflowStepData {
  // Real data from agents/API
  aircraftFound?: number
  operatorsQueried?: number
  quotesReceived?: number
  quotesAnalyzed?: number
  proposalGenerated?: boolean
  // Avinode-specific data
  avinodeRfpId?: string
  avinodeQuotes?: any[]
  avinodeResults?: Record<string, any>
}

interface WorkflowStep {
  id: string
  title: string
  description: string
  status: "completed" | "in-progress" | "pending"
  details?: string[]
  data?: WorkflowStepData
  icon: React.ReactNode
  isExpanded?: boolean
}

interface WorkflowVisualizationProps {
  isProcessing: boolean
  embedded?: boolean
  currentStep?: number
  status?: string
  workflowData?: {
    step1?: WorkflowStepData
    step2?: WorkflowStepData
    step3?: WorkflowStepData
    step4?: WorkflowStepData
    step5?: WorkflowStepData
  }
}

export function WorkflowVisualization({
  isProcessing,
  embedded = false,
  currentStep = 1,
  status = "understanding_request",
  workflowData = {},
}: WorkflowVisualizationProps) {
  const getStepStatus = (stepId: string): "completed" | "in-progress" | "pending" => {
    const stepNumber = Number.parseInt(stepId)

    switch (status) {
      case "proposal_ready":
        return "completed" // All steps completed
      case "requesting_quotes":
        if (stepNumber <= 2) return "completed"
        if (stepNumber === 3) return "in-progress"
        return "pending"
      case "understanding_request":
        if (stepNumber === 1) return "in-progress"
        return "pending"
      default:
        if (stepNumber < currentStep) return "completed"
        if (stepNumber === currentStep) return "in-progress"
        return "pending"
    }
  }

  const toggleStepExpansion = (stepId: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, isExpanded: !step.isExpanded } : step
      )
    )
  }

  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      id: "1",
      title: "Understanding Request",
      description: "Parsing natural language input and extracting flight details",
      status: getStepStatus("1"),
      icon: <CheckCircle className="w-5 h-5" />,
      isExpanded: false,
      data: workflowData.step1,
    },
    {
      id: "2",
      title: "Searching Aircraft",
      description: "Querying operator database for suitable aircraft",
      status: getStepStatus("2"),
      icon: <Search className="w-5 h-5" />,
      isExpanded: false,
      data: workflowData.step2,
    },
    {
      id: "3",
      title: "Requesting Quotes",
      description: "Sending requests to qualified operators",
      status: getStepStatus("3"),
      icon: <Clock className="w-5 h-5" />,
      isExpanded: false,
      data: workflowData.step3,
    },
    {
      id: "4",
      title: "Analyzing Options",
      description: "Comparing pricing and availability",
      status: getStepStatus("4"),
      icon: <Calculator className="w-5 h-5" />,
      isExpanded: false,
      data: workflowData.step4,
    },
    {
      id: "5",
      title: "Generate Proposal",
      description: "Creating Jetvision branded quote",
      status: getStepStatus("5"),
      icon: <FileText className="w-5 h-5" />,
      isExpanded: false,
      data: workflowData.step5,
    },
  ])

  const getStatusIcon = (stepStatus: "completed" | "in-progress" | "pending") => {
    switch (stepStatus) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "in-progress":
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />
      case "pending":
        return <Clock className="w-5 h-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (stepStatus: "completed" | "in-progress" | "pending") => {
    switch (stepStatus) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3" />
          </Badge>
        )
      case "in-progress":
        return (
          <Badge variant="default" className="bg-primary">
            <Loader2 className="w-3 h-3 animate-spin" />
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3" />
          </Badge>
        )
    }
  }

  const [availableOperators, setAvailableOperators] = useState<Operator[]>([])
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null)
  const [showProposal, setShowProposal] = useState(false)

  useEffect(() => {
    // Simulate getting operators for the NYC to LA route
    const route = mockRoutes[0] // NYC to LA
    const operators = getOperatorsForRoute(route, 4)
    setAvailableOperators(operators.slice(0, 6)) // Show top 6 operators
  }, [])

  useEffect(() => {
    setSteps((prev) =>
      prev.map((step) => ({
        ...step,
        status: getStepStatus(step.id),
      })),
    )
  }, [status])

  useEffect(() => {
    const getStepDetails = (
      stepId: string,
      stepStatus: "completed" | "in-progress" | "pending",
      stepData?: WorkflowStepData
    ) => {
      if (stepStatus === "pending") return undefined

      switch (stepId) {
        case "1":
          return stepStatus === "completed"
            ? ["Parsed flight requirements", "Extracted route and preferences", "Validated passenger count"]
            : ["Processing natural language input..."]

        case "2":
          // Use real Avinode data if available
          if (stepStatus === "completed" && stepData) {
            const details = []
            if (stepData.operatorsQueried) details.push(`Queried ${stepData.operatorsQueried} operators`)
            if (stepData.aircraftFound) details.push(`Found ${stepData.aircraftFound} potential aircraft`)
            if (stepData.avinodeResults) details.push("Filtered by capacity and range")
            return details.length > 0 ? details : ["Aircraft search completed"]
          }
          return ["Searching aircraft database..."]

        case "3":
          // Use real quote data from Avinode
          if (stepStatus === "completed" && stepData) {
            const details = []
            if (stepData.avinodeRfpId) details.push(`RFP ID: ${stepData.avinodeRfpId}`)
            if (stepData.quotesReceived) details.push(`Received ${stepData.quotesReceived} quotes`)
            if (stepData.operatorsQueried) details.push(`Sent requests to ${stepData.operatorsQueried} operators`)
            return details.length > 0 ? details : ["Quotes received from operators"]
          }
          return ["Requesting quotes from operators..."]

        case "4":
          // Use real quote analysis data
          if (stepStatus === "completed" && stepData) {
            const details = []
            if (stepData.quotesAnalyzed) details.push(`Analyzed ${stepData.quotesAnalyzed} quotes`)
            if (stepData.avinodeQuotes?.length) {
              details.push(`Compared ${stepData.avinodeQuotes.length} pricing options`)
              const topQuotes = stepData.avinodeQuotes.slice(0, 3)
              details.push(`Selected top ${topQuotes.length} options`)
            }
            return details.length > 0 ? details : ["Quote analysis completed"]
          }
          return ["Analyzing pricing options..."]

        case "5":
          // Use real proposal data
          if (stepStatus === "completed" && stepData && stepData.proposalGenerated) {
            return [
              "Applied margin settings",
              "Created Jetvision branded quote",
              "Proposal ready for client"
            ]
          }
          return ["Generating proposal..."]

        default:
          return undefined
      }
    }

    setSteps((prev) =>
      prev.map((step) => ({
        ...step,
        details: getStepDetails(step.id, step.status, step.data),
      })),
    )
  }, [status, workflowData])

  const handleViewProposal = () => {
    if (selectedOperator) {
      setShowProposal(true)
    }
  }

  const proposal = selectedOperator
    ? generateProposal(selectedOperator, mockRoutes[0], 4, "Tuesday, Sept 24, 2025")
    : null

  if (embedded) {
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm mb-3">Flight Search Progress</h4>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={step.id} className="space-y-1">
              <button
                onClick={() => toggleStepExpansion(step.id)}
                className={cn(
                  "w-full flex items-center justify-between p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800",
                  step.isExpanded && "bg-gray-50 dark:bg-gray-800"
                )}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center",
                      step.status === "completed"
                        ? "bg-green-100 text-green-600"
                        : step.status === "in-progress"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-400"
                    )}
                  >
                    {step.status === "completed" ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : step.status === "in-progress" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-medium">Step {index + 1}: {step.title}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {step.isExpanded ? '−' : '+'}
                </div>
              </button>

              {step.isExpanded && step.details && (
                <div className="ml-8 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  <ul className="space-y-1">
                    {step.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="text-xs text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                        <div className="w-1 h-1 bg-blue-600 rounded-full" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{
              width: `${(steps.filter((s) => s.status === "completed").length / steps.length) * 100}%`,
            }}
          />
        </div>

        <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
          Click steps to expand/collapse details
        </div>
      </div>
    )
  }

  if (showProposal && proposal) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground font-[family-name:var(--font-space-grotesk)]">
            Proposal Preview
          </h2>
          <Button variant="outline" onClick={() => setShowProposal(false)}>
            Back to Workflow
          </Button>
        </div>
        <ProposalPreview
          operator={proposal.operator}
          route={proposal.route}
          passengers={proposal.passengers}
          date={proposal.date}
          basePrice={proposal.basePrice}
          margin={proposal.margin}
          totalPrice={proposal.totalPrice}
          onDownloadPdf={() => alert("PDF download would start here")}
          onEditProposal={() => alert("Edit proposal functionality would open here")}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground font-[family-name:var(--font-space-grotesk)] mb-2">
          Workflow Visualization
        </h2>
        <p className="text-muted-foreground font-[family-name:var(--font-dm-sans)]">
          Track the progress of your flight request in real-time
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card
            key={step.id}
            className={cn(
              "transition-all duration-300 cursor-pointer hover:shadow-md",
              step.status === "in-progress" && "ring-2 ring-primary ring-opacity-50",
            )}
            onClick={() => toggleStepExpansion(step.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                    {getStatusIcon(step.status)}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-[family-name:var(--font-space-grotesk)]">
                      Step {index + 1}: {step.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground font-[family-name:var(--font-dm-sans)]">
                      {step.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(step.status)}
                  <div className="text-sm text-muted-foreground">
                    {step.isExpanded ? '−' : '+'}
                  </div>
                </div>
              </div>
            </CardHeader>

            {step.isExpanded && step.details && (
              <CardContent className="pt-0">
                <div className="bg-muted rounded-lg p-3">
                  <ul className="space-y-1">
                    {step.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="text-sm text-muted-foreground flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {steps.find((s) => s.id === "3")?.status === "completed" && availableOperators.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-space-grotesk)]">Operator Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <OperatorResponses
              operators={availableOperators}
              onSelectOperator={setSelectedOperator}
              selectedOperatorId={selectedOperator?.id}
            />
          </CardContent>
        </Card>
      )}

      {/* Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-space-grotesk)]">Progress Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {steps.filter((s) => s.status === "completed").length} of {steps.length} steps completed
            </div>
            <div className="flex space-x-2">
              {selectedOperator && steps.find((s) => s.id === "5")?.status === "completed" && (
                <Button onClick={handleViewProposal} size="sm">
                  <Send className="w-4 h-4 mr-2" />
                  View Proposal
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2 mt-3">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{
                width: `${(steps.filter((s) => s.status === "completed").length / steps.length) * 100}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
