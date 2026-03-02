// ---------------------------------------------------------------------------
// Self-Improving Agent -- Prompt Version Manager
// ---------------------------------------------------------------------------
//
// Manages versioned system prompt sections stored in `system_prompt_versions`.
// Provides an in-memory cache with TTL so the DB is not hit on every request,
// plus helpers to create new versions and roll back to previous ones.
// ---------------------------------------------------------------------------

import { supabaseAdmin } from '@/lib/supabase/admin';
import { PROMPT_CACHE_TTL_MS } from './constants';
import type { PromptSection, SystemPromptVersion } from './types';

// ---- PromptCache -----------------------------------------------------------

/**
 * Simple in-memory cache with TTL for prompt sections.
 */
export class PromptCache {
  private cache = new Map<string, { value: string; expiry: number }>();
  private ttl: number;

  constructor(ttlMs: number = PROMPT_CACHE_TTL_MS) {
    this.ttl = ttlMs;
  }

  /** Return cached value if present and not expired, otherwise null. */
  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  /** Store a value with the configured TTL. */
  set(key: string, value: string): void {
    this.cache.set(key, { value, expiry: Date.now() + this.ttl });
  }

  /** Remove all cached entries. */
  clear(): void {
    this.cache.clear();
  }
}

// Singleton cache instance
const promptCache = new PromptCache();

// ---- Public API ------------------------------------------------------------

/**
 * Get the active prompt content for a section.
 * Uses in-memory cache with 5-minute TTL.
 * Returns null if no active version exists (caller should use hardcoded fallback).
 */
export async function getActivePromptSection(
  section: PromptSection
): Promise<string | null> {
  // Check cache first
  const cached = promptCache.get(section);
  if (cached) return cached;

  const { data, error } = await supabaseAdmin
    .from('system_prompt_versions')
    .select('content')
    .eq('section', section)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null; // Caller uses hardcoded fallback
  }

  promptCache.set(section, data.content);
  return data.content;
}

/**
 * Create a new prompt version for a section.
 * Deactivates the current version and activates the new one.
 * If the current version is locked, the update is skipped.
 * On insert failure the previous version is re-activated.
 */
export async function createPromptVersion(
  section: PromptSection,
  content: string,
  changeReason: string,
  createdBy: 'system' | 'human' = 'system'
): Promise<SystemPromptVersion | null> {
  // Get current active version
  const { data: current } = await supabaseAdmin
    .from('system_prompt_versions')
    .select('id, version, locked')
    .eq('section', section)
    .eq('is_active', true)
    .single();

  // Don't modify locked prompts
  if (current?.locked) {
    console.warn(
      `[Self-Improvement] Prompt section "${section}" is locked, skipping update`
    );
    return null;
  }

  const newVersion = (current?.version || 0) + 1;

  // Deactivate current
  if (current) {
    await supabaseAdmin
      .from('system_prompt_versions')
      .update({ is_active: false })
      .eq('id', current.id);
  }

  // Insert new version
  const { data: newPrompt, error } = await supabaseAdmin
    .from('system_prompt_versions')
    .insert({
      version: newVersion,
      section,
      content,
      is_active: true,
      created_by: createdBy,
      change_reason: changeReason,
      previous_version_id: current?.id || null,
    })
    .select()
    .single();

  if (error) {
    console.error(
      '[Self-Improvement] Failed to create prompt version:',
      error.message
    );
    // Attempt to reactivate old version
    if (current) {
      await supabaseAdmin
        .from('system_prompt_versions')
        .update({ is_active: true })
        .eq('id', current.id);
    }
    return null;
  }

  // Clear cache for this section
  promptCache.clear();

  return newPrompt as SystemPromptVersion;
}

/**
 * Rollback to a specific version by its ID.
 * Deactivates the current active version for the section and activates the target.
 */
export async function rollbackPromptVersion(
  section: PromptSection,
  targetVersionId: string
): Promise<boolean> {
  // Deactivate current
  await supabaseAdmin
    .from('system_prompt_versions')
    .update({ is_active: false })
    .eq('section', section)
    .eq('is_active', true);

  // Activate target
  const { error } = await supabaseAdmin
    .from('system_prompt_versions')
    .update({ is_active: true })
    .eq('id', targetVersionId);

  if (error) {
    console.error('[Self-Improvement] Rollback failed:', error.message);
    return false;
  }

  promptCache.clear();
  return true;
}

/** Export cache for testing */
export { promptCache };
