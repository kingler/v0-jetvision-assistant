# LLM Provider Configuration Admin Guide

## Overview

This guide explains the admin-only LLM provider configuration system, which allows administrators to manage LLM settings including API keys, model selection, and parameters through a secure web interface.

## Features

✅ **Secure API Key Storage** - API keys are encrypted using AES-256-GCM before storage  
✅ **Admin-Only Access** - Role-based access control restricts configuration to admin users  
✅ **Database-Backed Configuration** - Settings stored in Supabase with RLS policies  
✅ **Fallback to Environment Variables** - Graceful fallback if no database config exists  
✅ **API Key Testing** - Built-in API key validation before saving  
✅ **Multi-Provider Support** - Ready for OpenAI, Anthropic, Google, Azure (OpenAI fully implemented)  

## Accessing the Admin Panel

1. **Ensure you have admin role**: Contact a system administrator or use the script:
   ```bash
   tsx scripts/add-admin-user.ts your-email@example.com
   ```

2. **Navigate to settings**: 
   - Go to `/settings/llm-config` in your browser
   - Or access via the settings panel (if linked in UI)

3. **Verify admin access**: The page will redirect non-admin users

## Configuration Workflow

### Step 1: Add OpenAI API Key

1. Navigate to `/settings/llm-config`
2. Select "OpenAI" as the provider
3. Enter your OpenAI API key (starts with `sk-`)
4. Click "Test" to validate the API key
5. Wait for confirmation that the key is valid

### Step 2: Configure Model Settings

1. **Default Model**: Select from available models (e.g., `gpt-4`, `gpt-4-turbo`)
2. **Temperature**: Controls randomness (0.0 = deterministic, 2.0 = very creative)
3. **Max Tokens**: Maximum response length (default: 8192)
4. **Top P**: Nucleus sampling parameter (0.0 - 1.0)
5. **Frequency/Presence Penalty**: Control repetition (-2.0 to 2.0)

### Step 3: Set as Default

1. Toggle "Set as Default" to make this the active configuration
2. Toggle "Active" to enable/disable this configuration
3. Click "Save Configuration"

## Database Schema

The configuration is stored in the `llm_config` table:

```sql
CREATE TABLE llm_config (
  id UUID PRIMARY KEY,
  provider TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL, -- Encrypted API key
  default_model TEXT NOT NULL,
  default_temperature DECIMAL(3, 2),
  default_max_tokens INTEGER,
  -- ... other fields
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT, -- Clerk user ID
  updated_by TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## Security

### Encryption

- API keys are encrypted using **AES-256-GCM** before storage
- Encryption key is stored in `ENCRYPTION_KEY` environment variable
- Generate a secure key: `openssl rand -hex 32`

### Access Control

- **RLS Policies**: Database-level restrictions ensure only admins can access
- **API Middleware**: All API routes protected with `withRoles(['admin'])`
- **Frontend Checks**: UI components check user role before rendering

### Audit Trail

- `created_by` and `updated_by` fields track admin actions
- All configuration changes are logged with timestamps

## API Endpoints

### GET `/api/admin/llm-config`
Get all LLM configurations (admin only)

### POST `/api/admin/llm-config`
Create new configuration (admin only)

### PUT `/api/admin/llm-config`
Update existing configuration (admin only)

### DELETE `/api/admin/llm-config?id=<id>`
Delete configuration (admin only)

### POST `/api/admin/llm-config/test`
Test API key connectivity (admin only)

## Integration with Agents

The system automatically loads configuration for all agents:

```typescript
// BaseAgent automatically loads config during initialization
const agent = await factory.createAndInitialize({
  type: AgentType.ORCHESTRATOR,
  name: 'RFP Orchestrator',
});

// Configuration is loaded from database with fallback to env vars
```

## Fallback Behavior

If no database configuration exists, the system falls back to:

1. **Environment Variables**:
   - `OPENAI_API_KEY` - API key
   - `OPENAI_ORGANIZATION_ID` - Organization ID (optional)
   - `OPENAI_DEFAULT_MODEL` - Default model (default: `gpt-4`)
   - `OPENAI_TEMPERATURE` - Temperature (default: `0.7`)

2. **Default Values**: Hardcoded defaults in `lib/config/openai-config.ts`

## Troubleshooting

### "Access denied" Error

- Verify your user has `admin` role in the `users` table
- Run: `tsx scripts/add-admin-user.ts your-email@example.com`

### "Failed to decrypt API key" Error

- Verify `ENCRYPTION_KEY` is set in `.env.local`
- Ensure key is 64 characters (32 bytes in hex)
- Generate new key: `openssl rand -hex 32`

### API Key Test Fails

- Verify API key format (OpenAI keys start with `sk-`)
- Check API key is active in OpenAI dashboard
- Verify organization ID if using organizational billing
- Check rate limits in OpenAI dashboard

### Configuration Not Applied

- Verify configuration is marked as "Active" and "Default"
- Check browser console for errors
- Restart application to clear cache
- Verify database migration `022_llm_config.sql` was applied

## Migration

To apply the database migration:

```bash
# Via Supabase Dashboard
# 1. Go to SQL Editor
# 2. Copy contents of supabase/migrations/022_llm_config.sql
# 3. Execute the SQL

# Or via Supabase CLI
supabase db push
```

## Adding New Providers

To add support for new providers (Anthropic, Google, etc.):

1. Update `AVAILABLE_MODELS` in `app/settings/llm-config/page.tsx`
2. Add provider test logic in `app/api/admin/llm-config/test/route.ts`
3. Update `getOpenAIClient()` in `lib/config/llm-config.ts` to handle new provider
4. Update agent initialization to support new provider client

## Related Files

- **Migration**: `supabase/migrations/022_llm_config.sql`
- **Encryption**: `lib/utils/encryption.ts`
- **Config Loader**: `lib/config/llm-config.ts`
- **API Routes**: `app/api/admin/llm-config/`
- **Settings UI**: `app/settings/llm-config/page.tsx`
- **Admin Script**: `scripts/add-admin-user.ts`

## Support

For issues or questions:
1. Check logs in browser console and server logs
2. Verify environment variables are set correctly
3. Ensure database migration is applied
4. Verify admin role is assigned correctly

