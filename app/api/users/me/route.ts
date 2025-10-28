/**
 * Current User API Endpoints
 *
 * @route GET /api/users/me - Get current user profile
 * @route PATCH /api/users/me - Update current user profile
 *
 * Protected by RBAC: Requires authentication, users can only access their own data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRBAC } from '@/lib/middleware/rbac';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/users/me
 * Get current user profile
 *
 * @returns User profile data
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

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', userId)
        .single();

      if (error || !user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ user });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { resource: 'users', action: 'read_own' }
);

/**
 * PATCH /api/users/me
 * Update current user profile
 *
 * @body Partial user data to update
 * @returns Updated user profile
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
      const body = await req.json();

      // Prevent updating sensitive fields
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

      const { data: user, error } = await supabase
        .from('users')
        .update({
          ...allowedUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_user_id', userId)
        .select()
        .single();

      if (error || !user) {
        return NextResponse.json(
          { error: 'Failed to update user' },
          { status: 500 }
        );
      }

      return NextResponse.json({ user });
    } catch (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { resource: 'users', action: 'read_own' }
);
