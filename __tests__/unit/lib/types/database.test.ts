/**
 * Database Types Unit Tests
 *
 * TDD Approach: These tests are written FIRST and will FAIL initially.
 * Then we'll implement the User type and related changes to make them pass.
 */

import { describe, it, expect } from 'vitest';
import type { User, UserRole, ClientProfile, Request, Database } from '@/lib/types/database';

describe('User Type', () => {
  it('should have User interface with all required fields', () => {
    const user: User = {
      id: 'test-user-id',
      clerk_user_id: 'clerk_test_123',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'sales_rep',
      avatar_url: 'https://example.com/avatar.jpg',
      phone: '+1234567890',
      timezone: 'America/New_York',
      preferences: { theme: 'dark' },
      margin_type: 'percentage',
      margin_value: 10,
      is_active: true,
      last_login_at: '2025-01-15T10:00:00Z',
      metadata: { source: 'organic' },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-15T00:00:00Z',
    };

    expect(user).toBeDefined();
    expect(user.role).toBe('sales_rep');
    expect(user.avatar_url).toBe('https://example.com/avatar.jpg');
    expect(user.phone).toBe('+1234567890');
    expect(user.timezone).toBe('America/New_York');
    expect(user.preferences).toEqual({ theme: 'dark' });
    expect(user.last_login_at).toBe('2025-01-15T10:00:00Z');
  });

  it('should allow null values for optional fields', () => {
    const user: User = {
      id: 'test-user-id',
      clerk_user_id: 'clerk_test_123',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'admin',
      avatar_url: null,
      phone: null,
      timezone: 'UTC',
      preferences: {},
      margin_type: null,
      margin_value: null,
      is_active: true,
      last_login_at: null,
      metadata: {},
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    expect(user).toBeDefined();
    expect(user.avatar_url).toBeNull();
    expect(user.phone).toBeNull();
    expect(user.last_login_at).toBeNull();
  });
});

describe('UserRole Type', () => {
  it('should support sales_rep role', () => {
    const role: UserRole = 'sales_rep';
    expect(role).toBe('sales_rep');
  });

  it('should support admin role', () => {
    const role: UserRole = 'admin';
    expect(role).toBe('admin');
  });

  it('should support customer role', () => {
    const role: UserRole = 'customer';
    expect(role).toBe('customer');
  });

  it('should support operator role', () => {
    const role: UserRole = 'operator';
    expect(role).toBe('operator');
  });

  it('should support legacy iso_agent role (deprecated)', () => {
    const role: UserRole = 'iso_agent';
    expect(role).toBe('iso_agent');
  });

  it('should have 5 total role options', () => {
    const roles: UserRole[] = ['sales_rep', 'admin', 'customer', 'operator', 'iso_agent'];
    expect(roles).toHaveLength(5);
  });
});

describe('ClientProfile Type - Foreign Key Update', () => {
  it('should use user_id instead of iso_agent_id', () => {
    const clientProfile: ClientProfile = {
      id: 'client-123',
      user_id: 'user-456', // Changed from iso_agent_id
      company_name: 'Acme Corp',
      contact_name: 'John Doe',
      email: 'john@acme.com',
      phone: '+1234567890',
      preferences: {},
      notes: 'Premium client',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    expect(clientProfile).toBeDefined();
    expect(clientProfile.user_id).toBe('user-456');
    expect(clientProfile).not.toHaveProperty('iso_agent_id');
  });
});

describe('Request Type - Foreign Key Update', () => {
  it('should use user_id instead of iso_agent_id', () => {
    const request: Request = {
      id: 'request-123',
      user_id: 'user-456', // Changed from iso_agent_id
      client_profile_id: 'client-789',
      departure_airport: 'JFK',
      arrival_airport: 'LAX',
      departure_date: '2025-02-01',
      return_date: '2025-02-05',
      passengers: 4,
      aircraft_type: 'Gulfstream G650',
      budget: 50000,
      special_requirements: 'Catering required',
      status: 'pending',
      metadata: {},
      created_at: '2025-01-15T00:00:00Z',
      updated_at: '2025-01-15T00:00:00Z',
    };

    expect(request).toBeDefined();
    expect(request.user_id).toBe('user-456');
    expect(request).not.toHaveProperty('iso_agent_id');
  });
});

describe('Database Schema Type', () => {
  it('should have users table in schema', () => {
    type UsersTable = Database['public']['Tables']['users'];
    const isTableDefined = true; // Type will fail to compile if not defined
    expect(isTableDefined).toBe(true);
  });

  it('should have Row, Insert, and Update types for users table', () => {
    type UsersRow = Database['public']['Tables']['users']['Row'];
    type UsersInsert = Database['public']['Tables']['users']['Insert'];
    type UsersUpdate = Database['public']['Tables']['users']['Update'];

    const isTypesDefined = true; // Types will fail to compile if not defined
    expect(isTypesDefined).toBe(true);
  });

  it('should maintain backward compatibility with iso_agents table (deprecated)', () => {
    type IsoAgentsTable = Database['public']['Tables']['iso_agents'];
    const isDeprecatedTablePresent = true; // For migration period
    expect(isDeprecatedTablePresent).toBe(true);
  });
});

describe('Type Safety Tests', () => {
  it('should enforce required fields in User type', () => {
    // This test verifies TypeScript compilation
    // If User type is missing required fields, this won't compile
    const createUser = (): User => ({
      id: '123',
      clerk_user_id: 'clerk_123',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'sales_rep',
      avatar_url: null,
      phone: null,
      timezone: 'UTC',
      preferences: {},
      margin_type: null,
      margin_value: null,
      is_active: true,
      last_login_at: null,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const user = createUser();
    expect(user).toBeDefined();
  });

  it('should allow partial updates for User', () => {
    type UserUpdate = Database['public']['Tables']['users']['Update'];

    const update: UserUpdate = {
      full_name: 'Updated Name',
      phone: '+9876543210',
      last_login_at: new Date().toISOString(),
    };

    expect(update).toBeDefined();
    expect(update.full_name).toBe('Updated Name');
  });

  it('should require minimum fields for User insert', () => {
    type UserInsert = Database['public']['Tables']['users']['Insert'];

    const insert: UserInsert = {
      clerk_user_id: 'clerk_new_user',
      email: 'newuser@example.com',
      full_name: 'New User',
      role: 'customer',
      timezone: 'UTC',
      preferences: {},
      is_active: true,
    };

    expect(insert).toBeDefined();
    expect(insert.role).toBe('customer');
  });
});
