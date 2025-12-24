"use client"

import { useState } from "react"
import { useUserRole } from "@/lib/hooks/use-user-role"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calculator, DollarSign, Users, Save, Settings } from "lucide-react"

/**
 * Settings Dropdown Menu Component
 * 
 * Complete dropdown menu component with trigger button.
 * This is the main component to use for the Settings dropdown.
 */
export function SettingsDropdownMenu() {
  const { isAdmin, loading } = useUserRole()
  const [marginType, setMarginType] = useState<"fixed" | "percentage">("fixed")
  const [marginValue, setMarginValue] = useState(5000)
  const [marginPercentage, setMarginPercentage] = useState(50)
  const [commissionSplit, setCommissionSplit] = useState([20])
  const [enableClientPricing, setEnableClientPricing] = useState(false)
  const [enableRoutePricing, setEnableRoutePricing] = useState(false)
  const [enableDemandPricing, setEnableDemandPricing] = useState(false)
  const [enableTieredRates, setEnableTieredRates] = useState(false)

  // Only show settings for admin users
  if (loading) return null
  if (!isAdmin) return null

  // Sample calculation
  const operatorCost = 10000
  const appliedMargin = marginType === "fixed" ? marginValue : (operatorCost * marginPercentage) / 100
  const totalQuote = operatorCost + appliedMargin
  const agentCommission = appliedMargin * (commissionSplit[0] / 100)
  const jetvisionNet = appliedMargin - agentCommission

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center space-x-2 rounded-lg transition-all text-gray-300 hover:text-white hover:bg-gray-800 data-[state=open]:bg-cyan-600 data-[state=open]:hover:bg-cyan-700 data-[state=open]:text-white data-[state=open]:shadow-sm"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-[600px] p-4"
        align="end"
        sideOffset={8}
      >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-foreground font-[family-name:var(--font-space-grotesk)] mb-1">
            Settings Panel
          </h2>
          <p className="text-sm text-muted-foreground font-[family-name:var(--font-dm-sans)]">
            Configure margins and commission structures
          </p>
        </div>

        <DropdownMenuSeparator />

        {/* Margin Configuration Section */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center space-x-2 px-0 py-2 font-[family-name:var(--font-space-grotesk)]">
            <DollarSign className="w-4 h-4" />
            <span className="text-base font-semibold">Margin Configuration</span>
          </DropdownMenuLabel>
          
          <div className="space-y-4 pl-6">
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
                  <Label htmlFor="client-pricing" className="text-sm cursor-pointer">
                    Enable client-based pricing
                  </Label>
                  <Switch 
                    id="client-pricing" 
                    checked={enableClientPricing} 
                    onCheckedChange={setEnableClientPricing}
                    aria-label="Enable client-based pricing"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="route-pricing" className="text-sm cursor-pointer">
                    Enable route-based pricing
                  </Label>
                  <Switch 
                    id="route-pricing" 
                    checked={enableRoutePricing} 
                    onCheckedChange={setEnableRoutePricing}
                    aria-label="Enable route-based pricing"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="demand-pricing" className="text-sm cursor-pointer">
                    Enable demand-based pricing
                  </Label>
                  <Switch 
                    id="demand-pricing" 
                    checked={enableDemandPricing} 
                    onCheckedChange={setEnableDemandPricing}
                    aria-label="Enable demand-based pricing"
                  />
                </div>
              </div>
            </div>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Commission Split Configuration Section */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center space-x-2 px-0 py-2 font-[family-name:var(--font-space-grotesk)]">
            <Users className="w-4 h-4" />
            <span className="text-base font-semibold">Commission Split Configuration</span>
          </DropdownMenuLabel>
          
          <div className="space-y-4 pl-6">
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
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Margin Calculator Preview Section */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center space-x-2 px-0 py-2 font-[family-name:var(--font-space-grotesk)]">
            <Calculator className="w-4 h-4" />
            <span className="text-base font-semibold">Margin Calculator Preview</span>
          </DropdownMenuLabel>
          
          <div className="space-y-4 pl-6">
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

            <div className="flex justify-end pt-2">
              <Button className="flex items-center space-x-2">
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </Button>
            </div>
          </div>
        </DropdownMenuGroup>
      </div>
    </DropdownMenuContent>
    </DropdownMenu>
  )
}

