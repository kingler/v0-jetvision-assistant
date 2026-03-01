/**
 * MCP UI Action Handler
 *
 * Centralized handler for UIActionResult dispatched by tool UI components.
 * Routes actions to the appropriate chat/navigation behavior.
 */

import type { UIActionResult } from '@mcp-ui/server';

export interface ActionHandlerContext {
  sendMessage: (message: string) => void;
  sessionId: string;
}

/**
 * Handle a UIActionResult from a tool UI component.
 * Routes to chat messages, link navigation, or notifications.
 */
export function handleUIAction(
  action: UIActionResult,
  context: ActionHandlerContext
): void {
  switch (action.type) {
    case 'tool':
      // Invoke a tool via natural language message to the agent.
      // The agent will determine which tool to call based on the request.
      // Previously used `/tool` syntax which the agent couldn't parse.
      context.sendMessage(
        `Please use the ${action.payload.toolName} tool with these parameters: ${JSON.stringify(action.payload.params)}`
      );
      break;

    case 'prompt':
      // Inject text into chat input
      context.sendMessage(action.payload.prompt);
      break;

    case 'link':
      // Open URL in new tab
      if (typeof window !== 'undefined') {
        window.open(action.payload.url, '_blank', 'noopener,noreferrer');
      }
      break;

    case 'intent':
      // Convert intent to a chat message
      context.sendMessage(
        `[intent:${action.payload.intent}] ${JSON.stringify(action.payload.params)}`
      );
      break;

    case 'notify':
      // Show toast notification (uses sonner which is already in the project)
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast(action.payload.message);
        });
      }
      break;
  }
}
