'use client';

import { useEffect, useState } from 'react';
import { useAuth, UserButton } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PlaneTakeoff,
  Users,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  total_requests: number;
  pending_requests: number;
  completed_requests: number;
  total_quotes: number;
  active_workflows: number;
}

interface Request {
  id: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  passengers: number;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const { userId, isLoaded } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRequests, setRecentRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && userId) {
      fetchDashboardData();
    }
  }, [isLoaded, userId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch recent requests
      const requestsRes = await fetch('/api/requests?limit=5');
      const requestsData = await requestsRes.json();
      setRecentRequests(requestsData.requests || []);

      // Calculate stats from requests
      const requests = requestsData.requests || [];
      const stats: DashboardStats = {
        total_requests: requests.length,
        pending_requests: requests.filter((r: Request) =>
          ['pending', 'analyzing', 'searching_flights'].includes(r.status)
        ).length,
        completed_requests: requests.filter((r: Request) => r.status === 'completed').length,
        total_quotes: 0, // Will be fetched separately
        active_workflows: requests.filter((r: Request) =>
          !['completed', 'failed', 'cancelled'].includes(r.status)
        ).length,
      };

      // Fetch quotes count
      const quotesRes = await fetch('/api/quotes');
      const quotesData = await quotesRes.json();
      stats.total_quotes = quotesData.quotes?.length || 0;

      setStats(stats);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-500',
      pending: 'bg-yellow-500',
      analyzing: 'bg-blue-500',
      searching_flights: 'bg-purple-500',
      failed: 'bg-red-500',
      cancelled: 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-400';
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Jetvision Dashboard</h1>
              <p className="text-sm text-gray-600">Multi-Agent RFP Processing System</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard/new-request">
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  New RFP Request
                </Button>
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'w-10 h-10',
                  },
                }}
                afterSignOutUrl="/"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_requests || 0}</div>
              <p className="text-xs text-gray-600 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pending_requests || 0}</div>
              <p className="text-xs text-gray-600 mt-1">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.completed_requests || 0}</div>
              <p className="text-xs text-gray-600 mt-1">Successfully processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_quotes || 0}</div>
              <p className="text-xs text-gray-600 mt-1">Received from operators</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
              <PlaneTakeoff className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.active_workflows || 0}</div>
              <p className="text-xs text-gray-600 mt-1">Currently processing</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent RFP Requests</CardTitle>
            <CardDescription>Your most recent flight requests</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No requests yet</p>
                <Link href="/dashboard/new-request">
                  <Button>Create Your First Request</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-shrink-0">
                        <PlaneTakeoff className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {request.departure_airport} → {request.arrival_airport}
                          </h3>
                          <Badge variant="secondary" className={getStatusColor(request.status)}>
                            {getStatusLabel(request.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(request.departure_date).toLocaleDateString()} • {request.passengers} passengers
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Created {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Link href={`/dashboard/requests/${request.id}`}>
                      <Button variant="outline" size="sm">View Details</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/dashboard/requests">
              <CardHeader>
                <FileText className="w-8 h-8 text-blue-600 mb-2" />
                <CardTitle>View All Requests</CardTitle>
                <CardDescription>Browse all RFP requests and their status</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/dashboard/quotes">
              <CardHeader>
                <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
                <CardTitle>Compare Quotes</CardTitle>
                <CardDescription>Review and compare operator quotes</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/dashboard/clients">
              <CardHeader>
                <Users className="w-8 h-8 text-purple-600 mb-2" />
                <CardTitle>Manage Clients</CardTitle>
                <CardDescription>View and update client profiles</CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>
      </main>
    </div>
  );
}
