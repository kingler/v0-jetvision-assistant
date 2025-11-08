'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useUserRole } from '@/lib/hooks/use-user-role';
import { toast } from 'sonner';
import { UserRole } from '@/lib/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, Save, User as UserIcon } from 'lucide-react';

interface UserProfile {
  id: string;
  clerk_id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  timezone?: string;
  avatar_url?: string;
  status: string;
  commission_rate?: number;
  preferences?: {
    email_notifications: boolean;
    sms_notifications: boolean;
  };
}

// Common timezones
const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { role, loading: roleLoading, isSalesRep, isCustomer } = useUserRole();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    timezone: '',
    email_notifications: true,
    sms_notifications: false,
  });

  // Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      if (!isLoaded || !user) return;

      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
          setFormData({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            timezone: data.timezone || 'America/New_York',
            email_notifications: data.preferences?.email_notifications ?? true,
            sms_notifications: data.preferences?.sms_notifications ?? false,
          });
        } else {
          toast.error('Failed to load profile');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user, isLoaded]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData: any = {
        phone: formData.phone,
        timezone: formData.timezone,
      };

      // Add preferences for customers
      if (isCustomer) {
        updateData.preferences = {
          email_notifications: formData.email_notifications,
          sms_notifications: formData.sms_notifications,
        };
      }

      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/users/me/avatar', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(prev => prev ? { ...prev, avatar_url: data.avatar_url } : null);
        toast.success('Avatar updated successfully');
      } else {
        toast.error('Failed to upload avatar');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  // Loading state
  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loading-spinner" />
      </div>
    );
  }

  // Role badge component
  const getRoleBadge = (userRole: UserRole) => {
    const roleLabels: Record<string, string> = {
      'admin': 'Admin',
      'sales_rep': 'Sales Representative',
      'customer': 'Customer',
      'operator': 'Operator',
      'iso_agent': 'ISO Agent',
    };

    return (
      <Badge variant="outline" className="ml-2">
        {roleLabels[userRole] || userRole}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

      <div className="space-y-6">
        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>
              Update your profile picture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.avatar_url} alt={profile?.name} />
                <AvatarFallback>
                  <UserIcon className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Change Avatar
                    </Button>
                  </div>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    aria-label="Change avatar"
                  />
                </Label>
                <p className="text-sm text-muted-foreground mt-2">
                  JPG, PNG, GIF or WebP. Max 5MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex items-center h-10">
                    <span className="text-sm">{role && getRoleBadge(role)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center h-10">
                    <Badge variant={profile?.status === 'active' ? 'default' : 'secondary'}>
                      {profile?.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Sales Rep Commission Settings */}
              {isSalesRep && profile?.commission_rate !== undefined && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Commission Settings</h3>
                  <div className="space-y-2">
                    <Label>Commission Rate</Label>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold">
                        {(profile.commission_rate * 100).toFixed(0)}%
                      </span>
                      <span className="text-sm text-muted-foreground">
                        (Contact admin to modify)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Preferences */}
              {isCustomer && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="email-notifications"
                        checked={formData.email_notifications}
                        onCheckedChange={(checked: boolean) =>
                          setFormData({ ...formData, email_notifications: checked })
                        }
                      />
                      <Label htmlFor="email-notifications" className="cursor-pointer">
                        Email Notifications
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sms-notifications"
                        checked={formData.sms_notifications}
                        onCheckedChange={(checked: boolean) =>
                          setFormData({ ...formData, sms_notifications: checked })
                        }
                      />
                      <Label htmlFor="sms-notifications" className="cursor-pointer">
                        SMS Notifications
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}