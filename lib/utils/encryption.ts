/**
 * Encryption Utility for Sensitive Data
 * 
 * Provides secure encryption/decryption for API keys and other sensitive data
 * using AES-256-GCM encryption algorithm.
 * 
 * @module lib/utils/encryption
 */

import crypto from 'crypto';

/**
 * Encryption configuration
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM auth tag
const KEY_LENGTH = 32; // 32 bytes for AES-256

/**
 * Get encryption key from environment variable
 * Falls back to a default key in development (NOT for production)
 * 
 * @returns Encryption key as Buffer
 * @throws Error if encryption key is not set in production
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    // In development, use a default key (warn about security)
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '⚠️  WARNING: ENCRYPTION_KEY not set. Using default key for development only. ' +
        'NEVER use default key in production!'
      );
      // Default key for development (32 bytes)
      return Buffer.from('dev-key-32-bytes-for-testing-only!!', 'utf8');
    }
    
    throw new Error(
      'ENCRYPTION_KEY environment variable is required in production. ' +
      'Generate a secure 32-byte key: openssl rand -hex 32'
    );
  }
  
  // Convert hex string to buffer
  if (key.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be 64 characters (32 bytes in hex format). ' +
      `Current length: ${key.length}. Generate with: openssl rand -hex 32`
    );
  }
  
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt sensitive data (e.g., API keys)
 * 
 * Uses AES-256-GCM encryption with authentication tag for integrity verification.
 * 
 * @param plaintext - The data to encrypt
 * @returns Encrypted data in format: "encrypted:{iv}:{authTag}:{encryptedData}"
 * 
 * @example
 * ```typescript
 * const encrypted = encrypt('sk-abc123...');
 * // Returns: "encrypted:abc123...:def456...:ghi789..."
 * ```
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Plaintext cannot be empty');
  }
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: "encrypted:{iv}:{authTag}:{encryptedData}"
  return `encrypted:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt encrypted data
 * 
 * @param encryptedData - Encrypted data in format: "encrypted:{iv}:{authTag}:{encryptedData}"
 * @returns Decrypted plaintext
 * @throws Error if decryption fails or data format is invalid
 * 
 * @example
 * ```typescript
 * const decrypted = decrypt('encrypted:abc123...:def456...:ghi789...');
 * // Returns: "sk-abc123..."
 * ```
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error('Encrypted data cannot be empty');
  }
  
  // Check if data is in encrypted format
  if (!encryptedData.startsWith('encrypted:')) {
    // If not encrypted, assume it's plaintext (backward compatibility)
    // This should only happen during migration
    console.warn('⚠️  WARNING: Decrypting non-encrypted data. This should only occur during migration.');
    return encryptedData;
  }
  
  // Parse encrypted format: "encrypted:{iv}:{authTag}:{encryptedData}"
  const parts = encryptedData.split(':');
  
  if (parts.length !== 4 || parts[0] !== 'encrypted') {
    throw new Error('Invalid encrypted data format. Expected: "encrypted:{iv}:{authTag}:{encryptedData}"');
  }
  
  const [, ivHex, authTagHex, encryptedHex] = parts;
  
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes, got ${iv.length}`);
    }
    
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH} bytes, got ${authTag.length}`);
    }
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
    throw new Error('Decryption failed: Unknown error');
  }
}

/**
 * Check if a string is in encrypted format
 * 
 * @param data - Data to check
 * @returns true if data is encrypted, false otherwise
 */
export function isEncrypted(data: string): boolean {
  return data.startsWith('encrypted:') && data.split(':').length === 4;
}

/**
 * Generate a secure encryption key (for setup)
 * 
 * This function generates a secure random key that can be used as ENCRYPTION_KEY.
 * 
 * @returns Hex-encoded encryption key (64 characters)
 * 
 * @example
 * ```typescript
 * const key = generateEncryptionKey();
 * console.log(`ENCRYPTION_KEY=${key}`);
 * ```
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

