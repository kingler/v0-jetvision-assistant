/**
 * RBAC Permissions - Client-Safe
 *
 * Pure permission logic that can be used in both client and server components.
 * Contains the permission matrix and checking functions.
 */

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
