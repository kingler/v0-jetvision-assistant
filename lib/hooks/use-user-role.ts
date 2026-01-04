'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { UserRole } from '@/lib/types/database';
import { hasPermission, type Resource, type Action } from '@/lib/rbac/permissions';

export interface UseUserRoleReturn {
  role: UserRole | null;
  loading: boolean;
  isSalesRep: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  isOperator: boolean;
  hasPermission: (resource: Resource, action: Action) => boolean;
}

export function useUserRole(): UseUserRoleReturn {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      if (!isLoaded) return;

      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const userData = await response.json();
          setRole(userData.user?.role || userData.role);
        } else if (response.status === 403 || response.status === 404) {
          // User not found or not synced to database - expected for new users
          // Don't log as error, just set role to null
          setRole(null);
        } else {
          // Only log unexpected errors
          console.error('Failed to fetch user role:', response.status, response.statusText);
          setRole(null);
        }
      } catch (error) {
        // Only log unexpected errors (network issues, etc.)
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          // Network error - don't spam console
          setRole(null);
        } else {
          console.error('Error fetching user role:', error);
          setRole(null);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, [user, isLoaded]);

  const checkPermission = (resource: Resource, action: Action): boolean => {
    if (!role) return false;
    return hasPermission(role, resource, action);
  };

  return {
    role,
    loading,
    isSalesRep: role === 'sales_rep',
    isAdmin: role === 'admin',
    isCustomer: role === 'customer',
    isOperator: role === 'operator',
    hasPermission: checkPermission,
  };
}
