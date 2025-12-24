/**
 * User Management API Endpoints (Admin Only)
 *
 * @route GET /api/users - List all ISO agents (admin only)
 * @route PATCH /api/users - Update any ISO agent (admin only)
 *
 * Note: This endpoint queries the `iso_agents` table but uses the logical
 * resource name 'users' for RBAC consistency with the permission matrix.
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
 * List all ISO agents (admin only)
 *
 * Queries the `iso_agents` table and returns a paginated list of ISO agent profiles.
 * The response uses the logical 'users' field name for API consistency.
 *
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 50)
 * @query role - Filter by role
 * @returns Paginated list of ISO agents (stored in `iso_agents` table)
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
      
      // Query iso_agents table - note: table name is 'iso_agents' but RBAC resource is 'users' for consistency
      let query = supabase
        .from('iso_agents')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      // Apply role filter if provided
      if (roleFilter) {
        query = query.eq('role', roleFilter);
      }

      const { data: isoAgents, error, count } = await query;

      if (error) {
        console.error('Error fetching ISO agents:', error);
        return NextResponse.json(
          { error: 'Failed to fetch users' },
          { status: 500 }
        );
      }

      // Return as 'users' for API consistency with /api/users/me endpoint
      return NextResponse.json({
        users: isoAgents || [],
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
  // RBAC resource is 'users' to match permission matrix, even though we query 'iso_agents' table
  { resource: 'users', action: 'read' }
);

/**
 * PATCH /api/users
 * Update any ISO agent (admin only)
 *
 * Updates the ISO agent profile in the `iso_agents` table.
 * The response uses the logical 'user' field name for API consistency.
 *
 * @body userId - ISO agent ID to update
 * @body updates - Fields to update
 * @returns Updated ISO agent profile (stored in `iso_agents` table)
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

      const body = await req.json() as Record<string, unknown>;
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

      // Update iso_agents table - note: table name is 'iso_agents' but RBAC resource is 'users' for consistency
      const { data: isoAgent, error } = await supabase
        .from('iso_agents')
        .update({
          ...allowedUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating ISO agent:', error);
        return NextResponse.json(
          { error: 'Failed to update user' },
          { status: 500 }
        );
      }

      if (!isoAgent) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Return as 'user' for API consistency with /api/users/me endpoint
      return NextResponse.json({ user: isoAgent });
    } catch (error) {
      console.error('Error in user update endpoint:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  // RBAC resource is 'users' to match permission matrix, even though we query 'iso_agents' table
  { resource: 'users', action: 'update' }
);
