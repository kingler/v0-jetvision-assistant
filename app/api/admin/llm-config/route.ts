/**
 * Admin LLM Configuration API
 * 
 * Provides CRUD operations for LLM provider configuration.
 * Admin-only access with proper authorization checks.
 * 
 * @route /api/admin/llm-config
 * 
 * Note: Type assertions (as any) are used for llm_config table operations
 * until Supabase types are regenerated to include the llm_config table and
 * set_llm_config_default function. The code works correctly at runtime.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/middleware/rbac';
import { supabaseAdmin } from '@/lib/supabase/admin';
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
 * Partial schema for updating LLM config (all fields optional)
 * Excludes protected fields that should never be updated from request body.
 * Uses .strict() to reject any unknown fields (including protected fields like id, created_by, etc.)
 */
const LLMConfigUpdateSchema = LLMConfigSchema.partial().strict();
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
    return { valid: false, error: 'Provider validation not yet implemented. Only OpenAI is currently supported.' };
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
      const supabase = supabaseAdmin;
      
      // Note: Type assertion needed until Supabase types are regenerated to include llm_config table
      const { data, error } = await (supabase as any)
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
      const safeData = data.map((config: Record<string, unknown>) => ({
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
      
      const supabase = supabaseAdmin;
      
      // Insert new configuration with is_default = false initially
      // We'll set it as default atomically after insertion if needed
      // Note: Type assertion needed until Supabase types are regenerated to include llm_config table
      const { data, error } = await (supabase as any)
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
          is_default: false, // Insert as non-default first, then set atomically if needed
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
      
      // If this should be set as default, use atomic stored procedure to prevent race conditions
      // This ensures both unsetting existing defaults and setting the new config as default
      // happen atomically in a single transaction
      // Note: Type assertion needed until Supabase types are regenerated to include llm_config table
      if (config.is_default) {
        const { data: defaultUpdateResult, error: defaultError } = await (supabase as any)
          .rpc('set_llm_config_default', {
            p_config_id: data.id,
            p_provider: config.provider,
            p_is_default: true,
          });
        
        if (defaultError) {
          console.error('Error setting default LLM config:', defaultError);
          // Handle unique constraint violation (concurrent conflict detected)
          // PostgreSQL error code 23505 = unique_violation
          if (defaultError.code === '23505' || defaultError.message?.includes('unique') || defaultError.message?.includes('duplicate')) {
            // Clean up the inserted row since we couldn't set it as default
            await (supabase as any).from('llm_config').delete().eq('id', data.id);
            
            return NextResponse.json(
              {
                error: 'Concurrent update conflict',
                details: 'Another request is setting a default configuration. Please retry.',
              },
              { status: 409 }
            );
          }
          
          // If setting default failed but it's not a conflict, we still have the config
          // but it won't be default. Log the error but don't fail the request.
          console.warn('Failed to set config as default, but config was created:', defaultError);
        } else if (defaultUpdateResult && Array.isArray(defaultUpdateResult) && defaultUpdateResult.length > 0) {
          // Update data with the result from the stored procedure
          (data as any).is_default = defaultUpdateResult[0].is_default;
        }
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
      
      // Validate update data immediately to prevent arbitrary fields from bypassing schema
      // This ensures only allowed fields are present and protected properties cannot be updated
      const validationResult = LLMConfigUpdateSchema.safeParse(updateData);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationResult.error.errors,
            message: 'Invalid fields in update request. Protected fields (id, created_by, api_key_encrypted, created_at, updated_at, updated_by) cannot be updated.',
          },
          { status: 400 }
        );
      }
      
      // Use only validated fields from the parsed result - this is the source of truth
      // This ensures only schema-defined fields are used, preventing injection of protected properties
      const validatedUpdateData = validationResult.data;
      
      const { userId } = context!;
      
      const supabase = supabaseAdmin;
      
      // Fetch existing configuration
      // Note: Type assertion needed until Supabase types are regenerated to include llm_config table
      const { data: existing, error: fetchError } = await (supabase as any)
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
      
      // Prepare update object with only allowed fields
      const update: Record<string, unknown> = {
        updated_by: userId,
      };
      
      // Detect provider change without new API key
      // If provider is changing, we need to validate the existing key works with the new provider
      const isProviderChanging = validatedUpdateData.provider && validatedUpdateData.provider !== existing.provider;
      
      if (isProviderChanging && !validatedUpdateData.api_key) {
        // Provider is changing but no new key provided - test existing key with new provider
        if (!existing.api_key_encrypted) {
          return NextResponse.json(
            {
              error: 'API key required for provider change',
              message: 'No API key exists for this configuration. Please provide a new API key for the new provider.',
            },
            { status: 400 }
          );
        }
        
        // Decrypt existing key to test with new provider
        let decryptedKey: string;
        try {
          decryptedKey = decrypt(existing.api_key_encrypted);
        } catch (decryptError) {
          console.error('Error decrypting existing API key:', decryptError);
          return NextResponse.json(
            {
              error: 'Failed to decrypt existing API key',
              message: 'Please provide a new API key for the new provider.',
            },
            { status: 400 }
          );
        }
        
        // Test existing key with the new provider
        const keyTest = await testApiKey(
          validatedUpdateData.provider!,
          decryptedKey,
          validatedUpdateData.organization_id || existing.organization_id
        );
        
        // Clear decrypted key from memory as soon as we're done with it
        decryptedKey = ''; // Overwrite with empty string
        
        if (!keyTest.valid) {
          return NextResponse.json(
            {
              error: 'Invalid API key for new provider',
              message: `The existing API key is not valid for provider "${validatedUpdateData.provider}". Please provide a new API key.`,
              details: keyTest.error || 'API key test failed for new provider',
            },
            { status: 400 }
          );
        }
        
        // Key is valid for new provider - leave encrypted key as-is (no need to re-encrypt)
        // The provider field will be updated below, and the existing encrypted key remains valid
      }
      
      // If API key is provided, encrypt it and test it
      if (validatedUpdateData.api_key) {
        const keyTest = await testApiKey(
          validatedUpdateData.provider || existing.provider,
          validatedUpdateData.api_key,
          validatedUpdateData.organization_id || existing.organization_id
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
        
        // Encrypt and store the API key
        const apiKeyToEncrypt = validatedUpdateData.api_key;
        update.api_key_encrypted = encrypt(apiKeyToEncrypt);
      }
      
      // Safely copy only validated, allowed fields to update object
      // Explicitly whitelist fields that can be updated (excluding protected fields)
      const allowedUpdateFields = [
        'provider',
        'provider_name',
        'default_model',
        'available_models',
        'default_temperature',
        'default_max_tokens',
        'default_top_p',
        'default_frequency_penalty',
        'default_presence_penalty',
        'organization_id',
        'is_active',
        'is_default',
        'metadata',
      ] as const;
      
      // Only copy fields that are present in validated data and are in the whitelist
      // This double-checks that only whitelisted fields from the validated schema are used
      for (const field of allowedUpdateFields) {
        if (field in validatedUpdateData && validatedUpdateData[field] !== undefined) {
          update[field] = validatedUpdateData[field];
        }
      }
      
      // Resolve provider (from update or existing)
      const resolvedProvider = update.provider || existing.provider;
      
      // If setting as default, use atomic stored procedure to prevent race conditions
      // This ensures both unsetting existing defaults and setting the target as default
      // happen atomically in a single transaction, with the unique partial index preventing
      // concurrent conflicts at the database level
      // Note: Type assertion needed until Supabase types are regenerated to include llm_config table
      if (update.is_default === true) {
        const { data: defaultUpdateResult, error: defaultError } = await (supabase as any)
          .rpc('set_llm_config_default', {
            p_config_id: id,
            p_provider: resolvedProvider,
            p_is_default: true,
          });
        
        if (defaultError) {
          console.error('Error setting default LLM config:', defaultError);
          // Handle unique constraint violation (concurrent conflict detected)
          // PostgreSQL error code 23505 = unique_violation
          if (defaultError.code === '23505' || defaultError.message?.includes('unique') || defaultError.message?.includes('duplicate')) {
            return NextResponse.json(
              {
                error: 'Concurrent update conflict',
                details: 'Another request is setting a default configuration. Please retry.',
              },
              { status: 409 }
            );
          }
          return NextResponse.json(
            {
              error: 'Failed to update default configuration',
              details: defaultError.message,
            },
            { status: 500 }
          );
        }
        
        // Remove is_default from update object since it's already handled atomically
        delete update.is_default;
      } else if (update.is_default === false) {
        // If explicitly unsetting default, use the stored procedure for consistency
        const { error: defaultError } = await (supabase as any).rpc('set_llm_config_default', {
          p_config_id: id,
          p_provider: resolvedProvider,
          p_is_default: false,
        });
        
        if (defaultError) {
          console.error('Error unsetting default LLM config:', defaultError);
          return NextResponse.json(
            {
              error: 'Failed to update default configuration',
              details: defaultError.message,
            },
            { status: 500 }
          );
        }
        
        // Remove is_default from update object since it's already handled
        delete update.is_default;
      }
      
      // Update other configuration fields (excluding is_default if it was handled above)
      // Only perform this update if there are other fields to update
      let data = existing;
      let error = null;
      
      if (Object.keys(update).length > 1 || (Object.keys(update).length === 1 && !update.updated_by)) {
        // There are fields other than updated_by to update, or updated_by is the only field
        // Note: Type assertion needed until Supabase types are regenerated to include llm_config table
        const updateResult = await (supabase as any)
          .from('llm_config')
          .update(update)
          .eq('id', id)
          .select()
          .single();
        
        data = updateResult.data;
        error = updateResult.error;
      } else {
        // Only is_default changed (handled by stored procedure), but we still need to update audit fields
        // The stored procedure updates is_default and updated_at, but not updated_by
        // Perform an update to set updated_by so the audit trail is preserved
        // Note: Type assertion needed until Supabase types are regenerated to include llm_config table
        const updateResult = await (supabase as any)
          .from('llm_config')
          .update({ updated_by: userId })
          .eq('id', id)
          .select()
          .single();
        
        data = updateResult.data;
        error = updateResult.error;
      }
      
      if (error) {
        console.error('Error updating LLM config:', error);
        
        // Handle unique constraint violation (race condition detected)
        // PostgreSQL error code 23505 = unique_violation
        if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
          const provider = update.provider || existing.provider;
          return NextResponse.json(
            {
              error: 'Default configuration conflict',
              message: `Another configuration for provider "${provider}" was just set as default. Please try again.`,
              details: 'This can occur when multiple requests try to set a default simultaneously. The unique index prevents duplicate defaults.',
            },
            { status: 409 } // Conflict status code
          );
        }
        
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
      
      const supabase = supabaseAdmin;
      
      // Fetch existing configuration to check existence and default status
      // Note: Type assertion needed until Supabase types are regenerated to include llm_config table
      const { data: existing, error: fetchError } = await (supabase as any)
        .from('llm_config')
        .select('is_default, provider')
        .eq('id', id)
        .single();
      
      // Check if configuration exists - return 404 if not found
      if (fetchError || !existing) {
        return NextResponse.json(
          {
            error: 'Configuration not found',
            message: 'The specified LLM configuration does not exist',
          },
          { status: 404 }
        );
      }
      
      // Check if this is the default config - prevent deletion of default configuration
      if (existing.is_default) {
        return NextResponse.json(
          {
            error: 'Cannot delete default configuration',
            message: 'Please set another configuration as default before deleting this one',
          },
          { status: 400 }
        );
      }
      
      // Delete the configuration (we know it exists at this point)
      // Note: Type assertion needed until Supabase types are regenerated to include llm_config table
      const { error } = await (supabase as any)
        .from('llm_config')
        .delete()
        .eq('id', id);
      
      // Propagate any Supabase delete error
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

