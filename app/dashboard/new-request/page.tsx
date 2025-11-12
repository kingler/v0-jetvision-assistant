'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';

interface ClientProfile {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
}

export default function NewRequestPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [formData, setFormData] = useState({
    client_profile_id: '',
    departure_airport: '',
    arrival_airport: '',
    departure_date: '',
    return_date: '',
    passengers: '1',
    aircraft_type: '',
    budget: '',
    special_requirements: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json() as { clients?: ClientProfile[] };
      setClients(data.clients || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          passengers: parseInt(formData.passengers),
          budget: formData.budget ? parseFloat(formData.budget) : null,
          client_profile_id: formData.client_profile_id || null,
          return_date: formData.return_date || null,
          aircraft_type: formData.aircraft_type || null,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create request');
      }

      const data = await res.json() as { request: { id: string } };
      router.push(`/dashboard/requests/${data.request.id}`);
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Failed to create request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
              <h1 className="text-2xl font-bold text-gray-900">New RFP Request</h1>
              <p className="text-sm text-gray-600">Create a new flight request</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-3xl">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Flight Details</CardTitle>
              <CardDescription>
                Provide the flight requirements to start the RFP process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Selection */}
              <div className="space-y-2">
                <Label htmlFor="client">Client (Optional)</Label>
                <Select
                  value={formData.client_profile_id || undefined}
                  onValueChange={(value) => handleChange('client_profile_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client or leave blank" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name} - {client.contact_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Departure Airport */}
              <div className="space-y-2">
                <Label htmlFor="departure_airport">Departure Airport *</Label>
                <Input
                  id="departure_airport"
                  placeholder="e.g., KTEB (Teterboro)"
                  value={formData.departure_airport}
                  onChange={(e) => handleChange('departure_airport', e.target.value)}
                  required
                />
              </div>

              {/* Arrival Airport */}
              <div className="space-y-2">
                <Label htmlFor="arrival_airport">Arrival Airport *</Label>
                <Input
                  id="arrival_airport"
                  placeholder="e.g., KMIA (Miami)"
                  value={formData.arrival_airport}
                  onChange={(e) => handleChange('arrival_airport', e.target.value)}
                  required
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="departure_date">Departure Date *</Label>
                  <Input
                    id="departure_date"
                    type="date"
                    value={formData.departure_date}
                    onChange={(e) => handleChange('departure_date', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="return_date">Return Date (Optional)</Label>
                  <Input
                    id="return_date"
                    type="date"
                    value={formData.return_date}
                    onChange={(e) => handleChange('return_date', e.target.value)}
                  />
                </div>
              </div>

              {/* Passengers */}
              <div className="space-y-2">
                <Label htmlFor="passengers">Number of Passengers *</Label>
                <Input
                  id="passengers"
                  type="number"
                  min="1"
                  max="19"
                  value={formData.passengers}
                  onChange={(e) => handleChange('passengers', e.target.value)}
                  required
                />
              </div>

              {/* Aircraft Type */}
              <div className="space-y-2">
                <Label htmlFor="aircraft_type">Preferred Aircraft Type (Optional)</Label>
                <Select
                  value={formData.aircraft_type || undefined}
                  onValueChange={(value) => handleChange('aircraft_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any aircraft type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light_jet">Light Jet</SelectItem>
                    <SelectItem value="midsize_jet">Midsize Jet</SelectItem>
                    <SelectItem value="super_midsize">Super Midsize</SelectItem>
                    <SelectItem value="heavy_jet">Heavy Jet</SelectItem>
                    <SelectItem value="ultra_long_range">Ultra Long Range</SelectItem>
                    <SelectItem value="turboprop">Turboprop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (USD, Optional)</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="e.g., 50000"
                  value={formData.budget}
                  onChange={(e) => handleChange('budget', e.target.value)}
                />
              </div>

              {/* Special Requirements */}
              <div className="space-y-2">
                <Label htmlFor="special_requirements">Special Requirements (Optional)</Label>
                <Textarea
                  id="special_requirements"
                  placeholder="Any special requests or requirements..."
                  rows={4}
                  value={formData.special_requirements}
                  onChange={(e) => handleChange('special_requirements', e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Creating Request...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Create RFP Request
                    </>
                  )}
                </Button>
                <Link href="/dashboard">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
}
