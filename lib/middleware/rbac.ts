/**
 * RBAC (Role-Based Access Control) Middleware
 *
 * Implements permission-based access control for API routes and application resources.
 * Supports 4 user roles: sales_rep, admin, customer, operator
 *
 * @fileoverview Complete RBAC middleware implementation with permission matrix
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { UserRole } from '@/lib/types/database';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Available resources in the system
 */
export type Resource = 'clients' | 'requests' | 'quotes' | 'users' | 'analytics';

/**
 * Available actions that can be performed on resources
 */
export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'read_own'   // Read only own data
  | 'update_own' // Update only own data
  | 'read_all';  // Read all data (admin/operator)

/**
 * Permission check configuration
 */
export interface PermissionCheck {
  resource: Resource;
  action: Action;
}

/**
 * RBAC context passed to protected route handlers
 */
export interface RBACContext {
  userId: string;
  role: UserRole;
}

/**
 * Permission matrix type
 */
type PermissionMatrix = {
  [K in UserRole]?: {
    [R in Resource]: Action[];
  };
};

// ============================================================================
// PERMISSION MATRIX
// ============================================================================

/**
 * Complete permission matrix for all roles
 *
 * Defines what actions each role can perform on each resource
 */
export const PERMISSIONS: PermissionMatrix = {
  sales_rep: {
    clients: ['create', 'read', 'update', 'delete'],
    requests: ['create', 'read', 'update', 'delete'],
    quotes: ['read', 'update'],
    users: ['read_own', 'update_own'],
    analytics: ['read_own'],
  },
  admin: {
    clients: ['create', 'read', 'update', 'delete'],
    requests: ['create', 'read', 'update', 'delete'],
    quotes: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete', 'read_own', 'update_own'],
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
    clients: ['read'],
    requests: ['read', 'update'],
    quotes: ['create', 'read', 'update'],
    users: ['read'],
    analytics: ['read_all'],
  },
};

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

/**
 * Check if a user role has permission to perform an action on a resource
 *
 * @param role - User's role
 * @param resource - Resource to access
 * @param action - Action to perform
 * @returns true if permission granted, false otherwise
 *
 * @example
 * ```typescript
 * hasPermission('admin', 'clients', 'delete') // true
 * hasPermission('customer', 'clients', 'delete') // false
 * hasPermission('sales_rep', 'quotes', 'create') // false
 * ```
 */
export function hasPermission(
  role: UserRole,
  resource: Resource,
  action: Action
): boolean {
  // Handle null/undefined role
  if (!role) {
    return false;
  }

  // Check if role exists in permission matrix
  const rolePermissions = PERMISSIONS[role];
  if (!rolePermissions) {
    return false;
  }

  // Check if resource exists for role
  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) {
    return false;
  }

  // Check if action is allowed
  return resourcePermissions.includes(action);
}

// ============================================================================
// USER ROLE FETCHING
// ============================================================================

/**
 * Fetch user role from database by Clerk user ID
 *
 * Uses admin client to bypass RLS since we already have Clerk authentication.
 * This allows us to look up the user role even if RLS policies would normally block it.
 *
 * @param clerkUserId - Clerk user ID
 * @returns User role or null if not found
 *
 * @example
 * ```typescript
 * const role = await getUserRole('user_123')
 * if (role === 'admin') {
 *   // Allow admin actions
 * }
 * ```
 */
export async function getUserRole(clerkUserId: string): Promise<UserRole | null> {
  try {
    // Use admin client to bypass RLS since we already have Clerk authentication
    const { data, error } = await supabaseAdmin
      .from('iso_agents')
      .select('role')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (error || !data) {
      console.error('Error fetching user role:', error?.message || 'User not found');
      return null;
    }

    return data.role;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

// ============================================================================
// MIDDLEWARE WRAPPER
// ============================================================================

/**
 * Higher-order function to wrap API route handlers with RBAC protection
 *
 * @param handler - Original route handler
 * @param permissionCheck - Required permission check
 * @returns Protected route handler
 *
 * @example
 * ```typescript
 * export const GET = withRBAC(
 *   async (req: NextRequest) => {
 *     // Handler logic
 *     return NextResponse.json({ data: [] })
 *   },
 *   { resource: 'clients', action: 'read' }
 * )
 * ```
 */
export function withRBAC(
  handler: (req: NextRequest, context?: RBACContext) => Promise<NextResponse>,
  permissionCheck: PermissionCheck
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Check authentication
      const authResult = await auth();
      const { userId } = authResult;

      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }

      // 2. Fetch user role
      const role = await getUserRole(userId);

      if (!role) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'User role not found' },
          { status: 403 }
        );
      }

      // 3. Check permission
      const hasAccess = hasPermission(
        role,
        permissionCheck.resource,
        permissionCheck.action
      );

      if (!hasAccess) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: `Insufficient permissions to ${permissionCheck.action} ${permissionCheck.resource}`,
          },
          { status: 403 }
        );
      }

      // 4. Call original handler with context
      const context: RBACContext = { userId, role };
      return await handler(req, context);
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  };
}

// ============================================================================
// ROLE HELPERS
// ============================================================================

/**
 * Check if a user has one of the required roles
 *
 * @param userRole - User's role
 * @param requiredRoles - List of acceptable roles
 * @returns true if user has one of the required roles
 *
 * @example
 * ```typescript
 * requireRoles(userRole, ['admin', 'sales_rep']) // true if admin or sales_rep
 * requireRoles(userRole, ['admin']) // true only if admin
 * ```
 */
export function requireRoles(
  userRole: UserRole,
  requiredRoles: UserRole[]
): boolean {
  // Handle null/undefined role
  if (!userRole) {
    return false;
  }

  // Empty array means no role requirement
  if (requiredRoles.length === 0) {
    return true;
  }

  // Check if user has one of the required roles
  return requiredRoles.includes(userRole);
}

/**
 * Convenience wrapper for role-based protection (in addition to permission-based)
 *
 * @param handler - Original route handler
 * @param requiredRoles - List of acceptable roles
 * @returns Protected route handler
 *
 * @example
 * ```typescript
 * export const DELETE = withRoles(
 *   async (req: NextRequest) => {
 *     // Only admins can access this
 *     return NextResponse.json({ success: true })
 *   },
 *   ['admin']
 * )
 * ```
 */
export function withRoles(
  handler: (req: NextRequest, context?: RBACContext) => Promise<NextResponse>,
  requiredRoles: UserRole[]
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Check authentication
      const authResult = await auth();
      const { userId } = authResult;

      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }

      // 2. Fetch user role
      const role = await getUserRole(userId);

      if (!role) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'User role not found' },
          { status: 403 }
        );
      }

      // 3. Check role
      const hasRequiredRole = requireRoles(role, requiredRoles);

      if (!hasRequiredRole) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: `This action requires one of the following roles: ${requiredRoles.join(', ')}`,
          },
          { status: 403 }
        );
      }

      // 4. Call original handler with context
      const context: RBACContext = { userId, role };
      return await handler(req, context);
    } catch (error) {
      console.error('Role-based middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  };
}
