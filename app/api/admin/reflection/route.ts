import { NextRequest, NextResponse } from 'next/server';
import { runReflection, canRunReflection } from '@/lib/self-improvement/reflection-engine';
import { selfImprovementDb } from '@/lib/self-improvement/db';
import { withRoles } from '@/lib/middleware/rbac';

/**
 * GET /api/admin/reflection - Get reflection status and recent logs
 */
async function handleGet() {
  try {
    const { canRun, reason } = await canRunReflection();

    const { data: recentLogs } = await selfImprovementDb
      .from('reflection_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: pendingSuggestions } = await selfImprovementDb
      .from('prompt_suggestions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      can_run_now: canRun,
      blocked_reason: reason || null,
      recent_reflections: recentLogs || [],
      pending_suggestions: pendingSuggestions || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/reflection - Trigger reflection manually
 */
async function handlePost() {
  try {
    const result = await runReflection();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const GET = withRoles(
  async (_req: NextRequest) => handleGet(),
  ['admin']
);

export const POST = withRoles(
  async (_req: NextRequest) => handlePost(),
  ['admin']
);
