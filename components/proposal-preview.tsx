"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Send, Download, Edit } from "lucide-react"
import type { ChatSession } from "./chat-sidebar"

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
  const getProposalData = () => {
    if (chatData?.id === "1") {
      // TEB → VNY use case
      return {
        aircraft: "Gulfstream G200",
        operator: "Executive Jets LLC",
        route: "Teterboro → Van Nuys",
        departureCode: "TEB",
        arrivalCode: "VNY",
        passengers: 6,
        date: "October 15, 2025",
        flightTime: "5h 30min",
        basePrice: 25000,
        margin: 7500,
        totalPrice: 32500,
        agentCommission: 1500,
        jetVisionNet: 6000,
      }
    } else if (chatData?.id === "2") {
      // MIA → ASE use case
      return {
        aircraft: "Challenger 350",
        operator: "NetJets",
        route: "Miami → Aspen",
        departureCode: "MIA",
        arrivalCode: "ASE",
        passengers: 4,
        date: "November 20, 2025",
        flightTime: "3h 45min",
        basePrice: 18000,
        margin: 5400,
        totalPrice: 23400,
        agentCommission: 1080,
        jetVisionNet: 4320,
      }
    } else if (chatData?.id === "4") {
      return {
        aircraft: "Citation CJ3+",
        operator: "West Coast Aviation",
        route: "Los Angeles → San Francisco",
        departureCode: "LAX",
        arrivalCode: "SFO",
        passengers: 2,
        date: "January 12, 2026",
        flightTime: "1h 15min",
        basePrice: 8500,
        margin: 2700,
        totalPrice: 11200,
        agentCommission: 540,
        jetVisionNet: 2160,
        customer: chatData.customer,
      }
    } else {
      // VNY → DAL use case (default)
      return {
        aircraft: "Citation Excel",
        operator: "XOJET",
        route: "Van Nuys → Dallas Love Field",
        departureCode: "VNY",
        arrivalCode: "DAL",
        passengers: 3,
        date: "December 8, 2025",
        flightTime: "2h 30min",
        basePrice: 12000,
        margin: 3600,
        totalPrice: 15600,
        agentCommission: 720,
        jetVisionNet: 2880,
      }
    }
  }

  const proposal = getProposalData()

  if (embedded) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">JV</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm">JetVision Group</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Executive Proposal</p>
            </div>
          </div>
          <Badge className="bg-green-500 text-white text-xs">Ready</Badge>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Client:</span>
            <span className="font-medium">
              {proposal.customer?.name || "ABC Corporation"}
              {proposal.customer?.isReturning && (
                <Badge
                  variant="outline"
                  className="ml-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
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
            <span className="font-semibold">Total Price:</span>
            <span className="text-lg font-bold text-blue-600">${proposal.totalPrice.toLocaleString()}</span>
          </div>
        </div>

        {proposal.customer?.preferences && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-1 mb-2">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                ⭐ Customer Preferences Included
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>In-Flight Catering:</span>
                <span className="font-medium">{proposal.customer.preferences.catering}</span>
              </div>
              <div className="flex justify-between">
                <span>Ground Transport:</span>
                <span className="font-medium">{proposal.customer.preferences.groundTransport}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center space-x-1 mb-2">
            <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">
              💰 Commission & Margin (Internal Only)
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Operator Cost:</span>
              <span>${proposal.basePrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>JetVision Margin (30%):</span>
              <span>+ ${proposal.margin.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Client Price:</span>
              <span>${proposal.totalPrice.toLocaleString()}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-yellow-200 dark:border-yellow-700">
              <div className="flex justify-between text-xs">
                <span>Agent Commission (20%):</span>
                <span className="text-green-600">${proposal.agentCommission.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>JetVision Net (80%):</span>
                <span>${proposal.jetVisionNet.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
            <Send className="w-3 h-3 mr-1" />
            Send Proposal to Client
          </Button>
          <Button size="sm" variant="outline" className="bg-transparent">
            <Download className="w-3 h-3 mr-1" />
            Download PDF
          </Button>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 bg-transparent">
            <Edit className="w-3 h-3 mr-1" />
            Adjust Pricing
          </Button>
        </div>
      </div>
    )
  }

  // ... existing code for full proposal view ...
}
