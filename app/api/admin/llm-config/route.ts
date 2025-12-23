/**
 * Admin LLM Configuration API
 * 
 * Provides CRUD operations for LLM provider configuration.
 * Admin-only access with proper authorization checks.
 * 
 * @route /api/admin/llm-config
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/middleware/rbac';
import { createClient } from '@/lib/supabase/admin';
import { encrypt, decrypt } from '@/lib/utils/encryption';
import OpenAI from 'openai';
import { z } from 'zod';

/**
 * Request body schema for creating/updating LLM config
 */
const LLMConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'azure']).default('openai'),
  provider_name: z.string().min(1).default('OpenAI'),
  api_key: z.string().min(1, 'API key is required'),
  default_model: z.string().min(1).default('gpt-4'),
  available_models: z.array(z.string()).default(['gpt-4', 'gpt-4-turbo']),
  default_temperature: z.number().min(0).max(2).default(0.7),
  default_max_tokens: z.number().min(1).max(256000).default(8192),
  default_top_p: z.number().min(0).max(1).default(1.0),
  default_frequency_penalty: z.number().min(-2).max(2).default(0.0),
  default_presence_penalty: z.number().min(-2).max(2).default(0.0),
  organization_id: z.string().optional(),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
});

/**
 * Test API key connectivity
 */
async function testApiKey(
  provider: string,
  apiKey: string,
  organizationId?: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (provider === 'openai') {
      const openai = new OpenAI({
        apiKey,
        organization: organizationId,
      });
      
      // Test with a simple API call
      await openai.models.list();
      return { valid: true };
    }
    
    // For other providers, add similar tests here
    return { valid: true, error: 'Provider not yet implemented for testing' };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * GET /api/admin/llm-config
 * Get all LLM configurations (admin only)
 */
export const GET = withRoles(
  async (req: NextRequest, context) => {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('llm_config')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching LLM config:', error);
        return NextResponse.json(
          { error: 'Failed to fetch LLM configuration', details: error.message },
          { status: 500 }
        );
      }
      
      // Remove encrypted API keys from response (don't expose them)
      const safeData = data.map((config) => ({
        ...config,
        api_key_encrypted: undefined, // Remove from response
        has_api_key: !!config.api_key_encrypted, // Indicate if key exists
      }));
      
      return NextResponse.json({ data: safeData });
    } catch (error) {
      console.error('Unexpected error in GET /api/admin/llm-config:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  },
  ['admin']
);

/**
 * POST /api/admin/llm-config
 * Create new LLM configuration (admin only)
 */
export const POST = withRoles(
  async (req: NextRequest, context) => {
    try {
      const body = await req.json();
      
      // Validate request body
      const validationResult = LLMConfigSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationResult.error.errors,
          },
          { status: 400 }
        );
      }
      
      const config = validationResult.data;
      const { userId } = context!;
      
      // Test API key before saving
      const keyTest = await testApiKey(config.provider, config.api_key, config.organization_id);
      if (!keyTest.valid) {
        return NextResponse.json(
          {
            error: 'Invalid API key',
            details: keyTest.error || 'API key test failed',
          },
          { status: 400 }
        );
      }
      
      // Encrypt API key before storing
      const encryptedKey = encrypt(config.api_key);
      
      const supabase = createClient();
      
      // If this is set as default, unset other defaults for the same provider
      if (config.is_default) {
        await supabase
          .from('llm_config')
          .update({ is_default: false })
          .eq('provider', config.provider)
          .eq('is_default', true);
      }
      
      // Insert new configuration
      const { data, error } = await supabase
        .from('llm_config')
        .insert({
          provider: config.provider,
          provider_name: config.provider_name,
          api_key_encrypted: encryptedKey,
          default_model: config.default_model,
          available_models: config.available_models,
          default_temperature: config.default_temperature,
          default_max_tokens: config.default_max_tokens,
          default_top_p: config.default_top_p,
          default_frequency_penalty: config.default_frequency_penalty,
          default_presence_penalty: config.default_presence_penalty,
          organization_id: config.organization_id,
          is_active: config.is_active,
          is_default: config.is_default,
          metadata: config.metadata,
          created_by: userId,
          updated_by: userId,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating LLM config:', error);
        return NextResponse.json(
          { error: 'Failed to create LLM configuration', details: error.message },
          { status: 500 }
        );
      }
      
      // Return safe data (no encrypted key)
      const safeData = {
        ...data,
        api_key_encrypted: undefined,
        has_api_key: true,
      };
      
      return NextResponse.json(
        { data: safeData, message: 'LLM configuration created successfully' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Unexpected error in POST /api/admin/llm-config:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  },
  ['admin']
);

/**
 * PUT /api/admin/llm-config
 * Update existing LLM configuration (admin only)
 */
export const PUT = withRoles(
  async (req: NextRequest, context) => {
    try {
      const body = await req.json();
      const { id, ...updateData } = body;
      
      if (!id) {
        return NextResponse.json(
          { error: 'Configuration ID is required' },
          { status: 400 }
        );
      }
      
      const { userId } = context!;
      
      const supabase = createClient();
      
      // Fetch existing configuration
      const { data: existing, error: fetchError } = await supabase
        .from('llm_config')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError || !existing) {
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        );
      }
      
      // Prepare update object
      const update: Record<string, unknown> = {
        updated_by: userId,
      };
      
      // If API key is provided, encrypt it and test it
      if (updateData.api_key) {
        const keyTest = await testApiKey(
          updateData.provider || existing.provider,
          updateData.api_key,
          updateData.organization_id || existing.organization_id
        );
        
        if (!keyTest.valid) {
          return NextResponse.json(
            {
              error: 'Invalid API key',
              details: keyTest.error || 'API key test failed',
            },
            { status: 400 }
          );
        }
        
        update.api_key_encrypted = encrypt(updateData.api_key);
        delete updateData.api_key; // Remove from updateData
      }
      
      // Copy other fields
      Object.assign(update, updateData);
      
      // If setting as default, unset other defaults
      if (update.is_default === true) {
        await supabase
          .from('llm_config')
          .update({ is_default: false })
          .eq('provider', update.provider || existing.provider)
          .eq('is_default', true)
          .neq('id', id);
      }
      
      // Update configuration
      const { data, error } = await supabase
        .from('llm_config')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating LLM config:', error);
        return NextResponse.json(
          { error: 'Failed to update LLM configuration', details: error.message },
          { status: 500 }
        );
      }
      
      // Return safe data
      const safeData = {
        ...data,
        api_key_encrypted: undefined,
        has_api_key: !!data.api_key_encrypted,
      };
      
      return NextResponse.json({
        data: safeData,
        message: 'LLM configuration updated successfully',
      });
    } catch (error) {
      console.error('Unexpected error in PUT /api/admin/llm-config:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  },
  ['admin']
);

/**
 * DELETE /api/admin/llm-config
 * Delete LLM configuration (admin only)
 */
export const DELETE = withRoles(
  async (req: NextRequest, context) => {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
      
      if (!id) {
        return NextResponse.json(
          { error: 'Configuration ID is required' },
          { status: 400 }
        );
      }
      
      const supabase = createClient();
      
      // Check if this is the default config
      const { data: existing } = await supabase
        .from('llm_config')
        .select('is_default, provider')
        .eq('id', id)
        .single();
      
      if (existing?.is_default) {
        return NextResponse.json(
          {
            error: 'Cannot delete default configuration',
            message: 'Please set another configuration as default before deleting this one',
          },
          { status: 400 }
        );
      }
      
      const { error } = await supabase
        .from('llm_config')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting LLM config:', error);
        return NextResponse.json(
          { error: 'Failed to delete LLM configuration', details: error.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        message: 'LLM configuration deleted successfully',
      });
    } catch (error) {
      console.error('Unexpected error in DELETE /api/admin/llm-config:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  },
  ['admin']
);

