'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  DollarSign,
  Clock,
  Plane,
} from 'lucide-react';
import Link from 'next/link';

interface Quote {
  id: string;
  request_id: string;
  operator_name: string;
  aircraft_type: string;
  price: number;
  currency: string;
  status: string;
  proposal_details: Record<string, any>;
  created_at: string;
  request: {
    departure_airport: string;
    arrival_airport: string;
    departure_date: string;
  };
}

export default function QuotesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('request_id');
  const { userId } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userId) {
      fetchQuotes();
    }
  }, [userId, requestId]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const url = requestId
        ? `/api/quotes?request_id=${requestId}`
        : '/api/quotes';
      const res = await fetch(url);
      const data = await res.json();
      setQuotes(data.quotes || []);
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    if (!confirm('Are you sure you want to accept this quote?')) return;

    try {
      const res = await fetch('/api/quotes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quoteId,
          status: 'accepted',
        }),
      });

      if (!res.ok) throw new Error('Failed to accept quote');

      alert('Quote accepted successfully!');
      fetchQuotes();
    } catch (error) {
      console.error('Error accepting quote:', error);
      alert('Failed to accept quote. Please try again.');
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    if (!confirm('Are you sure you want to reject this quote?')) return;

    try {
      const res = await fetch('/api/quotes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quoteId,
          status: 'rejected',
        }),
      });

      if (!res.ok) throw new Error('Failed to reject quote');

      fetchQuotes();
    } catch (error) {
      console.error('Error rejecting quote:', error);
      alert('Failed to reject quote. Please try again.');
    }
  };

  const toggleQuoteSelection = (quoteId: string) => {
    setSelectedQuotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(quoteId)) {
        newSet.delete(quoteId);
      } else {
        newSet.add(quoteId);
      }
      return newSet;
    });
  };

  const getLowestPrice = () => {
    if (quotes.length === 0) return null;
    return Math.min(...quotes.map((q) => q.price));
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      received: 'bg-blue-500',
      analyzed: 'bg-purple-500',
      accepted: 'bg-green-500',
      rejected: 'bg-red-500',
      pending: 'bg-yellow-500',
    };
    return colors[status] || 'bg-gray-400';
  };

  const selectedQuotesList = Array.from(selectedQuotes)
    .map((id) => quotes.find((q) => q.id === id))
    .filter(Boolean) as Quote[];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quotes...</p>
        </div>
      </div>
    );
  }

  const lowestPrice = getLowestPrice();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quote Comparison</h1>
              <p className="text-sm text-gray-600">
                {requestId ? 'Comparing quotes for specific request' : 'All quotes'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {quotes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No quotes available yet</p>
              <Link href="/dashboard/new-request">
                <Button>Create New Request</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{quotes.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Lowest Price</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${lowestPrice?.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Accepted</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {quotes.filter((q) => q.status === 'accepted').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {quotes.filter((q) => q.status === 'received').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Comparison Tool */}
            {selectedQuotes.size > 1 && (
              <Card className="mb-8 bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle>Comparing {selectedQuotes.size} Quotes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedQuotesList.map((quote) => (
                      <div key={quote.id} className="bg-white p-4 rounded-lg border">
                        <h4 className="font-semibold">{quote.operator_name}</h4>
                        <p className="text-2xl font-bold text-blue-600 mt-2">
                          ${quote.price.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{quote.aircraft_type}</p>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setSelectedQuotes(new Set())}
                  >
                    Clear Selection
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quotes List */}
            <div className="space-y-4">
              {quotes.map((quote) => {
                const isLowest = quote.price === lowestPrice;
                const isSelected = selectedQuotes.has(quote.id);

                return (
                  <Card
                    key={quote.id}
                    className={`${isSelected ? 'ring-2 ring-blue-500' : ''} ${
                      isLowest ? 'border-green-500 border-2' : ''
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleQuoteSelection(quote.id)}
                            className="mt-1 w-4 h-4"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold">{quote.operator_name}</h3>
                              <Badge className={getStatusColor(quote.status)}>
                                {quote.status}
                              </Badge>
                              {isLowest && (
                                <Badge className="bg-green-600">
                                  <TrendingDown className="w-3 h-3 mr-1" />
                                  Best Price
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                              <div>
                                <p className="text-sm text-gray-600">Price</p>
                                <p className="text-2xl font-bold text-blue-600">
                                  ${quote.price.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Aircraft</p>
                                <p className="font-semibold">{quote.aircraft_type}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Route</p>
                                <p className="font-semibold">
                                  {quote.request.departure_airport} → {quote.request.arrival_airport}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Date</p>
                                <p className="font-semibold">
                                  {new Date(quote.request.departure_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            {quote.proposal_details && (
                              <div className="mt-4 p-3 bg-gray-50 rounded">
                                <p className="text-sm text-gray-700">
                                  {JSON.stringify(quote.proposal_details).slice(0, 200)}...
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {quote.status === 'received' && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptQuote(quote.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectQuote(quote.id)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
