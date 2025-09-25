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

interface WorkflowStep {
  id: string
  title: string
  description: string
  status: "completed" | "in-progress" | "pending"
  details?: string[]
  icon: React.ReactNode
}

interface WorkflowVisualizationProps {
  isProcessing: boolean
  embedded?: boolean
  currentStep?: number
  status?: string
}

export function WorkflowVisualization({
  isProcessing,
  embedded = false,
  currentStep = 1,
  status = "understanding_request",
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

  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      id: "1",
      title: "Understanding Request",
      description: "Parsing natural language input and extracting flight details",
      status: getStepStatus("1"),
      icon: <CheckCircle className="w-5 h-5" />,
    },
    {
      id: "2",
      title: "Searching Aircraft",
      description: "Querying operator database for suitable aircraft",
      status: getStepStatus("2"),
      icon: <Search className="w-5 h-5" />,
    },
    {
      id: "3",
      title: "Requesting Quotes",
      description: "Sending requests to qualified operators",
      status: getStepStatus("3"),
      icon: <Clock className="w-5 h-5" />,
    },
    {
      id: "4",
      title: "Analyzing Options",
      description: "Comparing pricing and availability",
      status: getStepStatus("4"),
      icon: <Calculator className="w-5 h-5" />,
    },
    {
      id: "5",
      title: "Generate Proposal",
      description: "Creating JetVision branded quote",
      status: getStepStatus("5"),
      icon: <FileText className="w-5 h-5" />,
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
    const getStepDetails = (stepId: string, stepStatus: "completed" | "in-progress" | "pending") => {
      if (stepStatus === "pending") return undefined

      switch (stepId) {
        case "1":
          return stepStatus === "completed"
            ? ["Parsed flight requirements", "Extracted route and preferences", "Validated passenger count"]
            : ["Processing natural language input..."]
        case "2":
          return stepStatus === "completed"
            ? ["Queried 15 operators", "Found 8 potential aircraft", "Filtered by capacity and range"]
            : ["Searching aircraft database..."]
        case "3":
          return stepStatus === "completed"
            ? ["Sent requests to 6 operators", "Received all 6 responses", "Average response time: 18 minutes"]
            : ["Requesting quotes from operators..."]
        case "4":
          return stepStatus === "completed"
            ? ["Compared 6 pricing options", "Selected top 3 options", "Verified aircraft specifications"]
            : ["Analyzing pricing options..."]
        case "5":
          return stepStatus === "completed"
            ? ["Applied 50% margin settings", "Created JetVision branded quote", "Proposal ready for client"]
            : ["Generating proposal..."]
        default:
          return undefined
      }
    }

    setSteps((prev) =>
      prev.map((step) => ({
        ...step,
        details: getStepDetails(step.id, step.status),
      })),
    )
  }, [status])

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
        <div className="grid grid-cols-5 gap-2">
          {steps.map((step, index) => (
            <div key={step.id} className="text-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1",
                  step.status === "completed"
                    ? "bg-green-100 text-green-600"
                    : step.status === "in-progress"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-400",
                )}
              >
                {step.status === "completed" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : step.status === "in-progress" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">[{index + 1}]</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{step.title}</div>
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

        <div className="text-xs text-gray-600 dark:text-gray-400">Click any step for details</div>
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
              "transition-all duration-300",
              step.status === "in-progress" && "ring-2 ring-primary ring-opacity-50",
            )}
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
                {getStatusBadge(step.status)}
              </div>
            </CardHeader>

            {step.details && (
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
