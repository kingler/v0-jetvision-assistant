/**
 * Generate Semantic Chat Title Utility
 * 
 * Uses OpenAI to generate a concise, descriptive title for a chat conversation
 * based on the user's first message or conversation starter.
 * 
 * This provides better UX than generic titles like "Untitled #1" by giving
 * users meaningful titles they can recognize in their chat list.
 */

import OpenAI from 'openai';

/**
 * Generate a semantic title for a chat conversation
 * 
 * @param userMessage - The first user message or conversation starter
 * @param conversationType - Type of conversation ('flight_request' | 'general')
 * @returns Generated title (max 60 characters) or null if generation fails
 */
export async function generateChatTitle(
  userMessage: string,
  conversationType: 'flight_request' | 'general' = 'general'
): Promise<string | null> {
  // Validate OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[generateChatTitle] OPENAI_API_KEY not configured, skipping title generation');
    return null;
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build prompt based on conversation type
    const systemPrompt = conversationType === 'flight_request'
      ? `You are a helpful assistant that generates concise, descriptive titles for private jet flight request conversations.
Generate a short title (max 60 characters) based on the user's flight request message.
Focus on key details: departure/arrival airports, date, or passenger count.
Examples:
- "Teterboro to LAX, Jan 25"
- "6 passengers, NYC to Miami"
- "Charter from KTEB to KPBI"`

      : `You are a helpful assistant that generates concise, descriptive titles for business conversations.
Generate a short title (max 60 characters) that summarizes the user's inquiry or request.
Focus on the main topic or action (e.g., "Pipeline Overview", "Active Deals", "Sales Performance").
Keep it brief and professional.`;

    const userPrompt = `Generate a concise title for this conversation starter: "${userMessage}"`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use faster, cheaper model for title generation
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 30, // Limit response length
    });

    const generatedTitle = completion.choices[0]?.message?.content?.trim();

    if (!generatedTitle) {
      console.warn('[generateChatTitle] No title generated from OpenAI');
      return null;
    }

    // Clean up and truncate title
    const cleanedTitle = generatedTitle
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .trim()
      .substring(0, 60); // Enforce max length

    if (cleanedTitle.length === 0) {
      console.warn('[generateChatTitle] Generated title is empty after cleaning');
      return null;
    }

    console.log('[generateChatTitle] Generated title:', cleanedTitle);
    return cleanedTitle;

  } catch (error) {
    console.error('[generateChatTitle] Error generating title:', error);
    // Don't throw - return null to allow fallback behavior
    return null;
  }
}

/**
 * Fallback function to generate a simple title from message
 * Used when LLM title generation fails or is unavailable
 * 
 * @param userMessage - The user's message
 * @param conversationType - Type of conversation
 * @returns Simple title based on message preview
 */
export function generateFallbackTitle(
  userMessage: string,
  conversationType: 'flight_request' | 'general' = 'general'
): string {
  if (conversationType === 'flight_request') {
    return 'New Flight Request';
  }

  // For general conversations, use first 50 characters
  const preview = userMessage.substring(0, 50).trim();
  return preview.length < userMessage.length ? `${preview}...` : preview;
}
