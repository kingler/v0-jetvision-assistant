import { selfImprovementDb } from './db';

/**
 * Seed initial prompt versions from the hardcoded system prompt.
 * Run once during setup. Idempotent -- skips if versions already exist.
 */
export async function seedInitialPromptVersions(
  scenarioHandlers: string,
  responseFormats: string
): Promise<void> {
  for (const section of [
    { name: 'scenario_handlers' as const, content: scenarioHandlers },
    { name: 'response_formats' as const, content: responseFormats },
  ]) {
    const { count } = await selfImprovementDb
      .from('system_prompt_versions')
      .select('*', { count: 'exact', head: true })
      .eq('section', section.name);

    if (count && count > 0) {
      console.log(`[Seed] Prompt section "${section.name}" already exists, skipping`);
      continue;
    }

    const { error } = await selfImprovementDb
      .from('system_prompt_versions')
      .insert({
        version: 1,
        section: section.name,
        content: section.content,
        is_active: true,
        created_by: 'human',
        change_reason: 'Initial seed from hardcoded prompt',
        locked: false,
      });

    if (error) {
      console.error(`[Seed] Failed to seed "${section.name}":`, error.message);
    } else {
      console.log(`[Seed] Seeded prompt section "${section.name}" v1`);
    }
  }
}
