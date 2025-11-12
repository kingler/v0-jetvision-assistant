/**
 * User Management API Endpoints (Admin Only)
 *
 * @route GET /api/users - List all users (admin only)
 * @route PATCH /api/users - Update any user (admin only)
 *
 * Protected by RBAC: Requires admin role
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRBAC } from '@/lib/middleware/rbac';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

/**
 * GET /api/users
 * List all users (admin only)
 *
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 50)
 * @query role - Filter by role
 * @returns Paginated list of users
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

      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
      const roleFilter = searchParams.get('role');

      const supabase = await createClient();
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      // Apply role filter if provided
      if (roleFilter) {
        query = query.eq('role', roleFilter);
      }

      const { data: users, error, count } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
          { error: 'Failed to fetch users' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        users: users || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    } catch (error) {
      console.error('Error in users list endpoint:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { resource: 'users', action: 'read' }
);

/**
 * PATCH /api/users
 * Update any user (admin only)
 *
 * @body userId - User ID to update
 * @body updates - Fields to update
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

      const body = await req.json();
      const { userId, ...updates } = body;

      if (!userId) {
        return NextResponse.json(
          { error: 'userId is required' },
          { status: 400 }
        );
      }

      // Prevent updating certain system fields
      const {
        id,
        clerk_user_id,
        created_at,
        ...allowedUpdates
      } = updates;

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
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        return NextResponse.json(
          { error: 'Failed to update user' },
          { status: 500 }
        );
      }

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ user });
    } catch (error) {
      console.error('Error in user update endpoint:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { resource: 'users', action: 'update' }
);
