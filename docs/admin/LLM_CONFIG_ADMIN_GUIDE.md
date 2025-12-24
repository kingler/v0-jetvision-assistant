# LLM Provider Configuration Admin Guide

## Overview

This guide explains the admin-only LLM provider configuration system, which allows administrators to manage LLM settings including API keys, model selection, and parameters through a secure web interface.

## Features

✅ **Secure API Key Storage** - API keys are encrypted using AES-256-GCM before storage  
✅ **Admin-Only Access** - Role-based access control restricts configuration to admin users  
✅ **Database-Backed Configuration** - Settings stored in Supabase with RLS policies  
✅ **Three-Tier Configuration Precedence** — Database (with is_active/is_default), environment variables, hardcoded defaults  
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

### Secure Key Storage

**⚠️ Production Requirement**: Never store `ENCRYPTION_KEY` in `.env.local` or commit it to version control.

#### Secrets Manager Integration

Store `ENCRYPTION_KEY` in a dedicated secrets manager:

- **AWS Secrets Manager**: Use parameter store or secrets manager
- **HashiCorp Vault**: Store in KV secrets engine
- **Doppler**: Use project secrets with environment-specific values
- **Azure Key Vault**: Store as a secret with versioning
- **Google Secret Manager**: Use secret versions for rotation

#### Encryption Key Access Control

- **IAM/Role-Based Access**: Restrict access to encryption key via IAM policies or role-based access control
  - Only application runtime roles should have read access
  - Only security/admin roles should have write/update access
  - Use least-privilege principle
- **Audit Logging**: Enable audit logging for all key access and modifications
  - Log who accessed the key, when, and from where
  - Monitor for unauthorized access attempts
  - Set up alerts for suspicious activity

#### Implementation Example

```typescript
// Load encryption key from secrets manager (pseudo-code)
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const getEncryptionKey = async (): Promise<string> => {
  const client = new SecretsManager({ region: 'us-east-1' });
  const secret = await client.getSecretValue({
    SecretId: 'llm-config/encryption-key',
  });
  return secret.SecretString;
};
```

### Key Rotation Procedure

Regular key rotation is critical for security. Follow this procedure:

1. **Create New Key Version**
   - Generate new encryption key: `openssl rand -hex 32`
   - Store in secrets manager with version identifier (e.g., `v2`, timestamp)
   - Keep old key version accessible during transition period

2. **Support Dual-Key Decryption**
   - Update application to support decrypting with both old and new keys
   - Attempt decryption with new key first, fallback to old key
   - This allows zero-downtime rotation

   **Implementation Details:**

   **a. Persist Key Version Identifier**

   Store a key version identifier alongside each ciphertext to track which key encrypted the value. Options:

   - **Database metadata field**: Add `encryption_key_version` column to tables storing encrypted data
   - **Version prefix in ciphertext**: Prepend version to encrypted string (e.g., `v2:encrypted:...`)
   - **Separate version table**: Maintain mapping of record ID to key version

   Example database schema addition:

   ```sql
   ALTER TABLE llm_config
   ADD COLUMN encryption_key_version TEXT DEFAULT 'v1';
   ```

   **b. Implement Fallback Logic in `lib/utils/encryption.ts`**

   Add dual-key decryption support to the central encryption module:

   ```typescript
   /**
    * Decrypt with fallback to multiple keys
    * Tries keys in order until one succeeds
    * 
    * @param ciphertext - Encrypted data with optional version prefix
    * @param keys - Array of encryption keys to try (newest first)
    * @returns Decrypted plaintext
    * @throws Error if all keys fail
    */
   export function decryptWithFallback(
     ciphertext: string,
     keys: Array<{ version: string; key: Buffer }>
   ): { plaintext: string; keyVersion: string } {
     // Extract version if present (format: "v2:encrypted:...")
     const versionMatch = ciphertext.match(/^(v\d+):(.+)$/);
     const storedVersion = versionMatch ? versionMatch[1] : null;
     const encryptedData = versionMatch ? versionMatch[2] : ciphertext;
     
     // Try keys in order (newest first, unless version indicates old key)
     const keyOrder = storedVersion 
       ? keys.sort((a, b) => {
           // If version matches, prioritize that key
           if (a.version === storedVersion) return -1;
           if (b.version === storedVersion) return 1;
           // Otherwise newest first
           return b.version.localeCompare(a.version);
         })
       : keys; // No version = try newest first
     
     for (const { version, key } of keyOrder) {
       try {
         const plaintext = decryptWithKey(encryptedData, key);
         console.log(`✅ Decryption succeeded with key version: ${version}`);
         return { plaintext, keyVersion: version };
       } catch (error) {
         // Try next key
         continue;
       }
     }
     
     throw new Error('Decryption failed with all provided keys');
   }
   ```

   **c. Write Path Pattern**

   Always stamp the current key version when encrypting:

   ```typescript
   /**
    * Encrypt with current key version
    */
   export function encryptWithVersion(plaintext: string): string {
     const currentKeyVersion = process.env.ENCRYPTION_KEY_VERSION || 'v1';
     const encrypted = encrypt(plaintext);
     // Prepend version: "v2:encrypted:..."
     return `${currentKeyVersion}:${encrypted}`;
   }
   ```

   Update all write operations to use `encryptWithVersion()`:

   ```typescript
   // In API routes or services
   const encrypted = encryptWithVersion(apiKey);
   await db.update('llm_config', {
     api_key_encrypted: encrypted,
     encryption_key_version: currentKeyVersion, // Also store in DB for querying
   });
   ```

   **d. Read Path Pattern**

   Implement fallback logic that tries the current/new key first, then falls back to old key:

   ```typescript
   /**
    * Decrypt with automatic fallback
    * Tries current key first, falls back to previous key if needed
    */
   export function decryptWithAutomaticFallback(ciphertext: string): string {
     const currentKeyVersion = process.env.ENCRYPTION_KEY_VERSION || 'v1';
     const previousKeyVersion = process.env.PREVIOUS_ENCRYPTION_KEY_VERSION;
     
     // Get keys from environment or secrets manager
     const keys = [
       { version: currentKeyVersion, key: getEncryptionKey() },
       ...(previousKeyVersion ? [{ 
         version: previousKeyVersion, 
         key: getPreviousEncryptionKey() 
       }] : []),
     ];
     
     const result = decryptWithFallback(ciphertext, keys);
     
     // Log if old key was used (indicates migration needed)
     if (result.keyVersion !== currentKeyVersion) {
       console.warn(
         `⚠️  Decrypted with old key version ${result.keyVersion}. ` +
         `Consider re-encrypting this record with current key ${currentKeyVersion}.`
       );
     }
     
     return result.plaintext;
   }
   ```

   Update all read operations to use `decryptWithAutomaticFallback()`:

   ```typescript
   // In API routes or services
   const encrypted = config.api_key_encrypted;
   const apiKey = decryptWithAutomaticFallback(encrypted);
   ```

   **e. Background Migration Job**

   Once key rotation is verified working, run a background job to re-encrypt all data with the new key:

   ```typescript
   /**
    * Background migration: Re-encrypt all records with current key
    * Run this after verifying dual-key decryption works
    */
   async function migrateToNewKey() {
     const currentKeyVersion = process.env.ENCRYPTION_KEY_VERSION || 'v1';
     const records = await db.query(
       'SELECT id, api_key_encrypted, encryption_key_version FROM llm_config'
     );
     
     for (const record of records) {
       // Skip if already using current key
       if (record.encryption_key_version === currentKeyVersion) {
         continue;
       }
       
       try {
         // Decrypt with old key (automatic fallback handles this)
         const plaintext = decryptWithAutomaticFallback(record.api_key_encrypted);
         
         // Re-encrypt with new key
         const reEncrypted = encryptWithVersion(plaintext);
         
         // Update record
         await db.update('llm_config', {
           id: record.id,
           api_key_encrypted: reEncrypted,
           encryption_key_version: currentKeyVersion,
         });
         
         console.log(`✅ Migrated record ${record.id} to key version ${currentKeyVersion}`);
       } catch (error) {
         console.error(`❌ Failed to migrate record ${record.id}:`, error);
         // Continue with next record
       }
     }
   }
   ```

   Schedule this job to run periodically (e.g., daily) until all records are migrated, then disable old key access.

3. **Re-encrypt Stored API Keys**
   - Query all encrypted API keys from database
   - Decrypt using old key
   - Re-encrypt using new key
   - Update database records with newly encrypted values
   - **Alternative**: Implement envelope encryption for easier rotation

4. **Update Configuration**
   - Update secrets manager to point to new key version
   - Update application configuration to use new key
   - Verify application can decrypt all API keys

5. **Test Rollback Procedure**
   - Test ability to rollback to previous key version
   - Verify old key can still decrypt if needed
   - Document rollback steps

6. **Complete Rotation**
   - After successful transition (typically 7-30 days), disable old key version
   - Remove old key from secrets manager (or mark as deprecated)
   - Update documentation with new key version

**Rotation Schedule**: Rotate encryption keys at least annually, or immediately after any security incident.

### Incident Response: Key Compromise

If the encryption key is suspected or confirmed to be compromised, follow this checklist immediately:

#### Immediate Actions (Within 1 Hour)

- [ ] **Rotate/Revoke Compromised Key**
  - Generate new encryption key immediately
  - Revoke/disable compromised key in secrets manager
  - Update application to use new key

- [ ] **Re-encrypt or Invalidate Affected API Keys**
  - Re-encrypt all stored API keys with new encryption key
  - **OR** if re-encryption not immediately possible:
    - Mark all API keys as compromised in database
    - Invalidate all API keys at provider level (OpenAI, Anthropic, etc.)
    - Require admins to re-enter API keys

- [ ] **Rotate Dependent Service Credentials**
  - Rotate all API keys stored in the system (OpenAI, Anthropic, etc.)
  - Update any service accounts or OAuth tokens
  - Revoke and regenerate any related credentials

#### Investigation Phase (Within 24 Hours)

- [ ] **Notify Stakeholders**
  - Notify security team and management
  - Document incident timeline
  - Prepare communication for affected users if necessary

- [ ] **Review Audit Logs**
  - Review all access logs for encryption key
  - Identify unauthorized access attempts
  - Determine scope of compromise
  - Document findings

- [ ] **Assess Impact**
  - Determine which API keys were exposed
  - Identify any data breaches
  - Assess potential financial impact (API usage abuse)

#### Post-Incident (Within 7 Days)

- [ ] **Remediation**
  - Implement additional security controls
  - Review and update access policies
  - Enhance monitoring and alerting

- [ ] **Update Rotation Policies**
  - Review key rotation procedures
  - Update documentation with lessons learned
  - Implement more frequent rotation if needed
  - Consider implementing automated key rotation

- [ ] **Incident Report**
  - Document full incident timeline
  - Create post-mortem report
  - Update security runbooks

**Emergency Contact**: Maintain a 24/7 security contact for key compromise incidents.

### Access Control

- **RLS Policies**: Database-level restrictions ensure only admins can access
- **API Middleware**: All API routes protected with `withRoles(['admin'])`
- **Frontend Checks**: UI components check user role before rendering

### Audit Trail

- `created_by` and `updated_by` fields track admin actions
- All configuration changes are logged with timestamps
- Encryption key access should be logged via secrets manager audit logs

## API Endpoints

### GET `/api/admin/llm-config`

Get all LLM configurations (admin only)

**Request:**

```http
GET /api/admin/llm-config
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "provider": "openai",
      "provider_name": "OpenAI",
      "default_model": "gpt-4",
      "available_models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
      "default_temperature": 0.7,
      "default_max_tokens": 8192,
      "default_top_p": 1.0,
      "default_frequency_penalty": 0.0,
      "default_presence_penalty": 0.0,
      "organization_id": "org-abc123",
      "is_active": true,
      "is_default": true,
      "metadata": {},
      "created_by": "user_2abc123def456",
      "updated_by": "user_2abc123def456",
      "created_at": "2025-12-23T10:30:00.000Z",
      "updated_at": "2025-12-23T10:30:00.000Z",
      "has_api_key": true
    }
  ]
}
```

**Note:** The `api_key_encrypted` field is excluded from responses for security. The `has_api_key` boolean indicates if an encrypted key exists.

---

### POST `/api/admin/llm-config`

Create new configuration (admin only)

**Request:**

```http
POST /api/admin/llm-config
Content-Type: application/json
```

**Request Body:**

```json
{
  "provider": "openai",
  "provider_name": "OpenAI",
  "api_key": "sk-proj-abc123...",
  "default_model": "gpt-4",
  "available_models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
  "default_temperature": 0.7,
  "default_max_tokens": 8192,
  "default_top_p": 1.0,
  "default_frequency_penalty": 0.0,
  "default_presence_penalty": 0.0,
  "organization_id": "org-abc123",
  "is_active": true,
  "is_default": false,
  "metadata": {}
}
```

**Response (201 Created):**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "provider": "openai",
    "provider_name": "OpenAI",
    "default_model": "gpt-4",
    "available_models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
    "default_temperature": 0.7,
    "default_max_tokens": 8192,
    "default_top_p": 1.0,
    "default_frequency_penalty": 0.0,
    "default_presence_penalty": 0.0,
    "organization_id": "org-abc123",
    "is_active": true,
    "is_default": false,
    "metadata": {},
    "created_by": "user_2abc123def456",
    "updated_by": "user_2abc123def456",
    "created_at": "2025-12-23T10:30:00.000Z",
    "updated_at": "2025-12-23T10:30:00.000Z",
    "has_api_key": true
  },
  "message": "LLM configuration created successfully"
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "Invalid API key",
  "details": "The provided API key is invalid or unauthorized"
}
```

### PUT `/api/admin/llm-config`

Update existing configuration (admin only)

**Request:**

```http
PUT /api/admin/llm-config
Content-Type: application/json
```

**Request Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "default_model": "gpt-4-turbo",
  "default_temperature": 0.8,
  "is_default": true,
  "is_active": true
}
```

**Note:** Only include fields you want to update. The `api_key` field is optional and will be tested before updating.

**Response (200 OK):**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "provider": "openai",
    "provider_name": "OpenAI",
    "default_model": "gpt-4-turbo",
    "available_models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
    "default_temperature": 0.8,
    "default_max_tokens": 8192,
    "default_top_p": 1.0,
    "default_frequency_penalty": 0.0,
    "default_presence_penalty": 0.0,
    "organization_id": "org-abc123",
    "is_active": true,
    "is_default": true,
    "metadata": {},
    "created_by": "user_2abc123def456",
    "updated_by": "user_2abc123def456",
    "created_at": "2025-12-23T10:30:00.000Z",
    "updated_at": "2025-12-23T11:45:00.000Z",
    "has_api_key": true
  },
  "message": "LLM configuration updated successfully"
}
```

**Error Response (404 Not Found):**

```json
{
  "error": "Configuration not found"
}
```

**Error Response (409 Conflict):**

```json
{
  "error": "Concurrent update conflict",
  "details": "Another request is setting a default configuration. Please retry."
}
```

---

### DELETE `/api/admin/llm-config?id=<id>`

Delete configuration (admin only)

**Request:**

```http
DELETE /api/admin/llm-config?id=550e8400-e29b-41d4-a716-446655440000
```

**Query Parameters:**

- `id` (required): UUID of the configuration to delete

**Response (200 OK):**

```json
{
  "message": "LLM configuration deleted successfully"
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "Cannot delete default configuration",
  "message": "Please set another configuration as default before deleting this one"
}
```

**Error Response (400 Bad Request - Missing ID):**

```json
{
  "error": "Configuration ID is required"
}
```

---

### POST `/api/admin/llm-config/test`

Test API key connectivity (admin only)

**Request:**

```http
POST /api/admin/llm-config/test
Content-Type: application/json
```

**Request Body:**

```json
{
  "provider": "openai",
  "api_key": "sk-proj-abc123...",
  "organization_id": "org-abc123"
}
```

**Success Response (200 OK):**

```json
{
  "valid": true,
  "message": "API key is valid",
  "available_models": [
    "gpt-4",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
    "gpt-4-0125-preview",
    "gpt-4-turbo-preview",
    "gpt-3.5-turbo-0125",
    "text-embedding-3-small",
    "text-embedding-3-large",
    "text-embedding-ada-002",
    "whisper-1"
  ]
}
```

**Failure Response (400 Bad Request - Invalid Key):**

```json
{
  "valid": false,
  "error": "Invalid API key",
  "details": "The provided API key is invalid or unauthorized"
}
```

**Failure Response (429 Too Many Requests - Rate Limit):**

```json
{
  "valid": false,
  "error": "Rate limit exceeded",
  "details": "The API key has exceeded its rate limit. Please try again later."
}
```

**Failure Response (400 Bad Request - Validation Error):**

```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["api_key"],
      "message": "API key is required"
    }
  ]
}
```

**Failure Response (501 Not Implemented - Unsupported Provider):**

```json
{
  "valid": false,
  "error": "Provider not yet implemented",
  "details": "Testing for anthropic is not yet implemented"
}
```

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

## Configuration Loading and Precedence

The system loads LLM configuration in a strict precedence order. Each level is checked in sequence, and the first available configuration is used.

### Precedence Order

1. **Database Configuration (Highest Priority)**
   - Selects a record where `is_active=true` AND `is_default=true`
   - Must match both conditions exactly
   - If exactly one matching record exists, it is used
   - API key is decrypted from `api_key_encrypted` field

2. **Environment Variables (Fallback)**
   - Used when no database configuration matches the criteria
   - Required: `OPENAI_API_KEY`
   - Optional: `OPENAI_ORGANIZATION_ID`, `OPENAI_DEFAULT_MODEL`, `OPENAI_TEMPERATURE`, etc.
   - See environment variable list below

3. **Hardcoded Defaults (Final Fallback)**
   - Defined in `lib/config/openai-config.ts`
   - Used when environment variables are missing specific values
   - Default model: `gpt-4`
   - Default temperature: `0.7`
   - Default max tokens: `8192`

### Handling Multiple Active Configurations

The system uses a strict selection rule to handle multiple database configurations:

**Tie-Breaking Rule**: The query selects records with `is_default=true` AND `is_active=true` using `.single()`, which expects exactly one result.

- **Case 1: Exactly one default active config** → This config is used
- **Case 2: Zero default active configs** → Falls back to environment variables
- **Case 3: Multiple default active configs** → Query fails (`.single()` throws), system falls back to environment variables

**Important**: The system does NOT automatically select the "most recent" or "first created" when multiple defaults exist. To ensure predictable behavior:

- **Best Practice**: Ensure only ONE configuration has `is_default=true` at any time
- **If multiple defaults exist**: The system will fall back to environment variables, and you should update the database to have exactly one default

### Configuration Examples

#### Example 1: Single Default Active Config

**Database State:**

- Config A: `is_active=true`, `is_default=true`
- Config B: `is_active=true`, `is_default=false`
- Config C: `is_active=false`, `is_default=true`

**Query Executed:**

```sql
SELECT * FROM llm_config WHERE is_default = true AND is_active = true;
```

**Query Result:**

```text
1 row returned:
- id: 550e8400-e29b-41d4-a716-446655440000 (Config A)
- is_active: true
- is_default: true
- provider: 'openai'
- default_model: 'gpt-4'
- ... (other columns)
```

**System Behavior**: Config A is selected and used. The `.single()` method succeeds with exactly one match.

---

#### Example 2: No Default Active Config

**Database State:**

- Config A: `is_active=true`, `is_default=false`
- Config B: `is_active=false`, `is_default=true`
- Config C: `is_active=false`, `is_default=false`

**Query Executed:**

```sql
SELECT * FROM llm_config WHERE is_default = true AND is_active = true;
```

**Query Result:**

```text
0 rows returned
```

**System Behavior**: Falls back to environment variables. The `.single()` method fails because no rows match both conditions. System uses `OPENAI_API_KEY` and related environment variables.

---

#### Example 3: Multiple Default Active Configs (Edge Case)

**Database State:**

- Config A: `is_active=true`, `is_default=true`
- Config B: `is_active=true`, `is_default=true`
- Config C: `is_active=true`, `is_default=false`

**Query Executed:**

```sql
SELECT * FROM llm_config WHERE is_default = true AND is_active = true;
```

**Query Result:**

```text
2 rows returned:
- id: 550e8400-e29b-41d4-a716-446655440000 (Config A)
- id: 660e8400-e29b-41d4-a716-446655440001 (Config B)
```

**System Behavior**: Falls back to environment variables. The `.single()` method throws an error because multiple rows match (Supabase `.single()` requires exactly one row). System uses `OPENAI_API_KEY` and related environment variables.

**Resolution**: Update one config to `is_default=false` to restore database precedence:

```sql
UPDATE llm_config SET is_default = false WHERE id = '660e8400-e29b-41d4-a716-446655440001';
```

---

#### Example 4: Database Config with Decryption Failure

**Database State:**

- Config A: `is_active=true`, `is_default=true`, but `ENCRYPTION_KEY` environment variable is invalid or missing

**Query Executed:**

```sql
SELECT * FROM llm_config WHERE is_default = true AND is_active = true;
```

**Query Result:**

```text
1 row returned:
- id: 550e8400-e29b-41d4-a716-446655440000 (Config A)
- is_active: true
- is_default: true
- api_key_encrypted: 'encrypted_value_here'
- ... (other columns)
```

**System Behavior**: Falls back to environment variables. The query succeeds and returns Config A, but decryption fails when attempting to decrypt `api_key_encrypted`. The system catches the decryption error and uses `OPENAI_API_KEY` and related environment variables instead.

**Resolution**: Ensure `ENCRYPTION_KEY` environment variable is set correctly and matches the key used to encrypt the stored API key.

### Environment Variables (Fallback Level 2)

When database configuration is unavailable, these environment variables are used:

- **`OPENAI_API_KEY`** (required) - API key for OpenAI
- **`OPENAI_ORGANIZATION_ID`** (optional) - Organization ID for billing
- **`OPENAI_DEFAULT_MODEL`** (optional, default: `gpt-4`) - Model name
- **`OPENAI_TEMPERATURE`** (optional, default: `0.7`) - Temperature parameter
- **`OPENAI_MAX_TOKENS`** (optional, default: `8192`) - Maximum tokens
- **`OPENAI_TOP_P`** (optional, default: `1.0`) - Top-p sampling
- **`OPENAI_FREQUENCY_PENALTY`** (optional, default: `0.0`) - Frequency penalty
- **`OPENAI_PRESENCE_PENALTY`** (optional, default: `0.0`) - Presence penalty

### Hardcoded Defaults (Fallback Level 3)

Defined in `lib/config/openai-config.ts`:

```typescript
DEFAULT_MODEL: 'gpt-4'
PARAMETERS: {
  temperature: 0.7,
  maxTokens: 8192,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
}
```

These values are used when environment variables are not set.

## Troubleshooting

### "Access denied" Error

- Verify your user has `admin` role in the `users` table
- Run: `tsx scripts/add-admin-user.ts your-email@example.com`

### "Failed to decrypt API key" Error

**Production Environment:**

- Verify `ENCRYPTION_KEY` exists and is accessible in your configured secrets manager (AWS Secrets Manager, HashiCorp Vault, Doppler, Azure Key Vault, or Google Secret Manager)
- Check that the application runtime role has read access to the encryption key
- Verify the key is 64 characters (32 bytes in hex)
- Review secrets manager audit logs for access issues
- Generate new key if needed: `openssl rand -hex 32`

**Local Development/Testing Only:**

- ⚠️ **Note**: Checking `.env.local` is only acceptable for local development/testing environments
- Verify `ENCRYPTION_KEY` is set in `.env.local` (local development only)
- Ensure key is 64 characters (32 bytes in hex)
- Generate new key: `openssl rand -hex 32`
- **Never commit `.env.local` to version control or use in production**

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
