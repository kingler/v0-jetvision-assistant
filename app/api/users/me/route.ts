/**
 * Current User API Endpoints
 *
 * @route GET /api/users/me - Get current ISO agent profile
 * @route PATCH /api/users/me - Update current ISO agent profile
 *
 * Note: This endpoint queries the `iso_agents` table but uses the logical
 * resource name 'users' for RBAC consistency with the permission matrix.
 *
 * Protected by RBAC: Requires authentication, users can only access their own data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRBAC } from '@/lib/middleware/rbac';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

/**
 * GET /api/users/me
 * Get current ISO agent profile
 *
 * Queries the `iso_agents` table using the authenticated user's Clerk ID.
 * Returns the ISO agent profile data for the current user.
 *
 * @returns ISO agent profile data (stored in `iso_agents` table)
 */
export const GET = withRBAC(
  async (req: NextRequest, context) => {
    try {
      if (!context) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const { userId } = context;
      const supabase = await createClient();

      // Query iso_agents table using Clerk user ID
      // Note: Table name is 'iso_agents' but RBAC resource is 'users' for consistency
      const { data: isoAgent, error } = await supabase
        .from('iso_agents')
        .select('*')
        .eq('clerk_user_id', userId)
        .single();

      if (error || !isoAgent) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Return as 'user' for API consistency with /api/users endpoint
      return NextResponse.json({ user: isoAgent });
    } catch (error) {
      console.error('Error fetching ISO agent profile:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  // RBAC resource is 'users' to match permission matrix, even though we query 'iso_agents' table
  { resource: 'users', action: 'read_own' }
);

/**
 * PATCH /api/users/me
 * Update current ISO agent profile
 *
 * Updates the ISO agent profile in the `iso_agents` table.
 * Users can only update their own profile (enforced by RBAC).
 *
 * @body Partial ISO agent data to update
 * @returns Updated ISO agent profile
 */
export const PATCH = withRBAC(
  async (req: NextRequest, context) => {
    try {
      if (!context) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const { userId } = context;
      const body = await req.json() as Record<string, any>;

      // Prevent updating sensitive fields (system-managed columns)
      const {
        id,
        clerk_user_id,
        role,
        created_at,
        updated_at,
        ...allowedUpdates
      } = body;

      if (Object.keys(allowedUpdates).length === 0) {
        return NextResponse.json(
          { error: 'No valid fields to update' },
          { status: 400 }
        );
      }

      const supabase = await createClient();

      // Update iso_agents table using Clerk user ID
      // Note: Table name is 'iso_agents' but RBAC resource is 'users' for consistency
      const { data: isoAgent, error } = await supabase
        .from('iso_agents')
        .update({
          ...allowedUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_user_id', userId)
        .select()
        .single();

      if (error || !isoAgent) {
        return NextResponse.json(
          { error: 'Failed to update user' },
          { status: 500 }
        );
      }

      // Return as 'user' for API consistency with /api/users endpoint
      return NextResponse.json({ user: isoAgent });
    } catch (error) {
      console.error('Error updating ISO agent profile:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  // RBAC resource is 'users' to match permission matrix, even though we query 'iso_agents' table
  // PATCH endpoint requires 'update_own' action to allow users to update their own profile
  { resource: 'users', action: 'update_own' }
);
