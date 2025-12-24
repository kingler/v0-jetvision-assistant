# Task: User Profile Management UI Implementation
# Option C - Role-Based Profile Interfaces

**Task ID**: TASK-047
**Created**: 2025-10-26
**Assigned To**: Development Team
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 14 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Build comprehensive user profile management UI pages including a user-facing profile settings page and an admin-only user management dashboard, with role-specific features and interfaces.

### User Story
**As a** user (sales rep, customer, or admin)
**I want** to view and edit my profile settings appropriate to my role
**So that** I can manage my account information and preferences

**As an** administrator
**I want** a user management dashboard
**So that** I can manage all users, assign roles, and monitor user activity

### Business Value
Provides self-service user profile management and administrative controls for user management, reducing support burden and enabling proper user lifecycle management for a multi-tenant system.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: User profile settings page SHALL allow self-service updates
- View and edit personal information (name, email, phone)
- Update timezone and preferences
- Upload/change avatar
- View role and account creation date
- Role-specific settings sections

**FR-2**: Admin user management page SHALL provide full user control
- List all users with filtering (by role, status, search)
- View detailed user information
- Update user roles and status (active/inactive)
- Assign sales rep settings (margin type/value)
- Delete or deactivate users

**FR-3**: Role-specific profile sections SHALL display appropriate fields
- **Sales reps**: Commission settings, territory, client count
- **Customers**: Flight history, preferences, self-service options
- **Admins**: System access, audit logs, user statistics

**FR-4**: UI SHALL use role-based rendering
- Conditional display based on `useUserRole()` hook
- Different navigation for different roles
- Access control on UI level (backed by API RBAC)

### Acceptance Criteria

- [ ] **AC-1**: `/app/settings/profile/page.tsx` created and functional
- [ ] **AC-2**: `/app/admin/users/page.tsx` created (admin-only access)
- [ ] **AC-3**: User can view and update their profile settings
- [ ] **AC-4**: Avatar upload working
- [ ] **AC-5**: Timezone selector functional
- [ ] **AC-6**: Role-specific sections rendering correctly
- [ ] **AC-7**: Admin can list, filter, and search all users
- [ ] **AC-8**: Admin can update user roles and status
- [ ] **AC-9**: Unauthorized access redirects appropriately
- [ ] **AC-10**: Responsive design (mobile, tablet, desktop)
- [ ] **AC-11**: Accessibility compliance (WCAG AA)
- [ ] **AC-12**: Loading states and error handling
- [ ] **AC-13**: Success/error toast notifications
- [ ] **AC-14**: Code review approved

### Non-Functional Requirements

- **Performance**: Page load < 2s, interactions < 300ms
- **Accessibility**: WCAG 2.1 AA compliance
- **Responsiveness**: Mobile-first, works on all screen sizes
- **UX**: Intuitive, follows existing design system (shadcn/ui)

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/components/profile-settings.test.tsx
__tests__/unit/components/admin-user-management.test.tsx
__tests__/integration/pages/settings-profile.test.ts
__tests__/e2e/auth/profile-management.spec.ts
```

**Example Test**:
```typescript
// __tests__/unit/components/profile-settings.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import user event from '@testing-library/userEvent'
import { describe, it, expect, vi } from 'vitest'
import ProfileSettingsPage from '@/app/settings/profile/page'

describe('ProfileSettingsPage', () => {
  it('should display user profile information', async () => {
    render(<ProfileSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Profile Settings')).toBeInTheDocument()
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })
  })

  it('should allow updating phone number', async () => {
    const user = userEvent.setup()
    render(<ProfileSettingsPage />)

    const phoneInput = await screen.findByLabelText('Phone Number')
    await user.clear(phoneInput)
    await user.type(phoneInput, '+1234567890')

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument()
    })
  })

  it('should display role-specific sections for sales reps', async () => {
    // Mock useUserRole to return sales_rep
    vi.mocked(useUserRole).mockReturnValue({
      role: 'sales_rep',
      isSalesRep: true,
      loading: false,
    })

    render(<ProfileSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Sales Representative Settings')).toBeInTheDocument()
      expect(screen.getByText('Margin Type')).toBeInTheDocument()
    })
  })
})
```

**Run Tests** (they should FAIL):
```bash
npm test -- profile-settings.test.tsx
# Expected: Tests fail because pages don't exist yet
```

### Step 2: Implement Minimal Code (Green Phase)

Create profile pages to make tests pass.

### Step 3: Refactor (Blue Phase)

- Extract reusable components
- Improve form validation
- Optimize re-renders

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] TASK-046 (RBAC Middleware) complete
- [ ] `/api/users/me` endpoint functional
- [ ] `useUserRole()` hook available
- [ ] shadcn/ui components installed

### Step-by-Step Implementation

**Step 1**: Create User Profile Settings Page

File: `app/settings/profile/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useUserRole } from '@/lib/hooks/use-user-role';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User2, Mail, Phone, Clock, Settings, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  timezone: string;
  avatar_url: string | null;
  preferences: Record<string, any>;
  created_at: string;
}

export default function ProfileSettingsPage() {
  const { user: clerkUser } = useUser();
  const { role, loading: roleLoading, isSalesRep, isAdmin, isCustomer } = useUserRole();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setPhone(data.phone || '');
        setTimezone(data.timezone || 'UTC');
      } else {
        toast.error('Failed to load profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updates: any = { phone, timezone };

      // Handle avatar upload if file selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);

        const uploadResponse = await fetch('/api/users/me/avatar', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const { avatar_url } = await uploadResponse.json();
          updates.avatar_url = avatar_url;
        }
      }

      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast.success('Profile updated successfully');
        fetchProfile();
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  }

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account information and preferences
        </p>
      </div>

      <Separator />

      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Update your avatar</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile?.avatar_url || clerkUser?.imageUrl} />
            <AvatarFallback>
              {profile?.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <Label htmlFor="avatar-upload" className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </span>
              </Button>
            </Label>
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            {avatarFile && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: {avatarFile.name}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User2 className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Your basic account information from Clerk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <div className="mt-1 text-sm text-muted-foreground">
                {profile?.full_name || 'Not set'}
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <div className="mt-1 text-sm text-muted-foreground">
                {profile?.email}
              </div>
            </div>
          </div>

          <div>
            <Label>Role</Label>
            <div className="mt-1">
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                {role?.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact & Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Contact & Preferences
          </CardTitle>
          <CardDescription>
            Update your contact information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="timezone" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timezone
            </Label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setPhone(profile?.phone || '');
                setTimezone(profile?.timezone || 'UTC');
                setAvatarFile(null);
              }}
            >
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Role-Specific Sections */}
      {isSalesRep && (
        <Card>
          <CardHeader>
            <CardTitle>Sales Representative Settings</CardTitle>
            <CardDescription>
              Manage your commission settings and client preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Margin Type</Label>
                <div className="mt-1 text-sm text-muted-foreground">
                  {profile?.preferences?.margin_type || 'Not set'}
                </div>
              </div>
              <div>
                <Label>Margin Value</Label>
                <div className="mt-1 text-sm text-muted-foreground">
                  {profile?.preferences?.margin_value || 'Not set'}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Contact an administrator to update your commission settings.
            </p>
          </CardContent>
        </Card>
      )}

      {isCustomer && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Preferences</CardTitle>
            <CardDescription>
              Manage your flight preferences and booking history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View your flight history and manage preferences in the Dashboard.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Member since {new Date(profile?.created_at || '').toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2**: Create Admin User Management Page

File: `app/admin/users/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useUserRole } from '@/lib/hooks/use-user-role';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Search, Filter, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export default function AdminUsersPage() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Redirect if not admin
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      redirect('/');
    }
  }, [isAdmin, roleLoading]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, roleFilter]);

  async function fetchUsers() {
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') {
        params.append('role', roleFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function toggleUserStatus(userId: string, currentStatus: boolean) {
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          is_active: !currentStatus,
        }),
      });

      if (response.ok) {
        toast.success('User status updated');
        fetchUsers();
      } else {
        toast.error('Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('An error occurred');
    }
  }

  if (roleLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          User Management
        </h1>
        <p className="text-muted-foreground">
          Manage all users and their roles
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Roles</option>
              <option value="sales_rep">Sales Reps</option>
              <option value="admin">Admins</option>
              <option value="customer">Customers</option>
              <option value="operator">Operators</option>
            </select>
            <Button onClick={fetchUsers}>Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{user.full_name}</div>
                      {user.is_active ? (
                        <UserCheck className="h-4 w-4 text-green-600" />
                      ) : (
                        <UserX className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Member since {new Date(user.created_at).toLocaleDateString()}
                      {user.last_login_at && ` • Last login: ${new Date(user.last_login_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {user.role.replace('_', ' ').toUpperCase()}
                    </span>
                    <Button
                      variant={user.is_active ? 'outline' : 'destructive'}
                      size="sm"
                      onClick={() => toggleUserStatus(user.id, user.is_active)}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3**: Create Avatar Upload Endpoint

File: `app/api/users/me/avatar/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // TODO: Upload to storage (S3, Supabase Storage, etc.)
    // For now, return a placeholder URL
    const avatar_url = `/avatars/${userId}-${Date.now()}.${file.name.split('.').pop()}`;

    // Update user record
    const { error } = await supabase
      .from('users')
      .update({ avatar_url })
      .eq('clerk_user_id', userId);

    if (error) {
      return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 });
    }

    return NextResponse.json({ avatar_url });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 4**: Update Navigation (Add Settings Link)

File: `components/navigation.tsx` (or wherever navigation is)

```typescript
import { useUserRole } from '@/lib/hooks/use-user-role';

export function Navigation() {
  const { isAdmin } = useUserRole();

  return (
    <nav>
      {/* ... other nav items */}
      <Link href="/settings/profile">Profile Settings</Link>
      {isAdmin && <Link href="/admin/users">User Management</Link>}
    </nav>
  );
}
```

**Step 5**: Validation

```bash
# Type check
npx tsc --noEmit

# Run tests
npm test -- profile

# Test locally
npm run dev
# Navigate to /settings/profile and /admin/users

# Build
npm run build
```

---

## 5. GIT WORKFLOW

### Branch Creation

```bash
git checkout main
git pull origin main
git checkout -b feat/user-profile-ui-implementation
```

### Commit Strategy

```bash
# Commit 1: Profile settings page
git add app/settings/profile/page.tsx
git commit -m "feat(ui): add user profile settings page with role-specific sections"

# Commit 2: Admin user management
git add app/admin/users/page.tsx
git commit -m "feat(ui): add admin user management dashboard"

# Commit 3: Avatar upload
git add app/api/users/me/avatar/route.ts
git commit -m "feat(api): add avatar upload endpoint"

# Commit 4: Navigation updates
git add components/navigation.tsx
git commit -m "feat(ui): add profile and admin links to navigation"

# Commit 5: Tests
git add __tests__
git commit -m "test(ui): add comprehensive tests for profile pages"
```

---

## 6. CODE REVIEW CHECKLIST

### Reviewer Checklist

**UI/UX**:
- [ ] Design matches existing system (shadcn/ui)
- [ ] Responsive on mobile, tablet, desktop
- [ ] Loading states implemented
- [ ] Error states handled gracefully
- [ ] Success/error notifications working

**Accessibility**:
- [ ] Keyboard navigation working
- [ ] Screen reader compatible
- [ ] ARIA labels present
- [ ] Focus management correct
- [ ] Color contrast WCAG AA

**Security**:
- [ ] Admin pages protected (redirect if not admin)
- [ ] Form validation on client and server
- [ ] No sensitive data leaked in UI
- [ ] File uploads validated

**Functionality**:
- [ ] Profile updates working
- [ ] Role-specific sections rendering
- [ ] Admin user management functional
- [ ] Avatar upload working

---

## 7. TESTING REQUIREMENTS

### Unit Tests

Test individual components:
- Profile form validation
- Role-specific section rendering
- Avatar upload handling
- User status toggle

### Integration Tests

Test full page flows:
- Load profile page → Display data → Update → Save
- Admin load users → Filter → Update status

### E2E Tests (Playwright)

```typescript
// __tests__/e2e/profile-management.spec.ts
test('user can update their profile', async ({ page }) => {
  await page.goto('/settings/profile');

  await page.fill('input[name="phone"]', '+1234567890');
  await page.selectOption('select[name="timezone"]', 'America/New_York');

  await page.click('button:has-text("Save Changes")');

  await expect(page.locator('text=Profile updated successfully')).toBeVisible();
});

test('admin can manage users', async ({ page }) => {
  await page.goto('/admin/users');

  await page.fill('input[placeholder*="Search"]', 'test@example.com');
  await page.click('button:has-text("Search")');

  await expect(page.locator('text=test@example.com')).toBeVisible();
});
```

---

## 8. DEFINITION OF DONE

### Code Complete
- [ ] Profile settings page functional
- [ ] Admin user management functional
- [ ] Avatar upload working
- [ ] Navigation updated
- [ ] No TypeScript errors
- [ ] Responsive design

### Testing Complete
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Manual testing complete
- [ ] Accessibility tested

### Documentation Complete
- [ ] Component documentation
- [ ] User guide updated

### Code Review Complete
- [ ] PR reviewed and approved
- [ ] Design review passed

---

## 9. RESOURCES & REFERENCES

### Documentation
- [shadcn/ui Components](https://ui.shadcn.com)
- [Lucide React Icons](https://lucide.dev)
- [React Hook Form](https://react-hook-form.com)
- [Zod Validation](https://zod.dev)

### Related Tasks
- TASK-046: RBAC Middleware (prerequisite)

---

## 10. NOTES & QUESTIONS

### Assumptions
- shadcn/ui components available
- Sonner toast library installed
- Avatar storage solution (placeholder for now)

### Future Enhancements
- Real avatar upload to S3/Supabase Storage
- Profile picture cropping tool
- Advanced user filters (date range, activity)
- Bulk user operations

---

## 11. COMPLETION SUMMARY

[Fill out after completion]

---

**Task Status**: ⏳ PENDING
**Depends On**: TASK-046
**Blocks**: None
