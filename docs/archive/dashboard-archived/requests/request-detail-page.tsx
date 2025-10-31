'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Plane,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface Request {
  id: string;
  iso_agent_id: string;
  client_profile_id: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  return_date: string | null;
  passengers: number;
  aircraft_type: string | null;
  budget: number | null;
  special_requirements: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Quote {
  id: string;
  request_id: string;
  operator_name: string;
  aircraft_type: string;
  price: number;
  currency: string;
  notes: string | null;
  status: string;
  received_at: string;
  updated_at: string;
}

interface ClientProfile {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
}

interface WorkflowState {
  id: string;
  request_id: string;
  current_state: string;
  created_at: string;
  updated_at: string;
}

export default function RequestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { userId, isLoaded } = useAuth();

  const [request, setRequest] = useState<Request | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestId = params.id as string;

  useEffect(() => {
    if (isLoaded && userId) {
      fetchRequestDetails();
    }
  }, [isLoaded, userId, requestId]);

  const fetchRequestDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch request details
      const requestRes = await fetch(`/api/requests?request_id=${requestId}`);
      if (!requestRes.ok) throw new Error('Failed to fetch request');
      const requestData = await requestRes.json();

      if (requestData.requests && requestData.requests.length > 0) {
        const reqData = requestData.requests[0];
        setRequest(reqData);

        // Fetch client profile
        if (reqData.client_profile_id) {
          const clientRes = await fetch(`/api/clients?client_id=${reqData.client_profile_id}`);
          if (clientRes.ok) {
            const clientData = await clientRes.json();
            if (clientData.clients && clientData.clients.length > 0) {
              setClient(clientData.clients[0]);
            }
          }
        }

        // Fetch quotes for this request
        const quotesRes = await fetch(`/api/quotes?request_id=${requestId}`);
        if (quotesRes.ok) {
          const quotesData = await quotesRes.json();
          setQuotes(quotesData.quotes || []);
        }

        // Fetch workflow state
        const workflowRes = await fetch(`/api/workflows?request_id=${requestId}`);
        if (workflowRes.ok) {
          const workflowData = await workflowRes.json();
          if (workflowData.workflows && workflowData.workflows.length > 0) {
            setWorkflow(workflowData.workflows[0]);
          }
        }
      } else {
        setError('Request not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-500',
      analyzing: 'bg-blue-500',
      searching_flights: 'bg-purple-500',
      awaiting_quotes: 'bg-orange-500',
      analyzing_proposals: 'bg-indigo-500',
      completed: 'bg-green-500',
      failed: 'bg-red-500',
      cancelled: 'bg-gray-500',
    };
    return statusColors[status] || 'bg-gray-400';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-5 w-5" />;
      case 'analyzing':
      case 'searching_flights':
      case 'analyzing_proposals':
        return <RefreshCw className="h-5 w-5 animate-spin" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      const res = await fetch('/api/quotes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: quoteId, status: 'accepted' }),
      });

      if (!res.ok) throw new Error('Failed to accept quote');

      alert('Quote accepted successfully!');
      fetchRequestDetails(); // Refresh data
    } catch (err) {
      alert('Failed to accept quote: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    try {
      const res = await fetch('/api/quotes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: quoteId, status: 'rejected' }),
      });

      if (!res.ok) throw new Error('Failed to reject quote');

      alert('Quote rejected successfully!');
      fetchRequestDetails(); // Refresh data
    } catch (err) {
      alert('Failed to reject quote: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Request</h2>
          <p className="text-gray-600 mb-4">{error || 'Request not found'}</p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const lowestPrice = quotes.length > 0 ? Math.min(...quotes.map(q => q.price)) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Request Details</h1>
              <p className="text-sm text-gray-500 mt-1">ID: {request.id.substring(0, 8)}...</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(request.status)}
            <Badge className={getStatusColor(request.status)}>
              {request.status.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Request Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Request Overview</CardTitle>
            <CardDescription>Flight details and requirements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Route</p>
                  <p className="text-base font-semibold text-gray-900">
                    {request.departure_airport} → {request.arrival_airport}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Departure</p>
                  <p className="text-base font-semibold text-gray-900">
                    {new Date(request.departure_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {request.return_date && (
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Return</p>
                    <p className="text-base font-semibold text-gray-900">
                      {new Date(request.return_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-3">
                <Users className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Passengers</p>
                  <p className="text-base font-semibold text-gray-900">{request.passengers}</p>
                </div>
              </div>

              {request.aircraft_type && (
                <div className="flex items-start space-x-3">
                  <Plane className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Aircraft Type</p>
                    <p className="text-base font-semibold text-gray-900">{request.aircraft_type}</p>
                  </div>
                </div>
              )}

              {request.budget && (
                <div className="flex items-start space-x-3">
                  <DollarSign className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Budget</p>
                    <p className="text-base font-semibold text-gray-900">
                      ${request.budget.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {request.special_requirements && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-2">Special Requirements</p>
                <p className="text-gray-900">{request.special_requirements}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Information */}
        {client && (
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Company</p>
                  <p className="text-base font-semibold text-gray-900">{client.company_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Contact Person</p>
                  <p className="text-base font-semibold text-gray-900">{client.contact_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-base font-semibold text-gray-900">{client.contact_email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workflow State */}
        {workflow && (
          <Card>
            <CardHeader>
              <CardTitle>Workflow Progress</CardTitle>
              <CardDescription>Current processing state</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Badge className={getStatusColor(workflow.current_state)}>
                  {workflow.current_state.replace(/_/g, ' ').toUpperCase()}
                </Badge>
                <p className="text-sm text-gray-600">
                  Last updated: {new Date(workflow.updated_at).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quotes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Quotes Received</CardTitle>
                <CardDescription>{quotes.length} quotes available</CardDescription>
              </div>
              <Button onClick={fetchRequestDetails} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No quotes received yet</p>
                <p className="text-sm mt-2">Quotes will appear here once operators respond</p>
              </div>
            ) : (
              <div className="space-y-4">
                {quotes.map((quote) => {
                  const isLowest = quote.price === lowestPrice;
                  return (
                    <Card key={quote.id} className={isLowest ? 'border-green-500 border-2' : ''}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {quote.operator_name}
                              </h3>
                              {isLowest && (
                                <Badge className="bg-green-600 text-white">Best Price</Badge>
                              )}
                              <Badge variant="outline">{quote.status}</Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-600">Aircraft</p>
                                <p className="font-semibold text-gray-900">{quote.aircraft_type}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Price</p>
                                <p className="text-xl font-bold text-gray-900">
                                  {quote.currency} {quote.price.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Received</p>
                                <p className="font-medium text-gray-900">
                                  {new Date(quote.received_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            {quote.notes && (
                              <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-1">Notes</p>
                                <p className="text-gray-900 text-sm">{quote.notes}</p>
                              </div>
                            )}
                          </div>

                          {quote.status === 'received' && (
                            <div className="flex flex-col space-y-2 ml-4">
                              <Button
                                onClick={() => handleAcceptQuote(quote.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Accept
                              </Button>
                              <Button
                                onClick={() => handleRejectQuote(quote.id)}
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
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
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">Request Created</p>
                  <p className="text-sm text-gray-600">
                    {new Date(request.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">Last Updated</p>
                  <p className="text-sm text-gray-600">
                    {new Date(request.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
