/**
 * RFP Details & Quote Comparison Page
 * View RFP details and compare flight quotes side-by-side
 */

'use client'

import type React from 'react'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { FlightRoute, QuoteCard, PriceDisplay } from '@/components/aviation'
import { ArrowLeft, Send, Download, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useRFPRealtime } from '@/lib/hooks/use-rfp-realtime'
import { useToast } from '@/hooks/use-toast'

interface Quote {
  id: string
  operatorName: string
  aircraftType: string
  price: number
  aiScore: number
  rank: number
  totalQuotes: number
  operatorRating: number
  departureTime: string
  arrivalTime: string
  flightDuration: string
  isRecommended: boolean
}

interface RFPDetails {
  id: string
  clientName: string
  clientId: string
  clientEmail?: string
  vipStatus?: string
  departureAirport: string
  arrivalAirport: string
  departureDate: Date
  departureTime?: string
  returnDate?: Date
  returnTime?: string
  passengers: number
  aircraftType?: string
  budgetMin?: number
  budgetMax?: number
  specialRequirements?: string
  cateringPreference?: string
  groundTransport?: boolean
  flexibleDates?: boolean
  status: string
  quoteCount: number
  createdAt: Date
  updatedAt: Date
}

export default function RFPDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const rfpId = params.id as string

  const [rfp, setRfp] = useState<RFPDetails | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null)
  const { rfpUpdates, quoteUpdates, clearUpdates } = useRFPRealtime(rfpId)
  const { toast } = useToast()

  useEffect(() => {
    loadRFPDetails()
  }, [rfpId])

  // Handle real-time RFP updates
  useEffect(() => {
    if (rfpUpdates.length > 0 && rfp) {
      rfpUpdates.forEach((update) => {
        if (update.id === rfpId) {
          setRfp((prev) =>
            prev ? { ...prev, status: update.status, quoteCount: update.quoteCount, updatedAt: update.updatedAt } : prev
          )
        }
      })
    }
  }, [rfpUpdates, rfpId, rfp])

  // Handle real-time quote updates
  useEffect(() => {
    if (quoteUpdates.length > 0) {
      quoteUpdates.forEach((update) => {
        toast({
          title: 'New Quote Received',
          description: `${update.operatorName} submitted a quote`,
        })
      })

      // Reload quotes to get full data
      loadRFPDetails()

      // Clear processed updates
      clearUpdates()
    }
  }, [quoteUpdates, clearUpdates, toast])

  const loadRFPDetails = async () => {
    setIsLoading(true)
    try {
      // Load RFP details
      const rfpResponse = await fetch(`/api/requests/${rfpId}`)
      if (rfpResponse.ok) {
        const rfpData = await rfpResponse.json()
        setRfp(rfpData)
      }

      // Load quotes
      const quotesResponse = await fetch(`/api/quotes?requestId=${rfpId}`)
      if (quotesResponse.ok) {
        const quotesData = await quotesResponse.json()
        setQuotes(quotesData.quotes || [])
      }
    } catch (error) {
      console.error('Failed to load RFP details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectQuote = (quoteId: string) => {
    setSelectedQuote(quoteId)
  }

  const handleSendProposal = async () => {
    if (!selectedQuote) return

    try {
      const response = await fetch(`/api/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: rfpId,
          quoteId: selectedQuote,
        }),
      })

      if (response.ok) {
        router.push('/dashboard/rfp')
      }
    } catch (error) {
      console.error('Failed to send proposal:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!rfp) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">RFP not found</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/rfp">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const recommendedQuote = quotes.find((q) => q.isRecommended)
  const sortedQuotes = [...quotes].sort((a, b) => a.rank - b.rank)

  return (
    <div className="container mx-auto py-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link href="/dashboard/rfp">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{rfp.clientName}</h1>
          <p className="text-muted-foreground">RFP Details & Quote Comparison</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadRFPDetails}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {selectedQuote && (
            <Button onClick={handleSendProposal}>
              <Send className="mr-2 h-4 w-4" />
              Send Proposal
            </Button>
          )}
        </div>
      </div>

      {/* RFP Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Flight Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FlightRoute
            departureAirport={rfp.departureAirport}
            arrivalAirport={rfp.arrivalAirport}
            departureTime={rfp.departureTime}
            arrivalTime={rfp.returnTime}
          />

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-2">Client Information</h3>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Name:</dt>
                  <dd className="font-medium">{rfp.clientName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">ID:</dt>
                  <dd className="font-medium">{rfp.clientId}</dd>
                </div>
                {rfp.clientEmail && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Email:</dt>
                    <dd className="font-medium">{rfp.clientEmail}</dd>
                  </div>
                )}
                {rfp.vipStatus && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Status:</dt>
                    <dd>
                      <Badge variant="secondary">{rfp.vipStatus.toUpperCase()}</Badge>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Flight Details</h3>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Departure:</dt>
                  <dd className="font-medium">
                    {new Date(rfp.departureDate).toLocaleDateString()}
                    {rfp.departureTime && ` at ${rfp.departureTime}`}
                  </dd>
                </div>
                {rfp.returnDate && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Return:</dt>
                    <dd className="font-medium">
                      {new Date(rfp.returnDate).toLocaleDateString()}
                      {rfp.returnTime && ` at ${rfp.returnTime}`}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Passengers:</dt>
                  <dd className="font-medium">{rfp.passengers}</dd>
                </div>
                {rfp.aircraftType && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Aircraft:</dt>
                    <dd className="font-medium capitalize">{rfp.aircraftType.replace('_', ' ')}</dd>
                  </div>
                )}
              </dl>
            </div>

            {(rfp.budgetMin || rfp.budgetMax || rfp.specialRequirements) && (
              <div className="md:col-span-2">
                <h3 className="font-semibold mb-2">Preferences</h3>
                <dl className="space-y-1 text-sm">
                  {(rfp.budgetMin || rfp.budgetMax) && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Budget Range:</dt>
                      <dd className="font-medium">
                        ${rfp.budgetMin?.toLocaleString() || '0'} - $
                        {rfp.budgetMax?.toLocaleString() || '∞'}
                      </dd>
                    </div>
                  )}
                  {rfp.specialRequirements && (
                    <div>
                      <dt className="text-muted-foreground mb-1">Special Requirements:</dt>
                      <dd className="text-sm">{rfp.specialRequirements}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quote Comparison */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Quotes ({quotes.length})</TabsTrigger>
          {recommendedQuote && <TabsTrigger value="recommended">Recommended</TabsTrigger>}
          <TabsTrigger value="selected">Selected</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {quotes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No quotes received yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Quotes will appear here once operators respond
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedQuotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  operatorName={quote.operatorName}
                  aircraftType={quote.aircraftType}
                  price={quote.price}
                  aiScore={quote.aiScore}
                  rank={quote.rank}
                  totalQuotes={quote.totalQuotes}
                  operatorRating={quote.operatorRating}
                  departureTime={quote.departureTime}
                  arrivalTime={quote.arrivalTime}
                  flightDuration={quote.flightDuration}
                  isRecommended={quote.isRecommended}
                  isSelected={selectedQuote === quote.id}
                  onSelect={() => handleSelectQuote(quote.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {recommendedQuote && (
          <TabsContent value="recommended">
            <div className="max-w-md mx-auto">
              <QuoteCard
                operatorName={recommendedQuote.operatorName}
                aircraftType={recommendedQuote.aircraftType}
                price={recommendedQuote.price}
                aiScore={recommendedQuote.aiScore}
                rank={recommendedQuote.rank}
                totalQuotes={recommendedQuote.totalQuotes}
                operatorRating={recommendedQuote.operatorRating}
                departureTime={recommendedQuote.departureTime}
                arrivalTime={recommendedQuote.arrivalTime}
                flightDuration={recommendedQuote.flightDuration}
                isRecommended={recommendedQuote.isRecommended}
                isSelected={selectedQuote === recommendedQuote.id}
                onSelect={() => handleSelectQuote(recommendedQuote.id)}
              />
            </div>
          </TabsContent>
        )}

        <TabsContent value="selected">
          {selectedQuote ? (
            <div className="max-w-md mx-auto">
              {(() => {
                const quote = quotes.find((q) => q.id === selectedQuote)
                if (!quote) return null
                return (
                  <QuoteCard
                    operatorName={quote.operatorName}
                    aircraftType={quote.aircraftType}
                    price={quote.price}
                    aiScore={quote.aiScore}
                    rank={quote.rank}
                    totalQuotes={quote.totalQuotes}
                    operatorRating={quote.operatorRating}
                    departureTime={quote.departureTime}
                    arrivalTime={quote.arrivalTime}
                    flightDuration={quote.flightDuration}
                    isRecommended={quote.isRecommended}
                    isSelected={true}
                    onSelect={() => handleSelectQuote(quote.id)}
                  />
                )
              })()}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No quote selected</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Select a quote from the "All Quotes" tab
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
