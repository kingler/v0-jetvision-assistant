/**
 * Chat Page
 *
 * Redirects to main page where the chat interface is integrated.
 * The ChatKit implementation has been removed in favor of direct OpenAI integration.
 */

import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Chat | JetVision Agent',
  description: 'Chat with the JetVision AI Assistant',
}

export default function ChatPage() {
  // Redirect to main page which contains the chat interface
  redirect('/')
}
