/**
 * RFP Processing Dashboard
 * Display active RFPs with status and quote comparison
 */

'use client'

import type React from 'react'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { FlightRoute } from '@/components/aviation'
import { Eye, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRFPRealtime } from '@/hooks/use-rfp-realtime'
import { useToast } from '@/hooks/use-toast'

// RFP status types
type RFPStatus = 'pending' | 'searching' | 'quotes_received' | 'proposal_sent' | 'completed' | 'cancelled'

interface RFPRequest {
  id: string
  clientName: string
  clientId: string
  departureAirport: string
  arrivalAirport: string
  departureDate: Date
  returnDate?: Date
  passengers: number
  status: RFPStatus
  quoteCount: number
  createdAt: Date
  updatedAt: Date
}

export default function RFPDashboardPage() {
  const [requests, setRequests] = useState<RFPRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('active')
  const { rfpUpdates, clearUpdates } = useRFPRealtime()
  const { toast } = useToast()

  useEffect(() => {
    loadRequests()
  }, [])

  // Handle real-time updates
  useEffect(() => {
    if (rfpUpdates.length > 0) {
      rfpUpdates.forEach((update) => {
        setRequests((prev) =>
          prev.map((req) =>
            req.id === update.id
              ? { ...req, status: update.status as RFPStatus, quoteCount: update.quoteCount, updatedAt: update.updatedAt }
              : req
          )
        )

        // Show toast notification
        toast({
          title: 'RFP Updated',
          description: `Status changed to ${update.status}`,
        })
      })

      // Clear processed updates
      clearUpdates()
    }
  }, [rfpUpdates, clearUpdates, toast])

  const loadRequests = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/requests')
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests || [])
      }
    } catch (error) {
      console.error('Failed to load requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: RFPStatus) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
      searching: { label: 'Searching', variant: 'default' as const, icon: Clock },
      quotes_received: { label: 'Quotes Received', variant: 'default' as const, icon: AlertCircle },
      proposal_sent: { label: 'Proposal Sent', variant: 'secondary' as const, icon: CheckCircle },
      completed: { label: 'Completed', variant: 'secondary' as const, icon: CheckCircle },
      cancelled: { label: 'Cancelled', variant: 'secondary' as const, icon: XCircle },
    }

    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const filteredRequests = requests.filter((req) => {
    if (activeTab === 'active') {
      return !['completed', 'cancelled'].includes(req.status)
    }
    if (activeTab === 'completed') {
      return ['completed', 'cancelled'].includes(req.status)
    }
    return true
  })

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">RFP Processing Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor active RFPs and review flight quotes
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="active">Active ({requests.filter(r => !['completed', 'cancelled'].includes(r.status)).length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({requests.filter(r => ['completed', 'cancelled'].includes(r.status)).length})</TabsTrigger>
          <TabsTrigger value="all">All ({requests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No RFPs found</p>
                <Button asChild className="mt-4">
                  <Link href="/rfp/new">Create New RFP</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {request.clientName}
                        {getStatusBadge(request.status)}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Client ID: {request.clientId} • Created {new Date(request.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/dashboard/rfp/${request.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <FlightRoute
                    departureAirport={request.departureAirport}
                    arrivalAirport={request.arrivalAirport}
                  />

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex gap-4">
                      <div>
                        <span className="text-muted-foreground">Departure:</span>{' '}
                        <span className="font-medium">
                          {new Date(request.departureDate).toLocaleDateString()}
                        </span>
                      </div>
                      {request.returnDate && (
                        <div>
                          <span className="text-muted-foreground">Return:</span>{' '}
                          <span className="font-medium">
                            {new Date(request.returnDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Passengers:</span>{' '}
                        <span className="font-medium">{request.passengers}</span>
                      </div>
                    </div>

                    {request.quoteCount > 0 && (
                      <Badge variant="outline">
                        {request.quoteCount} {request.quoteCount === 1 ? 'Quote' : 'Quotes'} Received
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
