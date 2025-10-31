'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  CheckCircle,
  Clock,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  RefreshCw,
  Download
} from 'lucide-react';

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

interface Quote {
  id: string;
  request_id: string;
  operator_name: string;
  price: number;
  currency: string;
  status: string;
  received_at: string;
}

interface ClientProfile {
  id: string;
  company_name: string;
  created_at: string;
}

interface AgentExecution {
  id: string;
  agent_type: string;
  status: string;
  duration_ms: number | null;
  created_at: string;
}

interface AnalyticsSummary {
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  failedRequests: number;
  totalQuotes: number;
  acceptedQuotes: number;
  avgQuotesPerRequest: number;
  totalRevenue: number;
  avgDealSize: number;
  conversionRate: number;
  totalClients: number;
  activeClients: number;
  avgRequestsPerClient: number;
  avgResponseTime: number;
  agentPerformance: Record<string, { total: number; avgDuration: number }>;
  requestsByStatus: Record<string, number>;
  topRoutes: Array<{ route: string; count: number }>;
  monthlyTrend: Array<{ month: string; requests: number; completed: number }>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    if (isLoaded && userId) {
      fetchAnalytics();
    }
  }, [isLoaded, userId, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);

    try {
      // Fetch all data
      const [requestsRes, quotesRes, clientsRes, agentsRes] = await Promise.all([
        fetch('/api/requests'),
        fetch('/api/quotes'),
        fetch('/api/clients'),
        fetch('/api/agents'),
      ]);

      const requestsData = await requestsRes.json();
      const quotesData = await quotesRes.json();
      const clientsData = await clientsRes.json();
      const agentsData = await agentsRes.json();

      const requests: Request[] = requestsData.requests || [];
      const quotes: Quote[] = quotesData.quotes || [];
      const clients: ClientProfile[] = clientsData.clients || [];
      const agents: AgentExecution[] = agentsData.executions || [];

      // Apply time range filter
      const cutoffDate = new Date();
      if (timeRange === '7d') cutoffDate.setDate(cutoffDate.getDate() - 7);
      else if (timeRange === '30d') cutoffDate.setDate(cutoffDate.getDate() - 30);
      else if (timeRange === '90d') cutoffDate.setDate(cutoffDate.getDate() - 90);

      const filteredRequests = timeRange === 'all'
        ? requests
        : requests.filter(r => new Date(r.created_at) >= cutoffDate);

      // Calculate metrics
      const completedRequests = filteredRequests.filter(r => r.status === 'completed');
      const pendingRequests = filteredRequests.filter(r =>
        ['pending', 'analyzing', 'searching_flights', 'awaiting_quotes'].includes(r.status)
      );
      const failedRequests = filteredRequests.filter(r => r.status === 'failed');

      const acceptedQuotes = quotes.filter(q => q.status === 'accepted');
      const totalRevenue = acceptedQuotes.reduce((sum, q) => sum + q.price, 0);
      const avgDealSize = acceptedQuotes.length > 0 ? totalRevenue / acceptedQuotes.length : 0;
      const conversionRate = filteredRequests.length > 0
        ? (completedRequests.length / filteredRequests.length) * 100
        : 0;

      // Active clients (those with requests in time range)
      const activeClientIds = new Set(filteredRequests.map(r => r.client_profile_id));
      const activeClients = clients.filter(c => activeClientIds.has(c.id));

      // Request counts by status
      const requestsByStatus = filteredRequests.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Top routes
      const routeCounts = filteredRequests.reduce((acc, r) => {
        const route = `${r.departure_airport} → ${r.arrival_airport}`;
        acc[route] = (acc[route] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const topRoutes = Object.entries(routeCounts)
        .map(([route, count]) => ({ route, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Agent performance
      const agentPerformance = agents.reduce((acc, a) => {
        if (!acc[a.agent_type]) {
          acc[a.agent_type] = { total: 0, avgDuration: 0, totalDuration: 0 };
        }
        acc[a.agent_type].total += 1;
        if (a.duration_ms) {
          acc[a.agent_type].totalDuration += a.duration_ms;
        }
        return acc;
      }, {} as Record<string, { total: number; avgDuration: number; totalDuration: number }>);

      // Calculate averages
      Object.keys(agentPerformance).forEach(key => {
        const perf = agentPerformance[key];
        perf.avgDuration = perf.total > 0 ? perf.totalDuration / perf.total : 0;
      });

      // Monthly trend (last 6 months)
      const monthlyTrend: Array<{ month: string; requests: number; completed: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        const monthRequests = requests.filter(r => {
          const rDate = new Date(r.created_at);
          return rDate.getMonth() === date.getMonth() && rDate.getFullYear() === date.getFullYear();
        });

        monthlyTrend.push({
          month: monthKey,
          requests: monthRequests.length,
          completed: monthRequests.filter(r => r.status === 'completed').length,
        });
      }

      // Calculate avg response time
      const completedAgents = agents.filter(a => a.status === 'completed' && a.duration_ms);
      const avgResponseTime = completedAgents.length > 0
        ? completedAgents.reduce((sum, a) => sum + (a.duration_ms || 0), 0) / completedAgents.length
        : 0;

      const summary: AnalyticsSummary = {
        totalRequests: filteredRequests.length,
        completedRequests: completedRequests.length,
        pendingRequests: pendingRequests.length,
        failedRequests: failedRequests.length,
        totalQuotes: quotes.length,
        acceptedQuotes: acceptedQuotes.length,
        avgQuotesPerRequest: filteredRequests.length > 0 ? quotes.length / filteredRequests.length : 0,
        totalRevenue,
        avgDealSize,
        conversionRate,
        totalClients: clients.length,
        activeClients: activeClients.length,
        avgRequestsPerClient: clients.length > 0 ? filteredRequests.length / clients.length : 0,
        avgResponseTime,
        agentPerformance,
        requestsByStatus,
        topRoutes,
        monthlyTrend,
      };

      setAnalytics(summary);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const handleExport = () => {
    if (!analytics) return;

    const dataStr = JSON.stringify(analytics, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Performance metrics and insights</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Time Range Selector */}
            <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg p-1">
              {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className={timeRange === range ? 'bg-blue-600 text-white' : ''}
                >
                  {range === 'all' ? 'All Time' : range.toUpperCase()}
                </Button>
              ))}
            </div>
            <Button onClick={fetchAnalytics} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalRequests}</div>
              <div className="flex items-center text-xs text-gray-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                {analytics.completedRequests} completed
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-gray-600 mt-1">
                {analytics.acceptedQuotes} accepted quotes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.conversionRate.toFixed(1)}%</div>
              <p className="text-xs text-gray-600 mt-1">
                Requests to completion
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <Users className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.activeClients}</div>
              <p className="text-xs text-gray-600 mt-1">
                of {analytics.totalClients} total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.avgDealSize.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Quotes/Request</CardTitle>
              <BarChart3 className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.avgQuotesPerRequest.toFixed(1)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(analytics.avgResponseTime)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Request Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Request Status Distribution</CardTitle>
            <CardDescription>Breakdown of requests by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(analytics.requestsByStatus).map(([status, count]) => (
                <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-600 mt-1 capitalize">
                    {status.replace(/_/g, ' ')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trend</CardTitle>
            <CardDescription>Request volume over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.monthlyTrend.map((month) => (
                <div key={month.month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">{month.month}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-600">{month.requests} requests</span>
                      <span className="text-green-600">{month.completed} completed</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${month.requests > 0 ? (month.completed / month.requests) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Routes */}
        <Card>
          <CardHeader>
            <CardTitle>Top Routes</CardTitle>
            <CardDescription>Most frequently requested flight routes</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topRoutes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No route data available</p>
            ) : (
              <div className="space-y-3">
                {analytics.topRoutes.map((route, index) => (
                  <div key={route.route} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <span className="font-medium text-gray-900">{route.route}</span>
                    </div>
                    <Badge variant="outline">{route.count} requests</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
            <CardDescription>Execution metrics for each AI agent</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(analytics.agentPerformance).length === 0 ? (
              <p className="text-gray-500 text-center py-8">No agent execution data available</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(analytics.agentPerformance).map(([agentType, perf]) => (
                  <div key={agentType} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900 capitalize">
                          {agentType.replace(/_/g, ' ')} Agent
                        </p>
                        <p className="text-sm text-gray-600">
                          {perf.total} executions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatDuration(perf.avgDuration)}
                      </p>
                      <p className="text-xs text-gray-600">avg duration</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
