# User Management System Migration Plan

**Project**: JetVision AI Assistant
**Task**: Migrate from `iso_agents` to `users` table with multi-role support
**Author**: Claude Code
**Date**: October 25, 2025
**Status**: Planning Phase

---

## Executive Summary

This document outlines a comprehensive plan to migrate the JetVision AI Assistant application from a single-role ISO agent system to a flexible multi-role user management system. The migration involves:

1. **Database restructuring** - Rename `iso_agents` → `users` table
2. **Role expansion** - Support for `sales_rep`, `admin`, and `customer` roles
3. **Code refactoring** - Update all references throughout the codebase
4. **UI development** - Build role-specific profile management interfaces
5. **Testing** - Comprehensive test coverage for all changes

---

## Current State Analysis

### Existing Database Schema

**Table**: `iso_agents`
```sql
CREATE TABLE iso_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'iso_agent',
  margin_type margin_type DEFAULT 'percentage',
  margin_value DECIMAL(10, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Current Enum**: `user_role`
- `iso_agent` - Current default role for sales representatives
- `admin` - Administrative users
- `operator` - System operators

### Existing Infrastructure

✅ **Already Implemented:**
- Clerk authentication integration
- Webhook sync from Clerk to Supabase (`app/api/webhooks/clerk/route.ts`)
- Row Level Security (RLS) policies
- Automated `updated_at` triggers
- Comprehensive test suite for webhooks (7/7 tests passing)

### Dependencies

**Tables referencing `iso_agents`:**
- `client_profiles` - FK: `iso_agent_id`
- `requests` - FK: `iso_agent_id`
- RLS helper functions: `get_current_iso_agent_id()`, `owns_resource()`

**Files with direct references** (29 files):
- API routes: `/api/agents`, `/api/clients`, `/api/requests`, `/api/quotes`, `/api/workflows`
- Types: `lib/types/database.ts`
- Tests: All API route tests
- Migrations: `001_initial_schema.sql`, `002_rls_policies.sql`, `003_seed_data.sql`

---

## Migration Strategy

### Phase 1: Database Schema Migration

#### 1.1 Create New User Role Enum

**Migration**: `004_update_user_roles.sql`

```sql
-- Add new role values to existing enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_rep';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'customer';

-- Note: PostgreSQL doesn't support removing enum values
-- We'll keep 'iso_agent' and 'operator' for backward compatibility
-- and handle the migration in application logic
```

**Alternative Approach** (Recommended):
```sql
-- Create new enum with desired values
CREATE TYPE user_role_new AS ENUM (
  'sales_rep',
  'admin',
  'customer',
  'operator'  -- Keep for compatibility
);

-- Migration will be handled in the main migration script
```

#### 1.2 Rename Table and Update Schema

**Migration**: `005_rename_iso_agents_to_users.sql`

```sql
-- Step 1: Rename the table
ALTER TABLE iso_agents RENAME TO users;

-- Step 2: Rename indexes
ALTER INDEX idx_iso_agents_clerk_user_id RENAME TO idx_users_clerk_user_id;
ALTER INDEX idx_iso_agents_email RENAME TO idx_users_email;
ALTER INDEX idx_iso_agents_role RENAME TO idx_users_role;

-- Step 3: Update table comment
COMMENT ON TABLE users IS 'User profiles for sales reps, admins, and customers, synced from Clerk';

-- Step 4: Add new columns for enhanced user profiles
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Step 5: Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at DESC);

-- Step 6: Migrate existing roles
UPDATE users
SET role = 'sales_rep'
WHERE role = 'iso_agent';

-- Step 7: Update trigger name
DROP TRIGGER IF EXISTS update_iso_agents_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 1.3 Update Foreign Key Constraints

**Migration**: `006_update_foreign_keys.sql`

```sql
-- Update client_profiles table
ALTER TABLE client_profiles
  RENAME COLUMN iso_agent_id TO user_id;

ALTER INDEX idx_client_profiles_iso_agent_id
  RENAME TO idx_client_profiles_user_id;

COMMENT ON COLUMN client_profiles.user_id IS 'Reference to the user (sales rep) who manages this client';

-- Update requests table
ALTER TABLE requests
  RENAME COLUMN iso_agent_id TO user_id;

ALTER INDEX idx_requests_iso_agent_id
  RENAME TO idx_requests_user_id;

COMMENT ON COLUMN requests.user_id IS 'Reference to the user (sales rep) who created this request';
```

#### 1.4 Update RLS Functions and Policies

**Migration**: `007_update_rls_for_users.sql`

```sql
-- Drop old functions
DROP FUNCTION IF EXISTS get_current_iso_agent_id();
DROP FUNCTION IF EXISTS owns_resource(UUID);

-- Create new functions
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id
    FROM users
    WHERE clerk_user_id = auth.jwt()->>'sub'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION owns_resource(resource_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN resource_user_id = get_current_user_id() OR is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update is_admin function to use new table name
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM users
    WHERE clerk_user_id = auth.jwt()->>'sub'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create role-checking helper functions
CREATE OR REPLACE FUNCTION is_sales_rep()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'sales_rep'
    FROM users
    WHERE clerk_user_id = auth.jwt()->>'sub'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_customer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'customer'
    FROM users
    WHERE clerk_user_id = auth.jwt()->>'sub'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role
    FROM users
    WHERE clerk_user_id = auth.jwt()->>'sub'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON users;
DROP POLICY IF EXISTS "Only service role can insert users" ON users;
DROP POLICY IF EXISTS "Users can update own profile or admin can update any" ON users;
DROP POLICY IF EXISTS "Only admins can delete users" ON users;

-- Create new policies for users table
CREATE POLICY "Users can view own profile or admin can view all"
  ON users
  FOR SELECT
  USING (
    clerk_user_id = auth.jwt()->>'sub'
    OR is_admin()
  );

CREATE POLICY "Only service role can insert users"
  ON users
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Users can update own profile or admin can update any"
  ON users
  FOR UPDATE
  USING (
    clerk_user_id = auth.jwt()->>'sub'
    OR is_admin()
  )
  WITH CHECK (
    clerk_user_id = auth.jwt()->>'sub'
    OR is_admin()
  );

CREATE POLICY "Only admins can delete users"
  ON users
  FOR DELETE
  USING (is_admin());

-- Update client_profiles policies
DROP POLICY IF EXISTS "Users can view own client profiles" ON client_profiles;
CREATE POLICY "Users can view own client profiles"
  ON client_profiles
  FOR SELECT
  USING (owns_resource(user_id));

DROP POLICY IF EXISTS "Users can create own client profiles" ON client_profiles;
CREATE POLICY "Users can create own client profiles"
  ON client_profiles
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can update own client profiles" ON client_profiles;
CREATE POLICY "Users can update own client profiles"
  ON client_profiles
  FOR UPDATE
  USING (owns_resource(user_id))
  WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can delete own client profiles" ON client_profiles;
CREATE POLICY "Users can delete own client profiles"
  ON client_profiles
  FOR DELETE
  USING (owns_resource(user_id));

-- Update requests policies
DROP POLICY IF EXISTS "Users can view own requests" ON requests;
CREATE POLICY "Users can view own requests"
  ON requests
  FOR SELECT
  USING (owns_resource(user_id));

DROP POLICY IF EXISTS "Users can create own requests" ON requests;
CREATE POLICY "Users can create own requests"
  ON requests
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can update own requests" ON requests;
CREATE POLICY "Users can update own requests"
  ON requests
  FOR UPDATE
  USING (owns_resource(user_id))
  WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can delete own requests" ON requests;
CREATE POLICY "Users can delete own requests"
  ON requests
  FOR DELETE
  USING (owns_resource(user_id));

-- Update quotes policies
DROP POLICY IF EXISTS "Users can view quotes for own requests" ON quotes;
CREATE POLICY "Users can view quotes for own requests"
  ON quotes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = quotes.request_id
      AND owns_resource(requests.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can update quotes for own requests" ON quotes;
CREATE POLICY "Users can update quotes for own requests"
  ON quotes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = quotes.request_id
      AND owns_resource(requests.user_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = quotes.request_id
      AND owns_resource(requests.user_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete quotes for own requests" ON quotes;
CREATE POLICY "Users can delete quotes for own requests"
  ON quotes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = quotes.request_id
      AND owns_resource(requests.user_id)
    )
  );

-- Update workflow_states policies (reference to user_id in requests)
DROP POLICY IF EXISTS "Users can view workflow states for own requests" ON workflow_states;
CREATE POLICY "Users can view workflow states for own requests"
  ON workflow_states
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = workflow_states.request_id
      AND owns_resource(requests.user_id)
    )
  );

-- Update agent_executions policies (reference to user_id in requests)
DROP POLICY IF EXISTS "Users can view execution logs for own requests" ON agent_executions;
CREATE POLICY "Users can view execution logs for own requests"
  ON agent_executions
  FOR SELECT
  USING (
    request_id IS NULL
    OR EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = agent_executions.request_id
      AND owns_resource(requests.user_id)
    )
  );

-- Add comments to new functions
COMMENT ON FUNCTION get_current_user_id() IS
  'Returns the user ID for the currently authenticated user';

COMMENT ON FUNCTION is_sales_rep() IS
  'Returns true if the current user has sales_rep role';

COMMENT ON FUNCTION is_customer() IS
  'Returns true if the current user has customer role';

COMMENT ON FUNCTION get_current_user_role() IS
  'Returns the role of the currently authenticated user';

COMMENT ON FUNCTION owns_resource(UUID) IS
  'Returns true if the current user owns the resource or is an admin';
```

#### 1.5 Rollback Migration

**Migration**: `008_rollback_to_iso_agents.sql`

```sql
-- This migration reverses all changes if needed
-- IMPORTANT: Only run if migration fails and you need to rollback

-- Step 1: Reverse role migration
UPDATE users
SET role = 'iso_agent'
WHERE role = 'sales_rep';

-- Step 2: Rename table back
ALTER TABLE users RENAME TO iso_agents;

-- Step 3: Rename indexes back
ALTER INDEX idx_users_clerk_user_id RENAME TO idx_iso_agents_clerk_user_id;
ALTER INDEX idx_users_email RENAME TO idx_iso_agents_email;
ALTER INDEX idx_users_role RENAME TO idx_iso_agents_role;

-- Step 4: Rename foreign keys back
ALTER TABLE client_profiles RENAME COLUMN user_id TO iso_agent_id;
ALTER TABLE requests RENAME COLUMN user_id TO iso_agent_id;

ALTER INDEX idx_client_profiles_user_id RENAME TO idx_client_profiles_iso_agent_id;
ALTER INDEX idx_requests_user_id RENAME TO idx_requests_iso_agent_id;

-- Step 5: Restore old RLS functions
DROP FUNCTION IF EXISTS get_current_user_id();
DROP FUNCTION IF EXISTS is_sales_rep();
DROP FUNCTION IF EXISTS is_customer();
DROP FUNCTION IF EXISTS get_current_user_role();

CREATE OR REPLACE FUNCTION get_current_iso_agent_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id
    FROM iso_agents
    WHERE clerk_user_id = auth.jwt()->>'sub'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION owns_resource(resource_agent_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN resource_agent_id = get_current_iso_agent_id() OR is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Recreate old policies (see 002_rls_policies.sql for full policy definitions)
-- ... (would need to restore all original policies)

-- Step 7: Remove new columns
ALTER TABLE iso_agents DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE iso_agents DROP COLUMN IF EXISTS phone;
ALTER TABLE iso_agents DROP COLUMN IF EXISTS timezone;
ALTER TABLE iso_agents DROP COLUMN IF EXISTS preferences;
ALTER TABLE iso_agents DROP COLUMN IF EXISTS last_login_at;
```

### Phase 2: Code Refactoring

#### 2.1 TypeScript Type Definitions

**File**: `lib/types/database.ts`

```typescript
// Update enum
export type UserRole =
  | 'sales_rep'
  | 'admin'
  | 'customer'
  | 'operator';  // Keep for backward compatibility

// Rename interface
export interface User {  // Previously: IsoAgent
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  margin_type: MarginType | null;
  margin_value: number | null;
  is_active: boolean;
  avatar_url: string | null;
  phone: string | null;
  timezone: string;
  preferences: Record<string, any>;
  metadata: Record<string, any>;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

// Update ClientProfile interface
export interface ClientProfile {
  id: string;
  user_id: string;  // Previously: iso_agent_id
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  preferences: Record<string, any>;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Update Request interface
export interface Request {
  id: string;
  user_id: string;  // Previously: iso_agent_id
  client_profile_id: string | null;
  // ... rest of fields
}

// Update Database schema type
export interface Database {
  public: {
    Tables: {
      users: {  // Previously: iso_agents
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      // ... other tables with updated references
    };
  };
}
```

#### 2.2 API Route Updates

**Pattern for all API routes** (`/api/agents`, `/api/clients`, `/api/requests`, etc.):

```typescript
// Before:
const { data: isoAgent } = await supabase
  .from('iso_agents')
  .select('id')
  .eq('clerk_user_id', userId)
  .single();

if (!isoAgent) {
  return NextResponse.json({ error: 'ISO agent not found' }, { status: 404 });
}

// ... later use isoAgent.id as iso_agent_id

// After:
const { data: user } = await supabase
  .from('users')
  .select('id, role')
  .eq('clerk_user_id', userId)
  .single();

if (!user) {
  return NextResponse.json({ error: 'User not found' }, { status: 404 });
}

// ... later use user.id as user_id
```

**Files to update**:
- `app/api/agents/route.ts`
- `app/api/clients/route.ts`
- `app/api/requests/route.ts`
- `app/api/quotes/route.ts`
- `app/api/workflows/route.ts`
- `app/api/analytics/route.ts`
- `app/api/email/route.ts`

#### 2.3 Webhook Update

**File**: `app/api/webhooks/clerk/route.ts`

```typescript
// Update to support role assignment based on Clerk metadata
case 'user.created': {
  const { id, email_addresses, first_name, last_name, public_metadata } = evt.data;

  // Extract role from Clerk public_metadata (default to 'customer')
  const role = (public_metadata?.role as UserRole) || 'customer';

  // Create user in Supabase users table
  const { data, error } = await supabase
    .from('users')  // Changed from 'iso_agents'
    .insert({
      clerk_user_id: id,
      email: email,
      full_name: `${first_name || ''} ${last_name || ''}`.trim() || email,
      role: role,
      is_active: true,
      timezone: public_metadata?.timezone || 'UTC',
      phone: public_metadata?.phone || null,
    })
    .select()
    .single();

  // ... rest of logic
}
```

#### 2.4 Test Updates

**Pattern for all test files**:

```typescript
// Before:
const mockIsoAgent = {
  id: 'agent-123',
  clerk_user_id: 'user_test123',
  email: 'test@example.com',
  // ...
};

// Mock Supabase response
vi.mocked(supabase.from).mockReturnValue({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: mockIsoAgent, error: null })
    })
  })
} as any);

// After:
const mockUser = {
  id: 'user-123',
  clerk_user_id: 'user_test123',
  email: 'test@example.com',
  role: 'sales_rep',
  // ...
};

// Mock Supabase response
vi.mocked(supabase.from).mockReturnValue({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
    })
  })
} as any);
```

**Files to update**:
- `__tests__/unit/api/agents/route.test.ts`
- `__tests__/unit/api/clients/route.test.ts`
- `__tests__/unit/api/requests/route.test.ts`
- `__tests__/unit/api/quotes/route.test.ts`
- `__tests__/unit/api/workflows/route.test.ts`
- `__tests__/unit/api/webhooks/clerk.test.ts`
- `__tests__/utils/mock-factories.ts`

### Phase 3: Role-Based Access Control (RBAC)

#### 3.1 RBAC Middleware

**File**: `lib/middleware/rbac.ts`

```typescript
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';
import { UserRole } from '@/lib/types/database';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Role permission matrix
 */
const PERMISSIONS = {
  sales_rep: {
    clients: ['create', 'read', 'update', 'delete'],
    requests: ['create', 'read', 'update', 'delete'],
    quotes: ['read', 'update'],
    users: ['read_own'],
    analytics: ['read_own'],
  },
  admin: {
    clients: ['create', 'read', 'update', 'delete'],
    requests: ['create', 'read', 'update', 'delete'],
    quotes: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    analytics: ['read_all'],
  },
  customer: {
    clients: [],
    requests: ['read_own'],
    quotes: ['read_own'],
    users: ['read_own', 'update_own'],
    analytics: [],
  },
  operator: {
    requests: ['read', 'update'],
    quotes: ['read', 'update'],
    users: ['read_own'],
    analytics: ['read_all'],
  },
} as const;

/**
 * Get user role from Clerk user ID
 */
export async function getUserRole(clerkUserId: string): Promise<UserRole | null> {
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('clerk_user_id', clerkUserId)
    .single();

  return user?.role || null;
}

/**
 * Check if user has permission for a resource and action
 */
export function hasPermission(
  role: UserRole,
  resource: keyof typeof PERMISSIONS.admin,
  action: string
): boolean {
  const rolePermissions = PERMISSIONS[role];
  if (!rolePermissions) return false;

  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action as any);
}

/**
 * RBAC middleware wrapper for API routes
 */
export function withRBAC(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    resource: keyof typeof PERMISSIONS.admin;
    action: string;
    requiredRoles?: UserRole[];
  }
) {
  return async (req: NextRequest) => {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const role = await getUserRole(userId);
    if (!role) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check role requirement
    if (options.requiredRoles && !options.requiredRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check permission
    if (!hasPermission(role, options.resource, options.action)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    // Attach user info to request
    (req as any).user = { userId, role };

    return handler(req);
  };
}

/**
 * Helper to require specific roles
 */
export function requireRoles(...roles: UserRole[]) {
  return async (req: NextRequest) => {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = await getUserRole(userId);
    if (!userRole || !roles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    return null; // Success
  };
}
```

**Usage Example**:

```typescript
// In an API route
import { withRBAC } from '@/lib/middleware/rbac';

async function handleGet(req: NextRequest) {
  // Implementation
}

export const GET = withRBAC(handleGet, {
  resource: 'clients',
  action: 'read',
});

// Or require specific roles
import { requireRoles } from '@/lib/middleware/rbac';

export async function DELETE(req: NextRequest) {
  const error = await requireRoles('admin')(req);
  if (error) return error;

  // Only admins reach here
}
```

#### 3.2 Role-Based UI Rendering

**File**: `lib/hooks/use-user-role.ts`

```typescript
'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { UserRole } from '@/lib/types/database';

export function useUserRole() {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!isLoaded || !user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user role from API
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const data = await response.json();
          setRole(data.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user, isLoaded]);

  const isSalesRep = role === 'sales_rep';
  const isAdmin = role === 'admin';
  const isCustomer = role === 'customer';
  const isOperator = role === 'operator';

  return {
    role,
    loading,
    isSalesRep,
    isAdmin,
    isCustomer,
    isOperator,
    hasRole: (requiredRole: UserRole) => role === requiredRole,
    hasAnyRole: (requiredRoles: UserRole[]) => role ? requiredRoles.includes(role) : false,
  };
}
```

### Phase 4: User Profile Management UI

#### 4.1 User Profile API Route

**File**: `app/api/users/me/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

/**
 * GET /api/users/me - Get current user profile
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Don't expose sensitive fields
    const { metadata, ...safeUser } = user;

    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/users/me - Update current user profile
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await req.json();

    // Fields users can update
    const allowedFields = [
      'phone',
      'timezone',
      'preferences',
      'avatar_url',
    ];

    // Filter updates to only allowed fields
    const safeUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(safeUpdates)
      .eq('clerk_user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**File**: `app/api/users/route.ts` (Admin only)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withRBAC } from '@/lib/middleware/rbac';
import { supabase } from '@/lib/supabase/client';

/**
 * GET /api/users - List all users (Admin only)
 */
async function handleGet(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');
  const search = searchParams.get('search');

  let query = supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (role) {
    query = query.eq('role', role);
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: users, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  return NextResponse.json({ users });
}

export const GET = withRBAC(handleGet, {
  resource: 'users',
  action: 'read',
  requiredRoles: ['admin'],
});

/**
 * PATCH /api/users - Update user (Admin only)
 */
async function handlePatch(req: NextRequest) {
  const { user_id, role, is_active, margin_type, margin_value } = await req.json();

  if (!user_id) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
  }

  const updates: any = {};
  if (role !== undefined) updates.role = role;
  if (is_active !== undefined) updates.is_active = is_active;
  if (margin_type !== undefined) updates.margin_type = margin_type;
  if (margin_value !== undefined) updates.margin_value = margin_value;

  const { data: user, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }

  return NextResponse.json({ user });
}

export const PATCH = withRBAC(handlePatch, {
  resource: 'users',
  action: 'update',
  requiredRoles: ['admin'],
});
```

#### 4.2 User Profile Settings Page

**File**: `app/settings/profile/page.tsx`

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
import { User2, Mail, Phone, Clock, Settings } from 'lucide-react';
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
  const { role, loading: roleLoading } = useUserRole();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('UTC');

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
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, timezone }),
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

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account information and preferences
          </p>
        </div>

        <Separator />

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
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setPhone(profile?.phone || '');
                  setTimezone(profile?.timezone || 'UTC');
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
        {role === 'sales_rep' && (
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
    </div>
  );
}
```

#### 4.3 Admin User Management Page

**File**: `app/admin/users/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useUserRole } from '@/lib/hooks/use-user-role';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

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
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
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
    <div className="container max-w-6xl py-8">
      <div className="space-y-6">
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
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{user.full_name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
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
    </div>
  );
}
```

### Phase 5: Testing Strategy

#### 5.1 Unit Tests

**Database Migration Tests**:
```bash
# Test migration up
supabase db push
supabase db test migration_004_update_user_roles
supabase db test migration_005_rename_iso_agents_to_users

# Test migration rollback
supabase db reset
supabase db push # Should restore to original state
```

**API Route Tests** - Update all existing tests in `__tests__/unit/api/`:
- Replace `iso_agents` → `users`
- Replace `iso_agent_id` → `user_id`
- Add tests for new `/api/users/me` endpoint
- Add tests for admin `/api/users` endpoint
- Test RBAC middleware with different roles

**RBAC Middleware Tests** - `__tests__/unit/lib/middleware/rbac.test.ts`:
```typescript
describe('RBAC Middleware', () => {
  describe('hasPermission', () => {
    it('should allow sales_rep to create clients', () => {
      expect(hasPermission('sales_rep', 'clients', 'create')).toBe(true);
    });

    it('should deny customer from creating clients', () => {
      expect(hasPermission('customer', 'clients', 'create')).toBe(false);
    });

    it('should allow admin full access', () => {
      expect(hasPermission('admin', 'users', 'delete')).toBe(true);
    });
  });

  describe('withRBAC', () => {
    it('should return 403 for insufficient permissions', async () => {
      // Mock user with customer role
      // Test protected endpoint
      // Expect 403 response
    });
  });
});
```

#### 5.2 Integration Tests

**Database Integration** - Test full workflow:
1. Create user via Clerk webhook
2. Verify user appears in `users` table with correct role
3. Create client_profile linked to user
4. Create request linked to user
5. Verify RLS policies work correctly

**API Integration** - Test multi-role workflows:
1. Sales rep creates client
2. Sales rep creates request
3. Admin views all users
4. Customer cannot access other users' data

#### 5.3 E2E Tests

**User Registration Flow**:
1. Sign up new user
2. Webhook creates user in database
3. User logs in
4. Profile page shows correct role
5. Navigation shows role-appropriate options

**RBAC Flow**:
1. Log in as sales_rep
2. Access allowed pages (clients, requests)
3. Attempt to access admin page → 403
4. Log in as admin
5. Access admin pages → success

### Phase 6: Deployment Strategy

#### 6.1 Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, e2e)
- [ ] Database migrations tested on staging
- [ ] Rollback migrations tested and verified
- [ ] Documentation updated
- [ ] Team training completed
- [ ] Monitoring and alerts configured

#### 6.2 Deployment Steps

**Step 1: Database Migration (Staging)**
```bash
# Connect to staging Supabase
supabase link --project-ref your-staging-project

# Run migrations
supabase db push

# Verify migration
psql postgres://... -c "SELECT * FROM users LIMIT 5;"
psql postgres://... -c "SELECT * FROM client_profiles LIMIT 5;"

# Test RLS policies
# ... (manual testing as different roles)
```

**Step 2: Code Deployment (Staging)**
```bash
# Deploy to staging (Vercel)
vercel --prod --scope your-team

# Verify deployment
curl https://your-staging-domain.vercel.app/api/users/me
```

**Step 3: Testing & Validation (Staging)**
- [ ] Run E2E tests against staging
- [ ] Manual QA testing
- [ ] Performance testing
- [ ] Security audit

**Step 4: Production Migration**
```bash
# Create database backup
supabase db dump -f backup-$(date +%Y%m%d).sql

# Connect to production
supabase link --project-ref your-production-project

# Run migrations
supabase db push

# Verify migration
# ... (same as staging)
```

**Step 5: Production Deployment**
```bash
# Deploy to production
vercel --prod

# Monitor deployment
vercel logs
```

**Step 6: Post-Deployment Monitoring**
- [ ] Monitor error rates (first 24 hours)
- [ ] Check webhook delivery success rate
- [ ] Verify user creation/updates working
- [ ] Monitor RLS policy performance
- [ ] Check API response times

#### 6.3 Rollback Procedure

If issues occur:

```bash
# Step 1: Rollback code deployment
vercel rollback

# Step 2: Rollback database (if needed)
supabase db reset
supabase db push # Push migrations up to 003 only

# Or restore from backup
psql postgres://... < backup-YYYYMMDD.sql

# Step 3: Verify rollback
# Test critical user flows
```

### Phase 7: Documentation & Training

#### 7.1 User Documentation

**For Sales Reps**:
- How to update profile settings
- Understanding role permissions
- Client management workflows

**For Admins**:
- User management guide
- Role assignment procedures
- Troubleshooting common issues

**For Customers** (if applicable):
- Account setup guide
- Profile management
- Support resources

#### 7.2 Developer Documentation

- **Migration Guide**: Step-by-step migration instructions
- **API Documentation**: Updated API endpoints and examples
- **RBAC Guide**: How to use RBAC middleware
- **Database Schema**: Updated ERD and schema documentation

---

## Timeline & Milestones

### Week 1: Database Migration
- **Day 1-2**: Create migration scripts
- **Day 3-4**: Test migrations on development
- **Day 5**: Code review and adjustments

### Week 2: Code Refactoring
- **Day 1-3**: Update TypeScript types and API routes
- **Day 4-5**: Update tests and validation

### Week 3: RBAC Implementation
- **Day 1-2**: Build RBAC middleware
- **Day 3-4**: Implement role-based UI rendering
- **Day 5**: Testing and refinement

### Week 4: UI Development
- **Day 1-3**: Build profile management pages
- **Day 4-5**: Build admin user management

### Week 5: Testing & Documentation
- **Day 1-2**: Comprehensive testing
- **Day 3-4**: Documentation
- **Day 5**: Final review

### Week 6: Staging Deployment
- **Day 1**: Deploy to staging
- **Day 2-4**: QA and testing
- **Day 5**: Fixes and adjustments

### Week 7: Production Deployment
- **Day 1**: Production migration
- **Day 2-7**: Monitoring and support

---

## Success Criteria

### Technical Success
- [  All database migrations complete without data loss
- [ ] All tests passing (100% of existing + new tests)
- [ ] No breaking changes to existing functionality
- [ ] RLS policies working correctly
- [ ] API performance unchanged or improved

### Business Success
- [ ] Zero downtime during migration
- [ ] No user-facing errors
- [ ] Role-based access working as expected
- [ ] Team able to use new features

### Quality Metrics
- [ ] Test coverage ≥ 75% (existing threshold)
- [ ] Response times < 500ms (p95)
- [ ] Error rate < 0.1%
- [ ] Documentation complete and accurate

---

## Risk Mitigation

### Risk 1: Data Loss During Migration
**Mitigation**:
- Full database backup before migration
- Test migrations on staging first
- Have rollback scripts ready
- Implement data validation checks

### Risk 2: Breaking Existing Functionality
**Mitigation**:
- Comprehensive test suite
- Backward compatibility checks
- Gradual rollout with feature flags
- Canary deployment strategy

### Risk 3: Performance Degradation
**Mitigation**:
- Load testing before deployment
- Database query optimization
- Index creation for new columns
- Monitoring and alerting

### Risk 4: User Confusion with New Roles
**Mitigation**:
- Clear documentation
- User training sessions
- In-app help and tooltips
- Gradual feature rollout

---

## Appendix

### A. Database Migration Scripts Summary

1. `004_update_user_roles.sql` - Update user_role enum
2. `005_rename_iso_agents_to_users.sql` - Rename table and update schema
3. `006_update_foreign_keys.sql` - Update foreign key references
4. `007_update_rls_for_users.sql` - Update RLS functions and policies
5. `008_rollback_to_iso_agents.sql` - Rollback migration (emergency use)

### B. Code Files to Update

**Core Types**:
- `lib/types/database.ts`

**API Routes**:
- `app/api/agents/route.ts`
- `app/api/clients/route.ts`
- `app/api/requests/route.ts`
- `app/api/quotes/route.ts`
- `app/api/workflows/route.ts`
- `app/api/analytics/route.ts`
- `app/api/email/route.ts`
- `app/api/webhooks/clerk/route.ts` (enhance with role support)
- `app/api/users/me/route.ts` (new)
- `app/api/users/route.ts` (new)

**Tests**:
- `__tests__/unit/api/**/*.test.ts` (all API tests)
- `__tests__/unit/api/webhooks/clerk.test.ts`
- `__tests__/utils/mock-factories.ts`
- `__tests__/unit/lib/middleware/rbac.test.ts` (new)

**UI Components**:
- `app/settings/profile/page.tsx` (new)
- `app/admin/users/page.tsx` (new)
- `lib/hooks/use-user-role.ts` (new)

**Middleware**:
- `lib/middleware/rbac.ts` (new)

### C. Environment Variables

No new environment variables required. Existing Clerk and Supabase variables are sufficient.

### D. Third-Party Dependencies

No new dependencies required. Using existing:
- `@clerk/nextjs` (authentication)
- `@supabase/supabase-js` (database)
- React and Next.js built-in hooks

---

**Document Version**: 1.0
**Last Updated**: October 25, 2025
**Next Review**: After staging deployment
