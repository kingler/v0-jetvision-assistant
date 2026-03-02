// ---------------------------------------------------------------------------
// Self-Improving Agent -- Knowledge Base Service
// ---------------------------------------------------------------------------

import { selfImprovementDb } from './db';
import { MAX_AUTO_UPDATES_PER_DAY } from './constants';
import type { KnowledgeEntry, KnowledgeCategory } from './types';

const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  aircraft_patterns: 'Aircraft Patterns',
  client_preferences: 'Client Preferences',
  pricing_insights: 'Pricing Insights',
  workflow_tips: 'Workflow Tips',
  operator_notes: 'Operator Notes',
};

/**
 * Render active knowledge base entries into a prompt section.
 */
export function renderKnowledgeBase(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return '';

  const byCategory = new Map<KnowledgeCategory, KnowledgeEntry[]>();
  for (const entry of entries) {
    const cat = entry.category as KnowledgeCategory;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(entry);
  }

  const sections: string[] = ['## Learned Patterns\n'];

  for (const [category, items] of byCategory) {
    sections.push(`### ${CATEGORY_LABELS[category] || category}`);
    for (const item of items) {
      sections.push(`- **${item.title}**: ${item.content}`);
    }
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Fetch all active knowledge base entries from the database.
 */
export async function getActiveKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  const { data, error } = await selfImprovementDb
    .from('knowledge_base')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('times_relevant', { ascending: false });

  if (error) {
    console.error('[Self-Improvement] Failed to fetch knowledge base:', error.message);
    return [];
  }

  return (data || []) as KnowledgeEntry[];
}

/**
 * Add a new entry to the knowledge base.
 */
export async function addKnowledgeEntry(
  entry: Omit<KnowledgeEntry, 'id' | 'times_relevant' | 'is_active' | 'created_at' | 'updated_at'>
): Promise<KnowledgeEntry | null> {
  const { data, error } = await selfImprovementDb
    .from('knowledge_base')
    .insert({
      ...entry,
      times_relevant: 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('[Self-Improvement] Failed to add knowledge entry:', error.message);
    return null;
  }

  return data as KnowledgeEntry;
}

/**
 * Check if we can auto-update today (haven't exceeded daily limit).
 */
export async function canAutoUpdate(): Promise<boolean> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count, error } = await selfImprovementDb
    .from('knowledge_base')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfDay.toISOString());

  if (error) {
    console.error('[Self-Improvement] Failed to check auto-update limit:', error.message);
    return false;
  }

  return (count || 0) < MAX_AUTO_UPDATES_PER_DAY;
}
