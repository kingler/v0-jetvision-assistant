'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { UserRole } from '@/lib/types/database';
import { hasPermission, type Resource, type Action } from '@/lib/middleware/rbac';

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
          setRole(userData.role);
        } else {
          console.error('Failed to fetch user role');
          setRole(null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
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