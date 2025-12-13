/**
 * RBAC (Role-Based Access Control) Type Definitions
 * 
 * This module defines the core types and enums for implementing
 * role-based access control in the Jetvision application.
 * 
 * @fileoverview Comprehensive RBAC type system for multi-role access control
 */

/**
 * User roles in the Jetvision system
 * Each role has specific permissions and access levels
 */
export enum UserRole {
  /** System administrator with full access to all features */
  ADMIN = 'admin',
  /** Jetvision agent who can manage client requests and quotes */
  AGENT = 'agent',
  /** Client who can submit requests and view quotes */
  CLIENT = 'client',
  /** Read-only user who can view but not modify data */
  VIEWER = 'viewer',
  /** Support staff with limited access to help clients */
  SUPPORT = 'support'
}

/**
 * System permissions that can be assigned to roles
 * Permissions define what actions a user can perform
 */
export enum Permission {
  // User Management
  MANAGE_USERS = 'manage_users',
  VIEW_USERS = 'view_users',
  
  // Chat and Communication
  MANAGE_CHATS = 'manage_chats',
  VIEW_CHATS = 'view_chats',
  SEND_MESSAGES = 'send_messages',
  
  // Flight Requests and Quotes
  MANAGE_REQUESTS = 'manage_requests',
  VIEW_REQUESTS = 'view_requests',
  CREATE_REQUESTS = 'create_requests',
  APPROVE_QUOTES = 'approve_quotes',
  VIEW_QUOTES = 'view_quotes',
  
  // Settings and Configuration
  MANAGE_SETTINGS = 'manage_settings',
  VIEW_SETTINGS = 'view_settings',
  MANAGE_PRICING = 'manage_pricing',
  
  // Analytics and Reports
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_REPORTS = 'manage_reports',
  VIEW_REPORTS = 'view_reports',
  
  // System Administration
  MANAGE_SYSTEM = 'manage_system',
  VIEW_LOGS = 'view_logs',
  MANAGE_AGENTS = 'manage_agents'
}

/**
 * Resources that can be accessed in the system
 * Resources define what data or features can be accessed
 */
export enum Resource {
  // User-related resources
  USER_PROFILES = 'user_profiles',
  USER_SETTINGS = 'user_settings',
  
  // Chat-related resources
  CHAT_SESSIONS = 'chat_sessions',
  MESSAGES = 'messages',
  
  // Flight-related resources
  FLIGHT_REQUESTS = 'flight_requests',
  QUOTES = 'quotes',
  AIRCRAFT = 'aircraft',
  
  // System resources
  SYSTEM_SETTINGS = 'system_settings',
  PRICING_CONFIG = 'pricing_config',
  ANALYTICS = 'analytics',
  REPORTS = 'reports',
  LOGS = 'logs',
  AGENTS = 'agents'
}

/**
 * Action types that can be performed on resources
 */
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // Full CRUD access
  APPROVE = 'approve',
  REJECT = 'reject',
  EXPORT = 'export',
  IMPORT = 'import'
}

/**
 * Permission configuration for each role
 * Maps roles to their allowed permissions
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Full system access
    Permission.MANAGE_USERS,
    Permission.VIEW_USERS,
    Permission.MANAGE_CHATS,
    Permission.VIEW_CHATS,
    Permission.SEND_MESSAGES,
    Permission.MANAGE_REQUESTS,
    Permission.VIEW_REQUESTS,
    Permission.CREATE_REQUESTS,
    Permission.APPROVE_QUOTES,
    Permission.VIEW_QUOTES,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_PRICING,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_REPORTS,
    Permission.MANAGE_SYSTEM,
    Permission.VIEW_LOGS,
    Permission.MANAGE_AGENTS
  ],
  
  [UserRole.AGENT]: [
    // Agent-specific permissions
    Permission.VIEW_USERS,
    Permission.MANAGE_CHATS,
    Permission.VIEW_CHATS,
    Permission.SEND_MESSAGES,
    Permission.MANAGE_REQUESTS,
    Permission.VIEW_REQUESTS,
    Permission.CREATE_REQUESTS,
    Permission.APPROVE_QUOTES,
    Permission.VIEW_QUOTES,
    Permission.VIEW_SETTINGS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_REPORTS
  ],
  
  [UserRole.CLIENT]: [
    // Client-specific permissions
    Permission.VIEW_CHATS,
    Permission.SEND_MESSAGES,
    Permission.VIEW_REQUESTS,
    Permission.CREATE_REQUESTS,
    Permission.VIEW_QUOTES,
    Permission.VIEW_SETTINGS
  ],
  
  [UserRole.SUPPORT]: [
    // Support staff permissions
    Permission.VIEW_USERS,
    Permission.VIEW_CHATS,
    Permission.SEND_MESSAGES,
    Permission.VIEW_REQUESTS,
    Permission.VIEW_QUOTES,
    Permission.VIEW_SETTINGS
  ],
  
  [UserRole.VIEWER]: [
    // Read-only permissions
    Permission.VIEW_CHATS,
    Permission.VIEW_REQUESTS,
    Permission.VIEW_QUOTES,
    Permission.VIEW_SETTINGS
  ]
};

/**
 * Resource-action mapping for fine-grained access control
 * Defines which actions can be performed on which resources
 */
export const RESOURCE_ACTIONS: Record<Resource, Action[]> = {
  [Resource.USER_PROFILES]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.MANAGE],
  [Resource.USER_SETTINGS]: [Action.READ, Action.UPDATE],
  [Resource.CHAT_SESSIONS]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.MANAGE],
  [Resource.MESSAGES]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
  [Resource.FLIGHT_REQUESTS]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.MANAGE],
  [Resource.QUOTES]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.APPROVE, Action.REJECT],
  [Resource.AIRCRAFT]: [Action.READ, Action.UPDATE],
  [Resource.SYSTEM_SETTINGS]: [Action.READ, Action.UPDATE, Action.MANAGE],
  [Resource.PRICING_CONFIG]: [Action.READ, Action.UPDATE, Action.MANAGE],
  [Resource.ANALYTICS]: [Action.READ, Action.EXPORT],
  [Resource.REPORTS]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.EXPORT, Action.MANAGE],
  [Resource.LOGS]: [Action.READ, Action.EXPORT],
  [Resource.AGENTS]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.MANAGE]
};

/**
 * User context interface for RBAC
 * Contains user information and role data
 */
export interface UserContext {
  /** Unique user identifier */
  userId: string;
  /** User's primary role */
  role: UserRole;
  /** Additional roles (for multi-role users) */
  additionalRoles?: UserRole[];
  /** User's email address */
  email: string;
  /** User's display name */
  name: string;
  /** User's organization/company */
  organization?: string;
  /** User's permissions (computed from roles) */
  permissions: Permission[];
  /** User's metadata */
  metadata?: Record<string, any>;
}

/**
 * RBAC context for middleware and components
 * Contains user context and permission checking utilities
 */
export interface RBACContext {
  /** Current user context */
  user: UserContext | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether user has a specific permission */
  hasPermission: (permission: Permission) => boolean;
  /** Whether user has any of the specified permissions */
  hasAnyPermission: (permissions: Permission[]) => boolean;
  /** Whether user has all of the specified permissions */
  hasAllPermissions: (permissions: Permission[]) => boolean;
  /** Whether user can perform action on resource */
  canPerformAction: (resource: Resource, action: Action) => boolean;
  /** Whether user has specific role */
  hasRole: (role: UserRole) => boolean;
  /** Whether user has any of the specified roles */
  hasAnyRole: (roles: UserRole[]) => boolean;
}

/**
 * RBAC middleware configuration
 * Defines how the middleware should behave
 */
export interface RBACConfig {
  /** Whether to enable strict mode (fail on missing permissions) */
  strictMode: boolean;
  /** Default role for unauthenticated users */
  defaultRole: UserRole;
  /** Whether to log permission checks */
  enableLogging: boolean;
  /** Custom permission resolver function */
  customPermissionResolver?: (user: UserContext, permission: Permission) => boolean;
}

/**
 * Permission check result
 * Contains the result of a permission check
 */
export interface PermissionCheckResult {
  /** Whether permission is granted */
  granted: boolean;
  /** Reason for denial (if applicable) */
  reason?: string;
  /** Required permissions that are missing */
  missingPermissions?: Permission[];
  /** Required roles that are missing */
  missingRoles?: UserRole[];
}

/**
 * Route protection configuration
 * Defines how routes should be protected
 */
export interface RouteProtection {
  /** Route path pattern */
  path: string;
  /** Required permissions for this route */
  requiredPermissions?: Permission[];
  /** Required roles for this route */
  requiredRoles?: UserRole[];
  /** Whether authentication is required */
  requiresAuth: boolean;
  /** Custom permission check function */
  customCheck?: (context: RBACContext) => boolean;
  /** Redirect path for unauthorized access */
  redirectTo?: string;
}

/**
 * Error types for RBAC operations
 */
export enum RBACErrorType {
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  INVALID_ROLE = 'invalid_role',
  INVALID_PERMISSION = 'invalid_permission',
  MISSING_CONTEXT = 'missing_context',
  CONFIGURATION_ERROR = 'configuration_error'
}

/**
 * RBAC error class
 * Custom error class for RBAC-related errors
 */
export class RBACError extends Error {
  public readonly type: RBACErrorType;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    type: RBACErrorType,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'RBACError';
    this.type = type;
    this.context = context;
  }
}
