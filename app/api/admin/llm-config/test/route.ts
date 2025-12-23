/**
 * Test LLM API Key Connectivity
 * 
 * Tests an API key without saving it to the database.
 * Admin-only access.
 * 
 * @route /api/admin/llm-config/test
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/middleware/rbac';
import OpenAI from 'openai';
import { z } from 'zod';

const TestKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'azure']).default('openai'),
  api_key: z.string().min(1, 'API key is required'),
  organization_id: z.string().optional(),
});

/**
 * POST /api/admin/llm-config/test
 * Test API key connectivity
 */
export const POST = withRoles(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      
      // Validate request body
      const validationResult = TestKeySchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationResult.error.errors,
          },
          { status: 400 }
        );
      }
      
      const { provider, api_key, organization_id } = validationResult.data;
      
      // Test API key based on provider
      if (provider === 'openai') {
        try {
          const openai = new OpenAI({
            apiKey: api_key,
            organization: organization_id,
          });
          
          // Test with a simple API call
          await openai.models.list();
          
          // Also try to get model info to verify access
          const models = await openai.models.list();
          const modelNames = models.data.map((m) => m.id).slice(0, 10);
          
          return NextResponse.json({
            valid: true,
            message: 'API key is valid',
            available_models: modelNames,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Check for common error types
          if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            return NextResponse.json(
              {
                valid: false,
                error: 'Invalid API key',
                details: 'The provided API key is invalid or unauthorized',
              },
              { status: 400 }
            );
          }
          
          if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
            return NextResponse.json(
              {
                valid: false,
                error: 'Rate limit exceeded',
                details: 'The API key has exceeded its rate limit. Please try again later.',
              },
              { status: 429 }
            );
          }
          
          return NextResponse.json(
            {
              valid: false,
              error: 'API key test failed',
              details: errorMessage,
            },
            { status: 400 }
          );
        }
      }
      
      // For other providers, add similar tests here
      return NextResponse.json(
        {
          valid: false,
          error: 'Provider not yet implemented',
          details: `Testing for ${provider} is not yet implemented`,
        },
        { status: 501 }
      );
    } catch (error) {
      console.error('Unexpected error in POST /api/admin/llm-config/test:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  },
  ['admin']
);

