'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Edit,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  DollarSign
} from 'lucide-react';

interface ClientProfile {
  id: string;
  iso_agent_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  preferences: any;
  created_at: string;
  updated_at: string;
}

interface Request {
  id: string;
  client_profile_id: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  passengers: number;
  budget: number | null;
  status: string;
  created_at: string;
}

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { userId, isLoaded } = useAuth();

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Partial<ClientProfile>>({});

  const clientId = params.id as string;

  useEffect(() => {
    if (isLoaded && userId) {
      fetchClientDetails();
    }
  }, [isLoaded, userId, clientId]);

  const fetchClientDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch client profile
      const clientRes = await fetch(`/api/clients?client_id=${clientId}`);
      if (!clientRes.ok) throw new Error('Failed to fetch client');
      const clientData = await clientRes.json();

      if (clientData.clients && clientData.clients.length > 0) {
        const clientProfile = clientData.clients[0];
        setClient(clientProfile);
        setEditedClient(clientProfile);

        // Fetch requests for this client
        const requestsRes = await fetch(`/api/requests?client_id=${clientId}`);
        if (requestsRes.ok) {
          const requestsData = await requestsRes.json();
          setRequests(requestsData.requests || []);
        }
      } else {
        setError('Client not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load client details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!client) return;

    try {
      const res = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          company_name: editedClient.company_name,
          contact_name: editedClient.contact_name,
          contact_email: editedClient.contact_email,
          contact_phone: editedClient.contact_phone,
          address: editedClient.address,
          preferences: editedClient.preferences,
        }),
      });

      if (!res.ok) throw new Error('Failed to update client');

      const data = await res.json();
      setClient(data.client);
      setIsEditing(false);
      alert('Client profile updated successfully!');
    } catch (err) {
      alert('Failed to update client: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleCancel = () => {
    if (client) {
      setEditedClient(client);
    }
    setIsEditing(false);
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-500',
      analyzing: 'bg-blue-500',
      searching_flights: 'bg-purple-500',
      completed: 'bg-green-500',
      failed: 'bg-red-500',
      cancelled: 'bg-gray-500',
    };
    return statusColors[status] || 'bg-gray-400';
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading client profile...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Client</h2>
          <p className="text-gray-600 mb-4">{error || 'Client not found'}</p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Calculate stats
  const completedRequests = requests.filter(r => r.status === 'completed').length;
  const totalSpent = requests
    .filter(r => r.status === 'completed' && r.budget)
    .reduce((sum, r) => sum + (r.budget || 0), 0);
  const avgBudget = requests.length > 0
    ? requests.reduce((sum, r) => sum + (r.budget || 0), 0) / requests.length
    : 0;

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
              <h1 className="text-3xl font-bold text-gray-900">Client Profile</h1>
              <p className="text-sm text-gray-500 mt-1">
                Member since {new Date(client.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button onClick={handleCancel} variant="outline">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requests.length}</div>
              <p className="text-xs text-gray-600 mt-1">
                {completedRequests} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalSpent.toLocaleString()}</div>
              <p className="text-xs text-gray-600 mt-1">
                On completed requests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Budget</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${avgBudget.toLocaleString()}</div>
              <p className="text-xs text-gray-600 mt-1">
                Per request
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Client details and contact methods</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input
                      id="company_name"
                      value={editedClient.company_name || ''}
                      onChange={(e) => setEditedClient({ ...editedClient, company_name: e.target.value })}
                      placeholder="Acme Corporation"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contact Person *</Label>
                    <Input
                      id="contact_name"
                      value={editedClient.contact_name || ''}
                      onChange={(e) => setEditedClient({ ...editedClient, contact_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email Address *</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={editedClient.contact_email || ''}
                      onChange={(e) => setEditedClient({ ...editedClient, contact_email: e.target.value })}
                      placeholder="john@acme.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Phone Number</Label>
                    <Input
                      id="contact_phone"
                      value={editedClient.contact_phone || ''}
                      onChange={(e) => setEditedClient({ ...editedClient, contact_phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={editedClient.address || ''}
                    onChange={(e) => setEditedClient({ ...editedClient, address: e.target.value })}
                    placeholder="123 Main St, City, State, ZIP"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-start space-x-3">
                  <Building className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Company</p>
                    <p className="text-base font-semibold text-gray-900">{client.company_name}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Contact Person</p>
                    <p className="text-base font-semibold text-gray-900">{client.contact_name}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Email</p>
                    <p className="text-base font-semibold text-gray-900">{client.contact_email}</p>
                  </div>
                </div>

                {client.contact_phone && (
                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Phone</p>
                      <p className="text-base font-semibold text-gray-900">{client.contact_phone}</p>
                    </div>
                  </div>
                )}

                {client.address && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Address</p>
                      <p className="text-base font-semibold text-gray-900">{client.address}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preferences */}
        {client.preferences && Object.keys(client.preferences).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Client preferences and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm">
                {JSON.stringify(client.preferences, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Request History */}
        <Card>
          <CardHeader>
            <CardTitle>Request History</CardTitle>
            <CardDescription>{requests.length} total requests</CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No requests yet</p>
                <p className="text-sm mt-2">This client hasn't submitted any requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/requests/${request.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <p className="font-semibold text-gray-900">
                          {request.departure_airport} → {request.arrival_airport}
                        </p>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(request.departure_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {request.passengers} passengers
                        </span>
                        {request.budget && (
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            ${request.budget.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">Profile Created</p>
                  <p className="text-sm text-gray-600">
                    {new Date(client.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">Last Updated</p>
                  <p className="text-sm text-gray-600">
                    {new Date(client.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
              {requests.length > 0 && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900">Last Request</p>
                    <p className="text-sm text-gray-600">
                      {new Date(requests[0].created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
