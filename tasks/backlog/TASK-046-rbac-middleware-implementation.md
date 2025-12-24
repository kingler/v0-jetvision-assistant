# Task: RBAC Middleware Implementation
# Option B - Role-Based Access Control System

**Task ID**: TASK-046
**Created**: 2025-10-26
**Assigned To**: Development Team
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 12 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement a comprehensive Role-Based Access Control (RBAC) system with middleware, permission matrices, helper functions, and React hooks to enforce multi-role access control throughout the application.

### User Story
**As a** system administrator
**I want** role-based access control enforced at the API and UI levels
**So that** users can only access features and data appropriate to their role (sales_rep, admin, customer, operator)

### Business Value
Ensures data security and proper access control for a multi-tenant system with different user types. Prevents unauthorized access to sensitive data and features, which is critical for compliance and customer trust.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: RBAC middleware SHALL protect API routes
- Middleware validates user authentication via Clerk
- Middleware checks user role from Supabase
- Permission matrix defines role-based access to resources
- Unauthorized requests return 403 Forbidden

**FR-2**: Permission matrix SHALL define role capabilities
- `sales_rep`: Full access to own clients, requests, quotes
- `admin`: Full access to all resources including user management
- `customer`: Read-only access to own requests and quotes
- `operator`: Limited access to requests and quotes management

**FR-3**: React hooks SHALL enable role-based UI rendering
- `useUserRole()` hook provides current user's role
- Helper functions check specific roles (`isSalesRep()`, `isAdmin()`, etc.)
- Role checks enable conditional UI component rendering

**FR-4**: API helper functions SHALL simplify role checks
- `getUserRole()`: Fetch user role from database
- `hasPermission()`: Check if role has permission for resource/action
- `requireRoles()`: Middleware wrapper for role requirement

### Acceptance Criteria

- [ ] **AC-1**: RBAC middleware (`lib/middleware/rbac.ts`) implemented
- [ ] **AC-2**: Permission matrix defined for all 4 roles
- [ ] **AC-3**: `withRBAC()` wrapper function working on API routes
- [ ] **AC-4**: `requireRoles()` helper function working
- [ ] **AC-5**: `useUserRole()` React hook implemented
- [ ] **AC-6**: `/api/users/me` endpoint created for role fetching
- [ ] **AC-7**: All protected routes using RBAC middleware
- [ ] **AC-8**: Unit tests for permission logic (80%+ coverage)
- [ ] **AC-9**: Integration tests for protected routes
- [ ] **AC-10**: Code review approved

### Non-Functional Requirements

- **Performance**: Permission checks < 50ms
- **Security**: JWT validation, no role spoofing possible
- **Maintainability**: Clear permission matrix, easy to extend
- **Type Safety**: Full TypeScript typing for permissions

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/middleware/rbac.test.ts
__tests__/integration/api/rbac-protected-routes.test.ts
__tests__/unit/hooks/use-user-role.test.ts
```

**Example Test**:
```typescript
// __tests__/unit/middleware/rbac.test.ts
import { describe, it, expect, vi } from 'vitest'
import { hasPermission, getUserRole, withRBAC } from '@/lib/middleware/rbac'

describe('RBAC Middleware', () => {
  describe('hasPermission', () => {
    it('should allow sales_rep to create clients', () => {
      expect(hasPermission('sales_rep', 'clients', 'create')).toBe(true)
    })

    it('should deny customer from creating clients', () => {
      expect(hasPermission('customer', 'clients', 'create')).toBe(false)
    })

    it('should allow admin full access to users', () => {
      expect(hasPermission('admin', 'users', 'delete')).toBe(true)
    })

    it('should deny sales_rep from deleting users', () => {
      expect(hasPermission('sales_rep', 'users', 'delete')).toBe(false)
    })
  })

  describe('withRBAC', () => {
    it('should return 401 for unauthenticated users', async () => {
      const mockRequest = createMockRequest({ authenticated: false })
      const handler = vi.fn()

      const protectedHandler = withRBAC(handler, {
        resource: 'clients',
        action: 'read',
      })

      const response = await protectedHandler(mockRequest)
      expect(response.status).toBe(401)
      expect(handler).not.toHaveBeenCalled()
    })

    it('should return 403 for insufficient permissions', async () => {
      const mockRequest = createMockRequest({
        authenticated: true,
        role: 'customer'
      })
      const handler = vi.fn()

      const protectedHandler = withRBAC(handler, {
        resource: 'clients',
        action: 'create', // customers can't create clients
      })

      const response = await protectedHandler(mockRequest)
      expect(response.status).toBe(403)
      expect(handler).not.toHaveBeenCalled()
    })

    it('should call handler for authorized users', async () => {
      const mockRequest = createMockRequest({
        authenticated: true,
        role: 'sales_rep'
      })
      const handler = vi.fn().mockResolvedValue(new Response('OK'))

      const protectedHandler = withRBAC(handler, {
        resource: 'clients',
        action: 'create',
      })

      const response = await protectedHandler(mockRequest)
      expect(handler).toHaveBeenCalled()
      expect(response.status).toBe(200)
    })
  })
})
```

**Run Tests** (they should FAIL):
```bash
npm test -- rbac.test.ts
# Expected: Tests fail because implementation doesn't exist yet
```

### Step 2: Implement Minimal Code (Green Phase)

Create RBAC middleware and make tests pass.

### Step 3: Refactor (Blue Phase)

- Extract permission matrix to separate configuration
- Add JSDoc comments
- Optimize permission checks

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] Database using `iso_agents` table with `role` column
- [ ] User roles properly seeded in database

### Step-by-Step Implementation

**Step 1**: Create Permission Matrix

File: `lib/middleware/rbac.ts`

```typescript
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';
import { UserRole } from '@/lib/types/database';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Permission matrix defining what each role can do with each resource
 *
 * Resources: clients, requests, quotes, users, analytics
 * Actions: create, read, read_own, read_all, update, update_own, delete
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
    clients: [],
    requests: ['read', 'update'],
    quotes: ['read', 'update'],
    users: ['read_own'],
    analytics: ['read_all'],
  },
} as const;

type Resource = keyof typeof PERMISSIONS.admin;
type Action = string;

/**
 * Get user role from Clerk user ID
 * @param clerkUserId - Clerk user ID from JWT
 * @returns User role or null if not found
 */
export async function getUserRole(clerkUserId: string): Promise<UserRole | null> {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_user_id', clerkUserId)
      .single();

    return user?.role || null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

/**
 * Check if a role has permission for a resource and action
 * @param role - User role
 * @param resource - Resource being accessed
 * @param action - Action being performed
 * @returns true if permission granted, false otherwise
 */
export function hasPermission(
  role: UserRole,
  resource: Resource,
  action: Action
): boolean {
  const rolePermissions = PERMISSIONS[role];
  if (!rolePermissions) return false;

  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action as any);
}

/**
 * RBAC middleware wrapper for API routes
 * Checks authentication and permissions before calling handler
 *
 * @param handler - The API route handler
 * @param options - RBAC configuration
 * @returns Wrapped handler with permission checks
 *
 * @example
 * ```typescript
 * export const GET = withRBAC(async (req) => {
 *   // Your handler code
 * }, {
 *   resource: 'clients',
 *   action: 'read',
 * });
 * ```
 */
export function withRBAC(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    resource: Resource;
    action: Action;
    requiredRoles?: UserRole[];
  }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Step 1: Authenticate user via Clerk
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized: Authentication required' },
          { status: 401 }
        );
      }

      // Step 2: Get user role from database
      const role = await getUserRole(userId);

      if (!role) {
        return NextResponse.json(
          { error: 'User not found in system' },
          { status: 404 }
        );
      }

      // Step 3: Check role requirement if specified
      if (options.requiredRoles && !options.requiredRoles.includes(role)) {
        return NextResponse.json(
          {
            error: 'Forbidden: Insufficient permissions',
            required: options.requiredRoles,
            actual: role
          },
          { status: 403 }
        );
      }

      // Step 4: Check permission
      if (!hasPermission(role, options.resource, options.action)) {
        return NextResponse.json(
          {
            error: 'Forbidden: Insufficient permissions for this action',
            resource: options.resource,
            action: options.action,
            role
          },
          { status: 403 }
        );
      }

      // Step 5: Attach user info to request for handler use
      (req as any).user = { userId, role };

      // Step 6: Call original handler
      return await handler(req);

    } catch (error) {
      console.error('RBAC middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper to require specific roles
 * Returns null if authorized, error response if not
 *
 * @param roles - Array of required roles
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * export async function DELETE(req: NextRequest) {
 *   const error = await requireRoles('admin')(req);
 *   if (error) return error;
 *
 *   // Only admins reach here
 * }
 * ```
 */
export function requireRoles(...roles: UserRole[]) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    try {
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const userRole = await getUserRole(userId);

      if (!userRole || !roles.includes(userRole)) {
        return NextResponse.json(
          {
            error: 'Forbidden: Insufficient permissions',
            required: roles,
            actual: userRole
          },
          { status: 403 }
        );
      }

      // Attach user info for handler
      (req as any).user = { userId, role: userRole };

      return null; // Success - no error

    } catch (error) {
      console.error('Role check error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
```

**Step 2**: Create User Profile API Route

File: `app/api/users/me/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

/**
 * GET /api/users/me - Get current user profile
 * Returns user data for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, avatar_url, phone, timezone, preferences, created_at')
      .eq('clerk_user_id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/me - Update current user profile
 * Allows users to update their own profile (limited fields)
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const updates = await req.json();

    // Fields users can update themselves
    const allowedFields = ['phone', 'timezone', 'preferences', 'avatar_url'];

    // Filter to only allowed fields
    const safeUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(safeUpdates)
      .eq('clerk_user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 3**: Create React Hook for Role Checking

File: `lib/hooks/use-user-role.ts`

```typescript
'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { UserRole } from '@/lib/types/database';

interface UseUserRoleReturn {
  role: UserRole | null;
  loading: boolean;
  isSalesRep: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  isOperator: boolean;
  hasRole: (requiredRole: UserRole) => boolean;
  hasAnyRole: (requiredRoles: UserRole[]) => boolean;
}

/**
 * Hook to get current user's role and provide role-checking utilities
 *
 * @returns Object with role information and helper functions
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { role, isAdmin, loading } = useUserRole();
 *
 *   if (loading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       <h1>Welcome!</h1>
 *       {isAdmin && <AdminPanel />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserRole(): UseUserRoleReturn {
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
        const response = await fetch('/api/users/me');

        if (response.ok) {
          const data = await response.json();
          setRole(data.role);
        } else {
          console.error('Failed to fetch user role');
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

  const hasRole = (requiredRole: UserRole): boolean => {
    return role === requiredRole;
  };

  const hasAnyRole = (requiredRoles: UserRole[]): boolean => {
    return role ? requiredRoles.includes(role) : false;
  };

  return {
    role,
    loading,
    isSalesRep,
    isAdmin,
    isCustomer,
    isOperator,
    hasRole,
    hasAnyRole,
  };
}
```

**Step 4**: Apply RBAC to Existing API Routes

Example for `/api/clients/route.ts`:

```typescript
import { withRBAC } from '@/lib/middleware/rbac';

// Before:
export async function GET(request: NextRequest) {
  // handler code
}

// After:
async function handleGet(request: NextRequest) {
  // handler code (same as before)
}

export const GET = withRBAC(handleGet, {
  resource: 'clients',
  action: 'read',
});
```

**Step 5**: Create Admin-Only Routes

File: `app/api/users/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withRBAC } from '@/lib/middleware/rbac';
import { supabase } from '@/lib/supabase/client';

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
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }

  return NextResponse.json({ users });
}

// Protect with RBAC - only admins can list all users
export const GET = withRBAC(handleGet, {
  resource: 'users',
  action: 'read',
  requiredRoles: ['admin'],
});

async function handlePatch(req: NextRequest) {
  const { user_id, role, is_active, margin_type, margin_value } = await req.json();

  if (!user_id) {
    return NextResponse.json(
      { error: 'Missing user_id' },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }

  return NextResponse.json({ user });
}

// Only admins can update user roles and settings
export const PATCH = withRBAC(handlePatch, {
  resource: 'users',
  action: 'update',
  requiredRoles: ['admin'],
});
```

**Step 6**: Validation

```bash
# Type check
npx tsc --noEmit

# Run RBAC tests
npm test -- rbac

# Test protected route
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users

# Build
npm run build
```

---

## 5. GIT WORKFLOW

### Branch Creation

```bash
git checkout main
git pull origin main
git checkout -b feat/rbac-middleware-implementation
```

### Commit Strategy

```bash
# Commit 1: Core RBAC middleware
git add lib/middleware/rbac.ts
git commit -m "feat(rbac): implement permission matrix and RBAC middleware"

# Commit 2: User profile API
git add app/api/users/me/route.ts
git commit -m "feat(api): add /api/users/me endpoint for profile access"

# Commit 3: React hook
git add lib/hooks/use-user-role.ts
git commit -m "feat(hooks): add useUserRole hook for client-side role checks"

# Commit 4: Admin routes
git add app/api/users/route.ts
git commit -m "feat(api): add admin-only user management endpoints"

# Commit 5: Apply to existing routes
git add app/api/clients/route.ts app/api/requests/route.ts
git commit -m "feat(rbac): apply RBAC middleware to clients and requests APIs"

# Commit 6: Tests
git add __tests__
git commit -m "test(rbac): add comprehensive RBAC tests"
```

---

## 6. CODE REVIEW CHECKLIST

### Reviewer Checklist

**Security**:
- [ ] JWT validation working correctly
- [ ] No role spoofing possible
- [ ] Permission checks cannot be bypassed
- [ ] Error messages don't leak sensitive info

**Functionality**:
- [ ] All 4 roles have correct permissions
- [ ] Permission matrix is complete
- [ ] RBAC middleware works on all routes
- [ ] React hook fetches role correctly

**Code Quality**:
- [ ] TypeScript types fully defined
- [ ] JSDoc comments on all public functions
- [ ] Error handling comprehensive
- [ ] Logging appropriate

---

## 7. TESTING REQUIREMENTS

### Unit Tests

**File**: `__tests__/unit/middleware/rbac.test.ts`

Test all permission combinations:
```typescript
describe('Permission Matrix', () => {
  test.each([
    ['sales_rep', 'clients', 'create', true],
    ['sales_rep', 'users', 'delete', false],
    ['admin', 'users', 'delete', true],
    ['customer', 'clients', 'create', false],
    ['customer', 'requests', 'read_own', true],
    ['operator', 'analytics', 'read_all', true],
  ])('%s can%s %s %s', (role, resource, action, expected) => {
    expect(hasPermission(role as UserRole, resource, action)).toBe(expected);
  });
});
```

### Integration Tests

**File**: `__tests__/integration/api/rbac-protected-routes.test.ts`

Test protected routes with different roles:
```typescript
describe('Protected Routes', () => {
  it('should allow admin to access /api/users', async () => {
    const token = await getAdminToken();
    const response = await fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(response.status).toBe(200);
  });

  it('should deny sales_rep access to /api/users', async () => {
    const token = await getSalesRepToken();
    const response = await fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(response.status).toBe(403);
  });
});
```

---

## 8. DEFINITION OF DONE

### Code Complete
- [ ] RBAC middleware implemented
- [ ] Permission matrix defined
- [ ] `/api/users/me` endpoint working
- [ ] `useUserRole()` hook functional
- [ ] All API routes protected
- [ ] No TypeScript errors

### Testing Complete
- [ ] Unit tests for permissions (80%+ coverage)
- [ ] Integration tests for protected routes
- [ ] Manual testing of all role combinations
- [ ] Tests passing

### Documentation Complete
- [ ] JSDoc comments on all functions
- [ ] Usage examples in code
- [ ] Migration guide updated

### Code Review Complete
- [ ] PR created and reviewed
- [ ] Security review passed
- [ ] Feedback addressed

---

## 9. RESOURCES & REFERENCES

### Documentation
- [Clerk Auth Documentation](https://clerk.com/docs)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

### Related Tasks
- TASK-047: User Profile UI (uses this)

---

## 10. NOTES & QUESTIONS

### Assumptions
- Clerk JWT contains valid user ID
- Database users table populated
- User role assignment working via webhook

### Risks
- **Risk**: Performance impact of permission checks
  - **Mitigation**: Cache user roles, optimize queries

---

## 11. COMPLETION SUMMARY

[Fill out after completion]

---

**Task Status**: ⏳ PENDING
**Blocks**: TASK-047 (Profile UI)
