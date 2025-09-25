"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, Gauge, MapPin, Star, Plane } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Operator } from "@/lib/mock-data"

interface OperatorResponsesProps {
  operators: Operator[]
  onSelectOperator?: (operator: Operator) => void
  selectedOperatorId?: string
}

export function OperatorResponses({ operators, onSelectOperator, selectedOperatorId }: OperatorResponsesProps) {
  const getAvailabilityBadge = (availability: Operator["availability"]) => {
    switch (availability) {
      case "confirmed":
        return <Badge className="bg-green-500">Confirmed</Badge>
      case "pending":
        return <Badge variant="secondary">Pending Verification</Badge>
      case "unavailable":
        return <Badge variant="destructive">Unavailable</Badge>
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "light":
        return "text-blue-500"
      case "midsize":
        return "text-green-500"
      case "heavy":
        return "text-orange-500"
      case "ultra-long-range":
        return "text-purple-500"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold font-[family-name:var(--font-space-grotesk)]">
          Operator Responses ({operators.length})
        </h3>
        <Badge variant="outline">{operators.filter((op) => op.availability === "confirmed").length} Confirmed</Badge>
      </div>

      <div className="grid gap-4">
        {operators.map((operator) => (
          <Card
            key={operator.id}
            className={cn(
              "transition-all duration-200 hover:shadow-md cursor-pointer",
              selectedOperatorId === operator.id && "ring-2 ring-primary",
            )}
            onClick={() => onSelectOperator?.(operator)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Plane className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-[family-name:var(--font-space-grotesk)]">
                      {operator.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground font-[family-name:var(--font-dm-sans)]">
                      {operator.aircraft}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">${operator.basePrice.toLocaleString()}</div>
                  {getAvailabilityBadge(operator.availability)}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{operator.specifications.capacity} seats</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Gauge className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{operator.specifications.speed} mph</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{operator.specifications.range} nm</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">{operator.rating}/5.0</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Response: {operator.responseTime} min</span>
                  </div>
                  <Badge variant="outline" className={getCategoryColor(operator.specifications.category)}>
                    {operator.specifications.category}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">{operator.location}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
