"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Send, Download, Edit } from "lucide-react"
import type { ChatSession } from "./chat-sidebar"

interface ProposalData {
  aircraft?: string
  operator?: string
  route?: string
  departureCode?: string
  arrivalCode?: string
  passengers?: number
  date?: string
  flightTime?: string
  basePrice?: number
  margin?: number
  totalPrice?: number
  agentCommission?: number
  jetvisionNet?: number
  customer?: {
    name: string
    isReturning?: boolean
    preferences?: {
      catering?: string
      groundTransport?: string
    }
  }
}

interface ProposalPreviewProps {
  embedded?: boolean
  chatData?: ChatSession
  onSendToClient?: () => void
  onEditProposal?: () => void
  onDownloadPdf?: () => void
}

export function ProposalPreview({
  embedded = false,
  chatData,
  onSendToClient,
  onEditProposal,
  onDownloadPdf,
}: ProposalPreviewProps) {
  // Get proposal data from chatData props - no more hardcoded values
  // Calculate commission and net to ensure they sum to margin exactly
  // Use numeric margin value to avoid rounding errors in sum
  const margin = typeof chatData?.margin === 'number' ? chatData.margin : 0
  const agentCommission = margin > 0 ? Math.round(margin * 0.2) : 0
  const jetvisionNet = margin > 0 ? margin - agentCommission : 0

  const proposal: ProposalData = {
    aircraft: chatData?.aircraft || "Aircraft TBD",
    operator: chatData?.operator || "Operator TBD",
    route: chatData?.route || "Route TBD",
    passengers: chatData?.passengers || 1,
    date: chatData?.date || "Date TBD",
    basePrice: chatData?.basePrice || 0,
    margin: margin,
    totalPrice: chatData?.totalPrice || 0,
    agentCommission: agentCommission,
    jetvisionNet: jetvisionNet,
    customer: chatData?.customer,
  }

  if (embedded) {
    return (
      <div className="bg-gradient-to-br from-info-bg to-info-bg rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">JV</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm">Jetvision Group</h4>
              <p className="text-xs text-muted-foreground">Executive Proposal</p>
            </div>
          </div>
          <Badge className="bg-success text-white text-xs">Ready</Badge>
        </div>

        <div className="bg-card rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Client:</span>
            <span className="font-medium">
              {proposal.customer?.name || "Client TBD"}
              {proposal.customer?.isReturning && (
                <Badge
                  variant="outline"
                  className="ml-2 text-xs bg-info-bg text-primary"
                >
                  Returning
                </Badge>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Route:</span>
            <span className="font-medium">{proposal.route}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Aircraft:</span>
            <span className="font-medium">{proposal.aircraft}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Date:</span>
            <span className="font-medium">{proposal.date}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total Cost:</span>
            <span className="text-lg font-bold text-primary">
              {proposal.totalPrice ? `$${proposal.totalPrice.toLocaleString()}` : "Price TBD"}
            </span>
          </div>
        </div>

        {proposal.customer?.preferences && (
          <div className="bg-info-bg rounded-lg p-3 border border-info-border">
            <div className="flex items-center space-x-1 mb-2">
              <span className="text-xs font-semibold text-primary">
                ⭐ Customer Preferences Included
              </span>
            </div>
            <div className="space-y-2 text-xs">
              {proposal.customer.preferences.catering && (
                <div className="flex justify-between">
                  <span>In-Flight Catering:</span>
                  <span className="font-medium">{proposal.customer.preferences.catering}</span>
                </div>
              )}
              {proposal.customer.preferences.groundTransport && (
                <div className="flex justify-between">
                  <span>Ground Transport:</span>
                  <span className="font-medium">{proposal.customer.preferences.groundTransport}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {proposal.basePrice !== undefined && proposal.basePrice > 0 && (
          <div className="bg-warning-bg rounded-lg p-3 border border-warning-border">
            <div className="flex items-center space-x-1 mb-2">
              <span className="text-xs font-semibold text-warning">
                💰 Commission & Margin (Internal Only)
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Operator Cost:</span>
                <span>${proposal.basePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Jetvision Service Fee:</span>
                <span>+ ${(proposal.margin || 0).toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total Cost:</span>
                <span>${(proposal.totalPrice || 0).toLocaleString()}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-warning-border">
                <div className="flex justify-between text-xs">
                  <span>Agent Commission (20%):</span>
                  <span className="text-success">${(proposal.agentCommission || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Jetvision Net (80%):</span>
                  <span>${(proposal.jetvisionNet || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90" onClick={onSendToClient}>
            <Send className="w-3 h-3 mr-1" />
            Send Proposal to Client
          </Button>
          <Button size="sm" variant="outline" className="bg-transparent" onClick={onDownloadPdf}>
            <Download className="w-3 h-3 mr-1" />
            Download PDF
          </Button>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 bg-transparent" onClick={onEditProposal}>
            <Edit className="w-3 h-3 mr-1" />
            Adjust Pricing
          </Button>
        </div>
      </div>
    )
  }

  // Full proposal view placeholder
  return null
}
