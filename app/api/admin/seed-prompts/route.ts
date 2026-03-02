import { NextRequest, NextResponse } from 'next/server';
import { seedInitialPromptVersions } from '@/lib/self-improvement/seed-prompts';
import {
  SCENARIO_HANDLERS,
  RESPONSE_FORMATS,
} from '@/lib/prompts/jetvision-system-prompt';
import { withRoles } from '@/lib/middleware/rbac';

/**
 * POST /api/admin/seed-prompts - Seed initial prompt versions
 */
async function handlePost() {
  try {
    await seedInitialPromptVersions(SCENARIO_HANDLERS, RESPONSE_FORMATS);
    return NextResponse.json({ success: true, message: 'Prompt versions seeded' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const POST = withRoles(
  async (_req: NextRequest) => handlePost(),
  ['admin']
);
