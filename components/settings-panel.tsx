"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Calculator, DollarSign, Users, Save } from "lucide-react"

export function SettingsPanel() {
  const [marginType, setMarginType] = useState<"fixed" | "percentage">("fixed")
  const [marginValue, setMarginValue] = useState(5000)
  const [marginPercentage, setMarginPercentage] = useState(50)
  const [commissionSplit, setCommissionSplit] = useState([20])
  const [enableClientPricing, setEnableClientPricing] = useState(false)
  const [enableRoutePricing, setEnableRoutePricing] = useState(false)
  const [enableDemandPricing, setEnableDemandPricing] = useState(false)
  const [enableTieredRates, setEnableTieredRates] = useState(false)

  // Sample calculation
  const operatorCost = 10000
  const appliedMargin = marginType === "fixed" ? marginValue : (operatorCost * marginPercentage) / 100
  const totalQuote = operatorCost + appliedMargin
  const agentCommission = appliedMargin * (commissionSplit[0] / 100)
  const jetvisionNet = appliedMargin - agentCommission

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground font-[family-name:var(--font-space-grotesk)] mb-2">
          Settings Panel
        </h2>
        <p className="text-muted-foreground font-[family-name:var(--font-dm-sans)]">
          Configure margins and commission structures
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Margin Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 font-[family-name:var(--font-space-grotesk)]">
              <DollarSign className="w-5 h-5" />
              <span>Margin Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Base Margin Type</Label>
              <Select value={marginType} onValueChange={(value: "fixed" | "percentage") => setMarginType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {marginType === "fixed" ? (
              <div className="space-y-2">
                <Label>Default Margin ($)</Label>
                <Input
                  type="number"
                  value={marginValue}
                  onChange={(e) => setMarginValue(Number(e.target.value))}
                  placeholder="5000"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Default Margin (%)</Label>
                <div className="px-3">
                  <Slider
                    value={[marginPercentage]}
                    onValueChange={(value) => setMarginPercentage(value[0])}
                    max={100}
                    min={10}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>10%</span>
                    <span className="font-medium">{marginPercentage}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <Label>Dynamic Margin Rules</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="client-pricing" className="text-sm">
                    Enable client-based pricing
                  </Label>
                  <Switch id="client-pricing" checked={enableClientPricing} onCheckedChange={setEnableClientPricing} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="route-pricing" className="text-sm">
                    Enable route-based pricing
                  </Label>
                  <Switch id="route-pricing" checked={enableRoutePricing} onCheckedChange={setEnableRoutePricing} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="demand-pricing" className="text-sm">
                    Enable demand-based pricing
                  </Label>
                  <Switch id="demand-pricing" checked={enableDemandPricing} onCheckedChange={setEnableDemandPricing} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commission Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 font-[family-name:var(--font-space-grotesk)]">
              <Users className="w-5 h-5" />
              <span>Commission Split Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Agent/ISO Commission Split</Label>
              <div className="px-3">
                <Slider
                  value={commissionSplit}
                  onValueChange={setCommissionSplit}
                  max={50}
                  min={10}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>Jetvision: {100 - commissionSplit[0]}%</span>
                  <span>Agent: {commissionSplit[0]}%</span>
                </div>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-3">
              <h4 className="font-medium text-sm mb-2">Commission Breakdown (Live Preview)</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Margin:</span>
                  <span className="font-medium">${appliedMargin.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Agent Commission ({commissionSplit[0]}%):</span>
                  <span className="font-medium text-accent">${agentCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Jetvision Net ({100 - commissionSplit[0]}%):</span>
                  <span className="font-medium text-primary">${jetvisionNet.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="tiered-rates" className="text-sm">
                  Enable tiered commission rates
                </Label>
                <Switch id="tiered-rates" checked={enableTieredRates} onCheckedChange={setEnableTieredRates} />
              </div>

              {enableTieredRates && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Bronze Agents:</span>
                    <Badge variant="outline">15%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Silver Agents:</span>
                    <Badge variant="outline">20%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Gold Agents:</span>
                    <Badge variant="outline">25%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Platinum Agents:</span>
                    <Badge variant="outline">30%</Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Margin Calculator Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 font-[family-name:var(--font-space-grotesk)]">
            <Calculator className="w-5 h-5" />
            <span>Margin Calculator Preview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Operator Cost</p>
                <p className="text-2xl font-bold">${operatorCost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Margin Applied ({marginType === "fixed" ? "$" + marginValue.toLocaleString() : marginPercentage + "%"}
                  )
                </p>
                <p className="text-2xl font-bold text-accent">+ ${appliedMargin.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Quote</p>
                <p className="text-2xl font-bold text-primary">${totalQuote.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button className="flex items-center space-x-2">
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
